/// Portfolio types and structures for financial analysis
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use crate::types::{Money, Currency, Percentage, AssetClass};

/// Portfolio containing multiple assets
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Portfolio {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub assets: Vec<Asset>,
    pub benchmark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Individual asset in a portfolio
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Asset {
    pub id: Uuid,
    pub symbol: String,
    pub name: String,
    pub asset_class: AssetClass,
    pub quantity: Decimal,
    pub cost_basis: Money,
    pub current_value: Money,
    pub allocation_target: Option<Percentage>,
    pub last_price: Money,
    pub last_updated: DateTime<Utc>,
}

/// Historical returns data for analysis
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HistoricalReturns {
    pub asset_id: Uuid,
    pub symbol: String,
    pub returns: Vec<PeriodReturn>,
    pub frequency: ReturnFrequency,
}

/// Single period return
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PeriodReturn {
    pub date: DateTime<Utc>,
    pub return_value: Decimal,
    pub adjusted_close: Option<Money>,
}

/// Return calculation frequency
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ReturnFrequency {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    Annual,
}

/// Portfolio performance metrics
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PortfolioMetrics {
    pub total_value: Money,
    pub total_cost_basis: Money,
    pub total_return: Decimal,
    pub total_return_percentage: Percentage,
    pub expected_return: Decimal,
    pub volatility: Decimal,
    pub sharpe_ratio: Decimal,
    pub sortino_ratio: Option<Decimal>,
    pub beta: Option<Decimal>,
    pub alpha: Option<Decimal>,
    pub value_at_risk: Money,
    pub conditional_value_at_risk: Option<Money>,
    pub max_drawdown: Decimal,
    pub calculated_at: DateTime<Utc>,
}

/// Asset allocation breakdown
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AssetAllocation {
    pub asset_class: AssetClass,
    pub current_weight: Percentage,
    pub target_weight: Option<Percentage>,
    pub value: Money,
    pub deviation: Option<Percentage>,
}

/// Optimization constraints for portfolio rebalancing
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OptimizationConstraints {
    pub risk_tolerance: RiskTolerance,
    pub target_return: Option<Decimal>,
    pub max_asset_weight: Option<Percentage>,
    pub min_asset_weight: Option<Percentage>,
    pub exclude_assets: Vec<String>,
    pub include_cash: bool,
    pub allow_short_selling: bool,
    pub transaction_cost: Option<Percentage>,
}

/// Risk tolerance levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RiskTolerance {
    Conservative,
    ModeratelyConservative,
    Moderate,
    ModeratelyAggressive,
    Aggressive,
    VeryAggressive,
}

/// Rebalancing recommendation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RebalancingRecommendation {
    pub portfolio_id: Uuid,
    pub recommendations: Vec<TradeRecommendation>,
    pub estimated_transaction_cost: Money,
    pub new_expected_return: Decimal,
    pub new_volatility: Decimal,
    pub new_sharpe_ratio: Decimal,
    pub generated_at: DateTime<Utc>,
}

/// Individual trade recommendation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TradeRecommendation {
    pub asset_id: Uuid,
    pub symbol: String,
    pub action: TradeAction,
    pub quantity: Decimal,
    pub estimated_value: Money,
    pub current_weight: Percentage,
    pub target_weight: Percentage,
    pub reason: String,
}

/// Trade action type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TradeAction {
    Buy,
    Sell,
    Hold,
    Rebalance,
}

