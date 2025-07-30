/**
 * Base Market Data Provider
 * Abstract class defining the interface for all market data providers
 */

import { EventEmitter } from 'events';

export interface ProviderConfig {
  name?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

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

export interface ProviderHealthStatus {
  healthy: boolean;
  latency?: number;
  error?: string;
  lastCheck?: number;
}

export abstract class MarketDataProvider extends EventEmitter {
  protected connected: boolean = false;
  protected lastHealthCheck: number = 0;
  protected healthStatus: ProviderHealthStatus = { healthy: false };

  constructor(
    public readonly name: string,
    protected config: ProviderConfig
  ) {
    super();
    this.setMaxListeners(100); // Allow many subscribers
  }

  /**
   * Connect to the market data provider
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the market data provider
   */
  abstract disconnect(): Promise<void>;

  /**
   * Get real-time price data for a symbol
   */
  abstract getRealTimePrice(symbol: string): Promise<MarketDataPoint | null>;

  /**
   * Get historical price data for a symbol
   */
  abstract getHistoricalData(symbol: string, days?: number): Promise<HistoricalDataPoint[]>;

  /**
   * Check if the provider is currently connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get provider health status
   */
  getHealthStatus(): ProviderHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Perform health check
   */
  abstract healthCheck(): Promise<ProviderHealthStatus>;

  /**
   * Get multiple quotes in batch (if supported)
   */
  async getMultipleQuotes(symbols: string[]): Promise<MarketDataPoint[]> {
    // Default implementation - make individual requests
    const results: MarketDataPoint[] = [];
    
    for (const symbol of symbols) {
      try {
        const quote = await this.getRealTimePrice(symbol);
        if (quote) {
          results.push(quote);
        }
      } catch (error) {
        this.emit('error', { provider: this.name, error, symbol });
      }
    }
    
    return results;
  }

  /**
   * Search for symbols (if supported)
   */
  async searchSymbols(query: string): Promise<Array<{ symbol: string; name: string; type: string; region: string }>> {
    // Default implementation - not supported
    return [];
  }

  /**
   * Get rate limit information
   */
  getRateLimitInfo(): { remaining: number; resetTime: number } {
    // Default implementation - no rate limiting
    return { remaining: Infinity, resetTime: 0 };
  }

  /**
   * Retry wrapper for network operations
   */
  protected async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.config.retryAttempts || 3,
    delayMs: number = this.config.retryDelayMs || 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        this.emit('retry', { provider: this.name, attempt, error, nextDelay: delay });
      }
    }
    
    throw lastError!;
  }

  /**
   * Validate symbol format
   */
  protected validateSymbol(symbol: string): boolean {
    // Basic validation - override in specific providers if needed
    return /^[A-Z]{1,5}(\.[A-Z]{1,3})?$/.test(symbol.toUpperCase());
  }

  /**
   * Normalize symbol format
   */
  protected normalizeSymbol(symbol: string): string {
    return symbol.toUpperCase().trim();
  }

  /**
   * Update health status
   */
  protected updateHealthStatus(status: ProviderHealthStatus): void {
    this.healthStatus = {
      ...status,
      lastCheck: Date.now(),
    };
    
    this.emit('health:update', { provider: this.name, status: this.healthStatus });
  }

  /**
   * Handle connection events
   */
  protected onConnected(): void {
    this.connected = true;
    this.updateHealthStatus({ healthy: true });
    this.emit('connected', { provider: this.name });
  }

  protected onDisconnected(): void {
    this.connected = false;
    this.updateHealthStatus({ healthy: false });
    this.emit('disconnected', { provider: this.name });
  }

  protected onError(error: Error): void {
    this.updateHealthStatus({ 
      healthy: false, 
      error: error.message 
    });
    this.emit('error', { provider: this.name, error });
  }

  /**
   * Get provider configuration
   */
  getConfig(): Readonly<ProviderConfig> {
    return { ...this.config };
  }

  /**
   * Update provider configuration
   */
  updateConfig(updates: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('config:updated', { provider: this.name, config: this.config });
  }

  /**
   * Get provider statistics
   */
  getStats(): {
    name: string;
    connected: boolean;
    healthStatus: ProviderHealthStatus;
    rateLimitInfo: { remaining: number; resetTime: number };
  } {
    return {
      name: this.name,
      connected: this.connected,
      healthStatus: this.getHealthStatus(),
      rateLimitInfo: this.getRateLimitInfo(),
    };
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    if (this.connected) {
      await this.disconnect();
    }
    
    this.removeAllListeners();
  }
}