'use client'

import { useState } from 'react'
import Link from 'next/link'

interface FinancialInsight {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  actionableSteps: string[]
  category: string
}

interface BrutalHonestyInsightProps {
  insights: FinancialInsight[]
}

export function BrutalHonestyInsight({ insights }: BrutalHonestyInsightProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  if (!insights || insights.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Brutal Honesty AI
          </h3>
        </div>
        
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Analyzing your financial data...
          </p>
          <div className="inline-flex items-center gap-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    )
  }

  const currentInsight = insights[currentIndex]
  
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          color: 'border-danger-500 bg-danger-50 dark:bg-danger-900/20',
          badge: 'bg-danger-500 text-white',
          icon: '🚨',
          label: 'Critical'
        }
      case 'high':
        return {
          color: 'border-warning-500 bg-warning-50 dark:bg-warning-900/20',
          badge: 'bg-warning-500 text-white',
          icon: '⚠️',
          label: 'High Priority'
        }
      case 'medium':
        return {
          color: 'border-primary-500 bg-primary-50 dark:bg-primary-900/20',
          badge: 'bg-primary-500 text-white',
          icon: '💡',
          label: 'Medium Priority'
        }
      default:
        return {
          color: 'border-gray-300 bg-gray-50 dark:bg-gray-800',
          badge: 'bg-gray-500 text-white',
          icon: 'ℹ️',
          label: 'Low Priority'
        }
    }
  }

  const severityConfig = getSeverityConfig(currentInsight.severity)

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Brutal Honesty AI
          </h3>
        </div>
        
        <Link 
          href="/insights"
          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
        >
          View all insights
        </Link>
      </div>

      <div className={`border-l-4 pl-6 pr-4 py-4 rounded-r-lg ${severityConfig.color}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{severityConfig.icon}</span>
            <div>
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${severityConfig.badge} mb-2`}>
                {severityConfig.label}
              </span>
              <h4 className="font-semibold text-gray-900 dark:text-white brutal-text">
                {currentInsight.title}
              </h4>
            </div>
          </div>
          
          {insights.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIndex(prev => prev === 0 ? insights.length - 1 : prev - 1)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentIndex + 1} of {insights.length}
              </span>
              <button
                onClick={() => setCurrentIndex(prev => prev === insights.length - 1 ? 0 : prev + 1)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
          {currentInsight.description}
        </p>

        {currentInsight.actionableSteps && currentInsight.actionableSteps.length > 0 && (
          <div>
            <h5 className="font-medium text-gray-900 dark:text-white mb-2">
              What you need to do:
            </h5>
            <ul className="space-y-1">
              {currentInsight.actionableSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-primary-500 font-bold mt-1">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {insights.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {insights.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex 
                  ? 'bg-primary-500' 
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}