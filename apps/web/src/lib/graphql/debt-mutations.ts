import { gql } from '@apollo/client'
import {
  DEBT_ACCOUNT_FIELDS,
  PAYMENT_PLAN_FIELDS,
  DEBT_OPTIMIZATION_RESULT_FIELDS
} from './debt-queries'

// Debt Account Mutations
export const CREATE_DEBT_ACCOUNT = gql`
  mutation CreateDebtAccount($input: CreateDebtAccountInput!) {
    createDebtAccount(input: $input) {
      ...DebtAccountFields
    }
  }
  ${DEBT_ACCOUNT_FIELDS}
`

export const UPDATE_DEBT_ACCOUNT = gql`
  mutation UpdateDebtAccount($input: UpdateDebtAccountInput!) {
    updateDebtAccount(input: $input) {
      ...DebtAccountFields
    }
  }
  ${DEBT_ACCOUNT_FIELDS}
`

export const DELETE_DEBT_ACCOUNT = gql`
  mutation DeleteDebtAccount($id: ID!) {
    deleteDebtAccount(id: $id) {
      success
      message
    }
  }
`

// Payment Recording Mutations
export const RECORD_DEBT_PAYMENT = gql`
  mutation RecordDebtPayment($input: RecordDebtPaymentInput!) {
    recordDebtPayment(input: $input) {
      id
      debtId
      amount {
        amount
        currency
      }
      paymentDate
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
      paymentMethod
      notes
      createdAt
    }
  }
`

export const BULK_RECORD_PAYMENTS = gql`
  mutation BulkRecordPayments($payments: [RecordDebtPaymentInput!]!) {
    bulkRecordPayments(payments: $payments) {
      successCount
      failureCount
      errors
      processedPayments {
        id
        debtId
        amount {
          amount
          currency
        }
        paymentDate
      }
    }
  }
`

// Payment Plan Mutations
export const CREATE_PAYMENT_PLAN = gql`
  mutation CreatePaymentPlan($input: CreatePaymentPlanInput!) {
    createPaymentPlan(input: $input) {
      ...PaymentPlanFields
    }
  }
  ${PAYMENT_PLAN_FIELDS}
`

export const UPDATE_PAYMENT_PLAN = gql`
  mutation UpdatePaymentPlan($input: UpdatePaymentPlanInput!) {
    updatePaymentPlan(input: $input) {
      ...PaymentPlanFields
    }
  }
  ${PAYMENT_PLAN_FIELDS}
`

export const ACTIVATE_DEBT_STRATEGY = gql`
  mutation ActivateDebtStrategy($input: ActivateDebtStrategyInput!) {
    activateDebtStrategy(input: $input) {
      ...DebtOptimizationResultFields
    }
  }
  ${DEBT_OPTIMIZATION_RESULT_FIELDS}
`

// Debt Optimization Mutations
export const OPTIMIZE_PAYMENT_ALLOCATION = gql`
  mutation OptimizePaymentAllocation($input: OptimizePaymentAllocationInput!) {
    optimizePaymentAllocation(input: $input) {
      totalPayment {
        amount
        currency
      }
      allocations {
        debtId
        debtName
        allocatedAmount {
          amount
          currency
        }
        paymentType
        priority
        expectedImpact {
          interestSavings {
            amount
            currency
          }
          timeSavings
          balanceReduction {
            amount
            currency
          }
        }
      }
      optimizationScore
      recommendations
    }
  }
`

// Debt Goals and Milestones
export const CREATE_DEBT_MILESTONE = gql`
  mutation CreateDebtMilestone($input: CreateDebtMilestoneInput!) {
    createDebtMilestone(input: $input) {
      id
      userId
      milestoneType
      targetAmount {
        amount
        currency
      }
      targetDate
      description
      motivationalMessage
      isCompleted
      createdAt
    }
  }
`

export const COMPLETE_DEBT_MILESTONE = gql`
  mutation CompleteDebtMilestone($milestoneId: ID!) {
    completeDebtMilestone(milestoneId: $milestoneId) {
      id
      isCompleted
      completedDate
      celebrationMessage
      achievementBadge
      nextSuggestedMilestone {
        milestoneType
        targetAmount {
          amount
          currency
        }
        targetDate
        description
      }
    }
  }
`

