/**
 * Atlas Financial A/B Testing Service Types
 * Comprehensive type definitions for feature flags, experiments, and metrics
 */

// Core Feature Flag Types
export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetingRules: TargetingRule[];
  variants: Variant[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Variant {
  id: string;
  name: string;
  description: string;
  weight: number;
  payload?: Record<string, any>;
  enabled: boolean;
}

export interface TargetingRule {
  id: string;
  attribute: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains';
  values: string[];
  enabled: boolean;
}

// A/B Test Experiment Types
export interface Experiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  featureFlagId: string;
  status: ExperimentStatus;
  startDate: Date;
  endDate?: Date;
  variants: ExperimentVariant[];
  metrics: MetricDefinition[];
  targetAudience: AudienceDefinition;
  statisticalPower: number;
  confidenceLevel: number;
  minimumDetectableEffect: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'stopped';

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  trafficAllocation: number;
  isControl: boolean;
  configuration?: Record<string, any>;
}

export interface MetricDefinition {
  id: string;
  name: string;
  type: MetricType;
  description: string;
  eventName: string;
  aggregationType: 'count' | 'sum' | 'average' | 'conversion_rate' | 'unique_count';
  isPrimary: boolean;
  filters?: MetricFilter[];
}

export type MetricType = 'engagement' | 'conversion' | 'retention' | 'performance' | 'custom';

export interface MetricFilter {
  attribute: string;
  operator: string;
  value: string;
}

export interface AudienceDefinition {
  id: string;
  name: string;
  description: string;
  rules: TargetingRule[];
  estimatedSize?: number;
}

// User and Segmentation Types
export interface UserSegment {
  userId: string;
  segmentName: string;
  experimentId: string;
  variantId: string;
  assignedAt: Date;
  context: UserContext;
}

export interface UserContext {
  userId: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  platform?: 'web' | 'mobile' | 'desktop';
  userType?: 'new' | 'returning' | 'premium';
  accountAge?: number;
  customAttributes?: Record<string, any>;
}

// Metrics and Analytics Types
export interface MetricEvent {
  id: string;
  userId: string;
  sessionId?: string;
  experimentId: string;
  variantId: string;
  eventName: string;
  eventType: EventType;
  properties: Record<string, any>;
  timestamp: Date;
  value?: number;
}

export type EventType = 
  | 'feature_exposure'
  | 'click'
  | 'conversion'
  | 'engagement'
  | 'error'
  | 'performance'
  | 'custom';

export interface ExperimentResults {
  experimentId: string;
  status: ExperimentStatus;
  totalParticipants: number;
  variantResults: VariantResults[];
  primaryMetricResults: MetricResults;
  secondaryMetricResults: MetricResults[];
  statisticalSignificance: StatisticalSignificance;
  recommendations: string[];
  generatedAt: Date;
}

export interface VariantResults {
  variantId: string;
  variantName: string;
  participants: number;
  conversionRate: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  relativeUplift: number;
  significance: boolean;
}

export interface MetricResults {
  metricId: string;
  metricName: string;
  results: VariantMetricResult[];
  winner?: string;
  confidence: number;
}

export interface VariantMetricResult {
  variantId: string;
  value: number;
  sampleSize: number;
  standardError: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export interface StatisticalSignificance {
  pValue: number;
  significant: boolean;
  confidenceLevel: number;
  power: number;
  minSampleSize: number;
  currentSampleSize: number;
  daysToSignificance?: number;
}

// API Request/Response Types
export interface CreateFeatureFlagRequest {
  name: string;
  description: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  variants?: Omit<Variant, 'id'>[];
  targetingRules?: Omit<TargetingRule, 'id'>[];
}

export interface UpdateFeatureFlagRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  variants?: Variant[];
  targetingRules?: TargetingRule[];
}

export interface CreateExperimentRequest {
  name: string;
  description: string;
  hypothesis: string;
  featureFlagId: string;
  variants: Omit<ExperimentVariant, 'id'>[];
  metrics: Omit<MetricDefinition, 'id'>[];
  targetAudience: Omit<AudienceDefinition, 'id'>;
  startDate: Date;
  endDate?: Date;
  statisticalPower?: number;
  confidenceLevel?: number;
  minimumDetectableEffect?: number;
}

export interface FeatureFlagEvaluationRequest {
  userId: string;
  featureFlagName: string;
  userContext: UserContext;
}

export interface FeatureFlagEvaluationResponse {
  enabled: boolean;
  variant?: Variant;
  reason: string;
  trackingId: string;
}

export interface TrackEventRequest {
  userId: string;
  sessionId?: string;
  eventName: string;
  eventType: EventType;
  properties?: Record<string, any>;
  value?: number;
  timestamp?: Date;
}

// AI-Specific Feature Flag Types
export interface AIFeatureConfig {
  budgetAI: {
    enabled: boolean;
    confidenceThreshold: number;
    maxInsights: number;
    refreshInterval: number;
  };
  goalAI: {
    enabled: boolean;
    predictionAccuracy: number;
    milestoneOptimization: boolean;
  };
  investmentAI: {
    enabled: boolean;
    realtimeUpdates: boolean;
    riskAnalysis: boolean;
    rebalancingThreshold: number;
  };
  debtAI: {
    enabled: boolean;
    optimizationStrategies: string[];
    consolidationAnalysis: boolean;
  };
  marketDataAI: {
    enabled: boolean;
    updateFrequency: number;
    sentimentAnalysis: boolean;
  };
}

// Error Types
export class ABTestingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'ABTestingError';
  }
}

export class FeatureFlagNotFoundError extends ABTestingError {
  constructor(flagName: string) {
    super(`Feature flag '${flagName}' not found`, 'FEATURE_FLAG_NOT_FOUND', 404);
  }
}

export class ExperimentNotFoundError extends ABTestingError {
  constructor(experimentId: string) {
    super(`Experiment '${experimentId}' not found`, 'EXPERIMENT_NOT_FOUND', 404);
  }
}

export class InvalidConfigurationError extends ABTestingError {
  constructor(message: string) {
    super(`Invalid configuration: ${message}`, 'INVALID_CONFIGURATION', 400);
  }
}

// Database Types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  pool?: {
    min: number;
    max: number;
  };
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

// Service Configuration
export interface ABTestingServiceConfig {
  port: number;
  host: string;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: {
    secret: string;
    algorithm: string;
  };
  monitoring: {
    enabled: boolean;
    metricsPort: number;
  };
  features: {
    enableAnalytics: boolean;
    enableCaching: boolean;
    cacheExpirationSeconds: number;
  };
}