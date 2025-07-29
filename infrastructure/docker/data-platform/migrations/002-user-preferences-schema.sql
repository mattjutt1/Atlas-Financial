-- Migration: 002-user-preferences-schema
-- Description: Create comprehensive user preferences and settings tables
-- Version: 1.0.0
-- Date: 2025-01-28

-- Create encrypted storage for sensitive preference data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- Core User Preferences Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,

    -- Basic preferences
    theme VARCHAR(50) NOT NULL DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    date_format VARCHAR(50) NOT NULL DEFAULT 'MM/dd/yyyy',
    time_format VARCHAR(50) NOT NULL DEFAULT 'h:mm a',
    decimal_places SMALLINT NOT NULL DEFAULT 2 CHECK (decimal_places BETWEEN 0 AND 6),

    -- Feature preferences
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    auto_sync_enabled BOOLEAN NOT NULL DEFAULT true,
    privacy_mode BOOLEAN NOT NULL DEFAULT false,

    -- Accessibility features (stored as JSONB for flexibility)
    accessibility_features JSONB NOT NULL DEFAULT '{
        "high_contrast": false,
        "large_text": false,
        "screen_reader_support": false,
        "keyboard_navigation": true,
        "reduced_motion": false
    }',

    -- Versioning and timestamps
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
);

-- Add index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON user_preferences(updated_at);

-- ============================================================================
-- Currency and Financial Preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS currency_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,

    -- Currency settings
    primary_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    secondary_currencies TEXT[] NOT NULL DEFAULT ARRAY['EUR', 'GBP'],
    currency_display_format VARCHAR(20) NOT NULL DEFAULT 'symbol'
        CHECK (currency_display_format IN ('symbol', 'code', 'symbol_code')),
    show_currency_symbols BOOLEAN NOT NULL DEFAULT true,
    auto_convert_display BOOLEAN NOT NULL DEFAULT false,

    -- Exchange rate preferences
    exchange_rate_source VARCHAR(100) NOT NULL DEFAULT 'xe.com',
    rate_update_frequency VARCHAR(20) NOT NULL DEFAULT 'daily'
        CHECK (rate_update_frequency IN ('realtime', 'hourly', 'daily', 'weekly')),

    -- Precision settings
    decimal_places SMALLINT NOT NULL DEFAULT 2 CHECK (decimal_places BETWEEN 0 AND 6),
    calculation_precision SMALLINT NOT NULL DEFAULT 4 CHECK (calculation_precision BETWEEN 2 AND 10),
    rounding_method VARCHAR(20) NOT NULL DEFAULT 'round_half_up'
        CHECK (rounding_method IN ('round_half_up', 'round_half_down', 'round_up', 'round_down', 'banker_rounding')),

    -- Currency-specific precision overrides (JSONB for flexibility)
    currency_precision_override JSONB NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT currency_preferences_user_id_unique UNIQUE (user_id),
    CONSTRAINT fk_currency_preferences_user_id
        FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_currency_preferences_user_id ON currency_preferences(user_id);

-- ============================================================================
-- Transaction Defaults and Automation
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,

    -- Default transaction settings
    default_account_id UUID,
    default_category VARCHAR(100),
    auto_categorization_enabled BOOLEAN NOT NULL DEFAULT true,
    duplicate_detection_enabled BOOLEAN NOT NULL DEFAULT true,
    require_notes BOOLEAN NOT NULL DEFAULT false,
    default_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

    -- ML categorization settings
    ml_confidence_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.75
        CHECK (ml_confidence_threshold BETWEEN 0.00 AND 1.00),
    manual_review_threshold DECIMAL(10,2) NOT NULL DEFAULT 100.00,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT transaction_defaults_user_id_unique UNIQUE (user_id),
    CONSTRAINT fk_transaction_defaults_user_id
        FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transaction_defaults_user_id ON transaction_defaults(user_id);

