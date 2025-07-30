"""
Error Handling for Atlas Financial AI Engine
Uses atlas-shared error patterns for consistency across services
"""

import structlog
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = structlog.get_logger()

class AtlasError(Exception):
    """
    Base Atlas Error class matching atlas-shared patterns
    Provides consistent error handling across all services
    """

    def __init__(
        self,
        message: str,
        code: str,
        category: str,
        status_code: int = 500,
        is_retryable: bool = False,
        suggestions: List[str] = None,
        metadata: Dict[str, Any] = None
    ):
        super().__init__(message)
        self.name = 'AtlasError'
        self.code = code
        self.category = category
        self.statusCode = status_code  # Match atlas-shared naming
        self.isRetryable = is_retryable  # Match atlas-shared naming
        self.suggestions = suggestions or []
        self.metadata = metadata or {}
        self.timestamp = datetime.utcnow().isoformat()

        # Ensure the stack trace points to where this error was created
        if hasattr(Exception, 'with_traceback'):
            self.with_traceback(self.__traceback__)

    def toJSON(self) -> Dict[str, Any]:
        """Convert to JSON for logging (matches atlas-shared interface)"""
        return {
            'name': self.name,
            'message': str(self),
            'code': self.code,
            'category': self.category,
            'statusCode': self.statusCode,
            'isRetryable': self.isRetryable,
            'suggestions': self.suggestions,
            'metadata': self.metadata,
            'timestamp': self.timestamp
        }

    def toApiResponse(self) -> Dict[str, Any]:
        """Convert to API response format (matches atlas-shared interface)"""
        return {
            'code': self.code,
            'message': str(self),
            'category': self.category,
            'details': self.metadata,
            'suggestions': self.suggestions if self.suggestions else None
        }

class AuthenticationError(AtlasError):
    """Authentication failed error"""

    def __init__(self, message: str, metadata: Dict[str, Any] = None):
        super().__init__(
            message,
            'AUTH_FAILED',
            'authentication',
            401,
            False,
            [
                'Check if your API token is valid',
                'Ensure the Authorization header is properly formatted',
                'Try refreshing your authentication token'
            ],
            metadata
        )
        self.name = 'AuthenticationError'

class AuthorizationError(AtlasError):
    """Authorization failed error"""

    def __init__(self, message: str, resource: str = None, metadata: Dict[str, Any] = None):
        suggestions = [
            'Check if you have the required permissions',
            'Contact your administrator for access'
        ]
        if resource:
            suggestions.append(f'Verify access to resource: {resource}')

        super().__init__(
            message,
            'AUTHZ_FAILED',
            'authorization',
            403,
            False,
            suggestions,
            {**(metadata or {}), 'resource': resource}
        )
        self.name = 'AuthorizationError'

class TokenExpiredError(AtlasError):
    """JWT token expired error"""

    def __init__(self, metadata: Dict[str, Any] = None):
        super().__init__(
            'Authentication token has expired',
            'TOKEN_EXPIRED',
            'authentication',
            401,
            False,
            [
                'Refresh your authentication token',
                'Log in again to get a new token'
            ],
            metadata
        )
        self.name = 'TokenExpiredError'

class InvalidTokenError(AtlasError):
    """Invalid JWT token error"""

    def __init__(self, reason: str, metadata: Dict[str, Any] = None):
        super().__init__(
            f'Invalid JWT token: {reason}',
            'INVALID_TOKEN',
            'authentication',
            401,
            False,
            [
                'Check token format and signature',
                'Ensure token is not corrupted',
                'Generate a new token'
            ],
            {**(metadata or {}), 'reason': reason}
        )
        self.name = 'InvalidTokenError'

class NotFoundError(AtlasError):
    """Resource not found error"""

    def __init__(self, resource_type: str, resource_id: str, metadata: Dict[str, Any] = None):
        super().__init__(
            f'{resource_type} not found: {resource_id}',
            f'{resource_type.upper()}_NOT_FOUND',
            'not_found',
            404,
            False,
            [
                f'Check if the {resource_type} ID is correct',
                f'Verify the {resource_type} exists',
                'Try searching for similar resources'
            ],
            {**(metadata or {}), 'resourceType': resource_type, 'resourceId': resource_id}
        )
        self.name = 'NotFoundError'
        self.resourceType = resource_type
        self.resourceId = resource_id

