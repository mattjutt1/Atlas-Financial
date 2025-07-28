/**
 * Consolidated Monitoring and Observability for Atlas Financial
 * Provides structured logging, metrics, and audit trail functionality
 */
import type { AuditEvent, MetricEvent, MonitoringConfig } from '../types';
/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
/**
 * Structured log entry
 */
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    service: string;
    version: string;
    context?: string;
    metadata?: Record<string, unknown>;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    stack?: string;
}
/**
 * Logger interface
 */
export interface ILogger {
    debug(message: string, metadata?: Record<string, unknown>): void;
    info(message: string, metadata?: Record<string, unknown>): void;
    warn(message: string, metadata?: Record<string, unknown>): void;
    error(message: string, metadata?: Record<string, unknown>): void;
    child(context: string): ILogger;
}
/**
 * Set monitoring configuration
 */
export declare function setMonitoringConfig(config: MonitoringConfig): void;
/**
 * Get current monitoring configuration
 */
export declare function getMonitoringConfig(): MonitoringConfig;
/**
 * Logger implementation
 */
declare class Logger implements ILogger {
    private context;
    private baseMetadata;
    constructor(context?: string, baseMetadata?: Record<string, unknown>);
    private shouldLog;
    private createLogEntry;
    private outputLog;
    debug(message: string, metadata?: Record<string, unknown>): void;
    info(message: string, metadata?: Record<string, unknown>): void;
    warn(message: string, metadata?: Record<string, unknown>): void;
    error(message: string, metadata?: Record<string, unknown>): void;
    child(context: string): ILogger;
}
/**
 * Create a logger instance
 */
export declare function createLogger(context: string, metadata?: Record<string, unknown>): ILogger;
/**
 * Global logger instance
 */
declare const globalLogger: Logger;
export { globalLogger as logger };
/**
 * Metrics collection
 */
declare class MetricsCollector {
    private metrics;
    /**
     * Record a metric
     */
    record(name: string, value: number, unit?: string, tags?: Record<string, string>): void;
    /**
     * Record a counter metric
     */
    counter(name: string, value?: number, tags?: Record<string, string>): void;
    /**
     * Record a gauge metric
     */
    gauge(name: string, value: number, tags?: Record<string, string>): void;
    /**
     * Record a timer metric
     */
    timer(name: string, duration: number, tags?: Record<string, string>): void;
    /**
     * Record a histogram metric
     */
    histogram(name: string, value: number, tags?: Record<string, string>): void;
    /**
     * Get all recorded metrics
     */
    getMetrics(): MetricEvent[];
    /**
     * Clear recorded metrics
     */
    clear(): void;
}
/**
 * Global metrics collector
 */
export declare const metrics: MetricsCollector;
/**
 * Performance monitoring utilities
 */
export declare class PerformanceMonitor {
    private startTimes;
    /**
     * Start timing an operation
     */
    start(operation: string): void;
    /**
     * End timing and record metric
     */
    end(operation: string, tags?: Record<string, string>): number;
    /**
     * Time a function execution
     */
    time<T>(operation: string, fn: () => Promise<T> | T, tags?: Record<string, string>): Promise<T>;
}
/**
 * Global performance monitor
 */
export declare const performance: PerformanceMonitor;
/**
 * Audit logging
 */
declare class AuditLogger {
    private auditLogs;
    /**
     * Log an audit event
     */
    log(event: Omit<AuditEvent, 'id' | 'timestamp'>): void;
    /**
     * Log user action
     */
    logUserAction(userId: string, action: string, resource: string, resourceId?: string, metadata?: Record<string, unknown>): void;
    /**
     * Log system action
     */
    logSystemAction(action: string, resource: string, resourceId?: string, metadata?: Record<string, unknown>): void;
    /**
     * Get audit logs
     */
    getAuditLogs(): AuditEvent[];
    private generateId;
}
/**
 * Global audit logger
 */
export declare const audit: AuditLogger;
/**
 * Error tracking
 */
export declare function trackError(error: Error, context?: string, metadata?: Record<string, unknown>): void;
/**
 * Request tracking middleware
 */
export declare function createRequestTracker(requestId: string, userId?: string): {
    logger: ILogger;
    end: (statusCode: number, metadata?: Record<string, unknown>) => void;
};
/**
 * Health check utilities
 */
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    timestamp: string;
    checks: Record<string, {
        status: 'pass' | 'fail' | 'warn';
        message?: string;
        duration?: number;
    }>;
}
export declare class HealthChecker {
    private checks;
    /**
     * Register a health check
     */
    register(name: string, check: () => Promise<{
        status: 'pass' | 'fail' | 'warn';
        message?: string;
    }>): void;
    /**
     * Run all health checks
     */
    checkHealth(): Promise<HealthStatus>;
}
/**
 * Global health checker
 */
export declare const health: HealthChecker;
/**
 * Initialize monitoring with configuration
 */
export declare function initializeMonitoring(config: MonitoringConfig): void;
//# sourceMappingURL=index.d.ts.map
