'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheckIcon,
  LockClosedIcon,
  EyeSlashIcon,
  KeyIcon,
  ServerIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  PlayIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/common'

interface SecurityEducationPanelProps {
  onContinue: () => void
  showSecurityFeatures?: boolean
  compact?: boolean
}

interface SecurityFeature {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  details: string[]
  learnMoreUrl?: string
}

const SECURITY_FEATURES: SecurityFeature[] = [
  {
    id: 'encryption',
    title: 'Bank-Grade Encryption',
    description: 'All data is protected with 256-bit AES encryption, the same standard used by banks',
    icon: LockClosedIcon,
    details: [
      'Data encrypted in transit using TLS 1.3',
      'Data encrypted at rest using AES-256',
      'Encryption keys stored in secure hardware',
      'Regular security audits and updates'
    ],
    learnMoreUrl: '#'
  },
  {
    id: 'credentials',
    title: 'No Credential Storage',
    description: 'Your login credentials are never stored on our servers',
    icon: EyeSlashIcon,
    details: [
      'Credentials passed directly to your bank',
      'OAuth 2.0 tokens used when available',
      'Session tokens expire automatically',
      'Zero-knowledge architecture'
    ],
    learnMoreUrl: '#'
  },
  {
    id: 'readonly',
    title: 'Read-Only Access',
    description: 'We can only view your account information, never initiate transfers',
    icon: EyeSlashIcon,
    details: [
      'Cannot initiate payments or transfers',
      'Cannot modify account settings',
      'Cannot access secure messaging',
      'Limited to transaction and balance data'
    ],
    learnMoreUrl: '#'
  },
  {
    id: 'oauth',
    title: 'OAuth 2.0 Authentication',
    description: 'Secure authentication standard used by major platforms like Google and Facebook',
    icon: KeyIcon,
    details: [
      'Industry-standard authentication protocol',
      'No password sharing required',
      'Granular permission control',
      'Easy to revoke access anytime'
    ],
    learnMoreUrl: '#'
  },
  {
    id: 'infrastructure',
    title: 'Secure Infrastructure',
    description: 'Our servers are hosted in SOC 2 compliant data centers with 24/7 monitoring',
    icon: ServerIcon,
    details: [
      'SOC 2 Type II certified infrastructure',
      '24/7 security monitoring and alerts',
      'Regular penetration testing',
      'Automated threat detection'
    ],
    learnMoreUrl: '#'
  },
  {
    id: 'compliance',
    title: 'Regulatory Compliance',
    description: 'We comply with financial regulations including PCI DSS and follow GDPR guidelines',
    icon: GlobeAltIcon,
    details: [
      'PCI DSS Level 1 compliance',
      'GDPR privacy protections',
      'SOX financial reporting standards',
      'Regular compliance audits'
    ],
    learnMoreUrl: '#'
  }
]

const SECURITY_PRINCIPLES = [
  {
    title: 'Transparency',
    description: 'We clearly explain what data we access and how we use it'
  },
  {
    title: 'Minimal Access',
    description: 'We only request the minimum permissions needed for functionality'
  },
  {
    title: 'User Control',
    description: 'You can disconnect any account or delete your data at any time'
  },
  {
    title: 'Regular Audits',
    description: 'Independent security firms regularly test our systems'
  }
]

