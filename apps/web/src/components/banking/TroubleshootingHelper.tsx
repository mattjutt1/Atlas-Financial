'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/common'

interface TroubleshootingStep {
  id: string
  title: string
  description: string
  action?: string
  completed: boolean
}

interface TroubleshootingIssue {
  id: string
  title: string
  description: string
  commonCauses: string[]
  steps: TroubleshootingStep[]
  preventionTips?: string[]
  contactSupport?: boolean
}

interface TroubleshootingHelperProps {
  issues?: TroubleshootingIssue[]
  onIssueResolved?: (issueId: string) => void
  showPreventionTips?: boolean
}

const DEFAULT_ISSUES: TroubleshootingIssue[] = [
  {
    id: 'connection_failed',
    title: 'Unable to Connect to Bank',
    description: 'Connection to your financial institution is failing or timing out',
    commonCauses: [
      'Temporary bank system maintenance',
      'Incorrect login credentials',
      'Account locked or suspended',
      'Two-factor authentication required',
      'Network connectivity issues'
    ],
    steps: [
      {
        id: 'verify_credentials',
        title: 'Verify Your Credentials',
        description: 'Double-check your username and password by logging into your bank\'s website directly',
        action: 'Test login on bank website',
        completed: false
      },
      {
        id: 'check_2fa',
        title: 'Handle Two-Factor Authentication',
        description: 'Some banks require additional authentication steps during connection',
        action: 'Complete 2FA if prompted',
        completed: false
      },
      {
        id: 'wait_retry',
        title: 'Wait and Retry',
        description: 'Bank systems may be temporarily unavailable. Wait 15-30 minutes and try again',
        action: 'Retry connection',
        completed: false
      },
      {
        id: 'contact_bank',
        title: 'Contact Your Bank',
        description: 'If issues persist, your account may need to be unlocked or have permissions updated',
        action: 'Call bank support',
        completed: false
      }
    ],
    preventionTips: [
      'Keep your bank login credentials up to date',
      'Notify your bank about third-party financial apps',
      'Avoid multiple failed login attempts'
    ],
    contactSupport: true
  },
  {
    id: 'sync_errors',
    title: 'Account Sync Issues',
    description: 'Account data is not updating or showing incorrect information',
    commonCauses: [
      'Recent bank website changes',
      'Temporary API unavailability',
      'Account access permissions changed',
      'Large transaction volume causing delays',
      'Bank maintenance windows'
    ],
    steps: [
      {
        id: 'manual_refresh',
        title: 'Manual Refresh',
        description: 'Try manually refreshing the account to trigger a new sync',
        action: 'Click sync now',
        completed: false
      },
      {
        id: 'check_permissions',
        title: 'Check Account Permissions',
        description: 'Ensure the account still has proper permissions for data access',
        action: 'Review permissions',
        completed: false
      },
      {
        id: 'reconnect_account',
        title: 'Reconnect Account',
        description: 'Sometimes reconnecting the account resolves persistent sync issues',
        action: 'Reconnect account',
        completed: false
      },
      {
        id: 'wait_sync',
        title: 'Wait for Automatic Sync',
        description: 'Some sync issues resolve automatically within 24 hours',
        action: 'Monitor for 24 hours',
        completed: false
      }
    ],
    preventionTips: [
      'Allow 24 hours for large transaction imports',
      'Avoid disconnecting accounts during active syncs',
      'Keep account permissions current'
    ]
  },
  {
    id: 'missing_transactions',
    title: 'Missing Transactions',
    description: 'Some transactions are not appearing in your account',
    commonCauses: [
      'Pending transactions not yet posted',
      'Transactions outside date range',
      'Bank categorization differences',
      'Duplicate detection removing valid transactions',
      'Institution-specific data formats'
    ],
    steps: [
      {
        id: 'check_date_range',
        title: 'Check Date Range',
        description: 'Verify that missing transactions fall within the expected date range',
        action: 'Review date filters',
        completed: false
      },
      {
        id: 'check_pending',
        title: 'Check Pending Status',
        description: 'Pending transactions may not appear until they are posted by your bank',
        action: 'Wait for posting',
        completed: false
      },
      {
        id: 'review_duplicates',
        title: 'Review Duplicate Detection',
        description: 'Our system may have incorrectly identified transactions as duplicates',
        action: 'Check duplicate rules',
        completed: false
      },
      {
        id: 'force_refresh',
        title: 'Force Full Refresh',
        description: 'Request a complete re-import of transaction history',
        action: 'Full account refresh',
        completed: false
      }
    ],
    preventionTips: [
      'Allow 2-3 business days for pending transactions',
      'Check both current and previous statement periods',
      'Report consistently missing transactions'
    ]
  },
  {
    id: 'balance_mismatch',
    title: 'Balance Discrepancies',
    description: 'Account balance in Atlas doesn\'t match your bank statement',
    commonCauses: [
      'Pending transactions not reflected',
      'Different timezone considerations',
      'Bank holds or restrictions',
      'Recent transactions still processing',
      'Credit card available vs current balance'
    ],
    steps: [
      {
        id: 'compare_statements',
        title: 'Compare with Bank Statement',
        description: 'Check your official bank statement for the exact balance and date',
        action: 'Review bank statement',
        completed: false
      },
      {
        id: 'check_pending_holds',
        title: 'Account for Pending Items',
        description: 'Include pending transactions, holds, and available credit in comparison',
        action: 'Calculate with pending',
        completed: false
      },
      {
        id: 'sync_timing',
        title: 'Consider Sync Timing',
        description: 'Balance differences may be due to when the last sync occurred',
        action: 'Note last sync time',
        completed: false
      },
      {
        id: 'report_discrepancy',
        title: 'Report Persistent Issues',
        description: 'If balance remains incorrect after 24 hours, report the discrepancy',
        action: 'Contact support',
        completed: false
      }
    ],
    preventionTips: [
      'Compare balances at the same time each day',
      'Account for pending transactions and holds',
      'Understand your bank\'s posting schedule'
    ]
  }
]

