/// Comprehensive error handling for the financial API
///
/// Provides GraphQL-compatible error types and automatic mapping
/// from core financial errors to API responses.
use async_graphql::ErrorExtensions;
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use financial_core::error::{ErrorCategory, FinancialError};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fmt;
use thiserror::Error;
use tracing::{error, warn};

/// Result type alias for API operations
pub type ApiResult<T> = std::result::Result<T, ApiError>;

/// Result type alias for GraphQL operations
pub type Result<T> = std::result::Result<T, ApiError>;

/// Main API error type
#[derive(Error, Debug, Clone)]
pub enum ApiError {
    /// Core financial calculation errors
    #[error("Financial calculation error: {0}")]
    Financial(#[from] FinancialError),

    /// Authentication and authorization errors
    #[error("Authentication failed: {message}")]
    AuthenticationFailed { message: String },

    #[error("Authorization failed: {message}")]
    AuthorizationFailed { message: String },

    #[error("Invalid JWT token: {reason}")]
    InvalidToken { reason: String },

    #[error("Token expired")]
    TokenExpired,

    /// Input validation errors
    #[error("Validation error: {field} - {message}")]
    ValidationError { field: String, message: String },

    #[error("Invalid input format: {message}")]
    InvalidInput { message: String },

    #[error("Missing required field: {field}")]
    MissingField { field: String },

    /// Business logic errors
    #[error("Portfolio not found: {id}")]
    PortfolioNotFound { id: String },

    #[error("Asset not found: {id}")]
    AssetNotFound { id: String },

    #[error("Debt account not found: {id}")]
    DebtAccountNotFound { id: String },

    #[error("User not found: {id}")]
    UserNotFound { id: String },

    #[error("Insufficient permissions for resource: {resource}")]
    InsufficientPermissions { resource: String },

    /// External service errors
    #[error("Atlas API error: {message}")]
    AtlasApiError { message: String },

    #[error("Cache error: {message}")]
    CacheError { message: String },

    #[error("Database error: {message}")]
    DatabaseError { message: String },

    /// Rate limiting and throttling
    #[error("Rate limit exceeded: {limit} requests per {window}")]
    RateLimitExceeded { limit: u32, window: String },

    #[error("Request timeout")]
    RequestTimeout,

    /// Configuration and system errors
    #[error("Configuration error: {message}")]
    ConfigurationError { message: String },

    #[error("Service unavailable: {service}")]
    ServiceUnavailable { service: String },

    #[error("Internal server error: {message}")]
    InternalError { message: String },

    /// GraphQL specific errors
    #[error("GraphQL schema error: {message}")]
    GraphQLSchemaError { message: String },

    #[error("Field resolution error: {field} - {message}")]
    FieldResolutionError { field: String, message: String },

    /// Not implemented error for placeholder endpoints
    #[error("Operation not implemented: {operation}")]
    NotImplemented { operation: String },
}

/// Error response for REST endpoints
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: ErrorDetails,
    pub request_id: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Detailed error information
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorDetails {
    pub code: String,
    pub message: String,
    pub category: String,
    pub details: Option<serde_json::Value>,
    pub suggestions: Option<Vec<String>>,
}

impl ApiError {
    /// Get the error code for the error type
    pub fn code(&self) -> &'static str {
        match self {
            ApiError::Financial(e) => match e.category() {
                ErrorCategory::Mathematical => "MATH_ERROR",
                ErrorCategory::Currency => "CURRENCY_ERROR",
                ErrorCategory::Validation => "VALIDATION_ERROR",
                ErrorCategory::Portfolio => "PORTFOLIO_ERROR",
                ErrorCategory::Debt => "DEBT_ERROR",
                ErrorCategory::TimeValue => "TIME_VALUE_ERROR",
                ErrorCategory::Risk => "RISK_ERROR",
                ErrorCategory::Budget => "BUDGET_ERROR",
                ErrorCategory::Storage => "STORAGE_ERROR",
                ErrorCategory::External => "EXTERNAL_ERROR",
                ErrorCategory::Configuration => "CONFIG_ERROR",
                ErrorCategory::System => "SYSTEM_ERROR",
            },
            ApiError::AuthenticationFailed { .. } => "AUTH_FAILED",
            ApiError::AuthorizationFailed { .. } => "AUTHZ_FAILED",
            ApiError::InvalidToken { .. } => "INVALID_TOKEN",
            ApiError::TokenExpired => "TOKEN_EXPIRED",
            ApiError::ValidationError { .. } => "VALIDATION_ERROR",
            ApiError::InvalidInput { .. } => "INVALID_INPUT",
            ApiError::MissingField { .. } => "MISSING_FIELD",
            ApiError::PortfolioNotFound { .. } => "PORTFOLIO_NOT_FOUND",
            ApiError::AssetNotFound { .. } => "ASSET_NOT_FOUND",
            ApiError::DebtAccountNotFound { .. } => "DEBT_NOT_FOUND",
            ApiError::UserNotFound { .. } => "USER_NOT_FOUND",
            ApiError::InsufficientPermissions { .. } => "INSUFFICIENT_PERMISSIONS",
            ApiError::AtlasApiError { .. } => "ATLAS_API_ERROR",
            ApiError::CacheError { .. } => "CACHE_ERROR",
            ApiError::DatabaseError { .. } => "DATABASE_ERROR",
            ApiError::RateLimitExceeded { .. } => "RATE_LIMIT_EXCEEDED",
            ApiError::RequestTimeout => "REQUEST_TIMEOUT",
            ApiError::ConfigurationError { .. } => "CONFIG_ERROR",
            ApiError::ServiceUnavailable { .. } => "SERVICE_UNAVAILABLE",
            ApiError::InternalError { .. } => "INTERNAL_ERROR",
            ApiError::GraphQLSchemaError { .. } => "GRAPHQL_SCHEMA_ERROR",
            ApiError::FieldResolutionError { .. } => "FIELD_RESOLUTION_ERROR",
            ApiError::NotImplemented { .. } => "NOT_IMPLEMENTED",
        }
    }

