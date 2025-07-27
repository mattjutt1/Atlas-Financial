/// Debt optimization engine combining multiple strategies
/// 
/// This module provides comprehensive debt optimization analysis including:
/// - Strategy comparison (snowball vs avalanche)
/// - Custom payment allocation
/// - Consolidation opportunities
/// - Negotiation recommendations
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use chrono::{DateTime, Utc};
use crate::{Money, FinancialError, Result};
use crate::debt::types::{
    DebtAccount, PaymentPlan, DebtStrategy, DebtOptimizationResult, 
    DebtComparison, PsychologicalFactors, ConsolidationOpportunity,
    NegotiationOpportunity, RiskLevel
};
use crate::debt::snowball::{SnowballCalculator, SnowballSavings};
use crate::debt::avalanche::{AvalancheCalculator, AvalancheSavings, StrategyComparison};
use crate::types::Percentage;

/// Comprehensive debt optimization engine
pub struct DebtOptimizer {
    extra_payment_budget: Money,
    risk_tolerance: RiskLevel,
    psychological_preference: PsychologicalPreference,
}

/// User's psychological preference for debt payoff
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PsychologicalPreference {
    QuickWins,          // Prefers early victories (snowball-friendly)
    Mathematical,       // Prefers optimal savings (avalanche-friendly)
    Balanced,           // No strong preference
}

/// Comprehensive optimization analysis
#[derive(Debug, Clone, PartialEq)]
pub struct OptimizationAnalysis {
    pub strategy_comparison: StrategyComparison,
    pub recommended_strategy: DebtStrategy,
    pub confidence_score: Decimal, // 0-100 scale
    pub psychological_factors: PsychologicalFactors,
    pub consolidation_opportunities: Vec<ConsolidationOpportunity>,
    pub negotiation_opportunities: Vec<NegotiationOpportunity>,
    pub custom_strategy_suggestions: Vec<CustomStrategySuggestion>,
}

/// Custom debt strategy suggestion
#[derive(Debug, Clone, PartialEq)]
pub struct CustomStrategySuggestion {
    pub strategy_name: String,
    pub description: String,
    pub payment_allocation: Vec<DebtAllocation>,
    pub projected_savings: Money,
    pub implementation_difficulty: Difficulty,
}

/// Individual debt payment allocation
#[derive(Debug, Clone, PartialEq)]
pub struct DebtAllocation {
    pub debt_id: uuid::Uuid,
    pub debt_name: String,
    pub monthly_payment: Money,
    pub percentage_of_extra: Percentage,
}

/// Implementation difficulty levels
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Difficulty {
    Easy,
    Moderate,
    Hard,
}

impl DebtOptimizer {
    /// Create a new debt optimizer
    pub fn new(extra_payment_budget: Money) -> Self {
        Self {
            extra_payment_budget,
            risk_tolerance: RiskLevel::Moderate,
            psychological_preference: PsychologicalPreference::Balanced,
        }
    }

    /// Set risk tolerance
    pub fn with_risk_tolerance(mut self, risk_tolerance: RiskLevel) -> Self {
        self.risk_tolerance = risk_tolerance;
        self
    }

    /// Set psychological preference
    pub fn with_psychological_preference(mut self, preference: PsychologicalPreference) -> Self {
        self.psychological_preference = preference;
        self
    }

    /// Perform comprehensive debt optimization analysis
    pub fn optimize(&self, debts: &[DebtAccount]) -> Result<OptimizationAnalysis> {
        if debts.is_empty() {
            return Err(FinancialError::InsufficientData {
                required: "At least one debt account".to_string(),
            });
        }

        // Calculate both strategies
        let snowball_calculator = SnowballCalculator::new(self.extra_payment_budget.clone());
        let avalanche_calculator = AvalancheCalculator::new(self.extra_payment_budget.clone());

        let strategy_comparison = avalanche_calculator.compare_with_snowball(debts)?;
        
        // Analyze psychological factors
        let psychological_factors = self.analyze_psychological_factors(debts, &strategy_comparison)?;
        
        // Determine recommended strategy
        let (recommended_strategy, confidence_score) = self.determine_recommended_strategy(
            &strategy_comparison,
            &psychological_factors
        );

        // Find consolidation opportunities
        let consolidation_opportunities = self.find_consolidation_opportunities(debts)?;
        
        // Find negotiation opportunities
        let negotiation_opportunities = self.find_negotiation_opportunities(debts)?;
        
        // Generate custom strategy suggestions
        let custom_strategy_suggestions = self.generate_custom_strategies(debts)?;

        Ok(OptimizationAnalysis {
            strategy_comparison,
            recommended_strategy,
            confidence_score,
            psychological_factors,
            consolidation_opportunities,
            negotiation_opportunities,
            custom_strategy_suggestions,
        })
    }

