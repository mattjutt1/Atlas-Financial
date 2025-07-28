-- Migration Setup: Create migrations tracking infrastructure
-- This must be run before any other migrations

\c atlas_core;

BEGIN;

-- Create schemas for migrations and backups
CREATE SCHEMA IF NOT EXISTS migrations;
CREATE SCHEMA IF NOT EXISTS backup;

-- Migration history tracking table
CREATE TABLE IF NOT EXISTS migrations.migration_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    migration_version VARCHAR(50) NOT NULL,
    description TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    execution_time_ms INTEGER,
    checksum VARCHAR(32),
    rollback_sql TEXT,
    created_by VARCHAR(100) DEFAULT CURRENT_USER
);

-- Migration locks to prevent concurrent execution
CREATE TABLE IF NOT EXISTS migrations.migration_locks (
    id INTEGER PRIMARY KEY DEFAULT 1,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by VARCHAR(100),
    process_id INTEGER,
    CONSTRAINT single_lock CHECK (id = 1)
);

-- Grant permissions
GRANT USAGE ON SCHEMA migrations TO PUBLIC;
GRANT USAGE ON SCHEMA backup TO PUBLIC;
GRANT SELECT ON migrations.migration_history TO PUBLIC;

-- Insert initial migration record
INSERT INTO migrations.migration_history (
    migration_name,
    migration_version,
    description,
    executed_at,
    execution_time_ms,
    checksum
) VALUES (
    '000-setup-migrations-schema',
    '1.0.0',
    'Setup migrations tracking infrastructure and backup schema',
    NOW(),
    0,
    MD5('000-setup-migrations-schema.sql')
);

COMMIT;

\echo 'Migration infrastructure setup completed'
\echo 'Schemas created: migrations, backup'
\echo 'Migration tracking tables created'