    /// Get the error category
    pub fn category(&self) -> &'static str {
        match self {
            ApiError::Financial(e) => match e.category() {
                ErrorCategory::Mathematical => "mathematical",
                ErrorCategory::Currency => "currency",
                ErrorCategory::Validation => "validation",
                ErrorCategory::Portfolio => "portfolio",
                ErrorCategory::Debt => "debt",
                ErrorCategory::TimeValue => "time_value",
                ErrorCategory::Risk => "risk",
                ErrorCategory::Budget => "budget",
                ErrorCategory::Storage => "storage",
                ErrorCategory::External => "external",
                ErrorCategory::Configuration => "configuration",
                ErrorCategory::System => "system",
            },
            ApiError::AuthenticationFailed { .. }
            | ApiError::AuthorizationFailed { .. }
            | ApiError::InvalidToken { .. }
            | ApiError::TokenExpired => "authentication",
            ApiError::ValidationError { .. }
            | ApiError::InvalidInput { .. }
            | ApiError::MissingField { .. } => "validation",
            ApiError::PortfolioNotFound { .. }
            | ApiError::AssetNotFound { .. }
            | ApiError::DebtAccountNotFound { .. }
            | ApiError::UserNotFound { .. } => "not_found",
            ApiError::InsufficientPermissions { .. } => "authorization",
            ApiError::AtlasApiError { .. }
            | ApiError::CacheError { .. }
            | ApiError::DatabaseError { .. } => "external",
            ApiError::RateLimitExceeded { .. } | ApiError::RequestTimeout => "throttling",
            ApiError::ConfigurationError { .. }
            | ApiError::ServiceUnavailable { .. }
            | ApiError::InternalError { .. } => "system",
            ApiError::GraphQLSchemaError { .. } | ApiError::FieldResolutionError { .. } => {
                "graphql"
            }
            ApiError::NotImplemented { .. } => "not_implemented",
        }
    }

    /// Get HTTP status code for the error
    pub fn status_code(&self) -> StatusCode {
        match self {
            ApiError::Financial(_) => StatusCode::BAD_REQUEST,
            ApiError::AuthenticationFailed { .. }
            | ApiError::InvalidToken { .. }
            | ApiError::TokenExpired => StatusCode::UNAUTHORIZED,
            ApiError::AuthorizationFailed { .. } | ApiError::InsufficientPermissions { .. } => {
                StatusCode::FORBIDDEN
            }
            ApiError::ValidationError { .. }
            | ApiError::InvalidInput { .. }
            | ApiError::MissingField { .. } => StatusCode::BAD_REQUEST,
            ApiError::PortfolioNotFound { .. }
            | ApiError::AssetNotFound { .. }
            | ApiError::DebtAccountNotFound { .. }
            | ApiError::UserNotFound { .. } => StatusCode::NOT_FOUND,
            ApiError::AtlasApiError { .. }
            | ApiError::DatabaseError { .. }
            | ApiError::ServiceUnavailable { .. } => StatusCode::BAD_GATEWAY,
            ApiError::CacheError { .. } => StatusCode::SERVICE_UNAVAILABLE,
            ApiError::RateLimitExceeded { .. } => StatusCode::TOO_MANY_REQUESTS,
            ApiError::RequestTimeout => StatusCode::REQUEST_TIMEOUT,
            ApiError::ConfigurationError { .. }
            | ApiError::InternalError { .. }
            | ApiError::GraphQLSchemaError { .. }
            | ApiError::FieldResolutionError { .. } => StatusCode::INTERNAL_SERVER_ERROR,
            ApiError::NotImplemented { .. } => StatusCode::NOT_IMPLEMENTED,
        }
    }

    /// Check if error is retryable
    pub fn is_retryable(&self) -> bool {
        match self {
            ApiError::Financial(e) => e.is_recoverable(),
            ApiError::AtlasApiError { .. }
            | ApiError::CacheError { .. }
            | ApiError::DatabaseError { .. }
            | ApiError::ServiceUnavailable { .. }
            | ApiError::RequestTimeout => true,
            ApiError::RateLimitExceeded { .. } => true,
            _ => false,
        }
    }

    /// Get suggestions for resolving the error
    pub fn suggestions(&self) -> Option<Vec<String>> {
        match self {
            ApiError::AuthenticationFailed { .. } => Some(vec![
                "Check if your API token is valid".to_string(),
                "Ensure the Authorization header is properly formatted".to_string(),
            ]),
            ApiError::TokenExpired => Some(vec![
                "Refresh your authentication token".to_string(),
                "Log in again to get a new token".to_string(),
            ]),
            ApiError::ValidationError { field, .. } => Some(vec![
                format!("Check the format of the '{}' field", field),
                "Refer to the API documentation for valid input formats".to_string(),
            ]),
            ApiError::RateLimitExceeded { .. } => Some(vec![
                "Reduce the frequency of your requests".to_string(),
                "Implement exponential backoff in your client".to_string(),
                "Contact support if you need higher rate limits".to_string(),
            ]),
            ApiError::Financial(FinancialError::CurrencyMismatch { .. }) => Some(vec![
                "Ensure all monetary amounts use the same currency".to_string(),
                "Convert currencies before performing calculations".to_string(),
            ]),
            _ => None,
        }
    }

    /// Create a validation error
    pub fn validation_error(field: &str, message: &str) -> Self {
        ApiError::ValidationError {
            field: field.to_string(),
            message: message.to_string(),
        }
    }

    /// Create an authentication error
    pub fn authentication_failed(message: &str) -> Self {
        ApiError::AuthenticationFailed {
            message: message.to_string(),
        }
    }

    /// Create an authorization error
    pub fn authorization_failed(message: &str) -> Self {
        ApiError::AuthorizationFailed {
            message: message.to_string(),
        }
    }

    /// Create an internal error
    pub fn internal_error(message: &str) -> Self {
        ApiError::InternalError {
            message: message.to_string(),
        }
    }
}

