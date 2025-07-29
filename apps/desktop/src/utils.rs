// Utility Functions and Configuration for Atlas Desktop
// Common utilities, configuration management, and helper functions

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use crate::financial::FinancialError;

// ============================================================================
// Configuration Management
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub database_url: String,
    pub supertokens_url: String,
    pub financial_engine_url: String,
    pub ai_engine_url: String,
    pub log_level: String,
    pub cache_settings: CacheSettings,
    pub security_settings: SecuritySettings,
    pub ui_settings: UiSettings,
    pub notification_settings: NotificationSettings,
    pub performance_settings: PerformanceSettings,
    pub export_settings: ExportSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheSettings {
    pub enabled: bool,
    pub ttl_seconds: u64,
    pub max_size_mb: u64,
    pub auto_cleanup: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecuritySettings {
    pub session_timeout_minutes: u64,
    pub auto_lock_enabled: bool,
    pub auto_lock_timeout_minutes: u64,
    pub require_authentication_on_startup: bool,
    pub encryption_enabled: bool,
    pub audit_logging_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiSettings {
    pub theme: Theme,
    pub language: String,
    pub currency_display_format: CurrencyDisplayFormat,
    pub date_format: String,
    pub time_format: String,
    pub decimal_places: u8,
    pub compact_mode: bool,
    pub animations_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSettings {
    pub enabled: bool,
    pub large_transaction_threshold: Decimal,
    pub budget_alert_threshold: Decimal,
    pub security_alerts: bool,
    pub system_alerts: bool,
    pub marketing_notifications: bool,
    pub sound_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceSettings {
    pub auto_optimization: bool,
    pub background_sync: bool,
    pub sync_interval_minutes: u64,
    pub max_concurrent_requests: u32,
    pub request_timeout_seconds: u64,
    pub memory_limit_mb: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSettings {
    pub default_format: ExportFormat,
    pub default_date_range: DateRangePreset,
    pub include_metadata: bool,
    pub compress_exports: bool,
    pub auto_cleanup_exports: bool,
    pub max_export_size_mb: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Theme {
    Light,
    Dark,
    Auto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CurrencyDisplayFormat {
    Symbol,       // $1,234.56
    Code,         // USD 1,234.56
    SymbolCode,   // $1,234.56 USD
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ExportFormat {
    CSV,
    JSON,
    Excel,
    PDF,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DateRangePreset {
    LastWeek,
    LastMonth,
    LastQuarter,
    LastYear,
    YearToDate,
    All,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgresql://localhost:5432/atlas_financial".to_string()),
            supertokens_url: std::env::var("SUPERTOKENS_URL")
                .unwrap_or_else(|_| "http://localhost:3567".to_string()),
            financial_engine_url: std::env::var("FINANCIAL_ENGINE_URL")
                .unwrap_or_else(|_| "http://localhost:8080".to_string()),
            ai_engine_url: std::env::var("AI_ENGINE_URL")
                .unwrap_or_else(|_| "http://localhost:8000".to_string()),
            log_level: std::env::var("LOG_LEVEL")
                .unwrap_or_else(|_| "info".to_string()),
            cache_settings: CacheSettings::default(),
            security_settings: SecuritySettings::default(),
            ui_settings: UiSettings::default(),
            notification_settings: NotificationSettings::default(),
            performance_settings: PerformanceSettings::default(),
            export_settings: ExportSettings::default(),
        }
    }
}

impl Default for CacheSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            ttl_seconds: 300, // 5 minutes
            max_size_mb: 100,
            auto_cleanup: true,
        }
    }
}

impl Default for SecuritySettings {
    fn default() -> Self {
        Self {
            session_timeout_minutes: 480, // 8 hours
            auto_lock_enabled: true,
            auto_lock_timeout_minutes: 15,
            require_authentication_on_startup: true,
            encryption_enabled: true,
            audit_logging_enabled: true,
        }
    }
}

impl Default for UiSettings {
    fn default() -> Self {
        Self {
            theme: Theme::Auto,
            language: "en".to_string(),
            currency_display_format: CurrencyDisplayFormat::Symbol,
            date_format: "MM/dd/yyyy".to_string(),
            time_format: "h:mm a".to_string(),
            decimal_places: 2,
            compact_mode: false,
            animations_enabled: true,
        }
    }
}

impl Default for NotificationSettings {
    fn default() -> Self {
        use rust_decimal_macros::dec;

        Self {
            enabled: true,
            large_transaction_threshold: dec!(1000.00),
            budget_alert_threshold: dec!(0.80), // 80%
            security_alerts: true,
            system_alerts: true,
            marketing_notifications: false,
            sound_enabled: true,
        }
    }
}

impl Default for PerformanceSettings {
    fn default() -> Self {
        Self {
            auto_optimization: true,
            background_sync: true,
            sync_interval_minutes: 15,
            max_concurrent_requests: 10,
            request_timeout_seconds: 30,
            memory_limit_mb: 512,
        }
    }
}

impl Default for ExportSettings {
    fn default() -> Self {
        Self {
            default_format: ExportFormat::CSV,
            default_date_range: DateRangePreset::LastMonth,
            include_metadata: true,
            compress_exports: false,
            auto_cleanup_exports: true,
            max_export_size_mb: 100,
        }
    }
}

impl Config {
    /// Load configuration from file or create default
    pub async fn load() -> Result<Self, FinancialError> {
        let config_path = Self::config_file_path()?;

        if config_path.exists() {
            let content = tokio::fs::read_to_string(&config_path).await
                .map_err(|e| FinancialError::ConfigurationError(format!("Failed to read config: {}", e)))?;

            let config: Config = toml::from_str(&content)
                .map_err(|e| FinancialError::ConfigurationError(format!("Failed to parse config: {}", e)))?;

            Ok(config)
        } else {
            // Create default config and save it
            let config = Config::default();
            config.save().await?;
            Ok(config)
        }
    }

    /// Save configuration to file
    pub async fn save(&self) -> Result<(), FinancialError> {
        let config_path = Self::config_file_path()?;

        // Ensure config directory exists
        if let Some(parent) = config_path.parent() {
            tokio::fs::create_dir_all(parent).await
                .map_err(|e| FinancialError::ConfigurationError(format!("Failed to create config directory: {}", e)))?;
        }

        let content = toml::to_string_pretty(self)
            .map_err(|e| FinancialError::ConfigurationError(format!("Failed to serialize config: {}", e)))?;

        tokio::fs::write(&config_path, content).await
            .map_err(|e| FinancialError::ConfigurationError(format!("Failed to write config: {}", e)))?;

        Ok(())
    }

    /// Get configuration file path
    fn config_file_path() -> Result<PathBuf, FinancialError> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| FinancialError::ConfigurationError("Could not determine config directory".to_string()))?;

        Ok(config_dir.join("atlas-financial").join("config.toml"))
    }

    /// Validate configuration
    pub fn validate(&self) -> Result<(), FinancialError> {
        // Validate URLs
        if self.database_url.is_empty() {
            return Err(FinancialError::ConfigurationError("Database URL cannot be empty".to_string()));
        }

        if self.supertokens_url.is_empty() {
            return Err(FinancialError::ConfigurationError("SuperTokens URL cannot be empty".to_string()));
        }

        // Validate numeric values
        if self.security_settings.session_timeout_minutes == 0 {
            return Err(FinancialError::ConfigurationError("Session timeout must be greater than 0".to_string()));
        }

        if self.ui_settings.decimal_places > 4 {
            return Err(FinancialError::ConfigurationError("Decimal places cannot exceed 4".to_string()));
        }

        Ok(())
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/// Format currency amount according to settings
pub fn format_currency_with_settings(
    amount: Decimal,
    currency: &str,
    settings: &UiSettings,
) -> String {
    let formatted_amount = format!("{:.1$}", amount, settings.decimal_places as usize);

    match settings.currency_display_format {
        CurrencyDisplayFormat::Symbol => {
            match currency {
                "USD" => format!("${}", formatted_amount),
                "EUR" => format!("€{}", formatted_amount),
                "GBP" => format!("£{}", formatted_amount),
                "JPY" => format!("¥{}", formatted_amount.split('.').next().unwrap_or(&formatted_amount)),
                _ => format!("{} {}", currency, formatted_amount),
            }
        }
        CurrencyDisplayFormat::Code => {
            format!("{} {}", currency, formatted_amount)
        }
        CurrencyDisplayFormat::SymbolCode => {
            let symbol = match currency {
                "USD" => "$",
                "EUR" => "€",
                "GBP" => "£",
                "JPY" => "¥",
                _ => "",
            };

            if symbol.is_empty() {
                format!("{} {}", currency, formatted_amount)
            } else {
                format!("{}{} {}", symbol, formatted_amount, currency)
            }
        }
    }
}

/// Format date according to settings
pub fn format_date_with_settings(date: DateTime<Utc>, settings: &UiSettings) -> String {
    match settings.date_format.as_str() {
        "MM/dd/yyyy" => date.format("%m/%d/%Y").to_string(),
        "dd/MM/yyyy" => date.format("%d/%m/%Y").to_string(),
        "yyyy-MM-dd" => date.format("%Y-%m-%d").to_string(),
        "MMM dd, yyyy" => date.format("%b %d, %Y").to_string(),
        _ => date.format("%m/%d/%Y").to_string(), // Default
    }
}

/// Format time according to settings
pub fn format_time_with_settings(time: DateTime<Utc>, settings: &UiSettings) -> String {
    match settings.time_format.as_str() {
        "h:mm a" => time.format("%-I:%M %p").to_string(),
        "H:mm" => time.format("%H:%M").to_string(),
        "h:mm:ss a" => time.format("%-I:%M:%S %p").to_string(),
        "H:mm:ss" => time.format("%H:%M:%S").to_string(),
        _ => time.format("%-I:%M %p").to_string(), // Default
    }
}

/// Get application directories
pub fn get_app_directories() -> Result<AppDirectories, FinancialError> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| FinancialError::ConfigurationError("Could not determine data directory".to_string()))?
        .join("atlas-financial");

    let config_dir = dirs::config_dir()
        .ok_or_else(|| FinancialError::ConfigurationError("Could not determine config directory".to_string()))?
        .join("atlas-financial");

    let cache_dir = dirs::cache_dir()
        .ok_or_else(|| FinancialError::ConfigurationError("Could not determine cache directory".to_string()))?
        .join("atlas-financial");

    let log_dir = data_dir.join("logs");
    let export_dir = data_dir.join("exports");
    let backup_dir = data_dir.join("backups");

    Ok(AppDirectories {
        data_dir,
        config_dir,
        cache_dir,
        log_dir,
        export_dir,
        backup_dir,
    })
}

#[derive(Debug, Clone)]
pub struct AppDirectories {
    pub data_dir: PathBuf,
    pub config_dir: PathBuf,
    pub cache_dir: PathBuf,
    pub log_dir: PathBuf,
    pub export_dir: PathBuf,
    pub backup_dir: PathBuf,
}

impl AppDirectories {
    /// Ensure all directories exist
    pub async fn ensure_directories_exist(&self) -> Result<(), FinancialError> {
        let directories = [
            &self.data_dir,
            &self.config_dir,
            &self.cache_dir,
            &self.log_dir,
            &self.export_dir,
            &self.backup_dir,
        ];

        for dir in &directories {
            tokio::fs::create_dir_all(dir).await
                .map_err(|e| FinancialError::ConfigurationError(format!("Failed to create directory {:?}: {}", dir, e)))?;
        }

        Ok(())
    }
}

/// Sanitize filename for safe file operations
pub fn sanitize_filename(filename: &str) -> String {
    // Remove or replace unsafe characters
    filename
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '|' | '?' | '*' | '\\' | '/' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

/// Generate unique filename with timestamp
pub fn generate_unique_filename(base_name: &str, extension: &str) -> String {
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let sanitized_base = sanitize_filename(base_name);
    format!("{}_{}.{}", sanitized_base, timestamp, extension)
}

/// Validate decimal precision for UI display
pub fn validate_display_precision(decimal_places: u8) -> Result<(), FinancialError> {
    if decimal_places > 4 {
        return Err(FinancialError::ValidationError(
            "Display precision cannot exceed 4 decimal places".to_string()
        ));
    }
    Ok(())
}

/// Convert bytes to human-readable format
pub fn format_bytes(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];

    if bytes == 0 {
        return "0 B".to_string();
    }

    let mut size = bytes as f64;
    let mut unit_index = 0;

    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }

    if unit_index == 0 {
        format!("{} {}", bytes, UNITS[unit_index])
    } else {
        format!("{:.2} {}", size, UNITS[unit_index])
    }
}

/// Calculate percentage change between two values
pub fn calculate_percentage_change(old_value: Decimal, new_value: Decimal) -> Result<Decimal, FinancialError> {
    if old_value.is_zero() {
        if new_value.is_zero() {
            return Ok(Decimal::ZERO);
        } else {
            return Ok(Decimal::from(100)); // 100% increase from zero
        }
    }

    let change = new_value - old_value;
    let percentage = (change / old_value) * Decimal::from(100);

    Ok(percentage)
}

/// Validate email format
pub fn validate_email(email: &str) -> bool {
    // Basic email validation - in production, use a proper email validation crate
    email.contains('@') && email.contains('.') && email.len() > 5
}

/// Generate secure random string
pub fn generate_random_string(length: usize) -> String {
    use rand::Rng;
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ\
                            abcdefghijklmnopqrstuvwxyz\
                            0123456789";

    let mut rng = rand::thread_rng();
    (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

/// Hash password securely
pub fn hash_password(password: &str) -> Result<String, FinancialError> {
    use argon2::{Argon2, PasswordHasher, password_hash::{SaltString, rand_core::OsRng}};

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let password_hash = argon2.hash_password(password.as_bytes(), &salt)
        .map_err(|e| FinancialError::SecurityError(format!("Password hashing failed: {}", e)))?;

    Ok(password_hash.to_string())
}

/// Verify password hash
pub fn verify_password(password: &str, hash: &str) -> Result<bool, FinancialError> {
    use argon2::{Argon2, PasswordVerifier, PasswordHash};

    let parsed_hash = PasswordHash::new(hash)
        .map_err(|e| FinancialError::SecurityError(format!("Invalid hash format: {}", e)))?;

    let argon2 = Argon2::default();

    match argon2.verify_password(password.as_bytes(), &parsed_hash) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

// ============================================================================
// Date and Time Utilities
// ============================================================================

/// Get date range for preset
pub fn get_date_range_for_preset(preset: DateRangePreset) -> (DateTime<Utc>, DateTime<Utc>) {
    let now = Utc::now();

    match preset {
        DateRangePreset::LastWeek => {
            let start = now - chrono::Duration::days(7);
            (start, now)
        }
        DateRangePreset::LastMonth => {
            let start = now - chrono::Duration::days(30);
            (start, now)
        }
        DateRangePreset::LastQuarter => {
            let start = now - chrono::Duration::days(90);
            (start, now)
        }
        DateRangePreset::LastYear => {
            let start = now - chrono::Duration::days(365);
            (start, now)
        }
        DateRangePreset::YearToDate => {
            let start = now.with_ordinal(1).unwrap().with_hour(0).unwrap()
                .with_minute(0).unwrap().with_second(0).unwrap()
                .with_nanosecond(0).unwrap();
            (start, now)
        }
        DateRangePreset::All => {
            // Use a very early date as the start
            let start = DateTime::parse_from_rfc3339("2000-01-01T00:00:00Z").unwrap().with_timezone(&Utc);
            (start, now)
        }
    }
}

/// Check if date is within business hours
pub fn is_business_hours(date: DateTime<Utc>) -> bool {
    let weekday = date.weekday();
    let hour = date.hour();

    // Monday to Friday, 9 AM to 5 PM UTC
    matches!(weekday, chrono::Weekday::Mon | chrono::Weekday::Tue | chrono::Weekday::Wed | chrono::Weekday::Thu | chrono::Weekday::Fri)
        && hour >= 9 && hour < 17
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_format_currency_symbol() {
        let settings = UiSettings {
            currency_display_format: CurrencyDisplayFormat::Symbol,
            decimal_places: 2,
            ..Default::default()
        };

        assert_eq!(format_currency_with_settings(dec!(1234.56), "USD", &settings), "$1234.56");
        assert_eq!(format_currency_with_settings(dec!(1234.56), "EUR", &settings), "€1234.56");
    }

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("test<file>name"), "test_file_name");
        assert_eq!(sanitize_filename("normal_filename.txt"), "normal_filename.txt");
        assert_eq!(sanitize_filename("file|with:illegal*chars"), "file_with_illegal_chars");
    }

    #[test]
    fn test_calculate_percentage_change() {
        assert_eq!(
            calculate_percentage_change(dec!(100), dec!(150)).unwrap(),
            dec!(50)
        );
        assert_eq!(
            calculate_percentage_change(dec!(100), dec!(50)).unwrap(),
            dec!(-50)
        );
        assert_eq!(
            calculate_percentage_change(dec!(0), dec!(100)).unwrap(),
            dec!(100)
        );
    }

    #[test]
    fn test_format_bytes() {
        assert_eq!(format_bytes(0), "0 B");
        assert_eq!(format_bytes(1024), "1.00 KB");
        assert_eq!(format_bytes(1048576), "1.00 MB");
        assert_eq!(format_bytes(1073741824), "1.00 GB");
    }

    #[test]
    fn test_validate_email() {
        assert!(validate_email("user@example.com"));
        assert!(validate_email("test.email@domain.co.uk"));
        assert!(!validate_email("invalid-email"));
        assert!(!validate_email("@domain.com"));
        assert!(!validate_email("user@"));
    }
}
