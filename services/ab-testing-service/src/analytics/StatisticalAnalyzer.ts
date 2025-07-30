/**
 * Atlas Financial Statistical Analyzer
 * Statistical significance calculations and A/B test analysis
 */

import { Pool } from 'pg';
import {
  ExperimentResults,
  VariantResults,
  MetricResults,
  StatisticalSignificance,
  VariantMetricResult,
  Experiment,
  MetricDefinition
} from '../types';

interface RawMetricData {
  variantId: string;
  variantName: string;
  participants: number;
  totalEvents: number;
  totalValue: number;
  uniqueUsers: number;
}

export class StatisticalAnalyzer {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Analyze experiment results with statistical significance
   */
  async analyzeExperiment(experimentId: string): Promise<ExperimentResults> {
    // Get experiment details
    const experiment = await this.getExperiment(experimentId);
    const metrics = await this.getExperimentMetrics(experimentId);
    
    // Calculate results for each metric
    const primaryMetric = metrics.find(m => m.isPrimary);
    const secondaryMetrics = metrics.filter(m => !m.isPrimary);
    
    if (!primaryMetric) {
      throw new Error('No primary metric defined for experiment');
    }

    // Get raw data
    const rawData = await this.getRawMetricData(experimentId, primaryMetric);
    const totalParticipants = rawData.reduce((sum, variant) => sum + variant.participants, 0);
    
    // Calculate variant results
    const variantResults = await this.calculateVariantResults(rawData, primaryMetric);
    
    // Calculate primary metric results
    const primaryMetricResults = this.calculateMetricResults(primaryMetric, variantResults);
    
    // Calculate secondary metrics
    const secondaryMetricResults = await Promise.all(
      secondaryMetrics.map(async metric => {
        const metricRawData = await this.getRawMetricData(experimentId, metric);
        const metricVariantResults = await this.calculateVariantResults(metricRawData, metric);
        return this.calculateMetricResults(metric, metricVariantResults);
      })
    );
    
    // Calculate statistical significance
    const statisticalSignificance = this.calculateStatisticalSignificance(variantResults, experiment);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      variantResults,
      statisticalSignificance,
      experiment
    );
    
    const results: ExperimentResults = {
      experimentId,
      status: experiment.status,
      totalParticipants,
      variantResults,
      primaryMetricResults,
      secondaryMetricResults,
      statisticalSignificance,
      recommendations,
      generatedAt: new Date()
    };

    // Cache results
    await this.cacheResults(experimentId, results);
    
