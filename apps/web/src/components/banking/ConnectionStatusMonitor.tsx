'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClockIcon,
  SignalIcon,
  WifiIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/common'
import type { BankAccount } from './BankConnectionWizard'

interface SyncStatus {
  lastSync: Date
  nextSync: Date
  status: 'idle' | 'syncing' | 'success' | 'error' | 'warning'
  progress?: number
  message?: string
  details?: string[]
}

interface ConnectionHealth {
  score: number // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected'
  latency: number // ms
  uptime: number // percentage
  lastCheck: Date
}

interface ConnectionStatusMonitorProps {
  accounts: BankAccount[]
  className?: string
  compact?: boolean
}

export function ConnectionStatusMonitor({
  accounts,
  className = '',
  compact = false
}: ConnectionStatusMonitorProps) {
  const [syncStatuses, setSyncStatuses] = useState<Map<string, SyncStatus>>(new Map())
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    score: 95,
    status: 'excellent',
    latency: 150,
    uptime: 99.8,
    lastCheck: new Date()
  })
  const [isMonitoring, setIsMonitoring] = useState(true)

  // Initialize sync statuses for all accounts
  useEffect(() => {
    const initialStatuses = new Map<string, SyncStatus>()

    accounts.forEach(account => {
      const lastSync = account.lastSync || new Date(Date.now() - Math.random() * 3600000) // Random time within last hour
      const nextSync = new Date(lastSync.getTime() + 4 * 3600000) // Next sync in 4 hours

      initialStatuses.set(account.id, {
        lastSync,
        nextSync,
        status: account.status === 'connected' ? 'idle' : 'error',
        message: account.status === 'connected' ? 'Up to date' : account.error || 'Connection error'
      })
    })

    setSyncStatuses(initialStatuses)
  }, [accounts])

  // Simulate real-time monitoring
  useEffect(() => {
    if (!isMonitoring) return

    const interval = setInterval(() => {
      // Update connection health
      setConnectionHealth(prev => ({
        ...prev,
        score: Math.max(85, Math.min(100, prev.score + (Math.random() - 0.5) * 5)),
        latency: Math.max(50, Math.min(500, prev.latency + (Math.random() - 0.5) * 50)),
        uptime: Math.max(95, Math.min(100, prev.uptime + (Math.random() - 0.5) * 0.1)),
        lastCheck: new Date()
      }))

      // Occasionally trigger a sync
      if (Math.random() < 0.1) { // 10% chance every update
        const accountIds = Array.from(syncStatuses.keys())
        if (accountIds.length > 0) {
          const randomAccountId = accountIds[Math.floor(Math.random() * accountIds.length)]
          simulateSync(randomAccountId)
        }
      }
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [isMonitoring, syncStatuses])

  const simulateSync = useCallback(async (accountId: string) => {
    setSyncStatuses(prev => {
      const newMap = new Map(prev)
      const currentStatus = newMap.get(accountId)
      if (currentStatus) {
        newMap.set(accountId, {
          ...currentStatus,
          status: 'syncing',
          progress: 0,
          message: 'Connecting to bank...'
        })
      }
      return newMap
    })

    // Simulate sync progress
    const steps = [
      { progress: 20, message: 'Authenticating...' },
      { progress: 40, message: 'Fetching account data...' },
      { progress: 60, message: 'Processing transactions...' },
      { progress: 80, message: 'Categorizing transactions...' },
      { progress: 100, message: 'Sync complete' }
    ]

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      setSyncStatuses(prev => {
        const newMap = new Map(prev)
        const currentStatus = newMap.get(accountId)
        if (currentStatus) {
          newMap.set(accountId, {
            ...currentStatus,
            progress: step.progress,
            message: step.message
          })
        }
        return newMap
      })
    }

    // Complete sync
    const isSuccess = Math.random() > 0.1 // 90% success rate
    const now = new Date()

    setSyncStatuses(prev => {
      const newMap = new Map(prev)
      const currentStatus = newMap.get(accountId)
      if (currentStatus) {
        newMap.set(accountId, {
          ...currentStatus,
          status: isSuccess ? 'success' : 'error',
          progress: undefined,
          lastSync: isSuccess ? now : currentStatus.lastSync,
          nextSync: new Date(now.getTime() + 4 * 3600000),
          message: isSuccess ? 'Sync completed successfully' : 'Sync failed - will retry automatically',
          details: isSuccess ? [
            `${Math.floor(Math.random() * 20) + 5} new transactions`,
            'Balance updated',
            'Categories assigned'
          ] : [
            'Connection timeout',
            'Will retry in 15 minutes',
            'Your data is safe'
          ]
        })
      }
      return newMap
    })
  }, [])

  const manualSync = useCallback((accountId: string) => {
    simulateSync(accountId)
  }, [simulateSync])

  const toggleMonitoring = useCallback(() => {
    setIsMonitoring(prev => !prev)
  }, [])

  const getStatusIcon = (status: SyncStatus['status']) => {
    switch (status) {
      case 'syncing':
        return <ArrowPathIcon className="w-5 h-5 text-primary-600 dark:text-primary-400 animate-spin" />
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getHealthStatusColor = (status: ConnectionHealth['status']) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 dark:text-green-400'
      case 'good':
        return 'text-blue-600 dark:text-blue-400'
      case 'fair':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'poor':
        return 'text-orange-600 dark:text-orange-400'
      case 'disconnected':
        return 'text-red-600 dark:text-red-400'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const formatTimeUntil = (date: Date) => {
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 0) return 'Overdue'
    if (diffMins < 60) return `in ${diffMins}m`
    return `in ${diffHours}h`
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionHealth.status === 'excellent' || connectionHealth.status === 'good'
              ? 'bg-green-500'
              : connectionHealth.status === 'fair'
              ? 'bg-yellow-500'
              : 'bg-red-500'
          }`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {accounts.filter(acc => syncStatuses.get(acc.id)?.status === 'success' || syncStatuses.get(acc.id)?.status === 'idle').length}/
            {accounts.length} accounts synced
          </span>
        </div>

        <button
          onClick={toggleMonitoring}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          {isMonitoring ? 'Monitoring' : 'Paused'}
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Connection Health Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Connection Health
          </h3>
          <button
            onClick={toggleMonitoring}
            className={`btn-secondary text-sm ${isMonitoring ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
          >
            {isMonitoring ? 'Monitoring Active' : 'Monitoring Paused'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getHealthStatusColor(connectionHealth.status)}`}>
              {connectionHealth.score}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Health Score</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {connectionHealth.latency}ms
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Avg Latency</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {connectionHealth.uptime.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Uptime</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <SignalIcon className={`w-5 h-5 ${getHealthStatusColor(connectionHealth.status)}`} />
              <span className={`font-medium capitalize ${getHealthStatusColor(connectionHealth.status)}`}>
                {connectionHealth.status}
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Checked {formatTimeAgo(connectionHealth.lastCheck)}
            </div>
          </div>
        </div>
      </Card>

      {/* Account Sync Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Account Sync Status
          </h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="space-y-4">
          {accounts.map((account) => {
            const syncStatus = syncStatuses.get(account.id)
            if (!syncStatus) return null

            return (
              <motion.div
                key={account.id}
                layout
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(syncStatus.status)}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {account.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {account.institutionName} • {account.accountNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right text-sm">
                    <div className="text-gray-900 dark:text-white">
                      {syncStatus.message}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {syncStatus.status === 'syncing' ? (
                        `${syncStatus.progress}% complete`
                      ) : (
                        <>
                          Last: {formatTimeAgo(syncStatus.lastSync)} •
                          Next: {formatTimeUntil(syncStatus.nextSync)}
                        </>
                      )}
                    </div>
                  </div>

                  {syncStatus.status !== 'syncing' && (
                    <button
                      onClick={() => manualSync(account.id)}
                      className="btn-secondary text-sm px-3 py-1"
                      disabled={!isMonitoring}
                    >
                      Sync Now
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Sync Progress Bar */}
        <AnimatePresence>
          {Array.from(syncStatuses.values()).some(status => status.status === 'syncing') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <ArrowPathIcon className="w-5 h-5 text-primary-600 dark:text-primary-400 animate-spin" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-primary-800 dark:text-primary-200 mb-1">
                    Syncing accounts...
                  </div>
                  <div className="w-full bg-primary-200 dark:bg-primary-800 rounded-full h-2">
                    <div
                      className="bg-primary-600 dark:bg-primary-400 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Array.from(syncStatuses.values())
                          .find(status => status.status === 'syncing')?.progress || 0}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Sync Activity
        </h3>

        <div className="space-y-3">
          {Array.from(syncStatuses.entries())
            .filter(([_, status]) => status.details && status.details.length > 0)
            .slice(0, 5)
            .map(([accountId, status]) => {
              const account = accounts.find(acc => acc.id === accountId)
              if (!account) return null

              return (
                <div key={accountId} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {account.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTimeAgo(status.lastSync)}
                      </span>
                    </div>
                    {status.details && (
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {status.details.map((detail, index) => (
                          <li key={index}>• {detail}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )
            })}
        </div>

        {Array.from(syncStatuses.values()).every(status => !status.details || status.details.length === 0) && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <WifiIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recent sync activity</p>
            <p className="text-sm">Accounts will sync automatically every few hours</p>
          </div>
        )}
      </Card>
    </div>
  )
}
