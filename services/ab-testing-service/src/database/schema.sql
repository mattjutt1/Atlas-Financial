-- Atlas Financial A/B Testing Service Database Schema
-- Comprehensive schema for feature flags, experiments, and metrics collection

-- Create schema for A/B testing
CREATE SCHEMA IF NOT EXISTS ab_testing;

-- Feature Flags Table
CREATE TABLE ab_testing.feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    enabled BOOLEAN DEFAULT false,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    
    -- Metadata for flag management
    version INTEGER DEFAULT 1,
    archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance tracking
    last_evaluated_at TIMESTAMP WITH TIME ZONE,
    evaluation_count INTEGER DEFAULT 0
);

-- Feature Flag Variants Table
CREATE TABLE ab_testing.feature_flag_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_flag_id UUID NOT NULL REFERENCES ab_testing.feature_flags(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    weight DECIMAL(5,4) DEFAULT 0.0 CHECK (weight >= 0 AND weight <= 1),
    payload JSONB,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(feature_flag_id, name)
);

-- Feature Flag Targeting Rules Table
CREATE TABLE ab_testing.targeting_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_flag_id UUID NOT NULL REFERENCES ab_testing.feature_flags(id) ON DELETE CASCADE,
    attribute VARCHAR(255) NOT NULL,
    operator VARCHAR(50) NOT NULL CHECK (operator IN ('equals', 'not_equals', 'in', 'not_in', 'greater_than', 'less_than', 'contains')),
    values JSONB NOT NULL,
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Experiments Table
CREATE TABLE ab_testing.experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hypothesis TEXT NOT NULL,
    feature_flag_id UUID NOT NULL REFERENCES ab_testing.feature_flags(id),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'stopped')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    actual_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Statistical parameters
    statistical_power DECIMAL(3,2) DEFAULT 0.80 CHECK (statistical_power > 0 AND statistical_power <= 1),
    confidence_level DECIMAL(3,2) DEFAULT 0.95 CHECK (confidence_level > 0 AND confidence_level <= 1),
    minimum_detectable_effect DECIMAL(5,4) DEFAULT 0.05 CHECK (minimum_detectable_effect > 0),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    
    -- Results cache
    last_analyzed_at TIMESTAMP WITH TIME ZONE,
    analysis_results JSONB,
    
    UNIQUE(name),
    CHECK (end_date IS NULL OR end_date > start_date)
);

-- Experiment Variants Table
CREATE TABLE ab_testing.experiment_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES ab_testing.experiments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    traffic_allocation DECIMAL(5,4) DEFAULT 0.0 CHECK (traffic_allocation >= 0 AND traffic_allocation <= 1),
    is_control BOOLEAN DEFAULT false,
    configuration JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(experiment_id, name)
);

-- Metric Definitions Table
CREATE TABLE ab_testing.metric_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES ab_testing.experiments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('engagement', 'conversion', 'retention', 'performance', 'custom')),
    description TEXT,
    event_name VARCHAR(255) NOT NULL,
    aggregation_type VARCHAR(50) DEFAULT 'count' CHECK (aggregation_type IN ('count', 'sum', 'average', 'conversion_rate', 'unique_count')),
    is_primary BOOLEAN DEFAULT false,
    filters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(experiment_id, name)
);

-- Audience Definitions Table
CREATE TABLE ab_testing.audience_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES ab_testing.experiments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rules JSONB NOT NULL,
    estimated_size INTEGER,
    actual_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Segments Table (for tracking experiment participation)
CREATE TABLE ab_testing.user_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    experiment_id UUID NOT NULL REFERENCES ab_testing.experiments(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_testing.experiment_variants(id),
    segment_name VARCHAR(255),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    context JSONB,
    
    -- Tracking flags
    first_exposure BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_count INTEGER DEFAULT 1,
    
    UNIQUE(user_id, experiment_id),
    INDEX idx_user_segments_user_experiment (user_id, experiment_id),
    INDEX idx_user_segments_experiment_variant (experiment_id, variant_id)
);

-- Metric Events Table (for tracking user interactions)
CREATE TABLE ab_testing.metric_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    session_id UUID,
    experiment_id UUID NOT NULL REFERENCES ab_testing.experiments(id),
    variant_id UUID NOT NULL REFERENCES ab_testing.experiment_variants(id),
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('feature_exposure', 'click', 'conversion', 'engagement', 'error', 'performance', 'custom')),
    properties JSONB,
    value DECIMAL(15,4),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Performance indexes
    INDEX idx_metric_events_experiment_timestamp (experiment_id, timestamp),
    INDEX idx_metric_events_user_experiment (user_id, experiment_id),
    INDEX idx_metric_events_event_name_timestamp (event_name, timestamp),
    INDEX idx_metric_events_variant_timestamp (variant_id, timestamp)
);

