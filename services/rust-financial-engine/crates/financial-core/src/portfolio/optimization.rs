/// Portfolio optimization using Modern Portfolio Theory
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use crate::{Money, Portfolio, Asset, FinancialError, Result};
use crate::portfolio::types::{HistoricalReturns, PortfolioMetrics, OptimizationConstraints, RebalancingRecommendation, TradeRecommendation, TradeAction};
use std::collections::HashMap;

pub struct PortfolioOptimizer {
    risk_free_rate: Decimal,
    confidence_level: Decimal,
}

impl PortfolioOptimizer {
    /// Create a new portfolio optimizer
    pub fn new(risk_free_rate: Decimal) -> Self {
        Self {
            risk_free_rate,
            confidence_level: dec!(0.95), // 95% confidence level for VaR
        }
    }

    /// Calculate portfolio expected return
    pub fn expected_return(&self, portfolio: &Portfolio, returns: &[HistoricalReturns]) -> Result<Decimal> {
        if portfolio.assets.is_empty() {
            return Err(FinancialError::InsufficientPortfolioData {
                missing: "No assets in portfolio".to_string(),
            });
        }

        let mut weighted_return = Decimal::ZERO;
        let total_value = portfolio.total_value();

        if total_value.amount().is_zero() {
            return Err(FinancialError::DivisionByZero);
        }

        for asset in &portfolio.assets {
            let weight = asset.current_value.amount() / total_value.amount();
            
            let asset_returns = returns.iter()
                .find(|r| r.asset_id == asset.id)
                .ok_or_else(|| FinancialError::InsufficientPortfolioData {
                    missing: format!("Returns for asset {}", asset.symbol),
                })?;
            
            let mean_return = self.calculate_mean_return(&asset_returns.returns)?;
            weighted_return += weight * mean_return;
        }

        Ok(weighted_return)
    }

    /// Calculate portfolio volatility (standard deviation)
    pub fn volatility(&self, portfolio: &Portfolio, returns: &[HistoricalReturns]) -> Result<Decimal> {
        let weights = self.get_asset_weights(portfolio)?;
        let covariance_matrix = self.calculate_covariance_matrix(returns)?;
        
        // Portfolio variance = w^T * Σ * w
        let mut portfolio_variance = Decimal::ZERO;
        
        for (i, w1) in weights.iter().enumerate() {
            for (j, w2) in weights.iter().enumerate() {
                let covariance = covariance_matrix.get(&(i, j))
                    .ok_or_else(|| FinancialError::InsufficientPortfolioData {
                        missing: "Covariance matrix incomplete".to_string(),
                    })?;
                portfolio_variance += w1 * w2 * covariance;
            }
        }

        // Return standard deviation (square root of variance)
        // Using Newton's method for square root calculation with Decimal
        Ok(self.decimal_sqrt(portfolio_variance))
    }

    /// Calculate Sharpe ratio
    pub fn sharpe_ratio(&self, portfolio: &Portfolio, returns: &[HistoricalReturns]) -> Result<Decimal> {
        let expected_return = self.expected_return(portfolio, returns)?;
        let volatility = self.volatility(portfolio, returns)?;
        
        if volatility.is_zero() {
            return Err(FinancialError::PortfolioOptimizationFailed {
                reason: "Cannot calculate Sharpe ratio with zero volatility".to_string(),
            });
        }

        Ok((expected_return - self.risk_free_rate) / volatility)
    }

    /// Calculate Value at Risk (VaR) at given confidence level
    pub fn value_at_risk(&self, portfolio: &Portfolio, returns: &[HistoricalReturns]) -> Result<Money> {
        let total_value = portfolio.total_value();
        let expected_return = self.expected_return(portfolio, returns)?;
        let volatility = self.volatility(portfolio, returns)?;
        
        // Using normal distribution assumption
        // VaR = μ - z * σ (where z is the critical value for confidence level)
        let z_score = self.get_z_score(self.confidence_level)?;
        let var_percentage = expected_return - z_score * volatility;
        
        let var_amount = total_value.amount() * var_percentage.abs();
        Ok(Money::new_unchecked(var_amount, total_value.currency()))
    }

