/**
 * Market Data Service GraphQL Schema
 * Real-time subscriptions and market data queries
 */

import { gql } from 'apollo-server-express';
import { PubSub, withFilter } from 'graphql-subscriptions';
import Redis from 'ioredis';
import { RedisPubSub } from 'graphql-redis-subscriptions';

// Create Redis-backed PubSub for scalability
const pubsub = new RedisPubSub({
  publisher: new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  }),
  subscriber: new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  }),
});

// GraphQL Type Definitions
export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # Market Data Types
  type MarketDataPoint {
    symbol: String!
    price: Float!
    change: Float!
    changePercent: Float!
    volume: Int!
    timestamp: DateTime!
    source: String!
    metadata: JSON
  }

  type HistoricalDataPoint {
    symbol: String!
    date: String!
    open: Float!
    high: Float!
    low: Float!
    close: Float!
    volume: Int!
    source: String!
  }

  # Portfolio Types
  type PortfolioHolding {
    symbol: String!
    quantity: Float!
    averageCost: Float!
    currentValue: Float
    allocation: Float
  }

  type Portfolio {
    id: ID!
    userId: String!
    name: String!
    holdings: [PortfolioHolding!]!
    totalValue: Float!
    totalCost: Float!
    riskTolerance: RiskTolerance!
    lastUpdated: DateTime!
  }

  enum RiskTolerance {
    LOW
    MEDIUM
    HIGH
  }

  # AI Analysis Types
  type AIInsight {
    id: ID!
    portfolioId: String!
    type: InsightType!
    severity: Severity!
    title: String!
    description: String!
    confidence: Float!
    data: JSON
    timestamp: DateTime!
    actionRequired: Boolean!
  }

  enum InsightType {
    PERFORMANCE
    ALLOCATION
    RISK
    OPPORTUNITY
    ALERT
  }

  enum Severity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  type RebalanceRecommendation {
    id: ID!
    portfolioId: String!
    symbol: String!
    action: RebalanceAction!
    currentAllocation: Float!
    targetAllocation: Float!
    recommendedAmount: Float!
    reasoning: String!
    confidence: Float!
    expectedImpact: Float!
    priority: Int!
  }

  enum RebalanceAction {
    BUY
    SELL
    HOLD
  }

  type RealTimeAlert {
    id: ID!
    portfolioId: String!
    type: AlertType!
    symbol: String!
    message: String!
    currentValue: Float!
    threshold: Float!
    severity: Severity!
    timestamp: DateTime!
    actionRequired: Boolean!
  }

  enum AlertType {
    PRICE_THRESHOLD
    VOLATILITY_SPIKE
    VOLUME_ANOMALY
    NEWS_IMPACT
  }

  # Portfolio Analysis Results
  type PortfolioAnalysisResult {
    portfolio: Portfolio!
    insights: [AIInsight!]!
    rebalanceRecommendations: [RebalanceRecommendation!]!
    alerts: [RealTimeAlert!]!
    lastAnalyzed: DateTime!
  }

  # Market Data Subscription Filters
  input MarketDataFilter {
    symbols: [String!]
    minChangePercent: Float
    maxChangePercent: Float
    minVolume: Int
  }

  input PortfolioAnalysisFilter {
    portfolioIds: [String!]
    insightTypes: [InsightType!]
    minSeverity: Severity
    actionRequiredOnly: Boolean
  }

  # Queries
  type Query {
    # Market Data Queries
    getCurrentPrice(symbol: String!): MarketDataPoint
    getCurrentPrices(symbols: [String!]!): [MarketDataPoint!]!
    getHistoricalData(symbol: String!, days: Int = 30): [HistoricalDataPoint!]!
    
    # Portfolio Queries
    getPortfolio(portfolioId: String!): Portfolio
    getUserPortfolios(userId: String!): [Portfolio!]!
    
    # Analysis Queries
    getPortfolioAnalysis(portfolioId: String!): PortfolioAnalysisResult
    getPortfolioInsights(portfolioId: String!, limit: Int = 10): [AIInsight!]!
    getRebalanceRecommendations(portfolioId: String!): [RebalanceRecommendation!]!
    getPortfolioAlerts(portfolioId: String!, limit: Int = 20): [RealTimeAlert!]!
    
    # System Queries
    getMarketDataHealth: MarketDataHealthStatus!
    getAnalysisStats: AnalysisStats!
  }

  # Health and Stats Types
  type MarketDataHealthStatus {
    healthy: Boolean!
    connectedProviders: [String!]!
    totalSymbolsTracked: Int!
    lastUpdate: DateTime!
    latency: Float
  }

  type AnalysisStats {
    activePortfolios: Int!
    totalInsightsGenerated: Int!
    totalAlertsTriggered: Int!
    averageAnalysisTime: Float!
    uptime: Float!
  }

  # Mutations
  type Mutation {
    # Portfolio Management
    createPortfolio(input: CreatePortfolioInput!): Portfolio!
    updatePortfolio(portfolioId: String!, input: UpdatePortfolioInput!): Portfolio!
    deletePortfolio(portfolioId: String!): Boolean!
    
    # Analysis Control
    startPortfolioAnalysis(portfolioId: String!): Boolean!
    stopPortfolioAnalysis(portfolioId: String!): Boolean!
    triggerManualAnalysis(portfolioId: String!): PortfolioAnalysisResult!
    
    # Alert Management
    createPriceAlert(input: CreatePriceAlertInput!): Boolean!
    updateAlertSettings(portfolioId: String!, settings: AlertSettingsInput!): Boolean!
    dismissAlert(alertId: String!): Boolean!
    
    # Market Data Control
    subscribeToSymbol(symbol: String!): Boolean!
    unsubscribeFromSymbol(symbol: String!): Boolean!
  }

  # Input Types
  input CreatePortfolioInput {
    userId: String!
    name: String!
    holdings: [PortfolioHoldingInput!]!
    riskTolerance: RiskTolerance!
  }

  input UpdatePortfolioInput {
    name: String
    holdings: [PortfolioHoldingInput!]
    riskTolerance: RiskTolerance
  }

  input PortfolioHoldingInput {
    symbol: String!
    quantity: Float!
    averageCost: Float!
  }

  input CreatePriceAlertInput {
    portfolioId: String!
    symbol: String!
    type: AlertType!
    threshold: Float!
    condition: ComparisonOperator!
  }

  enum ComparisonOperator {
    GREATER_THAN
    LESS_THAN
    PERCENT_CHANGE_UP
    PERCENT_CHANGE_DOWN
  }

  input AlertSettingsInput {
    enablePriceAlerts: Boolean
    enableVolatilityAlerts: Boolean
    enableVolumeAlerts: Boolean
    priceChangeThreshold: Float
    volatilityThreshold: Float
    volumeChangeThreshold: Float
  }

  # Subscriptions
  type Subscription {
    # Real-time Market Data
    marketDataUpdated(filter: MarketDataFilter): MarketDataPoint!
    
    # Portfolio-specific Subscriptions
    portfolioUpdated(portfolioId: String!): Portfolio!
    portfolioInsightsUpdated(portfolioId: String!): [AIInsight!]!
    rebalanceRecommendationsUpdated(portfolioId: String!): [RebalanceRecommendation!]!
    portfolioAlertsTriggered(portfolioId: String!): RealTimeAlert!
    
    # User-specific Subscriptions
    userPortfoliosUpdated(userId: String!): [Portfolio!]!
    userAlertsTriggered(userId: String!): RealTimeAlert!
    
    # System-wide Subscriptions
    marketStatusUpdated: MarketDataHealthStatus!
    
    # Portfolio Analysis Subscription
    portfolioAnalysisCompleted(filter: PortfolioAnalysisFilter): PortfolioAnalysisResult!
  }
