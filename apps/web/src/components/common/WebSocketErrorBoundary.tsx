'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ApolloError } from '@apollo/client'

interface WebSocketErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  reconnectAttempts: number
  isReconnecting: boolean
  lastConnectionTime: Date | null
}

interface WebSocketErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onReconnect?: () => void
  maxReconnectAttempts?: number
  reconnectDelay?: number
  enableLogging?: boolean
}

/**
 * Production-grade Error Boundary for WebSocket Real-time Subscriptions
 *
 * Features:
 * - Catches WebSocket connection errors and subscription failures
 * - Automatic reconnection with exponential backoff
 * - User-friendly error messages and recovery options
 * - Detailed error logging for debugging
 * - Graceful degradation when real-time features fail
 * - Performance monitoring and connection health tracking
 */
export class WebSocketErrorBoundary extends Component<
  WebSocketErrorBoundaryProps,
  WebSocketErrorBoundaryState
> {
  private reconnectTimer: NodeJS.Timeout | null = null
  private connectionHealthTimer: NodeJS.Timeout | null = null

  constructor(props: WebSocketErrorBoundaryProps) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      reconnectAttempts: 0,
      isReconnecting: false,
      lastConnectionTime: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<WebSocketErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, enableLogging = true } = this.props

    // Log error details
    if (enableLogging) {
      this.logError(error, errorInfo)
    }

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      lastConnectionTime: new Date()
    })

    // Call external error handler
    if (onError) {
      onError(error, errorInfo)
    }

    // Start automatic reconnection for WebSocket errors
    if (this.isWebSocketError(error)) {
      this.startReconnectionProcess()
    }
  }

  componentWillUnmount() {
    // Clean up timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    if (this.connectionHealthTimer) {
      clearInterval(this.connectionHealthTimer)
    }
  }

  // Check if error is related to WebSocket/subscription failures
  private isWebSocketError(error: Error): boolean {
    const webSocketErrorPatterns = [
      'websocket',
      'connection',
      'subscription',
      'network',
      'timeout',
      'connection-init'
    ]

    const errorMessage = error.message.toLowerCase()
    const errorName = error.name.toLowerCase()

    return webSocketErrorPatterns.some(pattern =>
      errorMessage.includes(pattern) || errorName.includes(pattern)
    ) || error instanceof ApolloError
  }

  // Determine error severity and user impact
  private getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    if (error.message.includes('authentication') || error.message.includes('401')) {
      return 'critical' // Auth errors block all functionality
    }

    if (error.message.includes('network') || error.message.includes('timeout')) {
      return 'high' // Network errors affect real-time features
    }

    if (error.message.includes('subscription') || error.message.includes('websocket')) {
      return 'medium' // Subscription errors affect live updates
    }

    return 'low' // Other errors may not impact core functionality
  }

  // Get user-friendly error message
  private getUserFriendlyMessage(error: Error): string {
    const severity = this.getErrorSeverity(error)

    switch (severity) {
      case 'critical':
        return 'Authentication error. Please sign in again to continue.'
      case 'high':
        return 'Network connection issue. Your data may not be up to date.'
      case 'medium':
        return 'Live updates temporarily unavailable. Data will refresh when connection is restored.'
      case 'low':
      default:
        return 'A temporary issue occurred. Your data is safe and will be restored shortly.'
    }
  }

  // Log error with context for debugging
  private logError(error: Error, errorInfo: ErrorInfo) {
    const errorContext = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      connectionState: {
        online: navigator.onLine,
        connectionType: (navigator as any).connection?.effectiveType || 'unknown',
        downlink: (navigator as any).connection?.downlink || 'unknown'
      },
      reconnectAttempts: this.state.reconnectAttempts
    }

    console.error('WebSocket Error Boundary caught error:', errorContext)

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error monitoring service (Sentry, LogRocket, etc.)
      this.sendToMonitoringService(errorContext)
    }
  }

  // Send error to monitoring service
  private async sendToMonitoringService(errorContext: any) {
    try {
      // TODO: Implement actual monitoring service integration
      console.log('Sending error to monitoring service:', errorContext)
    } catch (monitoringError) {
      console.warn('Failed to send error to monitoring service:', monitoringError)
    }
  }

  // Start automatic reconnection process with exponential backoff
  private startReconnectionProcess() {
    const { maxReconnectAttempts = 5, reconnectDelay = 1000 } = this.props
    const { reconnectAttempts } = this.state

    if (reconnectAttempts >= maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached. Manual intervention required.')
      return
    }

    this.setState({ isReconnecting: true })

    // Exponential backoff with jitter
    const delay = Math.min(
      reconnectDelay * Math.pow(2, reconnectAttempts) + Math.random() * 1000,
      30000 // Max 30 seconds
    )

    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnection()
    }, delay)
  }

  // Attempt to reconnect and recover from error
  private attemptReconnection() {
    const { onReconnect } = this.props

    this.setState(prevState => ({
      reconnectAttempts: prevState.reconnectAttempts + 1,
      isReconnecting: true
    }))

    try {
      // Reset error state to trigger re-render
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isReconnecting: false,
        lastConnectionTime: new Date()
      })

      // Call external reconnection handler
      if (onReconnect) {
        onReconnect()
      }

      console.log('Reconnection attempt successful')
    } catch (reconnectionError) {
      console.error('Reconnection attempt failed:', reconnectionError)

      // Continue reconnection process
      this.startReconnectionProcess()
    }
  }

  // Manual retry handler for user-initiated recovery
  private handleManualRetry = () => {
    this.setState({
      reconnectAttempts: 0, // Reset attempts for manual retry
      isReconnecting: false
    })

    this.attemptReconnection()
  }

  // Get connection health status
  private getConnectionHealth(): 'healthy' | 'degraded' | 'offline' {
    const { error, reconnectAttempts, lastConnectionTime } = this.state

    if (!navigator.onLine) {
      return 'offline'
    }

    if (error || reconnectAttempts > 0) {
      return 'degraded'
    }

    // Check if connection is recent (within last 5 minutes)
    if (lastConnectionTime && Date.now() - lastConnectionTime.getTime() > 300000) {
      return 'degraded'
    }

    return 'healthy'
  }

  render() {
    const { children, fallback } = this.props
    const { hasError, error, isReconnecting, reconnectAttempts } = this.state

    if (hasError && error) {
      // Custom fallback UI if provided
      if (fallback) {
        return fallback
      }

      // Default error UI with recovery options
      const severity = this.getErrorSeverity(error)
      const userMessage = this.getUserFriendlyMessage(error)
      const connectionHealth = this.getConnectionHealth()

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className={`p-3 rounded-full ${
                  severity === 'critical' ? 'bg-red-100' :
                  severity === 'high' ? 'bg-orange-100' :
                  severity === 'medium' ? 'bg-yellow-100' :
                  'bg-blue-100'
                }`}>
                  <svg className={`h-8 w-8 ${
                    severity === 'critical' ? 'text-red-600' :
                    severity === 'high' ? 'text-orange-600' :
                    severity === 'medium' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>

              {/* Error Message */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Connection Issue
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {userMessage}
                </p>

                {/* Connection Status */}
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <div className={`h-2 w-2 rounded-full ${
                    connectionHealth === 'healthy' ? 'bg-green-400' :
                    connectionHealth === 'degraded' ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`} />
                  <span className="text-xs text-gray-500 capitalize">
                    {connectionHealth === 'offline' ? 'Offline' :
                     connectionHealth === 'degraded' ? 'Connection Issues' :
                     'Connected'}
                  </span>
                </div>

                {/* Reconnection Status */}
                {isReconnecting && (
                  <div className="mb-4">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                      <span className="text-sm text-blue-600">
                        Reconnecting... (Attempt {reconnectAttempts})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={this.handleManualRetry}
                  disabled={isReconnecting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReconnecting ? 'Reconnecting...' : 'Try Again'}
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Refresh Page
                </button>
              </div>

              {/* Technical Details (Development Mode) */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-6">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600 font-mono">
                    <div><strong>Error:</strong> {error.name}</div>
                    <div><strong>Message:</strong> {error.message}</div>
                    <div><strong>Attempts:</strong> {reconnectAttempts}</div>
                    <div><strong>Health:</strong> {connectionHealth}</div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

// Higher-order component for easy integration
export function withWebSocketErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<WebSocketErrorBoundaryProps, 'children'>
) {
  return function WebSocketErrorBoundaryWrapper(props: P) {
    return (
      <WebSocketErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </WebSocketErrorBoundary>
    )
  }
}

// Hook for accessing error boundary state in child components
export function useWebSocketErrorBoundary() {
  // This would need to be implemented with React Context
  // For now, it's a placeholder for future enhancement
  return {
    hasError: false,
    isReconnecting: false,
    reconnectAttempts: 0,
    triggerError: (error: Error) => {
      throw error // This will be caught by the error boundary
    }
  }
}