    return results;
  }

  /**
   * Calculate statistical significance using Z-test for proportions
   */
  private calculateStatisticalSignificance(
    variantResults: VariantResults[],
    experiment: Experiment
  ): StatisticalSignificance {
    if (variantResults.length < 2) {
      return {
        pValue: 1.0,
        significant: false,
        confidenceLevel: experiment.confidenceLevel,
        power: 0,
        minSampleSize: 0,
        currentSampleSize: variantResults.reduce((sum, v) => sum + v.participants, 0)
      };
    }

    const control = variantResults.find(v => v.variantName.toLowerCase().includes('control')) || variantResults[0];
    const treatment = variantResults.find(v => v !== control) || variantResults[1];

    // Z-test for difference in proportions
    const p1 = control.conversionRate;
    const n1 = control.participants;
    const p2 = treatment.conversionRate;
    const n2 = treatment.participants;

    const pooledP = ((p1 * n1) + (p2 * n2)) / (n1 + n2);
    const standardError = Math.sqrt(pooledP * (1 - pooledP) * ((1 / n1) + (1 / n2)));
    
    const zScore = Math.abs(p2 - p1) / standardError;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    
    const significant = pValue < (1 - experiment.confidenceLevel);
    
    // Calculate required sample size for desired power
    const effect = Math.abs(p2 - p1);
    const minSampleSize = this.calculateRequiredSampleSize(
      p1,
      effect,
      experiment.statisticalPower,
      experiment.confidenceLevel
    );

    // Estimate days to significance
    const currentSampleSize = n1 + n2;
    const dailyParticipants = this.estimateDailyParticipants(experiment);
    const daysToSignificance = significant ? 0 : 
      Math.ceil((minSampleSize - currentSampleSize) / dailyParticipants);

    return {
      pValue,
      significant,
      confidenceLevel: experiment.confidenceLevel,
      power: this.calculatePower(zScore, experiment.confidenceLevel),
      minSampleSize,
      currentSampleSize,
      daysToSignificance: daysToSignificance > 0 ? daysToSignificance : undefined
    };
  }

  /**
   * Calculate variant results with confidence intervals
   */
  private async calculateVariantResults(
    rawData: RawMetricData[],
    metric: MetricDefinition
  ): Promise<VariantResults[]> {
    return rawData.map(data => {
      let conversionRate: number;
      let confidenceInterval: { lower: number; upper: number };

      switch (metric.aggregationType) {
        case 'conversion_rate':
          conversionRate = data.participants > 0 ? data.totalEvents / data.participants : 0;
          confidenceInterval = this.calculateWilsonConfidenceInterval(
            data.totalEvents,
            data.participants,
            0.95
          );
          break;
        
        case 'average':
          conversionRate = data.totalEvents > 0 ? data.totalValue / data.totalEvents : 0;
          const standardError = Math.sqrt(conversionRate * (1 - conversionRate) / data.participants);
          const margin = 1.96 * standardError; // 95% CI
          confidenceInterval = {
            lower: Math.max(0, conversionRate - margin),
            upper: conversionRate + margin
          };
          break;
        
        case 'sum':
          conversionRate = data.totalValue;
          confidenceInterval = { lower: conversionRate, upper: conversionRate };
          break;
        
        default:
          conversionRate = data.totalEvents;
          confidenceInterval = { lower: conversionRate, upper: conversionRate };
      }

      // Calculate relative uplift compared to first variant (control)
      const baselineRate = rawData[0].participants > 0 ? 
        (rawData[0].totalEvents / rawData[0].participants) : 0;
      const relativeUplift = baselineRate > 0 ? 
        ((conversionRate - baselineRate) / baselineRate) * 100 : 0;

      return {
        variantId: data.variantId,
        variantName: data.variantName,
        participants: data.participants,
        conversionRate,
        confidenceInterval,
        relativeUplift,
        significance: false // Will be calculated in statistical significance
      };
    });
  }

  /**
   * Calculate Wilson confidence interval for proportions
   */
  private calculateWilsonConfidenceInterval(
    successes: number,
    trials: number,
    confidence: number
  ): { lower: number; upper: number } {
    if (trials === 0) {
      return { lower: 0, upper: 0 };
    }

    const z = this.getZScore(confidence);
    const p = successes / trials;
    const n = trials;

    const denominator = 1 + (z * z) / n;
    const center = (p + (z * z) / (2 * n)) / denominator;
    const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denominator;

    return {
      lower: Math.max(0, center - margin),
      upper: Math.min(1, center + margin)
    };
  }

  /**
   * Calculate metric results comparing variants
   */
  private calculateMetricResults(
    metric: MetricDefinition,
    variantResults: VariantResults[]
  ): MetricResults {
    const results: VariantMetricResult[] = variantResults.map(variant => ({
      variantId: variant.variantId,
      value: variant.conversionRate,
      sampleSize: variant.participants,
      standardError: Math.sqrt(variant.conversionRate * (1 - variant.conversionRate) / variant.participants),
      confidenceInterval: variant.confidenceInterval
    }));

    // Determine winner (highest conversion rate with significance)
    const winner = variantResults.reduce((best, current) => 
      current.conversionRate > best.conversionRate ? current : best
    );

    // Calculate confidence in the winner
    const confidence = winner.significance ? 0.95 : 0.5; // Simplified

    return {
      metricId: metric.id,
      metricName: metric.name,
      results,
      winner: winner.variantId,
      confidence
    };
  }

  /**
   * Generate experiment recommendations
   */
  private generateRecommendations(
    variantResults: VariantResults[],
    significance: StatisticalSignificance,
    experiment: Experiment
  ): string[] {
    const recommendations: string[] = [];
    
    if (!significance.significant) {
      if (significance.currentSampleSize < significance.minSampleSize) {
        recommendations.push(
          `Continue running the experiment. You need ${significance.minSampleSize - significance.currentSampleSize} more participants to reach statistical significance.`
        );
        if (significance.daysToSignificance) {
          recommendations.push(
            `At current traffic levels, you'll reach significance in approximately ${significance.daysToSignificance} days.`
          );
        }
      } else {
        recommendations.push(
          'The experiment has sufficient sample size but shows no significant difference. Consider stopping the test and implementing the control variant.'
        );
      }
    } else {
      const winner = variantResults.reduce((best, current) => 
        current.conversionRate > best.conversionRate ? current : best
      );
      
      recommendations.push(
        `Statistical significance achieved! The ${winner.variantName} variant shows a ${winner.relativeUplift.toFixed(1)}% improvement.`
      );
      
      if (winner.relativeUplift > 5) {
        recommendations.push(
          'This represents a meaningful business improvement. Recommend implementing the winning variant.'
        );
      } else {
        recommendations.push(
          'While statistically significant, the practical impact is small. Consider if the implementation effort is worthwhile.'
        );
      }
    }

    // Check for early stopping criteria
    if (significance.pValue < 0.01) {
      recommendations.push(
        'Strong statistical significance detected. You may consider early stopping if business impact is meaningful.'
      );
    }

    return recommendations;
  }

  /**
   * Helper methods for statistical calculations
   */
  private normalCDF(x: number): number {
    // Approximation of the cumulative distribution function for standard normal distribution
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private getZScore(confidence: number): number {
    // Common z-scores for confidence levels
    const zScores: { [key: number]: number } = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };
    
    return zScores[confidence] || 1.96;
  }

  private calculatePower(zScore: number, confidenceLevel: number): number {
    const criticalValue = this.getZScore(confidenceLevel);
    return this.normalCDF(zScore - criticalValue) + this.normalCDF(-zScore - criticalValue);
  }

  private calculateRequiredSampleSize(
    baselineRate: number,
    minimumDetectableEffect: number,
    power: number,
    confidenceLevel: number
  ): number {
    const alpha = 1 - confidenceLevel;
    const beta = 1 - power;
    
    const z_alpha = this.getZScore(confidenceLevel);
    const z_beta = this.getZScore(power);
    
    const p1 = baselineRate;
    const p2 = baselineRate + minimumDetectableEffect;
    const p_avg = (p1 + p2) / 2;
    
    const numerator = (z_alpha * Math.sqrt(2 * p_avg * (1 - p_avg)) + 
                      z_beta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2;
    const denominator = (p2 - p1) ** 2;
    
    return Math.ceil(numerator / denominator);
  }

  private estimateDailyParticipants(experiment: Experiment): number {
    // Simple estimation based on experiment duration and expected participants
    // In a real implementation, this would use historical data
    const daysRunning = experiment.startDate ? 
      Math.max(1, Math.floor((Date.now() - experiment.startDate.getTime()) / (1000 * 60 * 60 * 24))) : 1;
    
    // This would be calculated from actual data
    return 100; // Placeholder
  }

  /**
   * Database helper methods
   */
  private async getExperiment(experimentId: string): Promise<Experiment> {
    const query = `
      SELECT * FROM ab_testing.experiments WHERE id = $1
    `;
    const result = await this.db.query(query, [experimentId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    return this.mapDatabaseRowToExperiment(result.rows[0]);
  }

  private async getExperimentMetrics(experimentId: string): Promise<MetricDefinition[]> {
    const query = `
      SELECT * FROM ab_testing.metric_definitions 
      WHERE experiment_id = $1 
      ORDER BY is_primary DESC, name
    `;
    const result = await this.db.query(query, [experimentId]);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description,
      eventName: row.event_name,
      aggregationType: row.aggregation_type,
      isPrimary: row.is_primary,
      filters: row.filters
    }));
  }

  private async getRawMetricData(
    experimentId: string,
    metric: MetricDefinition
  ): Promise<RawMetricData[]> {
    const query = `
      SELECT 
        ev.variant_id,
        ev.variant_name,
        COUNT(DISTINCT us.user_id) as participants,
        COUNT(me.id) as total_events,
        COALESCE(SUM(me.value), 0) as total_value,
        COUNT(DISTINCT me.user_id) as unique_users
      FROM ab_testing.experiment_variants ev
      LEFT JOIN ab_testing.user_segments us ON ev.id = us.variant_id
      LEFT JOIN ab_testing.metric_events me ON ev.experiment_id = me.experiment_id 
        AND ev.id = me.variant_id 
        AND me.event_name = $2
      WHERE ev.experiment_id = $1
      GROUP BY ev.id, ev.name
      ORDER BY ev.name
    `;
    
    const result = await this.db.query(query, [experimentId, metric.eventName]);
    
    return result.rows.map(row => ({
      variantId: row.variant_id,
      variantName: row.variant_name,
      participants: parseInt(row.participants),
      totalEvents: parseInt(row.total_events),
      totalValue: parseFloat(row.total_value),
      uniqueUsers: parseInt(row.unique_users)
    }));
  }

  private async cacheResults(experimentId: string, results: ExperimentResults): Promise<void> {
    const query = `
      INSERT INTO ab_testing.experiment_results (
        experiment_id, total_participants, variant_results, 
        metric_results, statistical_significance, recommendations,
        calculation_duration_ms, data_freshness_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (experiment_id) 
      DO UPDATE SET 
        total_participants = EXCLUDED.total_participants,
        variant_results = EXCLUDED.variant_results,
        metric_results = EXCLUDED.metric_results,
        statistical_significance = EXCLUDED.statistical_significance,
        recommendations = EXCLUDED.recommendations,
        calculation_date = NOW(),
        calculation_duration_ms = EXCLUDED.calculation_duration_ms,
        data_freshness_minutes = EXCLUDED.data_freshness_minutes
    `;
    
    await this.db.query(query, [
      experimentId,
      results.totalParticipants,
      JSON.stringify(results.variantResults),
      JSON.stringify([results.primaryMetricResults, ...results.secondaryMetricResults]),
      JSON.stringify(results.statisticalSignificance),
      results.recommendations,
      0, // calculation_duration_ms (would be measured)
      0  // data_freshness_minutes (would be calculated)
    ]);
  }

  private mapDatabaseRowToExperiment(row: any): Experiment {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      hypothesis: row.hypothesis,
      featureFlagId: row.feature_flag_id,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      variants: [], // Would be loaded separately
      metrics: [], // Would be loaded separately
      targetAudience: { id: '', name: '', description: '', rules: [] }, // Simplified
      statisticalPower: row.statistical_power,
      confidenceLevel: row.confidence_level,
      minimumDetectableEffect: row.minimum_detectable_effect,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }
}