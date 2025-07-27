/// Debt consolidation strategies and analysis
/// 
/// Provides analysis and recommendations for debt consolidation options
/// including balance transfers, personal loans, and home equity loans.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use rust_decimal::prelude::ToPrimitive;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use crate::{Money, FinancialError, Result};
use crate::debt::types::{
    DebtAccount, ConsolidationOpportunity, ConsolidationType, ConsolidationAnalysis, 
    RiskLevel, DebtStrategy, PaymentPlan
};
use crate::types::{Rate, Percentage, Period};

/// Debt consolidation analyzer
pub struct ConsolidationAnalyzer {
    min_consolidation_balance: Money,
    max_loan_to_income_ratio: Decimal,
}

impl ConsolidationAnalyzer {
    /// Create a new consolidation analyzer
    pub fn new() -> Self {
        Self {
            min_consolidation_balance: Money::new_unchecked(dec!(5000), crate::types::Currency::USD),
            max_loan_to_income_ratio: dec!(0.36), // 36% debt-to-income ratio
        }
    }

    /// Analyze consolidation opportunities for a set of debts
    pub fn analyze_opportunities(
        &self,
        debts: &[DebtAccount],
        monthly_income: Money,
        credit_score: Option<u32>,
    ) -> Result<Vec<ConsolidationOpportunity>> {
        if debts.is_empty() {
            return Ok(Vec::new());
        }

        let total_debt = self.calculate_total_debt(debts)?;
        
        if total_debt.amount() < self.min_consolidation_balance.amount() {
            return Ok(Vec::new());
        }

        let mut opportunities = Vec::new();

        // Analyze personal loan consolidation
        if let Some(personal_loan_opp) = self.analyze_personal_loan(debts, monthly_income, credit_score)? {
            opportunities.push(personal_loan_opp);
        }

        // Analyze balance transfer consolidation
        if let Some(balance_transfer_opp) = self.analyze_balance_transfer(debts, credit_score)? {
            opportunities.push(balance_transfer_opp);
        }

        // Analyze home equity consolidation (if applicable)
        if let Some(home_equity_opp) = self.analyze_home_equity(debts, monthly_income)? {
            opportunities.push(home_equity_opp);
        }

        Ok(opportunities)
    }

    fn analyze_personal_loan(
        &self,
        debts: &[DebtAccount],
        monthly_income: Money,
        credit_score: Option<u32>,
    ) -> Result<Option<ConsolidationOpportunity>> {
        let total_debt = self.calculate_total_debt(debts)?;
        let weighted_avg_rate = self.calculate_weighted_average_rate(debts)?;
        
        // Estimate personal loan rate based on credit score
        let estimated_rate = self.estimate_personal_loan_rate(credit_score);
        
        // Only recommend if rate is better
        if estimated_rate.as_decimal() >= weighted_avg_rate.as_decimal() {
            return Ok(None);
        }

        let estimated_term_months = 60; // 5 years typical
        let monthly_payment = self.calculate_loan_payment(
            total_debt.amount(),
            estimated_rate.as_decimal(),
            estimated_term_months,
        )?;

        let new_monthly_payment = Money::new_unchecked(monthly_payment, total_debt.currency());
        
        // Check debt-to-income ratio
        if monthly_payment / monthly_income.amount() > self.max_loan_to_income_ratio {
            return Ok(None);
        }

        let current_total_interest = self.calculate_current_total_interest(debts)?;
        let new_total_interest = Money::new_unchecked(
            monthly_payment * Decimal::from(estimated_term_months) - total_debt.amount(),
            total_debt.currency(),
        );

        let interest_savings = current_total_interest.subtract(&new_total_interest)?;

        Ok(Some(ConsolidationOpportunity {
            consolidation_type: ConsolidationType::PersonalLoan,
            consolidated_balance: total_debt,
            new_interest_rate: estimated_rate,
            new_monthly_payment,
            total_interest_savings: interest_savings,
            time_savings_months: self.calculate_time_savings(debts, estimated_term_months)?,
            eligibility_requirements: vec![
                "Good to excellent credit (650+ score)".to_string(),
                "Stable employment history".to_string(),
                "Debt-to-income ratio below 36%".to_string(),
            ],
            pros_and_cons: ConsolidationAnalysis {
                advantages: vec![
                    "Fixed interest rate".to_string(),
                    "Predictable monthly payment".to_string(),
                    "Single payment simplification".to_string(),
                    "Potential interest savings".to_string(),
                ],
                disadvantages: vec![
                    "May require good credit".to_string(),
                    "Origination fees possible".to_string(),
                    "Temptation to accumulate new debt".to_string(),
                ],
                risk_assessment: RiskLevel::Low,
                recommendation_score: dec!(85.0),
            },
        }))
    }

