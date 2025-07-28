/**
 * Consolidated Configuration Management for Atlas Financial
 * Eliminates duplicate config patterns across all services
 */
import { createLogger } from '../monitoring';
const logger = createLogger('config');
/**
 * Get environment from various sources with fallback
 */
export function getEnvironment() {
    // Check multiple possible environment variables
    const env = process.env.NODE_ENV ||
        process.env.ENVIRONMENT ||
        process.env.APP_ENV ||
        'development';
    switch (env.toLowerCase()) {
        case 'production':
        case 'prod':
            return 'production';
        case 'staging':
        case 'stage':
            return 'staging';
        case 'test':
        case 'testing':
            return 'test';
        case 'development':
        case 'dev':
        default:
            return 'development';
    }
}
/**
 * Get a required environment variable, throw if missing
 */
export function getRequiredEnv(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
}
/**
 * Get an optional environment variable with fallback
 */
export function getOptionalEnv(key, fallback) {
    return process.env[key] || fallback;
}
/**
 * Parse boolean environment variable
 */
export function getBooleanEnv(key, fallback = false) {
    const value = process.env[key];
    if (!value)
        return fallback;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}
/**
 * Parse number environment variable
 */
export function getNumberEnv(key, fallback) {
    const value = process.env[key];
    if (!value)
        return fallback;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
}
/**
 * Create authentication configuration based on environment
 */
export function createAuthConfig(environment) {
    const isProduction = environment === 'production';
    const baseUrl = getOptionalEnv('NEXT_PUBLIC_SUPERTOKENS_API_DOMAIN', 'http://localhost:3000');
    return {
        provider: 'supertokens',
        domain: baseUrl,
        apiDomain: baseUrl,
        websiteDomain: getOptionalEnv('NEXT_PUBLIC_SUPERTOKENS_WEBSITE_DOMAIN', baseUrl),
        jwksUrl: getOptionalEnv('JWKS_URL', `${baseUrl}/auth/jwt/jwks.json`),
        audience: getOptionalEnv('JWT_AUDIENCE', 'atlas-financial'),
        sessionDomain: getOptionalEnv('NEXT_PUBLIC_SESSION_DOMAIN', 'localhost'),
        cookieDomain: getOptionalEnv('NEXT_PUBLIC_COOKIE_DOMAIN', 'localhost'),
        cookieSecure: isProduction,
        tokenExpiry: getNumberEnv('JWT_TOKEN_EXPIRY', 3600) // 1 hour
    };
}
/**
 * Create API configuration based on environment
 */
export function createApiConfig(environment) {
    const baseUrl = environment === 'production'
        ? getRequiredEnv('API_BASE_URL')
        : getOptionalEnv('API_BASE_URL', 'http://localhost:8080');
    return {
        baseUrl,
        timeout: getNumberEnv('API_TIMEOUT', 30000), // 30 seconds
        retries: getNumberEnv('API_RETRIES', 3),
        rateLimit: {
            requests: getNumberEnv('API_RATE_LIMIT_REQUESTS', 1000),
            window: getNumberEnv('API_RATE_LIMIT_WINDOW', 60000) // 1 minute
        }
    };
}
/**
 * Create monitoring configuration based on environment
 */
export function createMonitoringConfig(environment) {
    const isProduction = environment === 'production';
    return {
        enabled: getBooleanEnv('MONITORING_ENABLED', isProduction),
        level: getOptionalEnv('LOG_LEVEL', isProduction ? 'info' : 'debug'),
        service: getOptionalEnv('SERVICE_NAME', 'atlas-financial'),
        version: getOptionalEnv('SERVICE_VERSION', '1.0.0'),
        metrics: {
            enabled: getBooleanEnv('METRICS_ENABLED', true),
            namespace: getOptionalEnv('METRICS_NAMESPACE', 'atlas_financial'),
            endpoint: getOptionalEnv('METRICS_ENDPOINT', undefined)
        },
        tracing: {
            enabled: getBooleanEnv('TRACING_ENABLED', isProduction),
            endpoint: getOptionalEnv('TRACING_ENDPOINT', undefined),
            sampleRate: parseFloat(getOptionalEnv('TRACING_SAMPLE_RATE', '0.1'))
        }
    };
}
/**
 * Create feature flags configuration
 */
