/**
 * Real-time AI Portfolio Analyzer
 * Integrates live market data with AI engine for real-time portfolio insights
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { MarketDataPoint } from '../market-data/providers/base-provider';
import { MetricsCollector } from '../monitoring/metrics';

export interface PortfolioHolding {
  symbol: string;
  quantity: number;
  averageCost: number;
  currentValue?: number;
  allocation?: number;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  holdings: PortfolioHolding[];
  totalValue: number;
  totalCost: number;
  riskTolerance: 'low' | 'medium' | 'high';
  lastUpdated: string;
}

export interface AIInsight {
  id: string;
  portfolioId: string;
  type: 'performance' | 'allocation' | 'risk' | 'opportunity' | 'alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  confidence: number;
  data: any;
  timestamp: string;
  actionRequired: boolean;
}

export interface RebalanceRecommendation {
  id: string;
  portfolioId: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  currentAllocation: number;
  targetAllocation: number;
  recommendedAmount: number;
  reasoning: string;
  confidence: number;
  expectedImpact: number;
  priority: number;
}

export interface RealTimeAlert {
  id: string;
  portfolioId: string;
  type: 'price_threshold' | 'volatility_spike' | 'volume_anomaly' | 'news_impact';
  symbol: string;
  message: string;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  actionRequired: boolean;
}

export class RealTimePortfolioAnalyzer extends EventEmitter {
  private redis: Redis;
  private metrics: MetricsCollector;
  private analysisIntervals: Map<string, NodeJS.Timeout> = new Map();
  private portfolioCache: Map<string, Portfolio> = new Map();
  private priceThresholds: Map<string, number[]> = new Map();
  
  private readonly ANALYSIS_INTERVAL = 30000; // 30 seconds
  private readonly PORTFOLIO_CACHE_TTL = 300; // 5 minutes
  private readonly MAX_INSIGHTS_PER_PORTFOLIO = 10;

  constructor(redis?: Redis) {
    super();
    
    this.redis = redis || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
    
    this.metrics = new MetricsCollector();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('market:data', this.handleMarketDataUpdate.bind(this));
    this.on('portfolio:updated', this.handlePortfolioUpdate.bind(this));
    this.on('analysis:complete', this.handleAnalysisComplete.bind(this));
  }

  async start(): Promise<void> {
    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }
      
      // Start analysis for all active portfolios
      await this.initializeActivePortfolios();
      
      logger.info('Real-time portfolio analyzer started');
      this.metrics.recordAnalyzerStart();
      
    } catch (error) {
      logger.error('Failed to start real-time analyzer:', error);
      throw error;
    }
  }

  private async initializeActivePortfolios(): Promise<void> {
    try {
      const portfolioKeys = await this.redis.keys('portfolio:*');
      
      for (const key of portfolioKeys) {
        const portfolioData = await this.redis.hgetall(key);
        
        if (portfolioData && portfolioData.id) {
          const portfolio = this.deserializePortfolio(portfolioData);
          await this.startPortfolioAnalysis(portfolio);
        }
      }
      
      logger.info(`Initialized analysis for ${portfolioKeys.length} portfolios`);
      
    } catch (error) {
      logger.error('Error initializing active portfolios:', error);
    }
  }

  async startPortfolioAnalysis(portfolio: Portfolio): Promise<void> {
    const portfolioId = portfolio.id;
    
    // Cache portfolio data
    this.portfolioCache.set(portfolioId, portfolio);
    
    // Clear existing analysis interval
    if (this.analysisIntervals.has(portfolioId)) {
      clearInterval(this.analysisIntervals.get(portfolioId)!);
    }
    
    // Start new analysis interval
    const interval = setInterval(async () => {
      try {
        await this.analyzePortfolio(portfolioId);
      } catch (error) {
        logger.error(`Error analyzing portfolio ${portfolioId}:`, error);
        this.metrics.incrementErrors('portfolio_analysis');
      }
    }, this.ANALYSIS_INTERVAL);
    
    this.analysisIntervals.set(portfolioId, interval);
    
    // Set up price thresholds for alerts
    await this.setupPriceThresholds(portfolio);
    
    logger.info(`Started real-time analysis for portfolio ${portfolioId}`);
  }

  async stopPortfolioAnalysis(portfolioId: string): Promise<void> {
    if (this.analysisIntervals.has(portfolioId)) {
      clearInterval(this.analysisIntervals.get(portfolioId)!);
      this.analysisIntervals.delete(portfolioId);
    }
    
    this.portfolioCache.delete(portfolioId);
    this.priceThresholds.delete(portfolioId);
    
    logger.info(`Stopped analysis for portfolio ${portfolioId}`);
  }

  private async handleMarketDataUpdate(data: MarketDataPoint): Promise<void> {
    // Check all portfolios that hold this symbol
    for (const [portfolioId, portfolio] of this.portfolioCache) {
      const holding = portfolio.holdings.find(h => h.symbol === data.symbol);
      
      if (holding) {
        // Update holding value
        holding.currentValue = holding.quantity * data.price;
        
        // Check for alerts
        await this.checkPriceAlerts(portfolioId, data);
        await this.checkVolatilityAlerts(portfolioId, data);
        
        // Trigger immediate analysis if significant change
        if (Math.abs(data.changePercent) > 5) {
          await this.analyzePortfolio(portfolioId);
        }
      }
    }
  }

  private async analyzePortfolio(portfolioId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const portfolio = this.portfolioCache.get(portfolioId);
      if (!portfolio) {
        logger.warn(`Portfolio ${portfolioId} not found in cache`);
        return;
      }

      // Get current market data for all holdings
      const updatedPortfolio = await this.updatePortfolioValues(portfolio);
      
      // Generate AI insights
      const insights = await this.generateInsights(updatedPortfolio);
      
      // Generate rebalancing recommendations
      const rebalanceRecs = await this.generateRebalancingRecommendations(updatedPortfolio);
      
      // Store analysis results
      await this.storeAnalysisResults(portfolioId, {
        insights,
        rebalanceRecommendations: rebalanceRecs,
        timestamp: new Date().toISOString(),
      });
      
      // Emit events for WebSocket broadcasting
      this.emit('insights:generated', { portfolioId, insights });
      this.emit('rebalancing:recommendations', { portfolioId, recommendations: rebalanceRecs });
      
      const processingTime = Date.now() - startTime;
      this.metrics.recordAnalysisComplete(portfolioId, processingTime);
      
    } catch (error) {
      logger.error(`Error analyzing portfolio ${portfolioId}:`, error);
      this.metrics.incrementErrors('analysis_error');
    }
  }

  private async updatePortfolioValues(portfolio: Portfolio): Promise<Portfolio> {
    const updatedHoldings: PortfolioHolding[] = [];
    let totalValue = 0;
    
    for (const holding of portfolio.holdings) {
      try {
        // Get current price from Redis cache
        const priceData = await this.redis.hgetall(`market:data:${holding.symbol}`);
        
        if (priceData && priceData.price) {
          const currentPrice = parseFloat(priceData.price);
          const currentValue = holding.quantity * currentPrice;
          
          updatedHoldings.push({
            ...holding,
            currentValue,
          });
          
          totalValue += currentValue;
        } else {
          // Keep existing value if no current price available
          updatedHoldings.push(holding);
          totalValue += holding.currentValue || (holding.quantity * holding.averageCost);
        }
        
      } catch (error) {
        logger.warn(`Error updating value for ${holding.symbol}:`, error);
        updatedHoldings.push(holding);
      }
    }
    
    // Calculate allocations
    updatedHoldings.forEach(holding => {
      holding.allocation = totalValue > 0 ? (holding.currentValue || 0) / totalValue : 0;
    });
    
    return {
      ...portfolio,
      holdings: updatedHoldings,
      totalValue,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async generateInsights(portfolio: Portfolio): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    const now = new Date().toISOString();
    
    try {
      // Performance insights
      const performanceInsight = await this.analyzePerformance(portfolio);
      if (performanceInsight) {
        insights.push({
          ...performanceInsight,
          id: `insight_${Date.now()}_performance`,
          portfolioId: portfolio.id,
          timestamp: now,
        });
      }
      
      // Allocation insights
      const allocationInsight = await this.analyzeAllocation(portfolio);
      if (allocationInsight) {
        insights.push({
          ...allocationInsight,
          id: `insight_${Date.now()}_allocation`,
          portfolioId: portfolio.id,
          timestamp: now,
        });
      }
      
      // Risk insights
      const riskInsight = await this.analyzeRisk(portfolio);
      if (riskInsight) {
        insights.push({
          ...riskInsight,
          id: `insight_${Date.now()}_risk`,
          portfolioId: portfolio.id,
          timestamp: now,
        });
      }
      
      // Market opportunity insights
      const opportunityInsights = await this.identifyOpportunities(portfolio);
      insights.push(...opportunityInsights.map(insight => ({
        ...insight,
        id: `insight_${Date.now()}_opportunity_${Math.random().toString(36).substr(2, 9)}`,
        portfolioId: portfolio.id,
        timestamp: now,
      })));
      
    } catch (error) {
      logger.error('Error generating insights:', error);
    }
    
    return insights.slice(0, this.MAX_INSIGHTS_PER_PORTFOLIO);
  }

  private async analyzePerformance(portfolio: Portfolio): Promise<Partial<AIInsight> | null> {
    const totalReturn = ((portfolio.totalValue - portfolio.totalCost) / portfolio.totalCost) * 100;
    
    // Get benchmark performance (S&P 500 or similar)
    const benchmarkReturn = await this.getBenchmarkReturn();
    const outperformance = totalReturn - benchmarkReturn;
    
    if (Math.abs(outperformance) > 2) { // Significant outperformance/underperformance
      return {
        type: 'performance',
        severity: Math.abs(outperformance) > 10 ? 'high' : 'medium',
        title: outperformance > 0 ? 'Portfolio Outperforming Market' : 'Portfolio Underperforming Market',
        description: `Your portfolio has ${outperformance > 0 ? 'outperformed' : 'underperformed'} the market by ${Math.abs(outperformance).toFixed(2)}%. Current return: ${totalReturn.toFixed(2)}% vs benchmark: ${benchmarkReturn.toFixed(2)}%`,
        confidence: 0.85,
        data: {
          totalReturn,
          benchmarkReturn,
          outperformance,
          totalValue: portfolio.totalValue,
          totalCost: portfolio.totalCost,
        },
        actionRequired: outperformance < -5, // Action required if underperforming by more than 5%
      };
    }
    
    return null;
  }

  private async analyzeAllocation(portfolio: Portfolio): Promise<Partial<AIInsight> | null> {
    // Analyze if portfolio is over-concentrated in any single position
    const maxAllocation = Math.max(...portfolio.holdings.map(h => h.allocation || 0));
    
    if (maxAllocation > 0.3) { // More than 30% in single position
      const concentratedHolding = portfolio.holdings.find(h => h.allocation === maxAllocation);
      
      return {
        type: 'allocation',
        severity: maxAllocation > 0.5 ? 'high' : 'medium',
        title: 'Portfolio Concentration Risk',
        description: `${(maxAllocation * 100).toFixed(1)}% of your portfolio is concentrated in ${concentratedHolding?.symbol}. Consider diversifying to reduce risk.`,
        confidence: 0.9,
        data: {
          concentratedSymbol: concentratedHolding?.symbol,
          concentration: maxAllocation,
          recommendedMaxAllocation: 0.25,
          currentValue: concentratedHolding?.currentValue,
        },
        actionRequired: maxAllocation > 0.4,
      };
    }
    
    return null;
  }

  private async analyzeRisk(portfolio: Portfolio): Promise<Partial<AIInsight> | null> {
    // Calculate portfolio volatility based on recent price movements
    const volatilityScores = await Promise.all(
      portfolio.holdings.map(holding => this.calculateSymbolVolatility(holding.symbol))
    );
    
    const weightedVolatility = portfolio.holdings.reduce((total, holding, index) => {
      return total + (holding.allocation || 0) * volatilityScores[index];
    }, 0);
    
    // Determine risk level based on user's risk tolerance
    const riskThresholds = {
      low: 0.15,
      medium: 0.25,
      high: 0.35,
    };
    
    const threshold = riskThresholds[portfolio.riskTolerance];
    
    if (weightedVolatility > threshold) {
      return {
        type: 'risk',
        severity: weightedVolatility > threshold * 1.5 ? 'high' : 'medium',
        title: 'Portfolio Risk Above Target',
        description: `Current portfolio volatility (${(weightedVolatility * 100).toFixed(1)}%) exceeds your ${portfolio.riskTolerance} risk tolerance target (${(threshold * 100).toFixed(1)}%).`,
        confidence: 0.8,
        data: {
          currentVolatility: weightedVolatility,
          targetVolatility: threshold,
          riskTolerance: portfolio.riskTolerance,
          highRiskHoldings: portfolio.holdings
            .map((holding, index) => ({ ...holding, volatility: volatilityScores[index] }))
            .filter(holding => holding.volatility > threshold)
            .sort((a, b) => b.volatility - a.volatility),
        },
        actionRequired: weightedVolatility > threshold * 1.2,
      };
    }
    
    return null;
  }

  private async identifyOpportunities(portfolio: Portfolio): Promise<Partial<AIInsight>[]> {
    const opportunities: Partial<AIInsight>[] = [];
    
    // Look for rebalancing opportunities
    for (const holding of portfolio.holdings) {
      try {
        const priceData = await this.redis.hgetall(`market:data:${holding.symbol}`);
        
        if (priceData && priceData.changePercent) {
          const changePercent = parseFloat(priceData.changePercent);
          
          // Significant drop might be a buying opportunity
          if (changePercent < -10) {
            opportunities.push({
              type: 'opportunity',
              severity: 'medium',
              title: `Potential Buying Opportunity: ${holding.symbol}`,
              description: `${holding.symbol} is down ${Math.abs(changePercent).toFixed(1)}% today. This could be a good time to add to your position if fundamentals remain strong.`,
              confidence: 0.6,
              data: {
                symbol: holding.symbol,
                changePercent,
                currentPrice: parseFloat(priceData.price),
                currentAllocation: holding.allocation,
              },
              actionRequired: false,
            });
          }
          
          // Significant gain might suggest taking profits
          if (changePercent > 15) {
            opportunities.push({
              type: 'opportunity',
              severity: 'low',
              title: `Consider Taking Profits: ${holding.symbol}`,
              description: `${holding.symbol} is up ${changePercent.toFixed(1)}% today. Consider taking some profits to lock in gains.`,
              confidence: 0.5,
              data: {
                symbol: holding.symbol,
                changePercent,
                currentPrice: parseFloat(priceData.price),
                currentAllocation: holding.allocation,
              },
              actionRequired: false,
            });
          }
        }
        
      } catch (error) {
        logger.warn(`Error analyzing opportunities for ${holding.symbol}:`, error);
      }
    }
    
    return opportunities;
  }

  private async generateRebalancingRecommendations(portfolio: Portfolio): Promise<RebalanceRecommendation[]> {
    const recommendations: RebalanceRecommendation[] = [];
    
    // Simple rebalancing logic - move towards equal weight or target allocation
    const targetAllocation = 1 / portfolio.holdings.length; // Equal weight for simplicity
    const rebalanceThreshold = 0.05; // 5% deviation threshold
    
    for (const holding of portfolio.holdings) {
      const currentAllocation = holding.allocation || 0;
      const deviation = Math.abs(currentAllocation - targetAllocation);
      
      if (deviation > rebalanceThreshold) {
        const action = currentAllocation > targetAllocation ? 'sell' : 'buy';
        const recommendedAmount = Math.abs(portfolio.totalValue * (targetAllocation - currentAllocation));
        
        recommendations.push({
          id: `rebalance_${Date.now()}_${holding.symbol}`,
          portfolioId: portfolio.id,
          symbol: holding.symbol,
          action,
          currentAllocation,
          targetAllocation,
          recommendedAmount,
          reasoning: `Current allocation (${(currentAllocation * 100).toFixed(1)}%) deviates from target (${(targetAllocation * 100).toFixed(1)}%) by ${(deviation * 100).toFixed(1)}%`,
          confidence: 0.7,
          expectedImpact: recommendedAmount * 0.05, // Estimate 5% improvement
          priority: Math.floor(deviation * 10), // Higher deviation = higher priority
        });
      }
    }
    
    return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 5); // Top 5 recommendations
  }

  private async checkPriceAlerts(portfolioId: string, data: MarketDataPoint): Promise<void> {
    const thresholds = this.priceThresholds.get(portfolioId);
    if (!thresholds) return;
    
    // Check for significant price movements
    if (Math.abs(data.changePercent) > 5) {
      const alert: RealTimeAlert = {
        id: `alert_${Date.now()}_${data.symbol}`,
        portfolioId,
        type: 'price_threshold',
        symbol: data.symbol,
        message: `${data.symbol} moved ${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(2)}%`,
        currentValue: data.price,
        threshold: 5,
        severity: Math.abs(data.changePercent) > 10 ? 'high' : 'medium',
        timestamp: new Date().toISOString(),
        actionRequired: Math.abs(data.changePercent) > 10,
      };
      
      await this.storeAlert(alert);
      this.emit('alert:generated', alert);
    }
  }

  private async checkVolatilityAlerts(portfolioId: string, data: MarketDataPoint): Promise<void> {
    // Check for unusual volume
    const avgVolume = await this.getAverageVolume(data.symbol);
    
    if (avgVolume && data.volume > avgVolume * 2) { // Volume spike
      const alert: RealTimeAlert = {
        id: `alert_${Date.now()}_volume_${data.symbol}`,
        portfolioId,
        type: 'volume_anomaly',
        symbol: data.symbol,
        message: `Unusual volume spike in ${data.symbol}: ${data.volume.toLocaleString()} vs avg ${avgVolume.toLocaleString()}`,
        currentValue: data.volume,
        threshold: avgVolume * 2,
        severity: 'medium',
        timestamp: new Date().toISOString(),
        actionRequired: false,
      };
      
      await this.storeAlert(alert);
      this.emit('alert:generated', alert);
    }
  }

  // Helper methods

  private async getBenchmarkReturn(): Promise<number> {
    // Simplified - get S&P 500 return or use mock data
    try {
      const spyData = await this.redis.hgetall('market:data:SPY');
      return spyData ? parseFloat(spyData.changePercent) : 0;
    } catch {
      return 0; // Default if no benchmark data
    }
  }

  private async calculateSymbolVolatility(symbol: string): Promise<number> {
    // Simplified volatility calculation - use historical price data
    try {
      const historicalPrices = await this.redis.zrange(`market:history:${symbol}`, -30, -1);
      
      if (historicalPrices.length < 10) return 0.2; // Default volatility
      
      const prices = historicalPrices.map(data => JSON.parse(data).close);
      const returns = [];
      
      for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
      
      // Calculate standard deviation
      const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
      
      return Math.sqrt(variance * 252); // Annualized volatility
      
    } catch (error) {
      return 0.2; // Default volatility on error
    }
  }

  private async getAverageVolume(symbol: string): Promise<number | null> {
    try {
      const historicalData = await this.redis.zrange(`market:history:${symbol}`, -20, -1);
      
      if (historicalData.length === 0) return null;
      
      const volumes = historicalData.map(data => JSON.parse(data).volume);
      return volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
      
    } catch (error) {
      return null;
    }
  }

  private async setupPriceThresholds(portfolio: Portfolio): Promise<void> {
    // Set up basic price thresholds for alerts
    const thresholds = portfolio.holdings.map(() => 5); // 5% change threshold
    this.priceThresholds.set(portfolio.id, thresholds);
  }

  private async storeAnalysisResults(portfolioId: string, results: any): Promise<void> {
    const key = `analysis:results:${portfolioId}`;
    await this.redis.hset(key, {
      data: JSON.stringify(results),
      timestamp: new Date().toISOString(),
    });
    await this.redis.expire(key, 3600); // 1 hour TTL
  }

  private async storeAlert(alert: RealTimeAlert): Promise<void> {
    const key = `alerts:${alert.portfolioId}`;
    await this.redis.lpush(key, JSON.stringify(alert));
    await this.redis.ltrim(key, 0, 99); // Keep last 100 alerts
    await this.redis.expire(key, 86400); // 24 hour TTL
  }

  private deserializePortfolio(data: any): Portfolio {
    return {
      id: data.id,
      userId: data.userId,
      name: data.name,
      holdings: JSON.parse(data.holdings || '[]'),
      totalValue: parseFloat(data.totalValue || '0'),
      totalCost: parseFloat(data.totalCost || '0'),
      riskTolerance: data.riskTolerance || 'medium',
      lastUpdated: data.lastUpdated,
    };
  }

  async stop(): Promise<void> {
    logger.info('Stopping real-time portfolio analyzer');
    
    // Clear all analysis intervals
    for (const [portfolioId, interval] of this.analysisIntervals) {
      clearInterval(interval);
    }
    
    this.analysisIntervals.clear();
    this.portfolioCache.clear();
    this.priceThresholds.clear();
    
    logger.info('Real-time portfolio analyzer stopped');
  }
}