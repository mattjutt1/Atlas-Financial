/// Configuration management for Atlas Financial API
///
/// Loads configuration from environment variables with sensible defaults
/// for development and production environments.

use serde::{Deserialize, Serialize};
use std::env;
use thiserror::Error;
use url::Url;

/// Main configuration structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Server configuration
    pub host: String,
    pub port: u16,
    pub environment: Environment,

    /// JWT authentication configuration
    pub jwt: JwtConfig,

    /// GraphQL configuration
    pub graphql: GraphqlConfig,

    /// Redis cache configuration
    pub redis: RedisConfig,

    /// Monitoring and metrics
    pub monitoring: MonitoringConfig,

    /// Performance settings
    pub performance: PerformanceConfig,
}

/// Environment type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Environment {
    Development,
    Production,
    Test,
}

/// JWT configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtConfig {
    /// JWT issuer (SuperTokens URL)
    pub issuer: String,
    /// JWT audience
    pub audience: String,
    /// JWKS endpoint URL
    pub jwks_url: String,
    /// Token validation settings
    pub validation: TokenValidation,
}

/// Token validation settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenValidation {
    /// Validate token expiration
    pub validate_exp: bool,
    /// Validate token not before
    pub validate_nbf: bool,
    /// Validate audience
    pub validate_aud: bool,
    /// Clock skew tolerance in seconds
    pub leeway: u64,
}

/// GraphQL configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphqlConfig {
    /// Enable GraphQL introspection
    pub introspection: bool,
    /// Enable GraphQL playground
    pub playground: bool,
    /// Maximum query depth
    pub max_depth: u32,
    /// Maximum query complexity
    pub max_complexity: u32,
    /// Request timeout in seconds
    pub timeout: u64,
}

/// Redis configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisConfig {
    /// Redis connection URL
    pub url: String,
    /// Connection pool size
    pub pool_size: u32,
    /// Connection timeout in seconds
    pub timeout: u64,
    /// Default TTL for cached items (seconds)
    pub default_ttl: u64,
    /// Enable Redis caching
    pub enabled: bool,
}

/// Monitoring configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringConfig {
    /// Enable Prometheus metrics
    pub enable_metrics: bool,
    /// Metrics namespace
    pub metrics_namespace: String,
    /// Enable request tracing
    pub enable_tracing: bool,
    /// Log level
    pub log_level: String,
}

/// Performance configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    /// Maximum concurrent requests
    pub max_concurrent_requests: u32,
    /// Request rate limit per minute
    pub rate_limit_per_minute: u32,
    /// Enable request compression
    pub enable_compression: bool,
    /// Maximum request size in bytes
    pub max_request_size: u64,
}

