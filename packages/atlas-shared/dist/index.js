/**
 * Atlas Financial Shared Library
 *
 * A comprehensive shared library implementing DRY principles across the
 * Atlas Financial modular monolith architecture while maintaining
 * bank-grade security standards.
 *
 * @version 1.0.0
 * @author Atlas Financial Team
 */
// Core types and interfaces
export * from './types';
// Authentication and authorization
export * from './auth';
// Configuration management
export * from './config';
// Error handling and validation
export * from './errors';
// GraphQL schemas, queries, and utilities
export * from './graphql';
// Utility functions
export * from './utils';
// Security utilities
export * from './security';
// Monitoring and observability
export * from './monitoring';
// Database patterns and connections
export * from './database';
/**
 * Library version and metadata
 */
export const ATLAS_SHARED_VERSION = '1.0.0';
export const ATLAS_SHARED_BUILD_DATE = new Date().toISOString();
/**
 * Initialize the Atlas Shared Library
 * Call this function once in your application to set up defaults
 */
export function initializeAtlasShared(options) {
    const { logLevel = 'info', serviceName = 'atlas-financial', version = '1.0.0', environment = 'development' } = options || {};
    // Initialize monitoring
    const { initializeMonitoring } = require('./monitoring');
    initializeMonitoring({
        enabled: true,
        level: logLevel,
        service: serviceName,
        version,
        metrics: {
            enabled: true,
            namespace: 'atlas_financial'
        },
        tracing: {
            enabled: environment === 'production',
            sampleRate: environment === 'production' ? 0.1 : 1.0
        }
    });
    // Log initialization
    const { logger } = require('./monitoring');
    logger.info('Atlas Shared Library initialized', {
        version: ATLAS_SHARED_VERSION,
        buildDate: ATLAS_SHARED_BUILD_DATE,
        serviceName,
        environment,
        logLevel
    });
}
/**
 * Get library information
 */
export function getLibraryInfo() {
    return {
        name: '@atlas/shared',
        version: ATLAS_SHARED_VERSION,
        buildDate: ATLAS_SHARED_BUILD_DATE,
        description: 'Shared library for Atlas Financial modular monolith',
        repository: 'https://github.com/atlas-financial/atlas-shared'
    };
}
//# sourceMappingURL=index.js.map
