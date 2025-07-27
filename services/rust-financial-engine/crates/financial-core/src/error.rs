/// Comprehensive error handling for financial calculations
/// 
/// Provides specific error types for different categories of failures
/// in financial computations with detailed context.

use thiserror::Error;
use crate::types::Currency;

/// Result type alias for financial operations
pub type Result<T> = std::result::Result<T, FinancialError>;

/// Comprehensive error types for financial calculations
#[derive(Error, Debug, Clone, PartialEq)]
pub enum FinancialError {
    /// Mathematical computation errors
    #[error("Division by zero in financial calculation")]
    DivisionByZero,

    #[error("Invalid mathematical operation: {message}")]
    MathError { message: String },

    #[error("Numerical overflow in calculation")]
    Overflow,

    #[error("Numerical underflow in calculation")]
    Underflow,

    /// Currency and monetary errors
    #[error("Currency mismatch: expected {expected}, got {actual}")]
    CurrencyMismatch {
        expected: Currency,
        actual: Currency,
    },

    #[error("Unsupported currency operation: {operation}")]
    UnsupportedCurrencyOperation { operation: String },

    #[error("Invalid exchange rate: {rate}")]
    InvalidExchangeRate { rate: String },

    /// Input validation errors
    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Invalid input parameter: {parameter} = {value}")]
    InvalidParameter { parameter: String, value: String },

    #[error("Parameter out of range: {parameter} must be between {min} and {max}, got {actual}")]
    ParameterOutOfRange {
        parameter: String,
        min: String,
        max: String,
        actual: String,
    },

    /// Portfolio calculation errors
    #[error("Portfolio optimization failed: {reason}")]
    PortfolioOptimizationFailed { reason: String },

    #[error("Insufficient portfolio data: {missing}")]
    InsufficientPortfolioData { missing: String },

    #[error("Invalid asset allocation: total must equal 100%, got {total}%")]
    InvalidAssetAllocation { total: String },

    /// Debt calculation errors
    #[error("Invalid debt configuration: {reason}")]
    InvalidDebtConfiguration { reason: String },

    #[error("Debt calculation failed: {reason}")]
    DebtCalculationFailed { reason: String },

    /// Time value of money errors
    #[error("Time value calculation error: {reason}")]
    TimeValueError { reason: String },

    #[error("Invalid time period: {period}")]
    InvalidTimePeriod { period: String },

    #[error("Interest rate calculation failed: {reason}")]
    InterestRateError { reason: String },

    /// Risk calculation errors
    #[error("Risk calculation failed: {reason}")]
    RiskCalculationFailed { reason: String },

    #[error("Insufficient risk data: {missing}")]
    InsufficientRiskData { missing: String },

    #[error("Invalid risk model parameters: {reason}")]
    InvalidRiskModel { reason: String },

    /// Budget analysis errors
    #[error("Budget analysis failed: {reason}")]
    BudgetAnalysisFailed { reason: String },

    #[error("Invalid budget data: {reason}")]
    InvalidBudgetData { reason: String },

    /// Database and persistence errors
    #[error("Database error: {message}")]
    DatabaseError { message: String },

    #[error("Cache error: {message}")]
    CacheError { message: String },

    /// External service errors
    #[error("External service error: {service} - {message}")]
    ExternalServiceError { service: String, message: String },

    #[error("API rate limit exceeded for service: {service}")]
    RateLimitExceeded { service: String },

    /// Configuration errors
    #[error("Configuration error: {message}")]
    ConfigurationError { message: String },

    #[error("Missing required configuration: {key}")]
    MissingConfiguration { key: String },

    /// Generic errors
    #[error("Internal error: {message}")]
    InternalError { message: String },

    #[error("Operation not supported: {operation}")]
    NotSupported { operation: String },

    #[error("Unsupported operation: {operation}")]
    UnsupportedOperation { operation: String },

    #[error("Insufficient data: {details}")]
    InsufficientData { details: String },

    #[error("Resource not found: {resource}")]
    NotFound { resource: String },
}

impl FinancialError {
    /// Check if error is recoverable (client can retry)
    pub fn is_recoverable(&self) -> bool {
        match self {
            FinancialError::ExternalServiceError { .. } => true,
            FinancialError::RateLimitExceeded { .. } => true,
            FinancialError::DatabaseError { .. } => true,
            FinancialError::CacheError { .. } => true,
            _ => false,
        }
    }

