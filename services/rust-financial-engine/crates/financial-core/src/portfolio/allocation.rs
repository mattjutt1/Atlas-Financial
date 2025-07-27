/// Asset allocation strategies and rebalancing algorithms
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use crate::{Money, Portfolio, FinancialError, Result};
use crate::types::{AssetClass, Percentage};
use crate::portfolio::types::{Asset, RiskTolerance, TradeRecommendation, TradeAction};
use std::collections::HashMap;

/// Asset allocation strategist for portfolio management
pub struct AllocationStrategist {
    rebalancing_threshold: Percentage,
    transaction_cost: Percentage,
}

/// Strategic asset allocation model
#[derive(Debug, Clone, PartialEq)]
pub struct StrategicAllocation {
    pub model_name: String,
    pub risk_tolerance: RiskTolerance,
    pub target_allocations: HashMap<AssetClass, Percentage>,
    pub rebalancing_frequency: RebalancingFrequency,
    pub description: String,
}

/// Rebalancing frequency options
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RebalancingFrequency {
    Monthly,
    Quarterly,
    SemiAnnually,
    Annually,
    ThresholdBased(Percentage),
}

/// Rebalancing analysis result
#[derive(Debug, Clone, PartialEq)]
pub struct RebalancingAnalysis {
    pub current_allocations: HashMap<AssetClass, AllocationInfo>,
    pub target_allocations: HashMap<AssetClass, AllocationInfo>,
    pub deviations: HashMap<AssetClass, Decimal>,
    pub requires_rebalancing: bool,
    pub recommended_trades: Vec<TradeRecommendation>,
    pub estimated_costs: Money,
    pub tax_implications: Option<TaxAnalysis>,
}

/// Allocation information for an asset class
#[derive(Debug, Clone, PartialEq)]
pub struct AllocationInfo {
    pub percentage: Percentage,
    pub value: Money,
    pub deviation_from_target: Decimal,
}

/// Tax analysis for rebalancing
#[derive(Debug, Clone, PartialEq)]
pub struct TaxAnalysis {
    pub realized_gains: Money,
    pub realized_losses: Money,
    pub estimated_tax_liability: Money,
    pub tax_loss_harvesting_opportunities: Vec<TaxLossHarvestingOpportunity>,
}

/// Tax loss harvesting opportunity
#[derive(Debug, Clone, PartialEq)]
pub struct TaxLossHarvestingOpportunity {
    pub asset_id: uuid::Uuid,
    pub symbol: String,
    pub unrealized_loss: Money,
    pub potential_tax_savings: Money,
    pub replacement_suggestions: Vec<String>,
}

impl AllocationStrategist {
    /// Create a new allocation strategist
    pub fn new() -> Self {
        Self {
            rebalancing_threshold: Percentage::from_percentage(dec!(5.0)).unwrap(), // 5% threshold
            transaction_cost: Percentage::from_percentage(dec!(0.1)).unwrap(), // 0.1% transaction cost
        }
    }

    /// Set rebalancing threshold
    pub fn with_rebalancing_threshold(mut self, threshold: Percentage) -> Self {
        self.rebalancing_threshold = threshold;
        self
    }

    /// Set transaction cost
    pub fn with_transaction_cost(mut self, cost: Percentage) -> Self {
        self.transaction_cost = cost;
        self
    }

