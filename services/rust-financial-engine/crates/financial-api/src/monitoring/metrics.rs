/// Atlas Financial API Metrics
///
/// Comprehensive Prometheus metrics for monitoring financial calculations,
/// system performance, and business logic health.

use prometheus::{
    Counter, Histogram, IntCounter, IntGauge, Opts, Registry, register_counter,
    register_histogram, register_int_counter, register_int_gauge,
};
use std::time::Instant;

/// Metrics handle for the financial API
#[derive(Clone)]
pub struct MetricsHandle {
    // Request metrics
    pub http_requests_total: Counter,
    pub http_request_duration: Histogram,

    // Financial calculation metrics
    pub financial_calculations_total: IntCounter,
    pub financial_calculations_errors: IntCounter,
    pub financial_calculation_duration: Histogram,

    // Debt optimization metrics
    pub debt_optimizations_total: IntCounter,
    pub debt_optimization_failures: IntCounter,
    pub debt_optimization_duration: Histogram,

    // Portfolio analysis metrics
    pub portfolio_analyses_total: IntCounter,
    pub portfolio_analysis_failures: IntCounter,
    pub portfolio_analysis_duration: Histogram,

    // Cache metrics
    pub cache_hits: IntCounter,
    pub cache_misses: IntCounter,
    pub cache_operations_duration: Histogram,

    // Authentication metrics
    pub authentication_attempts: IntCounter,
    pub authentication_failures: IntCounter,
    pub authentication_duration: Histogram,

    // System metrics
    pub active_connections: IntGauge,
    pub memory_usage_bytes: IntGauge,
    pub cpu_usage_percent: IntGauge,
}

impl MetricsHandle {
    /// Create a new metrics handle with all metrics registered
    pub fn new() -> Result<Self, prometheus::Error> {
        // HTTP request metrics
        let http_requests_total = register_counter!(
            Opts::new(
                "http_requests_total",
                "Total number of HTTP requests processed"
            ).namespace("atlas_financial")
        )?;

        let http_request_duration = register_histogram!(
            Opts::new(
                "http_request_duration_seconds",
                "HTTP request duration in seconds"
            ).namespace("atlas_financial")
        )?;

        // Financial calculation metrics
        let financial_calculations_total = register_int_counter!(
            Opts::new(
                "financial_calculations_total",
                "Total number of financial calculations performed"
            ).namespace("atlas_financial")
        )?;

        let financial_calculations_errors = register_int_counter!(
            Opts::new(
                "financial_calculations_errors_total",
                "Total number of financial calculation errors"
            ).namespace("atlas_financial")
        )?;

        let financial_calculation_duration = register_histogram!(
            Opts::new(
                "financial_calculation_duration_seconds",
                "Financial calculation duration in seconds"
            ).namespace("atlas_financial")
        )?;

        // Debt optimization metrics
        let debt_optimizations_total = register_int_counter!(
            Opts::new(
                "debt_optimizations_total",
                "Total number of debt optimizations performed"
            ).namespace("atlas_financial")
        )?;

        let debt_optimization_failures = register_int_counter!(
            Opts::new(
                "debt_optimization_failures_total",
                "Total number of debt optimization failures"
            ).namespace("atlas_financial")
        )?;

        let debt_optimization_duration = register_histogram!(
            Opts::new(
                "debt_optimization_duration_seconds",
                "Debt optimization calculation duration in seconds"
            ).namespace("atlas_financial")
        )?;

        // Portfolio analysis metrics
        let portfolio_analyses_total = register_int_counter!(
            Opts::new(
                "portfolio_analyses_total",
                "Total number of portfolio analyses performed"
            ).namespace("atlas_financial")
        )?;

        let portfolio_analysis_failures = register_int_counter!(
            Opts::new(
                "portfolio_analysis_failures_total",
                "Total number of portfolio analysis failures"
            ).namespace("atlas_financial")
        )?;

        let portfolio_analysis_duration = register_histogram!(
            Opts::new(
                "portfolio_analysis_duration_seconds",
                "Portfolio analysis duration in seconds"
            ).namespace("atlas_financial")
        )?;

        // Cache metrics
        let cache_hits = register_int_counter!(
            Opts::new(
                "cache_hits_total",
                "Total number of cache hits"
            ).namespace("atlas_financial")
        )?;

        let cache_misses = register_int_counter!(
            Opts::new(
                "cache_misses_total",
                "Total number of cache misses"
            ).namespace("atlas_financial")
        )?;

        let cache_operations_duration = register_histogram!(
            Opts::new(
                "cache_operations_duration_seconds",
                "Cache operation duration in seconds"
            ).namespace("atlas_financial")
        )?;

        // Authentication metrics
        let authentication_attempts = register_int_counter!(
            Opts::new(
                "authentication_attempts_total",
                "Total number of authentication attempts"
            ).namespace("atlas_financial")
        )?;

        let authentication_failures = register_int_counter!(
            Opts::new(
                "authentication_failures_total",
                "Total number of authentication failures"
            ).namespace("atlas_financial")
        )?;

        let authentication_duration = register_histogram!(
            Opts::new(
                "authentication_duration_seconds",
                "Authentication duration in seconds"
            ).namespace("atlas_financial")
        )?;

        // System metrics
        let active_connections = register_int_gauge!(
            Opts::new(
                "active_connections",
                "Number of active connections"
            ).namespace("atlas_financial")
        )?;

        let memory_usage_bytes = register_int_gauge!(
            Opts::new(
                "memory_usage_bytes",
                "Memory usage in bytes"
            ).namespace("atlas_financial")
        )?;

        let cpu_usage_percent = register_int_gauge!(
            Opts::new(
                "cpu_usage_percent",
                "CPU usage percentage"
            ).namespace("atlas_financial")
        )?;

        Ok(Self {
            http_requests_total,
            http_request_duration,
            financial_calculations_total,
            financial_calculations_errors,
            financial_calculation_duration,
            debt_optimizations_total,
            debt_optimization_failures,
            debt_optimization_duration,
            portfolio_analyses_total,
            portfolio_analysis_failures,
            portfolio_analysis_duration,
            cache_hits,
            cache_misses,
            cache_operations_duration,
            authentication_attempts,
            authentication_failures,
            authentication_duration,
            active_connections,
            memory_usage_bytes,
            cpu_usage_percent,
        })
    }

