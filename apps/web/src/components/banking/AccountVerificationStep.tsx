'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClockIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { Card, LoadingSpinner } from '@/components/common'
import type { BankAccount } from './BankConnectionWizard'

interface VerificationCheck {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning'
  message?: string
  details?: string[]
}

interface AccountVerificationStepProps {
  accounts: BankAccount[]
  onVerificationComplete: () => void
  onAccountUpdate: (accounts: BankAccount[]) => void
}

const VERIFICATION_CHECKS: Omit<VerificationCheck, 'status' | 'message' | 'details'>[] = [
  {
    id: 'connectivity',
    name: 'Connection Test',
    description: 'Verify we can connect to your financial institution'
  },
  {
    id: 'authentication',
    name: 'Authentication',
    description: 'Confirm account access permissions'
  },
  {
    id: 'account_details',
    name: 'Account Details',
    description: 'Validate account numbers and routing information'
  },
  {
    id: 'balance_verification',
    name: 'Balance Verification',
    description: 'Cross-check account balances'
  },
  {
    id: 'transaction_access',
    name: 'Transaction Access',
    description: 'Test transaction data retrieval'
  },
  {
    id: 'security_compliance',
    name: 'Security Compliance',
    description: 'Verify security and encryption standards'
  }
]

const ACCOUNT_TYPE_ICONS = {
  checking: BanknotesIcon,
  savings: BuildingLibraryIcon,
  credit: CreditCardIcon,
  investment: ChartBarIcon
}

