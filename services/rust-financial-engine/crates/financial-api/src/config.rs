/// Configuration management for the financial API server
/// 
/// Handles environment-based configuration with sensible defaults
/// for development, staging, and production environments.

use config::{Config, ConfigError, Environment, File};
use serde::{Deserialize, Serialize};
use std::env;
use url::Url;

/// Main application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub redis: RedisConfig,
    pub auth: AuthConfig,
    pub logging: LoggingConfig,
    pub monitoring: MonitoringConfig,
    pub cors: CorsConfig,
}

/// Server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub environment: Environment,
    pub max_request_size: usize,
    pub request_timeout_secs: u64,
    pub graceful_shutdown_timeout_secs: u64,
}

/// Database configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub min_connections: u32,
    pub connection_timeout_secs: u64,
    pub idle_timeout_secs: u64,
    pub max_lifetime_secs: u64,
}

/// Redis cache configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisConfig {
    pub url: String,
    pub max_connections: u32,
    pub connection_timeout_secs: u64,
    pub default_ttl_secs: u64,
    pub portfolio_ttl_secs: u64,
    pub debt_calculation_ttl_secs: u64,
    pub user_session_ttl_secs: u64,
}

/// Authentication configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub jwt_expiration_hours: u64,
    pub atlas_api_url: String,
    pub atlas_api_key: String,
    pub require_auth: bool,
    pub allowed_issuers: Vec<String>,
}

/// Logging configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub format: LogFormat,
    pub enable_console: bool,
    pub enable_file: bool,
    pub file_path: Option<String>,
    pub enable_json: bool,
}

/// Monitoring configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringConfig {
    pub enable_metrics: bool,
    pub metrics_port: u16,
    pub metrics_path: String,
    pub enable_tracing: bool,
    pub tracing_endpoint: Option<String>,
    pub health_check_path: String,
}

/// CORS configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorsConfig {
    pub allowed_origins: Vec<String>,
    pub allowed_methods: Vec<String>,
    pub allowed_headers: Vec<String>,
    pub max_age_secs: u64,
    pub allow_credentials: bool,
}

/// Environment types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Environment {
    Development,
    Staging,
    Production,
}

/// Log format options
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogFormat {
    Pretty,
    Json,
    Compact,
}

impl AppConfig {
    /// Load configuration from environment variables and config files
    pub fn load() -> Result<Self, ConfigError> {
        let environment = env::var("ENVIRONMENT")
            .unwrap_or_else(|_| "development".to_string());

        let mut builder = Config::builder()
            // Start with default configuration
            .set_default("server.host", "0.0.0.0")?
            .set_default("server.port", 8080)?
            .set_default("server.environment", &environment)?
            .set_default("server.max_request_size", 1048576)? // 1MB
            .set_default("server.request_timeout_secs", 30)?
            .set_default("server.graceful_shutdown_timeout_secs", 10)?
            
            // Database defaults
            .set_default("database.url", "postgresql://localhost:5432/atlas_financial")?
            .set_default("database.max_connections", 10)?
            .set_default("database.min_connections", 1)?
            .set_default("database.connection_timeout_secs", 30)?
            .set_default("database.idle_timeout_secs", 600)?
            .set_default("database.max_lifetime_secs", 3600)?
            
            // Redis defaults
            .set_default("redis.url", "redis://localhost:6379")?
            .set_default("redis.max_connections", 10)?
            .set_default("redis.connection_timeout_secs", 10)?
            .set_default("redis.default_ttl_secs", 3600)?
            .set_default("redis.portfolio_ttl_secs", 1800)?
            .set_default("redis.debt_calculation_ttl_secs", 3600)?
            .set_default("redis.user_session_ttl_secs", 86400)?
            
            // Auth defaults
            .set_default("auth.jwt_secret", "dev-secret-change-in-production")?
            .set_default("auth.jwt_expiration_hours", 24)?
            .set_default("auth.atlas_api_url", "https://api.atlas-financial.com")?
            .set_default("auth.atlas_api_key", "")?
            .set_default("auth.require_auth", true)?
            .set_default("auth.allowed_issuers", vec!["atlas-financial"])?
            
            // Logging defaults
            .set_default("logging.level", if environment == "production" { "info" } else { "debug" })?
            .set_default("logging.format", if environment == "production" { "json" } else { "pretty" })?
            .set_default("logging.enable_console", true)?
            .set_default("logging.enable_file", false)?
            .set_default("logging.enable_json", environment == "production")?
            
            // Monitoring defaults
            .set_default("monitoring.enable_metrics", true)?
            .set_default("monitoring.metrics_port", 9090)?
            .set_default("monitoring.metrics_path", "/metrics")?
            .set_default("monitoring.enable_tracing", environment != "development")?
            .set_default("monitoring.health_check_path", "/health")?
            
            // CORS defaults
            .set_default("cors.allowed_origins", vec!["*"])?
            .set_default("cors.allowed_methods", vec!["GET", "POST", "OPTIONS"])?
            .set_default("cors.allowed_headers", vec!["Content-Type", "Authorization"])?
            .set_default("cors.max_age_secs", 3600)?
            .set_default("cors.allow_credentials", true)?;

        // Load environment-specific config file if it exists
        let config_file = format!("config/{}.toml", environment);
        if std::path::Path::new(&config_file).exists() {
            builder = builder.add_source(File::with_name(&config_file));
        }

        // Override with environment variables (prefixed with FINANCIAL_API_)
        builder = builder.add_source(
            Environment::with_prefix("FINANCIAL_API")
                .prefix_separator("_")
                .separator("__")
        );

        let config = builder.build()?;
        config.try_deserialize()
    }