/// Implement ErrorExtensions for ApiError to work with async_graphql
impl ErrorExtensions for ApiError {
    fn extend(&self) -> async_graphql::Error {
        let mut error = async_graphql::Error::new(self.to_string());
        error = error.extend_with(|_, e| {
            e.set("code", self.code());
            e.set("category", self.category());
            if let Some(suggestions) = self.suggestions() {
                e.set("suggestions", suggestions);
            }
        });

        // Log error based on severity
        match self.category() {
            "system" | "external" => error!("API Error: {}", self),
            "authentication" | "authorization" => warn!("API Error: {}", self),
            _ => tracing::info!("API Error: {}", self),
        }

        error
    }
}

/// Convert ApiError to HTTP response
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let error_response = ErrorResponse {
            error: ErrorDetails {
                code: self.code().to_string(),
                message: self.to_string(),
                category: self.category().to_string(),
                details: None,
                suggestions: self.suggestions(),
            },
            request_id: None, // Would be set by middleware
            timestamp: chrono::Utc::now(),
        };

        // Log error
        match self.category() {
            "system" | "external" => error!("HTTP Error {}: {}", status, self),
            "authentication" | "authorization" => warn!("HTTP Error {}: {}", status, self),
            _ => tracing::info!("HTTP Error {}: {}", status, self),
        }

        (status, Json(error_response)).into_response()
    }
}

