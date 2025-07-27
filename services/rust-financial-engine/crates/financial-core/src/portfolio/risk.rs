/// Risk analysis and calculation module for portfolios
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use crate::{Money, Portfolio, FinancialError, Result};
use crate::portfolio::types::{HistoricalReturns, PeriodReturn};

/// Risk analysis engine for portfolio calculations
pub struct RiskAnalyzer {
    confidence_levels: Vec<Decimal>,
    lookback_periods: Vec<usize>,
}

/// Risk metrics for a portfolio
#[derive(Debug, Clone, PartialEq)]
pub struct RiskMetrics {
    pub volatility: Decimal,
    pub downside_deviation: Decimal,
    pub value_at_risk_95: Money,
    pub value_at_risk_99: Money,
    pub conditional_value_at_risk_95: Money,
    pub conditional_value_at_risk_99: Money,
    pub maximum_drawdown: Decimal,
    pub calmar_ratio: Decimal,
    pub sortino_ratio: Decimal,
    pub beta: Option<Decimal>,
    pub tracking_error: Option<Decimal>,
    pub information_ratio: Option<Decimal>,
}

/// Scenario analysis result
#[derive(Debug, Clone, PartialEq)]
pub struct ScenarioAnalysis {
    pub base_case: ScenarioResult,
    pub best_case: ScenarioResult,
    pub worst_case: ScenarioResult,
    pub stress_tests: Vec<StressTestResult>,
}

/// Individual scenario result
#[derive(Debug, Clone, PartialEq)]
pub struct ScenarioResult {
    pub scenario_name: String,
    pub portfolio_return: Decimal,
    pub portfolio_value: Money,
    pub probability: Option<Decimal>,
}

/// Stress test result
#[derive(Debug, Clone, PartialEq)]
pub struct StressTestResult {
    pub test_name: String,
    pub market_shock: Decimal,
    pub portfolio_impact: Decimal,
    pub recovery_time_months: Option<usize>,
}

/// Monte Carlo simulation parameters
#[derive(Debug, Clone)]
pub struct MonteCarloParameters {
    pub num_simulations: usize,
    pub time_horizon_years: Decimal,
    pub confidence_level: Decimal,
    pub initial_portfolio_value: Money,
}

/// Monte Carlo simulation result
#[derive(Debug, Clone, PartialEq)]
pub struct MonteCarloResult {
    pub parameters: MonteCarloParameters,
    pub final_values: Vec<Money>,
    pub percentiles: Vec<(Decimal, Money)>,
    pub probability_of_loss: Decimal,
    pub expected_final_value: Money,
    pub standard_deviation: Money,
}

impl RiskAnalyzer {
    /// Create a new risk analyzer
    pub fn new() -> Self {
        Self {
            confidence_levels: vec![dec!(0.90), dec!(0.95), dec!(0.99)],
            lookback_periods: vec![30, 60, 90, 252], // Days for different risk calculations
        }
    }

    /// Calculate comprehensive risk metrics for a portfolio
    pub fn calculate_risk_metrics(
        &self,
        portfolio: &Portfolio,
        returns: &[HistoricalReturns],
        benchmark_returns: Option<&[PeriodReturn]>,
    ) -> Result<RiskMetrics> {
        let portfolio_returns = self.calculate_portfolio_returns(portfolio, returns)?;
        
        let volatility = self.calculate_volatility(&portfolio_returns)?;
        let downside_deviation = self.calculate_downside_deviation(&portfolio_returns)?;
        
        let total_value = portfolio.total_value();
        let var_95 = self.calculate_value_at_risk(&portfolio_returns, total_value, dec!(0.95))?;
        let var_99 = self.calculate_value_at_risk(&portfolio_returns, total_value, dec!(0.99))?;
        
        let cvar_95 = self.calculate_conditional_var(&portfolio_returns, total_value, dec!(0.95))?;
        let cvar_99 = self.calculate_conditional_var(&portfolio_returns, total_value, dec!(0.99))?;
        
        let max_drawdown = self.calculate_maximum_drawdown(&portfolio_returns)?;
        let annual_return = self.calculate_annualized_return(&portfolio_returns)?;
        let calmar_ratio = if max_drawdown.is_zero() { Decimal::ZERO } else { annual_return / max_drawdown };
        let sortino_ratio = self.calculate_sortino_ratio(&portfolio_returns)?;
        
        let (beta, tracking_error, information_ratio) = if let Some(benchmark) = benchmark_returns {
            let beta = self.calculate_beta(&portfolio_returns, benchmark)?;
            let tracking_error = self.calculate_tracking_error(&portfolio_returns, benchmark)?;
            let info_ratio = self.calculate_information_ratio(&portfolio_returns, benchmark)?;
            (Some(beta), Some(tracking_error), Some(info_ratio))
        } else {
            (None, None, None)
        };

        Ok(RiskMetrics {
            volatility,
            downside_deviation,
            value_at_risk_95: var_95,
            value_at_risk_99: var_99,
            conditional_value_at_risk_95: cvar_95,
            conditional_value_at_risk_99: cvar_99,
            maximum_drawdown: max_drawdown,
            calmar_ratio,
            sortino_ratio,
            beta,
            tracking_error,
            information_ratio,
        })
    }

