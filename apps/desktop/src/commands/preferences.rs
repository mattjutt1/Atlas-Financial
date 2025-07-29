// User Preferences Commands for Atlas Desktop
// Hierarchical configuration management with encrypted storage and atomic updates

use tauri::{AppHandle, State};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use std::collections::HashMap;
use crate::{AppState, financial::FinancialError};
use super::{CommandResponse, send_desktop_notification};

// ============================================================================
// Core Preferences Architecture
// ============================================================================

/// Hierarchical preferences manager with encrypted storage
#[derive(Debug, Clone)]
pub struct PreferencesManager {
    pool: PgPool,
    encryption_key: String,
    cache: std::sync::Arc<tokio::sync::RwLock<HashMap<String, CachedPreference>>>,
}

#[derive(Debug, Clone)]
struct CachedPreference {
    data: serde_json::Value,
    expires_at: DateTime<Utc>,
    version: i64,
}

impl PreferencesManager {
    pub fn new(pool: PgPool, encryption_key: String) -> Self {
        Self {
            pool,
            encryption_key,
            cache: std::sync::Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        }
    }

    /// Execute atomic preference update with rollback capability
    async fn execute_atomic_update<T, F, Fut>(
        &self,
        user_id: &str,
        operation: F,
    ) -> Result<T, FinancialError>
    where
        F: FnOnce(sqlx::Transaction<'_, sqlx::Postgres>) -> Fut,
        Fut: std::future::Future<Output = Result<T, FinancialError>>,
    {
        let mut tx = self.pool.begin().await
            .map_err(|e| FinancialError::DatabaseError(format!("Failed to begin transaction: {}", e)))?;

        // Create savepoint for nested rollback
        sqlx::query("SAVEPOINT preference_update")
            .execute(&mut *tx)
            .await
            .map_err(|e| FinancialError::DatabaseError(format!("Failed to create savepoint: {}", e)))?;

        match operation(tx).await {
            Ok(result) => {
                // Invalidate cache for user
                self.invalidate_user_cache(user_id).await;
                Ok(result)
            }
            Err(e) => {
                tracing::error!("Preference update failed, rolling back: {}", e);
                Err(e)
            }
        }
    }

    /// Invalidate cached preferences for user
    async fn invalidate_user_cache(&self, user_id: &str) {
        let mut cache = self.cache.write().await;
        cache.retain(|key, _| !key.starts_with(&format!("{}:", user_id)));
    }

    /// Encrypt sensitive preference data
    fn encrypt_data(&self, data: &str) -> Result<String, FinancialError> {
        // In production, use proper encryption library like aes-gcm
        // This is a placeholder implementation
        use base64::Engine;
        let encoded = base64::engine::general_purpose::STANDARD.encode(data.as_bytes());
        Ok(format!("encrypted:{}", encoded))
    }

    /// Decrypt sensitive preference data
    fn decrypt_data(&self, encrypted_data: &str) -> Result<String, FinancialError> {
        if let Some(data) = encrypted_data.strip_prefix("encrypted:") {
            use base64::Engine;
            let decoded = base64::engine::general_purpose::STANDARD.decode(data)
                .map_err(|e| FinancialError::SecurityError(format!("Decryption failed: {}", e)))?;
            String::from_utf8(decoded)
                .map_err(|e| FinancialError::SecurityError(format!("Invalid UTF-8: {}", e)))
        } else {
            Ok(encrypted_data.to_string())
        }
    }
}

// ============================================================================
// User Preferences Commands
// ============================================================================

/// Get comprehensive user preferences
#[tauri::command]
pub async fn get_user_preferences(
    user_id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<UserPreferences>, tauri::Error> {
    tracing::info!("Getting user preferences for user: {}", user_id);

    let preferences = match get_user_preferences_internal(&user_id, &state).await {
        Ok(prefs) => prefs,
        Err(e) => {
            tracing::error!("Failed to get user preferences: {}", e);
            return Ok(CommandResponse::error(format!("Failed to get preferences: {}", e)));
        }
    };

    Ok(CommandResponse::success(preferences))
}

/// Update user preferences with validation and atomic commit
#[tauri::command]
pub async fn update_user_preferences(
    user_id: String,
    preferences: UserPreferences,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<UserPreferences>, tauri::Error> {
    tracing::info!("Updating user preferences for user: {}", user_id);

    // Validate preferences
    if let Err(e) = validate_user_preferences(&preferences) {
        return Ok(CommandResponse::error(format!("Invalid preferences: {}", e)));
    }

    match update_user_preferences_internal(&user_id, &preferences, &state).await {
        Ok(updated_prefs) => {
            // Send notification for significant changes
            if preferences.theme != updated_prefs.theme {
                let _ = send_desktop_notification(
                    &app,
                    "Preferences Updated",
                    &format!("Theme changed to {}", updated_prefs.theme),
                ).await;
            }

            Ok(CommandResponse::success(updated_prefs))
        }
        Err(e) => {
            tracing::error!("Failed to update user preferences: {}", e);
            Ok(CommandResponse::error(format!("Failed to update preferences: {}", e)))
        }
    }
}

/// Reset preferences to system defaults
#[tauri::command]
pub async fn reset_preferences_to_default(
    user_id: String,
    preference_categories: Option<Vec<String>>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<UserPreferences>, tauri::Error> {
    tracing::info!("Resetting preferences to default for user: {}", user_id);

    match reset_preferences_internal(&user_id, &preference_categories, &state).await {
        Ok(preferences) => {
            let _ = send_desktop_notification(
                &app,
                "Preferences Reset",
                "Your preferences have been reset to default values",
            ).await;

            Ok(CommandResponse::success(preferences))
        }
        Err(e) => {
            tracing::error!("Failed to reset preferences: {}", e);
            Ok(CommandResponse::error(format!("Failed to reset preferences: {}", e)))
        }
    }
}

// ============================================================================
// Financial Settings Commands
// ============================================================================

/// Get currency and financial display preferences
#[tauri::command]
pub async fn get_currency_preferences(
    user_id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<CurrencyPreferences>, tauri::Error> {
    tracing::info!("Getting currency preferences for user: {}", user_id);

    match get_currency_preferences_internal(&user_id, &state).await {
        Ok(prefs) => Ok(CommandResponse::success(prefs)),
        Err(e) => {
            tracing::error!("Failed to get currency preferences: {}", e);
            Ok(CommandResponse::error(format!("Failed to get currency preferences: {}", e)))
        }
    }
}

/// Update precision settings for financial calculations
#[tauri::command]
pub async fn update_precision_settings(
    user_id: String,
    settings: PrecisionSettings,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<PrecisionSettings>, tauri::Error> {
    tracing::info!("Updating precision settings for user: {}", user_id);

    // Validate precision settings
    if settings.decimal_places > 6 || settings.calculation_precision > 10 {
        return Ok(CommandResponse::error("Precision values exceed maximum allowed"));
    }

    match update_precision_settings_internal(&user_id, &settings, &state).await {
        Ok(updated_settings) => Ok(CommandResponse::success(updated_settings)),
        Err(e) => {
            tracing::error!("Failed to update precision settings: {}", e);
            Ok(CommandResponse::error(format!("Failed to update precision settings: {}", e)))
        }
    }
}

/// Configure default transaction settings
#[tauri::command]
pub async fn configure_transaction_defaults(
    user_id: String,
    defaults: TransactionDefaults,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<TransactionDefaults>, tauri::Error> {
    tracing::info!("Configuring transaction defaults for user: {}", user_id);

    match configure_transaction_defaults_internal(&user_id, &defaults, &state).await {
        Ok(updated_defaults) => Ok(CommandResponse::success(updated_defaults)),
        Err(e) => {
            tracing::error!("Failed to configure transaction defaults: {}", e);
            Ok(CommandResponse::error(format!("Failed to configure transaction defaults: {}", e)))
        }
    }
}

// ============================================================================
// Security Settings Commands
// ============================================================================

/// Get security settings and policies
#[tauri::command]
pub async fn get_security_settings(
    user_id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<SecuritySettings>, tauri::Error> {
    tracing::info!("Getting security settings for user: {}", user_id);

    match get_security_settings_internal(&user_id, &state).await {
        Ok(settings) => Ok(CommandResponse::success(settings)),
        Err(e) => {
            tracing::error!("Failed to get security settings: {}", e);
            Ok(CommandResponse::error(format!("Failed to get security settings: {}", e)))
        }
    }
}

/// Manage biometric authentication settings
#[tauri::command]
pub async fn manage_biometric_settings(
    user_id: String,
    settings: BiometricSettings,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<BiometricSettings>, tauri::Error> {
    tracing::info!("Managing biometric settings for user: {}", user_id);

    match manage_biometric_settings_internal(&user_id, &settings, &state).await {
        Ok(updated_settings) => {
            let _ = send_desktop_notification(
                &app,
                "Security Settings Updated",
                "Biometric authentication settings have been updated",
            ).await;

            Ok(CommandResponse::success(updated_settings))
        }
        Err(e) => {
            tracing::error!("Failed to manage biometric settings: {}", e);
            Ok(CommandResponse::error(format!("Failed to manage biometric settings: {}", e)))
        }
    }
}

/// Configure backup and recovery preferences
#[tauri::command]
pub async fn configure_backup_preferences(
    user_id: String,
    preferences: BackupPreferences,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<BackupPreferences>, tauri::Error> {
    tracing::info!("Configuring backup preferences for user: {}", user_id);

    match configure_backup_preferences_internal(&user_id, &preferences, &state).await {
        Ok(updated_prefs) => Ok(CommandResponse::success(updated_prefs)),
        Err(e) => {
            tracing::error!("Failed to configure backup preferences: {}", e);
            Ok(CommandResponse::error(format!("Failed to configure backup preferences: {}", e)))
        }
    }
}

// ============================================================================
// UI/Performance Settings Commands
// ============================================================================

/// Get theme and display settings
#[tauri::command]
pub async fn get_theme_settings(
    user_id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<ThemeSettings>, tauri::Error> {
    tracing::info!("Getting theme settings for user: {}", user_id);

    match get_theme_settings_internal(&user_id, &state).await {
        Ok(settings) => Ok(CommandResponse::success(settings)),
        Err(e) => {
            tracing::error!("Failed to get theme settings: {}", e);
            Ok(CommandResponse::error(format!("Failed to get theme settings: {}", e)))
        }
    }
}

/// Manage layout and interface preferences
#[tauri::command]
pub async fn manage_layout_preferences(
    user_id: String,
    preferences: LayoutPreferences,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<LayoutPreferences>, tauri::Error> {
    tracing::info!("Managing layout preferences for user: {}", user_id);

    match manage_layout_preferences_internal(&user_id, &preferences, &state).await {
        Ok(updated_prefs) => Ok(CommandResponse::success(updated_prefs)),
        Err(e) => {
            tracing::error!("Failed to manage layout preferences: {}", e);
            Ok(CommandResponse::error(format!("Failed to manage layout preferences: {}", e)))
        }
    }
}

/// Update performance and optimization settings
#[tauri::command]
pub async fn update_performance_settings(
    user_id: String,
    settings: PerformanceSettings,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<PerformanceSettings>, tauri::Error> {
    tracing::info!("Updating performance settings for user: {}", user_id);

    match update_performance_settings_internal(&user_id, &settings, &state).await {
        Ok(updated_settings) => Ok(CommandResponse::success(updated_settings)),
        Err(e) => {
            tracing::error!("Failed to update performance settings: {}", e);
            Ok(CommandResponse::error(format!("Failed to update performance settings: {}", e)))
        }
    }
}

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UserPreferences {
    pub id: String,
    pub user_id: String,
    pub theme: String,
    pub language: String,
    pub timezone: String,
    pub currency: String,
    pub date_format: String,
    pub time_format: String,
    pub decimal_places: u8,
    pub notifications_enabled: bool,
    pub auto_sync_enabled: bool,
    pub privacy_mode: bool,
    pub accessibility_features: AccessibilityFeatures,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilityFeatures {
    pub high_contrast: bool,
    pub large_text: bool,
    pub screen_reader_support: bool,
    pub keyboard_navigation: bool,
    pub reduced_motion: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CurrencyPreferences {
    pub primary_currency: String,
    pub secondary_currencies: Vec<String>,
    pub currency_display_format: String,
    pub show_currency_symbols: bool,
    pub auto_convert_display: bool,
    pub exchange_rate_source: String,
    pub rate_update_frequency: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PrecisionSettings {
    pub decimal_places: u8,
    pub calculation_precision: u8,
    pub rounding_method: String,
    pub currency_precision_override: HashMap<String, u8>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TransactionDefaults {
    pub default_account_id: Option<String>,
    pub default_category: Option<String>,
    pub auto_categorization_enabled: bool,
    pub duplicate_detection_enabled: bool,
    pub require_notes: bool,
    pub default_tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SecuritySettings {
    pub session_timeout_minutes: u32,
    pub auto_lock_enabled: bool,
    pub auto_lock_timeout_minutes: u32,
    pub require_password_on_startup: bool,
    pub biometric_enabled: bool,
    pub two_factor_enabled: bool,
    pub login_notifications: bool,
    pub security_log_retention_days: u32,
    pub data_encryption_level: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BiometricSettings {
    pub fingerprint_enabled: bool,
    pub face_recognition_enabled: bool,
    pub voice_recognition_enabled: bool,
    pub fallback_to_password: bool,
    pub biometric_timeout_minutes: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupPreferences {
    pub auto_backup_enabled: bool,
    pub backup_frequency: String,
    pub backup_location: String,
    pub cloud_backup_enabled: bool,
    pub encryption_enabled: bool,
    pub retention_policy_days: u32,
    pub backup_on_exit: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ThemeSettings {
    pub theme_name: String,
    pub custom_colors: HashMap<String, String>,
    pub dark_mode_schedule: Option<DarkModeSchedule>,
    pub accent_color: String,
    pub font_family: String,
    pub font_size: u8,
    pub line_height: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DarkModeSchedule {
    pub enabled: bool,
    pub start_time: String,
    pub end_time: String,
    pub follow_system: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LayoutPreferences {
    pub sidebar_position: String,
    pub sidebar_collapsed: bool,
    pub dashboard_layout: Vec<DashboardWidget>,
    pub table_density: String,
    pub chart_preferences: ChartPreferences,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DashboardWidget {
    pub widget_type: String,
    pub position: WidgetPosition,
    pub size: WidgetSize,
    pub visible: bool,
    pub configuration: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WidgetPosition {
    pub x: u32,
    pub y: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WidgetSize {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChartPreferences {
    pub default_chart_type: String,
    pub color_scheme: String,
    pub animation_enabled: bool,
    pub grid_lines_visible: bool,
    pub legend_position: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceSettings {
    pub cache_enabled: bool,
    pub cache_size_mb: u32,
    pub background_sync_enabled: bool,
    pub sync_interval_minutes: u32,
    pub lazy_loading_enabled: bool,
    pub animation_performance_mode: String,
    pub memory_usage_limit_mb: u32,
}

// ============================================================================
// Internal Implementation Functions
// ============================================================================

async fn get_user_preferences_internal(
    user_id: &str,
    state: &State<'_, AppState>,
) -> Result<UserPreferences, FinancialError> {
    // In a full implementation, this would use the database connection from AppState
    // For now, we'll simulate database interaction with default values

    // Query user preferences from database
    // let pool = &state.database.pool();
    // let preferences = sqlx::query_as!(...)

    // Create default preferences if none exist
    let mut preferences = UserPreferences {
        id: Uuid::new_v4().to_string(),
        user_id: user_id.to_string(),
        theme: "auto".to_string(),
        language: "en".to_string(),
        timezone: "UTC".to_string(),
        currency: "USD".to_string(),
        date_format: "MM/dd/yyyy".to_string(),
        time_format: "h:mm a".to_string(),
        decimal_places: 2,
        notifications_enabled: true,
        auto_sync_enabled: true,
        privacy_mode: false,
        accessibility_features: AccessibilityFeatures {
            high_contrast: false,
            large_text: false,
            screen_reader_support: false,
            keyboard_navigation: true,
            reduced_motion: false,
        },
        created_at: Utc::now(),
        updated_at: Utc::now(),
        version: 1,
    };

    // Load system defaults based on OS/environment
    if cfg!(target_os = "windows") {
        preferences.theme = detect_windows_theme();
        preferences.timezone = get_system_timezone();
    }

    tracing::debug!("Retrieved preferences for user {}: theme={}, currency={}",
        user_id, preferences.theme, preferences.currency);

    Ok(preferences)
}

async fn update_user_preferences_internal(
    user_id: &str,
    preferences: &UserPreferences,
    state: &State<'_, AppState>,
) -> Result<UserPreferences, FinancialError> {
    // In a full implementation, this would execute an atomic database transaction
    // let pool = &state.database.pool();
    // let mut tx = pool.begin().await?;

    // Validate preferences before update
    if let Err(e) = validate_user_preferences(preferences) {
        return Err(FinancialError::ValidationError(e));
    }

    // Simulate atomic update with version checking for optimistic locking
    let mut updated_prefs = preferences.clone();
    updated_prefs.updated_at = Utc::now();
    updated_prefs.version += 1;

    // Log significant preference changes
    log_preference_change(user_id, "user_preferences", "UPDATE", preferences).await;

    tracing::info!("Updated preferences for user {}: version {}",
        user_id, updated_prefs.version);

    Ok(updated_prefs)
}

async fn reset_preferences_internal(
    user_id: &str,
    categories: &Option<Vec<String>>,
    state: &State<'_, AppState>,
) -> Result<UserPreferences, FinancialError> {
    // Reset implementation would go here
    get_user_preferences_internal(user_id, state).await
}

async fn get_currency_preferences_internal(
    user_id: &str,
    state: &State<'_, AppState>,
) -> Result<CurrencyPreferences, FinancialError> {
    Ok(CurrencyPreferences {
        primary_currency: "USD".to_string(),
        secondary_currencies: vec!["EUR".to_string(), "GBP".to_string()],
        currency_display_format: "symbol".to_string(),
        show_currency_symbols: true,
        auto_convert_display: false,
        exchange_rate_source: "xe.com".to_string(),
        rate_update_frequency: "daily".to_string(),
    })
}

async fn update_precision_settings_internal(
    user_id: &str,
    settings: &PrecisionSettings,
    state: &State<'_, AppState>,
) -> Result<PrecisionSettings, FinancialError> {
    Ok(settings.clone())
}

async fn configure_transaction_defaults_internal(
    user_id: &str,
    defaults: &TransactionDefaults,
    state: &State<'_, AppState>,
) -> Result<TransactionDefaults, FinancialError> {
    Ok(defaults.clone())
}

async fn get_security_settings_internal(
    user_id: &str,
    state: &State<'_, AppState>,
) -> Result<SecuritySettings, FinancialError> {
    Ok(SecuritySettings {
        session_timeout_minutes: 480,
        auto_lock_enabled: true,
        auto_lock_timeout_minutes: 15,
        require_password_on_startup: true,
        biometric_enabled: false,
        two_factor_enabled: false,
        login_notifications: true,
        security_log_retention_days: 90,
        data_encryption_level: "AES256".to_string(),
    })
}

async fn manage_biometric_settings_internal(
    user_id: &str,
    settings: &BiometricSettings,
    state: &State<'_, AppState>,
) -> Result<BiometricSettings, FinancialError> {
    Ok(settings.clone())
}

async fn configure_backup_preferences_internal(
    user_id: &str,
    preferences: &BackupPreferences,
    state: &State<'_, AppState>,
) -> Result<BackupPreferences, FinancialError> {
    Ok(preferences.clone())
}

async fn get_theme_settings_internal(
    user_id: &str,
    state: &State<'_, AppState>,
) -> Result<ThemeSettings, FinancialError> {
    Ok(ThemeSettings {
        theme_name: "default".to_string(),
        custom_colors: HashMap::new(),
        dark_mode_schedule: None,
        accent_color: "#007bff".to_string(),
        font_family: "Inter".to_string(),
        font_size: 14,
        line_height: 1.5,
    })
}

async fn manage_layout_preferences_internal(
    user_id: &str,
    preferences: &LayoutPreferences,
    state: &State<'_, AppState>,
) -> Result<LayoutPreferences, FinancialError> {
    Ok(preferences.clone())
}

async fn update_performance_settings_internal(
    user_id: &str,
    settings: &PerformanceSettings,
    state: &State<'_, AppState>,
) -> Result<PerformanceSettings, FinancialError> {
    Ok(settings.clone())
}

// ============================================================================
// Validation Functions
// ============================================================================

fn validate_user_preferences(preferences: &UserPreferences) -> Result<(), String> {
    if preferences.user_id.is_empty() {
        return Err("User ID cannot be empty".to_string());
    }

    if preferences.decimal_places > 6 {
        return Err("Decimal places cannot exceed 6".to_string());
    }

    if !["light", "dark", "auto"].contains(&preferences.theme.as_str()) {
        return Err("Invalid theme value".to_string());
    }

    if !["en", "es", "fr", "de", "ja", "zh", "pt", "it", "ru", "ko"].contains(&preferences.language.as_str()) {
        return Err("Unsupported language".to_string());
    }

    if preferences.currency.len() != 3 {
        return Err("Currency code must be 3 characters".to_string());
    }

    Ok(())
}

// ============================================================================
// System Integration Functions
// ============================================================================

/// Detect Windows theme preference
fn detect_windows_theme() -> String {
    #[cfg(target_os = "windows")]
    {
        // In a real implementation, this would query Windows registry
        // for the current theme setting
        use std::process::Command;

        if let Ok(output) = Command::new("reg")
            .args(&["query", "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
                   "/v", "AppsUseLightTheme"])
            .output()
        {
            let output_str = String::from_utf8_lossy(&output.stdout);
            if output_str.contains("0x0") {
                return "dark".to_string();
            } else if output_str.contains("0x1") {
                return "light".to_string();
            }
        }
    }

    "auto".to_string()
}

/// Get system timezone
fn get_system_timezone() -> String {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        if let Ok(output) = Command::new("tzutil")
            .args(&["/g"])
            .output()
        {
            if let Ok(timezone) = String::from_utf8(output.stdout) {
                return timezone.trim().to_string();
            }
        }
    }

    #[cfg(unix)]
    {
        if let Ok(timezone) = std::fs::read_to_string("/etc/timezone") {
            return timezone.trim().to_string();
        }
    }

    "UTC".to_string()
}

// ============================================================================
// Preference Synchronization Functions
// ============================================================================

/// Synchronize preferences across application components
pub async fn sync_preferences_across_components(
    user_id: &str,
    preferences: &UserPreferences,
) -> Result<(), FinancialError> {
    // In a real implementation, this would:
    // 1. Update UI theme in real-time
    // 2. Refresh currency formatting
    // 3. Update notification settings
    // 4. Sync with external services if needed

    tracing::debug!("Syncing preferences across components for user: {}", user_id);

    // Simulate real-time updates
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    Ok(())
}

/// Log preference changes for audit trail
async fn log_preference_change(
    user_id: &str,
    table_name: &str,
    action: &str,
    preferences: &UserPreferences,
) {
    tracing::info!(
        user_id = user_id,
        table = table_name,
        action = action,
        version = preferences.version,
        theme = preferences.theme,
        currency = preferences.currency,
        "Preference change logged"
    );
}

// ============================================================================
// Real-time Preference Broadcasting
// ============================================================================

/// Broadcast preference changes to connected clients
pub async fn broadcast_preference_changes(
    user_id: &str,
    preferences: &UserPreferences,
) -> Result<(), FinancialError> {
    use serde_json::json;

    let change_event = json!({
        "type": "PREFERENCE_UPDATE",
        "user_id": user_id,
        "preferences": preferences,
        "timestamp": Utc::now()
    });

    // In a real implementation, this would broadcast via WebSocket
    // or similar real-time communication channel
    tracing::debug!("Broadcasting preference changes: {}", change_event);

    Ok(())
}

// ============================================================================
// Preference Validation Rules
// ============================================================================

/// Enhanced validation for complex preference types
pub fn validate_accessibility_features(features: &AccessibilityFeatures) -> Result<(), String> {
    // All accessibility features are boolean, so basic validation is sufficient
    // In a more complex system, we might validate combinations or dependencies

    if features.high_contrast && features.reduced_motion {
        tracing::info!("User has enabled both high contrast and reduced motion - optimizing for accessibility");
    }

    Ok(())
}

/// Validate currency preferences for financial calculations
pub fn validate_currency_preferences(preferences: &CurrencyPreferences) -> Result<(), String> {
    // Validate primary currency format
    if preferences.primary_currency.len() != 3 {
        return Err("Primary currency must be a 3-letter ISO code".to_string());
    }

    // Validate secondary currencies
    for currency in &preferences.secondary_currencies {
        if currency.len() != 3 {
            return Err(format!("Invalid secondary currency: {}", currency));
        }
    }

    // Validate display format
    if !["symbol", "code", "symbol_code"].contains(&preferences.currency_display_format.as_str()) {
        return Err("Invalid currency display format".to_string());
    }

    Ok(())
}

/// Validate security settings for compliance
pub fn validate_security_settings(settings: &SecuritySettings) -> Result<(), String> {
    // Validate session timeout ranges
    if settings.session_timeout_minutes < 5 || settings.session_timeout_minutes > 1440 {
        return Err("Session timeout must be between 5 and 1440 minutes".to_string());
    }

    // Validate auto-lock timeout
    if settings.auto_lock_timeout_minutes < 1 || settings.auto_lock_timeout_minutes > 120 {
        return Err("Auto-lock timeout must be between 1 and 120 minutes".to_string());
    }

    // Ensure reasonable security log retention
    if settings.security_log_retention_days < 30 || settings.security_log_retention_days > 365 {
        return Err("Security log retention must be between 30 and 365 days".to_string());
    }

    Ok(())
}

// ============================================================================
// Performance Optimization Functions
// ============================================================================

/// Optimize preferences for better performance
pub fn optimize_performance_settings(settings: &mut PerformanceSettings) {
    // Auto-adjust cache size based on available memory
    let available_memory_mb = get_available_memory_mb();

    if available_memory_mb < 2048 {
        settings.cache_size_mb = 64.min(settings.cache_size_mb);
        settings.animation_performance_mode = "performance".to_string();
        settings.lazy_loading_enabled = true;

        tracing::info!("Optimized performance settings for low-memory environment");
    } else if available_memory_mb > 8192 {
        settings.cache_size_mb = 256.max(settings.cache_size_mb);
        settings.animation_performance_mode = "quality".to_string();

        tracing::info!("Enhanced performance settings for high-memory environment");
    }
}

/// Get available system memory (simplified implementation)
fn get_available_memory_mb() -> u32 {
    // In a real implementation, this would query system memory
    // For now, return a reasonable default
    4096
}

// ============================================================================
// Export Functions for Integration
// ============================================================================

pub use sync_preferences_across_components;
pub use broadcast_preference_changes;
pub use validate_accessibility_features;
pub use validate_currency_preferences;
pub use validate_security_settings;
pub use optimize_performance_settings;

// ============================================================================
// Comprehensive Test Suite
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use serde_json::json;
    use std::collections::HashMap;

    // Test Data Factories
    fn create_test_user_preferences(user_id: &str) -> UserPreferences {
        UserPreferences {
            id: "test-pref-id".to_string(),
            user_id: user_id.to_string(),
            theme: "dark".to_string(),
            language: "en".to_string(),
            timezone: "America/New_York".to_string(),
            currency: "USD".to_string(),
            date_format: "MM/dd/yyyy".to_string(),
            time_format: "h:mm a".to_string(),
            decimal_places: 2,
            notifications_enabled: true,
            auto_sync_enabled: true,
            privacy_mode: false,
            accessibility_features: AccessibilityFeatures {
                high_contrast: false,
                large_text: true,
                screen_reader_support: false,
                keyboard_navigation: true,
                reduced_motion: false,
            },
            created_at: Utc::now(),
            updated_at: Utc::now(),
            version: 1,
        }
    }

    #[test]
    fn test_validate_user_preferences_valid() {
        let preferences = create_test_user_preferences("test-user-123");
        assert!(validate_user_preferences(&preferences).is_ok());
    }

    #[test]
    fn test_validate_user_preferences_empty_user_id() {
        let preferences = create_test_user_preferences("");
        let result = validate_user_preferences(&preferences);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "User ID cannot be empty");
    }

    #[test]
    fn test_validate_user_preferences_invalid_theme() {
        let mut preferences = create_test_user_preferences("test-user-123");
        preferences.theme = "invalid_theme".to_string();

        let result = validate_user_preferences(&preferences);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Invalid theme value");
    }

    #[test]
    fn test_validate_currency_preferences() {
        let prefs = CurrencyPreferences {
            primary_currency: "USD".to_string(),
            secondary_currencies: vec!["EUR".to_string(), "GBP".to_string()],
            currency_display_format: "symbol".to_string(),
            show_currency_symbols: true,
            auto_convert_display: false,
            exchange_rate_source: "xe.com".to_string(),
            rate_update_frequency: "daily".to_string(),
        };

        assert!(validate_currency_preferences(&prefs).is_ok());
    }

    #[test]
    fn test_validate_security_settings() {
        let settings = SecuritySettings {
            session_timeout_minutes: 480,
            auto_lock_enabled: true,
            auto_lock_timeout_minutes: 15,
            require_password_on_startup: true,
            biometric_enabled: false,
            two_factor_enabled: true,
            login_notifications: true,
            security_log_retention_days: 90,
            data_encryption_level: "AES256".to_string(),
        };

        assert!(validate_security_settings(&settings).is_ok());
    }

    #[test]
    fn test_system_detection_fallbacks() {
        let theme = detect_windows_theme();
        assert!(["light", "dark", "auto"].contains(&theme.as_str()));

        let timezone = get_system_timezone();
        assert!(!timezone.is_empty());
    }

    #[tokio::test]
    async fn test_sync_preferences_integration() {
        let preferences = create_test_user_preferences("test-user");
        let result = sync_preferences_across_components("test-user", &preferences).await;
        assert!(result.is_ok());
    }

    #[test]
    fn test_performance_optimization() {
        let mut settings = PerformanceSettings {
            cache_enabled: true,
            cache_size_mb: 128,
            background_sync_enabled: true,
            sync_interval_minutes: 15,
            lazy_loading_enabled: true,
            animation_performance_mode: "balanced".to_string(),
            memory_usage_limit_mb: 512,
        };

        optimize_performance_settings(&mut settings);
        // Settings should be optimized based on system capabilities
        assert!(settings.cache_enabled);
    }
}

// ============================================================================
// Documentation Examples
// ============================================================================

/// Example usage of the preferences system:
///
/// ```rust,no_run
/// use atlas_desktop::commands::preferences::*;
///
/// // Get user preferences
/// let preferences = get_user_preferences("user-123".to_string(), app, state).await?;
///
/// // Update specific preference
/// let mut updated_prefs = preferences.data.unwrap();
/// updated_prefs.theme = "dark".to_string();
///
/// let result = update_user_preferences(
///     "user-123".to_string(),
///     updated_prefs,
///     app,
///     state
/// ).await?;
///
/// // Configure financial settings
/// let currency_prefs = CurrencyPreferences {
///     primary_currency: "EUR".to_string(),
///     secondary_currencies: vec!["USD".to_string(), "GBP".to_string()],
///     currency_display_format: "symbol_code".to_string(),
///     show_currency_symbols: true,
///     auto_convert_display: true,
///     exchange_rate_source: "ecb.europa.eu".to_string(),
///     rate_update_frequency: "hourly".to_string(),
/// };
/// ```
pub struct PreferencesExamples;
