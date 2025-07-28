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
export * from './types';
export * from './auth';
export * from './config';
export * from './errors';
export * from './graphql';
export * from './utils';
export * from './security';
export * from './monitoring';
export * from './database';
/**
 * Library version and metadata
 */
export declare const ATLAS_SHARED_VERSION = "1.0.0";
export declare const ATLAS_SHARED_BUILD_DATE: string;
/**
 * Initialize the Atlas Shared Library
 * Call this function once in your application to set up defaults
 */
export declare function initializeAtlasShared(options?: {
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    serviceName?: string;
    version?: string;
    environment?: 'development' | 'production' | 'test' | 'staging';
}): void;
/**
 * Get library information
 */
export declare function getLibraryInfo(): {
    name: string;
    version: string;
    buildDate: string;
    description: string;
    repository: string;
};
//# sourceMappingURL=index.d.ts.map
