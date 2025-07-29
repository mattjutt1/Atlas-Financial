'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { Card, LoadingSpinner } from '@/components/common'
import type { BankAccount } from './BankConnectionWizard'

// Mock Plaid configuration - in production, this would come from environment variables
const PLAID_CONFIG = {
  clientName: 'Atlas Financial',
  products: ['transactions', 'accounts', 'identity'],
  countryCodes: ['US', 'CA'],
  environment: 'sandbox' // 'sandbox' | 'development' | 'production'
}

interface Institution {
  id: string
  name: string
  logo?: string
  colors: {
    primary: string
    darker?: string
  }
  products: string[]
  routing_numbers?: string[]
  oauth: boolean
  popular: boolean
}

// Mock institutions data - in production, this would come from Plaid API
const MOCK_INSTITUTIONS: Institution[] = [
  {
    id: 'chase',
    name: 'Chase Bank',
    colors: { primary: '#117ACA', darker: '#044F7A' },
    products: ['transactions', 'accounts', 'identity'],
    oauth: true,
    popular: true
  },
  {
    id: 'bank_of_america',
    name: 'Bank of America',
    colors: { primary: '#e31b23', darker: '#a31116' },
    products: ['transactions', 'accounts', 'identity'],
    oauth: true,
    popular: true
  },
  {
    id: 'wells_fargo',
    name: 'Wells Fargo',
    colors: { primary: '#d71e2b', darker: '#a71820' },
    products: ['transactions', 'accounts', 'identity'],
    oauth: true,
    popular: true
  },
  {
    id: 'citi',
    name: 'Citi Bank',
    colors: { primary: '#056dae', darker: '#043f64' },
    products: ['transactions', 'accounts', 'identity'],
    oauth: true,
    popular: true
  },
  {
    id: 'american_express',
    name: 'American Express',
    colors: { primary: '#006fcf', darker: '#004580' },
    products: ['transactions', 'accounts'],
    oauth: true,
    popular: true
  },
  {
    id: 'capital_one',
    name: 'Capital One',
    colors: { primary: '#004977', darker: '#002d46' },
    products: ['transactions', 'accounts', 'identity'],
    oauth: true,
    popular: true
  }
]

interface PlaidConnectorProps {
  onAccountsConnected: (accounts: BankAccount[]) => void
  onError: (error: string) => void
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void
}

