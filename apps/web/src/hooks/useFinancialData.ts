import { useQuery } from '@apollo/client'
import { GET_USER_ACCOUNTS, GET_TRANSACTIONS } from '@/lib/graphql/queries'
import { useAuthentication } from './useAuthentication'

export function useFinancialData() {
  const { user, isAuthenticated } = useAuthentication()
  const userId = (user as any)?.id

  const {
    data: accountsData,
    loading: accountsLoading,
    error: accountsError
  } = useQuery(GET_USER_ACCOUNTS, {
    variables: { userId },
    skip: !isAuthenticated || !userId
  })

  const {
    data: transactionsData,
    loading: transactionsLoading,
    error: transactionsError
  } = useQuery(GET_TRANSACTIONS, {
    variables: { userId, limit: 50 },
    skip: !isAuthenticated || !userId
  })

  // TODO: Add insights query when financial_insights table is available
  const insightsData = null
  const insightsLoading = false
  const insightsError = null

  return {
    accounts: accountsData?.accounts || [],
    transactions: transactionsData?.transactions || [],
    insights: [], // Empty for now until insights table is available
    loading: accountsLoading || transactionsLoading,
    error: accountsError || transactionsError
  }
}