    /// Generate a complete debt optimization result
    pub fn generate_optimization_result(&self, debts: &[DebtAccount]) -> Result<DebtOptimizationResult> {
        let analysis = self.optimize(debts)?;
        
        let payment_plans = match analysis.recommended_strategy {
            DebtStrategy::Snowball => {
                let calculator = SnowballCalculator::new(self.extra_payment_budget.clone());
                calculator.calculate_payment_plan(debts)?
            },
            DebtStrategy::Avalanche => {
                let calculator = AvalancheCalculator::new(self.extra_payment_budget.clone());
                calculator.calculate_payment_plan(debts)?
            },
            DebtStrategy::Custom => {
                // Use the first custom strategy suggestion if available
                if let Some(custom_strategy) = analysis.custom_strategy_suggestions.first() {
                    self.calculate_custom_payment_plan(debts, &custom_strategy.payment_allocation)?
                } else {
                    // Fallback to avalanche
                    let calculator = AvalancheCalculator::new(self.extra_payment_budget.clone());
                    calculator.calculate_payment_plan(debts)?
                }
            },
            DebtStrategy::Consolidation => {
                // For consolidation, calculate as if it were a single debt
                self.calculate_consolidation_plan(debts)?
            },
        };

        let total_monthly_payment = payment_plans.iter()
            .try_fold(Money::new_unchecked(Decimal::ZERO, debts[0].balance.currency()), |acc, plan| {
                acc.add(&plan.monthly_payment)
            })?;

        let total_interest_paid = payment_plans.iter()
            .try_fold(Money::new_unchecked(Decimal::ZERO, debts[0].balance.currency()), |acc, plan| {
                acc.add(&plan.total_interest)
            })?;

        let final_payoff_date = payment_plans.iter()
            .map(|p| p.payoff_date)
            .max()
            .unwrap_or(Utc::now());

        let total_time_to_payoff_months = payment_plans.iter()
            .map(|p| p.payment_count())
            .max()
            .unwrap_or(0);

        // Calculate savings vs minimum payments
        let minimum_calculator = AvalancheCalculator::new(Money::new_unchecked(Decimal::ZERO, debts[0].balance.currency()));
        let minimum_plans = minimum_calculator.calculate_payment_plan(debts)?;
        
        let minimum_total_interest = minimum_plans.iter()
            .try_fold(Money::new_unchecked(Decimal::ZERO, debts[0].balance.currency()), |acc, plan| {
                acc.add(&plan.total_interest)
            })?;

        let minimum_total_months = minimum_plans.iter()
            .map(|p| p.payment_count())
            .max()
            .unwrap_or(0);

        let interest_savings_vs_minimum = minimum_total_interest.subtract(&total_interest_paid)?;
        let time_savings_vs_minimum_months = minimum_total_months.saturating_sub(total_time_to_payoff_months);

        Ok(DebtOptimizationResult {
            strategy: analysis.recommended_strategy,
            payment_plans,
            total_monthly_payment,
            total_interest_paid,
            total_time_to_payoff_months,
            final_payoff_date,
            interest_savings_vs_minimum,
            time_savings_vs_minimum_months,
            generated_at: Utc::now(),
        })
    }

