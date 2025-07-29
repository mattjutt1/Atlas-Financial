import { gql } from '@apollo/client'

// Debt Account Fragments
export const DEBT_ACCOUNT_FIELDS = gql`
  fragment DebtAccountFields on DebtAccount {
    id
    userId
    name
    debtType
    balance {
      amount
      currency
    }
    interestRate {
      percentage {
        value
      }
      period
    }
    minimumPayment {
      amount
      currency
    }
    dueDate
    creditLimit {
      amount
      currency
    }
    lastPaymentDate
    lastPaymentAmount {
      amount
      currency
    }
    createdAt
    updatedAt
  }
`

export const PAYMENT_PLAN_FIELDS = gql`
  fragment PaymentPlanFields on PaymentPlan {
    debtId
    debtName
    strategy
    monthlyPayment {
      amount
      currency
    }
    totalPayments {
      amount
      currency
    }
    totalInterest {
      amount
      currency
    }
    payoffDate
    createdAt
  }
`

export const PAYMENT_SCHEDULE_ITEM_FIELDS = gql`
  fragment PaymentScheduleItemFields on PaymentScheduleItem {
    paymentNumber
    paymentDate
    paymentAmount {
      amount
      currency
    }
    principal {
      amount
      currency
    }
    interest {
      amount
      currency
    }
    remainingBalance {
      amount
      currency
    }
  }
`

export const DEBT_OPTIMIZATION_RESULT_FIELDS = gql`
  fragment DebtOptimizationResultFields on DebtOptimizationResult {
    strategy
    totalMonthlyPayment {
      amount
      currency
    }
    totalInterestPaid {
      amount
      currency
    }
    totalTimeToPayoffMonths
    finalPayoffDate
    interestSavingsVsMinimum {
      amount
      currency
    }
    timeSavingsVsMinimumMonths
    generatedAt
    paymentPlans {
      ...PaymentPlanFields
    }
  }
  ${PAYMENT_PLAN_FIELDS}
`

export const DEBT_COMPARISON_FIELDS = gql`
  fragment DebtComparisonFields on DebtComparison {
    recommendedStrategy
    recommendationReason
    snowballResult {
      ...DebtOptimizationResultFields
    }
    avalancheResult {
      ...DebtOptimizationResultFields
    }
    minimumOnlyResult {
      ...DebtOptimizationResultFields
    }
    psychologicalFactors {
      motivationScoreSnowball
      motivationScoreAvalanche
      quickWinsImportance
      mathematicalOptimality
      estimatedSuccessProbability {
        value
      }
    }
  }
  ${DEBT_OPTIMIZATION_RESULT_FIELDS}
`

export const CONSOLIDATION_OPPORTUNITY_FIELDS = gql`
  fragment ConsolidationOpportunityFields on ConsolidationOpportunity {
    consolidationType
    consolidatedBalance {
      amount
      currency
    }
    newInterestRate {
      percentage {
        value
      }
      period
    }
    newMonthlyPayment {
      amount
      currency
    }
    totalInterestSavings {
      amount
      currency
    }
    timeSavingsMonths
    eligibilityRequirements
    prosAndCons {
      advantages
      disadvantages
      riskAssessment
      recommendationScore
    }
  }
`

// Debt Queries
export const GET_USER_DEBT_ACCOUNTS = gql`
  query GetUserDebtAccounts($userId: ID!) {
    debtAccounts(filter: { userId: $userId }) {
      ...DebtAccountFields
    }
  }
  ${DEBT_ACCOUNT_FIELDS}
`

export const GET_DEBT_ACCOUNT_DETAILS = gql`
  query GetDebtAccountDetails($debtId: ID!) {
    debtAccount(id: $debtId) {
      ...DebtAccountFields
    }
  }
  ${DEBT_ACCOUNT_FIELDS}
`

export const GET_DEBT_STATISTICS = gql`
  query GetDebtStatistics($userId: ID!) {
    debtStatistics(userId: $userId) {
      totalBalance {
        amount
        currency
      }
      totalMinimumPayments {
        amount
        currency
      }
      averageInterestRate {
        value
      }
      highestInterestRate {
        value
      }
      lowestInterestRate {
        value
      }
      debtAccountCount
      debtToIncomeRatio {
        value
      }
      timeToPayoffMinimumMonths
      totalInterestMinimum {
        amount
        currency
      }
    }
  }
`

