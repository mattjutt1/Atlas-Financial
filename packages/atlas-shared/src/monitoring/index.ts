/**
 * Consolidated Monitoring and Observability for Atlas Financial
 * Provides structured logging, metrics, and audit trail functionality
 */

import type { AuditEvent, MetricEvent, MonitoringConfig } from '../types'

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  service: string
  version: string
  context?: string
  metadata?: Record<string, unknown>
  userId?: string
  sessionId?: string
  requestId?: string
  stack?: string
}

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, metadata?: Record<string, unknown>): void
  info(message: string, metadata?: Record<string, unknown>): void
  warn(message: string, metadata?: Record<string, unknown>): void
  error(message: string, metadata?: Record<string, unknown>): void
  child(context: string): ILogger
}

/**
 * Default monitoring configuration
 */
let monitoringConfig: MonitoringConfig = {
  enabled: true,
  level: 'info',
  service: 'atlas-financial',
  version: '1.0.0',
  metrics: {
    enabled: true,
    namespace: 'atlas_financial'
  },
  tracing: {
    enabled: false,
    sampleRate: 0.1
  }
}

/**
 * Set monitoring configuration
 */
export function setMonitoringConfig(config: MonitoringConfig): void {
  monitoringConfig = { ...config }
}

/**
 * Get current monitoring configuration
 */
export function getMonitoringConfig(): MonitoringConfig {
  return monitoringConfig
}

/**
 * Logger implementation
 */
class Logger implements ILogger {
  private context: string
  private baseMetadata: Record<string, unknown>

  constructor(context: string = 'default', baseMetadata: Record<string, unknown> = {}) {
    this.context = context
    this.baseMetadata = baseMetadata
  }

  private shouldLog(level: LogLevel): boolean {
    if (!monitoringConfig.enabled) return false

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(monitoringConfig.level)
    const messageLevel = levels.indexOf(level)

    return messageLevel >= currentLevelIndex
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: monitoringConfig.service,
      version: monitoringConfig.version,
      context: this.context,
      metadata: { ...this.baseMetadata, ...metadata },
      userId: this.baseMetadata.userId as string,
      sessionId: this.baseMetadata.sessionId as string,
      requestId: this.baseMetadata.requestId as string
    }
  }

  private outputLog(logEntry: LogEntry): void {
    if (typeof window !== 'undefined') {
      // Browser environment
      const logMethod = logEntry.level === 'error' ? console.error :
                       logEntry.level === 'warn' ? console.warn :
                       logEntry.level === 'debug' ? console.debug :
                       console.log

      logMethod(`[${logEntry.level.toUpperCase()}] ${logEntry.service}:${logEntry.context} - ${logEntry.message}`, logEntry.metadata)
    } else {
      // Node.js environment - output structured JSON
      console.log(JSON.stringify(logEntry))
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return
    const logEntry = this.createLogEntry('debug', message, metadata)
    this.outputLog(logEntry)
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return
    const logEntry = this.createLogEntry('info', message, metadata)
    this.outputLog(logEntry)
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return
    const logEntry = this.createLogEntry('warn', message, metadata)
    this.outputLog(logEntry)
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return
    const logEntry = this.createLogEntry('error', message, metadata)

    // Add stack trace for errors
    if (metadata?.error instanceof Error) {
      logEntry.stack = metadata.error.stack
    }

    this.outputLog(logEntry)
  }

  child(context: string): ILogger {
    const childContext = this.context ? `${this.context}:${context}` : context
    return new Logger(childContext, this.baseMetadata)
  }
}

/**
 * Create a logger instance
 */
export function createLogger(context: string, metadata?: Record<string, unknown>): ILogger {
  return new Logger(context, metadata)
}

/**
 * Global logger instance
 */
const globalLogger = new Logger('global')

export { globalLogger as logger }

/**
 * Metrics collection
 */
class MetricsCollector {
  private metrics: MetricEvent[] = []

  /**
   * Record a metric
   */
  record(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    if (!monitoringConfig.metrics.enabled) return

    const metric: MetricEvent = {
      name: `${monitoringConfig.metrics.namespace}.${name}`,
      value,
      unit,
      tags,
      timestamp: new Date().toISOString()
    }

    this.metrics.push(metric)

    // In a real implementation, you would send metrics to your monitoring system
    globalLogger.debug('Metric recorded', { metric })
  }

  /**
   * Record a counter metric
   */
  counter(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.record(name, value, 'count', tags)
  }

  /**
   * Record a gauge metric
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record(name, value, 'gauge', tags)
  }

  /**
   * Record a timer metric
   */
  timer(name: string, duration: number, tags?: Record<string, string>): void {
    this.record(name, duration, 'ms', tags)
  }

  /**
   * Record a histogram metric
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.record(name, value, 'histogram', tags)
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): MetricEvent[] {
    return [...this.metrics]
  }

  /**
   * Clear recorded metrics
   */
  clear(): void {
    this.metrics = []
  }
}

/**
 * Global metrics collector
 */