    fn analyze_balance_transfer(
        &self,
        debts: &[DebtAccount],
        credit_score: Option<u32>,
    ) -> Result<Option<ConsolidationOpportunity>> {
        // Only analyze credit card debts for balance transfer
        let cc_debts: Vec<&DebtAccount> = debts.iter()
            .filter(|d| matches!(d.debt_type, crate::debt::types::DebtType::CreditCard))
            .collect();

        if cc_debts.is_empty() {
            return Ok(None);
        }

        let total_cc_debt = cc_debts.iter()
            .try_fold(Money::new_unchecked(Decimal::ZERO, cc_debts[0].balance.currency()), |acc, debt| {
                acc.add(&debt.balance)
            })?;

        // Estimate balance transfer offer
        let intro_rate = Rate::new(
            Percentage::from_percentage(dec!(0.0))?, // 0% intro APR
            Period::Annual,
        );
        let ongoing_rate = self.estimate_balance_transfer_rate(credit_score);

        let intro_period_months = 18; // Typical 18-month intro period
        let transfer_fee = total_cc_debt.multiply(dec!(0.03))?; // 3% transfer fee

        Ok(Some(ConsolidationOpportunity {
            consolidation_type: ConsolidationType::BalanceTransfer,
            consolidated_balance: total_cc_debt,
            new_interest_rate: ongoing_rate,
            new_monthly_payment: self.calculate_minimum_payment(&total_cc_debt)?,
            total_interest_savings: Money::new_unchecked(dec!(0), total_cc_debt.currency()), // Placeholder
            time_savings_months: 0, // Variable based on payment strategy
            eligibility_requirements: vec![
                "Good credit score (700+ preferred)".to_string(),
                "Available credit limit on new card".to_string(),
                "Discipline to not accumulate new debt".to_string(),
            ],
            pros_and_cons: ConsolidationAnalysis {
                advantages: vec![
                    format!("0% APR for {} months", intro_period_months),
                    "All credit card debt in one place".to_string(),
                    "Potential for significant interest savings".to_string(),
                ],
                disadvantages: vec![
                    format!("{}% transfer fee", 3),
                    "High rate after intro period".to_string(),
                    "Requires excellent credit".to_string(),
                    "Temptation to use old cards again".to_string(),
                ],
                risk_assessment: RiskLevel::Moderate,
                recommendation_score: dec!(75.0),
            },
        }))
    }

