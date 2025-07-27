use crate::debt::types::{DebtAccount, DebtStrategy, PaymentPlan, PaymentScheduleItem};
use crate::{FinancialError, Money, Result};
use chrono::{DateTime, Duration, Utc};
/// Debt Avalanche Strategy Implementation
///
/// The debt avalanche method focuses on paying off debts with the highest interest rates first,
/// minimizing total interest paid over time. This is mathematically optimal.
use rust_decimal::Decimal;
use rust_decimal_macros::dec;

/// Debt Avalanche calculator for payment optimization
pub struct AvalancheCalculator {
    extra_payment_budget: Money,
    payment_frequency: PaymentFrequency,
}

/// Payment frequency options
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaymentFrequency {
    Monthly,
    BiWeekly,
    Weekly,
}

impl AvalancheCalculator {
    /// Create a new avalanche calculator
    pub fn new(extra_payment_budget: Money) -> Self {
        Self {
            extra_payment_budget,
            payment_frequency: PaymentFrequency::Monthly,
        }
    }

    /// Set payment frequency
    pub fn with_frequency(mut self, frequency: PaymentFrequency) -> Self {
        self.payment_frequency = frequency;
        self
    }

    /// Calculate optimal avalanche payment plan for multiple debts
    pub fn calculate_payment_plan(&self, debts: &[DebtAccount]) -> Result<Vec<PaymentPlan>> {
        if debts.is_empty() {
            return Ok(Vec::new());
        }

        // Validate all debts have same currency
        let currency = debts[0].balance.currency();
        if !debts.iter().all(|d| d.balance.currency() == currency) {
            return Err(FinancialError::CurrencyMismatch {
                expected: currency,
                actual: debts
                    .iter()
                    .find(|d| d.balance.currency() != currency)
                    .map(|d| d.balance.currency())
                    .unwrap_or(currency),
            });
        }

        // Sort debts by interest rate (avalanche method - highest first)
        let mut sorted_debts = debts.to_vec();
        sorted_debts.sort_by(|a, b| {
            b.interest_rate
                .as_decimal()
                .partial_cmp(&a.interest_rate.as_decimal())
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        let mut payment_plans: Vec<PaymentPlan> = Vec::new();
        let remaining_extra_budget = self.extra_payment_budget.clone();

        for (index, debt) in sorted_debts.iter().enumerate() {
            let extra_payment = if index == 0 {
                // First debt (highest interest) gets all extra payment
                remaining_extra_budget.clone()
            } else {
                // Later debts get rolled-over payments from previously paid-off debts
                let mut total_extra = remaining_extra_budget.clone();
                for prev_index in 0..index {
                    if let Some(prev_plan) = payment_plans.get(prev_index) {
                        total_extra = total_extra.add(
                            &prev_plan
                                .monthly_payment
                                .subtract(&sorted_debts[prev_index].minimum_payment)?,
                        )?;
                    }
                }
                total_extra
            };

            let payment_plan = self.calculate_single_debt_plan(debt, &extra_payment)?;
            payment_plans.push(payment_plan);
        }

        Ok(payment_plans)
    }

    /// Calculate payment plan for a single debt
    pub fn calculate_single_debt_plan(
        &self,
        debt: &DebtAccount,
        extra_payment: &Money,
    ) -> Result<PaymentPlan> {
        let total_monthly_payment = debt.minimum_payment.add(extra_payment)?;
        let mut remaining_balance = debt.balance.clone();
        let mut payment_schedule = Vec::new();
        let mut total_interest = Money::new_unchecked(Decimal::ZERO, debt.balance.currency());
        let mut payment_number = 1;
        let mut current_date = Utc::now();

        // Calculate monthly interest rate
        let monthly_rate = self.calculate_monthly_rate(&debt.interest_rate)?;

        while remaining_balance.amount() > dec!(0.01) && payment_number <= 600 {
            // Max 50 years
            let interest_charge = remaining_balance.multiply(monthly_rate)?;
            let principal_payment = total_monthly_payment.subtract(&interest_charge)?;

            // Ensure we don't overpay
            let actual_principal = if principal_payment.amount() > remaining_balance.amount() {
                remaining_balance.clone()
            } else {
                principal_payment
            };

            let actual_payment = interest_charge.add(&actual_principal)?;
            remaining_balance = remaining_balance.subtract(&actual_principal)?;
            total_interest = total_interest.add(&interest_charge)?;

            payment_schedule.push(PaymentScheduleItem {
                payment_number,
                payment_date: current_date,
                payment_amount: actual_payment,
                principal: actual_principal,
                interest: interest_charge,
                remaining_balance: remaining_balance.clone(),
            });

            if remaining_balance.amount() <= dec!(0.01) {
                break;
            }

            payment_number += 1;
            current_date = self.next_payment_date(current_date);
        }

        let total_payments = payment_schedule.iter().try_fold(
            Money::new_unchecked(Decimal::ZERO, debt.balance.currency()),
            |acc, item| acc.add(&item.payment_amount),
        )?;

        let payoff_date = payment_schedule
            .last()
            .map(|item| item.payment_date)
            .unwrap_or(current_date);

        Ok(PaymentPlan {
            debt_id: debt.id,
            debt_name: debt.name.clone(),
            strategy: DebtStrategy::Avalanche,
            monthly_payment: total_monthly_payment,
            total_payments,
            total_interest,
            payoff_date,
            payment_schedule,
            created_at: Utc::now(),
        })
    }

    /// Calculate interest savings compared to minimum payments
    pub fn calculate_savings(&self, debts: &[DebtAccount]) -> Result<AvalancheSavings> {
        let avalanche_plans = self.calculate_payment_plan(debts)?;
        let minimum_plans = self.calculate_minimum_only_plans(debts)?;

        let avalanche_total_interest: Money = avalanche_plans.iter().try_fold(
            Money::new_unchecked(Decimal::ZERO, debts[0].balance.currency()),
            |acc, plan| acc.add(&plan.total_interest),
        )?;

        let minimum_total_interest: Money = minimum_plans.iter().try_fold(
            Money::new_unchecked(Decimal::ZERO, debts[0].balance.currency()),
            |acc, plan| acc.add(&plan.total_interest),
        )?;

        let interest_savings = minimum_total_interest.subtract(&avalanche_total_interest)?;

        let avalanche_final_date = avalanche_plans
            .iter()
            .map(|p| p.payoff_date)
            .max()
            .unwrap_or(Utc::now());

        let minimum_final_date = minimum_plans
            .iter()
            .map(|p| p.payoff_date)
            .max()
            .unwrap_or(Utc::now());

        let time_savings_days = (minimum_final_date - avalanche_final_date).num_days();
        let time_savings_months = time_savings_days / 30;

        Ok(AvalancheSavings {
            interest_savings,
            time_savings_months: time_savings_months.max(0) as u32,
            avalanche_payoff_date: avalanche_final_date,
            minimum_payoff_date: minimum_final_date,
            mathematical_optimality: self
                .calculate_optimality_score(&avalanche_plans, &minimum_plans)?,
        })
    }

    /// Get debt prioritization order for avalanche method
    pub fn get_priority_order(&self, debts: &[DebtAccount]) -> Vec<(usize, String, Decimal)> {
        let mut indexed_debts: Vec<(usize, &DebtAccount)> = debts.iter().enumerate().collect();
        indexed_debts.sort_by(|a, b| {
            b.1.interest_rate
                .as_decimal()
                .partial_cmp(&a.1.interest_rate.as_decimal())
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        indexed_debts
            .into_iter()
            .map(|(index, debt)| (index, debt.name.clone(), debt.interest_rate.as_decimal()))
            .collect()
    }

    /// Calculate interest rate efficiency for each debt
    pub fn calculate_efficiency_metrics(
        &self,
        debts: &[DebtAccount],
    ) -> Result<Vec<EfficiencyMetric>> {
        let mut metrics = Vec::new();

        for debt in debts {
            let monthly_rate = self.calculate_monthly_rate(&debt.interest_rate)?;
            let monthly_interest_cost = debt.balance.multiply(monthly_rate)?;

            // Calculate interest-to-payment ratio
            let interest_ratio = if debt.minimum_payment.amount() > Decimal::ZERO {
                monthly_interest_cost.amount() / debt.minimum_payment.amount()
            } else {
                Decimal::ZERO
            };

            // Calculate payoff efficiency (lower balance-to-interest ratio = more efficient)
            let payoff_efficiency = if debt.interest_rate.as_decimal() > Decimal::ZERO {
                debt.balance.amount() / debt.interest_rate.as_decimal()
            } else {
                Decimal::MAX
            };

            metrics.push(EfficiencyMetric {
                debt_id: debt.id,
                debt_name: debt.name.clone(),
                interest_rate: debt.interest_rate.as_decimal(),
                monthly_interest_cost,
                interest_to_payment_ratio: interest_ratio,
                payoff_efficiency,
                avalanche_priority: debt.avalanche_priority_score(),
            });
        }

        // Sort by avalanche priority (highest interest first)
        metrics.sort_by(|a, b| {
            b.avalanche_priority
                .partial_cmp(&a.avalanche_priority)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        Ok(metrics)
    }

    /// Compare avalanche vs snowball strategies
    pub fn compare_with_snowball(&self, debts: &[DebtAccount]) -> Result<StrategyComparison> {
        let avalanche_plans = self.calculate_payment_plan(debts)?;

        // Calculate snowball for comparison
        let snowball_calculator =
            crate::debt::snowball::SnowballCalculator::new(self.extra_payment_budget.clone());
        let snowball_plans = snowball_calculator.calculate_payment_plan(debts)?;

        let avalanche_total_interest: Money = avalanche_plans.iter().try_fold(
            Money::new_unchecked(Decimal::ZERO, debts[0].balance.currency()),
            |acc, plan| acc.add(&plan.total_interest),
        )?;

        let snowball_total_interest: Money = snowball_plans.iter().try_fold(
            Money::new_unchecked(Decimal::ZERO, debts[0].balance.currency()),
            |acc, plan| acc.add(&plan.total_interest),
        )?;

        let interest_difference = snowball_total_interest.subtract(&avalanche_total_interest)?;

        let avalanche_final_date = avalanche_plans
            .iter()
            .map(|p| p.payoff_date)
            .max()
            .unwrap_or(Utc::now());

        let snowball_final_date = snowball_plans
            .iter()
            .map(|p| p.payoff_date)
            .max()
            .unwrap_or(Utc::now());

        let time_difference_days = (snowball_final_date - avalanche_final_date).num_days();

        Ok(StrategyComparison {
            avalanche_total_interest,
            snowball_total_interest,
            interest_savings_avalanche: interest_difference,
            avalanche_payoff_date: avalanche_final_date,
            snowball_payoff_date: snowball_final_date,
            time_savings_days: time_difference_days.max(0) as u32,
            recommended_strategy: if interest_difference.amount() > dec!(100) {
                DebtStrategy::Avalanche
            } else {
                DebtStrategy::Snowball
            },
            recommendation_reason: self
                .generate_recommendation_reason(&interest_difference, time_difference_days),
        })
    }

    // Private helper methods

    fn calculate_monthly_rate(&self, annual_rate: &crate::types::Rate) -> Result<Decimal> {
        match annual_rate.period() {
            crate::types::Period::Annual => Ok(annual_rate.as_decimal() / dec!(12)),
            crate::types::Period::Monthly => Ok(annual_rate.as_decimal()),
            _ => Err(FinancialError::UnsupportedOperation {
                operation: "Converting rate period to monthly".to_string(),
            }),
        }
    }

    fn next_payment_date(&self, current_date: DateTime<Utc>) -> DateTime<Utc> {
        match self.payment_frequency {
            PaymentFrequency::Monthly => current_date + Duration::days(30),
            PaymentFrequency::BiWeekly => current_date + Duration::days(14),
            PaymentFrequency::Weekly => current_date + Duration::days(7),
        }
    }

    fn calculate_minimum_only_plans(&self, debts: &[DebtAccount]) -> Result<Vec<PaymentPlan>> {
        let zero_extra = Money::new_unchecked(Decimal::ZERO, debts[0].balance.currency());
        debts
            .iter()
            .map(|debt| self.calculate_single_debt_plan(debt, &zero_extra))
            .collect()
    }

    fn calculate_optimality_score(
        &self,
        avalanche_plans: &[PaymentPlan],
        minimum_plans: &[PaymentPlan],
    ) -> Result<Decimal> {
        let avalanche_total: Decimal = avalanche_plans
            .iter()
            .map(|p| p.total_interest.amount())
            .sum();

        let minimum_total: Decimal = minimum_plans
            .iter()
            .map(|p| p.total_interest.amount())
            .sum();

        if minimum_total > Decimal::ZERO {
            Ok((minimum_total - avalanche_total) / minimum_total * dec!(100))
        } else {
            Ok(Decimal::ZERO)
        }
    }

    fn generate_recommendation_reason(
        &self,
        interest_savings: &Money,
        time_savings_days: i64,
    ) -> String {
        if interest_savings.amount() > dec!(1000) && time_savings_days > 365 {
            format!(
                "Avalanche method saves ${:.2} in interest and {} months in payoff time - strongly recommended",
                interest_savings.amount(),
                time_savings_days / 30
            )
        } else if interest_savings.amount() > dec!(500) {
            format!(
                "Avalanche method saves ${:.2} in interest - mathematically optimal",
                interest_savings.amount()
            )
        } else {
            "Savings are minimal - consider snowball method for psychological benefits".to_string()
        }
    }
}

/// Avalanche method savings analysis
#[derive(Debug, Clone, PartialEq)]
pub struct AvalancheSavings {
    pub interest_savings: Money,
    pub time_savings_months: u32,
    pub avalanche_payoff_date: DateTime<Utc>,
    pub minimum_payoff_date: DateTime<Utc>,
    pub mathematical_optimality: Decimal, // Percentage of optimal savings achieved
}

/// Debt efficiency metric for avalanche analysis
#[derive(Debug, Clone, PartialEq)]
pub struct EfficiencyMetric {
    pub debt_id: uuid::Uuid,
    pub debt_name: String,
    pub interest_rate: Decimal,
    pub monthly_interest_cost: Money,
    pub interest_to_payment_ratio: Decimal,
    pub payoff_efficiency: Decimal,
    pub avalanche_priority: Decimal,
}

/// Comparison between avalanche and snowball strategies
#[derive(Debug, Clone, PartialEq)]
pub struct StrategyComparison {
    pub avalanche_total_interest: Money,
    pub snowball_total_interest: Money,
    pub interest_savings_avalanche: Money,
    pub avalanche_payoff_date: DateTime<Utc>,
    pub snowball_payoff_date: DateTime<Utc>,
    pub time_savings_days: u32,
    pub recommended_strategy: DebtStrategy,
    pub recommendation_reason: String,
}

impl Default for AvalancheCalculator {
    fn default() -> Self {
        Self::new(Money::new_unchecked(
            Decimal::ZERO,
            crate::types::Currency::USD,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::debt::types::DebtType;
    use crate::types::{Currency, Percentage, Period, Rate};
    use uuid::Uuid;

    #[test]
    fn test_avalanche_calculator_creation() {
        let extra_payment = Money::new(dec!(200), Currency::USD).unwrap();
        let calculator = AvalancheCalculator::new(extra_payment);
        assert_eq!(calculator.extra_payment_budget.amount(), dec!(200));
    }

    #[test]
    fn test_debt_prioritization() {
        let calculator = AvalancheCalculator::default();

        let debts = vec![
            DebtAccount::new(
                Uuid::new_v4(),
                "Credit Card".to_string(),
                DebtType::CreditCard,
                Money::new(dec!(5000), Currency::USD).unwrap(),
                Rate::new(
                    Percentage::from_percentage(dec!(18.99)).unwrap(),
                    Period::Annual,
                ),
                Money::new(dec!(100), Currency::USD).unwrap(),
            ),
            DebtAccount::new(
                Uuid::new_v4(),
                "Personal Loan".to_string(),
                DebtType::PersonalLoan,
                Money::new(dec!(2000), Currency::USD).unwrap(),
                Rate::new(
                    Percentage::from_percentage(dec!(12.5)).unwrap(),
                    Period::Annual,
                ),
                Money::new(dec!(80), Currency::USD).unwrap(),
            ),
        ];

        let priority_order = calculator.get_priority_order(&debts);

        // Should prioritize higher interest rate first (Credit Card: 18.99%)
        assert_eq!(priority_order[0].1, "Credit Card");
        assert_eq!(priority_order[1].1, "Personal Loan");
    }

    #[test]
    fn test_single_debt_calculation() {
        let extra_payment = Money::new(dec!(100), Currency::USD).unwrap();
        let calculator = AvalancheCalculator::new(extra_payment);

        let debt = DebtAccount::new(
            Uuid::new_v4(),
            "Test Debt".to_string(),
            DebtType::CreditCard,
            Money::new(dec!(1000), Currency::USD).unwrap(),
            Rate::new(
                Percentage::from_percentage(dec!(12.0)).unwrap(),
                Period::Annual,
            ),
            Money::new(dec!(50), Currency::USD).unwrap(),
        );

        let plan = calculator
            .calculate_single_debt_plan(&debt, &extra_payment)
            .unwrap();

        assert_eq!(plan.strategy, DebtStrategy::Avalanche);
        assert_eq!(plan.monthly_payment.amount(), dec!(150)); // $50 + $100 extra
        assert!(!plan.payment_schedule.is_empty());
    }

    #[test]
    fn test_efficiency_metrics() {
        let calculator = AvalancheCalculator::default();

        let debts = vec![
            DebtAccount::new(
                Uuid::new_v4(),
                "High Interest Debt".to_string(),
                DebtType::CreditCard,
                Money::new(dec!(3000), Currency::USD).unwrap(),
                Rate::new(
                    Percentage::from_percentage(dec!(24.99)).unwrap(),
                    Period::Annual,
                ),
                Money::new(dec!(90), Currency::USD).unwrap(),
            ),
            DebtAccount::new(
                Uuid::new_v4(),
                "Low Interest Debt".to_string(),
                DebtType::PersonalLoan,
                Money::new(dec!(5000), Currency::USD).unwrap(),
                Rate::new(
                    Percentage::from_percentage(dec!(8.5)).unwrap(),
                    Period::Annual,
                ),
                Money::new(dec!(150), Currency::USD).unwrap(),
            ),
        ];

        let metrics = calculator.calculate_efficiency_metrics(&debts).unwrap();

        assert_eq!(metrics.len(), 2);
        // Should prioritize high interest debt first
        assert_eq!(metrics[0].debt_name, "High Interest Debt");
        assert!(metrics[0].interest_rate > metrics[1].interest_rate);
    }

    #[test]
    fn test_payment_frequencies() {
        let extra_payment = Money::new(dec!(100), Currency::USD).unwrap();
        let calculator =
            AvalancheCalculator::new(extra_payment).with_frequency(PaymentFrequency::BiWeekly);

        assert_eq!(calculator.payment_frequency, PaymentFrequency::BiWeekly);
    }

    #[test]
    fn test_optimality_score() {
        let calculator = AvalancheCalculator::default();

        let avalanche_plans = vec![PaymentPlan {
            debt_id: Uuid::new_v4(),
            debt_name: "Test".to_string(),
            strategy: DebtStrategy::Avalanche,
            monthly_payment: Money::new(dec!(100), Currency::USD).unwrap(),
            total_payments: Money::new(dec!(1000), Currency::USD).unwrap(),
            total_interest: Money::new(dec!(100), Currency::USD).unwrap(),
            payoff_date: Utc::now(),
            payment_schedule: Vec::new(),
            created_at: Utc::now(),
        }];

        let minimum_plans = vec![PaymentPlan {
            debt_id: Uuid::new_v4(),
            debt_name: "Test".to_string(),
            strategy: DebtStrategy::Avalanche,
            monthly_payment: Money::new(dec!(50), Currency::USD).unwrap(),
            total_payments: Money::new(dec!(1200), Currency::USD).unwrap(),
            total_interest: Money::new(dec!(200), Currency::USD).unwrap(),
            payoff_date: Utc::now(),
            payment_schedule: Vec::new(),
            created_at: Utc::now(),
        }];

        let score = calculator
            .calculate_optimality_score(&avalanche_plans, &minimum_plans)
            .unwrap();
        assert_eq!(score, dec!(50)); // 50% savings
    }
}
