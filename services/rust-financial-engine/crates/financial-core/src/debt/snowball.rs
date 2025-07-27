/// Debt Snowball Strategy Implementation
/// 
/// The debt snowball method focuses on paying off debts with the smallest balances first,
/// regardless of interest rate. This provides psychological wins and momentum.
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use chrono::{DateTime, Utc, Duration};
use crate::{Money, FinancialError, Result};
use crate::debt::types::{DebtAccount, PaymentPlan, PaymentScheduleItem, DebtStrategy};

/// Debt Snowball calculator for payment optimization
pub struct SnowballCalculator {
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

impl SnowballCalculator {
    /// Create a new snowball calculator
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

    /// Calculate optimal snowball payment plan for multiple debts
    pub fn calculate_payment_plan(&self, debts: &[DebtAccount]) -> Result<Vec<PaymentPlan>> {
        if debts.is_empty() {
            return Ok(Vec::new());
        }

        // Validate all debts have same currency
        let currency = debts[0].balance.currency();
        if !debts.iter().all(|d| d.balance.currency() == currency) {
            return Err(FinancialError::CurrencyMismatch {
                expected: currency,
                found: debts.iter().find(|d| d.balance.currency() != currency)
                    .map(|d| d.balance.currency())
                    .unwrap_or(currency),
            });
        }

        // Sort debts by balance (snowball method)
        let mut sorted_debts = debts.to_vec();
        sorted_debts.sort_by(|a, b| a.balance.amount().cmp(&b.balance.amount()));

        let mut payment_plans = Vec::new();
        let mut remaining_extra_budget = self.extra_payment_budget.clone();
        let mut debt_payoff_dates = Vec::new();

        for (index, debt) in sorted_debts.iter().enumerate() {
            let extra_payment = if index == 0 {
                // First debt gets all extra payment
                remaining_extra_budget.clone()
            } else {
                // Later debts get rolled-over payments from previously paid-off debts
                let mut total_extra = remaining_extra_budget.clone();
                for prev_index in 0..index {
                    if let Some(prev_plan) = payment_plans.get(prev_index) {
                        total_extra = total_extra.add(&prev_plan.monthly_payment.subtract(&sorted_debts[prev_index].minimum_payment)?)?;
                    }
                }
                total_extra
            };

            let payment_plan = self.calculate_single_debt_plan(debt, &extra_payment)?;
            debt_payoff_dates.push(payment_plan.payoff_date);
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

        while remaining_balance.amount() > dec!(0.01) && payment_number <= 600 { // Max 50 years
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

        let total_payments = payment_schedule.iter()
            .try_fold(Money::new_unchecked(Decimal::ZERO, debt.balance.currency()), |acc, item| {
                acc.add(&item.payment_amount)
            })?;

        let payoff_date = payment_schedule.last()
            .map(|item| item.payment_date)
            .unwrap_or(current_date);

        Ok(PaymentPlan {
            debt_id: debt.id,
            debt_name: debt.name.clone(),
            strategy: DebtStrategy::Snowball,
            monthly_payment: total_monthly_payment,
            total_payments,
            total_interest,
            payoff_date,
            payment_schedule,
            created_at: Utc::now(),
        })
    }

    /// Calculate time and interest savings compared to minimum payments
    pub fn calculate_savings(&self, debts: &[DebtAccount]) -> Result<SnowballSavings> {
        let snowball_plans = self.calculate_payment_plan(debts)?;
        let minimum_plans = self.calculate_minimum_only_plans(debts)?;

        let snowball_total_interest: Money = snowball_plans.iter()
            .try_fold(Money::new_unchecked(Decimal::ZERO, debts[0].balance.currency()), |acc, plan| {
                acc.add(&plan.total_interest)
            })?;

        let minimum_total_interest: Money = minimum_plans.iter()
            .try_fold(Money::new_unchecked(Decimal::ZERO, debts[0].balance.currency()), |acc, plan| {
                acc.add(&plan.total_interest)
            })?;

        let interest_savings = minimum_total_interest.subtract(&snowball_total_interest)?;

        let snowball_final_date = snowball_plans.iter()
            .map(|p| p.payoff_date)
            .max()
            .unwrap_or(Utc::now());

        let minimum_final_date = minimum_plans.iter()
            .map(|p| p.payoff_date)
            .max()
            .unwrap_or(Utc::now());

        let time_savings_days = (minimum_final_date - snowball_final_date).num_days();
        let time_savings_months = time_savings_days / 30;

        Ok(SnowballSavings {
            interest_savings,
            time_savings_months: time_savings_months.max(0) as u32,
            snowball_payoff_date: snowball_final_date,
            minimum_payoff_date: minimum_final_date,
            psychological_wins: self.calculate_psychological_wins(&snowball_plans),
        })
    }

    /// Get debt prioritization order for snowball method
    pub fn get_priority_order(&self, debts: &[DebtAccount]) -> Vec<(usize, String, Money)> {
        let mut indexed_debts: Vec<(usize, &DebtAccount)> = debts.iter().enumerate().collect();
        indexed_debts.sort_by(|a, b| a.1.balance.amount().cmp(&b.1.balance.amount()));

        indexed_debts.into_iter()
            .map(|(index, debt)| {
                (index, debt.name.clone(), debt.balance.clone())
            })
            .collect()
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
        debts.iter()
            .map(|debt| self.calculate_single_debt_plan(debt, &zero_extra))
            .collect()
    }

    fn calculate_psychological_wins(&self, plans: &[PaymentPlan]) -> Vec<PsychologicalWin> {
        let mut wins = Vec::new();
        let mut months_elapsed = 0;

        for plan in plans {
            months_elapsed += plan.payment_count();
            wins.push(PsychologicalWin {
                debt_name: plan.debt_name.clone(),
                payoff_month: months_elapsed,
                motivation_boost: self.calculate_motivation_boost(months_elapsed),
            });
        }

        wins
    }

    fn calculate_motivation_boost(&self, months_elapsed: u32) -> Decimal {
        // Earlier payoffs provide more motivation
        if months_elapsed <= 6 {
            dec!(10.0) // High motivation
        } else if months_elapsed <= 12 {
            dec!(7.5)
        } else if months_elapsed <= 24 {
            dec!(5.0)
        } else {
            dec!(2.5) // Lower motivation for longer-term payoffs
        }
    }
}

/// Snowball method savings analysis
#[derive(Debug, Clone, PartialEq)]
pub struct SnowballSavings {
    pub interest_savings: Money,
    pub time_savings_months: u32,
    pub snowball_payoff_date: DateTime<Utc>,
    pub minimum_payoff_date: DateTime<Utc>,
    pub psychological_wins: Vec<PsychologicalWin>,
}

/// Psychological benefit from debt payoff
#[derive(Debug, Clone, PartialEq)]
pub struct PsychologicalWin {
    pub debt_name: String,
    pub payoff_month: u32,
    pub motivation_boost: Decimal, // 1-10 scale
}

impl Default for SnowballCalculator {
    fn default() -> Self {
        Self::new(Money::new_unchecked(Decimal::ZERO, crate::types::Currency::USD))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;
    use crate::types::{Currency, Percentage, Period, Rate};
    use crate::debt::types::DebtType;

    #[test]
    fn test_snowball_calculator_creation() {
        let extra_payment = Money::new(dec!(200), Currency::USD).unwrap();
        let calculator = SnowballCalculator::new(extra_payment);
        assert_eq!(calculator.extra_payment_budget.amount(), dec!(200));
    }

    #[test]
    fn test_debt_prioritization() {
        let calculator = SnowballCalculator::default();
        
        let debts = vec![
            DebtAccount::new(
                Uuid::new_v4(),
                "Credit Card".to_string(),
                DebtType::CreditCard,
                Money::new(dec!(5000), Currency::USD).unwrap(),
                Rate::new(Percentage::from_percentage(dec!(18.99)).unwrap(), Period::Annual),
                Money::new(dec!(100), Currency::USD).unwrap(),
            ),
            DebtAccount::new(
                Uuid::new_v4(),
                "Personal Loan".to_string(),
                DebtType::PersonalLoan,
                Money::new(dec!(2000), Currency::USD).unwrap(),
                Rate::new(Percentage::from_percentage(dec!(12.5)).unwrap(), Period::Annual),
                Money::new(dec!(80), Currency::USD).unwrap(),
            ),
        ];

        let priority_order = calculator.get_priority_order(&debts);
        
        // Should prioritize lower balance first (Personal Loan: $2000)
        assert_eq!(priority_order[0].1, "Personal Loan");
        assert_eq!(priority_order[1].1, "Credit Card");
    }

    #[test]
    fn test_single_debt_calculation() {
        let extra_payment = Money::new(dec!(100), Currency::USD).unwrap();
        let calculator = SnowballCalculator::new(extra_payment);
        
        let debt = DebtAccount::new(
            Uuid::new_v4(),
            "Test Debt".to_string(),
            DebtType::CreditCard,
            Money::new(dec!(1000), Currency::USD).unwrap(),
            Rate::new(Percentage::from_percentage(dec!(12.0)).unwrap(), Period::Annual),
            Money::new(dec!(50), Currency::USD).unwrap(),
        );

        let plan = calculator.calculate_single_debt_plan(&debt, &extra_payment).unwrap();
        
        assert_eq!(plan.strategy, DebtStrategy::Snowball);
        assert_eq!(plan.monthly_payment.amount(), dec!(150)); // $50 + $100 extra
        assert!(!plan.payment_schedule.is_empty());
    }

    #[test]
    fn test_payment_frequencies() {
        let extra_payment = Money::new(dec!(100), Currency::USD).unwrap();
        let calculator = SnowballCalculator::new(extra_payment)
            .with_frequency(PaymentFrequency::BiWeekly);
        
        assert_eq!(calculator.payment_frequency, PaymentFrequency::BiWeekly);
    }

    #[test]
    fn test_monthly_rate_calculation() {
        let calculator = SnowballCalculator::default();
        let annual_rate = Rate::new(
            Percentage::from_percentage(dec!(12.0)).unwrap(),
            Period::Annual
        );
        
        let monthly_rate = calculator.calculate_monthly_rate(&annual_rate).unwrap();
        assert_eq!(monthly_rate, dec!(0.01)); // 12% / 12 = 1%
    }

    #[test]
    fn test_psychological_wins() {
        let calculator = SnowballCalculator::default();
        let plans = vec![
            PaymentPlan {
                debt_id: Uuid::new_v4(),
                debt_name: "Small Debt".to_string(),
                strategy: DebtStrategy::Snowball,
                monthly_payment: Money::new(dec!(100), Currency::USD).unwrap(),
                total_payments: Money::new(dec!(600), Currency::USD).unwrap(),
                total_interest: Money::new(dec!(50), Currency::USD).unwrap(),
                payoff_date: Utc::now(),
                payment_schedule: vec![PaymentScheduleItem {
                    payment_number: 1,
                    payment_date: Utc::now(),
                    payment_amount: Money::new(dec!(100), Currency::USD).unwrap(),
                    principal: Money::new(dec!(90), Currency::USD).unwrap(),
                    interest: Money::new(dec!(10), Currency::USD).unwrap(),
                    remaining_balance: Money::new(dec!(0), Currency::USD).unwrap(),
                }],
                created_at: Utc::now(),
            }
        ];

        let wins = calculator.calculate_psychological_wins(&plans);
        assert!(!wins.is_empty());
        assert_eq!(wins[0].debt_name, "Small Debt");
    }
}