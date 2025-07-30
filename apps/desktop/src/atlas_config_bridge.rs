// Atlas Configuration Bridge for Desktop App
// Phase 2.6: Shared Configuration Management Integration
// Rust equivalent of the Python AtlasConfigBridge for architectural compliance

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use crate::financial::FinancialError;

/// Configuration bridge that integrates with atlas-shared patterns
#[derive(Debug, Clone)]
pub struct AtlasConfigBridge {
    pub service_name: String,
    pub environment: String,
}

impl AtlasConfigBridge {
    /// Create new configuration bridge
    pub fn new(service_name: &str) -> Result<Self, FinancialError> {
        let environment = get_environment();

        let bridge = Self {
            service_name: service_name.to_string(),
            environment,
        };

        // Validate configuration for architectural compliance
        bridge.validate_configuration()?;

        Ok(bridge)
    }

    /// Get API configuration using atlas-shared patterns
    pub fn get_api_config(&self) -> ApiConfig {
        ApiConfig {
            atlas_core_url: get_optional_env("ATLAS_CORE_URL", "http://localhost:3000"),
            atlas_api_gateway_url: get_optional_env("ATLAS_API_GATEWAY_URL", "http://localhost:8081"),
            timeout_seconds: get_number_env("API_TIMEOUT", 30),
            retries: get_number_env("API_RETRIES", 3),
            rate_limit: RateLimit {
                requests: get_number_env("API_RATE_LIMIT_REQUESTS", 1000),
                window_seconds: get_number_env("API_RATE_LIMIT_WINDOW", 60),
            },
        }
    }

    /// Get authentication configuration using atlas-shared patterns
    pub fn get_auth_config(&self) -> AuthConfig {
        AuthConfig {
            provider: "supertokens".to_string(),
            atlas_core_auth_url: format!("{}/api/auth", self.get_api_config().atlas_core_url),
            token_expiry_seconds: get_number_env("JWT_TOKEN_EXPIRY", 3600),
            cookie_secure: self.environment == "production",
            session_timeout_minutes: get_number_env("SESSION_TIMEOUT_MINUTES", 480), // 8 hours
        }
    }

    /// Get monitoring configuration using atlas-shared patterns
    pub fn get_monitoring_config(&self) -> MonitoringConfig {
        let is_production = self.environment == "production";

        MonitoringConfig {
            enabled: get_boolean_env("MONITORING_ENABLED", is_production),
            level: get_optional_env("LOG_LEVEL", if is_production { "info" } else { "debug" }),
            service: self.service_name.clone(),
            version: get_optional_env("SERVICE_VERSION", "2.6.0"),
            metrics: MetricsConfig {
                enabled: get_boolean_env("ENABLE_METRICS", true),
                port: get_number_env("METRICS_PORT", 9091) as u16,
            },
            tracing: TracingConfig {
                enabled: get_boolean_env("TRACING_ENABLED", is_production),
                sample_rate: get_optional_env("TRACING_SAMPLE_RATE", "0.1")
                    .parse()
                    .unwrap_or(0.1),
            },
        }
    }

    /// Get feature flags using atlas-shared patterns
    pub fn get_feature_flags(&self) -> FeatureFlags {
        let is_development = self.environment == "development";

        FeatureFlags {
            enable_ai_insights: get_boolean_env("FEATURE_AI_INSIGHTS", true),
            enable_real_time_data: get_boolean_env("FEATURE_REAL_TIME_DATA", false),
            enable_debug_mode: get_boolean_env("FEATURE_DEBUG_MODE", is_development),
            enable_metrics: get_boolean_env("FEATURE_METRICS", true),
            enable_rate_limiting: get_boolean_env("FEATURE_RATE_LIMITING", true),
            enable_desktop_notifications: get_boolean_env("FEATURE_DESKTOP_NOTIFICATIONS", true),
            enable_offline_mode: get_boolean_env("FEATURE_OFFLINE_MODE", false),
        }
    }

    /// Get security configuration for desktop app
    pub fn get_security_config(&self) -> SecurityConfig {
        SecurityConfig {
            encryption_enabled: get_boolean_env("SECURITY_ENCRYPTION_ENABLED", true),
            audit_logging_enabled: get_boolean_env("SECURITY_AUDIT_LOGGING", true),
            auto_lock_enabled: get_boolean_env("SECURITY_AUTO_LOCK", true),
            auto_lock_timeout_minutes: get_number_env("SECURITY_AUTO_LOCK_TIMEOUT", 15),
            require_authentication_on_startup: get_boolean_env("SECURITY_REQUIRE_AUTH_STARTUP", true),
            tls_certificate_pinning: get_boolean_env("SECURITY_TLS_CERT_PINNING", true),
        }
    }

    /// Get cache configuration
    pub fn get_cache_config(&self) -> CacheConfig {
        CacheConfig {
            enabled: get_boolean_env("CACHE_ENABLED", true),
            ttl_seconds: get_number_env("CACHE_TTL", 300), // 5 minutes
            max_size_mb: get_number_env("CACHE_MAX_SIZE_MB", 100),
            auto_cleanup: get_boolean_env("CACHE_AUTO_CLEANUP", true),
        }
    }

