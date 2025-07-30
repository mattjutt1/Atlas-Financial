/**
 * Atlas Financial Feature Flag Provider
 * React context and hooks for A/B testing and feature flag management
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

// Types
interface FeatureFlagVariant {
  id: string;
  name: string;
  payload?: Record<string, any>;
}

interface FeatureFlagResult {
  enabled: boolean;
  variant?: FeatureFlagVariant;
  loading: boolean;
  error?: string;
}

interface AIFeatureConfig {
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

interface FeatureFlagContextType {
  // Individual feature flag evaluation
  getFeatureFlag: (flagName: string) => FeatureFlagResult;
  
  // AI feature configuration
  aiConfig: AIFeatureConfig | null;
  aiConfigLoading: boolean;
  
  // A/B testing utilities
  trackEvent: (eventName: string, properties?: Record<string, any>, value?: number) => Promise<void>;
  trackConversion: (eventName: string, value?: number) => Promise<void>;
  
  // Feature flag management
  refreshFlags: () => Promise<void>;
  prefetchFlag: (flagName: string) => Promise<void>;
  
  // User context
  updateUserContext: (context: Partial<UserContext>) => void;
}

interface UserContext {
  userId: string;
  sessionId?: string;
  userAgent?: string;
  platform?: 'web' | 'mobile' | 'desktop';
  userType?: 'new' | 'returning' | 'premium';
  accountAge?: number;
  customAttributes?: Record<string, any>;
}

// GraphQL Queries
const GET_FEATURE_FLAG = gql`
  query GetFeatureFlag($flagName: String!, $userContext: JSON!) {
    evaluateFeatureFlag(flagName: $flagName, userContext: $userContext) {
      enabled
      variant {
        id
        name
        payload
      }
      reason
      trackingId
    }
  }
`;

const GET_AI_FEATURE_CONFIG = gql`
  query GetAIFeatureConfig {
    aiFeatureConfig {
      budgetAI {
        enabled
        confidenceThreshold
        maxInsights
        refreshInterval
      }
      goalAI {
        enabled
        predictionAccuracy
        milestoneOptimization
      }
      investmentAI {
        enabled
        realtimeUpdates
        riskAnalysis
        rebalancingThreshold
      }
      debtAI {
        enabled
        optimizationStrategies
        consolidationAnalysis
      }
      marketDataAI {
        enabled
        updateFrequency
        sentimentAnalysis
      }
    }
  }
`;

const TRACK_EVENT = gql`
  mutation TrackEvent(
    $eventName: String!
    $eventType: String!
    $properties: JSON
    $value: Float
    $timestamp: DateTime
  ) {
    trackEvent(
      eventName: $eventName
      eventType: $eventType
      properties: $properties
      value: $value
      timestamp: $timestamp
    ) {
      success
      eventId
    }
  }
`;

// Context
const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null);

// Provider Props
interface FeatureFlagProviderProps {
  children: ReactNode;
  userId: string;
  initialUserContext?: Partial<UserContext>;
}

// Provider Component
export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({
  children,
  userId,
  initialUserContext = {}
}) => {
  // State
  const [userContext, setUserContext] = useState<UserContext>({
    userId,
    sessionId: generateSessionId(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    platform: detectPlatform(),
    ...initialUserContext
  });

  const [featureFlagCache, setFeatureFlagCache] = useState<Map<string, FeatureFlagResult>>(new Map());
  const [aiConfig, setAiConfig] = useState<AIFeatureConfig | null>(null);
  const [aiConfigLoading, setAiConfigLoading] = useState(true);

  // AI Configuration Query
  const { data: aiConfigData, loading: aiConfigQueryLoading, refetch: refetchAiConfig } = useQuery(
    GET_AI_FEATURE_CONFIG,
    {
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true
    }
  );

  // Update AI config when data changes
  useEffect(() => {
    if (aiConfigData?.aiFeatureConfig) {
      setAiConfig(aiConfigData.aiFeatureConfig);
      setAiConfigLoading(false);
    } else {
      setAiConfigLoading(aiConfigQueryLoading);
    }
  }, [aiConfigData, aiConfigQueryLoading]);

  // Feature Flag Evaluation Hook
  const getFeatureFlag = useCallback((flagName: string): FeatureFlagResult => {
    // Check cache first
    const cached = featureFlagCache.get(flagName);
    if (cached && !cached.loading) {
      return cached;
    }

    // Return loading state while fetching
    return { enabled: false, loading: true };
  }, [featureFlagCache]);

  // Prefetch Feature Flag
  const prefetchFlag = useCallback(async (flagName: string): Promise<void> => {
    try {
      // Set loading state
      setFeatureFlagCache(prev => new Map(prev.set(flagName, { enabled: false, loading: true })));

      // Make GraphQL request (this would need to be implemented with a GraphQL client)
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          query: GET_FEATURE_FLAG.loc?.source.body,
          variables: {
            flagName,
            userContext: JSON.stringify(userContext)
          }
        })
      });

      const result = await response.json();
      const evaluation = result.data?.evaluateFeatureFlag;

      if (evaluation) {
        setFeatureFlagCache(prev => new Map(prev.set(flagName, {
          enabled: evaluation.enabled,
          variant: evaluation.variant,
          loading: false
        })));
      } else {
        setFeatureFlagCache(prev => new Map(prev.set(flagName, {
          enabled: false,
          loading: false,
          error: 'Failed to evaluate feature flag'
        })));
      }
    } catch (error) {
      console.error(`Failed to prefetch feature flag ${flagName}:`, error);
      setFeatureFlagCache(prev => new Map(prev.set(flagName, {
        enabled: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })));
    }
  }, [userContext]);

  // Track Event
  const trackEvent = useCallback(async (
    eventName: string,
    properties?: Record<string, any>,
    value?: number
  ): Promise<void> => {
    try {
      await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          query: TRACK_EVENT.loc?.source.body,
          variables: {
            eventName,
            eventType: 'custom',
            properties: JSON.stringify(properties || {}),
            value,
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, []);

  // Track Conversion
  const trackConversion = useCallback(async (
    eventName: string,
    value?: number
  ): Promise<void> => {
    return trackEvent(eventName, { type: 'conversion' }, value);
  }, [trackEvent]);

  // Refresh All Flags
  const refreshFlags = useCallback(async (): Promise<void> => {
    // Clear cache
    setFeatureFlagCache(new Map());
    
    // Refresh AI config
    await refetchAiConfig();
    
    // Re-fetch commonly used flags
    const commonFlags = [
      'budget_ai_insights',
      'goal_ai_predictions',
      'investment_ai_rebalancing',
      'debt_ai_optimization',
      'real_time_market_data'
    ];
    
    await Promise.all(commonFlags.map(flag => prefetchFlag(flag)));
  }, [refetchAiConfig, prefetchFlag]);

  // Update User Context
  const updateUserContext = useCallback((newContext: Partial<UserContext>): void => {
    setUserContext(prev => ({ ...prev, ...newContext }));
    // Clear cache when user context changes
    setFeatureFlagCache(new Map());
  }, []);

  // Prefetch common flags on mount
  useEffect(() => {
    const commonFlags = [
      'budget_ai_insights',
      'goal_ai_predictions', 
      'investment_ai_rebalancing',
      'debt_ai_optimization',
      'real_time_market_data'
    ];
    
    Promise.all(commonFlags.map(flag => prefetchFlag(flag)));
  }, [prefetchFlag]);

  const contextValue: FeatureFlagContextType = {
    getFeatureFlag,
    aiConfig,
    aiConfigLoading,
    trackEvent,
    trackConversion,
    refreshFlags,
    prefetchFlag,
    updateUserContext
  };

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

// Custom Hooks

/**
 * Hook to access feature flag context
 */