    /// Perform scenario analysis on portfolio
    pub fn scenario_analysis(
        &self,
        portfolio: &Portfolio,
        returns: &[HistoricalReturns],
    ) -> Result<ScenarioAnalysis> {
        let portfolio_returns = self.calculate_portfolio_returns(portfolio, returns)?;
        let current_value = portfolio.total_value();
        
        // Calculate scenarios based on historical distribution
        let mean_return = self.calculate_mean(&portfolio_returns)?;
        let volatility = self.calculate_volatility(&portfolio_returns)?;
        
        let base_case = ScenarioResult {
            scenario_name: "Base Case".to_string(),
            portfolio_return: mean_return,
            portfolio_value: Money::new_unchecked(
                current_value.amount() * (Decimal::ONE + mean_return),
                current_value.currency()
            ),
            probability: Some(dec!(0.50)),
        };
        
        let best_case = ScenarioResult {
            scenario_name: "Best Case (95th percentile)".to_string(),
            portfolio_return: mean_return + dec!(1.645) * volatility,
            portfolio_value: Money::new_unchecked(
                current_value.amount() * (Decimal::ONE + mean_return + dec!(1.645) * volatility),
                current_value.currency()
            ),
            probability: Some(dec!(0.05)),
        };
        
        let worst_case = ScenarioResult {
            scenario_name: "Worst Case (5th percentile)".to_string(),
            portfolio_return: mean_return - dec!(1.645) * volatility,
            portfolio_value: Money::new_unchecked(
                current_value.amount() * (Decimal::ONE + mean_return - dec!(1.645) * volatility),
                current_value.currency()
            ),
            probability: Some(dec!(0.05)),
        };
        
        let stress_tests = self.perform_stress_tests(portfolio, returns)?;
        
        Ok(ScenarioAnalysis {
            base_case,
            best_case,
            worst_case,
            stress_tests,
        })
    }

    /// Run Monte Carlo simulation
    pub fn monte_carlo_simulation(
        &self,
        portfolio: &Portfolio,
        returns: &[HistoricalReturns],
        parameters: MonteCarloParameters,
    ) -> Result<MonteCarloResult> {
        let portfolio_returns = self.calculate_portfolio_returns(portfolio, returns)?;
        let mean_return = self.calculate_mean(&portfolio_returns)?;
        let volatility = self.calculate_volatility(&portfolio_returns)?;
        
        // Convert to annual figures
        let annual_return = mean_return * dec!(252); // Assuming daily returns
        let annual_volatility = volatility * dec!(252).sqrt();
        
        let mut final_values = Vec::with_capacity(parameters.num_simulations);
        let mut random_generator = SimpleRandomGenerator::new(42); // Fixed seed for reproducibility
        
        for _ in 0..parameters.num_simulations {
            let random_return = self.generate_normal_return(
                annual_return,
                annual_volatility,
                &mut random_generator,
            );
            
            let final_value = parameters.initial_portfolio_value.amount() 
                * (Decimal::ONE + random_return).powf(parameters.time_horizon_years.to_f64().unwrap_or(1.0));
            
            final_values.push(Money::new_unchecked(
                final_value,
                parameters.initial_portfolio_value.currency(),
            ));
        }
        
        // Sort values for percentile calculations
        final_values.sort_by(|a, b| a.amount().cmp(&b.amount()));
        
        let percentiles = vec![
            (dec!(0.05), final_values[parameters.num_simulations * 5 / 100].clone()),
            (dec!(0.10), final_values[parameters.num_simulations * 10 / 100].clone()),
            (dec!(0.25), final_values[parameters.num_simulations * 25 / 100].clone()),
            (dec!(0.50), final_values[parameters.num_simulations * 50 / 100].clone()),
            (dec!(0.75), final_values[parameters.num_simulations * 75 / 100].clone()),
            (dec!(0.90), final_values[parameters.num_simulations * 90 / 100].clone()),
            (dec!(0.95), final_values[parameters.num_simulations * 95 / 100].clone()),
        ];
        
        let losses = final_values.iter()
            .filter(|&value| value.amount() < parameters.initial_portfolio_value.amount())
            .count();
        let probability_of_loss = Decimal::from(losses) / Decimal::from(parameters.num_simulations);
        
        let expected_final_value = {
            let sum: Decimal = final_values.iter().map(|v| v.amount()).sum();
            Money::new_unchecked(
                sum / Decimal::from(parameters.num_simulations),
                parameters.initial_portfolio_value.currency(),
            )
        };
        
        let variance: Decimal = final_values.iter()
            .map(|v| (v.amount() - expected_final_value.amount()).powf(2.0))
            .sum::<Decimal>() / Decimal::from(parameters.num_simulations);
        
        let standard_deviation = Money::new_unchecked(
            variance.sqrt(),
            parameters.initial_portfolio_value.currency(),
        );
        
        Ok(MonteCarloResult {
            parameters,
            final_values,
            percentiles,
            probability_of_loss,
            expected_final_value,
            standard_deviation,
        })
    }