/// Configuration errors
#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Environment variable not found: {var}")]
    MissingEnvVar { var: String },

    #[error("Invalid environment variable value: {var} = {value}")]
    InvalidEnvVar { var: String, value: String },

    #[error("Invalid URL: {url}")]
    InvalidUrl { url: String },

    #[error("Parse error: {source}")]
    ParseError { source: String },
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self, ConfigError> {
        let environment = Self::get_env_var("ENVIRONMENT")
            .unwrap_or_else(|| "development".to_string())
            .parse::<Environment>()
            .map_err(|e| ConfigError::ParseError { source: e.to_string() })?;

        let host = Self::get_env_var("HOST").unwrap_or_else(|| "0.0.0.0".to_string());
        let port = Self::get_env_var("PORT")
            .unwrap_or_else(|| "8080".to_string())
            .parse::<u16>()
            .map_err(|_| ConfigError::InvalidEnvVar {
                var: "PORT".to_string(),
                value: Self::get_env_var("PORT").unwrap_or_default(),
            })?;

        // JWT configuration
        let jwt_issuer = Self::get_env_var("JWT_ISSUER")
            .unwrap_or_else(|| "http://localhost:3567".to_string());

        let jwt_audience = Self::get_env_var("JWT_AUDIENCE")
            .unwrap_or_else(|| "atlas-financial".to_string());

        let jwks_url = Self::get_env_var("JWKS_URL")
            .unwrap_or_else(|| format!("{}/auth/jwt/jwks.json", jwt_issuer));

        // Validate JWKS URL
        Url::parse(&jwks_url).map_err(|_| ConfigError::InvalidUrl { url: jwks_url.clone() })?;

        let jwt = JwtConfig {
            issuer: jwt_issuer,
            audience: jwt_audience,
            jwks_url,
            validation: TokenValidation {
                validate_exp: true,
                validate_nbf: true,
                validate_aud: true,
                leeway: 30, // 30 seconds clock skew tolerance
            },
        };

        // GraphQL configuration
        let graphql = GraphqlConfig {
            introspection: environment == Environment::Development,
            playground: environment != Environment::Production,
            max_depth: Self::get_env_var("GRAPHQL_MAX_DEPTH")
                .and_then(|v| v.parse().ok())
                .unwrap_or(15),
            max_complexity: Self::get_env_var("GRAPHQL_MAX_COMPLEXITY")
                .and_then(|v| v.parse().ok())
                .unwrap_or(1000),
            timeout: Self::get_env_var("GRAPHQL_TIMEOUT")
                .and_then(|v| v.parse().ok())
                .unwrap_or(30),
        };

        // Redis configuration
        let redis = RedisConfig {
            url: Self::get_env_var("REDIS_URL")
                .unwrap_or_else(|| "redis://localhost:6379".to_string()),
            pool_size: Self::get_env_var("REDIS_POOL_SIZE")
                .and_then(|v| v.parse().ok())
                .unwrap_or(10),
            timeout: Self::get_env_var("REDIS_TIMEOUT")
                .and_then(|v| v.parse().ok())
                .unwrap_or(5),
            default_ttl: Self::get_env_var("REDIS_DEFAULT_TTL")
                .and_then(|v| v.parse().ok())
                .unwrap_or(3600), // 1 hour
            enabled: Self::get_env_var("REDIS_ENABLED")
                .and_then(|v| v.parse().ok())
                .unwrap_or(true),
        };

        // Monitoring configuration
        let monitoring = MonitoringConfig {
            enable_metrics: Self::get_env_var("ENABLE_METRICS")
                .and_then(|v| v.parse().ok())
                .unwrap_or(true),
            metrics_namespace: Self::get_env_var("METRICS_NAMESPACE")
                .unwrap_or_else(|| "atlas_financial".to_string()),
            enable_tracing: Self::get_env_var("ENABLE_TRACING")
                .and_then(|v| v.parse().ok())
                .unwrap_or(true),
            log_level: Self::get_env_var("LOG_LEVEL")
                .unwrap_or_else(|| "info".to_string()),
        };

        // Performance configuration
        let performance = PerformanceConfig {
            max_concurrent_requests: Self::get_env_var("MAX_CONCURRENT_REQUESTS")
                .and_then(|v| v.parse().ok())
                .unwrap_or(1000),
            rate_limit_per_minute: Self::get_env_var("RATE_LIMIT_PER_MINUTE")
                .and_then(|v| v.parse().ok())
                .unwrap_or(1000),
            enable_compression: Self::get_env_var("ENABLE_COMPRESSION")
                .and_then(|v| v.parse().ok())
                .unwrap_or(true),
            max_request_size: Self::get_env_var("MAX_REQUEST_SIZE")
                .and_then(|v| v.parse().ok())
                .unwrap_or(10 * 1024 * 1024), // 10MB
        };

        Ok(Config {
            host,
            port,
            environment,
            jwt,
            graphql,
            redis,
            monitoring,
            performance,
        })
    }

    /// Create a test configuration
    pub fn test_config() -> Self {
        Config {
            host: "127.0.0.1".to_string(),
            port: 0, // Let OS choose port for tests
            environment: Environment::Test,
            jwt: JwtConfig {
                issuer: "http://localhost:3567".to_string(),
                audience: "atlas-financial-test".to_string(),
                jwks_url: "http://localhost:3567/auth/jwt/jwks.json".to_string(),
                validation: TokenValidation {
                    validate_exp: false, // Disable for tests
                    validate_nbf: false,
                    validate_aud: true,
                    leeway: 300, // 5 minutes for tests
                },
            },
            graphql: GraphqlConfig {
                introspection: true,
                playground: true,
                max_depth: 10,
                max_complexity: 100,
                timeout: 10,
            },
            redis: RedisConfig {
                url: "redis://localhost:6379/1".to_string(), // Use DB 1 for tests
                pool_size: 5,
                timeout: 2,
                default_ttl: 300, // 5 minutes for tests
                enabled: false, // Disable Redis for unit tests
            },
            monitoring: MonitoringConfig {
                enable_metrics: false,
                metrics_namespace: "atlas_financial_test".to_string(),
                enable_tracing: false,
                log_level: "debug".to_string(),
            },
            performance: PerformanceConfig {
                max_concurrent_requests: 100,
                rate_limit_per_minute: 100,
                enable_compression: false,
                max_request_size: 1024 * 1024, // 1MB for tests
            },
        }
    }

    /// Get environment variable
    fn get_env_var(key: &str) -> Option<String> {
        env::var(key).ok().filter(|v| !v.is_empty())
    }

    /// Validate configuration
    pub fn validate(&self) -> Result<(), ConfigError> {
        // Validate JWT issuer URL
        Url::parse(&self.jwt.issuer)
            .map_err(|_| ConfigError::InvalidUrl { url: self.jwt.issuer.clone() })?;

        // Validate JWKS URL
        Url::parse(&self.jwt.jwks_url)
            .map_err(|_| ConfigError::InvalidUrl { url: self.jwt.jwks_url.clone() })?;

        // Validate Redis URL if enabled
        if self.redis.enabled {
            Url::parse(&self.redis.url)
                .map_err(|_| ConfigError::InvalidUrl { url: self.redis.url.clone() })?;
        }

        // Validate port range
        if self.port == 0 && self.environment != Environment::Test {
            return Err(ConfigError::InvalidEnvVar {
                var: "PORT".to_string(),
                value: "0".to_string(),
            });
        }

        Ok(())
    }

    /// Get database URL for this environment
    pub fn database_url(&self) -> String {
        Self::get_env_var("DATABASE_URL")
            .unwrap_or_else(|| {
                match self.environment {
                    Environment::Test => "postgresql://atlas:atlas@localhost/atlas_test".to_string(),
                    Environment::Development => "postgresql://atlas:atlas@localhost/atlas_dev".to_string(),
                    Environment::Production => {
                        panic!("DATABASE_URL must be set in production")
                    }
                }
            })
    }

    /// Check if running in development mode
    pub fn is_development(&self) -> bool {
        self.environment == Environment::Development
    }

    /// Check if running in production mode
    pub fn is_production(&self) -> bool {
        self.environment == Environment::Production
    }

    /// Check if running in test mode
    pub fn is_test(&self) -> bool {
        self.environment == Environment::Test
    }
}

