use crate::graphql::types::*;
/// Portfolio GraphQL schema types
use async_graphql::{InputObject, SimpleObject};
use chrono::{DateTime, Utc};

/// Portfolio GraphQL type
#[derive(SimpleObject, Clone, Debug)]
pub struct Portfolio {
    /// Unique identifier
    pub id: UuidType,
    /// Owner user ID
    pub user_id: UuidType,
    /// Portfolio name
    pub name: String,
    /// Optional description
    pub description: Option<String>,
    /// Assets in the portfolio
    pub assets: Vec<Asset>,
    /// Benchmark for comparison
    pub benchmark: Option<String>,
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last update timestamp
    pub updated_at: DateTime<Utc>,
}

/// Asset GraphQL type
#[derive(SimpleObject, Clone, Debug)]
pub struct Asset {
    /// Unique identifier
    pub id: UuidType,
    /// Asset symbol/ticker
    pub symbol: String,
    /// Asset name
    pub name: String,
    /// Asset class classification
    pub asset_class: AssetClass,
    /// Quantity held
    pub quantity: DecimalType,
    /// Original cost basis
    pub cost_basis: Money,
    /// Current market value
    pub current_value: Money,
    /// Target allocation percentage
    pub allocation_target: Option<Percentage>,
    /// Last known price per unit
    pub last_price: Money,
    /// Last price update timestamp
    pub last_updated: DateTime<Utc>,
}

/// Portfolio performance metrics
#[derive(SimpleObject, Clone, Debug)]
pub struct PortfolioMetrics {
    /// Total portfolio value
    pub total_value: Money,
    /// Total cost basis
    pub total_cost_basis: Money,
    /// Total return amount
    pub total_return: DecimalType,
    /// Total return percentage
    pub total_return_percentage: Percentage,
    /// Expected annual return
    pub expected_return: DecimalType,
    /// Portfolio volatility (standard deviation)
    pub volatility: DecimalType,
    /// Sharpe ratio
    pub sharpe_ratio: DecimalType,
    /// Sortino ratio
    pub sortino_ratio: Option<DecimalType>,
    /// Beta (relative to benchmark)
    pub beta: Option<DecimalType>,
    /// Alpha (excess return over benchmark)
    pub alpha: Option<DecimalType>,
    /// Value at Risk (95% confidence)
    pub value_at_risk: Money,
    /// Conditional Value at Risk
    pub conditional_value_at_risk: Option<Money>,
    /// Maximum drawdown
    pub max_drawdown: DecimalType,
    /// Calculation timestamp
    pub calculated_at: DateTime<Utc>,
}

/// Asset allocation breakdown
#[derive(SimpleObject, Clone, Debug)]
pub struct AssetAllocation {
    /// Asset class
    pub asset_class: AssetClass,
    /// Current weight in portfolio
    pub current_weight: Percentage,
    /// Target weight
    pub target_weight: Option<Percentage>,
    /// Total value in this asset class
    pub value: Money,
    /// Deviation from target
    pub deviation: Option<Percentage>,
}

/// Portfolio optimization constraints
#[derive(SimpleObject, Clone, Debug)]
pub struct OptimizationConstraints {
    /// Risk tolerance level
    pub risk_tolerance: RiskTolerance,
    /// Target return (optional)
    pub target_return: Option<DecimalType>,
    /// Maximum weight for any single asset
    pub max_asset_weight: Option<Percentage>,
    /// Minimum weight for any asset
    pub min_asset_weight: Option<Percentage>,
    /// Assets to exclude from optimization
    pub exclude_assets: Vec<String>,
    /// Whether to include cash in optimization
    pub include_cash: bool,
    /// Whether to allow short selling
    pub allow_short_selling: bool,
    /// Transaction cost percentage
    pub transaction_cost: Option<Percentage>,
}