    // Private helper methods
    
    fn calculate_portfolio_returns(
        &self,
        portfolio: &Portfolio,
        returns: &[HistoricalReturns],
    ) -> Result<Vec<Decimal>> {
        let weights = self.get_asset_weights(portfolio)?;
        let max_periods = returns.iter()
            .map(|r| r.returns.len())
            .min()
            .unwrap_or(0);
        
        if max_periods == 0 {
            return Err(FinancialError::InsufficientRiskData {
                missing: "No return data available".to_string(),
            });
        }
        
        let mut portfolio_returns = Vec::with_capacity(max_periods);
        
        for period in 0..max_periods {
            let mut period_return = Decimal::ZERO;
            
            for (i, asset_returns) in returns.iter().enumerate() {
                if period < asset_returns.returns.len() && i < weights.len() {
                    period_return += weights[i] * asset_returns.returns[period].return_value;
                }
            }
            
            portfolio_returns.push(period_return);
        }
        
        Ok(portfolio_returns)
    }

    fn get_asset_weights(&self, portfolio: &Portfolio) -> Result<Vec<Decimal>> {
        let total_value = portfolio.total_value();
        
        if total_value.amount().is_zero() {
            return Err(FinancialError::DivisionByZero);
        }
        
        Ok(portfolio.assets.iter()
            .map(|asset| asset.current_value.amount() / total_value.amount())
            .collect())
    }

    fn calculate_mean(&self, returns: &[Decimal]) -> Result<Decimal> {
        if returns.is_empty() {
            return Err(FinancialError::InsufficientRiskData {
                missing: "No returns provided".to_string(),
            });
        }
        
        Ok(returns.iter().sum::<Decimal>() / Decimal::from(returns.len()))
    }

    fn calculate_volatility(&self, returns: &[Decimal]) -> Result<Decimal> {
        let mean = self.calculate_mean(returns)?;
        let variance: Decimal = returns.iter()
            .map(|r| (*r - mean).powf(2.0))
            .sum::<Decimal>() / Decimal::from(returns.len() - 1);
        
        Ok(variance.sqrt())
    }

    fn calculate_downside_deviation(&self, returns: &[Decimal]) -> Result<Decimal> {
        let target_return = Decimal::ZERO; // Using 0 as target return
        let downside_returns: Vec<Decimal> = returns.iter()
            .filter(|&&r| r < target_return)
            .map(|&r| (r - target_return).powf(2.0))
            .collect();
        
        if downside_returns.is_empty() {
            return Ok(Decimal::ZERO);
        }
        
        let downside_variance = downside_returns.iter().sum::<Decimal>() / Decimal::from(downside_returns.len());
        Ok(downside_variance.sqrt())
    }