impl std::str::FromStr for Environment {
    type Err = ConfigError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "development" | "dev" => Ok(Environment::Development),
            "production" | "prod" => Ok(Environment::Production),
            "test" => Ok(Environment::Test),
            _ => Err(ConfigError::InvalidEnvVar {
                var: "ENVIRONMENT".to_string(),
                value: s.to_string(),
            }),
        }
    }
}

impl std::fmt::Display for Environment {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Environment::Development => write!(f, "development"),
            Environment::Production => write!(f, "production"),
            Environment::Test => write!(f, "test"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_environment_parsing() {
        assert_eq!("development".parse::<Environment>().unwrap(), Environment::Development);
        assert_eq!("production".parse::<Environment>().unwrap(), Environment::Production);
        assert_eq!("test".parse::<Environment>().unwrap(), Environment::Test);
        assert_eq!("dev".parse::<Environment>().unwrap(), Environment::Development);
        assert_eq!("prod".parse::<Environment>().unwrap(), Environment::Production);

        assert!("invalid".parse::<Environment>().is_err());
    }

    #[test]
    fn test_test_config() {
        let config = Config::test_config();
        assert_eq!(config.environment, Environment::Test);
        assert!(config.graphql.introspection);
        assert!(config.graphql.playground);
        assert!(!config.redis.enabled);
        assert!(!config.monitoring.enable_metrics);
    }

    #[test]
    fn test_config_validation() {
        let config = Config::test_config();
        assert!(config.validate().is_ok());

        let mut invalid_config = config;
        invalid_config.jwt.issuer = "invalid-url".to_string();
        assert!(invalid_config.validate().is_err());
    }

    #[test]
    fn test_environment_helpers() {
        let dev_config = Config {
            environment: Environment::Development,
            ..Config::test_config()
        };
        assert!(dev_config.is_development());
        assert!(!dev_config.is_production());
        assert!(!dev_config.is_test());

        let prod_config = Config {
            environment: Environment::Production,
            ..Config::test_config()
        };
        assert!(!prod_config.is_development());
        assert!(prod_config.is_production());
        assert!(!prod_config.is_test());
    }

    #[test]
    fn test_from_env_with_defaults() {
        // Clear environment
        env::remove_var("ENVIRONMENT");
        env::remove_var("HOST");
        env::remove_var("PORT");

        let config = Config::from_env().unwrap();
        assert_eq!(config.environment, Environment::Development);
        assert_eq!(config.host, "0.0.0.0");
        assert_eq!(config.port, 8080);
    }
}
