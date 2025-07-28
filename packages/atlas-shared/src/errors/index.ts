/**
 * Consolidated Error Handling for Atlas Financial
 * Standardizes error patterns across all services and applications
 */

import type { ApiError as IApiError, ValidationError } from '../types'
import { createLogger } from '../monitoring'

const logger = createLogger('errors')

/**
 * Base Atlas Error class with enhanced functionality
 */
export class AtlasError extends Error {
  public readonly code: string
  public readonly category: string
  public readonly statusCode: number
  public readonly isRetryable: boolean
  public readonly suggestions: string[]
  public readonly metadata: Record<string, unknown>
  public readonly timestamp: string

  constructor(
    message: string,
    code: string,
    category: string,
    statusCode: number = 500,
    isRetryable: boolean = false,
    suggestions: string[] = [],
    metadata: Record<string, unknown> = {}
  ) {
    super(message)
    this.name = 'AtlasError'
    this.code = code
    this.category = category
    this.statusCode = statusCode
    this.isRetryable = isRetryable
    this.suggestions = suggestions
    this.metadata = metadata
    this.timestamp = new Date().toISOString()

    // Ensure the stack trace points to where this error was created
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AtlasError)
    }
  }

  /**
   * Convert to API response format
   */
  toApiResponse(): IApiError {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      details: this.metadata,
      suggestions: this.suggestions.length > 0 ? this.suggestions : undefined
    }
  }

  /**
   * Convert to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      statusCode: this.statusCode,
      isRetryable: this.isRetryable,
      suggestions: this.suggestions,
      metadata: this.metadata,
      timestamp: this.timestamp,
      stack: this.stack
    }
  }
}

/**
 * Authentication and Authorization Errors
 */
export class AuthenticationError extends AtlasError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(
      message,
      'AUTH_FAILED',
      'authentication',
      401,
      false,
      [
        'Check if your API token is valid',
        'Ensure the Authorization header is properly formatted',
        'Try refreshing your authentication token'
      ],
      metadata
    )
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AtlasError {
  constructor(message: string, resource?: string, metadata: Record<string, unknown> = {}) {
    super(
      message,
      'AUTHZ_FAILED',
      'authorization',
      403,
      false,
      [
        'Check if you have the required permissions',
        'Contact your administrator for access',
        resource ? `Verify access to resource: ${resource}` : 'Verify resource access'
      ],
      { ...metadata, resource }
    )
    this.name = 'AuthorizationError'
  }
}

export class TokenExpiredError extends AtlasError {
  constructor(metadata: Record<string, unknown> = {}) {
    super(
      'Authentication token has expired',
      'TOKEN_EXPIRED',
      'authentication',
      401,
      false,
      [
        'Refresh your authentication token',
        'Log in again to get a new token'
      ],
      metadata
    )
    this.name = 'TokenExpiredError'
  }
}

export class InvalidTokenError extends AtlasError {
  constructor(reason: string, metadata: Record<string, unknown> = {}) {
    super(
      `Invalid JWT token: ${reason}`,
      'INVALID_TOKEN',
      'authentication',
      401,
      false,
      [
        'Check token format and signature',
        'Ensure token is not corrupted',
        'Generate a new token'
      ],
      { ...metadata, reason }
    )
    this.name = 'InvalidTokenError'
  }
}

/**
 * Validation Errors
 */
export class ValidationError extends AtlasError {
  public readonly field: string

  constructor(field: string, message: string, metadata: Record<string, unknown> = {}) {
    super(
      `Validation error: ${field} - ${message}`,
      'VALIDATION_ERROR',
      'validation',
      400,
      false,
      [
        `Check the format of the '${field}' field`,
        'Refer to the API documentation for valid input formats'
      ],
      { ...metadata, field }
    )
    this.name = 'ValidationError'
    this.field = field
  }
}

export class InvalidInputError extends AtlasError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(
      `Invalid input format: ${message}`,
      'INVALID_INPUT',
      'validation',
      400,
      false,
      [
        'Check input format and data types',
        'Ensure all required fields are provided'
      ],
      metadata
    )
    this.name = 'InvalidInputError'
  }
}

export class MissingFieldError extends AtlasError {
  public readonly field: string

  constructor(field: string, metadata: Record<string, unknown> = {}) {
    super(
      `Missing required field: ${field}`,
      'MISSING_FIELD',
      'validation',
      400,
      false,
      [
        `Provide the required '${field}' field`,
        'Check API documentation for required fields'
      ],
      { ...metadata, field }
    )
    this.name = 'MissingFieldError'
    this.field = field
  }
}

/**
 * Business Logic Errors
 */
export class NotFoundError extends AtlasError {
  public readonly resourceType: string
  public readonly resourceId: string