    fn analyze_home_equity(
        &self,
        debts: &[DebtAccount],
        monthly_income: Money,
    ) -> Result<Option<ConsolidationOpportunity>> {
        let total_debt = self.calculate_total_debt(debts)?;
        
        // Conservative home equity rate estimate
        let he_rate = Rate::new(
            Percentage::from_percentage(dec!(7.5))?,
            Period::Annual,
        );

        let estimated_term_months = 120; // 10 years typical
        let monthly_payment = self.calculate_loan_payment(
            total_debt.amount(),
            he_rate.as_decimal(),
            estimated_term_months,
        )?;

        let new_monthly_payment = Money::new_unchecked(monthly_payment, total_debt.currency());

        Ok(Some(ConsolidationOpportunity {
            consolidation_type: ConsolidationType::HomeEquityLoan,
            consolidated_balance: total_debt,
            new_interest_rate: he_rate,
            new_monthly_payment,
            total_interest_savings: Money::new_unchecked(dec!(0), total_debt.currency()), // Placeholder
            time_savings_months: 0,
            eligibility_requirements: vec![
                "Home ownership with sufficient equity".to_string(),
                "Home appraisal required".to_string(),
                "Stable income verification".to_string(),
                "Good credit history".to_string(),
            ],
            pros_and_cons: ConsolidationAnalysis {
                advantages: vec![
                    "Typically lowest interest rates".to_string(),
                    "Tax-deductible interest (if used for home improvement)".to_string(),
                    "Longer repayment terms available".to_string(),
                ],
                disadvantages: vec![
                    "Home as collateral - risk of foreclosure".to_string(),
                    "Closing costs and appraisal fees".to_string(),
                    "May extend debt repayment period".to_string(),
                ],
                risk_assessment: RiskLevel::High,
                recommendation_score: dec!(60.0),
            },
        }))
    }

    // Helper methods
    
    fn calculate_total_debt(&self, debts: &[DebtAccount]) -> Result<Money> {
        if debts.is_empty() {
            return Ok(Money::new_unchecked(Decimal::ZERO, crate::types::Currency::USD));
        }

        debts.iter()
            .try_fold(Money::new_unchecked(Decimal::ZERO, debts[0].balance.currency()), |acc, debt| {
                acc.add(&debt.balance)
            })
    }

    fn calculate_weighted_average_rate(&self, debts: &[DebtAccount]) -> Result<Rate> {
        let total_debt = self.calculate_total_debt(debts)?;
        
        if total_debt.amount().is_zero() {
            return Ok(Rate::new(Percentage::from_percentage(Decimal::ZERO)?, Period::Annual));
        }

        let weighted_rate: Decimal = debts.iter()
            .map(|debt| {
                let weight = debt.balance.amount() / total_debt.amount();
                weight * debt.interest_rate.as_decimal()
            })
            .sum();

        Ok(Rate::new(
            Percentage::from_decimal(weighted_rate)?,
            Period::Annual,
        ))
    }

    fn estimate_personal_loan_rate(&self, credit_score: Option<u32>) -> Rate {
        let rate_percentage = match credit_score {
            Some(score) if score >= 750 => dec!(8.5),
            Some(score) if score >= 700 => dec!(12.0),
            Some(score) if score >= 650 => dec!(16.0),
            Some(_) => dec!(20.0),
            None => dec!(15.0), // Conservative estimate
        };

        Rate::new(
            Percentage::from_percentage(rate_percentage).unwrap(),
            Period::Annual,
        )
    }

    fn estimate_balance_transfer_rate(&self, credit_score: Option<u32>) -> Rate {
        let rate_percentage = match credit_score {
            Some(score) if score >= 750 => dec!(15.9),
            Some(score) if score >= 700 => dec!(18.9),
            Some(score) if score >= 650 => dec!(22.9),
            Some(_) => dec!(25.9),
            None => dec!(21.9),
        };

        Rate::new(
            Percentage::from_percentage(rate_percentage).unwrap(),
            Period::Annual,
        )
    }

    fn calculate_loan_payment(&self, principal: Decimal, annual_rate: Decimal, term_months: u32) -> Result<Decimal> {
        if annual_rate.is_zero() {
            return Ok(principal / Decimal::from(term_months));
        }

        let monthly_rate = annual_rate / dec!(12);
        let factor = (dec!(1) + monthly_rate).powf(Decimal::from(term_months));
        
        Ok(principal * (monthly_rate * factor) / (factor - dec!(1)))
    }