    /// Create a debt comparison analysis
    pub fn create_debt_comparison(&self, debts: &[DebtAccount]) -> Result<DebtComparison> {
        let snowball_calculator = SnowballCalculator::new(self.extra_payment_budget.clone());
        let avalanche_calculator = AvalancheCalculator::new(self.extra_payment_budget.clone());
        let minimum_calculator = AvalancheCalculator::new(Money::new_unchecked(Decimal::ZERO, debts[0].balance.currency()));

        let snowball_plans = snowball_calculator.calculate_payment_plan(debts)?;
        let avalanche_plans = avalanche_calculator.calculate_payment_plan(debts)?;
        let minimum_plans = minimum_calculator.calculate_payment_plan(debts)?;

        let snowball_result = self.plans_to_optimization_result(snowball_plans, DebtStrategy::Snowball)?;
        let avalanche_result = self.plans_to_optimization_result(avalanche_plans, DebtStrategy::Avalanche)?;
        let minimum_only_result = self.plans_to_optimization_result(minimum_plans, DebtStrategy::Custom)?;

        let psychological_factors = self.calculate_psychological_factors(debts, &snowball_result, &avalanche_result)?;
        
        let recommended_strategy = if avalanche_result.total_interest_paid.amount() < snowball_result.total_interest_paid.amount() {
            if avalanche_result.total_interest_paid.subtract(&snowball_result.total_interest_paid)?.amount() > dec!(500) {
                DebtStrategy::Avalanche
            } else {
                match self.psychological_preference {
                    PsychologicalPreference::QuickWins => DebtStrategy::Snowball,
                    PsychologicalPreference::Mathematical => DebtStrategy::Avalanche,
                    PsychologicalPreference::Balanced => {
                        if psychological_factors.quick_wins_importance > dec!(0.6) {
                            DebtStrategy::Snowball
                        } else {
                            DebtStrategy::Avalanche
                        }
                    }
                }
            }
        } else {
            DebtStrategy::Snowball
        };

        let recommendation_reason = self.generate_recommendation_reason(
            &avalanche_result,
            &snowball_result,
            &psychological_factors,
            recommended_strategy
        );

        Ok(DebtComparison {
            snowball_result,
            avalanche_result,
            minimum_only_result,
            recommended_strategy,
            recommendation_reason,
            psychological_factors,
        })
    }

    // Private helper methods

    fn analyze_psychological_factors(
        &self,
        debts: &[DebtAccount],
        comparison: &StrategyComparison,
    ) -> Result<PsychologicalFactors> {
        let total_debt: Decimal = debts.iter().map(|d| d.balance.amount()).sum();
        let smallest_debt = debts.iter().min_by_key(|d| d.balance.amount()).unwrap();
        
        // Quick wins importance based on debt size distribution
        let quick_wins_importance = if smallest_debt.balance.amount() < total_debt / dec!(10) {
            dec!(0.8) // Small debt exists, quick wins valuable
        } else {
            dec!(0.3) // All debts similar size, quick wins less valuable
        };

        // Mathematical optimality based on interest savings
        let mathematical_optimality = if comparison.interest_savings_avalanche.amount() > dec!(1000) {
            dec!(0.9)
        } else if comparison.interest_savings_avalanche.amount() > dec!(500) {
            dec!(0.7)
        } else {
            dec!(0.4)
        };

        // Motivation scores based on strategy characteristics
        let motivation_score_snowball = match self.psychological_preference {
            PsychologicalPreference::QuickWins => 9,
            PsychologicalPreference::Mathematical => 5,
            PsychologicalPreference::Balanced => 7,
        };

        let motivation_score_avalanche = match self.psychological_preference {
            PsychologicalPreference::QuickWins => 5,
            PsychologicalPreference::Mathematical => 9,
            PsychologicalPreference::Balanced => 7,
        };

        // Success probability based on complexity and user preference
        let estimated_success_probability = if quick_wins_importance > dec!(0.6) && motivation_score_snowball > 7 {
            Percentage::from_percentage(dec!(85))?
        } else if mathematical_optimality > dec!(0.7) && motivation_score_avalanche > 7 {
            Percentage::from_percentage(dec!(80))?
        } else {
            Percentage::from_percentage(dec!(75))?
        };

        Ok(PsychologicalFactors {
            motivation_score_snowball,
            motivation_score_avalanche,
            quick_wins_importance,
            mathematical_optimality,
            estimated_success_probability,
        })
    }

