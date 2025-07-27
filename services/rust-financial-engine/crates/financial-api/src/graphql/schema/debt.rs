/// Debt GraphQL schema types

use async_graphql::{InputObject, SimpleObject};
use chrono::{DateTime, Utc};
use crate::graphql::types::*;

/// Debt account GraphQL type
#[derive(SimpleObject, Clone, Debug)]
pub struct DebtAccount {
    /// Unique identifier
    pub id: UuidType,
    /// Owner user ID
    pub user_id: UuidType,
    /// Account name
    pub name: String,
    /// Type of debt
    pub debt_type: DebtType,
    /// Current balance
    pub balance: Money,
    /// Interest rate
    pub interest_rate: Rate,
    /// Minimum payment amount
    pub minimum_payment: Money,
    /// Due date for next payment
    pub due_date: Option<DateTime<Utc>>,
    /// Credit limit (for credit cards)
    pub credit_limit: Option<Money>,
    /// Last payment date
    pub last_payment_date: Option<DateTime<Utc>>,
    /// Last payment amount
    pub last_payment_amount: Option<Money>,
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last update timestamp
    pub updated_at: DateTime<Utc>,
}

/// Payment plan for debt payoff
#[derive(SimpleObject, Clone, Debug)]
pub struct PaymentPlan {
    /// Debt account ID
    pub debt_id: UuidType,
    /// Debt account name
    pub debt_name: String,
    /// Payoff strategy used
    pub strategy: DebtStrategy,
    /// Monthly payment amount
    pub monthly_payment: Money,
    /// Total payments over life of debt
    pub total_payments: Money,
    /// Total interest paid
    pub total_interest: Money,
    /// Projected payoff date
    pub payoff_date: DateTime<Utc>,
    /// Detailed payment schedule
    pub payment_schedule: Vec<PaymentScheduleItem>,
    /// Plan creation timestamp
    pub created_at: DateTime<Utc>,
}

/// Individual payment in schedule
#[derive(SimpleObject, Clone, Debug)]
pub struct PaymentScheduleItem {
    /// Payment number
    pub payment_number: i32,
    /// Payment date
    pub payment_date: DateTime<Utc>,
    /// Total payment amount
    pub payment_amount: Money,
    /// Principal portion
    pub principal: Money,
    /// Interest portion
    pub interest: Money,
    /// Remaining balance after payment
    pub remaining_balance: Money,
}

/// Complete debt optimization result
#[derive(SimpleObject, Clone, Debug)]
pub struct DebtOptimizationResult {
    /// Strategy used
    pub strategy: DebtStrategy,
    /// Payment plans for all debts
    pub payment_plans: Vec<PaymentPlan>,
    /// Total monthly payment across all debts
    pub total_monthly_payment: Money,
    /// Total interest paid across all debts
    pub total_interest_paid: Money,
    /// Total time to pay off all debts (months)
    pub total_time_to_payoff_months: i32,
    /// Final payoff date
    pub final_payoff_date: DateTime<Utc>,
    /// Interest savings compared to minimum payments
    pub interest_savings_vs_minimum: Money,
    /// Time savings compared to minimum payments (months)
    pub time_savings_vs_minimum_months: i32,
    /// Generation timestamp
    pub generated_at: DateTime<Utc>,
}

/// Debt consolidation opportunity
#[derive(SimpleObject, Clone, Debug)]
pub struct ConsolidationOpportunity {
    /// Type of consolidation
    pub consolidation_type: ConsolidationType,
    /// Total consolidated balance
    pub consolidated_balance: Money,
    /// New interest rate after consolidation
    pub new_interest_rate: Rate,
    /// New monthly payment
    pub new_monthly_payment: Money,
    /// Total interest savings
    pub total_interest_savings: Money,
    /// Time savings in months
    pub time_savings_months: i32,
    /// Eligibility requirements
    pub eligibility_requirements: Vec<String>,
    /// Pros and cons analysis
    pub pros_and_cons: ConsolidationAnalysis,
}

/// Consolidation type enumeration
#[derive(async_graphql::Enum, Copy, Clone, Eq, PartialEq, Debug)]
pub enum ConsolidationType {
    PersonalLoan,
    BalanceTransfer,
    HomeEquityLoan,
    DebtManagementPlan,
    RefinancingProgram,
}

