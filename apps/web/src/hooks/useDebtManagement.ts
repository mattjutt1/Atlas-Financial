import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useApolloClient } from '@apollo/client'
import { useAuthentication } from './useAuthentication'
import {
  GET_USER_DEBT_ACCOUNTS,
  GET_DEBT_STATISTICS,
  GET_DEBT_UTILIZATION,
  COMPARE_DEBT_STRATEGIES,
  GET_CONSOLIDATION_OPPORTUNITIES,
  GET_NEGOTIATION_OPPORTUNITIES,
  GET_DEBT_PAYOFF_PROJECTION,
  GET_DEBT_MILESTONES,
} from '../lib/graphql/debt-queries'
import {
  CREATE_DEBT_ACCOUNT,
  UPDATE_DEBT_ACCOUNT,
  DELETE_DEBT_ACCOUNT,
  RECORD_DEBT_PAYMENT,
  ACTIVATE_DEBT_STRATEGY,
  OPTIMIZE_PAYMENT_ALLOCATION,
  CREATE_DEBT_MILESTONE,
  COMPLETE_DEBT_MILESTONE,
} from '../lib/graphql/debt-mutations'

export interface DebtAccount {
  id: string
  userId: string
  name: string
  debtType: DebtType
  balance: Money
  interestRate: Rate
  minimumPayment: Money
  dueDate?: string
  creditLimit?: Money
  lastPaymentDate?: string
  lastPaymentAmount?: Money
  createdAt: string
  updatedAt: string
}

export interface Money {
  amount: number
  currency: string
}

export interface Rate {
  percentage: { value: number }
  period: string
}

export enum DebtType {
  CREDIT_CARD = 'CREDIT_CARD',
  STUDENT_LOAN = 'STUDENT_LOAN',
  MORTGAGE = 'MORTGAGE',
  PERSONAL_LOAN = 'PERSONAL_LOAN',
  AUTO_LOAN = 'AUTO_LOAN',
  HOME_EQUITY_LOAN = 'HOME_EQUITY_LOAN',
  MEDICAL_DEBT = 'MEDICAL_DEBT',
  OTHER = 'OTHER',
}

export enum DebtStrategy {
  SNOWBALL = 'SNOWBALL',
  AVALANCHE = 'AVALANCHE',
  CUSTOM = 'CUSTOM',
  CONSOLIDATION = 'CONSOLIDATION',
}

export interface DebtStatistics {
  totalBalance: Money
  totalMinimumPayments: Money
  averageInterestRate: { value: number }
  highestInterestRate: { value: number }
  lowestInterestRate: { value: number }
  debtAccountCount: number
  debtToIncomeRatio?: { value: number }
  timeToPayoffMinimumMonths: number
  totalInterestMinimum: Money
}

export interface DebtUtilization {
  creditUtilization: { value: number }
  availableCredit: Money
  totalCreditLimits: Money
  usedCredit: Money
  accountsAtMaxUtilization: number
}

export interface DebtOptimizationResult {
  strategy: DebtStrategy
  totalMonthlyPayment: Money
  totalInterestPaid: Money
  totalTimeToPayoffMonths: number
  finalPayoffDate: string
  interestSavingsVsMinimum: Money
  timeSavingsVsMinimumMonths: number
  paymentPlans: PaymentPlan[]
  generatedAt: string
}

export interface PaymentPlan {
  debtId: string
  debtName: string
  strategy: DebtStrategy
  monthlyPayment: Money
  totalPayments: Money
  totalInterest: Money
  payoffDate: string
  createdAt: string
}

export interface DebtComparison {
  recommendedStrategy: DebtStrategy
  recommendationReason: string
  snowballResult: DebtOptimizationResult
  avalancheResult: DebtOptimizationResult
  minimumOnlyResult: DebtOptimizationResult
  psychologicalFactors: PsychologicalFactors
}

export interface PsychologicalFactors {
  motivationScoreSnowball: number
  motivationScoreAvalanche: number
  quickWinsImportance: number
  mathematicalOptimality: number
  estimatedSuccessProbability: { value: number }
}

export interface ConsolidationOpportunity {
  consolidationType: string
  consolidatedBalance: Money
  newInterestRate: Rate
  newMonthlyPayment: Money
  totalInterestSavings: Money
  timeSavingsMonths: number
  eligibilityRequirements: string[]
  prosAndCons: {
    advantages: string[]
    disadvantages: string[]
    riskAssessment: string
    recommendationScore: number
  }
}