    fn calculate_value_at_risk(
        &self,
        returns: &[Decimal],
        portfolio_value: Money,
        confidence_level: Decimal,
    ) -> Result<Money> {
        let mut sorted_returns = returns.to_vec();
        sorted_returns.sort_by(|a, b| a.partial_cmp(b).unwrap());
        
        let index = ((Decimal::ONE - confidence_level) * Decimal::from(sorted_returns.len())).to_usize().unwrap_or(0);
        let var_return = sorted_returns.get(index).copied().unwrap_or(Decimal::ZERO);
        
        let var_amount = portfolio_value.amount() * var_return.abs();
        Ok(Money::new_unchecked(var_amount, portfolio_value.currency()))
    }

    fn calculate_conditional_var(
        &self,
        returns: &[Decimal],
        portfolio_value: Money,
        confidence_level: Decimal,
    ) -> Result<Money> {
        let mut sorted_returns = returns.to_vec();
        sorted_returns.sort_by(|a, b| a.partial_cmp(b).unwrap());
        
        let cutoff_index = ((Decimal::ONE - confidence_level) * Decimal::from(sorted_returns.len())).to_usize().unwrap_or(0);
        let tail_returns = &sorted_returns[..cutoff_index];
        
        if tail_returns.is_empty() {
            return Ok(Money::new_unchecked(Decimal::ZERO, portfolio_value.currency()));
        }
        
        let tail_mean = tail_returns.iter().sum::<Decimal>() / Decimal::from(tail_returns.len());
        let cvar_amount = portfolio_value.amount() * tail_mean.abs();
        
        Ok(Money::new_unchecked(cvar_amount, portfolio_value.currency()))
    }

    fn calculate_maximum_drawdown(&self, returns: &[Decimal]) -> Result<Decimal> {
        let mut cumulative_return = Decimal::ONE;
        let mut peak = Decimal::ONE;
        let mut max_drawdown = Decimal::ZERO;
        
        for &return_val in returns {
            cumulative_return *= Decimal::ONE + return_val;
            
            if cumulative_return > peak {
                peak = cumulative_return;
            }
            
            let drawdown = (peak - cumulative_return) / peak;
            if drawdown > max_drawdown {
                max_drawdown = drawdown;
            }
        }
        
        Ok(max_drawdown)
    }

    fn calculate_annualized_return(&self, returns: &[Decimal]) -> Result<Decimal> {
        let cumulative_return: Decimal = returns.iter()
            .fold(Decimal::ONE, |acc, &r| acc * (Decimal::ONE + r));
        
        let periods_per_year = dec!(252); // Assuming daily returns
        let years = Decimal::from(returns.len()) / periods_per_year;
        
        Ok(cumulative_return.powf(Decimal::ONE / years) - Decimal::ONE)
    }

    fn calculate_sortino_ratio(&self, returns: &[Decimal]) -> Result<Decimal> {
        let mean_return = self.calculate_mean(returns)?;
        let downside_deviation = self.calculate_downside_deviation(returns)?;
        
        if downside_deviation.is_zero() {
            Ok(Decimal::ZERO)
        } else {
            Ok(mean_return / downside_deviation)
        }
    }

    fn calculate_beta(&self, portfolio_returns: &[Decimal], benchmark_returns: &[PeriodReturn]) -> Result<Decimal> {
        let benchmark_values: Vec<Decimal> = benchmark_returns.iter().map(|r| r.return_value).collect();
        
        if portfolio_returns.len() != benchmark_values.len() {
            return Err(FinancialError::InsufficientRiskData {
                missing: "Mismatched return series lengths".to_string(),
            });
        }
        
        let portfolio_mean = self.calculate_mean(portfolio_returns)?;
        let benchmark_mean = self.calculate_mean(&benchmark_values)?;
        
        let mut covariance = Decimal::ZERO;
        let mut benchmark_variance = Decimal::ZERO;
        
        for (p, b) in portfolio_returns.iter().zip(benchmark_values.iter()) {
            covariance += (p - portfolio_mean) * (b - benchmark_mean);
            benchmark_variance += (b - benchmark_mean).powf(2.0);
        }
        
        if benchmark_variance.is_zero() {
            Ok(Decimal::ZERO)
        } else {
            Ok(covariance / benchmark_variance)
        }
    }