-- AI Feature Configurations Table (for AI-specific A/B tests)
CREATE TABLE ab_testing.ai_feature_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_flag_id UUID NOT NULL REFERENCES ab_testing.feature_flags(id) ON DELETE CASCADE,
    feature_name VARCHAR(255) NOT NULL CHECK (feature_name IN ('budget_ai', 'goal_ai', 'investment_ai', 'debt_ai', 'market_data_ai')),
    configuration JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(feature_flag_id, feature_name)
);

-- Experiment Results Cache Table
CREATE TABLE ab_testing.experiment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES ab_testing.experiments(id) ON DELETE CASCADE,
    calculation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_participants INTEGER NOT NULL,
    variant_results JSONB NOT NULL,
    metric_results JSONB NOT NULL,
    statistical_significance JSONB NOT NULL,
    recommendations TEXT[],
    
    -- Performance tracking
    calculation_duration_ms INTEGER,
    data_freshness_minutes INTEGER,
    
    INDEX idx_experiment_results_experiment_date (experiment_id, calculation_date DESC)
);

-- Performance Monitoring Table
CREATE TABLE ab_testing.performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    labels JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_performance_metrics_name_time (metric_name, recorded_at)
);

-- Audit Log Table
CREATE TABLE ab_testing.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    INDEX idx_audit_logs_entity (entity_type, entity_id),
    INDEX idx_audit_logs_user_timestamp (user_id, timestamp),
    INDEX idx_audit_logs_timestamp (timestamp)
);

-- Create Triggers for Updated At Timestamps
CREATE OR REPLACE FUNCTION ab_testing.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON ab_testing.feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION ab_testing.update_updated_at_column();

CREATE TRIGGER update_experiments_updated_at
    BEFORE UPDATE ON ab_testing.experiments
    FOR EACH ROW
    EXECUTE FUNCTION ab_testing.update_updated_at_column();

CREATE TRIGGER update_audience_definitions_updated_at
    BEFORE UPDATE ON ab_testing.audience_definitions
    FOR EACH ROW
    EXECUTE FUNCTION ab_testing.update_updated_at_column();

CREATE TRIGGER update_ai_feature_configs_updated_at
    BEFORE UPDATE ON ab_testing.ai_feature_configs
    FOR EACH ROW
    EXECUTE FUNCTION ab_testing.update_updated_at_column();

-- Create Function for Feature Flag Evaluation
CREATE OR REPLACE FUNCTION ab_testing.evaluate_feature_flag(
    p_feature_flag_name VARCHAR(255),
    p_user_id UUID,
    p_user_context JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    enabled BOOLEAN,
    variant_id UUID,
    variant_name VARCHAR(255),
    variant_payload JSONB,
    tracking_id UUID
) AS $$
DECLARE
    flag_record RECORD;
    user_hash INTEGER;
    rollout_bucket INTEGER;
    total_weight DECIMAL;
    running_weight DECIMAL;
    variant_record RECORD;
    rule_record RECORD;
    rule_passed BOOLEAN;
    tracking_id UUID;
