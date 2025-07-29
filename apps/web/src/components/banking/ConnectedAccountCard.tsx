'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SignalIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/common'
import type { BankAccount } from './BankConnectionWizard'

interface ConnectedAccountCardProps {
  account: BankAccount
  onUpdate: (account: BankAccount) => void
  onDelete?: (accountId: string) => void
  showDetails?: boolean
  allowEdit?: boolean
}

const ACCOUNT_TYPE_INFO = {
  checking: {
    icon: BanknotesIcon,
    label: 'Checking Account',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  savings: {
    icon: BuildingLibraryIcon,
    label: 'Savings Account',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  credit: {
    icon: CreditCardIcon,
    label: 'Credit Card',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30'
  },
  investment: {
    icon: ChartBarIcon,
    label: 'Investment Account',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30'
  }
}

const STATUS_INFO = {
  connecting: {
    label: 'Connecting',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: ClockIcon
  },
  connected: {
    label: 'Connected',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: SignalIcon
  },
  error: {
    label: 'Error',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: ExclamationTriangleIcon
  },
  'verification-required': {
    label: 'Needs Verification',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: ExclamationTriangleIcon
  }
}

export function ConnectedAccountCard({
  account,
  onUpdate,
  onDelete,
  showDetails = false,
  allowEdit = true
}: ConnectedAccountCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(showDetails)
  const [editForm, setEditForm] = useState({
    name: account.name,
    accountType: account.accountType
  })

  const accountTypeInfo = ACCOUNT_TYPE_INFO[account.accountType]
  const statusInfo = STATUS_INFO[account.status]
  const Icon = accountTypeInfo.icon
  const StatusIcon = statusInfo.icon

  const handleSaveEdit = useCallback(() => {
    onUpdate({
      ...account,
      name: editForm.name,
      accountType: editForm.accountType
    })
    setIsEditing(false)
  }, [account, editForm, onUpdate])

  const handleCancelEdit = useCallback(() => {
    setEditForm({
      name: account.name,
      accountType: account.accountType
    })
    setIsEditing(false)
  }, [account])

  const handleDelete = useCallback(() => {
    if (onDelete && window.confirm(`Are you sure you want to remove ${account.name}?`)) {
      onDelete(account.id)
    }
  }, [account, onDelete])

  const formatBalance = (balance: number) => {
    const absBalance = Math.abs(balance)
    return `$${absBalance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  const getBalanceColor = (balance: number, accountType: string) => {
    if (accountType === 'credit') {
      return balance < 0 ? 'financial-negative' : 'financial-positive'
    }
    return balance >= 0 ? 'financial-positive' : 'financial-negative'
  }

  const getBalanceLabel = (balance: number, accountType: string) => {
    if (accountType === 'credit') {
      return balance < 0 ? 'Balance Owed' : 'Available Credit'
    }
    return 'Available Balance'
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-lg ${accountTypeInfo.bgColor}`}>
              <Icon className={`w-6 h-6 ${accountTypeInfo.color}`} />
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field text-lg font-semibold"
                    placeholder="Account name"
                  />
                  <select
                    value={editForm.accountType}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      accountType: e.target.value as BankAccount['accountType']
                    }))}
                    className="input-field"
                  >
                    <option value="checking">Checking Account</option>
                    <option value="savings">Savings Account</option>
                    <option value="credit">Credit Card</option>
                    <option value="investment">Investment Account</option>
                  </select>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {account.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {account.institutionName} • {accountTypeInfo.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {account.accountNumber}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="p-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                >
                  <CheckIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                {allowEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {isExpanded ? (
                    <ChevronUpIcon className="w-5 h-5" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Balance and Status */}
        {!isEditing && (
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className={`text-2xl font-bold ${getBalanceColor(account.balance, account.accountType)}`}>
                {formatBalance(account.balance)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {getBalanceLabel(account.balance, account.accountType)}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${statusInfo.bgColor}`}>
                <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                <span className={`text-sm font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {account.status === 'error' && account.error && !isEditing && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  Connection Error
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {account.error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Last Sync */}
        {account.lastSync && !isEditing && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last synced: {account.lastSync.toLocaleDateString()} at {account.lastSync.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && !isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            <div className="p-6 space-y-4">
              {/* Account Details */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Account Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Institution:</span>
                    <span className="ml-2 text-gray-900 dark:text-white font-medium">
                      {account.institutionName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className="ml-2 text-gray-900 dark:text-white font-medium">
                      {accountTypeInfo.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Account:</span>
                    <span className="ml-2 text-gray-900 dark:text-white font-medium font-mono">
                      {account.accountNumber}
                    </span>
                  </div>
                  {account.routingNumber && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Routing:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium font-mono">
                        {account.routingNumber}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Currency:</span>
                    <span className="ml-2 text-gray-900 dark:text-white font-medium">
                      {account.currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    <span className={`ml-2 font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sync Information */}
              {account.lastSync && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Sync Information
                  </h4>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Last successful sync:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {account.lastSync.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Next scheduled sync:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {new Date(account.lastSync.getTime() + 4 * 60 * 60 * 1000).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Information */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Security & Privacy
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Bank-grade 256-bit encryption
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Read-only access (no transfers)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Credentials never stored
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Can be disconnected anytime
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-2">
                <button className="btn-secondary text-sm">
                  Sync Now
                </button>
                <button className="btn-secondary text-sm">
                  View Transactions
                </button>
                {account.status === 'error' && (
                  <button className="btn-primary text-sm">
                    Reconnect Account
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