export function SecurityEducationPanel({
  onContinue,
  showSecurityFeatures = false,
  compact = false
}: SecurityEducationPanelProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)
  const [showDemo, setShowDemo] = useState(false)

  if (compact) {
    return (
      <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <div className="flex items-start space-x-3">
          <ShieldCheckIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
              Your Security is Our Priority
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Bank-grade encryption, read-only access, and no credential storage ensure your data stays safe.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Your Security is Our Foundation
        </h3>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          We use the same security standards as major banks to protect your financial data.
          Here's how we keep your information safe and secure.
        </p>
      </div>

      {/* Key Security Promise */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
        <div className="text-center">
          <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            Our Security Promise
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center">
              <EyeSlashIcon className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
              <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                Never Store Credentials
              </h5>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Your login information is never saved on our servers
              </p>
            </div>
            <div className="flex flex-col items-center">
              <LockClosedIcon className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
              <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                Bank-Grade Security
              </h5>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                256-bit encryption protects all your data
              </p>
            </div>
            <div className="flex flex-col items-center">
              <EyeSlashIcon className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
              <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                Read-Only Access
              </h5>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                We can only view, never move your money
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Security Features */}
      {showSecurityFeatures && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Detailed Security Features
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SECURITY_FEATURES.map((feature) => {
              const Icon = feature.icon
              const isSelected = selectedFeature === feature.id

              return (
                <motion.div
                  key={feature.id}
                  layout
                  className={`cursor-pointer transition-all duration-200 ${
                    isSelected ? 'md:col-span-2' : ''
                  }`}
                >
                  <Card
                    className={`p-4 hover:shadow-md transition-shadow ${
                      isSelected ? 'ring-2 ring-primary-500 border-primary-500' : ''
                    }`}
                    onClick={() => setSelectedFeature(isSelected ? null : feature.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                        <Icon className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {feature.title}
                          </h5>
                          <ChevronRightIcon
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              isSelected ? 'rotate-90' : ''
                            }`}
                          />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {feature.description}
                        </p>

                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 space-y-2"
                            >
                              <ul className="space-y-2">
                                {feature.details.map((detail, index) => (
                                  <li key={index} className="flex items-center space-x-2 text-sm">
                                    <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                    <span className="text-gray-700 dark:text-gray-300">
                                      {detail}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              {feature.learnMoreUrl && (
                                <a
                                  href={feature.learnMoreUrl}
                                  className="inline-flex items-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mt-2"
                                >
                                  Learn more about {feature.title.toLowerCase()}
                                  <ChevronRightIcon className="w-4 h-4 ml-1" />
                                </a>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Security Principles */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Our Security Principles
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECURITY_PRINCIPLES.map((principle, index) => (
            <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                  {principle.title}
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {principle.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Demo */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
            <PlayIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              See How Connection Works
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              Watch a 2-minute demo showing exactly how we connect to your bank securely,
              what data we access, and how we protect your privacy.
            </p>
            <button
              onClick={() => setShowDemo(true)}
              className="btn-secondary text-sm"
            >
              Watch Security Demo
            </button>
          </div>
        </div>
      </Card>

      {/* Certifications */}
      <div className="text-center">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Trusted by Security Experts
        </h4>
        <div className="flex justify-center items-center space-x-8 opacity-60">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">SOC 2</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Type II</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">PCI DSS</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Level 1</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">GDPR</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Compliant</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">ISO 27001</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Certified</div>
          </div>
        </div>
      </div>

      {/* FAQ Quick Links */}
      <Card className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          <InformationCircleIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h4 className="font-medium text-gray-900 dark:text-white">
            Still Have Questions?
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">
            How is my data encrypted?
          </a>
          <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">
            Can you access my bank login?
          </a>
          <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">
            What permissions do you need?
          </a>
          <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">
            How do I disconnect accounts?
          </a>
        </div>
      </Card>

      {/* Continue Button */}
      <div className="text-center pt-4">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Ready to securely connect your accounts? Your data will be protected by the same
          security standards used by major banks and financial institutions.
        </p>
        <button
          onClick={onContinue}
          className="btn-primary px-8 py-3 text-lg"
        >
          I Understand - Let's Get Started
        </button>
      </div>

      {/* Demo Modal Placeholder */}
      {showDemo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Security Demo
              </h3>
              <button
                onClick={() => setShowDemo(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
              <PlayIcon className="w-16 h-16 text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Demo video would be embedded here showing the secure connection process.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
