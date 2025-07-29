'use client'

import { useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  TrashIcon,
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Card, LoadingSpinner } from '@/components/common'
import type { BankAccount } from './BankConnectionWizard'

// Validation schema
const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(50, 'Name too long'),
  institutionName: z.string().min(1, 'Institution name is required').max(100, 'Name too long'),
  accountType: z.enum(['checking', 'savings', 'credit', 'investment'], {
    required_error: 'Account type is required'
  }),
  accountNumber: z.string()
    .min(4, 'Account number must be at least 4 digits')
    .max(20, 'Account number too long')
    .regex(/^[0-9]+$/, 'Account number must contain only digits'),
  routingNumber: z.string()
    .optional()
    .refine((val) => !val || (/^[0-9]{9}$/.test(val)), 'Routing number must be 9 digits'),
  balance: z.number()
    .min(-999999.99, 'Balance too low')
    .max(999999.99, 'Balance too high'),
  currency: z.string().default('USD')
})

const formSchema = z.object({
  accounts: z.array(accountSchema).min(1, 'At least one account is required')
})

type FormData = z.infer<typeof formSchema>

interface ManualAccountSetupProps {
  onAccountsAdded: (accounts: BankAccount[]) => void
  onError: (error: string) => void
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void
}

const ACCOUNT_TYPES = [
  {
    value: 'checking' as const,
    label: 'Checking Account',
    icon: BanknotesIcon,
    description: 'For everyday transactions and payments',
    requiresRouting: true
  },
  {
    value: 'savings' as const,
    label: 'Savings Account',
    icon: BuildingLibraryIcon,
    description: 'For saving money and earning interest',
    requiresRouting: true
  },
  {
    value: 'credit' as const,
    label: 'Credit Card',
    icon: CreditCardIcon,
    description: 'Credit cards and lines of credit',
    requiresRouting: false
  },
  {
    value: 'investment' as const,
    label: 'Investment Account',
    icon: ChartBarIcon,
    description: 'Brokerage, retirement, and investment accounts',
    requiresRouting: false
  }
]