    fn calculate_current_total_interest(&self, debts: &[DebtAccount]) -> Result<Money> {
        // Simplified calculation - would need payment schedules for accuracy
        let currency = debts.first()
            .map(|d| d.balance.currency())
            .unwrap_or(crate::types::Currency::USD);
        
        // Placeholder calculation
        Ok(Money::new_unchecked(dec!(10000), currency))
    }

    fn calculate_time_savings(&self, _debts: &[DebtAccount], _new_term_months: u32) -> Result<u32> {
        // Placeholder - would need detailed payment schedule analysis
        Ok(24) // 2 years savings estimate
    }

    fn calculate_minimum_payment(&self, balance: &Money) -> Result<Money> {
        // Typical minimum payment is 2-3% of balance
        balance.multiply(dec!(0.025))
    }
}

impl Default for ConsolidationAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

// Helper trait extension for Decimal power calculation
trait DecimalPower {
    fn powf(&self, exp: Decimal) -> Decimal;
}

impl DecimalPower for Decimal {
    fn powf(&self, exp: Decimal) -> Decimal {
        if self.is_zero() {
            return Decimal::ZERO;
        }
        if exp.is_zero() {
            return Decimal::ONE;
        }
        
        // Convert to f64 for power calculation
        let base_f64 = self.to_f64().unwrap_or(1.0);
        let exp_f64 = exp.to_f64().unwrap_or(1.0);
        let result = base_f64.powf(exp_f64);
        
        Decimal::from_f64_retain(result).unwrap_or(Decimal::ONE)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;
    use crate::types::Currency;
    use crate::debt::types::DebtType;

    #[test]
    fn test_consolidation_analyzer_creation() {
        let analyzer = ConsolidationAnalyzer::new();
        assert_eq!(analyzer.min_consolidation_balance.amount(), dec!(5000));
    }

    #[test]
    fn test_total_debt_calculation() {
        let analyzer = ConsolidationAnalyzer::new();
        
        let debts = vec![
            DebtAccount::new(
                Uuid::new_v4(),
                "Card 1".to_string(),
                DebtType::CreditCard,
                Money::new(dec!(3000), Currency::USD).unwrap(),
                Rate::new(Percentage::from_percentage(dec!(18.9)).unwrap(), Period::Annual),
                Money::new(dec!(90), Currency::USD).unwrap(),
            ),
            DebtAccount::new(
                Uuid::new_v4(),
                "Card 2".to_string(),
                DebtType::CreditCard,
                Money::new(dec!(2000), Currency::USD).unwrap(),
                Rate::new(Percentage::from_percentage(dec!(22.9)).unwrap(), Period::Annual),
                Money::new(dec!(60), Currency::USD).unwrap(),
            ),
        ];

        let total = analyzer.calculate_total_debt(&debts).unwrap();
        assert_eq!(total.amount(), dec!(5000));
    }

    #[test]
    fn test_weighted_average_rate() {
        let analyzer = ConsolidationAnalyzer::new();
        
        let debts = vec![
            DebtAccount::new(
                Uuid::new_v4(),
                "Low Rate".to_string(),
                DebtType::PersonalLoan,
                Money::new(dec!(6000), Currency::USD).unwrap(),
                Rate::new(Percentage::from_percentage(dec!(10.0)).unwrap(), Period::Annual),
                Money::new(dec!(120), Currency::USD).unwrap(),
            ),
            DebtAccount::new(
                Uuid::new_v4(),
                "High Rate".to_string(),
                DebtType::CreditCard,
                Money::new(dec!(4000), Currency::USD).unwrap(),
                Rate::new(Percentage::from_percentage(dec!(20.0)).unwrap(), Period::Annual),
                Money::new(dec!(100), Currency::USD).unwrap(),
            ),
        ];

        let avg_rate = analyzer.calculate_weighted_average_rate(&debts).unwrap();
        // Weighted average: (6000/10000 * 0.10) + (4000/10000 * 0.20) = 0.06 + 0.08 = 0.14 = 14%
        assert_eq!(avg_rate.as_decimal(), dec!(0.14));
    }
}