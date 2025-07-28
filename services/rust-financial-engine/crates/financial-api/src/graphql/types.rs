/// GraphQL type definitions and scalar types
///
/// Provides GraphQL-compatible types that map to core financial types
/// with proper serialization and validation.
use async_graphql::{scalar, Enum, InputObject, Object, SimpleObject};
use chrono::{DateTime, Utc};
use financial_core::debt::{DebtStrategy as CoreDebtStrategy, DebtType as CoreDebtType};
use financial_core::portfolio::{
    RiskTolerance as CoreRiskTolerance, TradeAction as CoreTradeAction,
};
use financial_core::types::{
    AssetClass as CoreAssetClass, Currency as CoreCurrency, Period as CorePeriod,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Custom scalar for Decimal amounts
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct DecimalType(pub Decimal);

scalar!(DecimalType);

/// Custom scalar for UUID
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct UuidType(pub Uuid);

scalar!(UuidType);

/// Currency enumeration for GraphQL
#[derive(Enum, Copy, Clone, Eq, PartialEq, Debug)]
pub enum Currency {
    USD,
    EUR,
    GBP,
    CAD,
    AUD,
    JPY,
    CHF,
    CNY,
}

impl From<CoreCurrency> for Currency {
    fn from(currency: CoreCurrency) -> Self {
        match currency {
            CoreCurrency::USD => Currency::USD,
            CoreCurrency::EUR => Currency::EUR,
            CoreCurrency::GBP => Currency::GBP,
            CoreCurrency::CAD => Currency::CAD,
            CoreCurrency::AUD => Currency::AUD,
            CoreCurrency::JPY => Currency::JPY,
            CoreCurrency::CHF => Currency::CHF,
            CoreCurrency::CNY => Currency::CNY,
        }
    }
}

impl From<Currency> for CoreCurrency {
    fn from(currency: Currency) -> Self {
        match currency {
            Currency::USD => CoreCurrency::USD,
            Currency::EUR => CoreCurrency::EUR,
            Currency::GBP => CoreCurrency::GBP,
            Currency::CAD => CoreCurrency::CAD,
            Currency::AUD => CoreCurrency::AUD,
            Currency::JPY => CoreCurrency::JPY,
            Currency::CHF => CoreCurrency::CHF,
            Currency::CNY => CoreCurrency::CNY,
        }
    }
}

/// Asset class enumeration for GraphQL
#[derive(Enum, Copy, Clone, Eq, PartialEq, Debug)]
pub enum AssetClass {
    Cash,
    Bonds,
    Stocks,
    RealEstate,
    Commodities,
    Crypto,
    Alternative,
}

impl From<CoreAssetClass> for AssetClass {
    fn from(asset_class: CoreAssetClass) -> Self {
        match asset_class {
            CoreAssetClass::Cash => AssetClass::Cash,
            CoreAssetClass::Bonds => AssetClass::Bonds,
            CoreAssetClass::Stocks => AssetClass::Stocks,
            CoreAssetClass::RealEstate => AssetClass::RealEstate,
            CoreAssetClass::Commodities => AssetClass::Commodities,
            CoreAssetClass::Crypto => AssetClass::Crypto,
            CoreAssetClass::Alternative => AssetClass::Alternative,
        }
    }
}

impl From<AssetClass> for CoreAssetClass {
    fn from(asset_class: AssetClass) -> Self {
        match asset_class {
            AssetClass::Cash => CoreAssetClass::Cash,
            AssetClass::Bonds => CoreAssetClass::Bonds,
            AssetClass::Stocks => CoreAssetClass::Stocks,
            AssetClass::RealEstate => CoreAssetClass::RealEstate,
            AssetClass::Commodities => CoreAssetClass::Commodities,
            AssetClass::Crypto => CoreAssetClass::Crypto,
            AssetClass::Alternative => CoreAssetClass::Alternative,
        }
    }
}

/// Period enumeration for GraphQL
#[derive(Enum, Copy, Clone, Eq, PartialEq, Debug)]
pub enum Period {
    Annual,
    Monthly,
    Daily,
}

impl From<CorePeriod> for Period {
    fn from(period: CorePeriod) -> Self {
        match period {
            CorePeriod::Annual => Period::Annual,
            CorePeriod::Monthly => Period::Monthly,
            CorePeriod::Daily => Period::Daily,
        }
    }
}

impl From<Period> for CorePeriod {
    fn from(period: Period) -> Self {
        match period {
            Period::Annual => CorePeriod::Annual,
            Period::Monthly => CorePeriod::Monthly,
            Period::Daily => CorePeriod::Daily,
        }
    }
}

/// Trade action enumeration
#[derive(Enum, Copy, Clone, Eq, PartialEq, Debug)]
pub enum TradeAction {
    Buy,
    Sell,
    Hold,
    Rebalance,
}

impl From<CoreTradeAction> for TradeAction {
    fn from(action: CoreTradeAction) -> Self {
        match action {
            CoreTradeAction::Buy => TradeAction::Buy,
            CoreTradeAction::Sell => TradeAction::Sell,
            CoreTradeAction::Hold => TradeAction::Hold,
            CoreTradeAction::Rebalance => TradeAction::Rebalance,
        }
    }
}

impl From<TradeAction> for CoreTradeAction {
    fn from(action: TradeAction) -> Self {
        match action {
            TradeAction::Buy => CoreTradeAction::Buy,
            TradeAction::Sell => CoreTradeAction::Sell,
            TradeAction::Hold => CoreTradeAction::Hold,
            TradeAction::Rebalance => CoreTradeAction::Rebalance,
        }
    }
}

/// Risk tolerance enumeration
#[derive(Enum, Copy, Clone, Eq, PartialEq, Debug)]
pub enum RiskTolerance {
    Conservative,
    ModeratelyConservative,
    Moderate,
    ModeratelyAggressive,
    Aggressive,
    VeryAggressive,
}

impl From<CoreRiskTolerance> for RiskTolerance {
    fn from(tolerance: CoreRiskTolerance) -> Self {
        match tolerance {
            CoreRiskTolerance::Conservative => RiskTolerance::Conservative,
            CoreRiskTolerance::ModeratelyConservative => RiskTolerance::ModeratelyConservative,
            CoreRiskTolerance::Moderate => RiskTolerance::Moderate,
            CoreRiskTolerance::ModeratelyAggressive => RiskTolerance::ModeratelyAggressive,
            CoreRiskTolerance::Aggressive => RiskTolerance::Aggressive,
            CoreRiskTolerance::VeryAggressive => RiskTolerance::VeryAggressive,
        }
    }
}

impl From<RiskTolerance> for CoreRiskTolerance {
    fn from(tolerance: RiskTolerance) -> Self {
        match tolerance {
            RiskTolerance::Conservative => CoreRiskTolerance::Conservative,
            RiskTolerance::ModeratelyConservative => CoreRiskTolerance::ModeratelyConservative,
            RiskTolerance::Moderate => CoreRiskTolerance::Moderate,
            RiskTolerance::ModeratelyAggressive => CoreRiskTolerance::ModeratelyAggressive,
            RiskTolerance::Aggressive => CoreRiskTolerance::Aggressive,
            RiskTolerance::VeryAggressive => CoreRiskTolerance::VeryAggressive,
        }
    }
}

/// Debt type enumeration
#[derive(Enum, Copy, Clone, Eq, PartialEq, Debug)]
pub enum DebtType {
    CreditCard,
    StudentLoan,
    Mortgage,
    PersonalLoan,
    AutoLoan,
    HomeEquityLoan,
    MedicalDebt,
    Other,
}

impl From<CoreDebtType> for DebtType {
    fn from(debt_type: CoreDebtType) -> Self {
        match debt_type {
            CoreDebtType::CreditCard => DebtType::CreditCard,
            CoreDebtType::StudentLoan => DebtType::StudentLoan,
            CoreDebtType::Mortgage => DebtType::Mortgage,
            CoreDebtType::PersonalLoan => DebtType::PersonalLoan,
            CoreDebtType::AutoLoan => DebtType::AutoLoan,
            CoreDebtType::HomeEquityLoan => DebtType::HomeEquityLoan,
            CoreDebtType::MedicalDebt => DebtType::MedicalDebt,
            CoreDebtType::Other => DebtType::Other,
        }
    }
}

impl From<DebtType> for CoreDebtType {
    fn from(debt_type: DebtType) -> Self {
        match debt_type {
            DebtType::CreditCard => CoreDebtType::CreditCard,
            DebtType::StudentLoan => CoreDebtType::StudentLoan,
            DebtType::Mortgage => CoreDebtType::Mortgage,
            DebtType::PersonalLoan => CoreDebtType::PersonalLoan,
            DebtType::AutoLoan => CoreDebtType::AutoLoan,
            DebtType::HomeEquityLoan => CoreDebtType::HomeEquityLoan,
            DebtType::MedicalDebt => CoreDebtType::MedicalDebt,
            DebtType::Other => CoreDebtType::Other,
        }
    }
}

/// Debt strategy enumeration
#[derive(Enum, Copy, Clone, Eq, PartialEq, Debug)]
pub enum DebtStrategy {
    Snowball,
    Avalanche,
    Custom,
    Consolidation,
}

impl From<CoreDebtStrategy> for DebtStrategy {
    fn from(strategy: CoreDebtStrategy) -> Self {
        match strategy {
            CoreDebtStrategy::Snowball => DebtStrategy::Snowball,
            CoreDebtStrategy::Avalanche => DebtStrategy::Avalanche,
            CoreDebtStrategy::Custom => DebtStrategy::Custom,
            CoreDebtStrategy::Consolidation => DebtStrategy::Consolidation,
        }
    }
}

impl From<DebtStrategy> for CoreDebtStrategy {
    fn from(strategy: DebtStrategy) -> Self {
        match strategy {
            DebtStrategy::Snowball => CoreDebtStrategy::Snowball,
            DebtStrategy::Avalanche => CoreDebtStrategy::Avalanche,
            DebtStrategy::Custom => CoreDebtStrategy::Custom,
            DebtStrategy::Consolidation => CoreDebtStrategy::Consolidation,
        }
    }
}

/// Money type for GraphQL
#[derive(SimpleObject, Clone, Debug)]
pub struct Money {
    /// The monetary amount as a decimal
    pub amount: DecimalType,
    /// The currency of the amount
    pub currency: Currency,
}

impl From<financial_core::types::Money> for Money {
    fn from(money: financial_core::types::Money) -> Self {
        Self {
            amount: DecimalType(money.amount()),
            currency: money.currency().into(),
        }
    }
}

/// Percentage type for GraphQL
#[derive(SimpleObject, Clone, Debug)]
pub struct Percentage {
    /// The percentage value (e.g., 5.5 for 5.5%)
    pub value: DecimalType,
}

impl From<financial_core::types::Percentage> for Percentage {
    fn from(percentage: financial_core::types::Percentage) -> Self {
        Self {
            value: DecimalType(percentage.as_percentage()),
        }
    }
}

/// Rate type for GraphQL
#[derive(SimpleObject, Clone, Debug)]
pub struct Rate {
    /// The rate percentage
    pub percentage: Percentage,
    /// The time period for the rate
    pub period: Period,
}

impl From<financial_core::types::Rate> for Rate {
    fn from(rate: financial_core::types::Rate) -> Self {
        Self {
            percentage: financial_core::types::Percentage::from_decimal(rate.as_decimal())
                .unwrap()
                .into(),
            period: Period::Annual, // Default to annual, would need to track period in Rate
        }
    }
}

/// Input type for creating money amounts
#[derive(InputObject, Clone, Debug)]
pub struct MoneyInput {
    /// The monetary amount
    pub amount: DecimalType,
    /// The currency
    pub currency: Currency,
}

/// Input type for creating percentages
#[derive(InputObject, Clone, Debug)]
pub struct PercentageInput {
    /// The percentage value (e.g., 5.5 for 5.5%)
    pub value: DecimalType,
}

/// Input type for creating rates
#[derive(InputObject, Clone, Debug)]
pub struct RateInput {
    /// The rate percentage
    pub percentage: PercentageInput,
    /// The time period
    pub period: Period,
}

/// Date range input for filtering
#[derive(InputObject, Clone, Debug)]
pub struct DateRangeInput {
    /// Start date (inclusive)
    pub start: DateTime<Utc>,
    /// End date (inclusive)
    pub end: DateTime<Utc>,
}

/// Value range input for filtering
#[derive(InputObject, Clone, Debug)]
pub struct ValueRangeInput {
    /// Minimum value (inclusive)
    pub min: DecimalType,
    /// Maximum value (inclusive)
    pub max: DecimalType,
}

/// Risk level enum for GraphQL compatibility
#[derive(Enum, Copy, Clone, Eq, PartialEq, Debug)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

impl From<financial_core::types::RiskLevel> for RiskLevel {
    fn from(risk_level: financial_core::types::RiskLevel) -> Self {
        match risk_level {
            financial_core::types::RiskLevel::Conservative => RiskLevel::Low,
            financial_core::types::RiskLevel::Moderate => RiskLevel::Medium,
            financial_core::types::RiskLevel::Aggressive => RiskLevel::High,
            financial_core::types::RiskLevel::Speculative => RiskLevel::High,
        }
    }
}

/// Pagination input
#[derive(InputObject, Clone, Debug)]
pub struct PaginationInput {
    /// Number of items to return (max 100)
    pub limit: Option<i32>,
    /// Number of items to skip
    pub offset: Option<i32>,
}

/// Sorting input
#[derive(InputObject, Clone, Debug)]
pub struct SortInput {
    /// Field to sort by
    pub field: String,
    /// Sort direction (true = ascending, false = descending)
    pub ascending: Option<bool>,
}

/// Connection type for pagination
#[derive(SimpleObject, Clone, Debug)]
pub struct Connection<T: Send + Sync + async_graphql::OutputType> {
    /// The items in this page
    pub edges: Vec<Edge<T>>,
    /// Information about the current page
    pub page_info: PageInfo,
    /// Total count of items
    pub total_count: i32,
}

/// Edge type for pagination
#[derive(SimpleObject, Clone, Debug)]
pub struct Edge<T: Send + Sync + async_graphql::OutputType> {
    /// The item
    pub node: T,
    /// Cursor for pagination
    pub cursor: String,
}

/// Page information for pagination
#[derive(SimpleObject, Clone, Debug)]
pub struct PageInfo {
    /// Whether there is a next page
    pub has_next_page: bool,
    /// Whether there is a previous page
    pub has_previous_page: bool,
    /// Cursor for the first item
    pub start_cursor: Option<String>,
    /// Cursor for the last item
    pub end_cursor: Option<String>,
}

impl<T: Send + Sync + async_graphql::OutputType> Connection<T> {
    /// Create a new connection
    pub fn new(items: Vec<T>, total_count: i32, offset: i32, limit: i32) -> Self
    where
        T: Clone,
    {
        let has_next_page = offset + limit < total_count;
        let has_previous_page = offset > 0;

        let edges: Vec<Edge<T>> = items
            .into_iter()
            .enumerate()
            .map(|(i, node)| Edge {
                node,
                cursor: format!("cursor_{}", offset + i as i32),
            })
            .collect();

        let start_cursor = edges.first().map(|e| e.cursor.clone());
        let end_cursor = edges.last().map(|e| e.cursor.clone());

        Self {
            edges,
            page_info: PageInfo {
                has_next_page,
                has_previous_page,
                start_cursor,
                end_cursor,
            },
            total_count,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_currency_conversion() {
        let core_currency = CoreCurrency::USD;
        let gql_currency: Currency = core_currency.into();
        assert_eq!(gql_currency, Currency::USD);

        let back_to_core: CoreCurrency = gql_currency.into();
        assert_eq!(back_to_core, CoreCurrency::USD);
    }

    #[test]
    fn test_money_conversion() {
        let core_money =
            financial_core::types::Money::new(dec!(100.50), CoreCurrency::USD).unwrap();
        let gql_money: Money = core_money.into();

        assert_eq!(gql_money.amount.0, dec!(100.50));
        assert_eq!(gql_money.currency, Currency::USD);
    }

    #[test]
    fn test_connection_creation() {
        let items = vec!["item1", "item2", "item3"];
        let connection = Connection::new(items, 10, 0, 3);

        assert_eq!(connection.edges.len(), 3);
        assert_eq!(connection.total_count, 10);
        assert!(connection.page_info.has_next_page);
        assert!(!connection.page_info.has_previous_page);
    }
}