export function ManualAccountSetup({
  onAccountsAdded,
  onError,
  isProcessing,
  setIsProcessing
}: ManualAccountSetupProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    trigger
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accounts: [{
        name: '',
        institutionName: '',
        accountType: 'checking',
        accountNumber: '',
        routingNumber: '',
        balance: 0,
        currency: 'USD'
      }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'accounts'
  })

  const watchedAccounts = watch('accounts')

  const addAccount = useCallback(() => {
    append({
      name: '',
      institutionName: '',
      accountType: 'checking',
      accountNumber: '',
      routingNumber: '',
      balance: 0,
      currency: 'USD'
    })
  }, [append])

  const removeAccount = useCallback((index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }, [fields.length, remove])

  const validateAccounts = useCallback((accounts: FormData['accounts']) => {
    const errors: string[] = []
    const accountNumbers = new Set<string>()

    accounts.forEach((account, index) => {
      // Check for duplicate account numbers
      if (accountNumbers.has(account.accountNumber)) {
        errors.push(`Account #${index + 1}: Duplicate account number`)
      } else {
        accountNumbers.add(account.accountNumber)
      }

      // Validate routing number for bank accounts
      const accountType = ACCOUNT_TYPES.find(type => type.value === account.accountType)
      if (accountType?.requiresRouting && !account.routingNumber) {
        errors.push(`Account #${index + 1}: Routing number required for ${accountType.label}`)
      }

      // Validate balance for credit accounts
      if (account.accountType === 'credit' && account.balance > 0) {
        errors.push(`Account #${index + 1}: Credit card balance should be negative (amount owed)`)
      }
    })

    return errors
  }, [])

  const onSubmit = useCallback(async (data: FormData) => {
    setIsProcessing(true)
    setValidationErrors([])

    try {
      // Additional validation
      const errors = validateAccounts(data.accounts)
      if (errors.length > 0) {
        setValidationErrors(errors)
        setIsProcessing(false)
        return
      }

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Convert form data to BankAccount objects
      const bankAccounts: BankAccount[] = data.accounts.map((account, index) => ({
        id: `manual_${Date.now()}_${index}`,
        name: account.name,
        institutionName: account.institutionName,
        accountType: account.accountType,
        accountNumber: `****${account.accountNumber.slice(-4)}`,
        routingNumber: account.routingNumber,
        balance: account.accountType === 'credit' ? -Math.abs(account.balance) : account.balance,
        currency: account.currency,
        status: 'connected' as const,
        lastSync: new Date()
      }))

      onAccountsAdded(bankAccounts)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to add accounts')
    } finally {
      setIsProcessing(false)
    }
  }, [validateAccounts, onAccountsAdded, onError, setIsProcessing])

  const getAccountTypeInfo = useCallback((accountType: string) => {
    return ACCOUNT_TYPES.find(type => type.value === accountType)
  }, [])

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Add Accounts Manually
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your account details manually for full control over your data
        </p>
      </div>

      {/* Security Notice */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">
              Privacy-First Approach
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              Your account information is encrypted and stored securely. Only the last 4 digits
              of account numbers are displayed for identification purposes.
            </p>
          </div>
        </div>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Please fix the following errors:
              </h4>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <AnimatePresence mode="popLayout">
          {fields.map((field, index) => {
            const accountType = getAccountTypeInfo(watchedAccounts[index]?.accountType || 'checking')
            const Icon = accountType?.icon || BanknotesIcon

            return (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                layout
              >
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                        <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Account #{index + 1}
                      </h4>
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAccount(index)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Account Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Account Name *
                      </label>
                      <input
                        {...register(`accounts.${index}.name`)}
                        type="text"
                        placeholder="e.g., Primary Checking"
                        className="input-field"
                      />
                      {errors.accounts?.[index]?.name && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.accounts[index]?.name?.message}
                        </p>
                      )}
                    </div>

                    {/* Institution Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Bank/Institution *
                      </label>
                      <input
                        {...register(`accounts.${index}.institutionName`)}
                        type="text"
                        placeholder="e.g., Chase Bank"
                        className="input-field"
                      />
                      {errors.accounts?.[index]?.institutionName && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.accounts[index]?.institutionName?.message}
                        </p>
                      )}
                    </div>

                    {/* Account Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Account Type *
                      </label>
                      <select
                        {...register(`accounts.${index}.accountType`)}
                        className="input-field"
                        onChange={(e) => {
                          setValue(`accounts.${index}.accountType`, e.target.value as any)
                          trigger(`accounts.${index}.accountType`)
                        }}
                      >
                        {ACCOUNT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      {accountType && (
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                          {accountType.description}
                        </p>
                      )}
                    </div>

                    {/* Current Balance */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Current Balance *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                          $
                        </span>
                        <input
                          {...register(`accounts.${index}.balance`, { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          placeholder={watchedAccounts[index]?.accountType === 'credit' ? '1250.00' : '0.00'}
                          className="input-field pl-8"
                        />
                      </div>
                      {watchedAccounts[index]?.accountType === 'credit' && (
                        <p className="text-amber-600 dark:text-amber-400 text-sm mt-1">
                          Enter the amount you owe (will be stored as negative)
                        </p>
                      )}
                      {errors.accounts?.[index]?.balance && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.accounts[index]?.balance?.message}
                        </p>
                      )}
                    </div>

                    {/* Account Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Account Number *
                      </label>
                      <input
                        {...register(`accounts.${index}.accountNumber`)}
                        type="text"
                        placeholder="1234567890"
                        className="input-field font-mono"
                      />
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Only last 4 digits will be shown for security
                      </p>
                      {errors.accounts?.[index]?.accountNumber && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.accounts[index]?.accountNumber?.message}
                        </p>
                      )}
                    </div>

                    {/* Routing Number (if required) */}
                    {accountType?.requiresRouting && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Routing Number *
                        </label>
                        <input
                          {...register(`accounts.${index}.routingNumber`)}
                          type="text"
                          placeholder="021000021"
                          className="input-field font-mono"
                          maxLength={9}
                        />
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                          9-digit routing number for {accountType.label.toLowerCase()}
                        </p>
                        {errors.accounts?.[index]?.routingNumber && (
                          <p className="text-red-600 text-sm mt-1">
                            {errors.accounts[index]?.routingNumber?.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Add Account Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={addAccount}
            className="btn-secondary flex items-center space-x-2"
            disabled={isProcessing}
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Another Account</span>
          </button>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isProcessing}
            className="btn-primary px-8 py-3 min-w-[150px]"
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Adding Accounts...</span>
              </div>
            ) : (
              `Add ${fields.length} Account${fields.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