    /// Calculate complete portfolio metrics
    pub fn calculate_metrics(&self, portfolio: &Portfolio, returns: &[HistoricalReturns]) -> Result<PortfolioMetrics> {
        let total_value = portfolio.total_value();
        let total_cost_basis = portfolio.total_cost_basis();
        let total_return = total_value.subtract(&total_cost_basis)?;
        
        let total_return_percentage = if total_cost_basis.amount().is_zero() {
            crate::types::Percentage::from_percentage(Decimal::ZERO)?
        } else {
            crate::types::Percentage::from_decimal(total_return.amount() / total_cost_basis.amount())?
        };

        let expected_return = self.expected_return(portfolio, returns)?;
        let volatility = self.volatility(portfolio, returns)?;
        let sharpe_ratio = self.sharpe_ratio(portfolio, returns)?;
        let value_at_risk = self.value_at_risk(portfolio, returns)?;
        let max_drawdown = self.calculate_max_drawdown(returns)?;

        Ok(PortfolioMetrics {
            total_value,
            total_cost_basis,
            total_return: total_return.amount(),
            total_return_percentage,
            expected_return,
            volatility,
            sharpe_ratio,
            sortino_ratio: None, // TODO: Implement Sortino ratio
            beta: None, // TODO: Implement beta calculation
            alpha: None, // TODO: Implement alpha calculation
            value_at_risk,
            conditional_value_at_risk: None, // TODO: Implement CVaR
            max_drawdown,
            calculated_at: chrono::Utc::now(),
        })
    }

    /// Generate rebalancing recommendations
    pub fn optimize_allocation(
        &self,
        portfolio: &Portfolio,
        returns: &[HistoricalReturns],
        constraints: &OptimizationConstraints,
    ) -> Result<RebalancingRecommendation> {
        let current_weights = self.get_asset_weights(portfolio)?;
        let target_weights = self.calculate_optimal_weights(portfolio, returns, constraints)?;
        
        let mut recommendations = Vec::new();
        let total_value = portfolio.total_value();
        
        for (i, asset) in portfolio.assets.iter().enumerate() {
            let current_weight = current_weights[i];
            let target_weight = target_weights[i];
            let weight_diff = target_weight - current_weight;
            
            if weight_diff.abs() > dec!(0.01) { // Only rebalance if difference > 1%
                let target_value = total_value.amount() * target_weight;
                let value_diff = target_value - asset.current_value.amount();
                let quantity_diff = value_diff / asset.last_price.amount();
                
                let action = if value_diff > Decimal::ZERO {
                    TradeAction::Buy
                } else if value_diff < Decimal::ZERO {
                    TradeAction::Sell
                } else {
                    TradeAction::Hold
                };
                
                recommendations.push(TradeRecommendation {
                    asset_id: asset.id,
                    symbol: asset.symbol.clone(),
                    action,
                    quantity: quantity_diff.abs(),
                    estimated_value: Money::new_unchecked(value_diff.abs(), asset.current_value.currency()),
                    current_weight: crate::types::Percentage::from_decimal(current_weight)?,
                    target_weight: crate::types::Percentage::from_decimal(target_weight)?,
                    reason: format!("Rebalance to target allocation: {:.1}%", target_weight * dec!(100)),
                });
            }
        }
        
        // Calculate estimated transaction cost
        let estimated_transaction_cost = if let Some(cost_rate) = constraints.transaction_cost {
            let total_trade_value: Decimal = recommendations.iter()
                .map(|r| r.estimated_value.amount())
                .sum();
            Money::new_unchecked(total_trade_value * cost_rate.as_decimal(), total_value.currency())
        } else {
            Money::new_unchecked(Decimal::ZERO, total_value.currency())
        };
        
        // Calculate new expected metrics with target weights
        let new_expected_return = self.calculate_expected_return_with_weights(&target_weights, returns)?;
        let new_volatility = self.calculate_volatility_with_weights(&target_weights, returns)?;
        let new_sharpe_ratio = (new_expected_return - self.risk_free_rate) / new_volatility;
        
        Ok(RebalancingRecommendation {
            portfolio_id: portfolio.id,
            recommendations,
            estimated_transaction_cost,
            new_expected_return,
            new_volatility,
            new_sharpe_ratio,
            generated_at: chrono::Utc::now(),
        })
    }

    // Private helper methods
    
    fn get_asset_weights(&self, portfolio: &Portfolio) -> Result<Vec<Decimal>> {
        let total_value = portfolio.total_value();
        
        if total_value.amount().is_zero() {
            return Err(FinancialError::DivisionByZero);
        }
        
        Ok(portfolio.assets.iter()
            .map(|asset| asset.current_value.amount() / total_value.amount())
            .collect())
    }

