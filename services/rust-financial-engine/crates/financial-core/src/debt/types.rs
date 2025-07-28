use crate::types::{Money, Percentage, Rate};
use chrono::{DateTime, Utc};
/// Debt management types and structures
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Debt account with payment information
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DebtAccount {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub debt_type: DebtType,
    pub balance: Money,
    pub interest_rate: Rate,
    pub minimum_payment: Money,
    pub due_date: Option<DateTime<Utc>>,
    pub credit_limit: Option<Money>,
    pub last_payment_date: Option<DateTime<Utc>>,
    pub last_payment_amount: Option<Money>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Types of debt for categorization
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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

/// Debt payoff strategy options
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DebtStrategy {
    Snowball,      // Pay minimum on all, extra on lowest balance
    Avalanche,     // Pay minimum on all, extra on highest interest rate
    Custom,        // User-defined payment allocation
    Consolidation, // Combine debts into single payment
}

/// Payment plan for a single debt
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PaymentPlan {
    pub debt_id: Uuid,
    pub debt_name: String,
    pub strategy: DebtStrategy,
    pub monthly_payment: Money,
    pub total_payments: Money,
    pub total_interest: Money,
    pub payoff_date: DateTime<Utc>,
    pub payment_schedule: Vec<PaymentScheduleItem>,
    pub created_at: DateTime<Utc>,
}

/// Individual payment in the schedule
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PaymentScheduleItem {
    pub payment_number: u32,
    pub payment_date: DateTime<Utc>,
    pub payment_amount: Money,
    pub principal: Money,
    pub interest: Money,
    pub remaining_balance: Money,
}

/// Complete debt optimization result
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DebtOptimizationResult {
    pub strategy: DebtStrategy,
    pub payment_plans: Vec<PaymentPlan>,
    pub total_monthly_payment: Money,
    pub total_interest_paid: Money,
    pub total_time_to_payoff_months: u32,
    pub final_payoff_date: DateTime<Utc>,
    pub interest_savings_vs_minimum: Money,
    pub time_savings_vs_minimum_months: u32,
    pub generated_at: DateTime<Utc>,
}

/// Debt consolidation opportunity
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ConsolidationOpportunity {
    pub consolidation_type: ConsolidationType,
    pub consolidated_balance: Money,
    pub new_interest_rate: Rate,
    pub new_monthly_payment: Money,
    pub total_interest_savings: Money,
    pub time_savings_months: u32,
    pub eligibility_requirements: Vec<String>,
    pub pros_and_cons: ConsolidationAnalysis,
}

/// Types of debt consolidation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConsolidationType {
    PersonalLoan,
    BalanceTransfer,
    HomeEquityLoan,
    DebtManagementPlan,
    RefinancingProgram,
}

/// Analysis of consolidation pros and cons
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ConsolidationAnalysis {
    pub advantages: Vec<String>,
    pub disadvantages: Vec<String>,
    pub risk_assessment: RiskLevel,
    pub recommendation_score: Decimal, // 0-100 scale
}

/// Risk level assessment
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RiskLevel {
    Low,
    Moderate,
    High,
    VeryHigh,
}

/// Debt comparison analysis
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DebtComparison {
    pub snowball_result: DebtOptimizationResult,
    pub avalanche_result: DebtOptimizationResult,
    pub minimum_only_result: DebtOptimizationResult,
    pub recommended_strategy: DebtStrategy,
    pub recommendation_reason: String,
    pub psychological_factors: PsychologicalFactors,
}

/// Psychological factors in debt payoff
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PsychologicalFactors {
    pub motivation_score_snowball: u32,   // 1-10 scale
    pub motivation_score_avalanche: u32,  // 1-10 scale
    pub quick_wins_importance: Decimal,   // 0-1 scale
    pub mathematical_optimality: Decimal, // 0-1 scale
    pub estimated_success_probability: Percentage,
}

/// Debt negotiation opportunity
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NegotiationOpportunity {
    pub debt_id: Uuid,
    pub debt_name: String,
    pub current_balance: Money,
    pub negotiation_type: NegotiationType,
    pub potential_savings: Money,
    pub success_probability: Percentage,
    pub negotiation_strategy: String,
    pub talking_points: Vec<String>,
    pub required_preparation: Vec<String>,
}

/// Types of debt negotiation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NegotiationType {
    InterestRateReduction,
    BalanceSettlement,
    PaymentPlanModification,
    HardshipProgram,
    DebtForgiveness,
}