BEGIN
    -- Get feature flag
    SELECT ff.id, ff.enabled, ff.rollout_percentage
    INTO flag_record
    FROM ab_testing.feature_flags ff
    WHERE ff.name = p_feature_flag_name AND ff.archived = false;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(255), NULL::JSONB, NULL::UUID;
        RETURN;
    END IF;
    
    -- Check if flag is enabled
    IF NOT flag_record.enabled THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(255), NULL::JSONB, NULL::UUID;
        RETURN;
    END IF;
    
    -- Generate tracking ID
    tracking_id := uuid_generate_v4();
    
    -- Check targeting rules
    rule_passed := true;
    FOR rule_record IN 
        SELECT tr.attribute, tr.operator, tr.values
        FROM ab_testing.targeting_rules tr
        WHERE tr.feature_flag_id = flag_record.id AND tr.enabled = true
        ORDER BY tr.priority
    LOOP
        -- Evaluate rule (simplified implementation)
        CASE rule_record.operator
            WHEN 'equals' THEN
                rule_passed := (p_user_context->rule_record.attribute)::text = (rule_record.values->0)::text;
            WHEN 'in' THEN
                rule_passed := p_user_context ? rule_record.attribute AND 
                              (p_user_context->rule_record.attribute)::text = ANY(
                                  SELECT jsonb_array_elements_text(rule_record.values)
                              );
            -- Add more operators as needed
        END CASE;
        
        IF NOT rule_passed THEN
            RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(255), NULL::JSONB, tracking_id;
            RETURN;
        END IF;
    END LOOP;
    
    -- Check rollout percentage
    user_hash := (hashtext(p_user_id::text) % 100) + 1;
    IF user_hash > flag_record.rollout_percentage THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(255), NULL::JSONB, tracking_id;
        RETURN;
    END IF;
    
    -- Select variant based on weights
    SELECT SUM(weight) INTO total_weight
    FROM ab_testing.feature_flag_variants
    WHERE feature_flag_id = flag_record.id AND enabled = true;
    
    IF total_weight = 0 THEN
        RETURN QUERY SELECT true, NULL::UUID, NULL::VARCHAR(255), NULL::JSONB, tracking_id;
        RETURN;
    END IF;
    
    rollout_bucket := (hashtext(p_user_id::text || p_feature_flag_name) % 10000) + 1;
    running_weight := 0;
    
    FOR variant_record IN
        SELECT ffv.id, ffv.name, ffv.weight, ffv.payload
        FROM ab_testing.feature_flag_variants ffv
        WHERE ffv.feature_flag_id = flag_record.id AND ffv.enabled = true
        ORDER BY ffv.name
    LOOP
        running_weight := running_weight + variant_record.weight;
        IF rollout_bucket <= (running_weight / total_weight * 10000) THEN
            RETURN QUERY SELECT true, variant_record.id, variant_record.name, variant_record.payload, tracking_id;
            RETURN;
        END IF;
    END LOOP;
    
    -- Default to enabled with no variant
    RETURN QUERY SELECT true, NULL::UUID, NULL::VARCHAR(255), NULL::JSONB, tracking_id;
END;
$$ LANGUAGE plpgsql;

-- Create Indexes for Performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_flags_name_enabled 
    ON ab_testing.feature_flags (name, enabled) WHERE archived = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_flag_variants_flag_enabled 
    ON ab_testing.feature_flag_variants (feature_flag_id, enabled);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_targeting_rules_flag_enabled 
    ON ab_testing.targeting_rules (feature_flag_id, enabled, priority);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_experiments_status_dates 
    ON ab_testing.experiments (status, start_date, end_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_segments_lookup 
    ON ab_testing.user_segments (user_id, experiment_id, assigned_at);

-- Create Partitioning for Large Tables (metric_events)
-- This should be done in production with appropriate partition bounds
-- CREATE TABLE ab_testing.metric_events_y2025m01 PARTITION OF ab_testing.metric_events
--     FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Insert Sample Data for Testing
INSERT INTO ab_testing.feature_flags (name, description, enabled, rollout_percentage, created_by)
VALUES 
    ('budget_ai_insights', 'Enable AI-powered budget insights and recommendations', true, 25, uuid_generate_v4()),
    ('goal_ai_predictions', 'Enable AI goal achievement predictions', true, 50, uuid_generate_v4()),
    ('investment_ai_rebalancing', 'Enable AI portfolio rebalancing recommendations', false, 10, uuid_generate_v4()),
    ('debt_ai_optimization', 'Enable AI debt payoff optimization', true, 75, uuid_generate_v4()),
    ('real_time_market_data', 'Enable real-time market data integration', true, 100, uuid_generate_v4());

-- Insert Sample Variants
INSERT INTO ab_testing.feature_flag_variants (feature_flag_id, name, description, weight, payload)
SELECT 
    ff.id,
    'control',
    'Control group - existing functionality',
    0.5,
    '{"version": "control", "features": []}'::jsonb
FROM ab_testing.feature_flags ff WHERE ff.name = 'budget_ai_insights';

INSERT INTO ab_testing.feature_flag_variants (feature_flag_id, name, description, weight, payload)
SELECT 
    ff.id,
    'ai_enhanced',
    'AI-enhanced budget insights with ML recommendations',
    0.5,
    '{"version": "ai_enhanced", "features": ["spending_anomaly_detection", "predictive_allocation", "smart_insights"]}'::jsonb
FROM ab_testing.feature_flags ff WHERE ff.name = 'budget_ai_insights';

-- Add comments for documentation
COMMENT ON SCHEMA ab_testing IS 'A/B Testing and Feature Flag Management for Atlas Financial';
COMMENT ON TABLE ab_testing.feature_flags IS 'Feature flags for controlling feature rollouts';
COMMENT ON TABLE ab_testing.experiments IS 'A/B test experiments with statistical tracking';
COMMENT ON TABLE ab_testing.metric_events IS 'User interaction events for experiment analysis';
COMMENT ON TABLE ab_testing.user_segments IS 'User assignment to experimental variants';

-- Grant permissions (adjust as needed for your setup)
-- GRANT USAGE ON SCHEMA ab_testing TO atlas_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ab_testing TO atlas_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ab_testing TO atlas_app;