    /// Get predefined strategic allocation models
    pub fn get_strategic_models() -> Vec<StrategicAllocation> {
        vec![
            // Conservative portfolios
            StrategicAllocation {
                model_name: "Conservative Income".to_string(),
                risk_tolerance: RiskTolerance::Conservative,
                target_allocations: [
                    (AssetClass::Cash, Percentage::from_percentage(dec!(10.0)).unwrap()),
                    (AssetClass::Bonds, Percentage::from_percentage(dec!(70.0)).unwrap()),
                    (AssetClass::Stocks, Percentage::from_percentage(dec!(20.0)).unwrap()),
                ].iter().cloned().collect(),
                rebalancing_frequency: RebalancingFrequency::Quarterly,
                description: "Low-risk portfolio focused on income generation".to_string(),
            },
            
            // Moderate portfolios
            StrategicAllocation {
                model_name: "Balanced Growth".to_string(),
                risk_tolerance: RiskTolerance::Moderate,
                target_allocations: [
                    (AssetClass::Cash, Percentage::from_percentage(dec!(5.0)).unwrap()),
                    (AssetClass::Bonds, Percentage::from_percentage(dec!(40.0)).unwrap()),
                    (AssetClass::Stocks, Percentage::from_percentage(dec!(50.0)).unwrap()),
                    (AssetClass::RealEstate, Percentage::from_percentage(dec!(5.0)).unwrap()),
                ].iter().cloned().collect(),
                rebalancing_frequency: RebalancingFrequency::Quarterly,
                description: "Balanced approach between growth and stability".to_string(),
            },
            
            // Aggressive portfolios
            StrategicAllocation {
                model_name: "Aggressive Growth".to_string(),
                risk_tolerance: RiskTolerance::Aggressive,
                target_allocations: [
                    (AssetClass::Stocks, Percentage::from_percentage(dec!(80.0)).unwrap()),
                    (AssetClass::RealEstate, Percentage::from_percentage(dec!(10.0)).unwrap()),
                    (AssetClass::Commodities, Percentage::from_percentage(dec!(5.0)).unwrap()),
                    (AssetClass::Alternative, Percentage::from_percentage(dec!(5.0)).unwrap()),
                ].iter().cloned().collect(),
                rebalancing_frequency: RebalancingFrequency::SemiAnnually,
                description: "High-growth portfolio for long-term wealth building".to_string(),
            },
            
            // Ray Dalio's All Weather Portfolio
            StrategicAllocation {
                model_name: "All Weather".to_string(),
                risk_tolerance: RiskTolerance::ModeratelyConservative,
                target_allocations: [
                    (AssetClass::Stocks, Percentage::from_percentage(dec!(30.0)).unwrap()),
                    (AssetClass::Bonds, Percentage::from_percentage(dec!(55.0)).unwrap()), // 40% long-term + 15% intermediate
                    (AssetClass::Commodities, Percentage::from_percentage(dec!(7.5)).unwrap()),
                    (AssetClass::RealEstate, Percentage::from_percentage(dec!(7.5)).unwrap()),
                ].iter().cloned().collect(),
                rebalancing_frequency: RebalancingFrequency::Annually,
                description: "Risk parity approach designed to perform well in all economic environments".to_string(),
            },
            
            // Three-Fund Portfolio (Bogleheads)
            StrategicAllocation {
                model_name: "Three-Fund Portfolio".to_string(),
                risk_tolerance: RiskTolerance::Moderate,
                target_allocations: [
                    (AssetClass::Stocks, Percentage::from_percentage(dec!(70.0)).unwrap()), // 60% domestic + 10% international
                    (AssetClass::Bonds, Percentage::from_percentage(dec!(30.0)).unwrap()),
                ].iter().cloned().collect(),
                rebalancing_frequency: RebalancingFrequency::Annually,
                description: "Simple, low-cost approach using total market index funds".to_string(),
            },
        ]
    }

    /// Analyze current portfolio allocation against target
    pub fn analyze_allocation(
        &self,
        portfolio: &Portfolio,
        target_allocation: &StrategicAllocation,
    ) -> Result<RebalancingAnalysis> {
        let current_allocations = self.calculate_current_allocations(portfolio)?;
        let target_allocations = self.calculate_target_allocations(portfolio, &target_allocation.target_allocations)?;
        
        let mut deviations = HashMap::new();
        let mut requires_rebalancing = false;
        
        for asset_class in target_allocation.target_allocations.keys() {
            let current_pct = current_allocations.get(asset_class)
                .map(|info| info.percentage.as_percentage())
                .unwrap_or(dec!(0));
            let target_pct = target_allocation.target_allocations[asset_class].as_percentage();
            
            let deviation = current_pct - target_pct;
            deviations.insert(asset_class.clone(), deviation);
            
            if deviation.abs() > self.rebalancing_threshold.as_percentage() {
                requires_rebalancing = true;
            }
        }
        
        let recommended_trades = if requires_rebalancing {
            self.generate_rebalancing_trades(portfolio, &target_allocation.target_allocations)?
        } else {
            Vec::new()
        };
        
        let estimated_costs = self.calculate_transaction_costs(&recommended_trades);
        
        Ok(RebalancingAnalysis {
            current_allocations,
            target_allocations,
            deviations,
            requires_rebalancing,
            recommended_trades,
            estimated_costs,
            tax_implications: None, // TODO: Implement tax analysis
        })
    }