impl DebtAccount {
    /// Create a new debt account
    pub fn new(
        user_id: Uuid,
        name: String,
        debt_type: DebtType,
        balance: Money,
        interest_rate: Rate,
        minimum_payment: Money,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            user_id,
            name,
            debt_type,
            balance,
            interest_rate,
            minimum_payment,
            due_date: None,
            credit_limit: None,
            last_payment_date: None,
            last_payment_amount: None,
            created_at: now,
            updated_at: now,
        }
    }

    /// Calculate debt-to-limit ratio for credit cards
    pub fn debt_to_limit_ratio(&self) -> Option<Percentage> {
        if let Some(limit) = &self.credit_limit {
            if !limit.amount().is_zero() {
                Some(
                    Percentage::from_decimal(self.balance.amount() / limit.amount())
                        .unwrap_or_else(|_| Percentage::from_percentage(Decimal::ZERO).unwrap()),
                )
            } else {
                None
            }
        } else {
            None
        }
    }

    /// Calculate monthly interest charge
    pub fn monthly_interest_charge(&self) -> crate::Result<Money> {
        let monthly_rate = self
            .interest_rate
            .convert_to_period(crate::types::Period::Monthly)
            .unwrap_or_else(|_| self.interest_rate);
        self.balance.multiply(monthly_rate.as_decimal())
    }

    /// Calculate minimum payment to principal ratio
    pub fn payment_to_principal_ratio(&self) -> crate::Result<Percentage> {
        let monthly_interest = self.monthly_interest_charge()?;
        let principal_payment = self.minimum_payment.subtract(&monthly_interest)?;

        if self.minimum_payment.amount().is_zero() {
            Ok(Percentage::from_percentage(Decimal::ZERO)?)
        } else {
            Ok(Percentage::from_decimal(
                principal_payment.amount() / self.minimum_payment.amount(),
            )?)
        }
    }

    /// Check if debt qualifies for negotiation
    pub fn qualifies_for_negotiation(&self) -> bool {
        match self.debt_type {
            DebtType::CreditCard => self.balance.amount() > Decimal::from(1000), // $1000+ balance
            DebtType::MedicalDebt => true, // Medical debt often negotiable
            DebtType::PersonalLoan => self.balance.amount() > Decimal::from(5000),
            _ => false,
        }
    }

    /// Get debt priority score for avalanche method
    pub fn avalanche_priority_score(&self) -> Decimal {
        self.interest_rate.as_decimal()
    }

    /// Get debt priority score for snowball method
    pub fn snowball_priority_score(&self) -> Decimal {
        // Inverse of balance (lower balance = higher priority)
        if self.balance.amount().is_zero() {
            Decimal::MAX
        } else {
            Decimal::from(1000000) / self.balance.amount() // Scale for comparison
        }
    }
}

impl PaymentPlan {
    /// Calculate total cost of debt (principal + interest)
    pub fn total_cost(&self) -> Money {
        self.total_payments
    }

    /// Calculate interest as percentage of original balance
    pub fn interest_percentage(&self) -> Percentage {
        if let Some(first_payment) = self.payment_schedule.first() {
            let original_balance = first_payment
                .remaining_balance
                .add(&first_payment.principal)
                .unwrap_or_else(|_| first_payment.remaining_balance.clone());

            if original_balance.amount().is_zero() {
                Percentage::from_percentage(Decimal::ZERO).unwrap()
            } else {
                Percentage::from_decimal(self.total_interest.amount() / original_balance.amount())
                    .unwrap_or_else(|_| Percentage::from_percentage(Decimal::ZERO).unwrap())
            }
        } else {
            Percentage::from_percentage(Decimal::ZERO).unwrap()
        }
    }

    /// Get payment count
    pub fn payment_count(&self) -> u32 {
        self.payment_schedule.len() as u32
    }

    /// Calculate average monthly payment
    pub fn average_monthly_payment(&self) -> Money {
        if self.payment_schedule.is_empty() {
            Money::new_unchecked(Decimal::ZERO, self.total_payments.currency())
        } else {
            self.total_payments
                .divide(Decimal::from(self.payment_schedule.len()))
                .unwrap_or_else(|_| {
                    Money::new_unchecked(Decimal::ZERO, self.total_payments.currency())
                })
        }
    }
}

impl std::fmt::Display for DebtType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DebtType::CreditCard => write!(f, "Credit Card"),
            DebtType::StudentLoan => write!(f, "Student Loan"),
            DebtType::Mortgage => write!(f, "Mortgage"),
            DebtType::PersonalLoan => write!(f, "Personal Loan"),
            DebtType::AutoLoan => write!(f, "Auto Loan"),
            DebtType::HomeEquityLoan => write!(f, "Home Equity Loan"),
            DebtType::MedicalDebt => write!(f, "Medical Debt"),
            DebtType::Other => write!(f, "Other"),
        }
    }
}