/// Consolidation analysis
#[derive(SimpleObject, Clone, Debug)]
pub struct ConsolidationAnalysis {
    /// Advantages of consolidation
    pub advantages: Vec<String>,
    /// Disadvantages of consolidation
    pub disadvantages: Vec<String>,
    /// Risk assessment
    pub risk_assessment: RiskLevel,
    /// Recommendation score (0-100)
    pub recommendation_score: DecimalType,
}

/// Risk level enumeration
#[derive(async_graphql::Enum, Copy, Clone, Eq, PartialEq, Debug)]
pub enum RiskLevel {
    Low,
    Moderate,
    High,
    VeryHigh,
}

/// Debt comparison analysis
#[derive(SimpleObject, Clone, Debug)]
pub struct DebtComparison {
    /// Snowball strategy result
    pub snowball_result: DebtOptimizationResult,
    /// Avalanche strategy result
    pub avalanche_result: DebtOptimizationResult,
    /// Minimum payments only result
    pub minimum_only_result: DebtOptimizationResult,
    /// Recommended strategy
    pub recommended_strategy: DebtStrategy,
    /// Reason for recommendation
    pub recommendation_reason: String,
    /// Psychological factors analysis
    pub psychological_factors: PsychologicalFactors,
}

/// Psychological factors in debt payoff
#[derive(SimpleObject, Clone, Debug)]
pub struct PsychologicalFactors {
    /// Motivation score for snowball (1-10)
    pub motivation_score_snowball: i32,
    /// Motivation score for avalanche (1-10)
    pub motivation_score_avalanche: i32,
    /// Importance of quick wins (0-1)
    pub quick_wins_importance: DecimalType,
    /// Mathematical optimality preference (0-1)
    pub mathematical_optimality: DecimalType,
    /// Estimated success probability
    pub estimated_success_probability: Percentage,
}

/// Debt negotiation opportunity
#[derive(SimpleObject, Clone, Debug)]
pub struct NegotiationOpportunity {
    /// Debt account ID
    pub debt_id: UuidType,
    /// Debt account name
    pub debt_name: String,
    /// Current balance
    pub current_balance: Money,
    /// Type of negotiation
    pub negotiation_type: NegotiationType,
    /// Potential savings
    pub potential_savings: Money,
    /// Success probability
    pub success_probability: Percentage,
    /// Negotiation strategy
    pub negotiation_strategy: String,
    /// Key talking points
    pub talking_points: Vec<String>,
    /// Required preparation steps
    pub required_preparation: Vec<String>,
}

/// Negotiation type enumeration
#[derive(async_graphql::Enum, Copy, Clone, Eq, PartialEq, Debug)]
pub enum NegotiationType {
    InterestRateReduction,
    BalanceSettlement,
    PaymentPlanModification,
    HardshipProgram,
    DebtForgiveness,
}

/// Input types for mutations

/// Create debt account input
#[derive(InputObject, Clone, Debug)]
pub struct CreateDebtAccountInput {
    /// Account name
    pub name: String,
    /// Type of debt
    pub debt_type: DebtType,
    /// Current balance
    pub balance: MoneyInput,
    /// Interest rate
    pub interest_rate: RateInput,
    /// Minimum payment
    pub minimum_payment: MoneyInput,
    /// Due date (optional)
    pub due_date: Option<DateTime<Utc>>,
    /// Credit limit (optional)
    pub credit_limit: Option<MoneyInput>,
}

/// Update debt account input
#[derive(InputObject, Clone, Debug)]
pub struct UpdateDebtAccountInput {
    /// Debt account ID
    pub id: UuidType,
    /// New name (optional)
    pub name: Option<String>,
    /// New balance (optional)
    pub balance: Option<MoneyInput>,
    /// New interest rate (optional)
    pub interest_rate: Option<RateInput>,
    /// New minimum payment (optional)
    pub minimum_payment: Option<MoneyInput>,
    /// New due date (optional)
    pub due_date: Option<DateTime<Utc>>,
    /// New credit limit (optional)
    pub credit_limit: Option<MoneyInput>,
}

/// Debt optimization input
#[derive(InputObject, Clone, Debug)]
pub struct OptimizeDebtInput {
    /// Debt account IDs to optimize
    pub debt_ids: Vec<UuidType>,
    /// Strategy to use
    pub strategy: DebtStrategy,
    /// Extra monthly payment amount (optional)
    pub extra_payment: Option<MoneyInput>,
    /// Target payoff date (optional)
    pub target_payoff_date: Option<DateTime<Utc>>,
}

