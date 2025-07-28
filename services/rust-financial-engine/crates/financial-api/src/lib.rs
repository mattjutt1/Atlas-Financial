/// Atlas Financial API Library
///
/// High-performance GraphQL API for financial calculations with:
/// - Exact decimal precision using rust_decimal
/// - JWT authentication with Atlas integration
/// - Redis caching for performance
/// - Comprehensive debt and portfolio analysis
/// - Prometheus metrics and monitoring
pub mod auth;
pub mod config;
pub mod error;
pub mod graphql;
pub mod handlers;
pub mod monitoring;
pub mod service;

// Re-export commonly used types
pub use config::Config;
pub use error::{ApiError, Result};
pub use service::FinancialService;

// Re-export GraphQL types for convenience
pub use graphql::{
    schema::{Mutation, Query},
    types::*,
};

// Version information
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const SERVICE_NAME: &str = "atlas-financial-api";

/// API Result type alias
pub type ApiResult<T> = std::result::Result<T, ApiError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version_info() {
        assert!(!VERSION.is_empty());
        assert_eq!(SERVICE_NAME, "atlas-financial-api");
    }
}