  constructor(resourceType: string, resourceId: string, metadata: Record<string, unknown> = {}) {
    super(
      `${resourceType} not found: ${resourceId}`,
      `${resourceType.toUpperCase()}_NOT_FOUND`,
      'not_found',
      404,
      false,
      [
        `Check if the ${resourceType} ID is correct`,
        `Verify the ${resourceType} exists`,
        'Try searching for similar resources'
      ],
      { ...metadata, resourceType, resourceId }
    )
    this.name = 'NotFoundError'
    this.resourceType = resourceType
    this.resourceId = resourceId
  }
}

export class ConflictError extends AtlasError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(
      message,
      'CONFLICT',
      'conflict',
      409,
      false,
      [
        'Check for duplicate resources',
        'Ensure unique constraints are met',
        'Try updating instead of creating'
      ],
      metadata
    )
    this.name = 'ConflictError'
  }
}

/**
 * External Service Errors
 */
export class ExternalServiceError extends AtlasError {
  public readonly service: string

  constructor(service: string, message: string, metadata: Record<string, unknown> = {}) {
    super(
      `${service} error: ${message}`,
      `${service.toUpperCase()}_ERROR`,
      'external',
      502,
      true,
      [
        'Retry the operation',
        'Check service status',
        'Contact support if the issue persists'
      ],
      { ...metadata, service }
    )
    this.name = 'ExternalServiceError'
    this.service = service
  }
}

export class DatabaseError extends AtlasError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(
      `Database error: ${message}`,
      'DATABASE_ERROR',
      'external',
      503,
      true,
      [
        'Retry the operation',
        'Check database connectivity',
        'Contact support if the issue persists'
      ],
      metadata
    )
    this.name = 'DatabaseError'
  }
}

export class CacheError extends AtlasError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(
      `Cache error: ${message}`,
      'CACHE_ERROR',
      'external',
      503,
      true,
      [
        'Operation may proceed without cache',
        'Check cache service status',
        'Retry if cache is critical'
      ],
      metadata
    )
    this.name = 'CacheError'
  }
}

/**
 * Rate Limiting Errors
 */
export class RateLimitError extends AtlasError {
  public readonly limit: number
  public readonly window: string
  public readonly retryAfter?: number

  constructor(
    limit: number, 
    window: string, 
    retryAfter?: number, 
    metadata: Record<string, unknown> = {}
  ) {
    super(
      `Rate limit exceeded: ${limit} requests per ${window}`,
      'RATE_LIMIT_EXCEEDED',
      'throttling',
      429,
      true,
      [
        'Reduce the frequency of your requests',
        'Implement exponential backoff in your client',
        'Contact support if you need higher rate limits'
      ],
      { ...metadata, limit, window, retryAfter }
    )
    this.name = 'RateLimitError'
    this.limit = limit
    this.window = window
    this.retryAfter = retryAfter
  }
}

export class TimeoutError extends AtlasError {
  public readonly timeoutMs: number

  constructor(timeoutMs: number, metadata: Record<string, unknown> = {}) {
    super(
      `Request timeout after ${timeoutMs}ms`,
      'REQUEST_TIMEOUT',
      'throttling',
      408,
      true,
      [
        'Retry the request',
        'Check network connectivity',
        'Consider increasing timeout if appropriate'
      ],
      { ...metadata, timeoutMs }
    )
    this.name = 'TimeoutError'
    this.timeoutMs = timeoutMs
  }
}

/**
 * System Errors
 */
export class InternalError extends AtlasError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(
      `Internal server error: ${message}`,
      'INTERNAL_ERROR',
      'system',
      500,
      false,
      [
        'Contact support with error details',
        'Try again later',
        'Check system status page'
      ],
      metadata
    )
    this.name = 'InternalError'
  }
}

export class ConfigurationError extends AtlasError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(
      `Configuration error: ${message}`,
      'CONFIG_ERROR',
      'system',
      500,
      false,
      [
        'Check configuration settings',
        'Verify environment variables',
        'Contact system administrator'
      ],
      metadata
    )
    this.name = 'ConfigurationError'
  }
}

export class ServiceUnavailableError extends AtlasError {
  public readonly service: string

  constructor(service: string, metadata: Record<string, unknown> = {}) {
    super(
      `Service unavailable: ${service}`,
      'SERVICE_UNAVAILABLE',
      'system',
      503,
      true,
      [
        'Retry the request',
        'Check service status',
        'Use alternative if available'
      ],
      { ...metadata, service }
    )
    this.name = 'ServiceUnavailableError'
    this.service = service
  }
}

/**
 * Financial Calculation Errors
 */
export class FinancialCalculationError extends AtlasError {
  public readonly calculation: string

