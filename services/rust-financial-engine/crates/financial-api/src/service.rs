/// Service layer for financial API
///
/// Contains business logic and service implementations
use axum::{routing::{get, post}, Router};
use std::sync::Arc;

use crate::graphql::resolvers::{create_schema, ApiSchema};
use crate::handlers::{health_check, readiness_check, calculate, validate_precision, financial_health};

/// Financial API service
pub struct FinancialService {
    schema: Arc<ApiSchema>,
}

impl FinancialService {
    /// Create a new financial service instance
    pub fn new() -> Self {
        let schema = Arc::new(create_schema());
        Self { schema }
    }

    /// Create the Axum router with all routes
    pub fn router(&self) -> Router {
        Router::new()
            // Health checks
            .route("/health", get(health_check))
            .route("/ready", get(readiness_check))
            // Financial calculation API endpoints
            .route("/api/v1/calculate", post(calculate))
            .route("/api/v1/validate", post(validate_precision))
            .route("/api/v1/financial/health", get(financial_health))
        // TODO: Add GraphQL routes when handlers are ready
        // .route("/graphql", post(graphql_handler))
        // .route("/playground", get(graphql_playground))
    }
}

impl Default for FinancialService {
    fn default() -> Self {
        Self::new()
    }
}