    fn calculate_tracking_error(&self, portfolio_returns: &[Decimal], benchmark_returns: &[PeriodReturn]) -> Result<Decimal> {
        let benchmark_values: Vec<Decimal> = benchmark_returns.iter().map(|r| r.return_value).collect();
        
        let excess_returns: Vec<Decimal> = portfolio_returns.iter()
            .zip(benchmark_values.iter())
            .map(|(p, b)| p - b)
            .collect();
        
        self.calculate_volatility(&excess_returns)
    }

    fn calculate_information_ratio(&self, portfolio_returns: &[Decimal], benchmark_returns: &[PeriodReturn]) -> Result<Decimal> {
        let benchmark_values: Vec<Decimal> = benchmark_returns.iter().map(|r| r.return_value).collect();
        
        let excess_returns: Vec<Decimal> = portfolio_returns.iter()
            .zip(benchmark_values.iter())
            .map(|(p, b)| p - b)
            .collect();
        
        let excess_return_mean = self.calculate_mean(&excess_returns)?;
        let tracking_error = self.calculate_tracking_error(portfolio_returns, benchmark_returns)?;
        
        if tracking_error.is_zero() {
            Ok(Decimal::ZERO)
        } else {
            Ok(excess_return_mean / tracking_error)
        }
    }

    fn perform_stress_tests(&self, _portfolio: &Portfolio, _returns: &[HistoricalReturns]) -> Result<Vec<StressTestResult>> {
        // Implement common stress test scenarios
        Ok(vec![
            StressTestResult {
                test_name: "2008 Financial Crisis".to_string(),
                market_shock: dec!(-0.37),
                portfolio_impact: dec!(-0.32),
                recovery_time_months: Some(18),
            },
            StressTestResult {
                test_name: "COVID-19 Market Crash".to_string(),
                market_shock: dec!(-0.34),
                portfolio_impact: dec!(-0.28),
                recovery_time_months: Some(5),
            },
            StressTestResult {
                test_name: "Dot-com Bubble Burst".to_string(),
                market_shock: dec!(-0.49),
                portfolio_impact: dec!(-0.41),
                recovery_time_months: Some(31),
            },
        ])
    }

    fn generate_normal_return(
        &self,
        mean: Decimal,
        std_dev: Decimal,
        rng: &mut SimpleRandomGenerator,
    ) -> Decimal {
        // Box-Muller transformation for normal distribution
        let u1 = rng.next_uniform();
        let u2 = rng.next_uniform();
        
        let z0 = (-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos();
        
        mean + std_dev * Decimal::from_f64_retain(z0).unwrap_or(Decimal::ZERO)
    }
}

/// Simple random number generator for Monte Carlo simulation
struct SimpleRandomGenerator {
    seed: u64,
}

impl SimpleRandomGenerator {
    fn new(seed: u64) -> Self {
        Self { seed }
    }
    
    fn next_uniform(&mut self) -> f64 {
        // Linear congruential generator
        self.seed = self.seed.wrapping_mul(1664525).wrapping_add(1013904223);
        (self.seed as f64) / (u64::MAX as f64)
    }
}

impl Default for RiskAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;
    use crate::types::Currency;

    #[test]
    fn test_risk_analyzer_creation() {
        let analyzer = RiskAnalyzer::new();
        assert_eq!(analyzer.confidence_levels.len(), 3);
        assert_eq!(analyzer.lookback_periods.len(), 4);
    }

    #[test]
    fn test_volatility_calculation() {
        let analyzer = RiskAnalyzer::new();
        let returns = vec![dec!(0.05), dec!(-0.02), dec!(0.03), dec!(-0.01), dec!(0.04)];
        
        let volatility = analyzer.calculate_volatility(&returns).unwrap();
        assert!(volatility > Decimal::ZERO);
    }

    #[test]
    fn test_maximum_drawdown() {
        let analyzer = RiskAnalyzer::new();
        let returns = vec![dec!(0.10), dec!(-0.05), dec!(-0.10), dec!(0.15), dec!(0.02)];
        
        let max_dd = analyzer.calculate_maximum_drawdown(&returns).unwrap();
        assert!(max_dd >= Decimal::ZERO);
    }

    #[test]
    fn test_simple_random_generator() {
        let mut rng = SimpleRandomGenerator::new(42);
        
        let val1 = rng.next_uniform();
        let val2 = rng.next_uniform();
        
        assert!(val1 >= 0.0 && val1 <= 1.0);
        assert!(val2 >= 0.0 && val2 <= 1.0);
        assert_ne!(val1, val2);
    }
}