export function PlaidConnector({
  onAccountsConnected,
  onError,
  isProcessing,
  setIsProcessing
}: PlaidConnectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null)
  const [connectionStep, setConnectionStep] = useState<'search' | 'connect' | 'accounts' | 'success'>('search')
  const [discoveredAccounts, setDiscoveredAccounts] = useState<BankAccount[]>([])
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const filteredInstitutions = MOCK_INSTITUTIONS.filter(institution =>
    institution.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const popularInstitutions = MOCK_INSTITUTIONS.filter(inst => inst.popular).slice(0, 6)

  const handleInstitutionSelect = useCallback((institution: Institution) => {
    setSelectedInstitution(institution)
    setConnectionStep('connect')
    setConnectionError(null)
  }, [])

  const simulatePlaidConnection = useCallback(async (institution: Institution) => {
    setIsProcessing(true)
    setConnectionError(null)

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Simulate random success/failure for demo purposes
      if (Math.random() > 0.9) {
        throw new Error('Connection failed. Please check your credentials and try again.')
      }

      // Generate mock accounts for the selected institution
      const mockAccounts: BankAccount[] = [
        {
          id: `${institution.id}_checking_001`,
          name: `${institution.name} Checking`,
          institutionName: institution.name,
          accountType: 'checking',
          accountNumber: '****1234',
          routingNumber: '021000021',
          balance: 2547.83,
          currency: 'USD',
          status: 'connected',
          lastSync: new Date()
        },
        {
          id: `${institution.id}_savings_001`,
          name: `${institution.name} Savings`,
          institutionName: institution.name,
          accountType: 'savings',
          accountNumber: '****5678',
          routingNumber: '021000021',
          balance: 15420.96,
          currency: 'USD',
          status: 'connected',
          lastSync: new Date()
        }
      ]

      // Add credit card if institution supports it
      if (institution.id === 'american_express' || institution.id === 'chase') {
        mockAccounts.push({
          id: `${institution.id}_credit_001`,
          name: `${institution.name} Credit Card`,
          institutionName: institution.name,
          accountType: 'credit',
          accountNumber: '****9012',
          balance: -1247.50, // Negative balance for credit cards (debt)
          currency: 'USD',
          status: 'connected',
          lastSync: new Date()
        })
      }

      setDiscoveredAccounts(mockAccounts)
      setConnectionStep('accounts')
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed')
      onError(error instanceof Error ? error.message : 'Connection failed')
    } finally {
      setIsProcessing(false)
    }
  }, [setIsProcessing, onError])

  const handleAccountSelection = useCallback((accounts: BankAccount[]) => {
    const selectedAccounts = accounts.filter(account => account.status === 'connected')
    if (selectedAccounts.length === 0) {
      onError('Please select at least one account to connect')
      return
    }

    setConnectionStep('success')
    setTimeout(() => {
      onAccountsConnected(selectedAccounts)
    }, 1500)
  }, [onAccountsConnected, onError])

  const handleRetry = useCallback(() => {
    setConnectionStep('search')
    setSelectedInstitution(null)
    setConnectionError(null)
    setDiscoveredAccounts([])
  }, [])

  const renderSearchStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Find Your Bank
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Search for your financial institution from over 11,000 supported banks
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search for your bank..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10 text-lg"
          autoFocus
        />
      </div>

      {/* Popular Banks */}
      {!searchTerm && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Popular Banks
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {popularInstitutions.map((institution) => (
              <button
                key={institution.id}
                onClick={() => handleInstitutionSelect(institution)}
                className="card p-4 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: institution.colors.primary }}
                  >
                    {institution.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {institution.name}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchTerm && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Search Results ({filteredInstitutions.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {filteredInstitutions.map((institution) => (
              <button
                key={institution.id}
                onClick={() => handleInstitutionSelect(institution)}
                className="w-full card p-4 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: institution.colors.primary }}
                  >
                    {institution.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {institution.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {institution.oauth ? 'Secure OAuth login' : 'Standard login'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            {filteredInstitutions.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No institutions found. Try a different search term.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const renderConnectStep = () => (
    <div className="space-y-6">
      {selectedInstitution && (
        <>
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: selectedInstitution.colors.primary }}
            >
              {selectedInstitution.name.substring(0, 2).toUpperCase()}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Connect to {selectedInstitution.name}
            </h3>
          </div>

          {connectionError && (
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    Connection Failed
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {connectionError}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-start space-x-3">
              <ShieldCheckIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                  Secure Connection Process
                </h4>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>• Your login credentials are never stored by Atlas</li>
                  <li>• Connection uses bank-grade 256-bit encryption</li>
                  <li>• Read-only access - we cannot initiate transfers</li>
                  <li>• You can disconnect at any time</li>
                </ul>
              </div>
            </div>
          </Card>

          {isProcessing ? (
            <div className="text-center py-8">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 dark:text-gray-400 mt-4">
                Connecting to {selectedInstitution.name}...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                This may take a few moments
              </p>
            </div>
          ) : (
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setConnectionStep('search')}
                className="btn-secondary"
              >
                Back
              </button>
              <button
                onClick={() => simulatePlaidConnection(selectedInstitution)}
                className="btn-primary px-8"
              >
                Connect to {selectedInstitution.name}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )

  const renderAccountsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Connection Successful!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          We found {discoveredAccounts.length} account{discoveredAccounts.length !== 1 ? 's' : ''} at {selectedInstitution?.name}
        </p>
      </div>

      <div className="space-y-4">
        {discoveredAccounts.map((account) => (
          <Card key={account.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <BanknotesIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {account.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {account.accountNumber} • {account.accountType}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${
                  account.balance >= 0 ? 'financial-positive' : 'financial-negative'
                }`}>
                  ${Math.abs(account.balance).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {account.balance < 0 ? 'Balance Owed' : 'Available'}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => handleAccountSelection(discoveredAccounts)}
          className="btn-primary px-8"
        >
          Connect All Accounts
        </button>
      </div>
    </div>
  )

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
      </motion.div>

      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Accounts Connected Successfully!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Your {selectedInstitution?.name} accounts are now connected to Atlas
        </p>
      </div>

      <div className="animate-pulse">
        <LoadingSpinner size="md" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Proceeding to verification...
        </p>
      </div>
    </div>
  )

  switch (connectionStep) {
    case 'search':
      return renderSearchStep()
    case 'connect':
      return renderConnectStep()
    case 'accounts':
      return renderAccountsStep()
    case 'success':
      return renderSuccessStep()
    default:
      return renderSearchStep()
  }
}
