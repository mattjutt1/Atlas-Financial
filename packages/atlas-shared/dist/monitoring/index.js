/**
 * Consolidated Monitoring and Observability for Atlas Financial
 * Provides structured logging, metrics, and audit trail functionality
 */
/**
 * Default monitoring configuration
 */
let monitoringConfig = {
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
};
/**
 * Set monitoring configuration
 */
export function setMonitoringConfig(config) {
    monitoringConfig = { ...config };
}
/**
 * Get current monitoring configuration
 */
export function getMonitoringConfig() {
    return monitoringConfig;
}
/**
 * Logger implementation
 */
class Logger {
    constructor(context = 'default', baseMetadata = {}) {
        this.context = context;
        this.baseMetadata = baseMetadata;
    }
    shouldLog(level) {
        if (!monitoringConfig.enabled)
            return false;
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(monitoringConfig.level);
        const messageLevel = levels.indexOf(level);
        return messageLevel >= currentLevelIndex;
    }
    createLogEntry(level, message, metadata) {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            service: monitoringConfig.service,
            version: monitoringConfig.version,
            context: this.context,
            metadata: { ...this.baseMetadata, ...metadata },
            userId: this.baseMetadata.userId,
            sessionId: this.baseMetadata.sessionId,
            requestId: this.baseMetadata.requestId
        };
    }
    outputLog(logEntry) {
        if (typeof window !== 'undefined') {
            // Browser environment
            const logMethod = logEntry.level === 'error' ? console.error :
                logEntry.level === 'warn' ? console.warn :
                    logEntry.level === 'debug' ? console.debug :
                        console.log;
            logMethod(`[${logEntry.level.toUpperCase()}] ${logEntry.service}:${logEntry.context} - ${logEntry.message}`, logEntry.metadata);
        }
        else {
            // Node.js environment - output structured JSON
            console.log(JSON.stringify(logEntry));
        }
    }
    debug(message, metadata) {
        if (!this.shouldLog('debug'))
            return;
        const logEntry = this.createLogEntry('debug', message, metadata);
        this.outputLog(logEntry);
    }
    info(message, metadata) {
        if (!this.shouldLog('info'))
            return;
        const logEntry = this.createLogEntry('info', message, metadata);
        this.outputLog(logEntry);
    }
    warn(message, metadata) {
        if (!this.shouldLog('warn'))
            return;
        const logEntry = this.createLogEntry('warn', message, metadata);
        this.outputLog(logEntry);
    }
    error(message, metadata) {
        if (!this.shouldLog('error'))
            return;
        const logEntry = this.createLogEntry('error', message, metadata);
        // Add stack trace for errors
        if (metadata?.error instanceof Error) {
            logEntry.stack = metadata.error.stack;
        }
        this.outputLog(logEntry);
    }
    child(context) {
        const childContext = this.context ? `${this.context}:${context}` : context;
        return new Logger(childContext, this.baseMetadata);
    }
}
/**
 * Create a logger instance
 */
export function createLogger(context, metadata) {
    return new Logger(context, metadata);
}
/**
 * Global logger instance
 */
const globalLogger = new Logger('global');
export { globalLogger as logger };
/**
 * Metrics collection
 */
class MetricsCollector {
    constructor() {
        this.metrics = [];
    }
    /**
     * Record a metric
     */
    record(name, value, unit, tags) {
        if (!monitoringConfig.metrics.enabled)
            return;
        const metric = {
            name: `${monitoringConfig.metrics.namespace}.${name}`,
            value,
            unit,
            tags,
            timestamp: new Date().toISOString()
        };
        this.metrics.push(metric);
        // In a real implementation, you would send metrics to your monitoring system
        globalLogger.debug('Metric recorded', { metric });
    }
    /**
     * Record a counter metric
     */
    counter(name, value = 1, tags) {
        this.record(name, value, 'count', tags);
    }
    /**
     * Record a gauge metric
     */
    gauge(name, value, tags) {
        this.record(name, value, 'gauge', tags);
    }
    /**
     * Record a timer metric
     */
    timer(name, duration, tags) {
        this.record(name, duration, 'ms', tags);
    }
    /**
     * Record a histogram metric
     */
    histogram(name, value, tags) {
        this.record(name, value, 'histogram', tags);
    }
    /**
     * Get all recorded metrics
     */
    getMetrics() {
        return [...this.metrics];
    }
    /**
     * Clear recorded metrics
     */
    clear() {
        this.metrics = [];
    }
}
/**
 * Global metrics collector
 */