export const metrics = new MetricsCollector()

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private startTimes: Map<string, number> = new Map()

  /**
   * Start timing an operation
   */
  start(operation: string): void {
    this.startTimes.set(operation, Date.now())
  }

  /**
   * End timing and record metric
   */
  end(operation: string, tags?: Record<string, string>): number {
    const startTime = this.startTimes.get(operation)
    if (!startTime) {
      globalLogger.warn('Performance monitor: operation not started', { operation })
      return 0
    }

    const duration = Date.now() - startTime
    this.startTimes.delete(operation)

    metrics.timer(`performance.${operation}`, duration, tags)

    return duration
  }

  /**
   * Time a function execution
   */
  async time<T>(
    operation: string,
    fn: () => Promise<T> | T,
    tags?: Record<string, string>
  ): Promise<T> {
    this.start(operation)
    try {
      const result = await fn()
      this.end(operation, { ...tags, status: 'success' })
      return result
    } catch (error) {
      this.end(operation, { ...tags, status: 'error' })
      throw error
    }
  }
}

/**
 * Global performance monitor
 */
export const performance = new PerformanceMonitor()

/**
 * Audit logging
 */
class AuditLogger {
  private auditLogs: AuditEvent[] = []

  /**
   * Log an audit event
   */
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    const auditEvent: AuditEvent = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      ...event
    }

    this.auditLogs.push(auditEvent)

    // Log audit events at info level
    globalLogger.info('Audit event', { auditEvent })

    // In a real implementation, you would persist audit logs to a secure store
  }

  /**
   * Log user action
   */
  logUserAction(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      userId,
      action,
      resource,
      resourceId,
      metadata
    })
  }

  /**
   * Log system action
   */
  logSystemAction(
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      action,
      resource,
      resourceId,
      metadata
    })
  }

  /**
   * Get audit logs
   */
  getAuditLogs(): AuditEvent[] {
    return [...this.auditLogs]
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Global audit logger
 */
export const audit = new AuditLogger()

/**
 * Error tracking
 */
export function trackError(
  error: Error,
  context?: string,
  metadata?: Record<string, unknown>
): void {
  globalLogger.error('Error tracked', {
    error,
    context,
    message: error.message,
    stack: error.stack,
    ...metadata
  })

  // Record error metric
  metrics.counter('errors.total', 1, {
    context: context || 'unknown',
    errorType: error.constructor.name
  })
}

/**
 * Request tracking middleware
 */
export function createRequestTracker(requestId: string, userId?: string) {
  const startTime = Date.now()

  return {
    logger: createLogger('request', { requestId, userId }),

    end: (statusCode: number, metadata?: Record<string, unknown>) => {
      const duration = Date.now() - startTime

      metrics.timer('request.duration', duration, {
        status: statusCode.toString(),
        userId: userId || 'anonymous'
      })

      metrics.counter('request.total', 1, {
        status: statusCode.toString(),
        userId: userId || 'anonymous'
      })

      globalLogger.info('Request completed', {
        requestId,
        userId,
        statusCode,
        duration,
        ...metadata
      })
    }
  }
}

/**
 * Health check utilities
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  timestamp: string
  checks: Record<string, {
    status: 'pass' | 'fail' | 'warn'
    message?: string
    duration?: number
  }>
}

export class HealthChecker {
  private checks: Map<string, () => Promise<{ status: 'pass' | 'fail' | 'warn', message?: string }>> = new Map()

  /**
   * Register a health check
   */
  register(name: string, check: () => Promise<{ status: 'pass' | 'fail' | 'warn', message?: string }>): void {
    this.checks.set(name, check)
  }

  /**
   * Run all health checks
   */
  async checkHealth(): Promise<HealthStatus> {
    const results: HealthStatus['checks'] = {}
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    for (const [name, check] of this.checks) {
      const startTime = Date.now()
      try {
        const result = await check()
        const duration = Date.now() - startTime

        results[name] = {
          ...result,
          duration
        }

        if (result.status === 'fail') {
          overallStatus = 'unhealthy'
        } else if (result.status === 'warn' && overallStatus === 'healthy') {
          overallStatus = 'degraded'
        }
      } catch (error) {
        const duration = Date.now() - startTime
        results[name] = {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration
        }
        overallStatus = 'unhealthy'
      }
    }

    return {
      status: overallStatus,
      version: monitoringConfig.version,
      timestamp: new Date().toISOString(),
      checks: results
    }
  }
}

/**
 * Global health checker
 */
export const health = new HealthChecker()

/**
 * Initialize monitoring with configuration
 */
export function initializeMonitoring(config: MonitoringConfig): void {
  setMonitoringConfig(config)

  globalLogger.info('Monitoring initialized', {
    config: {
      enabled: config.enabled,
      level: config.level,
      service: config.service,
      version: config.version
    }
  })

  // Register basic health checks
  health.register('service', async () => ({
    status: 'pass',
    message: 'Service is running'
  }))

  if (typeof window === 'undefined') {
    // Node.js specific health checks
    health.register('memory', async () => {
      const usage = process.memoryUsage()
      const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024)
      const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024)

      return {
        status: heapUsedMB > 500 ? 'warn' : 'pass',
        message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB`
      }
    })
  }
}