    /// Validate configuration settings
    pub fn validate(&self) -> Result<(), String> {
        // Validate server configuration
        if self.server.port == 0 {
            return Err("Server port must be greater than 0".to_string());
        }

        // Validate database URL
        if self.database.url.is_empty() {
            return Err("Database URL cannot be empty".to_string());
        }

        // Validate Redis URL
        Url::parse(&self.redis.url)
            .map_err(|e| format!("Invalid Redis URL: {}", e))?;

        // Validate Atlas API URL
        Url::parse(&self.auth.atlas_api_url)
            .map_err(|e| format!("Invalid Atlas API URL: {}", e))?;

        // Validate JWT secret in production
        if self.server.environment == Environment::Production {
            if self.auth.jwt_secret == "dev-secret-change-in-production" {
                return Err("JWT secret must be changed in production".to_string());
            }
            
            if self.auth.jwt_secret.len() < 32 {
                return Err("JWT secret must be at least 32 characters in production".to_string());
            }
            
            if self.auth.atlas_api_key.is_empty() {
                return Err("Atlas API key must be configured in production".to_string());
            }
        }

        // Validate connection pool settings
        if self.database.max_connections < self.database.min_connections {
            return Err("Database max_connections must be >= min_connections".to_string());
        }

        Ok(())
    }

    /// Get the bind address for the server
    pub fn bind_address(&self) -> String {
        format!("{}:{}", self.server.host, self.server.port)
    }

    /// Get the metrics bind address
    pub fn metrics_bind_address(&self) -> String {
        format!("{}:{}", self.server.host, self.monitoring.metrics_port)
    }

    /// Check if running in development mode
    pub fn is_development(&self) -> bool {
        self.server.environment == Environment::Development
    }

    /// Check if running in production mode
    pub fn is_production(&self) -> bool {
        self.server.environment == Environment::Production
    }

    /// Get CORS origins as a list of strings
    pub fn cors_origins(&self) -> &[String] {
        &self.cors.allowed_origins
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig::load().expect("Failed to load default configuration")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_default_config_loads() {
        let config = AppConfig::load();
        assert!(config.is_ok());
    }

    #[test]
    fn test_config_validation() {
        let config = AppConfig::load().unwrap();
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_environment_override() {
        env::set_var("FINANCIAL_API_SERVER__PORT", "9999");
        let config = AppConfig::load().unwrap();
        assert_eq!(config.server.port, 9999);
        env::remove_var("FINANCIAL_API_SERVER__PORT");
    }

    #[test]
    fn test_bind_addresses() {
        let config = AppConfig::load().unwrap();
        assert_eq!(config.bind_address(), format!("{}:{}", config.server.host, config.server.port));
        assert_eq!(config.metrics_bind_address(), format!("{}:{}", config.server.host, config.monitoring.metrics_port));
    }

    #[test]
    fn test_environment_detection() {
        let mut config = AppConfig::load().unwrap();
        
        config.server.environment = Environment::Development;
        assert!(config.is_development());
        assert!(!config.is_production());
        
        config.server.environment = Environment::Production;
        assert!(!config.is_development());
        assert!(config.is_production());
    }
}