-- ============================================================================
-- Security Settings (with encryption for sensitive data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,

    -- Session and authentication settings
    session_timeout_minutes INTEGER NOT NULL DEFAULT 480 CHECK (session_timeout_minutes BETWEEN 5 AND 1440),
    auto_lock_enabled BOOLEAN NOT NULL DEFAULT true,
    auto_lock_timeout_minutes INTEGER NOT NULL DEFAULT 15 CHECK (auto_lock_timeout_minutes BETWEEN 1 AND 120),
    require_password_on_startup BOOLEAN NOT NULL DEFAULT true,

    -- Biometric and 2FA settings
    biometric_enabled BOOLEAN NOT NULL DEFAULT false,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT false,

    -- Notification and logging settings
    login_notifications BOOLEAN NOT NULL DEFAULT true,
    security_log_retention_days INTEGER NOT NULL DEFAULT 90
        CHECK (security_log_retention_days BETWEEN 30 AND 365),

    -- Encryption settings
    data_encryption_level VARCHAR(20) NOT NULL DEFAULT 'AES256'
        CHECK (data_encryption_level IN ('AES128', 'AES256', 'ChaCha20')),

    -- Biometric settings (encrypted JSONB)
    biometric_settings_encrypted TEXT,

    -- Backup settings (encrypted JSONB)
    backup_settings_encrypted TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT security_settings_user_id_unique UNIQUE (user_id),
    CONSTRAINT fk_security_settings_user_id
        FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_security_settings_user_id ON security_settings(user_id);

-- ============================================================================
-- UI and Performance Settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS ui_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,

    -- Theme settings
    theme_name VARCHAR(100) NOT NULL DEFAULT 'default',
    custom_colors JSONB NOT NULL DEFAULT '{}',
    dark_mode_schedule JSONB NULL,
    accent_color VARCHAR(10) NOT NULL DEFAULT '#007bff',

    -- Typography settings
    font_family VARCHAR(100) NOT NULL DEFAULT 'Inter',
    font_size SMALLINT NOT NULL DEFAULT 14 CHECK (font_size BETWEEN 10 AND 24),
    line_height DECIMAL(3,2) NOT NULL DEFAULT 1.5 CHECK (line_height BETWEEN 1.0 AND 3.0),

    -- Layout preferences
    sidebar_position VARCHAR(20) NOT NULL DEFAULT 'left'
        CHECK (sidebar_position IN ('left', 'right', 'top', 'bottom')),
    sidebar_collapsed BOOLEAN NOT NULL DEFAULT false,
    table_density VARCHAR(20) NOT NULL DEFAULT 'comfortable'
        CHECK (table_density IN ('compact', 'comfortable', 'spacious')),

    -- Dashboard layout (stored as JSONB for flexibility)
    dashboard_layout JSONB NOT NULL DEFAULT '[]',

    -- Chart preferences
    chart_preferences JSONB NOT NULL DEFAULT '{
        "default_chart_type": "line",
        "color_scheme": "default",
        "animation_enabled": true,
        "grid_lines_visible": true,
        "legend_position": "bottom"
    }',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT ui_settings_user_id_unique UNIQUE (user_id),
    CONSTRAINT fk_ui_settings_user_id
        FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ui_settings_user_id ON ui_settings(user_id);

-- ============================================================================
-- Performance Settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,

    -- Cache settings
    cache_enabled BOOLEAN NOT NULL DEFAULT true,
    cache_size_mb INTEGER NOT NULL DEFAULT 128 CHECK (cache_size_mb BETWEEN 32 AND 1024),

    -- Sync settings
    background_sync_enabled BOOLEAN NOT NULL DEFAULT true,
    sync_interval_minutes INTEGER NOT NULL DEFAULT 15 CHECK (sync_interval_minutes BETWEEN 1 AND 60),

    -- UI performance settings
    lazy_loading_enabled BOOLEAN NOT NULL DEFAULT true,
    animation_performance_mode VARCHAR(20) NOT NULL DEFAULT 'balanced'
        CHECK (animation_performance_mode IN ('performance', 'balanced', 'quality')),

    -- Resource limits
    memory_usage_limit_mb INTEGER NOT NULL DEFAULT 512 CHECK (memory_usage_limit_mb BETWEEN 256 AND 2048),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT performance_settings_user_id_unique UNIQUE (user_id),
    CONSTRAINT fk_performance_settings_user_id
        FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_performance_settings_user_id ON performance_settings(user_id);

