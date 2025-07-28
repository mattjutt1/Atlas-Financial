-- Atlas Core Platform Database Schema
-- Consolidated schema for the modular monolith

\c atlas_core;

-- Enable Row Level Security
ALTER DATABASE atlas_core SET row_security = on;

-- Create schemas for different modules
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS financial;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS dashboard;
CREATE SCHEMA IF NOT EXISTS integrations;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set search path
SET search_path TO public, auth, financial, ai, dashboard, integrations, audit;

-- =============================================================================
-- AUTH SCHEMA - User Management and Authentication
-- =============================================================================

-- Users table (extended from SuperTokens)
CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supertokens_user_id VARCHAR(36) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email_verified BOOLEAN DEFAULT FALSE,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    profile_picture_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    preferred_currency CHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User roles and permissions
CREATE TABLE auth.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE auth.user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES auth.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id),
    PRIMARY KEY (user_id, role_id)
);

-- User sessions and activity tracking
CREATE TABLE auth.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- =============================================================================
-- FINANCIAL SCHEMA - Core Financial Data
-- =============================================================================

-- Financial accounts
CREATE TABLE financial.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    external_id VARCHAR(255), -- For external API integration
    name VARCHAR(200) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- checking, savings, investment, credit_card, loan
    account_subtype VARCHAR(50),
    institution_name VARCHAR(200),
    currency CHAR(3) DEFAULT 'USD',
    current_balance DECIMAL(15, 2) DEFAULT 0.00,
    available_balance DECIMAL(15, 2),
    credit_limit DECIMAL(15, 2),
    interest_rate DECIMAL(5, 4),
    is_active BOOLEAN DEFAULT TRUE,
    is_manual BOOLEAN DEFAULT FALSE, -- Manual vs API-connected account
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Transactions
CREATE TABLE financial.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES financial.accounts(id) ON DELETE CASCADE,
    external_id VARCHAR(255), -- For external API integration
    amount DECIMAL(15, 2) NOT NULL,
    currency CHAR(3) DEFAULT 'USD',
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL,
    posted_date DATE,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    merchant_name VARCHAR(200),
    transaction_type VARCHAR(50), -- debit, credit, transfer
    status VARCHAR(20) DEFAULT 'posted', -- pending, posted, cancelled
    tags TEXT[], -- User-defined tags
    notes TEXT,
    location JSONB, -- Geographic data if available
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern JSONB, -- Recurring transaction pattern
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Categories for transactions
CREATE TABLE financial.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    parent_category_id UUID REFERENCES financial.categories(id),
    color VARCHAR(7), -- Hex color code
    icon VARCHAR(50),
    is_income BOOLEAN DEFAULT FALSE,
    is_transfer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Budgets
CREATE TABLE financial.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES financial.categories(id),
    amount DECIMAL(15, 2) NOT NULL,
    period VARCHAR(20) NOT NULL, -- monthly, weekly, yearly
    start_date DATE NOT NULL,
    end_date DATE,
    spent_amount DECIMAL(15, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    alert_threshold DECIMAL(5, 2) DEFAULT 0.80, -- Alert at 80%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investment portfolios and holdings
CREATE TABLE financial.portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    portfolio_type VARCHAR(50), -- 401k, ira, taxable, etc.
    total_value DECIMAL(15, 2) DEFAULT 0.00,
    currency CHAR(3) DEFAULT 'USD',
    provider VARCHAR(100), -- Broker or provider name
    account_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE financial.holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES financial.portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL, -- Stock/ETF symbol
    name VARCHAR(200),
    asset_type VARCHAR(50), -- stock, bond, etf, mutual_fund, crypto
    shares DECIMAL(15, 8) NOT NULL,
    average_cost DECIMAL(15, 4),
    current_price DECIMAL(15, 4),
    market_value DECIMAL(15, 2),
    currency CHAR(3) DEFAULT 'USD',
    last_price_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial goals
CREATE TABLE financial.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50), -- savings, debt_payoff, investment
    target_amount DECIMAL(15, 2) NOT NULL,
    current_amount DECIMAL(15, 2) DEFAULT 0.00,
    target_date DATE,
    monthly_contribution DECIMAL(15, 2),
    priority INTEGER DEFAULT 1, -- 1-5 priority scale
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- AI SCHEMA - AI Engine Data and Insights
-- =============================================================================

-- AI insights and recommendations
CREATE TABLE ai.insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL, -- spending, saving, investment, debt
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info', -- info, warning, critical
    confidence_score DECIMAL(3, 2), -- 0.00 to 1.00
    data_sources TEXT[], -- Which data was used for this insight
    action_items JSONB DEFAULT '[]'::jsonb,
    is_dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Brutal honesty feedback (special AI insights)
CREATE TABLE ai.brutal_honesty (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feedback_text TEXT NOT NULL,
    spending_analysis JSONB,
    improvement_suggestions JSONB,
    harsh_score INTEGER CHECK (harsh_score >= 1 AND harsh_score <= 10),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_viewed BOOLEAN DEFAULT FALSE,
    user_reaction VARCHAR(20) -- liked, disliked, neutral
);

-- AI model training data and feedback
CREATE TABLE ai.model_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_id UUID REFERENCES ai.insights(id),
    feedback_type VARCHAR(20) NOT NULL, -- helpful, not_helpful, incorrect
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- DASHBOARD SCHEMA - Dashboard and UI State
-- =============================================================================

-- User dashboard configurations
CREATE TABLE dashboard.dashboard_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    layout_name VARCHAR(100) DEFAULT 'default',
    widget_configuration JSONB NOT NULL DEFAULT '[]'::jsonb,
    theme_preferences JSONB DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved dashboard views and reports