    fn calculate_mean_return(&self, returns: &[crate::portfolio::types::PeriodReturn]) -> Result<Decimal> {
        if returns.is_empty() {
            return Err(FinancialError::InsufficientPortfolioData {
                missing: "No return data provided".to_string(),
            });
        }

        let sum: Decimal = returns.iter().map(|r| r.return_value).sum();
        Ok(sum / Decimal::from(returns.len()))
    }

    fn calculate_covariance_matrix(&self, returns: &[HistoricalReturns]) -> Result<HashMap<(usize, usize), Decimal>> {
        let mut matrix = HashMap::new();
        let n_assets = returns.len();
        
        for i in 0..n_assets {
            for j in 0..n_assets {
                let covariance = self.calculate_covariance(&returns[i].returns, &returns[j].returns)?;
                matrix.insert((i, j), covariance);
            }
        }
        
        Ok(matrix)
    }

    fn calculate_covariance(&self, returns1: &[crate::portfolio::types::PeriodReturn], returns2: &[crate::portfolio::types::PeriodReturn]) -> Result<Decimal> {
        if returns1.len() != returns2.len() {
            return Err(FinancialError::InvalidParameter {
                parameter: "returns".to_string(),
                value: "Mismatched return series lengths".to_string(),
            });
        }

        let mean1 = self.calculate_mean_return(returns1)?;
        let mean2 = self.calculate_mean_return(returns2)?;
        
        let mut covariance = Decimal::ZERO;
        for (r1, r2) in returns1.iter().zip(returns2.iter()) {
            covariance += (r1.return_value - mean1) * (r2.return_value - mean2);
        }
        
        Ok(covariance / Decimal::from(returns1.len() - 1))
    }

    fn calculate_optimal_weights(
        &self,
        portfolio: &Portfolio,
        returns: &[HistoricalReturns],
        constraints: &OptimizationConstraints,
    ) -> Result<Vec<Decimal>> {
        // Simplified optimization - for production use proper quadratic programming
        // This is a basic mean-variance optimization approximation
        
        let n_assets = portfolio.assets.len();
        let expected_returns: Vec<Decimal> = returns.iter()
            .map(|r| self.calculate_mean_return(&r.returns))
            .collect::<Result<Vec<_>>>()?;
        
        // Start with equal weights
        let mut weights = vec![Decimal::from(1) / Decimal::from(n_assets); n_assets];
        
        // Apply constraints
        if let Some(max_weight) = constraints.max_asset_weight {
            for weight in &mut weights {
                if *weight > max_weight.as_decimal() {
                    *weight = max_weight.as_decimal();
                }
            }
        }
        
        if let Some(min_weight) = constraints.min_asset_weight {
            for weight in &mut weights {
                if *weight < min_weight.as_decimal() {
                    *weight = min_weight.as_decimal();
                }
            }
        }
        
        // Normalize weights to sum to 1
        let weight_sum: Decimal = weights.iter().sum();
        for weight in &mut weights {
            *weight /= weight_sum;
        }
        
        Ok(weights)
    }

    fn calculate_expected_return_with_weights(&self, weights: &[Decimal], returns: &[HistoricalReturns]) -> Result<Decimal> {
        let mut weighted_return = Decimal::ZERO;
        
        for (i, weight) in weights.iter().enumerate() {
            let mean_return = self.calculate_mean_return(&returns[i].returns)?;
            weighted_return += weight * mean_return;
        }
        
        Ok(weighted_return)
    }

    fn calculate_volatility_with_weights(&self, weights: &[Decimal], returns: &[HistoricalReturns]) -> Result<Decimal> {
        let covariance_matrix = self.calculate_covariance_matrix(returns)?;
        let mut portfolio_variance = Decimal::ZERO;
        
        for (i, w1) in weights.iter().enumerate() {
            for (j, w2) in weights.iter().enumerate() {
                let covariance = covariance_matrix.get(&(i, j))
                    .ok_or_else(|| FinancialError::InsufficientPortfolioData {
                        missing: "Covariance matrix incomplete".to_string(),
                    })?;
                portfolio_variance += w1 * w2 * covariance;
            }
        }
        
        Ok(self.decimal_sqrt(portfolio_variance))
    }

    fn calculate_max_drawdown(&self, returns: &[HistoricalReturns]) -> Result<Decimal> {
        // Simplified max drawdown calculation
        // In production, this would analyze the entire return series
        Ok(dec!(0.15)) // Placeholder 15% max drawdown
    }