    /// Generate age-based allocation recommendation
    pub fn age_based_allocation(&self, age: u32, risk_tolerance: RiskTolerance) -> Result<StrategicAllocation> {
        // Rule of thumb: Stock allocation = 100 - age (or 110 - age for more aggressive)
        let base_stock_percentage = match risk_tolerance {
            RiskTolerance::Conservative => 80_u32.saturating_sub(age),
            RiskTolerance::ModeratelyConservative => 90_u32.saturating_sub(age),
            RiskTolerance::Moderate => 100_u32.saturating_sub(age),
            RiskTolerance::ModeratelyAggressive => 110_u32.saturating_sub(age),
            RiskTolerance::Aggressive => 120_u32.saturating_sub(age),
            RiskTolerance::VeryAggressive => 130_u32.saturating_sub(age),
        };
        
        let stock_pct = base_stock_percentage.min(90).max(20); // Cap between 20% and 90%
        let bond_pct = 100 - stock_pct - 10; // Leave 10% for other assets
        
        let mut target_allocations = HashMap::new();
        target_allocations.insert(AssetClass::Stocks, Percentage::from_percentage(Decimal::from(stock_pct))?);
        target_allocations.insert(AssetClass::Bonds, Percentage::from_percentage(Decimal::from(bond_pct))?);
        target_allocations.insert(AssetClass::RealEstate, Percentage::from_percentage(dec!(5.0))?);
        target_allocations.insert(AssetClass::Cash, Percentage::from_percentage(dec!(5.0))?);
        
        Ok(StrategicAllocation {
            model_name: format!("Age-Based Allocation (Age {})", age),
            risk_tolerance,
            target_allocations,
            rebalancing_frequency: RebalancingFrequency::Annually,
            description: format!("Age-appropriate allocation for {}-year-old investor", age),
        })
    }

    /// Generate lifecycle glide path
    pub fn lifecycle_glide_path(&self, current_age: u32, retirement_age: u32) -> Result<Vec<(u32, StrategicAllocation)>> {
        let mut glide_path = Vec::new();
        
        for age in (current_age..=retirement_age).step_by(5) {
            let risk_tolerance = if age < 35 {
                RiskTolerance::Aggressive
            } else if age < 50 {
                RiskTolerance::ModeratelyAggressive
            } else if age < 60 {
                RiskTolerance::Moderate
            } else {
                RiskTolerance::ModeratelyConservative
            };
            
            let allocation = self.age_based_allocation(age, risk_tolerance)?;
            glide_path.push((age, allocation));
        }
        
        Ok(glide_path)
    }

    // Private helper methods
    
    fn calculate_current_allocations(&self, portfolio: &Portfolio) -> Result<HashMap<AssetClass, AllocationInfo>> {
        let total_value = portfolio.total_value();
        let mut allocations = HashMap::new();
        
        if total_value.amount().is_zero() {
            return Ok(allocations);
        }
        
        for asset in &portfolio.assets {
            let percentage = Percentage::from_decimal(
                asset.current_value.amount() / total_value.amount()
            )?;
            
            let entry = allocations.entry(asset.asset_class.clone()).or_insert(AllocationInfo {
                percentage: Percentage::from_percentage(dec!(0))?,
                value: Money::new_unchecked(dec!(0), asset.current_value.currency()),
                deviation_from_target: dec!(0),
            });
            
            entry.percentage = Percentage::from_percentage(
                entry.percentage.as_percentage() + percentage.as_percentage()
            )?;
            entry.value = entry.value.add(&asset.current_value)?;
        }
        
        Ok(allocations)
    }

    fn calculate_target_allocations(
        &self,
        portfolio: &Portfolio,
        targets: &HashMap<AssetClass, Percentage>,
    ) -> Result<HashMap<AssetClass, AllocationInfo>> {
        let total_value = portfolio.total_value();
        let mut allocations = HashMap::new();
        
        for (asset_class, target_pct) in targets {
            let target_value = total_value.amount() * target_pct.as_decimal();
            
            allocations.insert(asset_class.clone(), AllocationInfo {
                percentage: *target_pct,
                value: Money::new_unchecked(target_value, total_value.currency()),
                deviation_from_target: dec!(0),
            });
        }
        
        Ok(allocations)
    }