// Debt Management Settings
export const UPDATE_DEBT_PREFERENCES = gql`
  mutation UpdateDebtPreferences($input: UpdateDebtPreferencesInput!) {
    updateDebtPreferences(input: $input) {
      id
      userId
      preferredStrategy
      riskTolerance
      psychologicalProfile {
        motivationStyle
        quickWinsImportance
        mathematicalOptimalityPreference
        gamificationPreference
      }
      notifications {
        paymentReminders
        milestoneAlerts
        strategyRecommendations
        consolidationOpportunities
      }
      updatedAt
    }
  }
`

// Consolidation Actions
export const INITIATE_CONSOLIDATION_ANALYSIS = gql`
  mutation InitiateConsolidationAnalysis($input: ConsolidationAnalysisInput!) {
    initiateConsolidationAnalysis(input: $input) {
      analysisId
      status
      estimatedCompletionTime
      opportunities {
        consolidationType
        estimatedSavings {
          amount
          currency
        }
        feasibilityScore
      }
    }
  }
`

export const APPLY_FOR_CONSOLIDATION = gql`
  mutation ApplyForConsolidation($input: ConsolidationApplicationInput!) {
    applyForConsolidation(input: $input) {
      applicationId
      status
      consolidationType
      requestedAmount {
        amount
        currency
      }
      estimatedRate {
        percentage {
          value
        }
        period
      }
      nextSteps
      requiredDocuments
      estimatedProcessingTime
    }
  }
`

// Negotiation Support
export const INITIATE_DEBT_NEGOTIATION = gql`
  mutation InitiateDebtNegotiation($input: DebtNegotiationInput!) {
    initiateDebtNegotiation(input: $input) {
      negotiationId
      debtId
      negotiationType
      currentBalance {
        amount
        currency
      }
      targetOutcome {
        newBalance {
          amount
          currency
        }
        newInterestRate {
          percentage {
            value
          }
          period
        }
        newPaymentPlan {
          monthlyAmount {
            amount
            currency
          }
          termMonths
        }
      }
      strategyGuide {
        preparation
        talkingPoints
        negotiationTactics
        fallbackOptions
      }
      supportResources
    }
  }
`

export const RECORD_NEGOTIATION_OUTCOME = gql`
  mutation RecordNegotiationOutcome($input: NegotiationOutcomeInput!) {
    recordNegotiationOutcome(input: $input) {
      negotiationId
      outcome
      actualSavings {
        amount
        currency
      }
      newTerms {
        interestRate {
          percentage {
            value
          }
          period
        }
        monthlyPayment {
          amount
          currency
        }
        payoffDate
      }
      lessonsLearned
      recommendedNextActions
    }
  }
`

// Automated Payment Setup
export const SETUP_AUTOMATED_PAYMENTS = gql`
  mutation SetupAutomatedPayments($input: AutomatedPaymentSetupInput!) {
    setupAutomatedPayments(input: $input) {
      automationId
      debtId
      frequency
      amount {
        amount
        currency
      }
      startDate
      endDate
      paymentSource
      status
      nextPaymentDate
      safeguards {
        lowBalanceThreshold {
          amount
          currency
        }
        maximumMonthlyAmount {
          amount
          currency
        }
        emergencyStopConditions
      }
    }
  }
`

export const UPDATE_AUTOMATED_PAYMENT = gql`
  mutation UpdateAutomatedPayment($input: UpdateAutomatedPaymentInput!) {
    updateAutomatedPayment(input: $input) {
      automationId
      status
      amount {
        amount
        currency
      }
      frequency
      nextPaymentDate
      updatedAt
    }
  }
`

export const CANCEL_AUTOMATED_PAYMENT = gql`
  mutation CancelAutomatedPayment($automationId: ID!) {
    cancelAutomatedPayment(automationId: $automationId) {
      success
      message
      finalPaymentDate
      totalPaymentsMade
      totalAmountPaid {
        amount
        currency
      }
    }
  }
`

// Debt Education and Insights
export const TRACK_DEBT_EDUCATION_PROGRESS = gql`
  mutation TrackDebtEducationProgress($input: EducationProgressInput!) {
    trackDebtEducationProgress(input: $input) {
      userId
      completedModules
      currentModule
      overallProgress
      achievedBadges
      nextRecommendedModule
      estimatedCompletionTime
    }
  }
`

export const REQUEST_PERSONALIZED_ADVICE = gql`
  mutation RequestPersonalizedAdvice($input: PersonalizedAdviceInput!) {
    requestPersonalizedAdvice(input: $input) {
      adviceId
      category
      priority
      advice
      actionableSteps
      estimatedImpact {
        interestSavings {
          amount
          currency
        }
        timeSavings
        riskReduction
      }
      followUpDate
      relatedResources
    }
  }
`