/// Payment plan input
#[derive(InputObject, Clone, Debug)]
pub struct CreatePaymentPlanInput {
    /// Debt account ID
    pub debt_id: UuidType,
    /// Strategy to use
    pub strategy: DebtStrategy,
    /// Monthly payment amount
    pub monthly_payment: MoneyInput,
}

/// Debt filter input
#[derive(InputObject, Clone, Debug)]
pub struct DebtFilterInput {
    /// Filter by user ID
    pub user_id: Option<UuidType>,
    /// Filter by debt type
    pub debt_type: Option<DebtType>,
    /// Filter by balance range
    pub balance_range: Option<ValueRangeInput>,
    /// Filter by interest rate range
    pub interest_rate_range: Option<RateRangeInput>,
    /// Filter by creation date range
    pub created_date_range: Option<DateRangeInput>,
}

/// Rate range input for filtering
#[derive(InputObject, Clone, Debug)]
pub struct RateRangeInput {
    /// Minimum rate
    pub min: Option<PercentageInput>,
    /// Maximum rate
    pub max: Option<PercentageInput>,
}

/// Debt statistics
#[derive(SimpleObject, Clone, Debug)]
pub struct DebtStatistics {
    /// Total debt balance
    pub total_balance: Money,
    /// Total minimum payments
    pub total_minimum_payments: Money,
    /// Average interest rate
    pub average_interest_rate: Percentage,
    /// Highest interest rate
    pub highest_interest_rate: Percentage,
    /// Lowest interest rate
    pub lowest_interest_rate: Percentage,
    /// Number of debt accounts
    pub debt_account_count: i32,
    /// Debt-to-income ratio (if income provided)
    pub debt_to_income_ratio: Option<Percentage>,
    /// Time to payoff with minimum payments
    pub time_to_payoff_minimum_months: i32,
    /// Total interest with minimum payments
    pub total_interest_minimum: Money,
}

/// Debt utilization metrics
#[derive(SimpleObject, Clone, Debug)]
pub struct DebtUtilization {
    /// Credit utilization ratio
    pub credit_utilization: Percentage,
    /// Available credit
    pub available_credit: Money,
    /// Total credit limits
    pub total_credit_limits: Money,
    /// Used credit
    pub used_credit: Money,
    /// Number of accounts at max utilization
    pub accounts_at_max_utilization: i32,
}

/// Debt connections for pagination
pub type DebtAccountConnection = Connection<DebtAccount>;
pub type PaymentPlanConnection = Connection<PaymentPlan>;

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;
    use rust_decimal_macros::dec;

    #[test]
    fn test_debt_account_creation() {
        let debt = DebtAccount {
            id: UuidType(Uuid::new_v4()),
            user_id: UuidType(Uuid::new_v4()),
            name: "Credit Card".to_string(),
            debt_type: DebtType::CreditCard,
            balance: Money {
                amount: DecimalType(dec!(5000)),
                currency: Currency::USD,
            },
            interest_rate: Rate {
                percentage: Percentage {
                    value: DecimalType(dec!(18.99)),
                },
                period: Period::Annual,
            },
            minimum_payment: Money {
                amount: DecimalType(dec!(100)),
                currency: Currency::USD,
            },
            due_date: None,
            credit_limit: Some(Money {
                amount: DecimalType(dec!(10000)),
                currency: Currency::USD,
            }),
            last_payment_date: None,
            last_payment_amount: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        assert_eq!(debt.name, "Credit Card");
        assert_eq!(debt.debt_type, DebtType::CreditCard);
    }

    #[test]
    fn test_debt_optimization_result() {
        let result = DebtOptimizationResult {
            strategy: DebtStrategy::Avalanche,
            payment_plans: vec![],
            total_monthly_payment: Money {
                amount: DecimalType(dec!(500)),
                currency: Currency::USD,
            },
            total_interest_paid: Money {
                amount: DecimalType(dec!(2000)),
                currency: Currency::USD,
            },
            total_time_to_payoff_months: 24,
            final_payoff_date: Utc::now(),
            interest_savings_vs_minimum: Money {
                amount: DecimalType(dec!(1000)),
                currency: Currency::USD,
            },
            time_savings_vs_minimum_months: 12,
            generated_at: Utc::now(),
        };

        assert_eq!(result.strategy, DebtStrategy::Avalanche);
        assert_eq!(result.total_time_to_payoff_months, 24);
    }
}