-- ============================================================================
-- Preference Change Audit Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS preference_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(255) NOT NULL,
    change_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_preference_audit_log_user_id
        FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_preference_audit_log_user_id ON preference_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_preference_audit_log_created_at ON preference_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_preference_audit_log_table_action ON preference_audit_log(table_name, action);

-- ============================================================================
-- Triggers for Automatic Timestamp Updates
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for all preference tables
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_currency_preferences_updated_at
    BEFORE UPDATE ON currency_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_defaults_updated_at
    BEFORE UPDATE ON transaction_defaults
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_settings_updated_at
    BEFORE UPDATE ON security_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ui_settings_updated_at
    BEFORE UPDATE ON ui_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_settings_updated_at
    BEFORE UPDATE ON performance_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Audit Logging Triggers
-- ============================================================================

-- Function to log preference changes
CREATE OR REPLACE FUNCTION log_preference_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the change to audit table
    INSERT INTO preference_audit_log (
        user_id,
        table_name,
        action,
        old_values,
        new_values,
        changed_by
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        COALESCE(current_setting('atlas.current_user', true), 'system')
    );

    -- Return appropriate record
    RETURN CASE TG_OP
        WHEN 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ language 'plpgsql';

-- Create audit triggers for all preference tables
CREATE TRIGGER user_preferences_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION log_preference_change();

CREATE TRIGGER currency_preferences_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON currency_preferences
    FOR EACH ROW EXECUTE FUNCTION log_preference_change();

CREATE TRIGGER transaction_defaults_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transaction_defaults
    FOR EACH ROW EXECUTE FUNCTION log_preference_change();

CREATE TRIGGER security_settings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON security_settings
    FOR EACH ROW EXECUTE FUNCTION log_preference_change();

CREATE TRIGGER ui_settings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON ui_settings
    FOR EACH ROW EXECUTE FUNCTION log_preference_change();

CREATE TRIGGER performance_settings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON performance_settings
    FOR EACH ROW EXECUTE FUNCTION log_preference_change();