    /// Validate configuration for architectural compliance
    pub fn validate_configuration(&self) -> Result<(), FinancialError> {
        let mut errors = Vec::new();

        // Ensure API gateway is configured (eliminates direct service access)
        let api_config = self.get_api_config();
        if api_config.atlas_core_url.is_empty() {
            errors.push("ATLAS_CORE_URL is required for proper service boundaries".to_string());
        }
        if api_config.atlas_api_gateway_url.is_empty() {
            errors.push("ATLAS_API_GATEWAY_URL is required for proper service boundaries".to_string());
        }

        // Ensure no direct database access (architectural violation)
        if env::var("DATABASE_URL").is_ok() {
            errors.push("⚠️  ARCHITECTURAL VIOLATION: Desktop app should not have DATABASE_URL set".to_string());
        }
        if env::var("POSTGRES_URL").is_ok() {
            errors.push("⚠️  ARCHITECTURAL VIOLATION: Desktop app should not have POSTGRES_URL set".to_string());
        }

        // Ensure no direct service access (architectural violation)
        if env::var("SUPERTOKENS_URL").is_ok() {
            errors.push("⚠️  ARCHITECTURAL VIOLATION: Desktop app should not have direct SUPERTOKENS_URL".to_string());
        }
        if env::var("FINANCIAL_ENGINE_URL").is_ok() {
            errors.push("⚠️  ARCHITECTURAL VIOLATION: Desktop app should not have direct FINANCIAL_ENGINE_URL".to_string());
        }

        // Production-specific validation
        if self.environment == "production" {
            let monitoring_config = self.get_monitoring_config();
            if !monitoring_config.enabled {
                errors.push("Monitoring should be enabled in production".to_string());
            }

            let features = self.get_feature_flags();
            if features.enable_debug_mode {
                errors.push("Debug mode should be disabled in production".to_string());
            }

            let security_config = self.get_security_config();
            if !security_config.encryption_enabled {
                errors.push("Encryption should be enabled in production".to_string());
            }
            if !security_config.audit_logging_enabled {
                errors.push("Audit logging should be enabled in production".to_string());
            }
        }

        if !errors.is_empty() {
            let error_message = format!(
                "Configuration validation failed:\n{}",
                errors.iter().map(|e| format!("  - {}", e)).collect::<Vec<_>>().join("\n")
            );
            return Err(FinancialError::ConfigurationError(error_message));
        }

        Ok(())
    }

    /// Get consolidated configuration for the desktop app
    pub fn get_consolidated_config(&self) -> ConsolidatedConfig {
        ConsolidatedConfig {
            environment: self.environment.clone(),
            service_name: self.service_name.clone(),
            api: self.get_api_config(),
            auth: self.get_auth_config(),
            monitoring: self.get_monitoring_config(),
            features: self.get_feature_flags(),
            security: self.get_security_config(),
            cache: self.get_cache_config(),
            architectural_compliance: ArchitecturalCompliance {
                service_boundaries: "api-gateway".to_string(),
                authentication: "supertokens".to_string(),
                error_handling: "atlas-shared".to_string(),
                configuration: "atlas-shared-bridge".to_string(),
                direct_db_access: false, // Architectural compliance marker
                direct_service_access: false, // Architectural compliance marker
                phase: "2.6".to_string(),
            },
        }
    }
}

