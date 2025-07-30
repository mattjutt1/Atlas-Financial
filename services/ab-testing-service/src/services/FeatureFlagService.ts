/**
 * Atlas Financial Feature Flag Service
 * Core service for feature flag evaluation and management
 */

import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  FeatureFlag,
  FeatureFlagEvaluationRequest,
  FeatureFlagEvaluationResponse,
  CreateFeatureFlagRequest,
  UpdateFeatureFlagRequest,
  UserContext,
  Variant,
  FeatureFlagNotFoundError,
  InvalidConfigurationError,
  AIFeatureConfig
} from '../types';

export class FeatureFlagService {
  private db: Pool;
  private redis: Redis;
  private cacheKeyPrefix = 'ab_testing:feature_flag:';
  private cacheExpirationSeconds = 300; // 5 minutes

  constructor(db: Pool, redis: Redis) {
    this.db = db;
    this.redis = redis;
  }

  /**
   * Evaluate a feature flag for a user
   */
  async evaluateFeatureFlag(request: FeatureFlagEvaluationRequest): Promise<FeatureFlagEvaluationResponse> {
    const { userId, featureFlagName, userContext } = request;
    const trackingId = uuidv4();

    try {
      // Check cache first
      const cacheKey = `${this.cacheKeyPrefix}${featureFlagName}:${userId}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        const result = JSON.parse(cached);
        result.trackingId = trackingId; // Always generate new tracking ID
        return result;
      }

      // Evaluate using database function
      const query = `
        SELECT enabled, variant_id, variant_name, variant_payload, tracking_id
        FROM ab_testing.evaluate_feature_flag($1, $2, $3)
      `;
      
      const result = await this.db.query(query, [
        featureFlagName,
        userId,
        JSON.stringify(userContext)
      ]);

      if (result.rows.length === 0) {
        throw new FeatureFlagNotFoundError(featureFlagName);
      }

      const row = result.rows[0];
      const response: FeatureFlagEvaluationResponse = {
        enabled: row.enabled,
        variant: row.variant_id ? {
          id: row.variant_id,
          name: row.variant_name,
          description: '',
          weight: 0,
          payload: row.variant_payload,
          enabled: true
        } : undefined,
        reason: this.determineEvaluationReason(row),
        trackingId
      };

      // Cache the result
      await this.redis.setex(
        cacheKey,
        this.cacheExpirationSeconds,
        JSON.stringify(response)
      );

      // Track evaluation event
      await this.trackEvaluationEvent(userId, featureFlagName, response, userContext);

      return response;

    } catch (error) {
      console.error('Feature flag evaluation failed:', error);
      
      // Return safe default
      return {
        enabled: false,
        reason: 'evaluation_error',
        trackingId
      };
    }
  }

  /**
   * Create a new feature flag
   */
  async createFeatureFlag(request: CreateFeatureFlagRequest, createdBy: string): Promise<FeatureFlag> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Insert feature flag
      const flagQuery = `
        INSERT INTO ab_testing.feature_flags (name, description, enabled, rollout_percentage, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const flagResult = await client.query(flagQuery, [
        request.name,
        request.description,
        request.enabled ?? false,
        request.rolloutPercentage ?? 0,
        createdBy
      ]);

      const flag = flagResult.rows[0];

      // Insert variants if provided
      if (request.variants && request.variants.length > 0) {
        const variantQuery = `
          INSERT INTO ab_testing.feature_flag_variants (feature_flag_id, name, description, weight, payload, enabled)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;

        for (const variant of request.variants) {
          await client.query(variantQuery, [
            flag.id,
            variant.name,
            variant.description,
            variant.weight,
            JSON.stringify(variant.payload || {}),
            variant.enabled
          ]);
        }
      }

      // Insert targeting rules if provided
      if (request.targetingRules && request.targetingRules.length > 0) {
        const ruleQuery = `
          INSERT INTO ab_testing.targeting_rules (feature_flag_id, attribute, operator, values, enabled, priority)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;

        for (let i = 0; i < request.targetingRules.length; i++) {
          const rule = request.targetingRules[i];
          await client.query(ruleQuery, [
            flag.id,
            rule.attribute,
            rule.operator,
            JSON.stringify(rule.values),
            rule.enabled,
            i
          ]);
        }
      }

      await client.query('COMMIT');

      // Clear cache
      await this.invalidateFeatureFlagCache(request.name);

      return this.mapDatabaseRowToFeatureFlag(flag);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing feature flag
   */
  async updateFeatureFlag(flagId: string, request: UpdateFeatureFlagRequest): Promise<FeatureFlag> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (request.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(request.name);
      }
      if (request.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(request.description);
      }
      if (request.enabled !== undefined) {
        updateFields.push(`enabled = $${paramIndex++}`);
        updateValues.push(request.enabled);
      }
      if (request.rolloutPercentage !== undefined) {
        updateFields.push(`rollout_percentage = $${paramIndex++}`);
        updateValues.push(request.rolloutPercentage);
      }

      if (updateFields.length === 0 && !request.variants && !request.targetingRules) {
        throw new InvalidConfigurationError('No fields to update');
      }

      let flag;
      if (updateFields.length > 0) {
        updateFields.push(`version = version + 1`);
        updateValues.push(flagId);

        const query = `
          UPDATE ab_testing.feature_flags 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `;

        const result = await client.query(query, updateValues);
        if (result.rows.length === 0) {
          throw new FeatureFlagNotFoundError(flagId);
        }
        flag = result.rows[0];
      } else {
        // Just get the existing flag
        const result = await client.query('SELECT * FROM ab_testing.feature_flags WHERE id = $1', [flagId]);
        if (result.rows.length === 0) {
          throw new FeatureFlagNotFoundError(flagId);
        }
        flag = result.rows[0];
      }

      // Update variants if provided
      if (request.variants) {
        // Delete existing variants
        await client.query('DELETE FROM ab_testing.feature_flag_variants WHERE feature_flag_id = $1', [flagId]);
        
        // Insert new variants
        const variantQuery = `
          INSERT INTO ab_testing.feature_flag_variants (id, feature_flag_id, name, description, weight, payload, enabled)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        for (const variant of request.variants) {
          await client.query(variantQuery, [
            variant.id || uuidv4(),
            flagId,
            variant.name,
            variant.description,
            variant.weight,
            JSON.stringify(variant.payload || {}),
            variant.enabled
          ]);
        }
      }

      // Update targeting rules if provided
      if (request.targetingRules) {
        // Delete existing rules
        await client.query('DELETE FROM ab_testing.targeting_rules WHERE feature_flag_id = $1', [flagId]);
        
        // Insert new rules
        const ruleQuery = `
          INSERT INTO ab_testing.targeting_rules (id, feature_flag_id, attribute, operator, values, enabled, priority)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        for (let i = 0; i < request.targetingRules.length; i++) {
          const rule = request.targetingRules[i];
          await client.query(ruleQuery, [
            rule.id || uuidv4(),
            flagId,
            rule.attribute,
            rule.operator,
            JSON.stringify(rule.values),
            rule.enabled,
            i
          ]);
        }
      }

      await client.query('COMMIT');

      // Clear cache
      await this.invalidateFeatureFlagCache(flag.name);

      return this.mapDatabaseRowToFeatureFlag(flag);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all feature flags
   */
  async getFeatureFlags(includeArchived = false): Promise<FeatureFlag[]> {
    const query = `
      SELECT ff.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ffv.id,
                   'name', ffv.name,
                   'description', ffv.description,
                   'weight', ffv.weight,
                   'payload', ffv.payload,
                   'enabled', ffv.enabled
                 )
               ) FILTER (WHERE ffv.id IS NOT NULL), 
               '[]'::json
             ) as variants,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', tr.id,
                   'attribute', tr.attribute,
                   'operator', tr.operator,
                   'values', tr.values,
                   'enabled', tr.enabled
                 )
               ) FILTER (WHERE tr.id IS NOT NULL), 
               '[]'::json
             ) as targeting_rules
      FROM ab_testing.feature_flags ff
      LEFT JOIN ab_testing.feature_flag_variants ffv ON ff.id = ffv.feature_flag_id
      LEFT JOIN ab_testing.targeting_rules tr ON ff.id = tr.feature_flag_id
      WHERE ($1 OR ff.archived = false)
      GROUP BY ff.id
      ORDER BY ff.created_at DESC
    `;

    const result = await this.db.query(query, [includeArchived]);
    return result.rows.map(row => this.mapDatabaseRowToFeatureFlag(row));
  }

  /**
   * Get feature flag by ID
   */
  async getFeatureFlagById(flagId: string): Promise<FeatureFlag> {
    const query = `
      SELECT ff.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ffv.id,
                   'name', ffv.name,
                   'description', ffv.description,
                   'weight', ffv.weight,
                   'payload', ffv.payload,
                   'enabled', ffv.enabled
                 )
               ) FILTER (WHERE ffv.id IS NOT NULL), 
               '[]'::json
             ) as variants,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', tr.id,
                   'attribute', tr.attribute,
                   'operator', tr.operator,
                   'values', tr.values,
                   'enabled', tr.enabled
                 )
               ) FILTER (WHERE tr.id IS NOT NULL), 
               '[]'::json
             ) as targeting_rules
      FROM ab_testing.feature_flags ff
      LEFT JOIN ab_testing.feature_flag_variants ffv ON ff.id = ffv.feature_flag_id
      LEFT JOIN ab_testing.targeting_rules tr ON ff.id = tr.feature_flag_id
      WHERE ff.id = $1
      GROUP BY ff.id
    `;

    const result = await this.db.query(query, [flagId]);
    if (result.rows.length === 0) {
      throw new FeatureFlagNotFoundError(flagId);
    }

    return this.mapDatabaseRowToFeatureFlag(result.rows[0]);
  }

  /**
   * Archive (soft delete) a feature flag
   */
  async archiveFeatureFlag(flagId: string): Promise<void> {
    const query = `
      UPDATE ab_testing.feature_flags 
      SET archived = true, archived_at = NOW()
      WHERE id = $1
    `;

    const result = await this.db.query(query, [flagId]);
    if (result.rowCount === 0) {
      throw new FeatureFlagNotFoundError(flagId);
    }

    // Clear cache
    await this.redis.del(`${this.cacheKeyPrefix}*`);
  }

  /**
   * Get AI feature configuration
   */
  async getAIFeatureConfig(userId: string): Promise<AIFeatureConfig> {
    const aiFeatures = [
      'budget_ai_insights',
      'goal_ai_predictions', 
      'investment_ai_rebalancing',
      'debt_ai_optimization',
      'real_time_market_data'
    ];

    const config: Partial<AIFeatureConfig> = {};

    for (const featureName of aiFeatures) {
      try {
        const evaluation = await this.evaluateFeatureFlag({
          userId,
          featureFlagName: featureName,
          userContext: { userId }
        });

        const payload = evaluation.variant?.payload || {};
        
        switch (featureName) {
          case 'budget_ai_insights':
            config.budgetAI = {
              enabled: evaluation.enabled,
              confidenceThreshold: payload.confidenceThreshold || 0.7,
              maxInsights: payload.maxInsights || 5,
              refreshInterval: payload.refreshInterval || 300000
            };
            break;
          case 'goal_ai_predictions':
            config.goalAI = {
              enabled: evaluation.enabled,
              predictionAccuracy: payload.predictionAccuracy || 0.85,
              milestoneOptimization: payload.milestoneOptimization || true
            };
            break;
          case 'investment_ai_rebalancing':
            config.investmentAI = {
              enabled: evaluation.enabled,
              realtimeUpdates: payload.realtimeUpdates || false,
              riskAnalysis: payload.riskAnalysis || true,
              rebalancingThreshold: payload.rebalancingThreshold || 0.05
            };
            break;
          case 'debt_ai_optimization':
            config.debtAI = {
              enabled: evaluation.enabled,
              optimizationStrategies: payload.optimizationStrategies || ['avalanche', 'snowball'],
              consolidationAnalysis: payload.consolidationAnalysis || true
            };
            break;
          case 'real_time_market_data':
            config.marketDataAI = {
              enabled: evaluation.enabled,
              updateFrequency: payload.updateFrequency || 5000,
              sentimentAnalysis: payload.sentimentAnalysis || false
            };
            break;
        }
      } catch (error) {
        console.error(`Failed to evaluate ${featureName}:`, error);
        // Set safe defaults
      }
    }

    return config as AIFeatureConfig;
  }

  /**
   * Private helper methods
   */
  private determineEvaluationReason(row: any): string {
    if (!row.enabled) {
      return 'flag_disabled';
    }
    if (row.variant_id) {
      return 'variant_assigned';
    }
    return 'enabled_no_variant';
  }

  private async trackEvaluationEvent(
    userId: string,
    featureFlagName: string,
    response: FeatureFlagEvaluationResponse,
    userContext: UserContext
  ): Promise<void> {
    try {
      // Update evaluation count
      await this.db.query(
        'UPDATE ab_testing.feature_flags SET evaluation_count = evaluation_count + 1, last_evaluated_at = NOW() WHERE name = $1',
        [featureFlagName]
      );

      // Track in metrics (if part of an experiment)
      // This would be handled by the metrics service
      
    } catch (error) {
      console.error('Failed to track evaluation event:', error);
    }
  }

  private async invalidateFeatureFlagCache(flagName: string): Promise<void> {
    const pattern = `${this.cacheKeyPrefix}${flagName}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private mapDatabaseRowToFeatureFlag(row: any): FeatureFlag {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      enabled: row.enabled,
      rolloutPercentage: row.rollout_percentage,
      variants: row.variants || [],
      targetingRules: row.targeting_rules || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }
}