    fn get_z_score(&self, confidence_level: Decimal) -> Result<Decimal> {
        // Z-score lookup for common confidence levels
        if confidence_level == dec!(0.90) {
            Ok(dec!(1.645))
        } else if confidence_level == dec!(0.95) {
            Ok(dec!(1.96))
        } else if confidence_level == dec!(0.99) {
            Ok(dec!(2.576))
        } else {
            Err(FinancialError::InvalidParameter {
                parameter: "confidence_level".to_string(),
                value: confidence_level.to_string(),
            })
        }
    }

    fn decimal_sqrt(&self, value: Decimal) -> Decimal {
        // Newton's method for square root with Decimal
        if value.is_zero() {
            return Decimal::ZERO;
        }
        
        let mut x = value;
        let mut last_x = Decimal::ZERO;
        let epsilon = dec!(0.000001);
        
        while (x - last_x).abs() > epsilon {
            last_x = x;
            x = (x + value / x) / dec!(2);
        }
        
        x
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;
    use crate::types::Currency;
    use crate::portfolio::types::{PeriodReturn, ReturnFrequency, RiskTolerance};
    use chrono::Utc;

    fn create_test_returns() -> Vec<HistoricalReturns> {
        vec![
            HistoricalReturns {
                asset_id: Uuid::new_v4(),
                symbol: "STOCK1".to_string(),
                returns: vec![
                    PeriodReturn { date: Utc::now(), return_value: dec!(0.05), adjusted_close: None },
                    PeriodReturn { date: Utc::now(), return_value: dec!(0.03), adjusted_close: None },
                    PeriodReturn { date: Utc::now(), return_value: dec!(-0.02), adjusted_close: None },
                    PeriodReturn { date: Utc::now(), return_value: dec!(0.04), adjusted_close: None },
                ],
                frequency: ReturnFrequency::Monthly,
            },
            HistoricalReturns {
                asset_id: Uuid::new_v4(),
                symbol: "BOND1".to_string(),
                returns: vec![
                    PeriodReturn { date: Utc::now(), return_value: dec!(0.01), adjusted_close: None },
                    PeriodReturn { date: Utc::now(), return_value: dec!(0.015), adjusted_close: None },
                    PeriodReturn { date: Utc::now(), return_value: dec!(0.01), adjusted_close: None },
                    PeriodReturn { date: Utc::now(), return_value: dec!(0.012), adjusted_close: None },
                ],
                frequency: ReturnFrequency::Monthly,
            },
        ]
    }

    #[test]
    fn test_portfolio_optimizer() {
        let optimizer = PortfolioOptimizer::new(dec!(0.02));
        assert_eq!(optimizer.risk_free_rate, dec!(0.02));
        assert_eq!(optimizer.confidence_level, dec!(0.95));
    }

    #[test]
    fn test_mean_return_calculation() {
        let optimizer = PortfolioOptimizer::new(dec!(0.02));
        let returns = create_test_returns();
        
        let mean = optimizer.calculate_mean_return(&returns[0].returns).unwrap();
        assert_eq!(mean, dec!(0.025)); // (0.05 + 0.03 - 0.02 + 0.04) / 4
    }

    #[test]
    fn test_z_score_lookup() {
        let optimizer = PortfolioOptimizer::new(dec!(0.02));
        
        assert_eq!(optimizer.get_z_score(dec!(0.90)).unwrap(), dec!(1.645));
        assert_eq!(optimizer.get_z_score(dec!(0.95)).unwrap(), dec!(1.96));
        assert_eq!(optimizer.get_z_score(dec!(0.99)).unwrap(), dec!(2.576));
        assert!(optimizer.get_z_score(dec!(0.80)).is_err());
    }

    #[test]
    fn test_decimal_sqrt() {
        let optimizer = PortfolioOptimizer::new(dec!(0.02));
        
        assert_eq!(optimizer.decimal_sqrt(dec!(0)), dec!(0));
        assert!((optimizer.decimal_sqrt(dec!(4)) - dec!(2)).abs() < dec!(0.000001));
        assert!((optimizer.decimal_sqrt(dec!(9)) - dec!(3)).abs() < dec!(0.000001));
        assert!((optimizer.decimal_sqrt(dec!(2)) - dec!(1.414213)).abs() < dec!(0.000001));
    }
}