// ============================================================================
// Configuration Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiConfig {
    pub atlas_core_url: String,
    pub atlas_api_gateway_url: String,
    pub timeout_seconds: i32,
    pub retries: i32,
    pub rate_limit: RateLimit,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimit {
    pub requests: i32,
    pub window_seconds: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    pub provider: String,
    pub atlas_core_auth_url: String,
    pub token_expiry_seconds: i32,
    pub cookie_secure: bool,
    pub session_timeout_minutes: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringConfig {
    pub enabled: bool,
    pub level: String,
    pub service: String,
    pub version: String,
    pub metrics: MetricsConfig,
    pub tracing: TracingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsConfig {
    pub enabled: bool,
    pub port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TracingConfig {
    pub enabled: bool,
    pub sample_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureFlags {
    pub enable_ai_insights: bool,
    pub enable_real_time_data: bool,
    pub enable_debug_mode: bool,
    pub enable_metrics: bool,
    pub enable_rate_limiting: bool,
    pub enable_desktop_notifications: bool,
    pub enable_offline_mode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub encryption_enabled: bool,
    pub audit_logging_enabled: bool,
    pub auto_lock_enabled: bool,
    pub auto_lock_timeout_minutes: i32,
    pub require_authentication_on_startup: bool,
    pub tls_certificate_pinning: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    pub enabled: bool,
    pub ttl_seconds: i32,
    pub max_size_mb: i32,
    pub auto_cleanup: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchitecturalCompliance {
    pub service_boundaries: String,
    pub authentication: String,
    pub error_handling: String,
    pub configuration: String,
    pub direct_db_access: bool,
    pub direct_service_access: bool,
    pub phase: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsolidatedConfig {
    pub environment: String,
    pub service_name: String,
    pub api: ApiConfig,
    pub auth: AuthConfig,
    pub monitoring: MonitoringConfig,
    pub features: FeatureFlags,
    pub security: SecurityConfig,
    pub cache: CacheConfig,
    pub architectural_compliance: ArchitecturalCompliance,
}

// ============================================================================
// Environment Helper Functions
// ============================================================================

/// Get environment with fallback
fn get_environment() -> String {
    env::var("NODE_ENV")
        .or_else(|_| env::var("ENVIRONMENT"))
        .unwrap_or_else(|_| "development".to_string())
        .to_lowercase()
}

/// Get required environment variable
fn get_required_env(key: &str) -> Result<String, FinancialError> {
    env::var(key).map_err(|_| {
        FinancialError::ConfigurationError(format!("Required environment variable {} is not set", key))
    })
}

/// Get optional environment variable with fallback
fn get_optional_env(key: &str, fallback: &str) -> String {
    env::var(key).unwrap_or_else(|_| fallback.to_string())
}

/// Get boolean environment variable with fallback
fn get_boolean_env(key: &str, fallback: bool) -> bool {
    env::var(key)
        .map(|value| matches!(value.to_lowercase().as_str(), "true" | "1" | "yes" | "on"))
        .unwrap_or(fallback)
}

/// Get number environment variable with fallback
fn get_number_env(key: &str, fallback: i32) -> i32 {
    env::var(key)
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(fallback)
}

// ============================================================================
// Global Configuration Instance
// ============================================================================

use std::sync::{Arc, Mutex};
use std::sync::OnceLock;

static ATLAS_CONFIG: OnceLock<Arc<Mutex<Option<AtlasConfigBridge>>>> = OnceLock::new();

/// Get or create atlas configuration bridge
pub fn get_atlas_config(service_name: &str) -> Result<AtlasConfigBridge, FinancialError> {
    let config_container = ATLAS_CONFIG.get_or_init(|| Arc::new(Mutex::new(None)));

    let mut config_guard = config_container.lock().unwrap();

    if config_guard.is_none() {
        let bridge = AtlasConfigBridge::new(service_name)?;
        *config_guard = Some(bridge.clone());
        Ok(bridge)
    } else {
        Ok(config_guard.as_ref().unwrap().clone())
    }
}

/// Reset configuration (for testing)
pub fn reset_atlas_config() {
    if let Some(config_container) = ATLAS_CONFIG.get() {
        let mut config_guard = config_container.lock().unwrap();
        *config_guard = None;
    }
}

/// Validate current configuration
pub fn validate_current_config() -> Result<(), FinancialError> {
    let config = get_atlas_config("atlas-desktop")?;
    config.validate_configuration()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_bridge_creation() {
        let bridge = AtlasConfigBridge::new("test-service").expect("Should create config bridge");
        assert_eq!(bridge.service_name, "test-service");
        assert!(!bridge.environment.is_empty());
    }

    #[test]
    fn test_api_config() {
        let bridge = AtlasConfigBridge::new("test-service").expect("Should create config bridge");
        let api_config = bridge.get_api_config();

        assert!(!api_config.atlas_core_url.is_empty());
        assert!(!api_config.atlas_api_gateway_url.is_empty());
        assert!(api_config.timeout_seconds > 0);
        assert!(api_config.retries > 0);
    }

    #[test]
    fn test_architectural_compliance() {
        let bridge = AtlasConfigBridge::new("test-service").expect("Should create config bridge");
        let consolidated = bridge.get_consolidated_config();

        assert_eq!(consolidated.architectural_compliance.service_boundaries, "api-gateway");
        assert_eq!(consolidated.architectural_compliance.authentication, "supertokens");
        assert!(!consolidated.architectural_compliance.direct_db_access);
        assert!(!consolidated.architectural_compliance.direct_service_access);
    }

    #[test]
    fn test_feature_flags() {
        let bridge = AtlasConfigBridge::new("test-service").expect("Should create config bridge");
        let features = bridge.get_feature_flags();

        // Should have reasonable defaults
        assert!(features.enable_ai_insights);
        assert!(features.enable_metrics);
        assert!(features.enable_desktop_notifications);
    }

    #[test]
    fn test_environment_helpers() {
        env::set_var("TEST_BOOL", "true");
        env::set_var("TEST_NUMBER", "42");
        env::set_var("TEST_STRING", "test_value");

        assert!(get_boolean_env("TEST_BOOL", false));
        assert_eq!(get_number_env("TEST_NUMBER", 0), 42);
        assert_eq!(get_optional_env("TEST_STRING", "fallback"), "test_value");
        assert_eq!(get_optional_env("NONEXISTENT", "fallback"), "fallback");

        env::remove_var("TEST_BOOL");
        env::remove_var("TEST_NUMBER");
        env::remove_var("TEST_STRING");
    }
}