impl Portfolio {
    /// Create a new portfolio
    pub fn new(user_id: Uuid, name: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            user_id,
            name,
            description: None,
            assets: Vec::new(),
            benchmark: None,
            created_at: now,
            updated_at: now,
        }
    }

    /// Calculate total portfolio value
    pub fn total_value(&self) -> Money {
        let currency = self.assets.first()
            .map(|a| a.current_value.currency())
            .unwrap_or(Currency::USD);
        
        let total = self.assets.iter()
            .map(|a| a.current_value.amount())
            .sum();
        
        Money::new_unchecked(total, currency)
    }

    /// Calculate total cost basis
    pub fn total_cost_basis(&self) -> Money {
        let currency = self.assets.first()
            .map(|a| a.cost_basis.currency())
            .unwrap_or(Currency::USD);
        
        let total = self.assets.iter()
            .map(|a| a.cost_basis.amount())
            .sum();
        
        Money::new_unchecked(total, currency)
    }

    /// Get asset allocations by class
    pub fn get_allocations(&self) -> Vec<AssetAllocation> {
        let total_value = self.total_value();
        let mut allocations = std::collections::HashMap::new();
        
        for asset in &self.assets {
            let entry = allocations
                .entry(asset.asset_class.clone())
                .or_insert((Money::new_unchecked(Decimal::ZERO, asset.current_value.currency()), None));
            
            entry.0 = entry.0.add(&asset.current_value).unwrap();
            if let Some(target) = asset.allocation_target {
                entry.1 = Some(target);
            }
        }
        
        allocations.into_iter()
            .map(|(asset_class, (value, target))| {
                let current_weight = if total_value.amount().is_zero() {
                    Percentage::from_percentage(Decimal::ZERO).unwrap()
                } else {
                    Percentage::from_decimal(value.amount() / total_value.amount()).unwrap()
                };
                
                let deviation = target.map(|t| {
                    Percentage::from_percentage(current_weight.as_percentage() - t.as_percentage()).unwrap()
                });
                
                AssetAllocation {
                    asset_class,
                    current_weight,
                    target_weight: target,
                    value,
                    deviation,
                }
            })
            .collect()
    }
}

impl Asset {
    /// Create a new asset
    pub fn new(
        symbol: String,
        name: String,
        asset_class: AssetClass,
        quantity: Decimal,
        cost_basis: Money,
        current_value: Money,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            symbol,
            name,
            asset_class,
            quantity,
            cost_basis,
            current_value,
            allocation_target: None,
            last_price: current_value.divide(quantity).unwrap_or(Money::new_unchecked(Decimal::ZERO, current_value.currency())),
            last_updated: Utc::now(),
        }
    }

    /// Calculate unrealized gain/loss
    pub fn unrealized_gain_loss(&self) -> Money {
        self.current_value.subtract(&self.cost_basis).unwrap()
    }

    /// Calculate unrealized gain/loss percentage
    pub fn unrealized_gain_loss_percentage(&self) -> Percentage {
        if self.cost_basis.amount().is_zero() {
            Percentage::from_percentage(Decimal::ZERO).unwrap()
        } else {
            let gain_loss = self.unrealized_gain_loss();
            Percentage::from_decimal(gain_loss.amount() / self.cost_basis.amount()).unwrap()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_portfolio_calculations() {
        let mut portfolio = Portfolio::new(Uuid::new_v4(), "Test Portfolio".to_string());
        
        let asset1 = Asset::new(
            "AAPL".to_string(),
            "Apple Inc.".to_string(),
            AssetClass::Stocks,
            dec!(100),
            Money::new(dec!(15000), Currency::USD).unwrap(),
            Money::new(dec!(17500), Currency::USD).unwrap(),
        );
        
        let asset2 = Asset::new(
            "BND".to_string(),
            "Vanguard Total Bond".to_string(),
            AssetClass::Bonds,
            dec!(200),
            Money::new(dec!(20000), Currency::USD).unwrap(),
            Money::new(dec!(19000), Currency::USD).unwrap(),
        );
        
        portfolio.assets.push(asset1);
        portfolio.assets.push(asset2);
        
        assert_eq!(portfolio.total_value().amount(), dec!(36500));
        assert_eq!(portfolio.total_cost_basis().amount(), dec!(35000));
        
        let allocations = portfolio.get_allocations();
        assert_eq!(allocations.len(), 2);
    }

    #[test]
    fn test_asset_gain_loss() {
        let asset = Asset::new(
            "MSFT".to_string(),
            "Microsoft Corp.".to_string(),
            AssetClass::Stocks,
            dec!(50),
            Money::new(dec!(10000), Currency::USD).unwrap(),
            Money::new(dec!(12500), Currency::USD).unwrap(),
        );
        
        assert_eq!(asset.unrealized_gain_loss().amount(), dec!(2500));
        assert_eq!(asset.unrealized_gain_loss_percentage().as_percentage(), dec!(25));
    }
}