export interface DebtMilestone {
  id: string
  userId: string
  milestoneType: string
  targetAmount: Money
  currentAmount: Money
  targetDate: string
  isCompleted: boolean
  completedDate?: string
  celebrationMessage?: string
  motivationalQuote?: string
  nextMilestone?: {
    milestoneType: string
    targetAmount: Money
    targetDate: string
  }
}

export interface PaymentAllocation {
  debtId: string
  debtName: string
  allocatedAmount: Money
  paymentType: string
  priority: number
  expectedImpact: {
    interestSavings: Money
    timeSavings: number
    balanceReduction: Money
  }
}

export const useDebtManagement = () => {
  const { user } = useAuthentication()
  const client = useApolloClient()
  const [selectedStrategy, setSelectedStrategy] = useState<DebtStrategy>(DebtStrategy.AVALANCHE)
  const [extraPayment, setExtraPayment] = useState<Money>({ amount: 0, currency: 'USD' })
  const [optimizationResults, setOptimizationResults] = useState<DebtOptimizationResult | null>(null)

  // Queries
  const {
    data: debtAccountsData,
    loading: debtAccountsLoading,
    error: debtAccountsError,
    refetch: refetchDebtAccounts,
  } = useQuery(GET_USER_DEBT_ACCOUNTS, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: 'cache-and-network',
  })

  const {
    data: debtStatsData,
    loading: debtStatsLoading,
    refetch: refetchDebtStats,
  } = useQuery(GET_DEBT_STATISTICS, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: 'cache-and-network',
  })

  const {
    data: debtUtilizationData,
    loading: debtUtilizationLoading,
    refetch: refetchDebtUtilization,
  } = useQuery(GET_DEBT_UTILIZATION, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: 'cache-and-network',
  })

  const {
    data: milestonesData,
    loading: milestonesLoading,
    refetch: refetchMilestones,
  } = useQuery(GET_DEBT_MILESTONES, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: 'cache-and-network',
  })

  // Strategy Comparison Query
  const {
    data: strategyComparisonData,
    loading: strategyComparisonLoading,
    refetch: refetchStrategyComparison,
  } = useQuery(COMPARE_DEBT_STRATEGIES, {
    variables: {
      debtIds: debtAccountsData?.debtAccounts?.map((debt: DebtAccount) => debt.id) || [],
      extraPayment: extraPayment.amount > 0 ? extraPayment : null,
    },
    skip: !debtAccountsData?.debtAccounts?.length,
    fetchPolicy: 'cache-and-network',
  })

  // Consolidation Opportunities Query
  const {
    data: consolidationData,
    loading: consolidationLoading,
    refetch: refetchConsolidation,
  } = useQuery(GET_CONSOLIDATION_OPPORTUNITIES, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: 'cache-and-network',
  })

  // Mutations
  const [createDebtAccount] = useMutation(CREATE_DEBT_ACCOUNT, {
    refetchQueries: [
      { query: GET_USER_DEBT_ACCOUNTS, variables: { userId: user?.id } },
      { query: GET_DEBT_STATISTICS, variables: { userId: user?.id } },
    ],
  })

  const [updateDebtAccount] = useMutation(UPDATE_DEBT_ACCOUNT, {
    refetchQueries: [
      { query: GET_USER_DEBT_ACCOUNTS, variables: { userId: user?.id } },
      { query: GET_DEBT_STATISTICS, variables: { userId: user?.id } },
    ],
  })

  const [deleteDebtAccount] = useMutation(DELETE_DEBT_ACCOUNT, {
    refetchQueries: [
      { query: GET_USER_DEBT_ACCOUNTS, variables: { userId: user?.id } },
      { query: GET_DEBT_STATISTICS, variables: { userId: user?.id } },
    ],
  })

  const [recordDebtPayment] = useMutation(RECORD_DEBT_PAYMENT, {
    refetchQueries: [
      { query: GET_USER_DEBT_ACCOUNTS, variables: { userId: user?.id } },
      { query: GET_DEBT_STATISTICS, variables: { userId: user?.id } },
    ],
  })

  const [activateDebtStrategy] = useMutation(ACTIVATE_DEBT_STRATEGY, {
    onCompleted: (data) => {
      setOptimizationResults(data.activateDebtStrategy)
    },
  })

  const [optimizePaymentAllocation] = useMutation(OPTIMIZE_PAYMENT_ALLOCATION)

  const [createDebtMilestone] = useMutation(CREATE_DEBT_MILESTONE, {
    refetchQueries: [
      { query: GET_DEBT_MILESTONES, variables: { userId: user?.id } },
    ],
  })

  const [completeDebtMilestone] = useMutation(COMPLETE_DEBT_MILESTONE, {
    refetchQueries: [
      { query: GET_DEBT_MILESTONES, variables: { userId: user?.id } },
    ],
  })

  // Computed values
  const debtAccounts = useMemo(() => debtAccountsData?.debtAccounts || [], [debtAccountsData])
  const debtStatistics = useMemo(() => debtStatsData?.debtStatistics, [debtStatsData])
  const debtUtilization = useMemo(() => debtUtilizationData?.debtUtilization, [debtUtilizationData])
  const strategyComparison = useMemo(() => strategyComparisonData?.compareDebtStrategies, [strategyComparisonData])
  const consolidationOpportunities = useMemo(() => consolidationData?.consolidationOpportunities || [], [consolidationData])
  const milestones = useMemo(() => milestonesData?.debtMilestones || [], [milestonesData])

  // Helper functions
  const calculateTotalDebt = useCallback(() => {
    return debtAccounts.reduce((total, debt) => total + debt.balance.amount, 0)
  }, [debtAccounts])

  const calculateMonthlyMinimums = useCallback(() => {
    return debtAccounts.reduce((total, debt) => total + debt.minimumPayment.amount, 0)
  }, [debtAccounts])

  const calculateAverageInterestRate = useCallback(() => {
    if (debtAccounts.length === 0) return 0
    const weightedSum = debtAccounts.reduce(
      (sum, debt) => sum + (debt.interestRate.percentage.value * debt.balance.amount),
      0
    )
    const totalBalance = calculateTotalDebt()
    return totalBalance > 0 ? weightedSum / totalBalance : 0
  }, [debtAccounts, calculateTotalDebt])

  const getHighestInterestDebt = useCallback(() => {
    return debtAccounts.reduce((highest, current) =>
      current.interestRate.percentage.value > (highest?.interestRate.percentage.value || 0)
        ? current
        : highest
    , null as DebtAccount | null)
  }, [debtAccounts])

  const getLowestBalanceDebt = useCallback(() => {
    return debtAccounts.reduce((lowest, current) =>
      current.balance.amount < (lowest?.balance.amount || Infinity)
        ? current
        : lowest
    , null as DebtAccount | null)
  }, [debtAccounts])

  const calculateDebtToIncomeRatio = useCallback((monthlyIncome: number) => {
    if (monthlyIncome <= 0) return null
    const monthlyDebtPayments = calculateMonthlyMinimums()
    return (monthlyDebtPayments / monthlyIncome) * 100
  }, [calculateMonthlyMinimums])

  const getCreditUtilizationByCard = useCallback(() => {
    return debtAccounts
      .filter(debt => debt.debtType === DebtType.CREDIT_CARD && debt.creditLimit)
      .map(debt => ({
        id: debt.id,
        name: debt.name,
        utilization: debt.creditLimit
          ? (debt.balance.amount / debt.creditLimit.amount) * 100
          : 0,
        balance: debt.balance.amount,
        limit: debt.creditLimit?.amount || 0,
      }))
  }, [debtAccounts])

  const getDebtsByType = useCallback(() => {
    const debtsByType = debtAccounts.reduce((acc, debt) => {
      if (!acc[debt.debtType]) {
        acc[debt.debtType] = {
          type: debt.debtType,
          debts: [],
          totalBalance: 0,
          totalMinimumPayment: 0,
          count: 0,
        }
      }
      acc[debt.debtType].debts.push(debt)
      acc[debt.debtType].totalBalance += debt.balance.amount
      acc[debt.debtType].totalMinimumPayment += debt.minimumPayment.amount
      acc[debt.debtType].count += 1
      return acc
    }, {} as any)

    return Object.values(debtsByType)
  }, [debtAccounts])

  const prioritizeDebts = useCallback((strategy: DebtStrategy) => {
    const sortedDebts = [...debtAccounts]

    switch (strategy) {
      case DebtStrategy.AVALANCHE:
        return sortedDebts.sort((a, b) =>
          b.interestRate.percentage.value - a.interestRate.percentage.value
        )
      case DebtStrategy.SNOWBALL:
        return sortedDebts.sort((a, b) =>
          a.balance.amount - b.balance.amount
        )
      default:
        return sortedDebts
    }
  }, [debtAccounts])

  const calculatePayoffProgress = useCallback(() => {
    const completedMilestones = milestones.filter(m => m.isCompleted).length
    const totalMilestones = milestones.length
    return totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0
  }, [milestones])

  // Action handlers
  const handleAddDebtAccount = useCallback(async (input: any) => {
    try {
      await createDebtAccount({ variables: { input } })
      return { success: true }
    } catch (error) {
      console.error('Error creating debt account:', error)
      return { success: false, error }
    }
  }, [createDebtAccount])

  const handleUpdateDebtAccount = useCallback(async (input: any) => {
    try {
      await updateDebtAccount({ variables: { input } })
      return { success: true }
    } catch (error) {
      console.error('Error updating debt account:', error)
      return { success: false, error }
    }
  }, [updateDebtAccount])

  const handleDeleteDebtAccount = useCallback(async (id: string) => {
    try {
      await deleteDebtAccount({ variables: { id } })
      return { success: true }
    } catch (error) {
      console.error('Error deleting debt account:', error)
      return { success: false, error }
    }
  }, [deleteDebtAccount])

  const handleRecordPayment = useCallback(async (input: any) => {
    try {
      await recordDebtPayment({ variables: { input } })
      return { success: true }
    } catch (error) {
      console.error('Error recording payment:', error)
      return { success: false, error }
    }
  }, [recordDebtPayment])

  const handleActivateStrategy = useCallback(async (strategy: DebtStrategy, extraPayment?: Money) => {
    try {
      const debtIds = debtAccounts.map(debt => debt.id)
      await activateDebtStrategy({
        variables: {
          input: {
            debtIds,
            strategy,
            extraPayment,
          }
        }
      })
      setSelectedStrategy(strategy)
      return { success: true }
    } catch (error) {
      console.error('Error activating strategy:', error)
      return { success: false, error }
    }
  }, [activateDebtStrategy, debtAccounts])

  const handleOptimizePayments = useCallback(async (totalPayment: Money) => {
    try {
      const debtIds = debtAccounts.map(debt => debt.id)
      const result = await optimizePaymentAllocation({
        variables: {
          input: {
            debtIds,
            totalPayment,
            strategy: selectedStrategy,
          }
        }
      })
      return { success: true, data: result.data?.optimizePaymentAllocation }
    } catch (error) {
      console.error('Error optimizing payments:', error)
      return { success: false, error }
    }
  }, [optimizePaymentAllocation, debtAccounts, selectedStrategy])

  const handleCreateMilestone = useCallback(async (input: any) => {
    try {
      await createDebtMilestone({ variables: { input } })
      return { success: true }
    } catch (error) {
      console.error('Error creating milestone:', error)
      return { success: false, error }
    }
  }, [createDebtMilestone])

  const handleCompleteMilestone = useCallback(async (milestoneId: string) => {
    try {
      const result = await completeDebtMilestone({ variables: { milestoneId } })
      return { success: true, data: result.data?.completeDebtMilestone }
    } catch (error) {
      console.error('Error completing milestone:', error)
      return { success: false, error }
    }
  }, [completeDebtMilestone])

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refetchDebtAccounts(),
      refetchDebtStats(),
      refetchDebtUtilization(),
      refetchStrategyComparison(),
      refetchConsolidation(),
      refetchMilestones(),
    ])
  }, [
    refetchDebtAccounts,
    refetchDebtStats,
    refetchDebtUtilization,
    refetchStrategyComparison,
    refetchConsolidation,
    refetchMilestones,
  ])

  return {
    // Data
    debtAccounts,
    debtStatistics,
    debtUtilization,
    strategyComparison,
    consolidationOpportunities,
    milestones,
    optimizationResults,

    // Loading states
    loading: debtAccountsLoading || debtStatsLoading || debtUtilizationLoading,
    strategyComparisonLoading,
    consolidationLoading,
    milestonesLoading,

    // Errors
    error: debtAccountsError,

    // State
    selectedStrategy,
    setSelectedStrategy,
    extraPayment,
    setExtraPayment,

    // Helper functions
    calculateTotalDebt,
    calculateMonthlyMinimums,
    calculateAverageInterestRate,
    getHighestInterestDebt,
    getLowestBalanceDebt,
    calculateDebtToIncomeRatio,
    getCreditUtilizationByCard,
    getDebtsByType,
    prioritizeDebts,
    calculatePayoffProgress,

    // Actions
    handleAddDebtAccount,
    handleUpdateDebtAccount,
    handleDeleteDebtAccount,
    handleRecordPayment,
    handleActivateStrategy,
    handleOptimizePayments,
    handleCreateMilestone,
    handleCompleteMilestone,
    refreshAllData,
  }
}

export default useDebtManagement
