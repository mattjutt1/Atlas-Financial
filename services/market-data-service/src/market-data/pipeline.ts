/**
 * Market Data Pipeline
 * Orchestrates data ingestion, validation, normalization, and distribution
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { MetricsCollector } from '../monitoring/metrics';
import { MarketDataProvider } from './providers/base-provider';
import { AlphaVantageProvider } from './providers/alphavantage-provider';
import { IEXCloudProvider } from './providers/iex-provider';
import { DataValidator } from './validation/validator';
import { DataNormalizer } from './normalization/normalizer';
import { RateLimitManager } from './rate-limiting/manager';

export interface MarketDataPoint {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  source: string;
  metadata?: Record<string, any>;
}

export interface HistoricalDataPoint {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date: string;
  source: string;
}

export interface MarketDataConfig {
  providers: {
    primary: string;
    fallback: string[];
  };
  updateIntervals: {
    realtime: number; // milliseconds
    historical: number; // milliseconds
  };
  symbols: string[];
  validation: {
    priceChangeThreshold: number; // Maximum % change to consider valid
    volumeChangeThreshold: number;
    timeoutMs: number;
  };
  storage: {
    enableRedis: boolean;
    enablePersistence: boolean;
    retentionDays: number;
  };
}

export class MarketDataPipeline extends EventEmitter {
  private providers: Map<string, MarketDataProvider> = new Map();
  private validator: DataValidator;
  private normalizer: DataNormalizer;
  private rateLimitManager: RateLimitManager;
  private metrics: MetricsCollector;
  private redis: Redis;
  
  private isRunning = false;
  private realtimeInterval: NodeJS.Timeout | null = null;
  private historicalInterval: NodeJS.Timeout | null = null;
  private failoverInProgress = false;
  
  private readonly REDIS_KEY_PREFIX = 'market:data:';
  private readonly PRICE_HISTORY_KEY = 'market:history:';
  
  constructor(
    private config: MarketDataConfig,
    redis?: Redis
  ) {
    super();
    
    this.redis = redis || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
    
    this.validator = new DataValidator(config.validation);
    this.normalizer = new DataNormalizer();
    this.rateLimitManager = new RateLimitManager();
    this.metrics = new MetricsCollector();
    
    this.initializeProviders();
    this.setupEventHandlers();
  }

  private initializeProviders(): void {
    // Initialize market data providers
    const providers = [
      new AlphaVantageProvider({
        apiKey: process.env.ALPHAVANTAGE_API_KEY || '',
        baseURL: 'https://www.alphavantage.co/query',
        timeout: 5000,
      }),
      new IEXCloudProvider({
        apiKey: process.env.IEX_API_KEY || '',
        baseURL: 'https://cloud.iexapis.com/stable',
        timeout: 5000,
      }),
    ];
    
    providers.forEach(provider => {
      this.providers.set(provider.name, provider);
      provider.on('data', this.handleProviderData.bind(this));
      provider.on('error', this.handleProviderError.bind(this));
    });
    
    logger.info(`Initialized ${providers.length} market data providers`);
  }

  private setupEventHandlers(): void {
    this.on('data:validated', this.handleValidatedData.bind(this));
    this.on('data:normalized', this.handleNormalizedData.bind(this));
    this.on('provider:error', this.handleProviderFailover.bind(this));
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Market data pipeline is already running');
      return;
    }

    try {
      // Connect to Redis if needed
      if (this.config.storage.enableRedis && this.redis.status !== 'ready') {
        await this.redis.connect();
      }

      // Initialize all providers
      await Promise.all(
        Array.from(this.providers.values()).map(provider => provider.connect())
      );

      // Start real-time data collection
      this.startRealtimeCollection();
      
      // Start historical data collection
      this.startHistoricalCollection();
      
      this.isRunning = true;
      this.emit('pipeline:started');
      
      logger.info('Market data pipeline started successfully');
      this.metrics.recordPipelineStart();
      
    } catch (error) {
      logger.error('Failed to start market data pipeline:', error);
      this.metrics.incrementErrors('pipeline_start');
      throw error;
    }
  }

  private startRealtimeCollection(): void {
    if (this.realtimeInterval) {
      clearInterval(this.realtimeInterval);
    }

    this.realtimeInterval = setInterval(async () => {
      try {
        await this.collectRealtimeData();
      } catch (error) {
        logger.error('Error in realtime data collection:', error);
        this.metrics.incrementErrors('realtime_collection');
      }
    }, this.config.updateIntervals.realtime);

    logger.info(`Started realtime collection with ${this.config.updateIntervals.realtime}ms interval`);
  }

  private startHistoricalCollection(): void {
    if (this.historicalInterval) {
      clearInterval(this.historicalInterval);
    }

    this.historicalInterval = setInterval(async () => {
      try {
        await this.collectHistoricalData();
      } catch (error) {
        logger.error('Error in historical data collection:', error);
        this.metrics.incrementErrors('historical_collection');
      }
    }, this.config.updateIntervals.historical);

    logger.info(`Started historical collection with ${this.config.updateIntervals.historical}ms interval`);
  }

  private async collectRealtimeData(): Promise<void> {
    const primaryProvider = this.providers.get(this.config.providers.primary);
    
    if (!primaryProvider || !primaryProvider.isConnected()) {
      logger.warn('Primary provider not available, attempting failover');
      await this.handleProviderFailover();
      return;
    }

    // Check rate limits
    if (!this.rateLimitManager.canMakeRequest(primaryProvider.name)) {
      logger.debug(`Rate limit exceeded for ${primaryProvider.name}, skipping collection`);
      return;
    }

    try {
      const startTime = Date.now();
      
      // Collect data for all configured symbols
      const dataPromises = this.config.symbols.map(symbol =>
        primaryProvider.getRealTimePrice(symbol)
      );
      
      const results = await Promise.allSettled(dataPromises);
      const processingTime = Date.now() - startTime;
      
      // Process successful results
      const successfulData = results
        .filter((result, index) => {
          if (result.status === 'rejected') {
            logger.warn(`Failed to get data for ${this.config.symbols[index]}:`, result.reason);
            this.metrics.incrementErrors('symbol_fetch');
            return false;
          }
          return true;
        })
        .map(result => (result as PromiseFulfilledResult<MarketDataPoint>).value);

      // Record rate limit usage
      this.rateLimitManager.recordRequest(primaryProvider.name);
      
      // Emit collected data for processing
      successfulData.forEach(data => {
        this.emit('data:collected', data);
      });
      
      this.metrics.recordDataCollection('realtime', successfulData.length, processingTime);
      
    } catch (error) {
      logger.error('Error collecting realtime data:', error);
      this.metrics.incrementErrors('realtime_fetch');
      this.emit('provider:error', { provider: primaryProvider.name, error });
    }
  }

  private async collectHistoricalData(): Promise<void> {
    const primaryProvider = this.providers.get(this.config.providers.primary);
    
    if (!primaryProvider || !primaryProvider.isConnected()) {
      return;
    }

    // Only collect historical data periodically to avoid rate limits
    const now = Date.now();
    const lastHistoricalUpdate = await this.getLastHistoricalUpdate();
    
    if (now - lastHistoricalUpdate < this.config.updateIntervals.historical) {
      return;
    }

    try {
      // Collect daily historical data for portfolio analysis
      for (const symbol of this.config.symbols) {
        if (!this.rateLimitManager.canMakeRequest(primaryProvider.name)) {
          logger.debug(`Rate limit reached, pausing historical collection`);
          break;
        }

        const historicalData = await primaryProvider.getHistoricalData(symbol, 30); // 30 days
        
        if (historicalData && historicalData.length > 0) {
          await this.storeHistoricalData(symbol, historicalData);
          this.emit('data:historical', { symbol, data: historicalData });
        }
        
        this.rateLimitManager.recordRequest(primaryProvider.name);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await this.setLastHistoricalUpdate(now);
      this.metrics.recordDataCollection('historical', this.config.symbols.length, 0);
      
    } catch (error) {
      logger.error('Error collecting historical data:', error);
      this.metrics.incrementErrors('historical_fetch');
    }
  }

  private handleProviderData(data: MarketDataPoint): void {
    // Validate the incoming data
    const validationResult = this.validator.validate(data);
    
    if (!validationResult.isValid) {
      logger.warn(`Invalid data for ${data.symbol}:`, validationResult.errors);
      this.metrics.incrementErrors('validation');
      return;
    }

    this.emit('data:validated', data);
  }

  private handleValidatedData(data: MarketDataPoint): void {
    // Normalize the data format
    const normalizedData = this.normalizer.normalize(data);
    this.emit('data:normalized', normalizedData);
  }

  private async handleNormalizedData(data: MarketDataPoint): Promise<void> {
    try {
      // Store in Redis for real-time access
      if (this.config.storage.enableRedis) {
        await this.storeRealtimeData(data);
      }

      // Emit for WebSocket broadcasting
      this.emit('data:ready', data);
      
      this.metrics.recordProcessedData(data.symbol);
      
    } catch (error) {
      logger.error('Error handling normalized data:', error);
      this.metrics.incrementErrors('data_storage');
    }
  }

  private handleProviderError(error: { provider: string; error: Error }): void {
    logger.error(`Provider ${error.provider} error:`, error.error);
    this.metrics.incrementErrors('provider_error');
    this.emit('provider:error', error);
  }

  private async handleProviderFailover(): Promise<void> {
    if (this.failoverInProgress) {
      return;
    }

    this.failoverInProgress = true;
    
    try {
      logger.info('Attempting provider failover');
      
      // Try fallback providers in order
      for (const fallbackName of this.config.providers.fallback) {
        const fallbackProvider = this.providers.get(fallbackName);
        
        if (fallbackProvider && await this.testProviderConnection(fallbackProvider)) {
          // Update primary provider
          this.config.providers.primary = fallbackName;
          logger.info(`Switched to fallback provider: ${fallbackName}`);
          this.metrics.recordProviderFailover(fallbackName);
          break;
        }
      }
      
    } catch (error) {
      logger.error('Failover failed:', error);
      this.metrics.incrementErrors('failover');
    } finally {
      this.failoverInProgress = false;
    }
  }

  private async testProviderConnection(provider: MarketDataProvider): Promise<boolean> {
    try {
      if (!provider.isConnected()) {
        await provider.connect();
      }
      
      // Test with a simple request
      const testData = await provider.getRealTimePrice('AAPL');
      return testData !== null;
      
    } catch (error) {
      logger.debug(`Provider ${provider.name} connection test failed:`, error);
      return false;
    }
  }

  private async storeRealtimeData(data: MarketDataPoint): Promise<void> {
    const key = `${this.REDIS_KEY_PREFIX}${data.symbol}`;
    
    await this.redis.hset(key, {
      price: data.price.toString(),
      change: data.change.toString(),
      changePercent: data.changePercent.toString(),
      volume: data.volume.toString(),
      timestamp: data.timestamp.toString(),
      source: data.source,
      metadata: JSON.stringify(data.metadata || {}),
    });
    
    // Set TTL to prevent stale data
    await this.redis.expire(key, 300); // 5 minutes
  }

  private async storeHistoricalData(symbol: string, data: HistoricalDataPoint[]): Promise<void> {
    const key = `${this.PRICE_HISTORY_KEY}${symbol}`;
    
    // Store as sorted set with date as score
    const pipeline = this.redis.pipeline();
    
    data.forEach(point => {
      const timestamp = new Date(point.date).getTime();
      pipeline.zadd(key, timestamp, JSON.stringify(point));
    });
    
    // Keep only recent data based on retention policy
    const retentionMs = this.config.storage.retentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionMs;
    pipeline.zremrangebyscore(key, 0, cutoffTime);
    
    await pipeline.exec();
  }

  private async getLastHistoricalUpdate(): Promise<number> {
    const timestamp = await this.redis.get('market:last_historical_update');
    return timestamp ? parseInt(timestamp) : 0;
  }

  private async setLastHistoricalUpdate(timestamp: number): Promise<void> {
    await this.redis.set('market:last_historical_update', timestamp.toString());
  }

  // Public API methods

  async getCurrentPrice(symbol: string): Promise<MarketDataPoint | null> {
    try {
      const key = `${this.REDIS_KEY_PREFIX}${symbol}`;
      const data = await this.redis.hgetall(key);
      
      if (!data || Object.keys(data).length === 0) {
        return null;
      }
      
      return {
        symbol,
        price: parseFloat(data.price),
        change: parseFloat(data.change),
        changePercent: parseFloat(data.changePercent),
        volume: parseInt(data.volume),
        timestamp: parseInt(data.timestamp),
        source: data.source,
        metadata: JSON.parse(data.metadata || '{}'),
      };
      
    } catch (error) {
      logger.error(`Error getting current price for ${symbol}:`, error);
      return null;
    }
  }

  async getHistoricalPrices(symbol: string, days: number = 30): Promise<HistoricalDataPoint[]> {
    try {
      const key = `${this.PRICE_HISTORY_KEY}${symbol}`;
      const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
      
      const results = await this.redis.zrangebyscore(key, startTime, Date.now());
      
      return results.map(result => JSON.parse(result));
      
    } catch (error) {
      logger.error(`Error getting historical prices for ${symbol}:`, error);
      return [];
    }
  }

  getMetrics(): any {
    return {
      pipeline: this.metrics.getMetrics(),
      providers: Array.from(this.providers.entries()).map(([name, provider]) => ({
        name,
        connected: provider.isConnected(),
        rateLimitStatus: this.rateLimitManager.getStatus(name),
      })),
      config: {
        symbols: this.config.symbols.length,
        primaryProvider: this.config.providers.primary,
        realtimeInterval: this.config.updateIntervals.realtime,
      },
    };
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping market data pipeline');
    
    this.isRunning = false;
    
    // Clear intervals
    if (this.realtimeInterval) {
      clearInterval(this.realtimeInterval);
      this.realtimeInterval = null;
    }
    
    if (this.historicalInterval) {
      clearInterval(this.historicalInterval);
      this.historicalInterval = null;
    }
    
    // Disconnect providers
    await Promise.all(
      Array.from(this.providers.values()).map(provider => provider.disconnect())
    );
    
    this.emit('pipeline:stopped');
    logger.info('Market data pipeline stopped');
  }
}