export function createFeatureFlags(environment) {
    const isDevelopment = environment === 'development';
    return {
        // Core features
        enablePortfolioAnalysis: getBooleanEnv('FEATURE_PORTFOLIO_ANALYSIS', true),
        enableDebtOptimization: getBooleanEnv('FEATURE_DEBT_OPTIMIZATION', true),
        enableBudgetTracking: getBooleanEnv('FEATURE_BUDGET_TRACKING', true),
        enableInvestmentAdvice: getBooleanEnv('FEATURE_INVESTMENT_ADVICE', false),
        // Advanced features
        enableAIInsights: getBooleanEnv('FEATURE_AI_INSIGHTS', false),
        enableRealTimeData: getBooleanEnv('FEATURE_REAL_TIME_DATA', false),
        enableAdvancedReporting: getBooleanEnv('FEATURE_ADVANCED_REPORTING', false),
        // Development features
        enableDebugMode: getBooleanEnv('FEATURE_DEBUG_MODE', isDevelopment),
        enableMockData: getBooleanEnv('FEATURE_MOCK_DATA', isDevelopment),
        enablePlayground: getBooleanEnv('FEATURE_PLAYGROUND', isDevelopment),
        // Security features
        enableAuditLogging: getBooleanEnv('FEATURE_AUDIT_LOGGING', true),
        enableRateLimiting: getBooleanEnv('FEATURE_RATE_LIMITING', true),
        enableEncryption: getBooleanEnv('FEATURE_ENCRYPTION', true),
        // UI features
        enableDarkMode: getBooleanEnv('FEATURE_DARK_MODE', true),
        enableAccessibility: getBooleanEnv('FEATURE_ACCESSIBILITY', true),
        enableResponsiveDesign: getBooleanEnv('FEATURE_RESPONSIVE_DESIGN', true),
        // Integration features
        enableFireflyIntegration: getBooleanEnv('FEATURE_FIREFLY_INTEGRATION', true),
        enablePlaidIntegration: getBooleanEnv('FEATURE_PLAID_INTEGRATION', false),
        enableBankIntegration: getBooleanEnv('FEATURE_BANK_INTEGRATION', false)
    };
}
/**
 * Main configuration factory function
 */
export function createConfig(environment) {
    const env = environment || getEnvironment();
    logger.info('Creating configuration', { environment: env });
    const config = {
        environment: env,
        api: createApiConfig(env),
        auth: createAuthConfig(env),
        monitoring: createMonitoringConfig(env),
        features: createFeatureFlags(env)
    };
    // Add database config for backend services
    if (typeof window === 'undefined') {
        config.database = {
            url: getOptionalEnv('DATABASE_URL', 'postgresql://atlas:atlas@localhost/atlas_dev'),
            poolSize: getNumberEnv('DATABASE_POOL_SIZE', 10),
            timeout: getNumberEnv('DATABASE_TIMEOUT', 30000),
            ssl: getBooleanEnv('DATABASE_SSL', env === 'production'),
            migrations: {
                auto: getBooleanEnv('DATABASE_AUTO_MIGRATE', env === 'development'),
                directory: getOptionalEnv('DATABASE_MIGRATIONS_DIR', './migrations')
            }
        };
        config.redis = {
            url: getOptionalEnv('REDIS_URL', 'redis://localhost:6379'),
            poolSize: getNumberEnv('REDIS_POOL_SIZE', 10),
            timeout: getNumberEnv('REDIS_TIMEOUT', 5000),
            defaultTtl: getNumberEnv('REDIS_DEFAULT_TTL', 3600),
            enabled: getBooleanEnv('REDIS_ENABLED', true)
        };
    }
    // Validate configuration
    validateConfig(config);
    logger.info('Configuration created successfully', {
        environment: env,
        hasDatabase: !!config.database,
        hasRedis: !!config.redis,
        featuresEnabled: Object.keys(config.features).filter(key => config.features[key]).length
    });
    return config;
}
/**
 * Validate configuration for common issues
 */
