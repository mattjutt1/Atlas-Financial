/**
 * AI-specific GraphQL Queries for Atlas Financial
 * Smart insights, anomaly detection, and predictive analytics
 */

import { gql } from '@apollo/client';
import { INSIGHT_FULL_DETAILS } from '@atlas/shared/graphql/fragments';

// Budget AI Insights
export const GET_BUDGET_AI_INSIGHTS = gql`
  query GetBudgetAIInsights(
    $userId: uuid!,
    $budgetId: uuid,
    $categories: [String!]!,
    $priorities: [String!] = ["high", "medium", "low"],
    $limit: Int = 10
  ) {
    insights(
      where: {
        user_id: { _eq: $userId },
        budget_id: { _eq: $budgetId },
        category: { _in: $categories },
        priority: { _in: $priorities },
        status: { _eq: "active" },
        confidence_level: { _gte: 0.7 }
      }
      order_by: [
        { priority: asc },
        { confidence_level: desc },
        { created_at: desc }
      ]
      limit: $limit
    ) {
      ...InsightFullDetails
    }
  }
  ${INSIGHT_FULL_DETAILS}
`;

// Spending Anomaly Detection
export const GET_SPENDING_ANOMALIES = gql`
  query GetSpendingAnomalies(
    $userId: uuid!,
    $budgetId: uuid,
    $severityFilter: [String!],
    $limit: Int = 10,
    $startDate: timestamptz,
    $endDate: timestamptz
  ) {
    spendingAnomalies: ai_spending_anomalies(
      where: {
        user_id: { _eq: $userId },
        budget_id: { _eq: $budgetId },
        severity: { _in: $severityFilter },
        detected_at: { _gte: $startDate, _lte: $endDate },
        confidence: { _gte: 0.6 },
        status: { _eq: "active" }
      }
      order_by: [
        { severity: asc },
        { confidence: desc },
        { detected_at: desc }
      ]
      limit: $limit
    ) {
      id
      type
      severity
      category
      amount
      normal_amount
      deviation
      confidence
      description
      transaction_id
      merchant_name
      detected_at
      related_transactions_count
      recommendation
      metadata
    }
  }
`;

// Predictive Budget Allocations
export const GET_PREDICTIVE_ALLOCATIONS = gql`
  query GetPredictiveAllocations(
    $userId: uuid!,
    $budgetId: uuid!,
    $includeHistoricalData: Boolean = true,
    $confidenceThreshold: Float = 0.6
  ) {
    predictiveAllocations: ai_budget_allocation_suggestions(
      where: {
        user_id: { _eq: $userId },
        budget_id: { _eq: $budgetId },
        confidence: { _gte: $confidenceThreshold },
        status: { _eq: "active" }
      }
      order_by: [
        { confidence: desc },
        { projected_savings: desc },
        { created_at: desc }
      ]
    ) {
      id
      category_id
      category_name
      current_amount
      suggested_amount
      change_amount
      change_percentage
      reasoning
      confidence
      impact_level
      projected_savings
      created_at
      historical_data @include(if: $includeHistoricalData) {
        average_spent
        utilization_rate
        trend_direction
        variance
        seasonal_patterns
      }
    }
  }
`;

// Apply Budget Allocation Suggestions
export const APPLY_ALLOCATION_SUGGESTIONS = gql`
  mutation ApplyAllocationSuggestions(
    $budgetId: uuid!,
    $allocations: [budget_allocation_input!]!
  ) {
    update_budget_categories(
      where: { budget_id: { _eq: $budgetId } },
      _set: $allocations
    ) {
      affected_rows
      returning {
        id
        name
        allocated_amount
        updated_at
      }
    }
  }
`;