const QUICK_FIXES = [
  {
    title: 'Clear Browser Cache',
    description: 'Clear your browser cache and cookies, then try connecting again'
  },
  {
    title: 'Try Incognito Mode',
    description: 'Use private/incognito browsing mode to eliminate extension conflicts'
  },
  {
    title: 'Check Internet Connection',
    description: 'Ensure you have a stable internet connection before attempting to connect'
  },
  {
    title: 'Update Browser',
    description: 'Make sure you\'re using the latest version of your web browser'
  }
]

export function TroubleshootingHelper({
  issues = DEFAULT_ISSUES,
  onIssueResolved,
  showPreventionTips = true
}: TroubleshootingHelperProps) {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [showQuickFixes, setShowQuickFixes] = useState(false)

  const handleStepToggle = useCallback((stepId: string) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev)
      if (newSet.has(stepId)) {
        newSet.delete(stepId)
      } else {
        newSet.add(stepId)
      }
      return newSet
    })
  }, [])

  const handleIssueComplete = useCallback((issueId: string) => {
    if (onIssueResolved) {
      onIssueResolved(issueId)
    }
    setSelectedIssue(null)
    setCompletedSteps(new Set())
  }, [onIssueResolved])

  const selectedIssueData = issues.find(issue => issue.id === selectedIssue)
  const completedStepsCount = selectedIssueData
    ? selectedIssueData.steps.filter(step => completedSteps.has(step.id)).length
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <QuestionMarkCircleIcon className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Troubleshooting Assistant
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Get help resolving common account connection and sync issues
        </p>
      </div>

      {/* Quick Fixes */}
      <Card className="p-4">
        <button
          onClick={() => setShowQuickFixes(!showQuickFixes)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-3">
            <LightBulbIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <h4 className="font-medium text-gray-900 dark:text-white">
              Quick Fixes (Try These First)
            </h4>
          </div>
          {showQuickFixes ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {showQuickFixes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-3"
            >
              {QUICK_FIXES.map((fix, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <CheckCircleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">
                      {fix.title}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {fix.description}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Issue Selection */}
      {!selectedIssue && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            What issue are you experiencing?
          </h4>
          <div className="space-y-3">
            {issues.map((issue) => (
              <Card
                key={issue.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedIssue(issue.id)}
              >
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                      {issue.title}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {issue.description}
                    </p>
                  </div>
                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Selected Issue Troubleshooting */}
      {selectedIssueData && (
        <div className="space-y-6">
          {/* Issue Header */}
          <Card className="p-6 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-lg font-semibold text-orange-800 dark:text-orange-200">
                    {selectedIssueData.title}
                  </h4>
                  <p className="text-orange-700 dark:text-orange-300 mt-1">
                    {selectedIssueData.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
              >
                <ChevronUpIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-orange-700 dark:text-orange-300">
              <strong>Common causes:</strong> {selectedIssueData.commonCauses.join(', ')}
            </div>
          </Card>

          {/* Progress Indicator */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Troubleshooting Progress
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {completedStepsCount} of {selectedIssueData.steps.length} steps completed
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary-600 dark:bg-primary-400 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(completedStepsCount / selectedIssueData.steps.length) * 100}%`
                }}
              />
            </div>
          </Card>

          {/* Troubleshooting Steps */}
          <div className="space-y-4">
            <h5 className="font-medium text-gray-900 dark:text-white">
              Follow these steps to resolve the issue:
            </h5>
            {selectedIssueData.steps.map((step, index) => {
              const isCompleted = completedSteps.has(step.id)
              return (
                <Card key={step.id} className={`p-4 ${isCompleted ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}`}>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 pt-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                        isCompleted
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircleIcon className="w-4 h-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                    </div>

                    <div className="flex-1">
                      <h6 className="font-medium text-gray-900 dark:text-white mb-1">
                        {step.title}
                      </h6>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {step.description}
                      </p>

                      <div className="flex items-center space-x-3">
                        {step.action && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                            Action: {step.action}
                          </span>
                        )}
                        <button
                          onClick={() => handleStepToggle(step.id)}
                          className={`text-sm ${
                            isCompleted
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-primary-600 dark:text-primary-400'
                          } hover:underline`}
                        >
                          {isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Prevention Tips */}
          {showPreventionTips && selectedIssueData.preventionTips && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <LightBulbIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Prevention Tips
                  </h5>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    {selectedIssueData.preventionTips.map((tip, index) => (
                      <li key={index}>• {tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => setSelectedIssue(null)}
              className="btn-secondary"
            >
              Back to Issues
            </button>

            <div className="flex space-x-3">
              {selectedIssueData.contactSupport && (
                <button className="btn-secondary flex items-center space-x-2">
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  <span>Contact Support</span>
                </button>
              )}

              {completedStepsCount === selectedIssueData.steps.length && (
                <button
                  onClick={() => handleIssueComplete(selectedIssue)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Issue Resolved</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Support Options */}
      <Card className="p-6 bg-gray-50 dark:bg-gray-700/50">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">
          Still Need Help?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-sm transition-shadow">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <div className="text-left">
              <div className="font-medium text-gray-900 dark:text-white">Live Chat</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Available 24/7</div>
            </div>
          </button>

          <button className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-sm transition-shadow">
            <PhoneIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <div className="text-left">
              <div className="font-medium text-gray-900 dark:text-white">Phone Support</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Mon-Fri 9AM-6PM</div>
            </div>
          </button>

          <button className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-sm transition-shadow">
            <DocumentTextIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <div className="text-left">
              <div className="font-medium text-gray-900 dark:text-white">Help Center</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Guides & FAQs</div>
            </div>
          </button>
        </div>
      </Card>
    </div>
  )
}