    fn determine_recommended_strategy(
        &self,
        comparison: &StrategyComparison,
        psychological: &PsychologicalFactors,
    ) -> (DebtStrategy, Decimal) {
        let mut avalanche_score = dec!(50); // Base score
        let mut snowball_score = dec!(50);

        // Factor in interest savings
        if comparison.interest_savings_avalanche.amount() > dec!(1000) {
            avalanche_score += dec!(20);
        } else if comparison.interest_savings_avalanche.amount() > dec!(500) {
            avalanche_score += dec!(10);
        }

        // Factor in psychological preferences
        if psychological.quick_wins_importance > dec!(0.7) {
            snowball_score += dec!(15);
        }

        if psychological.mathematical_optimality > dec!(0.7) {
            avalanche_score += dec!(15);
        }

        // Factor in user's stated preference
        match self.psychological_preference {
            PsychologicalPreference::QuickWins => snowball_score += dec!(10),
            PsychologicalPreference::Mathematical => avalanche_score += dec!(10),
            PsychologicalPreference::Balanced => {} // No bias
        }

        let confidence_score = (avalanche_score - snowball_score).abs();
        
        if avalanche_score > snowball_score {
            (DebtStrategy::Avalanche, confidence_score)
        } else {
            (DebtStrategy::Snowball, confidence_score)
        }
    }

    fn find_consolidation_opportunities(&self, _debts: &[DebtAccount]) -> Result<Vec<ConsolidationOpportunity>> {
        // This would integrate with external APIs or databases to find real consolidation options
        // For now, return empty vector as this requires external data
        Ok(Vec::new())
    }

    fn find_negotiation_opportunities(&self, debts: &[DebtAccount]) -> Result<Vec<NegotiationOpportunity>> {
        let mut opportunities = Vec::new();

        for debt in debts {
            if debt.qualifies_for_negotiation() {
                let opportunity = self.create_negotiation_opportunity(debt)?;
                opportunities.push(opportunity);
            }
        }

        Ok(opportunities)
    }

    fn create_negotiation_opportunity(&self, debt: &DebtAccount) -> Result<NegotiationOpportunity> {
        use crate::debt::types::NegotiationType;

        let (negotiation_type, potential_savings_pct, success_probability_pct) = match debt.debt_type {
            crate::debt::types::DebtType::CreditCard => {
                if debt.balance.amount() > dec!(5000) {
                    (NegotiationType::InterestRateReduction, dec!(20), dec!(70))
                } else {
                    (NegotiationType::PaymentPlanModification, dec!(10), dec!(60))
                }
            },
            crate::debt::types::DebtType::MedicalDebt => {
                (NegotiationType::BalanceSettlement, dec!(40), dec!(80))
            },
            crate::debt::types::DebtType::PersonalLoan => {
                (NegotiationType::InterestRateReduction, dec!(15), dec!(50))
            },
            _ => {
                (NegotiationType::PaymentPlanModification, dec!(5), dec!(30))
            }
        };

        let potential_savings = debt.balance.multiply(potential_savings_pct / dec!(100))?;
        let success_probability = Percentage::from_percentage(success_probability_pct)?;

        Ok(NegotiationOpportunity {
            debt_id: debt.id,
            debt_name: debt.name.clone(),
            current_balance: debt.balance.clone(),
            negotiation_type,
            potential_savings,
            success_probability,
            negotiation_strategy: self.generate_negotiation_strategy(&negotiation_type),
            talking_points: self.generate_talking_points(debt, &negotiation_type),
            required_preparation: self.generate_preparation_steps(&negotiation_type),
        })
    }

    fn generate_custom_strategies(&self, debts: &[DebtAccount]) -> Result<Vec<CustomStrategySuggestion>> {
        let mut suggestions = Vec::new();

        // Hybrid strategy: Focus extra payment on highest-interest debt above certain threshold
        if debts.len() > 2 {
            let high_interest_threshold = dec!(15.0); // 15% APR
            let mut allocations = Vec::new();
            
            for debt in debts {
                let is_high_interest = debt.interest_rate.as_decimal() > high_interest_threshold / dec!(100);
                let extra_percentage = if is_high_interest { dec!(70) } else { dec!(10) };
                
                allocations.push(DebtAllocation {
                    debt_id: debt.id,
                    debt_name: debt.name.clone(),
                    monthly_payment: debt.minimum_payment.add(
                        &self.extra_payment_budget.multiply(extra_percentage / dec!(100))?
                    )?,
                    percentage_of_extra: Percentage::from_percentage(extra_percentage)?,
                });
            }

            suggestions.push(CustomStrategySuggestion {
                strategy_name: "High-Interest Focus".to_string(),
                description: "Allocate most extra payments to debts above 15% interest rate".to_string(),
                payment_allocation: allocations,
                projected_savings: Money::new_unchecked(dec!(0), debts[0].balance.currency()), // TODO: Calculate
                implementation_difficulty: Difficulty::Easy,
            });
        }

        Ok(suggestions)
    }