export const metrics = new MetricsCollector();
/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
    constructor() {
        this.startTimes = new Map();
    }
    /**
     * Start timing an operation
     */
    start(operation) {
        this.startTimes.set(operation, performance.now());
    }
    /**
     * End timing and record metric
     */
    end(operation, tags) {
        const startTime = this.startTimes.get(operation);
        if (!startTime) {
            globalLogger.warn('Performance monitor: operation not started', { operation });
            return 0;
        }
        const duration = performance.now() - startTime;
        this.startTimes.delete(operation);
        metrics.timer(`performance.${operation}`, duration, tags);
        return duration;
    }
    /**
     * Time a function execution
     */
    async time(operation, fn, tags) {
        this.start(operation);
        try {
            const result = await fn();
            this.end(operation, { ...tags, status: 'success' });
            return result;
        }
        catch (error) {
            this.end(operation, { ...tags, status: 'error' });
            throw error;
        }
    }
}
/**
 * Global performance monitor
 */
export const performance = new PerformanceMonitor();
/**
 * Audit logging
 */
class AuditLogger {
    constructor() {
        this.auditLogs = [];
    }
    /**
     * Log an audit event
     */
    log(event) {
        const auditEvent = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            ...event
        };
        this.auditLogs.push(auditEvent);
        // Log audit events at info level
        globalLogger.info('Audit event', { auditEvent });
        // In a real implementation, you would persist audit logs to a secure store
    }
    /**
     * Log user action
     */
    logUserAction(userId, action, resource, resourceId, metadata) {
        this.log({
            userId,
            action,
            resource,
            resourceId,
            metadata
        });
    }
    /**
     * Log system action
     */
    logSystemAction(action, resource, resourceId, metadata) {
        this.log({
            action,
            resource,
            resourceId,
            metadata
        });
    }
    /**
     * Get audit logs
     */
    getAuditLogs() {
        return [...this.auditLogs];
    }
    generateId() {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
/**
 * Global audit logger
 */
export const audit = new AuditLogger();
/**
 * Error tracking
 */
export function trackError(error, context, metadata) {
    globalLogger.error('Error tracked', {
        error,
        context,
        message: error.message,
        stack: error.stack,
        ...metadata
    });
    // Record error metric
    metrics.counter('errors.total', 1, {
        context: context || 'unknown',
        errorType: error.constructor.name
    });
}
/**
 * Request tracking middleware
 */
export function createRequestTracker(requestId, userId) {
    const startTime = performance.now();
    return {
        logger: createLogger('request', { requestId, userId }),
        end: (statusCode, metadata) => {
            const duration = performance.now() - startTime;
            metrics.timer('request.duration', duration, {
                status: statusCode.toString(),
                userId: userId || 'anonymous'
            });
            metrics.counter('request.total', 1, {
                status: statusCode.toString(),
                userId: userId || 'anonymous'
            });
            globalLogger.info('Request completed', {
                requestId,
                userId,
                statusCode,
                duration,
                ...metadata
            });
        }
    };
}
export class HealthChecker {
    constructor() {
        this.checks = new Map();
    }
    /**
     * Register a health check
     */
    register(name, check) {
        this.checks.set(name, check);
    }
    /**
     * Run all health checks
     */
    async checkHealth() {
        const results = {};
        let overallStatus = 'healthy';
        for (const [name, check] of this.checks) {
            const startTime = performance.now();
            try {
                const result = await check();
                const duration = performance.now() - startTime;
                results[name] = {
                    ...result,
                    duration
                };
                if (result.status === 'fail') {
                    overallStatus = 'unhealthy';
                }
                else if (result.status === 'warn' && overallStatus === 'healthy') {
                    overallStatus = 'degraded';
                }
            }
            catch (error) {
                const duration = performance.now() - startTime;
                results[name] = {
                    status: 'fail',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    duration
                };
                overallStatus = 'unhealthy';
            }
        }
        return {
            status: overallStatus,
            version: monitoringConfig.version,
            timestamp: new Date().toISOString(),
            checks: results
        };
    }
}
/**
 * Global health checker
 */
export const health = new HealthChecker();
/**
 * Initialize monitoring with configuration
 */
export function initializeMonitoring(config) {
    setMonitoringConfig(config);
    globalLogger.info('Monitoring initialized', {
        config: {
            enabled: config.enabled,
            level: config.level,
            service: config.service,
            version: config.version
        }
    });
    // Register basic health checks
    health.register('service', async () => ({
        status: 'pass',
        message: 'Service is running'
    }));
    if (typeof window === 'undefined') {
        // Node.js specific health checks
        health.register('memory', async () => {
            const usage = process.memoryUsage();
            const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
            const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
            return {
                status: heapUsedMB > 500 ? 'warn' : 'pass',
                message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB`
            };
        });
    }
}
//# sourceMappingURL=index.js.map