    /// Record an HTTP request
    pub fn record_http_request(&self, duration: std::time::Duration) {
        self.http_requests_total.inc();
        self.http_request_duration.observe(duration.as_secs_f64());
    }

    /// Record a financial calculation
    pub fn record_financial_calculation(&self, duration: std::time::Duration, success: bool) {
        self.financial_calculations_total.inc();
        if !success {
            self.financial_calculations_errors.inc();
        }
        self.financial_calculation_duration.observe(duration.as_secs_f64());
    }

    /// Record a debt optimization
    pub fn record_debt_optimization(&self, duration: std::time::Duration, success: bool) {
        self.debt_optimizations_total.inc();
        if !success {
            self.debt_optimization_failures.inc();
        }
        self.debt_optimization_duration.observe(duration.as_secs_f64());
    }

    /// Record a portfolio analysis
    pub fn record_portfolio_analysis(&self, duration: std::time::Duration, success: bool) {
        self.portfolio_analyses_total.inc();
        if !success {
            self.portfolio_analysis_failures.inc();
        }
        self.portfolio_analysis_duration.observe(duration.as_secs_f64());
    }

    /// Record cache operation
    pub fn record_cache_operation(&self, hit: bool, duration: std::time::Duration) {
        if hit {
            self.cache_hits.inc();
        } else {
            self.cache_misses.inc();
        }
        self.cache_operations_duration.observe(duration.as_secs_f64());
    }

    /// Record authentication attempt
    pub fn record_authentication(&self, duration: std::time::Duration, success: bool) {
        self.authentication_attempts.inc();
        if !success {
            self.authentication_failures.inc();
        }
        self.authentication_duration.observe(duration.as_secs_f64());
    }

    /// Update system metrics
    pub fn update_system_metrics(&self, connections: i64, memory_bytes: i64, cpu_percent: i64) {
        self.active_connections.set(connections);
        self.memory_usage_bytes.set(memory_bytes);
        self.cpu_usage_percent.set(cpu_percent);
    }
}

/// Timer helper for measuring operation durations
pub struct Timer {
    start: Instant,
}

impl Timer {
    pub fn new() -> Self {
        Self {
            start: Instant::now(),
        }
    }

    pub fn elapsed(&self) -> std::time::Duration {
        self.start.elapsed()
    }
}

/// Setup metrics system and return the metrics handle
pub fn setup_metrics() -> Result<MetricsHandle, prometheus::Error> {
    MetricsHandle::new()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn test_metrics_creation() {
        let metrics = MetricsHandle::new().unwrap();

        // Test recording various metrics
        metrics.record_http_request(Duration::from_millis(100));
        metrics.record_financial_calculation(Duration::from_millis(50), true);
        metrics.record_debt_optimization(Duration::from_millis(200), true);
        metrics.record_portfolio_analysis(Duration::from_millis(300), true);
        metrics.record_cache_operation(true, Duration::from_millis(10));
        metrics.record_authentication(Duration::from_millis(25), true);
        metrics.update_system_metrics(10, 1024 * 1024, 50);

        // Verify counters increased
        assert!(metrics.http_requests_total.get() > 0.0);
        assert!(metrics.financial_calculations_total.get() > 0);
        assert!(metrics.debt_optimizations_total.get() > 0);
        assert!(metrics.portfolio_analyses_total.get() > 0);
        assert!(metrics.cache_hits.get() > 0);
        assert!(metrics.authentication_attempts.get() > 0);
    }

    #[test]
    fn test_timer() {
        let timer = Timer::new();
        std::thread::sleep(Duration::from_millis(10));
        let elapsed = timer.elapsed();
        assert!(elapsed >= Duration::from_millis(10));
    }
}
