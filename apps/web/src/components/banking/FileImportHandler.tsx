'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { Card, LoadingSpinner } from '@/components/common'
import type { BankAccount } from './BankConnectionWizard'

interface ImportedTransaction {
  date: string
  description: string
  amount: number
  category?: string
  balance?: number
}

interface ImportResult {
  accountInfo: {
    name: string
    institutionName: string
    accountType: BankAccount['accountType']
    accountNumber: string
    balance: number
  }
  transactions: ImportedTransaction[]
  errors: string[]
  warnings: string[]
}

interface FileImportHandlerProps {
  onAccountsImported: (accounts: BankAccount[]) => void
  onError: (error: string) => void
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void
}

const SUPPORTED_FORMATS = [
  {
    extension: '.csv',
    name: 'CSV (Comma Separated Values)',
    description: 'Most common export format from banks',
    maxSize: '10MB'
  },
  {
    extension: '.ofx',
    name: 'OFX (Open Financial Exchange)',
    description: 'Standard format for financial data',
    maxSize: '5MB'
  },
  {
    extension: '.qif',
    name: 'QIF (Quicken Interchange Format)',
    description: 'Legacy format supported by many banks',
    maxSize: '5MB'
  }
]

const SAMPLE_CSV_HEADERS = [
  'Date, Description, Amount, Balance',
  'Transaction Date, Description, Debit, Credit, Balance',
  'Date, Payee, Category, Outflow, Inflow',
  'Posted Date, Description, Amount, Running Balance'
]

