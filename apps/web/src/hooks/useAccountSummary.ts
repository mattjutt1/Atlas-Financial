import { useMemo } from 'react'
import { Account } from '@/types/graphql'

interface UseAccountSummaryProps {
  accounts: Account[]
}

export function useAccountSummary({ accounts }: UseAccountSummaryProps) {
  return useMemo(() => {
    const totalBalance = accounts
      .filter(account => account.account_type?.type && !account.account_type.type.toLowerCase().includes('liability'))
      .reduce((sum, account) => sum + (account.virtual_balance || 0), 0)
      
    const totalDebt = Math.abs(accounts
      .filter(account => account.account_type?.type && account.account_type.type.toLowerCase().includes('liability'))
      .reduce((sum, account) => sum + (account.virtual_balance || 0), 0))

    const netWorth = totalBalance - totalDebt

    const accountsByType = accounts.reduce((acc, account) => {
      if (account.account_type?.type) {
        acc[account.account_type.type] = (acc[account.account_type.type] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    return {
      totalBalance,
      totalDebt,
      netWorth,
      accountsByType,
      totalAccounts: accounts.length
    }
  }, [accounts])
}