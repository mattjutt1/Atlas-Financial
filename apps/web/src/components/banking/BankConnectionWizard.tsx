'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Card } from '@/components/common'
import { ConnectionMethodSelector } from './ConnectionMethodSelector'
import { PlaidConnector } from './PlaidConnector'
import { ManualAccountSetup } from './ManualAccountSetup'
import { FileImportHandler } from './FileImportHandler'
import { AccountVerificationStep } from './AccountVerificationStep'
import { SecurityEducationPanel } from './SecurityEducationPanel'
import { ConnectedAccountCard } from './ConnectedAccountCard'

export type ConnectionMethod = 'plaid' | 'manual' | 'import' | 'open-banking'

export interface WizardStep {
  id: string
  title: string
  description: string
  completed: boolean
  active: boolean
}

export interface BankAccount {
  id: string
  name: string
  institutionName: string
  accountType: 'checking' | 'savings' | 'credit' | 'investment'
  accountNumber: string
  routingNumber?: string
  balance: number
  currency: string
  status: 'connecting' | 'connected' | 'error' | 'verification-required'
  lastSync?: Date
  error?: string
}

export interface BankConnectionWizardProps {
  onComplete: (accounts: BankAccount[]) => void
  onCancel: () => void
  isOpen: boolean
}

const WIZARD_STEPS: Omit<WizardStep, 'completed' | 'active'>[] = [
  {
    id: 'welcome',
    title: 'Welcome & Security',
    description: 'Introduction and security overview'
  },
  {
    id: 'method',
    title: 'Connection Method',
    description: 'Choose how to connect your accounts'
  },
  {
    id: 'connect',
    title: 'Connect Accounts',
    description: 'Link your financial institution'
  },
  {
    id: 'verify',
    title: 'Verify Accounts',
    description: 'Validate account information'
  },
  {
    id: 'categorize',
    title: 'Categorize',
    description: 'Organize your accounts'
  },
  {
    id: 'complete',
    title: 'Complete',
    description: 'Finish setup and start using Atlas'
  }
]

export function BankConnectionWizard({ onComplete, onCancel, isOpen }: BankConnectionWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod | null>(null)
  const [connectedAccounts, setConnectedAccounts] = useState<BankAccount[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const steps: WizardStep[] = WIZARD_STEPS.map((step, index) => ({
    ...step,
    completed: index < currentStepIndex,
    active: index === currentStepIndex
  }))

  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  const handleNext = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    }
  }, [currentStepIndex, steps.length])

  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }, [currentStepIndex])

  const handleMethodSelect = useCallback((method: ConnectionMethod) => {
    setConnectionMethod(method)
    handleNext()
  }, [handleNext])

  const handleAccountsConnected = useCallback((accounts: BankAccount[]) => {
    setConnectedAccounts(accounts)
    handleNext()
  }, [handleNext])

  const handleComplete = useCallback(() => {
    onComplete(connectedAccounts)
  }, [connectedAccounts, onComplete])

  const renderStepContent = () => {
    switch (currentStep.id) {
      case 'welcome':
        return (
          <SecurityEducationPanel
            onContinue={handleNext}
            showSecurityFeatures={true}
          />
        )

      case 'method':
        return (
          <ConnectionMethodSelector
            onMethodSelect={handleMethodSelect}
            selectedMethod={connectionMethod}
          />
        )

      case 'connect':
        if (!connectionMethod) return null

        switch (connectionMethod) {
          case 'plaid':
            return (
              <PlaidConnector
                onAccountsConnected={handleAccountsConnected}
                onError={(error) => console.error('Plaid connection error:', error)}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            )

          case 'manual':
            return (
              <ManualAccountSetup
                onAccountsAdded={handleAccountsConnected}
                onError={(error) => console.error('Manual setup error:', error)}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            )

          case 'import':
            return (
              <FileImportHandler
                onAccountsImported={handleAccountsConnected}
                onError={(error) => console.error('Import error:', error)}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            )

          default:
            return <div>Connection method not yet implemented</div>
        }

      case 'verify':
        return (
          <AccountVerificationStep
            accounts={connectedAccounts}
            onVerificationComplete={handleNext}
            onAccountUpdate={(updatedAccounts) => setConnectedAccounts(updatedAccounts)}
          />
        )

      case 'categorize':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Organize Your Accounts
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Review and categorize your connected accounts
              </p>
            </div>

            <div className="space-y-4">
              {connectedAccounts.map((account) => (
                <ConnectedAccountCard
                  key={account.id}
                  account={account}
                  onUpdate={(updatedAccount) => {
                    setConnectedAccounts(prev =>
                      prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc)
                    )
                  }}
                />
              ))}
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleNext}
                className="btn-primary px-8 py-3"
                disabled={connectedAccounts.some(acc => acc.status === 'connecting')}
              >
                Continue to Completion
              </button>
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckIcon className="w-8 h-8 text-success-600 dark:text-success-400" />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Setup Complete!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You've successfully connected {connectedAccounts.length} account{connectedAccounts.length !== 1 ? 's' : ''}.
                Your financial data will begin syncing automatically.
              </p>
            </div>

            <div className="bg-primary-50 dark:bg-primary-900/30 rounded-lg p-4">
              <h4 className="font-medium text-primary-800 dark:text-primary-200 mb-2">
                What happens next?
              </h4>
              <ul className="text-sm text-primary-700 dark:text-primary-300 space-y-1 text-left">
                <li>• Your accounts will sync automatically every few hours</li>
                <li>• Transactions will be categorized using AI</li>
                <li>• You'll receive insights and recommendations</li>
                <li>• All data is encrypted and secure</li>
              </ul>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={handleComplete}
                className="btn-primary px-8 py-3"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )

      default:
        return <div>Unknown step</div>
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-primary-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Connect Your Accounts</h2>
              <p className="text-primary-100 mt-1">
                Step {currentStepIndex + 1} of {steps.length}: {currentStep.title}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-primary-100 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.completed
                        ? 'bg-success-500 text-white'
                        : step.active
                        ? 'bg-white text-primary-600'
                        : 'bg-primary-500 text-primary-100'
                    }`}
                  >
                    {step.completed ? (
                      <CheckIcon className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        step.completed ? 'bg-success-400' : 'bg-primary-400'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        {currentStep.id !== 'welcome' && currentStep.id !== 'complete' && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep || isProcessing}
                className="btn-secondary"
              >
                Previous
              </button>

              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                {isProcessing && (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}
              </div>

              {currentStep.id !== 'connect' && (
                <button
                  onClick={handleNext}
                  disabled={isLastStep || isProcessing}
                  className="btn-primary"
                >
                  {isLastStep ? 'Complete' : 'Next'}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