export function FileImportHandler({
  onAccountsImported,
  onError,
  isProcessing,
  setIsProcessing
}: FileImportHandlerProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'configure'>('upload')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }, [])

  const handleFiles = useCallback((files: File[]) => {
    // Filter supported file types
    const supportedFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      return SUPPORTED_FORMATS.some(format => format.extension === extension)
    })

    if (supportedFiles.length === 0) {
      onError('Please select files with supported formats: ' + SUPPORTED_FORMATS.map(f => f.extension).join(', '))
      return
    }

    // Check file sizes
    const oversizedFiles = supportedFiles.filter(file => file.size > 10 * 1024 * 1024) // 10MB
    if (oversizedFiles.length > 0) {
      onError(`File too large: ${oversizedFiles[0].name}. Maximum size is 10MB.`)
      return
    }

    setSelectedFiles(supportedFiles)
  }, [onError])

  const parseCSV = useCallback((content: string, filename: string): ImportResult => {
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      return {
        accountInfo: {
          name: filename.replace(/\.[^/.]+$/, ''),
          institutionName: 'Unknown',
          accountType: 'checking',
          accountNumber: '****0000',
          balance: 0
        },
        transactions: [],
        errors: ['File appears to be empty or invalid'],
        warnings: []
      }
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
    const transactions: ImportedTransaction[] = []
    const errors: string[] = []
    const warnings: string[] = []

    // Try to identify column mapping
    const dateCol = headers.findIndex(h =>
      h.includes('date') || h.includes('posted') || h.includes('transaction')
    )
    const descCol = headers.findIndex(h =>
      h.includes('description') || h.includes('payee') || h.includes('memo')
    )
    const amountCol = headers.findIndex(h =>
      h.includes('amount') && !h.includes('balance')
    )
    const balanceCol = headers.findIndex(h => h.includes('balance'))

    if (dateCol === -1 || descCol === -1) {
      errors.push('Unable to identify required columns (Date, Description)')
    }

    let currentBalance = 0

    // Parse transaction rows
    for (let i = 1; i < Math.min(lines.length, 101); i++) { // Limit to 100 transactions for demo
      const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''))

      try {
        const date = new Date(row[dateCol])
        if (isNaN(date.getTime())) {
          warnings.push(`Row ${i + 1}: Invalid date format`)
          continue
        }

        const description = row[descCol] || 'Unknown Transaction'
        let amount = 0

        // Try to parse amount
        if (amountCol >= 0 && row[amountCol]) {
          amount = parseFloat(row[amountCol].replace(/[$,]/g, ''))
        }

        // Try to parse balance if available
        let balance = undefined
        if (balanceCol >= 0 && row[balanceCol]) {
          balance = parseFloat(row[balanceCol].replace(/[$,]/g, ''))
          currentBalance = balance
        } else {
          currentBalance += amount
          balance = currentBalance
        }

        transactions.push({
          date: date.toISOString().split('T')[0],
          description,
          amount,
          balance
        })
      } catch (error) {
        warnings.push(`Row ${i + 1}: Error parsing transaction`)
      }
    }

    return {
      accountInfo: {
        name: filename.replace(/\.[^/.]+$/, ''),
        institutionName: 'Imported Bank',
        accountType: 'checking',
        accountNumber: `****${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        balance: currentBalance
      },
      transactions,
      errors,
      warnings
    }
  }, [])

  const processFiles = useCallback(async () => {
    setIsProcessing(true)
    const results: ImportResult[] = []

    try {
      for (const file of selectedFiles) {
        const content = await file.text()
        const extension = '.' + file.name.split('.').pop()?.toLowerCase()

        let result: ImportResult

        switch (extension) {
          case '.csv':
            result = parseCSV(content, file.name)
            break
          case '.ofx':
            // Simplified OFX parsing - in production, use proper OFX parser
            result = {
              accountInfo: {
                name: file.name.replace(/\.[^/.]+$/, ''),
                institutionName: 'OFX Import',
                accountType: 'checking',
                accountNumber: '****0000',
                balance: 0
              },
              transactions: [],
              errors: ['OFX parsing not yet implemented'],
              warnings: ['Please use CSV format for now']
            }
            break
          case '.qif':
            // Simplified QIF parsing - in production, use proper QIF parser
            result = {
              accountInfo: {
                name: file.name.replace(/\.[^/.]+$/, ''),
                institutionName: 'QIF Import',
                accountType: 'checking',
                accountNumber: '****0000',
                balance: 0
              },
              transactions: [],
              errors: ['QIF parsing not yet implemented'],
              warnings: ['Please use CSV format for now']
            }
            break
          default:
            result = {
              accountInfo: {
                name: file.name,
                institutionName: 'Unknown',
                accountType: 'checking',
                accountNumber: '****0000',
                balance: 0
              },
              transactions: [],
              errors: ['Unsupported file format'],
              warnings: []
            }
        }

        results.push(result)
      }

      setImportResults(results)
      setCurrentStep('preview')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to process files')
    } finally {
      setIsProcessing(false)
    }
  }, [selectedFiles, parseCSV, onError, setIsProcessing])

  const handleImportConfirm = useCallback(() => {
    const accounts: BankAccount[] = importResults
      .filter(result => result.errors.length === 0)
      .map((result, index) => ({
        id: `imported_${Date.now()}_${index}`,
        name: result.accountInfo.name,
        institutionName: result.accountInfo.institutionName,
        accountType: result.accountInfo.accountType,
        accountNumber: result.accountInfo.accountNumber,
        balance: result.accountInfo.balance,
        currency: 'USD',
        status: 'connected' as const,
        lastSync: new Date()
      }))

    if (accounts.length === 0) {
      onError('No valid accounts to import')
      return
    }

    onAccountsImported(accounts)
  }, [importResults, onAccountsImported, onError])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Import from Files
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Upload CSV, OFX, or QIF files exported from your bank
        </p>
      </div>

      {/* File Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Drop files here or click to browse
        </h4>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Supports CSV, OFX, and QIF files up to 10MB
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary"
        >
          Select Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.ofx,.qif"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Selected Files ({selectedFiles.length})
          </h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DocumentArrowUpIcon className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={processFiles}
              disabled={isProcessing}
              className="btn-primary px-8"
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>Processing Files...</span>
                </div>
              ) : (
                'Process Files'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Format Information */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              CSV Format Requirements
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              Your CSV file should include these column headers (exact names may vary):
            </p>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              {SAMPLE_CSV_HEADERS.map((header, index) => (
                <div key={index} className="font-mono bg-blue-100 dark:bg-blue-800/50 px-2 py-1 rounded">
                  {header}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Supported Formats */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          Supported Formats
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SUPPORTED_FORMATS.map((format) => (
            <Card key={format.extension} className="p-4">
              <div className="text-center">
                <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                  {format.name}
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {format.description}
                </p>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Max size: {format.maxSize}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Import Preview
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Review the imported data before adding to your accounts
        </p>
      </div>

      {importResults.map((result, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {result.accountInfo.name}
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                {result.accountInfo.institutionName} • {result.accountInfo.accountType}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold financial-positive">
                ${result.accountInfo.balance.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {result.transactions.length} transactions
              </p>
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    Import Errors:
                  </h5>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    {result.errors.map((error, errorIndex) => (
                      <li key={errorIndex}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    Warnings:
                  </h5>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    {result.warnings.map((warning, warningIndex) => (
                      <li key={warningIndex}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Sample Transactions */}
          {result.transactions.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                Sample Transactions (showing first 5)
              </h5>
              <div className="space-y-2">
                {result.transactions.slice(0, 5).map((transaction, txIndex) => (
                  <div key={txIndex} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {transaction.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.amount >= 0 ? 'financial-positive' : 'financial-negative'
                      }`}>
                        ${Math.abs(transaction.amount).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </p>
                      {transaction.balance && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Balance: ${transaction.balance.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}

      <div className="flex justify-center space-x-4">
        <button
          onClick={() => {
            setCurrentStep('upload')
            setImportResults([])
            setSelectedFiles([])
          }}
          className="btn-secondary"
        >
          Back to Upload
        </button>
        <button
          onClick={handleImportConfirm}
          disabled={importResults.every(result => result.errors.length > 0)}
          className="btn-primary px-8"
        >
          Import Accounts
        </button>
      </div>
    </div>
  )

  switch (currentStep) {
    case 'upload':
      return renderUploadStep()
    case 'preview':
      return renderPreviewStep()
    default:
      return renderUploadStep()
  }
}
