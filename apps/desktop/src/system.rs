// System Information and Utilities Module for Atlas Desktop
// System monitoring and desktop integration capabilities

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use crate::AppState;
use super::commands::{CommandResponse, send_desktop_notification};

// ============================================================================
// System Information Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub os: String,
    pub os_version: String,
    pub arch: String,
    pub hostname: String,
    pub uptime_seconds: u64,
    pub memory: MemoryInfo,
    pub cpu: CpuInfo,
    pub disk: Vec<DiskInfo>,
    pub network: NetworkInfo,
    pub atlas_info: AtlasInfo,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryInfo {
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub used_bytes: u64,
    pub usage_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuInfo {
    pub brand: String,
    pub cores: u32,
    pub frequency_mhz: u64,
    pub usage_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub used_bytes: u64,
    pub usage_percentage: f64,
    pub file_system: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInfo {
    pub interfaces: Vec<NetworkInterface>,
    pub is_connected: bool,
    pub connection_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInterface {
    pub name: String,
    pub is_up: bool,
    pub is_loopback: bool,
    pub mac_address: Option<String>,
    pub ip_addresses: Vec<String>,
    pub bytes_sent: u64,
    pub bytes_received: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasInfo {
    pub version: String,
    pub build_date: String,
    pub commit_hash: String,
    pub rust_version: String,
    pub tauri_version: String,
    pub data_directory: String,
    pub config_directory: String,
    pub log_directory: String,
    pub database_status: DatabaseStatus,
    pub service_status: ServiceStatus,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseStatus {
    pub connected: bool,
    pub version: String,
    pub pool_size: u32,
    pub active_connections: u32,
    pub last_health_check: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceStatus {
    pub financial_engine: ServiceHealth,
    pub ai_engine: ServiceHealth,
    pub supertokens: ServiceHealth,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceHealth {
    pub status: HealthStatus,
    pub response_time_ms: Option<u64>,
    pub last_check: DateTime<Utc>,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
    Unknown,
}

// ============================================================================
// Update Information Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub release_notes: Option<String>,
    pub download_url: Option<String>,
    pub size_bytes: Option<u64>,
    pub release_date: Option<DateTime<Utc>>,
    pub is_critical: bool,
    pub auto_update_enabled: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProgress {
    pub stage: UpdateStage,
    pub progress_percentage: f64,
    pub message: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdateStage {
    Checking,
    Downloading,
    Installing,
    Completed,
    Failed,
}

// ============================================================================
// Performance Monitoring Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceMetrics {
    pub timestamp: DateTime<Utc>,
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub disk_io: DiskIoMetrics,
    pub network_io: NetworkIoMetrics,
    pub application_metrics: ApplicationMetrics,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskIoMetrics {
    pub read_bytes_per_sec: u64,
    pub write_bytes_per_sec: u64,
    pub operations_per_sec: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkIoMetrics {
    pub bytes_received_per_sec: u64,
    pub bytes_sent_per_sec: u64,
    pub packets_received_per_sec: u64,
    pub packets_sent_per_sec: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationMetrics {
    pub memory_usage_mb: f64,
    pub heap_size_mb: f64,
    pub thread_count: u32,
    pub database_connections: u32,
    pub cache_hit_ratio: f64,
    pub average_response_time_ms: f64,
    pub error_rate: f64,
}

// ============================================================================
// System Commands
// ============================================================================

/// Get comprehensive system information
#[tauri::command]
pub async fn get_system_info(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<SystemInfo>, tauri::Error> {
    tracing::info!("Collecting system information");

    match collect_system_info(&state).await {
        Ok(system_info) => {
            tracing::info!("Successfully collected system information");
            Ok(CommandResponse::success(system_info))
        }
        Err(e) => {
            tracing::error!("Failed to collect system information: {}", e);
            Ok(CommandResponse::error(format!("Failed to collect system information: {}", e)))
        }
    }
}

/// Check for application updates
#[tauri::command]
pub async fn check_for_updates(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<UpdateInfo>, tauri::Error> {
    tracing::info!("Checking for application updates");

    match check_application_updates(&app).await {
        Ok(update_info) => {
            if update_info.available {
                if update_info.is_critical {
                    let _ = send_desktop_notification(
                        &app,
                        "Critical Update Available",
                        &format!("Atlas Financial {} is available with critical fixes.",
                                update_info.latest_version.as_deref().unwrap_or("unknown")),
                    ).await;
                } else {
                    let _ = send_desktop_notification(
                        &app,
                        "Update Available",
                        &format!("Atlas Financial {} is available for download.",
                                update_info.latest_version.as_deref().unwrap_or("unknown")),
                    ).await;
                }
            }

            tracing::info!("Update check completed: available={}", update_info.available);
            Ok(CommandResponse::success(update_info))
        }
        Err(e) => {
            tracing::error!("Failed to check for updates: {}", e);
            Ok(CommandResponse::error(format!("Failed to check for updates: {}", e)))
        }
    }
}

/// Get current performance metrics
#[tauri::command]
pub async fn get_performance_metrics(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<PerformanceMetrics>, tauri::Error> {
    tracing::info!("Collecting performance metrics");

    match collect_performance_metrics(&state).await {
        Ok(metrics) => {
            // Alert if performance is degraded
            if metrics.cpu_usage > 80.0 || metrics.memory_usage > 90.0 {
                let _ = send_desktop_notification(
                    &app,
                    "Performance Alert",
                    &format!("High resource usage detected: CPU {:.1}%, Memory {:.1}%",
                            metrics.cpu_usage, metrics.memory_usage),
                ).await;
            }

            tracing::info!("Successfully collected performance metrics");
            Ok(CommandResponse::success(metrics))
        }
        Err(e) => {
            tracing::error!("Failed to collect performance metrics: {}", e);
            Ok(CommandResponse::error(format!("Failed to collect performance metrics: {}", e)))
        }
    }
}

/// Get system health status
#[tauri::command]
pub async fn get_system_health(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<HashMap<String, HealthStatus>>, tauri::Error> {
    tracing::info!("Checking system health");

    match check_system_health(&state).await {
        Ok(health_status) => {
            // Check for unhealthy services
            let unhealthy_services: Vec<&String> = health_status
                .iter()
                .filter(|(_, status)| matches!(status, HealthStatus::Unhealthy))
                .map(|(name, _)| name)
                .collect();

            if !unhealthy_services.is_empty() {
                let _ = send_desktop_notification(
                    &app,
                    "Service Health Alert",
                    &format!("Unhealthy services detected: {}", unhealthy_services.join(", ")),
                ).await;
            }

            tracing::info!("System health check completed");
            Ok(CommandResponse::success(health_status))
        }
        Err(e) => {
            tracing::error!("Failed to check system health: {}", e);
            Ok(CommandResponse::error(format!("Failed to check system health: {}", e)))
        }
    }
}

/// Clear application cache
#[tauri::command]
pub async fn clear_cache(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<u64>, tauri::Error> {
    tracing::info!("Clearing application cache");

    match clear_application_cache(&app, &state).await {
        Ok(bytes_cleared) => {
            let _ = send_desktop_notification(
                &app,
                "Cache Cleared",
                &format!("Cleared {:.2} MB of cached data", bytes_cleared as f64 / 1024.0 / 1024.0),
            ).await;

            tracing::info!("Successfully cleared {} bytes of cache", bytes_cleared);
            Ok(CommandResponse::success(bytes_cleared))
        }
        Err(e) => {
            tracing::error!("Failed to clear cache: {}", e);
            Ok(CommandResponse::error(format!("Failed to clear cache: {}", e)))
        }
    }
}

/// Export system diagnostic information
#[tauri::command]
pub async fn export_diagnostics(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<String>, tauri::Error> {
    tracing::info!("Exporting system diagnostics");

    use crate::commands::desktop_utils;

    // Show save file dialog
    let default_filename = format!("atlas_diagnostics_{}.json",
                                   Utc::now().format("%Y%m%d_%H%M%S"));

    let filters = vec![
        ("JSON Files", &["json"]),
        ("All Files", &["*"]),
    ];

    match desktop_utils::save_file_dialog(
        &app,
        "Export System Diagnostics",
        &default_filename,
        filters,
    ).await {
        Ok(Some(file_path)) => {
            match export_diagnostic_data(&file_path, &state).await {
                Ok(_) => {
                    let _ = send_desktop_notification(
                        &app,
                        "Diagnostics Exported",
                        &format!("System diagnostics exported to: {}", file_path),
                    ).await;

                    tracing::info!("Successfully exported diagnostics to: {}", file_path);
                    Ok(CommandResponse::success(file_path))
                }
                Err(e) => {
                    tracing::error!("Failed to export diagnostics: {}", e);
                    Ok(CommandResponse::error(format!("Failed to export diagnostics: {}", e)))
                }
            }
        }
        Ok(None) => {
            tracing::info!("Diagnostics export cancelled by user");
            Ok(CommandResponse::error("Export cancelled"))
        }
        Err(e) => {
            tracing::error!("Failed to show save dialog: {}", e);
            Ok(CommandResponse::error(format!("Failed to show save dialog: {}", e)))
        }
    }
}

// ============================================================================
// Internal Implementation Functions
// ============================================================================

async fn collect_system_info(state: &State<'_, AppState>) -> Result<SystemInfo, Box<dyn std::error::Error>> {
    let timestamp = Utc::now();

    // This is a placeholder implementation
    // In a real implementation, you would use system information crates like:
    // - sysinfo for system metrics
    // - whoami for user/hostname info
    // - sys-info for basic system information

    let system_info = SystemInfo {
        os: std::env::consts::OS.to_string(),
        os_version: "Unknown".to_string(),
        arch: std::env::consts::ARCH.to_string(),
        hostname: "localhost".to_string(),
        uptime_seconds: 0,
        memory: MemoryInfo {
            total_bytes: 0,
            available_bytes: 0,
            used_bytes: 0,
            usage_percentage: 0.0,
        },
        cpu: CpuInfo {
            brand: "Unknown".to_string(),
            cores: 0,
            frequency_mhz: 0,
            usage_percentage: 0.0,
        },
        disk: vec![],
        network: NetworkInfo {
            interfaces: vec![],
            is_connected: true,
            connection_type: "Unknown".to_string(),
        },
        atlas_info: AtlasInfo {
            version: env!("CARGO_PKG_VERSION").to_string(),
            build_date: "Unknown".to_string(),
            commit_hash: "Unknown".to_string(),
            rust_version: "Unknown".to_string(),
            tauri_version: "2.7".to_string(),
            data_directory: "Unknown".to_string(),
            config_directory: "Unknown".to_string(),
            log_directory: "Unknown".to_string(),
            database_status: DatabaseStatus {
                connected: true,
                version: "Unknown".to_string(),
                pool_size: 0,
                active_connections: 0,
                last_health_check: timestamp,
            },
            service_status: ServiceStatus {
                financial_engine: ServiceHealth {
                    status: HealthStatus::Unknown,
                    response_time_ms: None,
                    last_check: timestamp,
                    error_message: None,
                },
                ai_engine: ServiceHealth {
                    status: HealthStatus::Unknown,
                    response_time_ms: None,
                    last_check: timestamp,
                    error_message: None,
                },
                supertokens: ServiceHealth {
                    status: HealthStatus::Unknown,
                    response_time_ms: None,
                    last_check: timestamp,
                    error_message: None,
                },
            },
        },
        timestamp,
    };

    Ok(system_info)
}

async fn check_application_updates(app: &AppHandle) -> Result<UpdateInfo, Box<dyn std::error::Error>> {
    // This would integrate with Tauri's updater plugin
    // For now, return a placeholder

    let current_version = env!("CARGO_PKG_VERSION").to_string();

    Ok(UpdateInfo {
        available: false,
        current_version,
        latest_version: None,
        release_notes: None,
        download_url: None,
        size_bytes: None,
        release_date: None,
        is_critical: false,
        auto_update_enabled: false,
    })
}

async fn collect_performance_metrics(state: &State<'_, AppState>) -> Result<PerformanceMetrics, Box<dyn std::error::Error>> {
    let timestamp = Utc::now();

    // Placeholder implementation
    // Real implementation would collect actual system metrics

    Ok(PerformanceMetrics {
        timestamp,
        cpu_usage: 0.0,
        memory_usage: 0.0,
        disk_io: DiskIoMetrics {
            read_bytes_per_sec: 0,
            write_bytes_per_sec: 0,
            operations_per_sec: 0,
        },
        network_io: NetworkIoMetrics {
            bytes_received_per_sec: 0,
            bytes_sent_per_sec: 0,
            packets_received_per_sec: 0,
            packets_sent_per_sec: 0,
        },
        application_metrics: ApplicationMetrics {
            memory_usage_mb: 0.0,
            heap_size_mb: 0.0,
            thread_count: 0,
            database_connections: 0,
            cache_hit_ratio: 0.0,
            average_response_time_ms: 0.0,
            error_rate: 0.0,
        },
    })
}

async fn check_system_health(state: &State<'_, AppState>) -> Result<HashMap<String, HealthStatus>, Box<dyn std::error::Error>> {
    let mut health_status = HashMap::new();

    // Check database health
    match state.database.health_check().await {
        Ok(_) => {
            health_status.insert("database".to_string(), HealthStatus::Healthy);
        }
        Err(_) => {
            health_status.insert("database".to_string(), HealthStatus::Unhealthy);
        }
    }

    // Check financial engine health
    match state.financial_engine.health_check().await {
        Ok(_) => {
            health_status.insert("financial_engine".to_string(), HealthStatus::Healthy);
        }
        Err(_) => {
            health_status.insert("financial_engine".to_string(), HealthStatus::Unhealthy);
        }
    }

    // Add more health checks as needed
    health_status.insert("application".to_string(), HealthStatus::Healthy);

    Ok(health_status)
}

async fn clear_application_cache(
    app: &AppHandle,
    state: &State<'_, AppState>,
) -> Result<u64, Box<dyn std::error::Error>> {
    // Clear various caches
    let mut bytes_cleared = 0u64;

    // Clear financial engine cache
    // This would require implementing cache clearing in the financial engine

    // Clear any temporary files
    let app_data_dir = app.path().app_data_dir()?;
    let cache_dir = app_data_dir.join("cache");

    if cache_dir.exists() {
        // Calculate size before clearing
        bytes_cleared = calculate_directory_size(&cache_dir)?;

        // Remove cache directory
        std::fs::remove_dir_all(&cache_dir)?;

        // Recreate empty cache directory
        std::fs::create_dir_all(&cache_dir)?;
    }

    Ok(bytes_cleared)
}

async fn export_diagnostic_data(
    file_path: &str,
    state: &State<'_, AppState>,
) -> Result<(), Box<dyn std::error::Error>> {
    // Collect comprehensive diagnostic information
    let system_info = collect_system_info(state).await?;
    let performance_metrics = collect_performance_metrics(state).await?;
    let health_status = check_system_health(state).await?;

    let diagnostic_data = serde_json::json!({
        "timestamp": Utc::now(),
        "system_info": system_info,
        "performance_metrics": performance_metrics,
        "health_status": health_status,
        "version": env!("CARGO_PKG_VERSION"),
    });

    // Write to file
    let json_content = serde_json::to_string_pretty(&diagnostic_data)?;
    std::fs::write(file_path, json_content)?;

    Ok(())
}

fn calculate_directory_size(dir: &std::path::Path) -> Result<u64, Box<dyn std::error::Error>> {
    let mut total_size = 0u64;

    if dir.is_dir() {
        for entry in std::fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                total_size += calculate_directory_size(&path)?;
            } else {
                total_size += entry.metadata()?.len();
            }
        }
    }

    Ok(total_size)
}

// ============================================================================
// System Monitoring Background Task
// ============================================================================

/// Background system monitoring task
pub struct SystemMonitor {
    is_running: std::sync::Arc<std::sync::atomic::AtomicBool>,
    metrics_history: std::sync::Arc<parking_lot::Mutex<Vec<PerformanceMetrics>>>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        Self {
            is_running: std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false)),
            metrics_history: std::sync::Arc::new(parking_lot::Mutex::new(Vec::new())),
        }
    }

    pub fn start(&self, app_handle: AppHandle, state: std::sync::Arc<AppState>) {
        if self.is_running.load(std::sync::atomic::Ordering::Relaxed) {
            return;
        }

        self.is_running.store(true, std::sync::atomic::Ordering::Relaxed);

        let is_running = self.is_running.clone();
        let metrics_history = self.metrics_history.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));

            while is_running.load(std::sync::atomic::Ordering::Relaxed) {
                interval.tick().await;

                // Collect metrics
                if let Ok(metrics) = collect_performance_metrics(&state.into()).await {
                    // Store in history (keep last 100 entries)
                    {
                        let mut history = metrics_history.lock();
                        history.push(metrics);
                        if history.len() > 100 {
                            history.remove(0);
                        }
                    }

                    // Emit event to frontend if needed
                    let _ = app_handle.emit("system_metrics", &metrics);
                }
            }
        });
    }

    pub fn stop(&self) {
        self.is_running.store(false, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn get_metrics_history(&self) -> Vec<PerformanceMetrics> {
        self.metrics_history.lock().clone()
    }
}

impl Default for SystemMonitor {
    fn default() -> Self {
        Self::new()
    }
}
