'use client'

import React, { useState } from 'react'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'
import { DebtAccount, DebtStrategy, DebtType } from '../../hooks/useDebtManagement'

interface DebtCardProps {
  debt: DebtAccount
  onSelect?: () => void
  isSelected?: boolean
  showPriority?: boolean
  strategy?: DebtStrategy
  className?: string
}

const DebtCard: React.FC<DebtCardProps> = ({
  debt,
  onSelect,
  isSelected = false,
  showPriority = false,
  strategy,
  className = '',
}) => {
  const [showDetails, setShowDetails] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getDebtTypeInfo = (type: DebtType) => {
    const typeMap = {
      [DebtType.CREDIT_CARD]: {
        label: 'Credit Card',
        icon: '💳',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        textColor: 'text-red-700 dark:text-red-300',
      },
      [DebtType.STUDENT_LOAN]: {
        label: 'Student Loan',
        icon: '🎓',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        textColor: 'text-blue-700 dark:text-blue-300',
      },
      [DebtType.MORTGAGE]: {
        label: 'Mortgage',
        icon: '🏠',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        textColor: 'text-green-700 dark:text-green-300',
      },
      [DebtType.AUTO_LOAN]: {
        label: 'Auto Loan',
        icon: '🚗',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800',
        textColor: 'text-purple-700 dark:text-purple-300',
      },
      [DebtType.PERSONAL_LOAN]: {
        label: 'Personal Loan',
        icon: '💰',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        textColor: 'text-yellow-700 dark:text-yellow-300',
      },
      [DebtType.HOME_EQUITY_LOAN]: {
        label: 'Home Equity',
        icon: '🏡',
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
        borderColor: 'border-indigo-200 dark:border-indigo-800',
        textColor: 'text-indigo-700 dark:text-indigo-300',
      },
      [DebtType.MEDICAL_DEBT]: {
        label: 'Medical Debt',
        icon: '🏥',
        bgColor: 'bg-pink-50 dark:bg-pink-900/20',
        borderColor: 'border-pink-200 dark:border-pink-800',
        textColor: 'text-pink-700 dark:text-pink-300',
      },
      [DebtType.OTHER]: {
        label: 'Other Debt',
        icon: '📄',
        bgColor: 'bg-gray-50 dark:bg-gray-800',
        borderColor: 'border-gray-200 dark:border-gray-700',
        textColor: 'text-gray-700 dark:text-gray-300',
      },
    }
    return typeMap[type] || typeMap[DebtType.OTHER]
  }

  const typeInfo = getDebtTypeInfo(debt.debtType)

  const calculateUtilization = () => {
    if (!debt.creditLimit) return null
    return (debt.balance.amount / debt.creditLimit.amount) * 100
  }

  const utilization = calculateUtilization()

  const getUtilizationColor = (util: number) => {
    if (util >= 80) return 'text-red-600 dark:text-red-400'
    if (util >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getInterestRateColor = (rate: number) => {
    if (rate >= 20) return 'text-red-600 dark:text-red-400'
    if (rate >= 10) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getPriorityBadge = () => {
    if (!strategy) return null

    if (strategy === DebtStrategy.AVALANCHE) {
      return debt.interestRate.percentage.value >= 15 ? 'High Priority' :
             debt.interestRate.percentage.value >= 10 ? 'Medium Priority' : 'Low Priority'
    } else if (strategy === DebtStrategy.SNOWBALL) {
      return debt.balance.amount <= 2000 ? 'High Priority' :
             debt.balance.amount <= 5000 ? 'Medium Priority' : 'Low Priority'
    }
    return null
  }

  const priorityBadge = showPriority ? getPriorityBadge() : null
  const priorityVariant = priorityBadge?.includes('High') ? 'danger' :
                         priorityBadge?.includes('Medium') ? 'warning' : 'secondary'

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-lg ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900' : ''
      } ${onSelect ? 'cursor-pointer' : ''} ${className}`}
      onClick={onSelect}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${typeInfo.bgColor} ${typeInfo.borderColor} border`}>
              <span className="text-xl">{typeInfo.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
                {debt.name}
              </h3>
              <p className={`text-sm font-medium ${typeInfo.textColor}`}>
                {typeInfo.label}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-2">
            {priorityBadge && (
              <Badge variant={priorityVariant} size="xs">
                {priorityBadge}
              </Badge>
            )}
            {debt.dueDate && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Due: {formatDate(debt.dueDate)}
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Balance</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(debt.balance.amount)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Interest Rate</span>
            <span className={`text-sm font-semibold ${getInterestRateColor(debt.interestRate.percentage.value)}`}>
              {formatPercentage(debt.interestRate.percentage.value)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Minimum Payment</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatCurrency(debt.minimumPayment.amount)}
            </span>
          </div>

          {/* Credit Utilization (for credit cards) */}
          {utilization !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Utilization</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-semibold ${getUtilizationColor(utilization)}`}>
                  {formatPercentage(utilization)}
                </span>
                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      utilization >= 80 ? 'bg-red-500' :
                      utilization >= 50 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar (simplified debt-to-limit ratio for credit cards) */}
        {debt.creditLimit && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Credit Used</span>
              <span>{formatCurrency(debt.creditLimit.amount)} limit</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  utilization! >= 80 ? 'bg-red-500' :
                  utilization! >= 50 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(utilization!, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Last Payment Info */}
        {debt.lastPaymentDate && debt.lastPaymentAmount && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Last Payment</span>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(debt.lastPaymentAmount.amount)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(debt.lastPaymentDate)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowDetails(!showDetails)
            }}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {showDetails ? 'Hide Details' : 'View Details'}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Open payment modal
            }}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Pay
          </button>
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Account ID</span>
                <div className="font-mono text-xs text-gray-500 dark:text-gray-400 truncate">
                  {debt.id}
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Created</span>
                <div className="text-gray-900 dark:text-white">
                  {new Date(debt.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {debt.creditLimit && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Available Credit</span>
                  <div className="text-green-600 dark:text-green-400 font-semibold">
                    {formatCurrency(debt.creditLimit.amount - debt.balance.amount)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Credit Limit</span>
                  <div className="text-gray-900 dark:text-white font-semibold">
                    {formatCurrency(debt.creditLimit.amount)}
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Interest Calculation */}
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Monthly Interest Charge
                </span>
                <span className="text-sm font-bold text-yellow-900 dark:text-yellow-100">
                  {formatCurrency((debt.balance.amount * debt.interestRate.percentage.value / 100) / 12)}
                </span>
              </div>
              <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Based on current balance and interest rate
              </div>
            </div>

            {/* Payoff Estimate (minimum payments only) */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                Payoff with Minimum Payments Only
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-blue-600 dark:text-blue-400">Time to payoff:</span>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">
                    {/* Simplified calculation - would use Rust engine in real app */}
                    {Math.ceil(debt.balance.amount / (debt.minimumPayment.amount - (debt.balance.amount * debt.interestRate.percentage.value / 100 / 12)))} months
                  </div>
                </div>
                <div>
                  <span className="text-blue-600 dark:text-blue-400">Total interest:</span>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">
                    {formatCurrency(debt.balance.amount * 0.3)} {/* Rough estimate */}
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy-specific insight */}
            {strategy && (
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-1">
                  {strategy === DebtStrategy.AVALANCHE ? 'Debt Avalanche' : 'Debt Snowball'} Priority
                </div>
                <div className="text-xs text-purple-700 dark:text-purple-300">
                  {strategy === DebtStrategy.AVALANCHE
                    ? `High interest rate (${formatPercentage(debt.interestRate.percentage.value)}) makes this a priority for extra payments`
                    : debt.balance.amount <= 2000
                    ? 'Small balance makes this ideal for quick psychological wins'
                    : 'Focus on smaller debts first for motivation, then tackle this one'
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

export default DebtCard