    fn calculate_custom_payment_plan(
        &self,
        debts: &[DebtAccount],
        allocations: &[DebtAllocation],
    ) -> Result<Vec<PaymentPlan>> {
        // For custom strategies, calculate each debt individually with its allocated payment
        let mut plans = Vec::new();
        
        for allocation in allocations {
            if let Some(debt) = debts.iter().find(|d| d.id == allocation.debt_id) {
                let extra_payment = allocation.monthly_payment.subtract(&debt.minimum_payment)?;
                let calculator = AvalancheCalculator::new(extra_payment);
                let plan = calculator.calculate_single_debt_plan(debt, &extra_payment)?;
                plans.push(plan);
            }
        }

        Ok(plans)
    }

    fn calculate_consolidation_plan(&self, debts: &[DebtAccount]) -> Result<Vec<PaymentPlan>> {
        // Simplified consolidation calculation - combine all debts into one
        let total_balance: Decimal = debts.iter().map(|d| d.balance.amount()).sum();
        let weighted_avg_rate = self.calculate_weighted_average_rate(debts)?;
        
        // Create a virtual consolidated debt
        let consolidated_debt = DebtAccount::new(
            uuid::Uuid::new_v4(),
            "Consolidated Debt".to_string(),
            crate::debt::types::DebtType::PersonalLoan,
            Money::new_unchecked(total_balance, debts[0].balance.currency()),
            weighted_avg_rate,
            self.extra_payment_budget.clone(), // Assume consolidation allows using full extra payment
        );

        let calculator = AvalancheCalculator::new(self.extra_payment_budget.clone());
        let plan = calculator.calculate_single_debt_plan(&consolidated_debt, &self.extra_payment_budget)?;
        
        Ok(vec![plan])
    }

    fn calculate_weighted_average_rate(&self, debts: &[DebtAccount]) -> Result<crate::types::Rate> {
        let total_balance: Decimal = debts.iter().map(|d| d.balance.amount()).sum();
        
        if total_balance.is_zero() {
            return Err(FinancialError::DivisionByZero);
        }

        let weighted_rate: Decimal = debts.iter()
            .map(|d| d.balance.amount() * d.interest_rate.as_decimal())
            .sum::<Decimal>() / total_balance;

        Ok(crate::types::Rate::new(
            Percentage::from_decimal(weighted_rate)?,
            crate::types::Period::Annual,
        ))
    }

    fn plans_to_optimization_result(
        &self,
        plans: Vec<PaymentPlan>,
        strategy: DebtStrategy,
    ) -> Result<DebtOptimizationResult> {
        if plans.is_empty() {
            return Err(FinancialError::InsufficientData {
                required: "At least one payment plan".to_string(),
            });
        }

        let currency = plans[0].total_payments.currency();
        
        let total_monthly_payment = plans.iter()
            .try_fold(Money::new_unchecked(Decimal::ZERO, currency), |acc, plan| {
                acc.add(&plan.monthly_payment)
            })?;

        let total_interest_paid = plans.iter()
            .try_fold(Money::new_unchecked(Decimal::ZERO, currency), |acc, plan| {
                acc.add(&plan.total_interest)
            })?;

        let final_payoff_date = plans.iter()
            .map(|p| p.payoff_date)
            .max()
            .unwrap_or(Utc::now());

        let total_time_to_payoff_months = plans.iter()
            .map(|p| p.payment_count())
            .max()
            .unwrap_or(0);

        Ok(DebtOptimizationResult {
            strategy,
            payment_plans: plans,
            total_monthly_payment,
            total_interest_paid,
            total_time_to_payoff_months,
            final_payoff_date,
            interest_savings_vs_minimum: Money::new_unchecked(Decimal::ZERO, currency),
            time_savings_vs_minimum_months: 0,
            generated_at: Utc::now(),
        })
    }