class ExternalServiceError(AtlasError):
    """External service error"""

    def __init__(self, service: str, message: str, metadata: Dict[str, Any] = None):
        super().__init__(
            f'{service} error: {message}',
            f'{service.upper()}_ERROR',
            'external',
            502,
            True,  # External service errors are typically retryable
            [
                'Retry the operation',
                'Check service status',
                'Contact support if the issue persists'
            ],
            {**(metadata or {}), 'service': service}
        )
        self.name = 'ExternalServiceError'
        self.service = service

class RateLimitError(AtlasError):
    """Rate limit exceeded error"""

    def __init__(
        self,
        limit: int,
        window: str,
        retryAfter: int = None,
        metadata: Dict[str, Any] = None
    ):
        super().__init__(
            f'Rate limit exceeded: {limit} requests per {window}',
            'RATE_LIMIT_EXCEEDED',
            'throttling',
            429,
            True,
            [
                'Reduce the frequency of your requests',
                'Implement exponential backoff in your client',
                'Contact support if you need higher rate limits'
            ],
            {**(metadata or {}), 'limit': limit, 'window': window, 'retryAfter': retryAfter}
        )
        self.name = 'RateLimitError'
        self.limit = limit
        self.window = window
        self.retryAfter = retryAfter

class TimeoutError(AtlasError):
    """Request timeout error"""

    def __init__(self, timeout_ms: int, metadata: Dict[str, Any] = None):
        super().__init__(
            f'Request timeout after {timeout_ms}ms',
            'REQUEST_TIMEOUT',
            'throttling',
            408,
            True,
            [
                'Retry the request',
                'Check network connectivity',
                'Consider increasing timeout if appropriate'
            ],
            {**(metadata or {}), 'timeoutMs': timeout_ms}
        )
        self.name = 'TimeoutError'
        self.timeoutMs = timeout_ms

class InternalError(AtlasError):
    """Internal server error"""

    def __init__(self, message: str, metadata: Dict[str, Any] = None):
        super().__init__(
            f'Internal server error: {message}',
            'INTERNAL_ERROR',
            'system',
            500,
            False,
            [
                'Contact support with error details',
                'Try again later',
                'Check system status page'
            ],
            metadata
        )
        self.name = 'InternalError'

class FinancialCalculationError(AtlasError):
    """Financial calculation error"""

    def __init__(self, calculation: str, message: str, metadata: Dict[str, Any] = None):
        super().__init__(
            f'Financial calculation error in {calculation}: {message}',
            'FINANCIAL_CALCULATION_ERROR',
            'financial',
            400,
            False,
            [
                'Check input values for calculation',
                'Ensure all required parameters are provided',
                'Verify data types and ranges'
            ],
            {**(metadata or {}), 'calculation': calculation}
        )
        self.name = 'FinancialCalculationError'
        self.calculation = calculation

class AIModelError(AtlasError):
    """AI model error"""

    def __init__(self, model: str, message: str, metadata: Dict[str, Any] = None):
        super().__init__(
            f'AI model error in {model}: {message}',
            'AI_MODEL_ERROR',
            'ai',
            500,
            False,
            [
                'Check if AI model is loaded correctly',
                'Verify model configuration',
                'Try restarting the AI service'
            ],
            {**(metadata or {}), 'model': model}
        )
        self.name = 'AIModelError'
        self.model = model

class ValidationError(AtlasError):
    """Input validation error"""

    def __init__(self, field: str, message: str, metadata: Dict[str, Any] = None):
        super().__init__(
            f'Validation error: {field} - {message}',
            'VALIDATION_ERROR',
            'validation',
            400,
            False,
            [
                f'Check the format of the \'{field}\' field',
                'Refer to the API documentation for valid input formats'
            ],
            {**(metadata or {}), 'field': field}
        )
        self.name = 'ValidationError'
        self.field = field

