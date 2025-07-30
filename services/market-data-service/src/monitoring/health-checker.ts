/**
 * Market Data Service Health Checker
 * Comprehensive health monitoring for all system components
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { MarketDataProvider } from '../market-data/providers/base-provider';
import { MarketDataPipeline } from '../market-data/pipeline';
import { RealTimePortfolioAnalyzer } from '../ai-integration/realtime-analyzer';

export interface ComponentHealthStatus {
  name: string;
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  lastCheck: number;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  components: ComponentHealthStatus[];
  uptime: number;
  lastUpdate: number;
  metrics: {
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    averageResponseTime: number;
  };
}

export interface HealthCheckAlert {
  id: string;
  component: string;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  resolutionTime?: number;
}

export class HealthChecker extends EventEmitter {
  private redis: Redis;
  private providers: Map<string, MarketDataProvider> = new Map();
  private pipeline: MarketDataPipeline | null = null;
  private analyzer: RealTimePortfolioAnalyzer | null = null;
  
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private alertThresholds: Map<string, number> = new Map();
  private activeAlerts: Map<string, HealthCheckAlert> = new Map();
  private healthHistory: ComponentHealthStatus[][] = [];
  private metrics = {
    totalChecks: 0,
    successfulChecks: 0,
    failedChecks: 0,
    responseTimeSum: 0,
  };
  
  private readonly CHECK_INTERVAL = 30000; // 30 seconds
  private readonly HISTORY_RETENTION = 100; // Keep last 100 health checks
  private readonly ALERT_COOLDOWN = 300000; // 5 minutes between same alerts

  constructor(redis?: Redis) {
    super();
    
    this.redis = redis || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 5000,
      lazyConnect: true,
    });

    this.setupDefaultThresholds();
    this.setupEventHandlers();
  }

  private setupDefaultThresholds(): void {
    // Response time thresholds in milliseconds
    this.alertThresholds.set('redis_response_time', 100);
    this.alertThresholds.set('provider_response_time', 5000);
    this.alertThresholds.set('pipeline_processing_time', 1000);
    this.alertThresholds.set('analyzer_processing_time', 2000);
    this.alertThresholds.set('websocket_connection_count', 10000);
  }

  private setupEventHandlers(): void {
    this.on('health:degraded', this.handleHealthDegraded.bind(this));
    this.on('health:unhealthy', this.handleHealthUnhealthy.bind(this));
    this.on('health:critical', this.handleHealthCritical.bind(this));
    this.on('alert:triggered', this.handleAlertTriggered.bind(this));
  }

  async start(): Promise<void> {
    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }

      // Start periodic health checks
      this.healthCheckInterval = setInterval(async () => {
        try {
          await this.performHealthCheck();
        } catch (error) {
          logger.error('Error performing health check:', error);
        }
      }, this.CHECK_INTERVAL);

      // Perform initial health check
      await this.performHealthCheck();

      logger.info('Health checker started');
      this.emit('health_checker:started');

    } catch (error) {
      logger.error('Failed to start health checker:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    logger.info('Health checker stopped');
    this.emit('health_checker:stopped');
  }

  // Register components to monitor
  registerProvider(provider: MarketDataProvider): void {
    this.providers.set(provider.name, provider);
    logger.debug(`Registered provider for health monitoring: ${provider.name}`);
  }

  registerPipeline(pipeline: MarketDataPipeline): void {
    this.pipeline = pipeline;
    logger.debug('Registered market data pipeline for health monitoring');
  }

  registerAnalyzer(analyzer: RealTimePortfolioAnalyzer): void {
    this.analyzer = analyzer;
    logger.debug('Registered portfolio analyzer for health monitoring');
  }

  private async performHealthCheck(): Promise<SystemHealthStatus> {
    const startTime = Date.now();
    const componentStatuses: ComponentHealthStatus[] = [];

    try {
      // Check Redis connectivity
      const redisStatus = await this.checkRedisHealth();
      componentStatuses.push(redisStatus);

      // Check market data providers
      for (const [name, provider] of this.providers) {
        const providerStatus = await this.checkProviderHealth(name, provider);
        componentStatuses.push(providerStatus);
      }

      // Check market data pipeline
      if (this.pipeline) {
        const pipelineStatus = await this.checkPipelineHealth();
        componentStatuses.push(pipelineStatus);
      }

      // Check portfolio analyzer
      if (this.analyzer) {
        const analyzerStatus = await this.checkAnalyzerHealth();
        componentStatuses.push(analyzerStatus);
      }

      // Check WebSocket server
      const websocketStatus = await this.checkWebSocketHealth();
      componentStatuses.push(websocketStatus);

      // Calculate overall system health
      const overallStatus = this.calculateOverallHealth(componentStatuses);
      const totalResponseTime = Date.now() - startTime;

      // Update metrics
      this.metrics.totalChecks++;
      this.metrics.responseTimeSum += totalResponseTime;
      
      if (overallStatus === 'healthy' || overallStatus === 'degraded') {
        this.metrics.successfulChecks++;
      } else {
        this.metrics.failedChecks++;
      }

      const systemHealth: SystemHealthStatus = {
        overall: overallStatus,
        components: componentStatuses,
        uptime: process.uptime(),
        lastUpdate: Date.now(),
        metrics: {
          totalChecks: this.metrics.totalChecks,
          successfulChecks: this.metrics.successfulChecks,
          failedChecks: this.metrics.failedChecks,
          averageResponseTime: this.metrics.responseTimeSum / this.metrics.totalChecks,
        },
      };

      // Store health status
      await this.storeHealthStatus(systemHealth);

      // Add to history
      this.healthHistory.push(componentStatuses);
      if (this.healthHistory.length > this.HISTORY_RETENTION) {
        this.healthHistory.shift();
      }

      // Trigger alerts if needed
      await this.checkForAlerts(componentStatuses);

      // Emit health status
      this.emit('health:updated', systemHealth);

      return systemHealth;

    } catch (error) {
      logger.error('Error performing health check:', error);
      this.metrics.totalChecks++;
      this.metrics.failedChecks++;
      
      throw error;
    }
  }

  private async checkRedisHealth(): Promise<ComponentHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test Redis connectivity with ping
      await this.redis.ping();
      
      // Test write/read operation
      const testKey = `health_check_${Date.now()}`;
      await this.redis.setex(testKey, 10, 'test');
      const result = await this.redis.get(testKey);
      await this.redis.del(testKey);
      
      if (result !== 'test') {
        throw new Error('Redis read/write test failed');
      }

      const responseTime = Date.now() - startTime;
      const threshold = this.alertThresholds.get('redis_response_time') || 100;

      return {
        name: 'redis',
        healthy: true,
        status: responseTime > threshold ? 'degraded' : 'healthy',
        lastCheck: Date.now(),
        responseTime,
        details: {
          connected: this.redis.status === 'ready',
          responseTime,
          threshold,
        },
      };

    } catch (error) {
      return {
        name: 'redis',
        healthy: false,
        status: 'critical',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        error: error.message,
        details: {
          connected: false,
          status: this.redis.status,
        },
      };
    }
  }

  private async checkProviderHealth(name: string, provider: MarketDataProvider): Promise<ComponentHealthStatus> {
    const startTime = Date.now();
    
    try {
      if (!provider.isConnected()) {
        return {
          name: `provider_${name}`,
          healthy: false,
          status: 'unhealthy',
          lastCheck: Date.now(),
          error: 'Provider not connected',
          details: {
            connected: false,
            rateLimitInfo: provider.getRateLimitInfo(),
          },
        };
      }

      // Perform provider-specific health check
      const healthResult = await provider.healthCheck();
      const responseTime = Date.now() - startTime;
      const threshold = this.alertThresholds.get('provider_response_time') || 5000;

      let status: ComponentHealthStatus['status'] = 'healthy';
      if (!healthResult.healthy) {
        status = 'unhealthy';
      } else if (responseTime > threshold) {
        status = 'degraded';
      }

      return {
        name: `provider_${name}`,
        healthy: healthResult.healthy,
        status,
        lastCheck: Date.now(),
        responseTime,
        error: healthResult.error,
        details: {
          connected: provider.isConnected(),
          providerLatency: healthResult.latency,
          rateLimitInfo: provider.getRateLimitInfo(),
          threshold,
        },
      };

    } catch (error) {
      return {
        name: `provider_${name}`,
        healthy: false,
        status: 'critical',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        error: error.message,
        details: {
          connected: provider.isConnected(),
        },
      };
    }
  }

  private async checkPipelineHealth(): Promise<ComponentHealthStatus> {
    try {
      if (!this.pipeline) {
        return {
          name: 'market_data_pipeline',
          healthy: false,
          status: 'critical',
          lastCheck: Date.now(),
          error: 'Pipeline not initialized',
        };
      }

      const metrics = this.pipeline.getMetrics();
      const processingErrors = metrics.pipeline.errors || 0;
      const totalOperations = metrics.pipeline.operations || 1;
      const errorRate = processingErrors / totalOperations;

      let status: ComponentHealthStatus['status'] = 'healthy';
      if (errorRate > 0.1) { // More than 10% error rate
        status = 'unhealthy';
      } else if (errorRate > 0.05) { // More than 5% error rate
        status = 'degraded';
      }

      return {
        name: 'market_data_pipeline',
        healthy: errorRate <= 0.1,
        status,
        lastCheck: Date.now(),
        details: {
          errorRate,
          totalOperations,
          processingErrors,
          activeProviders: metrics.providers?.filter(p => p.connected).length || 0,
          trackedSymbols: metrics.config?.symbols || 0,
        },
      };

    } catch (error) {
      return {
        name: 'market_data_pipeline',
        healthy: false,
        status: 'critical',
        lastCheck: Date.now(),
        error: error.message,
      };
    }
  }

  private async checkAnalyzerHealth(): Promise<ComponentHealthStatus> {
    try {
      // Check if analyzer is responsive by testing analysis capabilities
      // This is a simplified check - in production, you might want more comprehensive tests
      
      return {
        name: 'portfolio_analyzer',
        healthy: true,
        status: 'healthy',
        lastCheck: Date.now(),
        details: {
          // Add analyzer-specific metrics here
          activeAnalyses: 0, // Would be tracked by the analyzer
          averageProcessingTime: 0,
        },
      };

    } catch (error) {
      return {
        name: 'portfolio_analyzer',
        healthy: false,
        status: 'critical',
        lastCheck: Date.now(),
        error: error.message,
      };
    }
  }

  private async checkWebSocketHealth(): Promise<ComponentHealthStatus> {
    try {
      // Check WebSocket server metrics from Redis or monitoring system
      const connectionCount = await this.getWebSocketConnectionCount();
      const threshold = this.alertThresholds.get('websocket_connection_count') || 10000;

      let status: ComponentHealthStatus['status'] = 'healthy';
      if (connectionCount > threshold * 0.9) {
        status = 'degraded';
      }

      return {
        name: 'websocket_server',
        healthy: true,
        status,
        lastCheck: Date.now(),
        details: {
          connectionCount,
          threshold,
          memoryUsage: process.memoryUsage(),
        },
      };

    } catch (error) {
      return {
        name: 'websocket_server',
        healthy: false,
        status: 'unhealthy',
        lastCheck: Date.now(),
        error: error.message,
      };
    }
  }

  private calculateOverallHealth(components: ComponentHealthStatus[]): SystemHealthStatus['overall'] {
    if (components.length === 0) return 'critical';

    const criticalComponents = components.filter(c => c.status === 'critical').length;
    const unhealthyComponents = components.filter(c => c.status === 'unhealthy').length;
    const degradedComponents = components.filter(c => c.status === 'degraded').length;

    if (criticalComponents > 0) return 'critical';
    if (unhealthyComponents > 0) return 'unhealthy';
    if (degradedComponents > 0) return 'degraded';
    
    return 'healthy';
  }

  private async checkForAlerts(components: ComponentHealthStatus[]): Promise<void> {
    for (const component of components) {
      if (component.status === 'degraded' || component.status === 'unhealthy' || component.status === 'critical') {
        await this.triggerAlert(component);
      } else if (component.healthy) {
        // Resolve any existing alerts for this component
        await this.resolveAlert(component.name);
      }
    }
  }

  private async triggerAlert(component: ComponentHealthStatus): Promise<void> {
    const alertId = `alert_${component.name}_${component.status}`;
    const existingAlert = this.activeAlerts.get(alertId);

    // Check cooldown period
    if (existingAlert && (Date.now() - existingAlert.timestamp) < this.ALERT_COOLDOWN) {
      return;
    }

    const severity = component.status === 'critical' ? 'critical' : 
                    component.status === 'unhealthy' ? 'error' : 'warning';

    const alert: HealthCheckAlert = {
      id: alertId,
      component: component.name,
      severity,
      message: component.error || `Component ${component.name} is ${component.status}`,
      timestamp: Date.now(),
      resolved: false,
    };

    this.activeAlerts.set(alertId, alert);
    await this.storeAlert(alert);

    this.emit('alert:triggered', alert);
    this.emit(`health:${component.status}`, { component, alert });

    logger.warn(`Health alert triggered: ${alert.message}`, {
      component: component.name,
      status: component.status,
      alertId,
    });
  }

  private async resolveAlert(componentName: string): Promise<void> {
    const alertKeys = Array.from(this.activeAlerts.keys()).filter(key => 
      key.startsWith(`alert_${componentName}_`)
    );

    for (const alertKey of alertKeys) {
      const alert = this.activeAlerts.get(alertKey);
      if (alert && !alert.resolved) {
        alert.resolved = true;
        alert.resolutionTime = Date.now();
        
        await this.storeAlert(alert);
        this.activeAlerts.delete(alertKey);
        
        this.emit('alert:resolved', alert);
        
        logger.info(`Health alert resolved: ${alert.message}`, {
          component: componentName,
          alertId: alertKey,
          duration: alert.resolutionTime - alert.timestamp,
        });
      }
    }
  }

  private async getWebSocketConnectionCount(): Promise<number> {
    try {
      // Get connection count from WebSocket server metrics stored in Redis
      const count = await this.redis.get('websocket:connection_count');
      return count ? parseInt(count) : 0;
    } catch (error) {
      return 0;
    }
  }

  private async storeHealthStatus(status: SystemHealthStatus): Promise<void> {
    try {
      await this.redis.setex('health:system_status', 300, JSON.stringify(status));
    } catch (error) {
      logger.error('Error storing health status:', error);
    }
  }

  private async storeAlert(alert: HealthCheckAlert): Promise<void> {
    try {
      await this.redis.lpush('health:alerts', JSON.stringify(alert));
      await this.redis.ltrim('health:alerts', 0, 999); // Keep last 1000 alerts
    } catch (error) {
      logger.error('Error storing alert:', error);
    }
  }

  // Event handlers
  private handleHealthDegraded(data: { component: ComponentHealthStatus; alert: HealthCheckAlert }): void {
    // Handle degraded health status
    logger.warn(`Component ${data.component.name} is degraded`);
  }

  private handleHealthUnhealthy(data: { component: ComponentHealthStatus; alert: HealthCheckAlert }): void {
    // Handle unhealthy status
    logger.error(`Component ${data.component.name} is unhealthy`);
    
    // Could trigger automatic recovery actions here
  }

  private handleHealthCritical(data: { component: ComponentHealthStatus; alert: HealthCheckAlert }): void {
    // Handle critical status
    logger.error(`CRITICAL: Component ${data.component.name} is in critical state`);
    
    // Could trigger emergency procedures here
  }

  private handleAlertTriggered(alert: HealthCheckAlert): void {
    // Handle alert triggering - could send notifications, trigger webhooks, etc.
    logger.warn(`Alert triggered: ${alert.message}`);
  }

  // Public API methods
  async getCurrentHealth(): Promise<SystemHealthStatus | null> {
    try {
      const healthData = await this.redis.get('health:system_status');
      return healthData ? JSON.parse(healthData) : null;
    } catch (error) {
      logger.error('Error getting current health:', error);
      return null;
    }
  }

  async getHealthHistory(count: number = 10): Promise<ComponentHealthStatus[][]> {
    return this.healthHistory.slice(-count);
  }

  async getActiveAlerts(): Promise<HealthCheckAlert[]> {
    return Array.from(this.activeAlerts.values());
  }

  async getAlertHistory(count: number = 50): Promise<HealthCheckAlert[]> {
    try {
      const alertsData = await this.redis.lrange('health:alerts', 0, count - 1);
      return alertsData.map(data => JSON.parse(data));
    } catch (error) {
      logger.error('Error getting alert history:', error);
      return [];
    }
  }

  updateAlertThreshold(component: string, threshold: number): void {
    this.alertThresholds.set(component, threshold);
    logger.info(`Updated alert threshold for ${component}: ${threshold}`);
  }

  async forceHealthCheck(): Promise<SystemHealthStatus> {
    return await this.performHealthCheck();
  }
}