    fn calculate_psychological_factors(
        &self,
        debts: &[DebtAccount],
        snowball_result: &DebtOptimizationResult,
        avalanche_result: &DebtOptimizationResult,
    ) -> Result<PsychologicalFactors> {
        let smallest_debt_pct = debts.iter()
            .min_by_key(|d| d.balance.amount())
            .map(|d| d.balance.amount())
            .unwrap_or(Decimal::ZERO) / debts.iter().map(|d| d.balance.amount()).sum::<Decimal>();

        let quick_wins_importance = if smallest_debt_pct < dec!(0.2) { dec!(0.8) } else { dec!(0.4) };
        
        let interest_diff = avalanche_result.total_interest_paid.subtract(&snowball_result.total_interest_paid)?;
        let mathematical_optimality = if interest_diff.amount() > dec!(1000) { dec!(0.9) } else { dec!(0.5) };

        Ok(PsychologicalFactors {
            motivation_score_snowball: 7,
            motivation_score_avalanche: 7,
            quick_wins_importance,
            mathematical_optimality,
            estimated_success_probability: Percentage::from_percentage(dec!(75))?,
        })
    }

    fn generate_recommendation_reason(
        &self,
        avalanche_result: &DebtOptimizationResult,
        snowball_result: &DebtOptimizationResult,
        psychological: &PsychologicalFactors,
        recommended_strategy: DebtStrategy,
    ) -> String {
        let interest_diff = avalanche_result.total_interest_paid.subtract(&snowball_result.total_interest_paid)
            .unwrap_or_else(|_| Money::new_unchecked(Decimal::ZERO, avalanche_result.total_interest_paid.currency()));

        match recommended_strategy {
            DebtStrategy::Avalanche => {
                if interest_diff.amount() > dec!(1000) {
                    format!("Avalanche method saves ${:.2} in interest payments - significant mathematical advantage", interest_diff.amount())
                } else {
                    "Avalanche method provides modest interest savings with good mathematical foundation".to_string()
                }
            },
            DebtStrategy::Snowball => {
                if psychological.quick_wins_importance > dec!(0.7) {
                    "Snowball method recommended for psychological benefits and early motivation wins".to_string()
                } else {
                    "Snowball method provides good balance of savings and psychological benefits".to_string()
                }
            },
            _ => "Custom strategy recommended based on your specific situation".to_string(),
        }
    }

    fn generate_negotiation_strategy(&self, negotiation_type: &crate::debt::types::NegotiationType) -> String {
        use crate::debt::types::NegotiationType;
        
        match negotiation_type {
            NegotiationType::InterestRateReduction => {
                "Contact creditor to request rate reduction based on payment history and current market rates".to_string()
            },
            NegotiationType::BalanceSettlement => {
                "Negotiate lump-sum settlement for less than full balance, typically 40-60% of original amount".to_string()
            },
            NegotiationType::PaymentPlanModification => {
                "Request modified payment plan with extended terms or reduced monthly payments".to_string()
            },
            NegotiationType::HardshipProgram => {
                "Apply for creditor's hardship program with documented financial difficulties".to_string()
            },
            NegotiationType::DebtForgiveness => {
                "Request partial debt forgiveness based on exceptional circumstances".to_string()
            },
        }
    }

    fn generate_talking_points(&self, debt: &DebtAccount, negotiation_type: &crate::debt::types::NegotiationType) -> Vec<String> {
        use crate::debt::types::NegotiationType;
        
        let mut points = vec![
            "I am a loyal customer who wants to resolve this debt".to_string(),
            "I have been making consistent payments when possible".to_string(),
        ];

        match negotiation_type {
            NegotiationType::InterestRateReduction => {
                points.push("I've seen lower rates offered by competitors".to_string());
                points.push("A rate reduction would help me pay off the balance faster".to_string());
            },
            NegotiationType::BalanceSettlement => {
                points.push("I can make a lump-sum payment today for a reduced amount".to_string());
                points.push("This settlement would resolve the account completely".to_string());
            },
            _ => {},
        }

        points
    }