function validateConfig(config) {
    const errors = [];
    // Validate URLs
    try {
        new URL(config.api.baseUrl);
    }
    catch {
        errors.push('Invalid API base URL');
    }
    try {
        new URL(config.auth.apiDomain);
    }
    catch {
        errors.push('Invalid auth API domain');
    }
    try {
        new URL(config.auth.websiteDomain);
    }
    catch {
        errors.push('Invalid auth website domain');
    }
    // Validate timeouts are reasonable
    if (config.api.timeout < 1000 || config.api.timeout > 300000) {
        errors.push('API timeout should be between 1s and 5m');
    }
    // Validate production requirements
    if (config.environment === 'production') {
        if (!config.auth.cookieSecure) {
            errors.push('Cookies must be secure in production');
        }
        if (config.features.enableDebugMode) {
            errors.push('Debug mode should be disabled in production');
        }
        if (config.features.enableMockData) {
            errors.push('Mock data should be disabled in production');
        }
    }
    if (errors.length > 0) {
        throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
}
/**
 * Configuration constants for common settings
 */
export const CONFIG_CONSTANTS = {
    // JWT
    JWT_MIN_SECRET_LENGTH: 32,
    JWT_DEFAULT_EXPIRY: 3600, // 1 hour
    JWT_REFRESH_THRESHOLD: 300, // 5 minutes before expiry
    // API
    API_MAX_TIMEOUT: 300000, // 5 minutes
    API_DEFAULT_TIMEOUT: 30000, // 30 seconds
    API_MAX_RETRIES: 5,
    // Security
    PASSWORD_MIN_LENGTH: 8,
    SESSION_TIMEOUT: 1800, // 30 minutes
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    // Performance
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 1000,
    CACHE_DEFAULT_TTL: 3600, // 1 hour
    // File uploads
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['pdf', 'png', 'jpg', 'jpeg', 'csv', 'xlsx']
};
/**
 * Environment-specific configuration presets
 */
export const CONFIG_PRESETS = {
    development: {
        api: { timeout: 10000, retries: 1 },
        monitoring: { level: 'debug', tracing: { enabled: false } },
        features: { enableDebugMode: true, enableMockData: true }
    },
    test: {
        api: { timeout: 5000, retries: 0 },
        monitoring: { level: 'error', enabled: false },
        features: { enableDebugMode: false, enableMockData: true }
    },
    staging: {
        api: { timeout: 30000, retries: 2 },
        monitoring: { level: 'info', tracing: { enabled: true } },
        features: { enableDebugMode: false, enableMockData: false }
    },
    production: {
        api: { timeout: 30000, retries: 3 },
        monitoring: { level: 'warn', tracing: { enabled: true } },
        features: { enableDebugMode: false, enableMockData: false }
    }
};
/**
 * Get configuration for specific service context
 */
export function getServiceConfig(serviceName, environment) {
    const config = createConfig(environment);
    // Service-specific overrides
    switch (serviceName) {
        case 'rust-financial-engine':
            config.api.timeout = 60000; // Longer timeout for complex calculations
            config.features.enableAIInsights = true;
            break;
        case 'ai-engine':
            config.api.timeout = 120000; // Even longer for AI operations
            config.features.enableAIInsights = true;
            config.features.enableRealTimeData = false;
            break;
        case 'web-app':
        case 'platform-app':
            config.features.enableResponsiveDesign = true;
            config.features.enableAccessibility = true;
            break;
        case 'hasura':
            config.api.timeout = 10000; // Fast GraphQL operations
            config.features.enableRealTimeData = true;
            break;
    }
    return config;
}
// Export singleton instance for default usage
let defaultConfig = null;
export function getConfig() {
    if (!defaultConfig) {
        defaultConfig = createConfig();
    }
    return defaultConfig;
}
export function resetConfig() {
    defaultConfig = null;
}
//# sourceMappingURL=index.js.map