def handleError(error: Exception, context: str = None) -> AtlasError:
    """
    Handle and convert errors to AtlasError format
    Matches atlas-shared error handling patterns
    """
    if isinstance(error, AtlasError):
        logger.warn('Atlas error occurred',
                   error=error.toJSON(),
                   context=context)
        return error

    if isinstance(error, Exception):
        atlas_error = InternalError(str(error), {
            'originalError': str(error),
            'originalType': type(error).__name__,
            'context': context
        })

        logger.error('Unexpected error converted to AtlasError',
                    error=atlas_error.toJSON(),
                    originalError=str(error),
                    context=context)

        return atlas_error

    atlas_error = InternalError('Unknown error occurred', {
        'originalError': str(error),
        'context': context
    })

    logger.error('Unknown error converted to AtlasError',
                error=atlas_error.toJSON(),
                context=context)

    return atlas_error

def isRetryable(error: Exception) -> bool:
    """Check if error is retryable"""
    if isinstance(error, AtlasError):
        return error.isRetryable
    return False

def getRetryDelay(error: AtlasError, attempt_count: int) -> float:
    """Get retry delay based on error type and attempt count"""
    if not error.isRetryable:
        return 0

    # Exponential backoff with jitter (matches atlas-shared patterns)
    base_delay = 1.0  # 1 second
    max_delay = 30.0  # 30 seconds
    exponential_delay = base_delay * (2 ** (attempt_count - 1))

    # Add jitter
    import random
    jitter = random.uniform(0, 0.1 * exponential_delay)

    return min(exponential_delay + jitter, max_delay)

# Error factory functions for common patterns (matches atlas-shared)
class ErrorFactory:
    @staticmethod
    def validation(field: str, message: str, metadata: Dict[str, Any] = None) -> ValidationError:
        return ValidationError(field, message, metadata)

    @staticmethod
    def notFound(resource_type: str, resource_id: str, metadata: Dict[str, Any] = None) -> NotFoundError:
        return NotFoundError(resource_type, resource_id, metadata)

    @staticmethod
    def unauthorized(message: str = 'Authentication required', metadata: Dict[str, Any] = None) -> AuthenticationError:
        return AuthenticationError(message, metadata)

    @staticmethod
    def forbidden(message: str = 'Access denied', resource: str = None, metadata: Dict[str, Any] = None) -> AuthorizationError:
        return AuthorizationError(message, resource, metadata)

    @staticmethod
    def external(service: str, message: str, metadata: Dict[str, Any] = None) -> ExternalServiceError:
        return ExternalServiceError(service, message, metadata)

    @staticmethod
    def internal(message: str, metadata: Dict[str, Any] = None) -> InternalError:
        return InternalError(message, metadata)

    @staticmethod
    def rateLimit(limit: int, window: str, retryAfter: int = None, metadata: Dict[str, Any] = None) -> RateLimitError:
        return RateLimitError(limit, window, retryAfter, metadata)

    @staticmethod
    def timeout(timeout_ms: int, metadata: Dict[str, Any] = None) -> TimeoutError:
        return TimeoutError(timeout_ms, metadata)

    @staticmethod
    def financial(calculation: str, message: str, metadata: Dict[str, Any] = None) -> FinancialCalculationError:
        return FinancialCalculationError(calculation, message, metadata)

    @staticmethod
    def aiModel(model: str, message: str, metadata: Dict[str, Any] = None) -> AIModelError:
        return AIModelError(model, message, metadata)

# Type guards (matches atlas-shared patterns)
def isAtlasError(error: Exception) -> bool:
    return isinstance(error, AtlasError)

def isAuthenticationError(error: Exception) -> bool:
    return isinstance(error, AuthenticationError)

def isAuthorizationError(error: Exception) -> bool:
    return isinstance(error, AuthorizationError)

def isNotFoundError(error: Exception) -> bool:
    return isinstance(error, NotFoundError)

def isRetryableError(error: Exception) -> bool:
    return isinstance(error, AtlasError) and error.isRetryable

# Export all error classes and utilities
__all__ = [
    'AtlasError',
    'AuthenticationError',
    'AuthorizationError',
    'TokenExpiredError',
    'InvalidTokenError',
    'NotFoundError',
    'ExternalServiceError',
    'RateLimitError',
    'TimeoutError',
    'InternalError',
    'FinancialCalculationError',
    'AIModelError',
    'ValidationError',
    'handleError',
    'isRetryable',
    'getRetryDelay',
    'ErrorFactory',
    'isAtlasError',
    'isAuthenticationError',
    'isAuthorizationError',
    'isNotFoundError',
    'isRetryableError'
]
