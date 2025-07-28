/**
 * Consolidated Error Handling for Atlas Financial
 * Standardizes error patterns across all services and applications
 */
import type { ApiError as IApiError, ValidationError } from '../types';
/**
 * Base Atlas Error class with enhanced functionality
 */
export declare class AtlasError extends Error {
    readonly code: string;
    readonly category: string;
    readonly statusCode: number;
    readonly isRetryable: boolean;
    readonly suggestions: string[];
    readonly metadata: Record<string, unknown>;
    readonly timestamp: string;
    constructor(message: string, code: string, category: string, statusCode?: number, isRetryable?: boolean, suggestions?: string[], metadata?: Record<string, unknown>);
    /**
     * Convert to API response format
     */
    toApiResponse(): IApiError;
    /**
     * Convert to JSON for logging
     */
    toJSON(): {
        name: string;
        message: string;
        code: string;
        category: string;
        statusCode: number;
        isRetryable: boolean;
        suggestions: string[];
        metadata: Record<string, unknown>;
        timestamp: string;
        stack: string | undefined;
    };
}
/**
 * Authentication and Authorization Errors
 */
export declare class AuthenticationError extends AtlasError {
    constructor(message: string, metadata?: Record<string, unknown>);
}
export declare class AuthorizationError extends AtlasError {
    constructor(message: string, resource?: string, metadata?: Record<string, unknown>);
}
export declare class TokenExpiredError extends AtlasError {
    constructor(metadata?: Record<string, unknown>);
}
export declare class InvalidTokenError extends AtlasError {
    constructor(reason: string, metadata?: Record<string, unknown>);
}
/**
 * Validation Errors
 */
export declare class ValidationError extends AtlasError {
    readonly field: string;
    constructor(field: string, message: string, metadata?: Record<string, unknown>);
}
export declare class InvalidInputError extends AtlasError {
    constructor(message: string, metadata?: Record<string, unknown>);
}
export declare class MissingFieldError extends AtlasError {
    readonly field: string;
    constructor(field: string, metadata?: Record<string, unknown>);
}
/**
 * Business Logic Errors
 */
export declare class NotFoundError extends AtlasError {
    readonly resourceType: string;
    readonly resourceId: string;
    constructor(resourceType: string, resourceId: string, metadata?: Record<string, unknown>);
}
export declare class ConflictError extends AtlasError {
    constructor(message: string, metadata?: Record<string, unknown>);
}
/**
 * External Service Errors
 */
export declare class ExternalServiceError extends AtlasError {
    readonly service: string;
    constructor(service: string, message: string, metadata?: Record<string, unknown>);
}
export declare class DatabaseError extends AtlasError {
    constructor(message: string, metadata?: Record<string, unknown>);
}
export declare class CacheError extends AtlasError {
    constructor(message: string, metadata?: Record<string, unknown>);
}
/**
 * Rate Limiting Errors
 */
export declare class RateLimitError extends AtlasError {
    readonly limit: number;
    readonly window: string;
    readonly retryAfter?: number;
    constructor(limit: number, window: string, retryAfter?: number, metadata?: Record<string, unknown>);
}
export declare class TimeoutError extends AtlasError {
    readonly timeoutMs: number;
    constructor(timeoutMs: number, metadata?: Record<string, unknown>);
}
/**
 * System Errors
 */
export declare class InternalError extends AtlasError {
    constructor(message: string, metadata?: Record<string, unknown>);
}
export declare class ConfigurationError extends AtlasError {
    constructor(message: string, metadata?: Record<string, unknown>);
}
export declare class ServiceUnavailableError extends AtlasError {
    readonly service: string;
    constructor(service: string, metadata?: Record<string, unknown>);
}
/**
 * Financial Calculation Errors
 */
export declare class FinancialCalculationError extends AtlasError {
    readonly calculation: string;
    constructor(calculation: string, message: string, metadata?: Record<string, unknown>);
}
export declare class CurrencyMismatchError extends AtlasError {
    readonly expectedCurrency: string;
    readonly actualCurrency: string;
    constructor(expectedCurrency: string, actualCurrency: string, metadata?: Record<string, unknown>);
}
/**
 * Error Handler Functions
 */
/**
 * Handle and log errors consistently
 */
export declare function handleError(error: unknown, context?: string): AtlasError;
/**
 * Create validation errors from validation library results
 */
export declare function createValidationErrors(validationResults: ValidationError[]): ValidationError[];
/**
 * Check if error is retryable
 */
export declare function isRetryable(error: unknown): boolean;
/**
 * Get retry delay based on error type and attempt count
 */
export declare function getRetryDelay(error: AtlasError, attemptCount: number): number;
/**
 * Error factory functions for common patterns
 */
export declare const ErrorFactory: {
    validation: (field: string, message: string, metadata?: Record<string, unknown>) => import(".").ValidationError;
    notFound: (resourceType: string, resourceId: string, metadata?: Record<string, unknown>) => NotFoundError;
    unauthorized: (message?: string, metadata?: Record<string, unknown>) => AuthenticationError;
    forbidden: (message?: string, resource?: string, metadata?: Record<string, unknown>) => AuthorizationError;
    conflict: (message: string, metadata?: Record<string, unknown>) => ConflictError;
    external: (service: string, message: string, metadata?: Record<string, unknown>) => ExternalServiceError;
    internal: (message: string, metadata?: Record<string, unknown>) => InternalError;
    rateLimit: (limit: number, window: string, retryAfter?: number, metadata?: Record<string, unknown>) => RateLimitError;
    timeout: (timeoutMs: number, metadata?: Record<string, unknown>) => TimeoutError;
};
/**
 * Error type guards
 */
export declare const isAtlasError: (error: unknown) => error is AtlasError;
export declare const isAuthenticationError: (error: unknown) => error is AuthenticationError;
export declare const isValidationError: (error: unknown) => error is ValidationError;
export declare const isNotFoundError: (error: unknown) => error is NotFoundError;
export declare const isRetryableError: (error: unknown) => boolean;
//# sourceMappingURL=index.d.ts.map