`;

// GraphQL Resolvers
export const resolvers = {
  Query: {
    getCurrentPrice: async (_, { symbol }, { dataSources }) => {
      return await dataSources.marketDataAPI.getCurrentPrice(symbol);
    },

    getCurrentPrices: async (_, { symbols }, { dataSources }) => {
      return await dataSources.marketDataAPI.getCurrentPrices(symbols);
    },

    getHistoricalData: async (_, { symbol, days }, { dataSources }) => {
      return await dataSources.marketDataAPI.getHistoricalData(symbol, days);
    },

    getPortfolio: async (_, { portfolioId }, { dataSources }) => {
      return await dataSources.portfolioAPI.getPortfolio(portfolioId);
    },

    getUserPortfolios: async (_, { userId }, { dataSources }) => {
      return await dataSources.portfolioAPI.getUserPortfolios(userId);
    },

    getPortfolioAnalysis: async (_, { portfolioId }, { dataSources }) => {
      return await dataSources.analysisAPI.getPortfolioAnalysis(portfolioId);
    },

    getPortfolioInsights: async (_, { portfolioId, limit }, { dataSources }) => {
      return await dataSources.analysisAPI.getPortfolioInsights(portfolioId, limit);
    },

    getRebalanceRecommendations: async (_, { portfolioId }, { dataSources }) => {
      return await dataSources.analysisAPI.getRebalanceRecommendations(portfolioId);
    },

    getPortfolioAlerts: async (_, { portfolioId, limit }, { dataSources }) => {
      return await dataSources.analysisAPI.getPortfolioAlerts(portfolioId, limit);
    },

    getMarketDataHealth: async (_, __, { dataSources }) => {
      return await dataSources.systemAPI.getMarketDataHealth();
    },

    getAnalysisStats: async (_, __, { dataSources }) => {
      return await dataSources.systemAPI.getAnalysisStats();
    },
  },

  Mutation: {
    createPortfolio: async (_, { input }, { dataSources }) => {
      return await dataSources.portfolioAPI.createPortfolio(input);
    },

    updatePortfolio: async (_, { portfolioId, input }, { dataSources }) => {
      return await dataSources.portfolioAPI.updatePortfolio(portfolioId, input);
    },

    deletePortfolio: async (_, { portfolioId }, { dataSources }) => {
      return await dataSources.portfolioAPI.deletePortfolio(portfolioId);
    },

    startPortfolioAnalysis: async (_, { portfolioId }, { dataSources }) => {
      return await dataSources.analysisAPI.startPortfolioAnalysis(portfolioId);
    },

    stopPortfolioAnalysis: async (_, { portfolioId }, { dataSources }) => {
      return await dataSources.analysisAPI.stopPortfolioAnalysis(portfolioId);
    },

    triggerManualAnalysis: async (_, { portfolioId }, { dataSources }) => {
      return await dataSources.analysisAPI.triggerManualAnalysis(portfolioId);
    },

    createPriceAlert: async (_, { input }, { dataSources }) => {
      return await dataSources.alertAPI.createPriceAlert(input);
    },

    updateAlertSettings: async (_, { portfolioId, settings }, { dataSources }) => {
      return await dataSources.alertAPI.updateAlertSettings(portfolioId, settings);
    },

    dismissAlert: async (_, { alertId }, { dataSources }) => {
      return await dataSources.alertAPI.dismissAlert(alertId);
    },

    subscribeToSymbol: async (_, { symbol }, { dataSources }) => {
      return await dataSources.marketDataAPI.subscribeToSymbol(symbol);
    },

    unsubscribeFromSymbol: async (_, { symbol }, { dataSources }) => {
      return await dataSources.marketDataAPI.unsubscribeFromSymbol(symbol);
    },
  },

  Subscription: {
    marketDataUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['MARKET_DATA_UPDATED']),
        (payload, variables) => {
          if (!variables.filter) return true;
          
          const { symbols, minChangePercent, maxChangePercent, minVolume } = variables.filter;
          const data = payload.marketDataUpdated;
          
          // Filter by symbols
          if (symbols && symbols.length > 0 && !symbols.includes(data.symbol)) {
            return false;
          }
          
          // Filter by change percent
          if (minChangePercent !== undefined && data.changePercent < minChangePercent) {
            return false;
          }
          
          if (maxChangePercent !== undefined && data.changePercent > maxChangePercent) {
            return false;
          }
          
          // Filter by volume
          if (minVolume !== undefined && data.volume < minVolume) {
            return false;
          }
          
          return true;
        }
      ),
    },

    portfolioUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['PORTFOLIO_UPDATED']),
        (payload, variables) => {
          return payload.portfolioUpdated.id === variables.portfolioId;
        }
      ),
    },

    portfolioInsightsUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['PORTFOLIO_INSIGHTS_UPDATED']),
        (payload, variables) => {
          return payload.portfolioInsightsUpdated.portfolioId === variables.portfolioId;
        }
      ),
    },

    rebalanceRecommendationsUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['REBALANCE_RECOMMENDATIONS_UPDATED']),
        (payload, variables) => {
          return payload.rebalanceRecommendationsUpdated.portfolioId === variables.portfolioId;
        }
      ),
    },

    portfolioAlertsTriggered: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['PORTFOLIO_ALERT_TRIGGERED']),
        (payload, variables) => {
          return payload.portfolioAlertsTriggered.portfolioId === variables.portfolioId;
        }
      ),
    },

    userPortfoliosUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['USER_PORTFOLIOS_UPDATED']),
        (payload, variables) => {
          return payload.userPortfoliosUpdated.userId === variables.userId;
        }
      ),
    },

    userAlertsTriggered: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['USER_ALERT_TRIGGERED']),
        (payload, variables) => {
          return payload.userAlertsTriggered.userId === variables.userId;
        }
      ),
    },

    marketStatusUpdated: {
      subscribe: () => pubsub.asyncIterator(['MARKET_STATUS_UPDATED']),
    },

    portfolioAnalysisCompleted: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['PORTFOLIO_ANALYSIS_COMPLETED']),
        (payload, variables) => {
          if (!variables.filter) return true;
          
          const { portfolioIds, insightTypes, minSeverity, actionRequiredOnly } = variables.filter;
          const analysis = payload.portfolioAnalysisCompleted;
          
          // Filter by portfolio IDs
          if (portfolioIds && portfolioIds.length > 0 && !portfolioIds.includes(analysis.portfolio.id)) {
            return false;
          }
          
          // Filter by insight types
          if (insightTypes && insightTypes.length > 0) {
            const hasMatchingInsight = analysis.insights.some(insight => 
              insightTypes.includes(insight.type)
            );
            if (!hasMatchingInsight) return false;
          }
          
          // Filter by minimum severity
          if (minSeverity) {
            const severityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
            const minSeverityValue = severityOrder[minSeverity];
            
            const hasHighSeverityInsight = analysis.insights.some(insight => 
              severityOrder[insight.severity] >= minSeverityValue
            );
            if (!hasHighSeverityInsight) return false;
          }
          
          // Filter by action required
          if (actionRequiredOnly) {
            const hasActionRequired = analysis.insights.some(insight => insight.actionRequired) ||
                                    analysis.alerts.some(alert => alert.actionRequired);
            if (!hasActionRequired) return false;
          }
          
          return true;
        }
      ),
    },
  },

  // Custom scalar resolvers
  DateTime: {
    serialize: (value) => value.toISOString(),
    parseValue: (value) => new Date(value),
    parseLiteral: (ast) => new Date(ast.value),
  },

  JSON: {
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral: (ast) => JSON.parse(ast.value),
  },
};

// Export PubSub instance for use in data sources
export { pubsub };

// Subscription event types
export const SUBSCRIPTION_EVENTS = {
  MARKET_DATA_UPDATED: 'MARKET_DATA_UPDATED',
  PORTFOLIO_UPDATED: 'PORTFOLIO_UPDATED',
  PORTFOLIO_INSIGHTS_UPDATED: 'PORTFOLIO_INSIGHTS_UPDATED',
  REBALANCE_RECOMMENDATIONS_UPDATED: 'REBALANCE_RECOMMENDATIONS_UPDATED',
  PORTFOLIO_ALERT_TRIGGERED: 'PORTFOLIO_ALERT_TRIGGERED',
  USER_PORTFOLIOS_UPDATED: 'USER_PORTFOLIOS_UPDATED',
  USER_ALERT_TRIGGERED: 'USER_ALERT_TRIGGERED',
  MARKET_STATUS_UPDATED: 'MARKET_STATUS_UPDATED',
  PORTFOLIO_ANALYSIS_COMPLETED: 'PORTFOLIO_ANALYSIS_COMPLETED',
};