/// Rebalancing recommendation
#[derive(SimpleObject, Clone, Debug)]
pub struct RebalancingRecommendation {
    /// Portfolio ID
    pub portfolio_id: UuidType,
    /// Individual trade recommendations
    pub recommendations: Vec<TradeRecommendation>,
    /// Estimated total transaction cost
    pub estimated_transaction_cost: Money,
    /// New expected return after rebalancing
    pub new_expected_return: DecimalType,
    /// New volatility after rebalancing
    pub new_volatility: DecimalType,
    /// New Sharpe ratio after rebalancing
    pub new_sharpe_ratio: DecimalType,
    /// Generation timestamp
    pub generated_at: DateTime<Utc>,
}

/// Individual trade recommendation
#[derive(SimpleObject, Clone, Debug)]
pub struct TradeRecommendation {
    /// Asset ID
    pub asset_id: UuidType,
    /// Asset symbol
    pub symbol: String,
    /// Recommended action
    pub action: TradeAction,
    /// Quantity to trade
    pub quantity: DecimalType,
    /// Estimated trade value
    pub estimated_value: Money,
    /// Current allocation weight
    pub current_weight: Percentage,
    /// Target allocation weight
    pub target_weight: Percentage,
    /// Reason for recommendation
    pub reason: String,
}

/// Historical returns data
#[derive(SimpleObject, Clone, Debug)]
pub struct HistoricalReturns {
    /// Asset ID
    pub asset_id: UuidType,
    /// Asset symbol
    pub symbol: String,
    /// Returns data points
    pub returns: Vec<PeriodReturn>,
    /// Data frequency
    pub frequency: ReturnFrequency,
}

/// Single period return
#[derive(SimpleObject, Clone, Debug)]
pub struct PeriodReturn {
    /// Date of return
    pub date: DateTime<Utc>,
    /// Return value
    pub return_value: DecimalType,
    /// Adjusted closing price
    pub adjusted_close: Option<Money>,
}

/// Return frequency enumeration
#[derive(async_graphql::Enum, Copy, Clone, Eq, PartialEq, Debug)]
pub enum ReturnFrequency {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    Annual,
}

/// Input types for mutations

/// Create portfolio input
#[derive(InputObject, Clone, Debug)]
pub struct CreatePortfolioInput {
    /// Portfolio name
    pub name: String,
    /// Optional description
    pub description: Option<String>,
    /// Optional benchmark
    pub benchmark: Option<String>,
}

/// Update portfolio input
#[derive(InputObject, Clone, Debug)]
pub struct UpdatePortfolioInput {
    /// Portfolio ID
    pub id: UuidType,
    /// New name (optional)
    pub name: Option<String>,
    /// New description (optional)
    pub description: Option<String>,
    /// New benchmark (optional)
    pub benchmark: Option<String>,
}

/// Add asset input
#[derive(InputObject, Clone, Debug)]
pub struct AddAssetInput {
    /// Portfolio ID
    pub portfolio_id: UuidType,
    /// Asset symbol
    pub symbol: String,
    /// Asset name
    pub name: String,
    /// Asset class
    pub asset_class: AssetClass,
    /// Quantity purchased
    pub quantity: DecimalType,
    /// Cost basis
    pub cost_basis: MoneyInput,
    /// Current value
    pub current_value: MoneyInput,
    /// Target allocation (optional)
    pub allocation_target: Option<PercentageInput>,
}

/// Portfolio analysis result
#[derive(SimpleObject, Clone, Debug)]
pub struct PortfolioAnalysis {
    /// Portfolio ID
    pub portfolio_id: UuidType,
    /// Current value
    pub current_value: Money,
    /// Total return
    pub total_return: DecimalType,
    /// Annualized return
    pub annualized_return: DecimalType,
    /// Portfolio volatility
    pub volatility: DecimalType,
    /// Sharpe ratio
    pub sharpe_ratio: DecimalType,
    /// Risk level
    pub risk_level: RiskLevel,
    /// Asset allocation breakdown
    pub asset_allocation: Vec<AssetAllocation>,
    /// Rebalancing recommendations
    pub rebalancing_recommendations: Vec<TradeRecommendation>,
    /// Analysis timestamp
    pub analyzed_at: DateTime<Utc>,
}