impl std::fmt::Display for DebtStrategy {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DebtStrategy::Snowball => write!(f, "Debt Snowball"),
            DebtStrategy::Avalanche => write!(f, "Debt Avalanche"),
            DebtStrategy::Custom => write!(f, "Custom Strategy"),
            DebtStrategy::Consolidation => write!(f, "Debt Consolidation"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Currency, Percentage, Period};
    use rust_decimal_macros::dec;

    #[test]
    fn test_debt_account_creation() {
        let debt = DebtAccount::new(
            Uuid::new_v4(),
            "Test Credit Card".to_string(),
            DebtType::CreditCard,
            Money::new(dec!(5000), Currency::USD).unwrap(),
            crate::types::Rate::new(
                Percentage::from_percentage(dec!(18.99)).unwrap(),
                Period::Annual,
            ),
            Money::new(dec!(100), Currency::USD).unwrap(),
        );

        assert_eq!(debt.debt_type, DebtType::CreditCard);
        assert_eq!(debt.balance.amount(), dec!(5000));
        assert_eq!(debt.minimum_payment.amount(), dec!(100));
    }

    #[test]
    fn test_monthly_interest_calculation() {
        let debt = DebtAccount::new(
            Uuid::new_v4(),
            "Test Card".to_string(),
            DebtType::CreditCard,
            Money::new(dec!(1000), Currency::USD).unwrap(),
            crate::types::Rate::new(
                Percentage::from_percentage(dec!(12.0)).unwrap(), // 12% annual = 1% monthly
                Period::Annual,
            ),
            Money::new(dec!(50), Currency::USD).unwrap(),
        );

        let monthly_interest = debt.monthly_interest_charge();
        assert_eq!(monthly_interest.unwrap().amount(), dec!(10)); // 1% of $1000
    }

    #[test]
    fn test_debt_to_limit_ratio() {
        let mut debt = DebtAccount::new(
            Uuid::new_v4(),
            "Test Card".to_string(),
            DebtType::CreditCard,
            Money::new(dec!(2500), Currency::USD).unwrap(),
            crate::types::Rate::new(
                Percentage::from_percentage(dec!(18.99)).unwrap(),
                Period::Annual,
            ),
            Money::new(dec!(75), Currency::USD).unwrap(),
        );

        // No credit limit set
        assert!(debt.debt_to_limit_ratio().is_none());

        // Set credit limit
        debt.credit_limit = Some(Money::new(dec!(5000), Currency::USD).unwrap());
        let ratio = debt.debt_to_limit_ratio().unwrap();
        assert_eq!(ratio.as_percentage(), dec!(50)); // 2500/5000 = 50%
    }

    #[test]
    fn test_negotiation_qualification() {
        let credit_card = DebtAccount::new(
            Uuid::new_v4(),
            "High Balance Card".to_string(),
            DebtType::CreditCard,
            Money::new(dec!(5000), Currency::USD).unwrap(),
            crate::types::Rate::new(
                Percentage::from_percentage(dec!(24.99)).unwrap(),
                Period::Annual,
            ),
            Money::new(dec!(150), Currency::USD).unwrap(),
        );

        assert!(credit_card.qualifies_for_negotiation());

        let low_balance_card = DebtAccount::new(
            Uuid::new_v4(),
            "Low Balance Card".to_string(),
            DebtType::CreditCard,
            Money::new(dec!(500), Currency::USD).unwrap(),
            crate::types::Rate::new(
                Percentage::from_percentage(dec!(19.99)).unwrap(),
                Period::Annual,
            ),
            Money::new(dec!(25), Currency::USD).unwrap(),
        );

        assert!(!low_balance_card.qualifies_for_negotiation());
    }

    #[test]
    fn test_priority_scores() {
        let high_interest_debt = DebtAccount::new(
            Uuid::new_v4(),
            "High Interest".to_string(),
            DebtType::CreditCard,
            Money::new(dec!(3000), Currency::USD).unwrap(),
            crate::types::Rate::new(
                Percentage::from_percentage(dec!(24.99)).unwrap(),
                Period::Annual,
            ),
            Money::new(dec!(90), Currency::USD).unwrap(),
        );

        let low_balance_debt = DebtAccount::new(
            Uuid::new_v4(),
            "Low Balance".to_string(),
            DebtType::PersonalLoan,
            Money::new(dec!(1000), Currency::USD).unwrap(),
            crate::types::Rate::new(
                Percentage::from_percentage(dec!(8.5)).unwrap(),
                Period::Annual,
            ),
            Money::new(dec!(50), Currency::USD).unwrap(),
        );

        // Avalanche should prioritize high interest
        assert!(
            high_interest_debt.avalanche_priority_score()
                > low_balance_debt.avalanche_priority_score()
        );

        // Snowball should prioritize low balance
        assert!(
            low_balance_debt.snowball_priority_score()
                > high_interest_debt.snowball_priority_score()
        );
    }
}