    fn generate_preparation_steps(&self, negotiation_type: &crate::debt::types::NegotiationType) -> Vec<String> {
        use crate::debt::types::NegotiationType;
        
        let mut steps = vec![
            "Gather all account statements and payment history".to_string(),
            "Research current market rates for similar products".to_string(),
            "Prepare a clear explanation of your financial situation".to_string(),
        ];

        match negotiation_type {
            NegotiationType::BalanceSettlement => {
                steps.push("Have settlement funds readily available".to_string());
                steps.push("Get any agreement in writing before paying".to_string());
            },
            NegotiationType::HardshipProgram => {
                steps.push("Document income reduction or unexpected expenses".to_string());
                steps.push("Complete hardship application thoroughly".to_string());
            },
            _ => {},
        }

        steps
    }
}

impl Default for DebtOptimizer {
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
    fn test_debt_optimizer_creation() {
        let extra_payment = Money::new(dec!(300), Currency::USD).unwrap();
        let optimizer = DebtOptimizer::new(extra_payment)
            .with_risk_tolerance(RiskLevel::Low)
            .with_psychological_preference(PsychologicalPreference::QuickWins);
        
        assert_eq!(optimizer.extra_payment_budget.amount(), dec!(300));
        assert_eq!(optimizer.risk_tolerance, RiskLevel::Low);
        assert_eq!(optimizer.psychological_preference, PsychologicalPreference::QuickWins);
    }

    #[test]
    fn test_debt_comparison() {
        let optimizer = DebtOptimizer::new(Money::new(dec!(200), Currency::USD).unwrap());
        
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
                Money::new(dec!(3000), Currency::USD).unwrap(),
                Rate::new(Percentage::from_percentage(dec!(12.5)).unwrap(), Period::Annual),
                Money::new(dec!(120), Currency::USD).unwrap(),
            ),
        ];

        let comparison = optimizer.create_debt_comparison(&debts).unwrap();
        
        assert!(comparison.avalanche_result.total_interest_paid.amount() <= comparison.snowball_result.total_interest_paid.amount());
        assert!(!comparison.recommendation_reason.is_empty());
    }

    #[test]
    fn test_negotiation_opportunities() {
        let optimizer = DebtOptimizer::default();
        
        let debts = vec![
            DebtAccount::new(
                Uuid::new_v4(),
                "High Balance Credit Card".to_string(),
                DebtType::CreditCard,
                Money::new(dec!(8000), Currency::USD).unwrap(),
                Rate::new(Percentage::from_percentage(dec!(24.99)).unwrap(), Period::Annual),
                Money::new(dec!(200), Currency::USD).unwrap(),
            ),
        ];

        let opportunities = optimizer.find_negotiation_opportunities(&debts).unwrap();
        
        assert_eq!(opportunities.len(), 1);
        assert_eq!(opportunities[0].debt_name, "High Balance Credit Card");
        assert!(opportunities[0].potential_savings.amount() > Decimal::ZERO);
    }

    #[test]
    fn test_psychological_preferences() {
        let debts = vec![
            DebtAccount::new(
                Uuid::new_v4(),
                "Small Debt".to_string(),
                DebtType::CreditCard,
                Money::new(dec!(500), Currency::USD).unwrap(),
                Rate::new(Percentage::from_percentage(dec!(15.0)).unwrap(), Period::Annual),
                Money::new(dec!(25), Currency::USD).unwrap(),
            ),
            DebtAccount::new(
                Uuid::new_v4(),
                "Large Debt".to_string(),
                DebtType::PersonalLoan,
                Money::new(dec!(10000), Currency::USD).unwrap(),
                Rate::new(Percentage::from_percentage(dec!(25.0)).unwrap(), Period::Annual),
                Money::new(dec!(300), Currency::USD).unwrap(),
            ),
        ];

        let quick_wins_optimizer = DebtOptimizer::new(Money::new(dec!(200), Currency::USD).unwrap())
            .with_psychological_preference(PsychologicalPreference::QuickWins);
        
        let math_optimizer = DebtOptimizer::new(Money::new(dec!(200), Currency::USD).unwrap())
            .with_psychological_preference(PsychologicalPreference::Mathematical);

        let quick_wins_analysis = quick_wins_optimizer.optimize(&debts).unwrap();
        let math_analysis = math_optimizer.optimize(&debts).unwrap();

        // Quick wins should favor snowball more often
        // Math preference should favor avalanche more often
        assert_ne!(quick_wins_analysis.recommended_strategy, math_analysis.recommended_strategy);
    }
}