// Financial Goal AI Predictions
export const GET_GOAL_AI_PREDICTIONS = gql`
  query GetGoalAIPredictions(
    $userId: uuid!,
    $goalIds: [uuid!],
    $includeProbabilityAnalysis: Boolean = true
  ) {
    goalPredictions: ai_goal_predictions(
      where: {
        user_id: { _eq: $userId },
        goal_id: { _in: $goalIds },
        confidence: { _gte: 0.7 }
      }
      order_by: [
        { confidence: desc },
        { created_at: desc }
      ]
    ) {
      id
      goal_id
      goal_name
      predicted_completion_date
      probability_of_success
      recommended_monthly_contribution
      current_trajectory
      optimistic_scenario
      pessimistic_scenario
      confidence
      factors_analysis @include(if: $includeProbabilityAnalysis) {
        income_stability
        spending_consistency
        market_conditions
        goal_priority
        external_factors
      }
      milestones {
        date
        amount
        probability
        description
      }
    }
  }
`;

// Goal Achievement Probability
export const GET_GOAL_ACHIEVEMENT_PROBABILITY = gql`
  query GetGoalAchievementProbability(
    $userId: uuid!,
    $goalId: uuid!
  ) {
    goalProbability: ai_goal_achievement_analysis(
      where: {
        user_id: { _eq: $userId },
        goal_id: { _eq: $goalId }
      }
      limit: 1
    ) {
      id
      goal_id
      current_probability
      probability_trend
      key_factors {
        factor_name
        impact_weight
        current_status
        improvement_potential
      }
      scenario_analysis {
        scenario_type
        probability
        timeline_months
        required_monthly_contribution
        assumptions
      }
      recommendations {
        action_type
        description
        potential_impact
        priority
        estimated_effort
      }
    }
  }
`;

// Portfolio AI Insights and Rebalancing
export const GET_PORTFOLIO_AI_INSIGHTS = gql`
  query GetPortfolioAIInsights(
    $userId: uuid!,
    $portfolioId: uuid,
    $includeRebalancing: Boolean = true,
    $includeRiskAnalysis: Boolean = true
  ) {
    portfolioInsights: ai_portfolio_insights(
      where: {
        user_id: { _eq: $userId },
        portfolio_id: { _eq: $portfolioId },
        status: { _eq: "active" }
      }
      order_by: [
        { priority: asc },
        { confidence: desc }
      ]
    ) {
      id
      portfolio_id
      insight_type
      title
      description
      priority
      confidence
      potential_impact
      data
      created_at
    }
    
    rebalancingSuggestions: ai_rebalancing_suggestions @include(if: $includeRebalancing) (
      where: {
        user_id: { _eq: $userId },
        portfolio_id: { _eq: $portfolioId },
        confidence: { _gte: 0.7 }
      }
      order_by: { priority: asc }
    ) {
      id
      asset_class
      current_allocation
      target_allocation
      suggested_action
      amount
      reasoning
      priority
      confidence
      expected_impact
    }
    
    riskAnalysis: ai_portfolio_risk_analysis @include(if: $includeRiskAnalysis) (
      where: {
        user_id: { _eq: $userId },
        portfolio_id: { _eq: $portfolioId }
      }
      limit: 1
    ) {
      id
      risk_score
      risk_level
      volatility_analysis
      concentration_risk
      correlation_analysis
      recommendations {
        risk_factor
        current_level
        recommended_action
        priority
      }
    }
  }
`;

// Debt Optimization AI
export const GET_DEBT_AI_OPTIMIZATION = gql`
  query GetDebtAIOptimization(
    $userId: uuid!,
    $includeStrategies: Boolean = true,
    $includeConsolidation: Boolean = true
  ) {
    debtOptimization: ai_debt_optimization(
      where: {
        user_id: { _eq: $userId },
        status: { _eq: "active" }
      }
      limit: 1
    ) {
      id
      total_debt
      monthly_payment_capacity
      current_strategy
      optimal_strategy
      potential_savings
      payoff_timeline_months
      confidence
      
      strategies @include(if: $includeStrategies) {
        strategy_type
        monthly_payment
        payoff_months
        total_interest
        potential_savings
        accounts {
          debt_account_id
          account_name
          priority_order
          recommended_payment
          payoff_month
        }
      }
      
      consolidation_opportunities @include(if: $includeConsolidation) {
        opportunity_type
        accounts_to_consolidate
        new_interest_rate
        new_monthly_payment
        potential_savings
        requirements
        confidence
      }
    }
  }
`;