export function AccountVerificationStep({
  accounts,
  onVerificationComplete,
  onAccountUpdate
}: AccountVerificationStepProps) {
  const [verificationStep, setVerificationStep] = useState<'start' | 'running' | 'results'>('start')
  const [checks, setChecks] = useState<VerificationCheck[]>(
    VERIFICATION_CHECKS.map(check => ({ ...check, status: 'pending' as const }))
  )
  const [currentCheckIndex, setCurrentCheckIndex] = useState(0)
  const [verifiedAccounts, setVerifiedAccounts] = useState<BankAccount[]>(accounts)

  const runVerificationCheck = useCallback(async (checkIndex: number) => {
    const check = checks[checkIndex]

    // Update check to running
    setChecks(prev => prev.map((c, index) =>
      index === checkIndex ? { ...c, status: 'running' } : c
    ))

    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000))

    // Simulate check results (in production, these would be real verification calls)
    const shouldFail = Math.random() < 0.1 // 10% chance of failure for demo
    const shouldWarn = Math.random() < 0.2 // 20% chance of warning for demo

    let status: VerificationCheck['status']
    let message: string | undefined
    let details: string[] | undefined

    if (shouldFail) {
      status = 'failed'
      message = getFailureMessage(check.id)
      details = getFailureDetails(check.id)
    } else if (shouldWarn) {
      status = 'warning'
      message = getWarningMessage(check.id)
      details = getWarningDetails(check.id)
    } else {
      status = 'passed'
      message = getSuccessMessage(check.id)
    }

    // Update check results
    setChecks(prev => prev.map((c, index) =>
      index === checkIndex ? { ...c, status, message, details } : c
    ))

    return status
  }, [checks])

  const getFailureMessage = (checkId: string): string => {
    const messages = {
      connectivity: 'Unable to connect to institution',
      authentication: 'Authentication failed',
      account_details: 'Account information invalid',
      balance_verification: 'Balance mismatch detected',
      transaction_access: 'Cannot access transaction data',
      security_compliance: 'Security requirements not met'
    }
    return messages[checkId as keyof typeof messages] || 'Verification failed'
  }

  const getFailureDetails = (checkId: string): string[] => {
    const details = {
      connectivity: [
        'Connection timeout after 30 seconds',
        'Institution may be experiencing downtime',
        'Try again in a few minutes'
      ],
      authentication: [
        'Invalid credentials provided',
        'Account may be locked',
        'Contact your bank if issue persists'
      ],
      account_details: [
        'Account number format invalid',
        'Routing number not found',
        'Double-check account information'
      ],
      balance_verification: [
        'Current balance differs from expected',
        'Recent transactions may not be reflected',
        'This is usually temporary'
      ],
      transaction_access: [
        'Permission denied for transaction data',
        'Account may have restricted access',
        'Contact institution for permission'
      ],
      security_compliance: [
        'Institution security standards insufficient',
        'Connection cannot be secured',
        'Try alternative connection method'
      ]
    }
    return details[checkId as keyof typeof details] || ['Verification failed']
  }

  const getWarningMessage = (checkId: string): string => {
    const messages = {
      connectivity: 'Connection unstable',
      authentication: 'Limited access granted',
      account_details: 'Some details unverified',
      balance_verification: 'Balance pending update',
      transaction_access: 'Partial transaction access',
      security_compliance: 'Standard security in use'
    }
    return messages[checkId as keyof typeof messages] || 'Warning detected'
  }

  const getWarningDetails = (checkId: string): string[] => {
    const details = {
      connectivity: [
        'Connection successful but intermittent',
        'May experience sync delays',
        'Monitor connection status'
      ],
      authentication: [
        'Read-only access confirmed',
        'Some features may be limited',
        'Full access not required for Atlas'
      ],
      account_details: [
        'Basic account info verified',
        'Some metadata unavailable',
        'Core functionality unaffected'
      ],
      balance_verification: [
        'Balance will update within 24 hours',
        'Recent transactions still processing',
        'No action required'
      ],
      transaction_access: [
        'Transaction history available',
        'Real-time updates may be delayed',
        'Historical data complete'
      ],
      security_compliance: [
        'Standard encryption in use',
        'Meets minimum security requirements',
        'Connection is secure'
      ]
    }
    return details[checkId as keyof typeof details] || ['Warning details']
  }

  const getSuccessMessage = (checkId: string): string => {
    const messages = {
      connectivity: 'Connection established successfully',
      authentication: 'Authentication verified',
      account_details: 'Account information confirmed',
      balance_verification: 'Balance verified',
      transaction_access: 'Transaction access granted',
      security_compliance: 'Security standards verified'
    }
    return messages[checkId as keyof typeof messages] || 'Verification passed'
  }

  const startVerification = useCallback(async () => {
    setVerificationStep('running')
    setCurrentCheckIndex(0)

    for (let i = 0; i < checks.length; i++) {
      setCurrentCheckIndex(i)
      const result = await runVerificationCheck(i)

      // If a critical check fails, we might want to stop
      if (result === 'failed' && (i === 0 || i === 1)) {
        // Continue with other checks even if connectivity or auth fails
        // In production, you might want to handle this differently
      }
    }

    setVerificationStep('results')
  }, [checks.length, runVerificationCheck])

  const retryVerification = useCallback(() => {
    setChecks(VERIFICATION_CHECKS.map(check => ({ ...check, status: 'pending' as const })))
    setVerificationStep('start')
  }, [])

  const proceedWithResults = useCallback(() => {
    // Update account statuses based on verification results
    const hasFailures = checks.some(check => check.status === 'failed')
    const hasWarnings = checks.some(check => check.status === 'warning')

    const updatedAccounts = verifiedAccounts.map(account => ({
      ...account,
      status: hasFailures ? 'error' as const : hasWarnings ? 'verification-required' as const : 'connected' as const
    }))

    setVerifiedAccounts(updatedAccounts)
    onAccountUpdate(updatedAccounts)
    onVerificationComplete()
  }, [checks, verifiedAccounts, onAccountUpdate, onVerificationComplete])

  const renderStartStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <ShieldCheckIcon className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Account Verification
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          We'll run a series of security and connectivity checks to ensure your accounts are properly configured
        </p>
      </div>

      {/* Accounts to Verify */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">
          Accounts to Verify ({accounts.length})
        </h4>
        {accounts.map((account) => {
          const Icon = ACCOUNT_TYPE_ICONS[account.accountType]
          return (
            <Card key={account.id} className="p-4">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900 dark:text-white">
                    {account.name}
                  </h5>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {account.institutionName} • {account.accountNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${
                    account.balance >= 0 ? 'financial-positive' : 'financial-negative'
                  }`}>
                    ${Math.abs(account.balance).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Verification Checks Preview */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">
          Verification Checks
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VERIFICATION_CHECKS.map((check, index) => (
            <div key={check.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400 flex-shrink-0 mt-1">
                {index + 1}
              </div>
              <div className="min-w-0">
                <h5 className="font-medium text-gray-900 dark:text-white">
                  {check.name}
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {check.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={startVerification}
          className="btn-primary px-8 py-3"
        >
          Start Verification
        </button>
      </div>
    </div>
  )

  const renderRunningStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">
          Running Verification Checks
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          This may take a few moments to complete
        </p>
      </div>

      <div className="space-y-3">
        {checks.map((check, index) => (
          <motion.div
            key={check.id}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className={`flex items-center space-x-3 p-4 rounded-lg ${
              check.status === 'running'
                ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                : check.status === 'passed'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : check.status === 'failed'
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                : check.status === 'warning'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                : 'bg-gray-50 dark:bg-gray-700'
            }`}
          >
            <div className="flex-shrink-0">
              {check.status === 'running' && (
                <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              )}
              {check.status === 'passed' && (
                <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              )}
              {check.status === 'failed' && (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              {check.status === 'warning' && (
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              )}
              {check.status === 'pending' && (
                <ClockIcon className="w-5 h-5 text-gray-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {check.name}
                </h4>
                {index === currentCheckIndex && check.status === 'running' && (
                  <span className="text-sm text-primary-600 dark:text-primary-400">
                    Running...
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {check.message || check.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )

  const renderResultsStep = () => {
    const passedCount = checks.filter(check => check.status === 'passed').length
    const failedCount = checks.filter(check => check.status === 'failed').length
    const warningCount = checks.filter(check => check.status === 'warning').length
    const totalCount = checks.length

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
            failedCount > 0
              ? 'bg-red-100 dark:bg-red-900/30'
              : warningCount > 0
              ? 'bg-yellow-100 dark:bg-yellow-900/30'
              : 'bg-green-100 dark:bg-green-900/30'
          }`}>
            {failedCount > 0 ? (
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            ) : warningCount > 0 ? (
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            ) : (
              <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Verification {failedCount > 0 ? 'Issues Detected' : warningCount > 0 ? 'Completed with Warnings' : 'Completed Successfully'}
          </h3>

          <div className="flex justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-1">
              <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-gray-600 dark:text-gray-400">{passedCount} Passed</span>
            </div>
            {warningCount > 0 && (
              <div className="flex items-center space-x-1">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-gray-600 dark:text-gray-400">{warningCount} Warnings</span>
              </div>
            )}
            {failedCount > 0 && (
              <div className="flex items-center space-x-1">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-gray-600 dark:text-gray-400">{failedCount} Failed</span>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Results */}
        <div className="space-y-3">
          {checks.map((check) => (
            <AnimatePresence key={check.id}>
              {(check.status === 'failed' || check.status === 'warning') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className={`p-4 ${
                    check.status === 'failed'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <ExclamationTriangleIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        check.status === 'failed'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-yellow-600 dark:text-yellow-400'
                      }`} />
                      <div className="flex-1">
                        <h4 className={`font-medium mb-1 ${
                          check.status === 'failed'
                            ? 'text-red-800 dark:text-red-200'
                            : 'text-yellow-800 dark:text-yellow-200'
                        }`}>
                          {check.name}: {check.message}
                        </h4>
                        {check.details && (
                          <ul className={`text-sm space-y-1 ${
                            check.status === 'failed'
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-yellow-700 dark:text-yellow-300'
                          }`}>
                            {check.details.map((detail, index) => (
                              <li key={index}>• {detail}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={retryVerification}
            className="btn-secondary flex items-center space-x-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Retry Verification</span>
          </button>
          <button
            onClick={proceedWithResults}
            className="btn-primary px-8"
          >
            {failedCount > 0 ? 'Continue Anyway' : warningCount > 0 ? 'Continue with Warnings' : 'Continue'}
          </button>
        </div>
      </div>
    )
  }

  switch (verificationStep) {
    case 'start':
      return renderStartStep()
    case 'running':
      return renderRunningStep()
    case 'results':
      return renderResultsStep()
    default:
      return renderStartStep()
  }
}