export const useFeatureFlags = (): FeatureFlagContextType => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
};

/**
 * Hook to evaluate a specific feature flag
 */
export const useFeatureFlag = (flagName: string): FeatureFlagResult => {
  const { getFeatureFlag, prefetchFlag } = useFeatureFlags();
  
  useEffect(() => {
    prefetchFlag(flagName);
  }, [flagName, prefetchFlag]);
  
  return getFeatureFlag(flagName);
};

/**
 * Hook to check if AI features are enabled
 */
export const useAIFeatures = () => {
  const { aiConfig, aiConfigLoading } = useFeatureFlags();
  
  return {
    budgetAI: aiConfig?.budgetAI || { enabled: false, confidenceThreshold: 0.7, maxInsights: 5, refreshInterval: 300000 },
    goalAI: aiConfig?.goalAI || { enabled: false, predictionAccuracy: 0.85, milestoneOptimization: true },
    investmentAI: aiConfig?.investmentAI || { enabled: false, realtimeUpdates: false, riskAnalysis: true, rebalancingThreshold: 0.05 },
    debtAI: aiConfig?.debtAI || { enabled: false, optimizationStrategies: ['avalanche', 'snowball'], consolidationAnalysis: true },
    marketDataAI: aiConfig?.marketDataAI || { enabled: false, updateFrequency: 5000, sentimentAnalysis: false },
    loading: aiConfigLoading
  };
};

