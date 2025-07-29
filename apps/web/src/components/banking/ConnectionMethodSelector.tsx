'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LinkIcon,
  DocumentArrowUpIcon,
  PencilSquareIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/common'
import type { ConnectionMethod } from './BankConnectionWizard'

interface ConnectionOption {
  id: ConnectionMethod
  title: string
  description: string
  icon: React.ComponentType<any>
  features: string[]
  recommended?: boolean
  availability: 'available' | 'coming-soon' | 'limited'
  supportedInstitutions?: number
  setupTime?: string
  securityLevel: 'bank-grade' | 'standard' | 'user-managed'
}

const CONNECTION_OPTIONS: ConnectionOption[] = [
  {
    id: 'plaid',
    title: 'Automatic Connection',
    description: 'Connect instantly using bank-grade security with Plaid',
    icon: LinkIcon,
    features: [
      'Over 11,000 supported institutions',
      'Real-time transaction sync',
      'Bank-grade 256-bit encryption',
      'Automatic categorization',
      'Read-only access (no transfers)',
      'OAuth 2.0 authentication'
    ],
    recommended: true,
    availability: 'available',
    supportedInstitutions: 11000,
    setupTime: '2-3 minutes',
    securityLevel: 'bank-grade'
  },
  {
    id: 'open-banking',
    title: 'Open Banking (EU/UK)',
    description: 'Secure API connections where Open Banking is available',
    icon: GlobeAltIcon,
    features: [
      'Regulated by PSD2 compliance',
      'Direct bank API connections',
      'Enhanced security protocols',
      'Real-time balance updates',
      'Transaction categorization',
      'Multi-currency support'
    ],
    availability: 'limited',
    supportedInstitutions: 2500,
    setupTime: '3-5 minutes',
    securityLevel: 'bank-grade'
  },
  {
    id: 'manual',
    title: 'Manual Entry',
    description: 'Enter account details manually for full control',
    icon: PencilSquareIcon,
    features: [
      'Full control over data entry',
      'Works with any institution',
      'Manual transaction import',
      'Custom account naming',
      'Flexible setup options',
      'Privacy-focused approach'
    ],
    availability: 'available',
    setupTime: '5-10 minutes',
    securityLevel: 'user-managed'
  },
  {
    id: 'import',
    title: 'File Import',
    description: 'Import transactions from CSV, OFX, or QIF files',
    icon: DocumentArrowUpIcon,
    features: [
      'CSV, OFX, QIF file support',
      'Bulk transaction import',
      'Historical data inclusion',
      'Custom mapping options',
      'Data validation tools',
      'Offline processing'
    ],
    availability: 'available',
    setupTime: '10-15 minutes',
    securityLevel: 'user-managed'
  }
]

interface ConnectionMethodSelectorProps {
  onMethodSelect: (method: ConnectionMethod) => void
  selectedMethod: ConnectionMethod | null
}

export function ConnectionMethodSelector({ onMethodSelect, selectedMethod }: ConnectionMethodSelectorProps) {
  const [hoveredMethod, setHoveredMethod] = useState<ConnectionMethod | null>(null)

  const getAvailabilityBadge = (availability: ConnectionOption['availability']) => {
    switch (availability) {
      case 'available':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Available
          </span>
        )
      case 'coming-soon':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300">
            Coming Soon
          </span>
        )
      case 'limited':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
            Limited Regions
          </span>
        )
    }
  }

  const getSecurityBadge = (level: ConnectionOption['securityLevel']) => {
    const badges = {
      'bank-grade': { text: 'Bank-Grade Security', color: 'success' },
      'standard': { text: 'Standard Security', color: 'primary' },
      'user-managed': { text: 'User-Managed', color: 'warning' }
    }

    const badge = badges[level]
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${badge.color}-100 text-${badge.color}-800 dark:bg-${badge.color}-900/30 dark:text-${badge.color}-300`}>
        {badge.text}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Choose Your Connection Method
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Select how you'd like to connect your financial accounts to Atlas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CONNECTION_OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = selectedMethod === option.id
          const isHovered = hoveredMethod === option.id
          const isDisabled = option.availability === 'coming-soon'

          return (
            <motion.div
              key={option.id}
              whileHover={!isDisabled ? { scale: 1.02 } : {}}
              whileTap={!isDisabled ? { scale: 0.98 } : {}}
            >
              <Card
                className={`cursor-pointer transition-all duration-200 relative overflow-hidden ${
                  isSelected
                    ? 'ring-2 ring-primary-500 border-primary-500'
                    : isHovered && !isDisabled
                    ? 'shadow-md border-gray-300 dark:border-gray-600'
                    : isDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => !isDisabled && onMethodSelect(option.id)}
                onMouseEnter={() => !isDisabled && setHoveredMethod(option.id)}
                onMouseLeave={() => setHoveredMethod(null)}
                padding="none"
              >
                {/* Recommended Badge */}
                {option.recommended && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-600 text-white">
                      Recommended
                    </span>
                  </div>
                )}

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start space-x-4 mb-4">
                    <div className={`p-3 rounded-lg ${
                      isSelected
                        ? 'bg-primary-100 dark:bg-primary-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        isSelected
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {option.title}
                        </h4>
                        {getAvailabilityBadge(option.availability)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {option.description}
                      </p>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    {option.supportedInstitutions && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Institutions:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">
                          {option.supportedInstitutions.toLocaleString()}+
                        </span>
                      </div>
                    )}
                    {option.setupTime && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Setup time:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">
                          {option.setupTime}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Security Badge */}
                  <div className="mb-4">
                    {getSecurityBadge(option.securityLevel)}
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                      Key Features:
                    </h5>
                    <ul className="space-y-1">
                      {option.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <CheckCircleIcon className="w-4 h-4 text-success-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                      {option.features.length > 3 && (
                        <li className="text-sm text-gray-500 dark:text-gray-400 ml-6">
                          +{option.features.length - 3} more features
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 flex items-center justify-center"
                    >
                      <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400">
                        <CheckCircleIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">Selected</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Information Panel */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">
              Your data security is our priority
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              All connection methods use bank-grade encryption. We never store your login credentials,
              and you can disconnect any account at any time. Your data is processed locally when possible
              and encrypted in transit and at rest.
            </p>
          </div>
        </div>
      </Card>

      {/* Continue Button */}
      {selectedMethod && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <button
            onClick={() => onMethodSelect(selectedMethod)}
            className="btn-primary px-8 py-3"
          >
            Continue with {CONNECTION_OPTIONS.find(opt => opt.id === selectedMethod)?.title}
          </button>
        </motion.div>
      )}
    </div>
  )
}