    /// Get error category for monitoring and alerting
    pub fn category(&self) -> ErrorCategory {
        match self {
            FinancialError::DivisionByZero
            | FinancialError::MathError { .. }
            | FinancialError::Overflow
            | FinancialError::Underflow => ErrorCategory::Mathematical,

            FinancialError::CurrencyMismatch { .. }
            | FinancialError::UnsupportedCurrencyOperation { .. }
            | FinancialError::InvalidExchangeRate { .. } => ErrorCategory::Currency,

            FinancialError::ValidationError(_)
            | FinancialError::InvalidParameter { .. }
            | FinancialError::ParameterOutOfRange { .. } => ErrorCategory::Validation,

            FinancialError::PortfolioOptimizationFailed { .. }
            | FinancialError::InsufficientPortfolioData { .. }
            | FinancialError::InvalidAssetAllocation { .. } => ErrorCategory::Portfolio,

            FinancialError::InvalidDebtConfiguration { .. }
            | FinancialError::DebtCalculationFailed { .. } => ErrorCategory::Debt,

            FinancialError::TimeValueError { .. }
            | FinancialError::InvalidTimePeriod { .. }
            | FinancialError::InterestRateError { .. } => ErrorCategory::TimeValue,

            FinancialError::RiskCalculationFailed { .. }
            | FinancialError::InsufficientRiskData { .. }
            | FinancialError::InvalidRiskModel { .. } => ErrorCategory::Risk,

            FinancialError::BudgetAnalysisFailed { .. }
            | FinancialError::InvalidBudgetData { .. } => ErrorCategory::Budget,

            FinancialError::DatabaseError { .. }
            | FinancialError::CacheError { .. } => ErrorCategory::Storage,

            FinancialError::ExternalServiceError { .. }
            | FinancialError::RateLimitExceeded { .. } => ErrorCategory::External,

            FinancialError::ConfigurationError { .. }
            | FinancialError::MissingConfiguration { .. } => ErrorCategory::Configuration,

            FinancialError::InternalError { .. }
            | FinancialError::NotSupported { .. }
            | FinancialError::UnsupportedOperation { .. }
            | FinancialError::InsufficientData { .. }
            | FinancialError::NotFound { .. } => ErrorCategory::System,
        }
    }

    /// Create a validation error from a parameter validation failure
    pub fn invalid_parameter(parameter: &str, value: &str) -> Self {
        FinancialError::InvalidParameter {
            parameter: parameter.to_string(),
            value: value.to_string(),
        }
    }

    /// Create a parameter out of range error
    pub fn parameter_out_of_range(
        parameter: &str,
        min: &str,
        max: &str,
        actual: &str,
    ) -> Self {
        FinancialError::ParameterOutOfRange {
            parameter: parameter.to_string(),
            min: min.to_string(),
            max: max.to_string(),
            actual: actual.to_string(),
        }
    }
}

/// Error categories for monitoring and metrics
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCategory {
    Mathematical,
    Currency,
    Validation,
    Portfolio,
    Debt,
    TimeValue,
    Risk,
    Budget,
    Storage,
    External,
    Configuration,
    System,
}

impl std::fmt::Display for ErrorCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ErrorCategory::Mathematical => write!(f, "mathematical"),
            ErrorCategory::Currency => write!(f, "currency"),
            ErrorCategory::Validation => write!(f, "validation"),
            ErrorCategory::Portfolio => write!(f, "portfolio"),
            ErrorCategory::Debt => write!(f, "debt"),
            ErrorCategory::TimeValue => write!(f, "time_value"),
            ErrorCategory::Risk => write!(f, "risk"),
            ErrorCategory::Budget => write!(f, "budget"),
            ErrorCategory::Storage => write!(f, "storage"),
            ErrorCategory::External => write!(f, "external"),
            ErrorCategory::Configuration => write!(f, "configuration"),
            ErrorCategory::System => write!(f, "system"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Currency;

    #[test]
    fn test_error_categories() {
        let math_error = FinancialError::DivisionByZero;
        assert_eq!(math_error.category(), ErrorCategory::Mathematical);

        let currency_error = FinancialError::CurrencyMismatch {
            expected: Currency::USD,
            actual: Currency::EUR,
        };
        assert_eq!(currency_error.category(), ErrorCategory::Currency);

        let validation_error = FinancialError::ValidationError("test".to_string());
        assert_eq!(validation_error.category(), ErrorCategory::Validation);
    }

    #[test]
    fn test_error_recoverability() {
        let recoverable = FinancialError::ExternalServiceError {
            service: "test".to_string(),
            message: "timeout".to_string(),
        };
        assert!(recoverable.is_recoverable());

        let non_recoverable = FinancialError::DivisionByZero;
        assert!(!non_recoverable.is_recoverable());
    }

    #[test]
    fn test_error_helper_functions() {
        let param_error = FinancialError::invalid_parameter("rate", "invalid");
        match param_error {
            FinancialError::InvalidParameter { parameter, value } => {
                assert_eq!(parameter, "rate");
                assert_eq!(value, "invalid");
            }
            _ => panic!("Expected InvalidParameter error"),
        }

        let range_error = FinancialError::parameter_out_of_range("amount", "0", "1000", "1500");
        match range_error {
            FinancialError::ParameterOutOfRange { parameter, min, max, actual } => {
                assert_eq!(parameter, "amount");
                assert_eq!(min, "0");
                assert_eq!(max, "1000");
                assert_eq!(actual, "1500");
            }
            _ => panic!("Expected ParameterOutOfRange error"),
        }
    }
}