export const GET_DEBT_UTILIZATION = gql`
  query GetDebtUtilization($userId: ID!) {
    debtUtilization(userId: $userId) {
      creditUtilization {
        value
      }
      availableCredit {
        amount
        currency
      }
      totalCreditLimits {
        amount
        currency
      }
      usedCredit {
        amount
        currency
      }
      accountsAtMaxUtilization
    }
  }
`

export const OPTIMIZE_DEBT_PAYMENTS = gql`
  query OptimizeDebtPayments($input: OptimizeDebtInput!) {
    optimizeDebtPayments(input: $input) {
      ...DebtOptimizationResultFields
    }
  }
  ${DEBT_OPTIMIZATION_RESULT_FIELDS}
`

export const COMPARE_DEBT_STRATEGIES = gql`
  query CompareDebtStrategies($debtIds: [ID!]!, $extraPayment: MoneyInput) {
    compareDebtStrategies(debtIds: $debtIds, extraPayment: $extraPayment) {
      ...DebtComparisonFields
    }
  }
  ${DEBT_COMPARISON_FIELDS}
`

export const GET_CONSOLIDATION_OPPORTUNITIES = gql`
  query GetConsolidationOpportunities($userId: ID!) {
    consolidationOpportunities(userId: $userId) {
      ...ConsolidationOpportunityFields
    }
  }
  ${CONSOLIDATION_OPPORTUNITY_FIELDS}
`

export const GET_PAYMENT_PLAN = gql`
  query GetPaymentPlan($input: CreatePaymentPlanInput!) {
    createPaymentPlan(input: $input) {
      ...PaymentPlanFields
      paymentSchedule {
        ...PaymentScheduleItemFields
      }
    }
  }
  ${PAYMENT_PLAN_FIELDS}
  ${PAYMENT_SCHEDULE_ITEM_FIELDS}
`

export const GET_NEGOTIATION_OPPORTUNITIES = gql`
  query GetNegotiationOpportunities($userId: ID!) {
    negotiationOpportunities(userId: $userId) {
      debtId
      debtName
      currentBalance {
        amount
        currency
      }
      negotiationType
      potentialSavings {
        amount
        currency
      }
      successProbability {
        value
      }
      negotiationStrategy
      talkingPoints
      requiredPreparation
    }
  }
`

// Debt Analytics Queries
export const GET_DEBT_PAYOFF_PROJECTION = gql`
  query GetDebtPayoffProjection(
    $userId: ID!
    $strategy: DebtStrategy!
    $extraPayment: MoneyInput
    $months: Int = 60
  ) {
    debtPayoffProjection(
      userId: $userId
      strategy: $strategy
      extraPayment: $extraPayment
      months: $months
    ) {
      month
      totalBalance {
        amount
        currency
      }
      monthlyPayment {
        amount
        currency
      }
      interestPaid {
        amount
        currency
      }
      principalPaid {
        amount
        currency
      }
      remainingDebts
      debtsCompleted
    }
  }
`

export const GET_DEBT_ANALYTICS = gql`
  query GetDebtAnalytics($userId: ID!, $dateRange: DateRangeInput) {
    debtAnalytics(userId: $userId, dateRange: $dateRange) {
      totalBalance {
        amount
        currency
      }
      monthlyProgress {
        month
        totalBalance {
          amount
          currency
        }
        paymentsMade {
          amount
          currency
        }
        interestPaid {
          amount
          currency
        }
        principalPaid {
          amount
          currency
        }
      }
      categoryBreakdown {
        debtType
        balance {
          amount
          currency
        }
        percentage
      }
      interestRateDistribution {
        rate {
          value
        }
        balance {
          amount
          currency
        }
        accountCount
      }
    }
  }
`

// Debt Achievement Tracking
export const GET_DEBT_MILESTONES = gql`
  query GetDebtMilestones($userId: ID!) {
    debtMilestones(userId: $userId) {
      id
      userId
      milestoneType
      targetAmount {
        amount
        currency
      }
      currentAmount {
        amount
        currency
      }
      targetDate
      isCompleted
      completedDate
      celebrationMessage
      motivationalQuote
      nextMilestone {
        milestoneType
        targetAmount {
          amount
          currency
        }
        targetDate
      }
    }
  }
`