/// Optimization strategy enumeration
#[derive(async_graphql::Enum, Copy, Clone, Eq, PartialEq, Debug)]
pub enum OptimizationStrategy {
    /// Maximize returns
    MaximizeReturn,
    /// Minimize risk
    MinimizeRisk,
    /// Maximize Sharpe ratio
    MaximizeSharpe,
    /// Equal weight allocation
    EqualWeight,
    /// Target risk level
    TargetRisk,
    /// Target return level
    TargetReturn,
}

/// Update asset input
#[derive(InputObject, Clone, Debug)]
pub struct UpdateAssetInput {
    /// Asset ID
    pub id: UuidType,
    /// New quantity (optional)
    pub quantity: Option<DecimalType>,
    /// New cost basis (optional)
    pub cost_basis: Option<MoneyInput>,
    /// New current value (optional)
    pub current_value: Option<MoneyInput>,
    /// New target allocation (optional)
    pub allocation_target: Option<PercentageInput>,
}

/// Portfolio optimization input
#[derive(InputObject, Clone, Debug)]
pub struct OptimizePortfolioInput {
    /// Portfolio ID
    pub portfolio_id: UuidType,
    /// Optimization constraints
    pub constraints: OptimizationConstraintsInput,
}

/// Optimization constraints input
#[derive(InputObject, Clone, Debug)]
pub struct OptimizationConstraintsInput {
    /// Risk tolerance
    pub risk_tolerance: RiskTolerance,
    /// Target return (optional)
    pub target_return: Option<DecimalType>,
    /// Maximum asset weight (optional)
    pub max_asset_weight: Option<PercentageInput>,
    /// Minimum asset weight (optional)
    pub min_asset_weight: Option<PercentageInput>,
    /// Assets to exclude
    pub exclude_assets: Option<Vec<String>>,
    /// Include cash in optimization
    pub include_cash: Option<bool>,
    /// Allow short selling
    pub allow_short_selling: Option<bool>,
    /// Transaction cost (optional)
    pub transaction_cost: Option<PercentageInput>,
}

/// Portfolio filter input
#[derive(InputObject, Clone, Debug)]
pub struct PortfolioFilterInput {
    /// Filter by user ID
    pub user_id: Option<UuidType>,
    /// Filter by name pattern
    pub name_contains: Option<String>,
    /// Filter by creation date range
    pub created_date_range: Option<DateRangeInput>,
    /// Filter by total value range
    pub value_range: Option<ValueRangeInput>,
}

/// Value range input for filtering
#[derive(InputObject, Clone, Debug)]
pub struct ValueRangeInput {
    /// Minimum value
    pub min: Option<MoneyInput>,
    /// Maximum value
    pub max: Option<MoneyInput>,
}

/// Portfolio connection for pagination
pub type PortfolioConnection = Connection<Portfolio>;

/// Asset connection for pagination
pub type AssetConnection = Connection<Asset>;

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;
    use uuid::Uuid;

    #[test]
    fn test_portfolio_creation() {
        let portfolio = Portfolio {
            id: UuidType(Uuid::new_v4()),
            user_id: UuidType(Uuid::new_v4()),
            name: "Test Portfolio".to_string(),
            description: Some("A test portfolio".to_string()),
            assets: vec![],
            benchmark: Some("S&P 500".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        assert_eq!(portfolio.name, "Test Portfolio");
        assert!(portfolio.description.is_some());
    }

    #[test]
    fn test_asset_creation() {
        let asset = Asset {
            id: UuidType(Uuid::new_v4()),
            symbol: "AAPL".to_string(),
            name: "Apple Inc.".to_string(),
            asset_class: AssetClass::Stocks,
            quantity: DecimalType(dec!(100)),
            cost_basis: Money {
                amount: DecimalType(dec!(15000)),
                currency: Currency::USD,
            },
            current_value: Money {
                amount: DecimalType(dec!(17500)),
                currency: Currency::USD,
            },
            allocation_target: Some(Percentage {
                value: DecimalType(dec!(10)),
            }),
            last_price: Money {
                amount: DecimalType(dec!(175)),
                currency: Currency::USD,
            },
            last_updated: Utc::now(),
        };

        assert_eq!(asset.symbol, "AAPL");
        assert_eq!(asset.asset_class, AssetClass::Stocks);
    }
}