    fn generate_rebalancing_trades(
        &self,
        portfolio: &Portfolio,
        target_allocations: &HashMap<AssetClass, Percentage>,
    ) -> Result<Vec<TradeRecommendation>> {
        let mut trades = Vec::new();
        let total_value = portfolio.total_value();
        
        // Group assets by class
        let mut assets_by_class: HashMap<AssetClass, Vec<&Asset>> = HashMap::new();
        for asset in &portfolio.assets {
            assets_by_class.entry(asset.asset_class.clone()).or_default().push(asset);
        }
        
        for (asset_class, target_pct) in target_allocations {
            let target_value = total_value.amount() * target_pct.as_decimal();
            
            if let Some(assets) = assets_by_class.get(asset_class) {
                let current_value: Decimal = assets.iter()
                    .map(|a| a.current_value.amount())
                    .sum();
                
                let value_diff = target_value - current_value;
                
                if value_diff.abs() > total_value.amount() * self.rebalancing_threshold.as_decimal() {
                    // For simplicity, recommend trading the largest asset in the class
                    if let Some(largest_asset) = assets.iter()
                        .max_by_key(|a| a.current_value.amount()) {
                        
                        let action = if value_diff > dec!(0) {
                            TradeAction::Buy
                        } else {
                            TradeAction::Sell
                        };
                        
                        let trade_value = value_diff.abs();
                        let quantity = if largest_asset.last_price.amount() > dec!(0) {
                            trade_value / largest_asset.last_price.amount()
                        } else {
                            dec!(0)
                        };
                        
                        trades.push(TradeRecommendation {
                            asset_id: largest_asset.id,
                            symbol: largest_asset.symbol.clone(),
                            action,
                            quantity,
                            estimated_value: Money::new_unchecked(trade_value, total_value.currency()),
                            current_weight: Percentage::from_decimal(current_value / total_value.amount())?,
                            target_weight: *target_pct,
                            reason: format!("Rebalance {} allocation", asset_class_name(asset_class)),
                        });
                    }
                }
            }
        }
        
        Ok(trades)
    }

    fn calculate_transaction_costs(&self, trades: &[TradeRecommendation]) -> Money {
        let total_trade_value: Decimal = trades.iter()
            .map(|t| t.estimated_value.amount())
            .sum();
        
        let currency = trades.first()
            .map(|t| t.estimated_value.currency())
            .unwrap_or(crate::types::Currency::USD);
        
        Money::new_unchecked(
            total_trade_value * self.transaction_cost.as_decimal(),
            currency,
        )
    }
}

fn asset_class_name(asset_class: &AssetClass) -> &'static str {
    match asset_class {
        AssetClass::Cash => "Cash",
        AssetClass::Bonds => "Bonds",
        AssetClass::Stocks => "Stocks",
        AssetClass::RealEstate => "Real Estate",
        AssetClass::Commodities => "Commodities",
        AssetClass::Crypto => "Cryptocurrency",
        AssetClass::Alternative => "Alternative",
    }
}

impl Default for AllocationStrategist {
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
    fn test_strategic_models() {
        let models = AllocationStrategist::get_strategic_models();
        assert_eq!(models.len(), 5);
        
        let conservative = models.iter().find(|m| m.model_name == "Conservative Income").unwrap();
        assert_eq!(conservative.risk_tolerance, RiskTolerance::Conservative);
        
        let all_weather = models.iter().find(|m| m.model_name == "All Weather").unwrap();
        assert_eq!(all_weather.target_allocations.len(), 4);
    }

    #[test]
    fn test_age_based_allocation() {
        let strategist = AllocationStrategist::new();
        
        let young_allocation = strategist.age_based_allocation(25, RiskTolerance::Aggressive).unwrap();
        let stock_allocation = young_allocation.target_allocations.get(&AssetClass::Stocks).unwrap();
        assert!(stock_allocation.as_percentage() > dec!(70)); // Should be aggressive
        
        let older_allocation = strategist.age_based_allocation(60, RiskTolerance::Conservative).unwrap();
        let stock_allocation_older = older_allocation.target_allocations.get(&AssetClass::Stocks).unwrap();
        assert!(stock_allocation_older.as_percentage() < stock_allocation.as_percentage());
    }

    #[test]
    fn test_lifecycle_glide_path() {
        let strategist = AllocationStrategist::new();
        let glide_path = strategist.lifecycle_glide_path(25, 65).unwrap();
        
        assert!(!glide_path.is_empty());
        
        // Stock allocation should decrease with age
        let first_allocation = &glide_path[0].1;
        let last_allocation = &glide_path[glide_path.len() - 1].1;
        
        let first_stocks = first_allocation.target_allocations.get(&AssetClass::Stocks).unwrap();
        let last_stocks = last_allocation.target_allocations.get(&AssetClass::Stocks).unwrap();
        
        assert!(first_stocks.as_percentage() > last_stocks.as_percentage());
    }

    #[test]
    fn test_rebalancing_threshold() {
        let strategist = AllocationStrategist::new()
            .with_rebalancing_threshold(Percentage::from_percentage(dec!(10.0)).unwrap());
        
        assert_eq!(strategist.rebalancing_threshold.as_percentage(), dec!(10.0));
    }
}