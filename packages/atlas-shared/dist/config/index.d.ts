/**
 * Consolidated Configuration Management for Atlas Financial
 * Eliminates duplicate config patterns across all services
 */
import type { AppConfig, Environment, AuthConfig, ApiConfig, MonitoringConfig, FeatureFlags } from '../types';
/**
 * Get environment from various sources with fallback
 */
export declare function getEnvironment(): Environment;
/**
 * Get a required environment variable, throw if missing
 */
export declare function getRequiredEnv(key: string): string;
/**
 * Get an optional environment variable with fallback
 */
export declare function getOptionalEnv(key: string, fallback: string): string;
/**
 * Parse boolean environment variable
 */
export declare function getBooleanEnv(key: string, fallback?: boolean): boolean;
/**
 * Parse number environment variable
 */
export declare function getNumberEnv(key: string, fallback: number): number;
/**
 * Create authentication configuration based on environment
 */
export declare function createAuthConfig(environment: Environment): AuthConfig;
/**
 * Create API configuration based on environment
 */
export declare function createApiConfig(environment: Environment): ApiConfig;
/**
 * Create monitoring configuration based on environment
 */
export declare function createMonitoringConfig(environment: Environment): MonitoringConfig;
/**
 * Create feature flags configuration
 */
export declare function createFeatureFlags(environment: Environment): FeatureFlags;
/**
 * Main configuration factory function
 */
export declare function createConfig(environment?: Environment): AppConfig;
/**
 * Configuration constants for common settings
 */
export declare const CONFIG_CONSTANTS: {
    readonly JWT_MIN_SECRET_LENGTH: 32;
    readonly JWT_DEFAULT_EXPIRY: 3600;
    readonly JWT_REFRESH_THRESHOLD: 300;
    readonly API_MAX_TIMEOUT: 300000;
    readonly API_DEFAULT_TIMEOUT: 30000;
    readonly API_MAX_RETRIES: 5;
    readonly PASSWORD_MIN_LENGTH: 8;
    readonly SESSION_TIMEOUT: 1800;
    readonly RATE_LIMIT_WINDOW: 60000;
    readonly DEFAULT_PAGE_SIZE: 50;
    readonly MAX_PAGE_SIZE: 1000;
    readonly CACHE_DEFAULT_TTL: 3600;
    readonly MAX_FILE_SIZE: number;
    readonly ALLOWED_FILE_TYPES: readonly ["pdf", "png", "jpg", "jpeg", "csv", "xlsx"];
};
/**
 * Environment-specific configuration presets
 */
export declare const CONFIG_PRESETS: {
    readonly development: {
        readonly api: {
            readonly timeout: 10000;
            readonly retries: 1;
        };
        readonly monitoring: {
            readonly level: "debug";
            readonly tracing: {
                readonly enabled: false;
            };
        };
        readonly features: {
            readonly enableDebugMode: true;
            readonly enableMockData: true;
        };
    };
    readonly test: {
        readonly api: {
            readonly timeout: 5000;
            readonly retries: 0;
        };
        readonly monitoring: {
            readonly level: "error";
            readonly enabled: false;
        };
        readonly features: {
            readonly enableDebugMode: false;
            readonly enableMockData: true;
        };
    };
    readonly staging: {
        readonly api: {
            readonly timeout: 30000;
            readonly retries: 2;
        };
        readonly monitoring: {
            readonly level: "info";
            readonly tracing: {
                readonly enabled: true;
            };
        };
        readonly features: {
            readonly enableDebugMode: false;
            readonly enableMockData: false;
        };
    };
    readonly production: {
        readonly api: {
            readonly timeout: 30000;
            readonly retries: 3;
        };
        readonly monitoring: {
            readonly level: "warn";
            readonly tracing: {
                readonly enabled: true;
            };
        };
        readonly features: {
            readonly enableDebugMode: false;
            readonly enableMockData: false;
        };
    };
};
/**
 * Get configuration for specific service context
 */
export declare function getServiceConfig(serviceName: string, environment?: Environment): AppConfig;
export declare function getConfig(): AppConfig;
export declare function resetConfig(): void;
//# sourceMappingURL=index.d.ts.map