  constructor(calculation: string, message: string, metadata: Record<string, unknown> = {}) {
    super(
      `Financial calculation error in ${calculation}: ${message}`,
      'FINANCIAL_CALCULATION_ERROR',
      'financial',
      400,
      false,
      [
        'Check input values for calculation',
        'Ensure all required parameters are provided',
        'Verify data types and ranges'
      ],
      { ...metadata, calculation }
    )
    this.name = 'FinancialCalculationError'
    this.calculation = calculation
  }
}

export class CurrencyMismatchError extends AtlasError {
  public readonly expectedCurrency: string
  public readonly actualCurrency: string

  constructor(expectedCurrency: string, actualCurrency: string, metadata: Record<string, unknown> = {}) {
    super(
      `Currency mismatch: expected ${expectedCurrency}, got ${actualCurrency}`,
      'CURRENCY_MISMATCH',
      'financial',
      400,
      false,
      [
        'Ensure all monetary amounts use the same currency',
        'Convert currencies before performing calculations',
        'Check currency codes are valid'
      ],
      { ...metadata, expectedCurrency, actualCurrency }
    )
    this.name = 'CurrencyMismatchError'
    this.expectedCurrency = expectedCurrency
    this.actualCurrency = actualCurrency
  }
}

/**
 * Error Handler Functions
 */

/**
 * Handle and log errors consistently
 */
export function handleError(error: unknown, context?: string): AtlasError {
  if (error instanceof AtlasError) {
    logger.warn('Atlas error occurred', { 
      error: error.toJSON(), 
      context 
    })
    return error
  }

  if (error instanceof Error) {
    const atlasError = new InternalError(error.message, { 
      originalStack: error.stack,
      context 
    })
    
    logger.error('Unexpected error converted to AtlasError', { 
      error: atlasError.toJSON(),
      originalError: error.message,
      context 
    })
    
    return atlasError
  }

  const atlasError = new InternalError('Unknown error occurred', { 
    originalError: String(error),
    context 
  })
  
  logger.error('Unknown error converted to AtlasError', { 
    error: atlasError.toJSON(),
    context 
  })
  
  return atlasError
}

/**
 * Create validation errors from validation library results
 */
export function createValidationErrors(validationResults: ValidationError[]): ValidationError[] {
  return validationResults.map(result => 
    new ValidationError(result.field, result.message)
  )
}

/**
 * Check if error is retryable
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof AtlasError) {
    return error.isRetryable
  }
  
  // Default to non-retryable for unknown errors
  return false
}

/**
 * Get retry delay based on error type and attempt count
 */
export function getRetryDelay(error: AtlasError, attemptCount: number): number {
  if (!error.isRetryable) {
    return 0
  }

  // Exponential backoff with jitter
  const baseDelay = 1000 // 1 second
  const maxDelay = 30000 // 30 seconds
  const exponentialDelay = baseDelay * Math.pow(2, attemptCount - 1)
  const jitter = Math.random() * 0.1 * exponentialDelay
  
  return Math.min(exponentialDelay + jitter, maxDelay)
}

/**
 * Error factory functions for common patterns
 */
export const ErrorFactory = {
  validation: (field: string, message: string, metadata?: Record<string, unknown>) =>
    new ValidationError(field, message, metadata),

  notFound: (resourceType: string, resourceId: string, metadata?: Record<string, unknown>) =>
    new NotFoundError(resourceType, resourceId, metadata),

  unauthorized: (message: string = 'Authentication required', metadata?: Record<string, unknown>) =>
    new AuthenticationError(message, metadata),

  forbidden: (message: string = 'Access denied', resource?: string, metadata?: Record<string, unknown>) =>
    new AuthorizationError(message, resource, metadata),

  conflict: (message: string, metadata?: Record<string, unknown>) =>
    new ConflictError(message, metadata),

  external: (service: string, message: string, metadata?: Record<string, unknown>) =>
    new ExternalServiceError(service, message, metadata),

  internal: (message: string, metadata?: Record<string, unknown>) =>
    new InternalError(message, metadata),

  rateLimit: (limit: number, window: string, retryAfter?: number, metadata?: Record<string, unknown>) =>
    new RateLimitError(limit, window, retryAfter, metadata),

  timeout: (timeoutMs: number, metadata?: Record<string, unknown>) =>
    new TimeoutError(timeoutMs, metadata)
}

/**
 * Error type guards
 */
export const isAtlasError = (error: unknown): error is AtlasError =>
  error instanceof AtlasError

export const isAuthenticationError = (error: unknown): error is AuthenticationError =>
  error instanceof AuthenticationError

export const isValidationError = (error: unknown): error is ValidationError =>
  error instanceof ValidationError

export const isNotFoundError = (error: unknown): error is NotFoundError =>
  error instanceof NotFoundError

export const isRetryableError = (error: unknown): boolean =>
  error instanceof AtlasError && error.isRetryable