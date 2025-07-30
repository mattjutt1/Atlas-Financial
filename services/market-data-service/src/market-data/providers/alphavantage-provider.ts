/**
 * Alpha Vantage Market Data Provider
 * Production-ready implementation with comprehensive error handling and rate limiting
 */

import axios, { AxiosInstance } from 'axios';
import { MarketDataProvider, ProviderConfig, MarketDataPoint, HistoricalDataPoint } from './base-provider';
import { logger } from '../../utils/logger';

export interface AlphaVantageConfig extends ProviderConfig {
  apiKey: string;
  baseURL: string;
  timeout?: number;
}

export class AlphaVantageProvider extends MarketDataProvider {
  private client: AxiosInstance;
  private readonly rateLimitPerMinute = 5; // Alpha Vantage free tier limit
  private requestCount = 0;
  private lastResetTime = Date.now();

  constructor(config: AlphaVantageConfig) {
    super('alphavantage', config);
    
    if (!config.apiKey) {
      throw new Error('Alpha Vantage API key is required');
    }

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'User-Agent': 'Atlas-Financial-Market-Data/1.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for rate limiting
    this.client.interceptors.request.use(
      (config) => {
        const now = Date.now();
        
        // Reset rate limit counter every minute
        if (now - this.lastResetTime > 60000) {
          this.requestCount = 0;
          this.lastResetTime = now;
        }
        
        // Check rate limit
        if (this.requestCount >= this.rateLimitPerMinute) {
          throw new Error('Rate limit exceeded - Alpha Vantage allows 5 requests per minute');
        }
        
        this.requestCount++;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        // Check for API-specific errors
        if (response.data && response.data['Error Message']) {
          throw new Error(response.data['Error Message']);
        }
        
        if (response.data && response.data['Information']) {
          throw new Error(`API Information: ${response.data['Information']}`);
        }
        
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(`Alpha Vantage API error: ${error.response.status} - ${error.response.data}`);
        } else if (error.request) {
          logger.error('Alpha Vantage API request timeout or network error');
        }
        return Promise.reject(error);
      }
    );
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a simple API call
      const response = await this.client.get('', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: 'AAPL',
          apikey: (this.config as AlphaVantageConfig).apiKey,
        },
      });

      if (response.status === 200) {
        this.connected = true;
        this.emit('connected');
        logger.info('Connected to Alpha Vantage API');
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
      
    } catch (error) {
      this.connected = false;
      this.emit('error', { provider: this.name, error });
      logger.error('Failed to connect to Alpha Vantage:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('disconnected');
    logger.info('Disconnected from Alpha Vantage API');
  }

  async getRealTimePrice(symbol: string): Promise<MarketDataPoint | null> {
    if (!this.connected) {
      throw new Error('Provider not connected');
    }

    try {
      const response = await this.client.get('', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol.toUpperCase(),
          apikey: (this.config as AlphaVantageConfig).apiKey,
        },
      });

      const quote = response.data['Global Quote'];
      
      if (!quote || Object.keys(quote).length === 0) {
        logger.warn(`No data received for symbol ${symbol}`);
        return null;
      }

      // Extract data from Alpha Vantage response format
      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change']);
      const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
      const volume = parseInt(quote['06. volume']);

      const marketData: MarketDataPoint = {
        symbol: symbol.toUpperCase(),
        price,
        change,
        changePercent,
        volume,
        timestamp: Date.now(),
        source: this.name,
        metadata: {
          open: parseFloat(quote['02. open']),
          high: parseFloat(quote['03. high']),
          low: parseFloat(quote['04. low']),
          previousClose: parseFloat(quote['08. previous close']),
          latestTradingDay: quote['07. latest trading day'],
        },
      };

      this.emit('data', marketData);
      return marketData;
      
    } catch (error) {
      logger.error(`Error fetching real-time price for ${symbol}:`, error);
      this.emit('error', { provider: this.name, error, symbol });
      return null;
    }
  }

  async getHistoricalData(symbol: string, days: number = 30): Promise<HistoricalDataPoint[]> {
    if (!this.connected) {
      throw new Error('Provider not connected');
    }

    try {
      // Use TIME_SERIES_DAILY for historical data
      const response = await this.client.get('', {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol: symbol.toUpperCase(),
          outputsize: days > 100 ? 'full' : 'compact',
          apikey: (this.config as AlphaVantageConfig).apiKey,
        },
      });

      const timeSeries = response.data['Time Series (Daily)'];
      
      if (!timeSeries) {
        logger.warn(`No historical data received for symbol ${symbol}`);
        return [];
      }

      // Convert to our format and sort by date (most recent first)
      const historicalData: HistoricalDataPoint[] = [];
      const dates = Object.keys(timeSeries).sort().reverse().slice(0, days);

      for (const date of dates) {
        const dayData = timeSeries[date];
        
        historicalData.push({
          symbol: symbol.toUpperCase(),
          date,
          open: parseFloat(dayData['1. open']),
          high: parseFloat(dayData['2. high']),
          low: parseFloat(dayData['3. low']),
          close: parseFloat(dayData['4. close']),
          volume: parseInt(dayData['5. volume']),
          source: this.name,
        });
      }

      return historicalData;
      
    } catch (error) {
      logger.error(`Error fetching historical data for ${symbol}:`, error);
      this.emit('error', { provider: this.name, error, symbol });
      return [];
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<MarketDataPoint[]> {
    // Alpha Vantage doesn't have a batch quote endpoint in free tier
    // So we'll make individual requests with rate limiting
    const results: MarketDataPoint[] = [];
    
    for (const symbol of symbols) {
      try {
        const quote = await this.getRealTimePrice(symbol);
        if (quote) {
          results.push(quote);
        }
        
        // Add delay between requests to respect rate limits
        if (symbols.indexOf(symbol) < symbols.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds between requests
        }
        
      } catch (error) {
        logger.warn(`Failed to get quote for ${symbol}:`, error);
        continue;
      }
    }
    
    return results;
  }

  async searchSymbols(query: string): Promise<Array<{ symbol: string; name: string; type: string; region: string }>> {
    if (!this.connected) {
      throw new Error('Provider not connected');
    }

    try {
      const response = await this.client.get('', {
        params: {
          function: 'SYMBOL_SEARCH',
          keywords: query,
          apikey: (this.config as AlphaVantageConfig).apiKey,
        },
      });

      const bestMatches = response.data['bestMatches'];
      
      if (!bestMatches || !Array.isArray(bestMatches)) {
        return [];
      }

      return bestMatches.map((match: any) => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        type: match['3. type'],
        region: match['4. region'],
      }));
      
    } catch (error) {
      logger.error(`Error searching symbols for query "${query}":`, error);
      return [];
    }
  }

  getRateLimitInfo(): { remaining: number; resetTime: number } {
    const now = Date.now();
    const timeUntilReset = 60000 - (now - this.lastResetTime);
    const remaining = Math.max(0, this.rateLimitPerMinute - this.requestCount);
    
    return {
      remaining,
      resetTime: timeUntilReset > 0 ? now + timeUntilReset : now,
    };
  }

  async getCompanyOverview(symbol: string): Promise<any> {
    if (!this.connected) {
      throw new Error('Provider not connected');
    }

    try {
      const response = await this.client.get('', {
        params: {
          function: 'OVERVIEW',
          symbol: symbol.toUpperCase(),
          apikey: (this.config as AlphaVantageConfig).apiKey,
        },
      });

      return response.data;
      
    } catch (error) {
      logger.error(`Error fetching company overview for ${symbol}:`, error);
      return null;
    }
  }

  // Health check method
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await this.getRealTimePrice('AAPL');
      const latency = Date.now() - startTime;
      
      return {
        healthy: true,
        latency,
      };
      
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}