// Investment Performance AI Analysis
export const GET_INVESTMENT_AI_ANALYSIS = gql`
  query GetInvestmentAIAnalysis(
    $userId: uuid!,
    $investmentIds: [uuid!],
    $analysisType: String = "comprehensive"
  ) {
    investmentAnalysis: ai_investment_analysis(
      where: {
        user_id: { _eq: $userId },
        investment_id: { _in: $investmentIds },
        analysis_type: { _eq: $analysisType }
      }
      order_by: { created_at: desc }
    ) {
      id
      investment_id
      investment_symbol
      analysis_type
      performance_score
      risk_score
      recommendation
      confidence
      
      technical_analysis {
        trend_direction
        support_level
        resistance_level
        momentum_score
        volatility_assessment
      }
      
      fundamental_analysis {
        valuation_score
        growth_potential
        financial_health
        market_position
        sector_outlook
      }
      
      recommendations {
        action_type
        reasoning
        target_price
        time_horizon
        confidence
      }
    }
  }
`;

// Market Sentiment and Economic Indicators
export const GET_MARKET_AI_INSIGHTS = gql`
  query GetMarketAIInsights(
    $userId: uuid!,
    $sectors: [String!],
    $timeframe: String = "1M"
  ) {
    marketInsights: ai_market_insights(
      where: {
        user_id: { _eq: $userId },
        sectors: { _overlap: $sectors },
        timeframe: { _eq: $timeframe },
        relevance_score: { _gte: 0.7 }
      }
      order_by: [
        { relevance_score: desc },
        { created_at: desc }
      ]
      limit: 10
    ) {
      id
      insight_type
      sector
      title
      description
      impact_level
      relevance_score
      confidence
      data
      created_at
    }
  }
`;

// Personal Financial Health Score
export const GET_FINANCIAL_HEALTH_SCORE = gql`
  query GetFinancialHealthScore($userId: uuid!) {
    financialHealthScore: ai_financial_health_score(
      where: { user_id: { _eq: $userId } }
      limit: 1
    ) {
      id
      overall_score
      score_trend
      last_updated
      
      category_scores {
        category
        score
        weight
        factors {
          factor_name
          current_value
          target_value
          impact_on_score
        }
      }
      
      recommendations {
        category
        priority
        action
        potential_impact
        estimated_timeframe
      }
      
      benchmark_comparison {
        age_group_average
        income_bracket_average
        percentile_ranking
      }
    }
  }
`;

// AI-Powered Transaction Categorization
export const GET_TRANSACTION_AI_SUGGESTIONS = gql`
  query GetTransactionAISuggestions(
    $userId: uuid!,
    $transactionIds: [uuid!],
    $includeConfidence: Boolean = true
  ) {
    categorizationSuggestions: ai_transaction_categorization(
      where: {
        user_id: { _eq: $userId },
        transaction_id: { _in: $transactionIds },
        confidence: { _gte: 0.8 }
      }
    ) {
      id
      transaction_id
      suggested_category
      suggested_subcategory
      confidence @include(if: $includeConfidence)
      reasoning
      similar_transactions {
        id
        description
        category
        confidence
      }
    }
  }
`;

// Apply Rebalancing Suggestions
export const APPLY_REBALANCING_SUGGESTIONS = gql`
  mutation ApplyRebalancingSuggestions(
    $portfolioId: uuid!,
    $rebalancingActions: [portfolio_rebalancing_input!]!
  ) {
    apply_portfolio_rebalancing(
      args: {
        portfolio_id: $portfolioId,
        rebalancing_actions: $rebalancingActions
      }
    ) {
      success
      affected_allocations
      message
    }
  }
`;

// Apply Debt Optimization Strategy
export const APPLY_DEBT_OPTIMIZATION_STRATEGY = gql`
  mutation ApplyDebtOptimizationStrategy(
    $userId: uuid!,
    $strategyType: String!,
    $paymentAllocations: [debt_payment_allocation_input!]!
  ) {
    apply_debt_optimization_strategy(
      args: {
        user_id: $userId,
        strategy_type: $strategyType,
        payment_allocations: $paymentAllocations
      }
    ) {
      success
      strategy_id
      message
      estimated_savings
      payoff_timeline_months
    }
  }
`;