CREATE TABLE dashboard.saved_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- spending, income, net_worth, budget
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    schedule JSONB, -- For automated reports
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_generated_at TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- INTEGRATIONS SCHEMA - External Service Integration
-- =============================================================================

-- External service connections (Plaid, Yodlee, etc.)
CREATE TABLE integrations.connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- plaid, yodlee, manual
    external_connection_id VARCHAR(255),
    institution_id VARCHAR(255),
    institution_name VARCHAR(200),
    connection_status VARCHAR(20) DEFAULT 'active', -- active, error, disconnected
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_frequency VARCHAR(20) DEFAULT 'daily', -- realtime, hourly, daily, weekly
    error_message TEXT,
    credentials_encrypted BYTEA, -- Encrypted connection credentials
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync jobs and history
CREATE TABLE integrations.sync_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES integrations.connections(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL, -- full_sync, incremental, account_update
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- AUDIT SCHEMA - Security and Compliance
-- =============================================================================

-- Audit log for all important actions
CREATE TABLE audit.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security events
CREATE TABLE audit.security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    event_type VARCHAR(50) NOT NULL, -- login_success, login_failure, password_change
    severity VARCHAR(20) DEFAULT 'info', -- info, warning, critical
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Auth indexes
CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_users_supertokens_id ON auth.users(supertokens_user_id);
CREATE INDEX idx_user_sessions_token ON auth.user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON auth.user_sessions(user_id);

-- Financial indexes
CREATE INDEX idx_accounts_user_id ON financial.accounts(user_id);
CREATE INDEX idx_transactions_user_id ON financial.transactions(user_id);
CREATE INDEX idx_transactions_account_id ON financial.transactions(account_id);
CREATE INDEX idx_transactions_date ON financial.transactions(transaction_date);
CREATE INDEX idx_transactions_category ON financial.transactions(category);
CREATE INDEX idx_budgets_user_id ON financial.budgets(user_id);
CREATE INDEX idx_portfolios_user_id ON financial.portfolios(user_id);
CREATE INDEX idx_holdings_portfolio_id ON financial.holdings(portfolio_id);
CREATE INDEX idx_goals_user_id ON financial.goals(user_id);

-- AI indexes
CREATE INDEX idx_insights_user_id ON ai.insights(user_id);
CREATE INDEX idx_insights_type ON ai.insights(insight_type);
CREATE INDEX idx_brutal_honesty_user_id ON ai.brutal_honesty(user_id);

-- Dashboard indexes
CREATE INDEX idx_dashboard_configs_user_id ON dashboard.dashboard_configs(user_id);
CREATE INDEX idx_saved_reports_user_id ON dashboard.saved_reports(user_id);

-- Integrations indexes
CREATE INDEX idx_connections_user_id ON integrations.connections(user_id);
CREATE INDEX idx_sync_jobs_connection_id ON integrations.sync_jobs(connection_id);

-- Audit indexes
CREATE INDEX idx_audit_log_user_id ON audit.audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit.audit_log(created_at);
CREATE INDEX idx_security_events_user_id ON audit.security_events(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all user-specific tables
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.brutal_honesty ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard.dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard.saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.connections ENABLE ROW LEVEL SECURITY;

-- Create policies (users can only see their own data)
CREATE POLICY user_isolation_policy ON auth.users
    FOR ALL USING (id = current_setting('app.current_user_id')::uuid);

CREATE POLICY user_isolation_policy ON financial.accounts
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY user_isolation_policy ON financial.transactions
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY user_isolation_policy ON financial.categories
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY user_isolation_policy ON financial.budgets
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY user_isolation_policy ON financial.portfolios
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY user_isolation_policy ON financial.goals
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY user_isolation_policy ON ai.insights
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY user_isolation_policy ON ai.brutal_honesty
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY user_isolation_policy ON dashboard.dashboard_configs
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY user_isolation_policy ON dashboard.saved_reports
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY user_isolation_policy ON integrations.connections
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

-- =============================================================================
-- TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON financial.accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON financial.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON financial.budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON financial.portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON financial.holdings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON financial.goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dashboard_configs_updated_at BEFORE UPDATE ON dashboard.dashboard_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON integrations.connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data
INSERT INTO auth.roles (name, description, permissions) VALUES
('user', 'Standard user with basic access', '["read:own_data", "write:own_data"]'),
('premium', 'Premium user with advanced features', '["read:own_data", "write:own_data", "access:premium_features"]'),
('admin', 'Administrator with full access', '["read:all_data", "write:all_data", "admin:users", "admin:system"]');

-- Insert default categories
INSERT INTO financial.categories (id, user_id, name, is_income, color, icon) VALUES
(uuid_generate_v4(), NULL, 'Income', true, '#22c55e', 'dollar-sign'),
(uuid_generate_v4(), NULL, 'Food & Dining', false, '#f59e0b', 'utensils'),
(uuid_generate_v4(), NULL, 'Transportation', false, '#3b82f6', 'car'),
(uuid_generate_v4(), NULL, 'Shopping', false, '#8b5cf6', 'shopping-bag'),
(uuid_generate_v4(), NULL, 'Entertainment', false, '#ec4899', 'film'),
(uuid_generate_v4(), NULL, 'Bills & Utilities', false, '#ef4444', 'file-text'),
(uuid_generate_v4(), NULL, 'Healthcare', false, '#06b6d4', 'heart'),
(uuid_generate_v4(), NULL, 'Education', false, '#84cc16', 'book'),
(uuid_generate_v4(), NULL, 'Travel', false, '#f97316', 'plane'),
(uuid_generate_v4(), NULL, 'Investment', false, '#10b981', 'trending-up'),
(uuid_generate_v4(), NULL, 'Transfer', false, '#6b7280', 'arrow-right');

COMMIT;