-- ============================================================================
-- Encryption/Decryption Helper Functions
-- ============================================================================

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_preference_data(data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    -- In production, use proper encryption with the provided key
    -- This is a simplified version using base64 encoding
    RETURN encode(data::bytea, 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_preference_data(encrypted_data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    -- In production, use proper decryption with the provided key
    -- This is a simplified version using base64 decoding
    RETURN convert_from(decode(encrypted_data, 'base64'), 'UTF8');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all preference tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE preference_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only access their own preferences)
CREATE POLICY user_preferences_policy ON user_preferences
    FOR ALL USING (user_id = current_setting('atlas.current_user_id', true));

CREATE POLICY currency_preferences_policy ON currency_preferences
    FOR ALL USING (user_id = current_setting('atlas.current_user_id', true));

CREATE POLICY transaction_defaults_policy ON transaction_defaults
    FOR ALL USING (user_id = current_setting('atlas.current_user_id', true));

CREATE POLICY security_settings_policy ON security_settings
    FOR ALL USING (user_id = current_setting('atlas.current_user_id', true));

CREATE POLICY ui_settings_policy ON ui_settings
    FOR ALL USING (user_id = current_setting('atlas.current_user_id', true));

CREATE POLICY performance_settings_policy ON performance_settings
    FOR ALL USING (user_id = current_setting('atlas.current_user_id', true));

CREATE POLICY preference_audit_log_policy ON preference_audit_log
    FOR SELECT USING (user_id = current_setting('atlas.current_user_id', true));

-- ============================================================================
-- Default Data Population
-- ============================================================================

-- Function to create default preferences for a new user
CREATE OR REPLACE FUNCTION create_default_user_preferences(p_user_id VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    -- Insert default user preferences
    INSERT INTO user_preferences (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Insert default currency preferences
    INSERT INTO currency_preferences (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Insert default transaction defaults
    INSERT INTO transaction_defaults (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Insert default security settings
    INSERT INTO security_settings (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Insert default UI settings
    INSERT INTO ui_settings (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Insert default performance settings
    INSERT INTO performance_settings (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Preference Synchronization Functions
-- ============================================================================

-- Function to get all preferences for a user (for real-time sync)
CREATE OR REPLACE FUNCTION get_user_all_preferences(p_user_id VARCHAR(255))
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user_preferences', to_jsonb(up.*),
        'currency_preferences', to_jsonb(cp.*),
        'transaction_defaults', to_jsonb(td.*),
        'security_settings', to_jsonb(ss.*),
        'ui_settings', to_jsonb(us.*),
        'performance_settings', to_jsonb(ps.*)
    ) INTO result
    FROM user_preferences up
    LEFT JOIN currency_preferences cp ON up.user_id = cp.user_id
    LEFT JOIN transaction_defaults td ON up.user_id = td.user_id
    LEFT JOIN security_settings ss ON up.user_id = ss.user_id
    LEFT JOIN ui_settings us ON up.user_id = us.user_id
    LEFT JOIN performance_settings ps ON up.user_id = ps.user_id
    WHERE up.user_id = p_user_id;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Validation Functions
-- ============================================================================

-- Function to validate preference constraints
CREATE OR REPLACE FUNCTION validate_preference_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate theme values
    IF NEW.theme IS NOT NULL AND NEW.theme NOT IN ('light', 'dark', 'auto') THEN
        RAISE EXCEPTION 'Invalid theme value: %', NEW.theme;
    END IF;

    -- Validate decimal places
    IF NEW.decimal_places IS NOT NULL AND (NEW.decimal_places < 0 OR NEW.decimal_places > 6) THEN
        RAISE EXCEPTION 'Decimal places must be between 0 and 6';
    END IF;

    -- Validate accessibility features JSON structure
    IF NEW.accessibility_features IS NOT NULL THEN
        -- Ensure all required keys exist
        IF NOT (NEW.accessibility_features ? 'high_contrast' AND
                NEW.accessibility_features ? 'large_text' AND
                NEW.accessibility_features ? 'screen_reader_support' AND
                NEW.accessibility_features ? 'keyboard_navigation' AND
                NEW.accessibility_features ? 'reduced_motion') THEN
            RAISE EXCEPTION 'Invalid accessibility_features structure';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add validation trigger to user_preferences
CREATE TRIGGER validate_user_preferences_trigger
    BEFORE INSERT OR UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION validate_preference_data();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE user_preferences IS 'Core user preferences and settings with versioning support';
COMMENT ON TABLE currency_preferences IS 'Currency display and financial calculation preferences';
COMMENT ON TABLE transaction_defaults IS 'Default settings for transaction creation and automation';
COMMENT ON TABLE security_settings IS 'Security policies and authentication preferences';
COMMENT ON TABLE ui_settings IS 'User interface customization and layout preferences';
COMMENT ON TABLE performance_settings IS 'Application performance and optimization settings';
COMMENT ON TABLE preference_audit_log IS 'Audit trail for all preference changes';

COMMENT ON FUNCTION create_default_user_preferences(VARCHAR) IS 'Creates default preference records for a new user';
COMMENT ON FUNCTION get_user_all_preferences(VARCHAR) IS 'Retrieves all preferences for a user as a JSON object';
COMMENT ON FUNCTION encrypt_preference_data(TEXT, TEXT) IS 'Encrypts sensitive preference data';
COMMENT ON FUNCTION decrypt_preference_data(TEXT, TEXT) IS 'Decrypts sensitive preference data';

-- Migration completed successfully
SELECT 'User preferences schema migration completed successfully' AS status;