/// Helper function to convert Result<T, ApiError> to async_graphql::Result<T>
pub fn to_field_result<T>(result: ApiResult<T>) -> async_graphql::Result<T> {
    result.map_err(|e| e.extend())
}

/// Helper macro for creating validation errors
#[macro_export]
macro_rules! validation_error {
    ($field:expr, $message:expr) => {
        $crate::error::ApiError::validation_error($field, $message)
    };
    ($field:expr, $message:expr, $($arg:tt)*) => {
        $crate::error::ApiError::validation_error($field, &format!($message, $($arg)*))
    };
}

/// Helper macro for creating authentication errors
#[macro_export]
macro_rules! auth_error {
    ($message:expr) => {
        $crate::error::ApiError::authentication_failed($message)
    };
    ($message:expr, $($arg:tt)*) => {
        $crate::error::ApiError::authentication_failed(&format!($message, $($arg)*))
    };
}

/// Helper macro for creating authorization errors
#[macro_export]
macro_rules! authz_error {
    ($message:expr) => {
        $crate::error::ApiError::authorization_failed($message)
    };
    ($message:expr, $($arg:tt)*) => {
        $crate::error::ApiError::authorization_failed(&format!($message, $($arg)*))
    };
}

/// Helper macro for creating internal errors
#[macro_export]
macro_rules! internal_error {
    ($message:expr) => {
        $crate::error::ApiError::internal_error($message)
    };
    ($message:expr, $($arg:tt)*) => {
        $crate::error::ApiError::internal_error(&format!($message, $($arg)*))
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use financial_core::error::FinancialError;

    #[test]
    fn test_error_codes() {
        let auth_error = ApiError::AuthenticationFailed {
            message: "Invalid credentials".to_string(),
        };
        assert_eq!(auth_error.code(), "AUTH_FAILED");
        assert_eq!(auth_error.category(), "authentication");
        assert_eq!(auth_error.status_code(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn test_financial_error_mapping() {
        let financial_error = FinancialError::DivisionByZero;
        let api_error = ApiError::Financial(financial_error);

        assert_eq!(api_error.code(), "MATH_ERROR");
        assert_eq!(api_error.category(), "mathematical");
        assert_eq!(api_error.status_code(), StatusCode::BAD_REQUEST);
    }

    #[test]
    fn test_error_suggestions() {
        let rate_limit_error = ApiError::RateLimitExceeded {
            limit: 100,
            window: "minute".to_string(),
        };

        let suggestions = rate_limit_error.suggestions().unwrap();
        assert!(suggestions.len() > 0);
        assert!(suggestions[0].contains("frequency"));
    }

    #[test]
    fn test_error_retryability() {
        let auth_error = ApiError::AuthenticationFailed {
            message: "Invalid token".to_string(),
        };
        assert!(!auth_error.is_retryable());

        let service_error = ApiError::ServiceUnavailable {
            service: "atlas-api".to_string(),
        };
        assert!(service_error.is_retryable());
    }

    #[test]
    fn test_helper_macros() {
        let validation_err = validation_error!("amount", "must be positive");
        match validation_err {
            ApiError::ValidationError { field, message } => {
                assert_eq!(field, "amount");
                assert_eq!(message, "must be positive");
            }
            _ => panic!("Expected validation error"),
        }

        let auth_err = auth_error!("Token expired");
        match auth_err {
            ApiError::AuthenticationFailed { message } => {
                assert_eq!(message, "Token expired");
            }
            _ => panic!("Expected authentication error"),
        }
    }
}