/**
 * Hook for A/B testing with automatic tracking
 */
export const useABTest = (experimentName: string, defaultVariant = 'control') => {
  const { getFeatureFlag, trackEvent } = useFeatureFlags();
  const flagResult = getFeatureFlag(experimentName);
  
  const variant = flagResult.variant?.name || defaultVariant;
  
  // Track exposure automatically
  useEffect(() => {
    if (!flagResult.loading && flagResult.enabled) {
      trackEvent('feature_exposure', {
        experimentName,
        variant,
        exposureTime: Date.now()
      });
    }
  }, [experimentName, variant, flagResult.loading, flagResult.enabled, trackEvent]);
  
  return {
    variant,
    isEnabled: flagResult.enabled,
    isLoading: flagResult.loading,
    trackConversion: (conversionEvent: string, value?: number) => {
      trackEvent(conversionEvent, {
        experimentName,
        variant,
        conversionType: 'primary'
      }, value);
    }
  };
};

// Utility Functions
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function detectPlatform(): 'web' | 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'web';
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad/.test(userAgent)) {
    return 'mobile';
  }
  if (/electron/.test(userAgent)) {
    return 'desktop';
  }
  return 'web';
}

function getAuthToken(): string {
  // This would integrate with your existing auth system
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || '';
  }
  return '';
}

// Component Wrapper for Feature Flags
interface FeatureFlagWrapperProps {
  flagName: string;
  fallback?: ReactNode;
  children: ReactNode | ((variant?: FeatureFlagVariant) => ReactNode);
}

export const FeatureFlagWrapper: React.FC<FeatureFlagWrapperProps> = ({
  flagName,
  fallback = null,
  children
}) => {
  const flagResult = useFeatureFlag(flagName);
  
  if (flagResult.loading) {
    return <div className="animate-pulse bg-gray-200 h-4 rounded"></div>;
  }
  
  if (!flagResult.enabled) {
    return <>{fallback}</>;
  }
  
  if (typeof children === 'function') {
    return <>{children(flagResult.variant)}</>;
  }
  
  return <>{children}</>;
};

// AI Feature Wrapper
interface AIFeatureWrapperProps {
  feature: 'budget' | 'goal' | 'investment' | 'debt' | 'marketData';
  fallback?: ReactNode;
  children: ReactNode;
}

export const AIFeatureWrapper: React.FC<AIFeatureWrapperProps> = ({
  feature,
  fallback = null,
  children
}) => {
  const aiFeatures = useAIFeatures();
  
  if (aiFeatures.loading) {
    return <div className="animate-pulse bg-gray-200 h-4 rounded"></div>;
  }
  
  const featureConfig = aiFeatures[`${feature}AI` as keyof typeof aiFeatures];
  const isEnabled = featureConfig && typeof featureConfig === 'object' && 'enabled' in featureConfig 
    ? featureConfig.enabled 
    : false;
  
  if (!isEnabled) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};