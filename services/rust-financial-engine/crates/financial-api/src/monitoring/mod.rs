/// Atlas Financial API Monitoring Module
///
/// Comprehensive monitoring and observability for the financial API
/// including Prometheus metrics, health checks, and performance tracking.

pub mod metrics;

pub use metrics::{MetricsHandle, Timer, setup_metrics};

// Health check response structure
#[derive(serde::Serialize, serde::Deserialize)]
pub struct HealthCheck {
    pub status: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub version: String,
    pub service: String,
    pub environment: String,
    pub checks: HealthChecks,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct HealthChecks {
    pub graphql_schema: String,
    pub authentication: String,
    pub cache: String,
    pub memory: String,
    pub database: Option<String>,
}

impl HealthCheck {
    pub fn new(environment: String, cache_status: String) -> Self {
        Self {
            status: "healthy".to_string(),
            timestamp: chrono::Utc::now(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            service: "atlas-financial-api".to_string(),
            environment,
            checks: HealthChecks {
                graphql_schema: "ok".to_string(),
                authentication: "ok".to_string(),
                cache: cache_status,
                memory: "ok".to_string(),
                database: None,
            },
        }
    }

    pub fn with_database_check(mut self, status: String) -> Self {
        self.checks.database = Some(status);
        self
    }
}
