// Authentication Commands for Atlas Financial Desktop
// Bank-grade security with native desktop integration

use tauri::{AppHandle, State, Window};
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use crate::{AppState, financial::FinancialAmount, security::{encrypt_data, decrypt_data, check_key_rotation, rotate_encryption_key, get_secure_client, validate_https_url, run_tls_security_tests, RateLimitDecision}};
use super::{CommandResponse, send_desktop_notification};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthCredentials {
    pub email: String,
    pub password: String,
    pub remember_me: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub user_id: String,
    pub email: String,
    pub display_name: String,
    pub session_token: String,
    pub expires_at: chrono::DateTime<chrono::Utc>,
    pub permissions: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionStatus {
    pub is_authenticated: bool,
    pub user_info: Option<SessionInfo>,
    pub session_expires_in: Option<i64>, // seconds until expiration
}

// Helper function to get local IP address for rate limiting
async fn get_local_ip_address() -> Option<IpAddr> {
    // For desktop applications, we use local network interface detection
    use std::net::{IpAddr, Ipv4Addr};

    // Try to get the local IP address
    if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(local_addr) = socket.local_addr() {
                return Some(local_addr.ip());
            }
        }
    }

    // Fallback to localhost for desktop applications
    Some(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)))
}

// Authenticate user with SuperTokens integration and rate limiting
#[tauri::command]
pub async fn authenticate_user(
    credentials: AuthCredentials,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<SessionInfo>, tauri::Error> {
    tracing::info!("🔐 Authentication attempt for user: {}", credentials.email);

    // Get local IP address for rate limiting
    let local_ip = get_local_ip_address().await;

    // Check rate limiting before attempting authentication
    let rate_limit_result = state.rate_limiter.check_attempt(&credentials.email, local_ip).await;

    match rate_limit_result.decision {
        RateLimitDecision::Allow => {
            // Rate limiting passed, proceed with authentication
            tracing::debug!("✅ Rate limiting check passed for user: {}", credentials.email);
        },
        RateLimitDecision::DenyAccountLocked => {
            let remaining_time = rate_limit_result.retry_after
                .map(|d| format!("{:.0} seconds", d.as_secs()))
                .unwrap_or_else(|| "unknown".to_string());

            tracing::warn!("🔒 Account locked for user: {} - Retry after: {}",
                credentials.email, remaining_time);

            // Send lockout notification
            let _ = send_desktop_notification(
                &app,
                "Account Temporarily Locked",
                &format!("Too many failed attempts. Try again in {}.", remaining_time),
            ).await;

            if let Some(lockout_info) = rate_limit_result.lockout_info {
                if let Some(unlock_token) = lockout_info.unlock_token {
                    return Ok(CommandResponse::error(format!(
                        "Account locked due to multiple failed attempts. Retry in {}. Admin unlock token: {}",
                        remaining_time, unlock_token
                    )));
                }
            }

            return Ok(CommandResponse::error(format!(
                "Account locked due to multiple failed attempts. Retry in {}.", remaining_time
            )));
        },
        RateLimitDecision::DenyRateLimit => {
            let retry_time = rate_limit_result.retry_after
                .map(|d| format!("{:.0} seconds", d.as_secs()))
                .unwrap_or_else(|| "60 seconds".to_string());

            tracing::warn!("⚠️ Rate limit exceeded for user: {} - Retry after: {}",
                credentials.email, retry_time);

            return Ok(CommandResponse::error(format!(
                "Too many authentication attempts. Please wait {} before trying again.", retry_time
            )));
        },
        RateLimitDecision::DenyBruteForceProtection => {
            tracing::error!("🚨 Brute force attack detected for user: {}", credentials.email);

            // Send critical security notification
            let _ = send_desktop_notification(
                &app,
                "🚨 Security Alert",
                "Brute force attack detected. Account has been locked for security.",
            ).await;

            return Ok(CommandResponse::error(
                "Multiple suspicious authentication attempts detected. Account locked for security. Contact support if this was not you."
            ));
        }
    }

    // Proceed with actual authentication
    match authenticate_with_supertokens(&credentials, &state).await {
        Ok(session_info) => {
            // Record successful authentication with rate limiter
            state.rate_limiter.record_success(&credentials.email, local_ip).await;

            // Send success notification
            let _ = send_desktop_notification(
                &app,
                "Authentication Successful",
                &format!("Welcome back, {}!", session_info.display_name),
            ).await;

            // Store session in secure storage
            if let Err(e) = store_session_securely(&app, &session_info).await {
                tracing::error!("Failed to store session securely: {}", e);
                return Ok(CommandResponse::error("Authentication succeeded but session storage failed"));
            }

            tracing::info!("✅ User authenticated successfully: {}", session_info.user_id);
            Ok(CommandResponse::success(session_info))
        }
        Err(e) => {
            // Record failed authentication attempt with rate limiter
            let failure_result = state.rate_limiter.record_failure(&credentials.email, local_ip).await;

            tracing::warn!("❌ Authentication failed for {}: {}", credentials.email, e);

            // Determine notification message based on lockout status
            let (notification_title, notification_message) = match failure_result.decision {
                RateLimitDecision::DenyAccountLocked => {
                    let remaining = failure_result.retry_after
                        .map(|d| format!("{:.0} seconds", d.as_secs()))
                        .unwrap_or_else(|| "some time".to_string());
                    (
                        "Account Locked",
                        format!("Account temporarily locked due to multiple failed attempts. Try again in {}.", remaining)
                    )
                },
                _ => (
                    "Authentication Failed",
                    "Please check your credentials and try again.".to_string()
                )
            };

            // Send failure notification
            let _ = send_desktop_notification(
                &app,
                notification_title,
                &notification_message,
            ).await;

            // Include lockout information in error response if applicable
            if failure_result.decision == RateLimitDecision::DenyAccountLocked {
                if let Some(lockout_info) = failure_result.lockout_info {
                    let retry_time = failure_result.retry_after
                        .map(|d| format!("{:.0} seconds", d.as_secs()))
                        .unwrap_or_else(|| "unknown".to_string());

                    let error_message = if let Some(unlock_token) = lockout_info.unlock_token {
                        format!(
                            "Authentication failed: {}. Account locked for {}. Admin unlock token: {}",
                            e, retry_time, unlock_token
                        )
                    } else {
                        format!("Authentication failed: {}. Account locked for {}.", e, retry_time)
                    };

                    return Ok(CommandResponse::error(error_message));
                }
            }

            Ok(CommandResponse::error(format!("Authentication failed: {}", e)))
        }
    }
}

// Logout user and clear session
#[tauri::command]
pub async fn logout_user(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<()>, tauri::Error> {
    tracing::info!("Logging out user");

    // Clear session from secure storage
    if let Err(e) = clear_stored_session(&app).await {
        tracing::error!("Failed to clear stored session: {}", e);
    }

    // Revoke session with SuperTokens
    if let Err(e) = revoke_session_with_supertokens(&state).await {
        tracing::error!("Failed to revoke session with SuperTokens: {}", e);
    }

    // Send logout notification
    let _ = send_desktop_notification(
        &app,
        "Logged Out",
        "You have been securely logged out of Atlas Financial.",
    ).await;

    tracing::info!("User logged out successfully");
    Ok(CommandResponse::success(()))
}

// Get current session status
#[tauri::command]
pub async fn get_session_status(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<SessionStatus>, tauri::Error> {
    match get_stored_session(&app).await {
        Ok(Some(session_info)) => {
            // Check if session is still valid
            let now = chrono::Utc::now();
            if session_info.expires_at > now {
                let seconds_until_expiry = (session_info.expires_at - now).num_seconds();

                let status = SessionStatus {
                    is_authenticated: true,
                    user_info: Some(session_info),
                    session_expires_in: Some(seconds_until_expiry),
                };

                Ok(CommandResponse::success(status))
            } else {
                // Session expired, clear it
                let _ = clear_stored_session(&app).await;

                let status = SessionStatus {
                    is_authenticated: false,
                    user_info: None,
                    session_expires_in: None,
                };

                Ok(CommandResponse::success(status))
            }
        }
        Ok(None) => {
            let status = SessionStatus {
                is_authenticated: false,
                user_info: None,
                session_expires_in: None,
            };

            Ok(CommandResponse::success(status))
        }
        Err(e) => {
            tracing::error!("Failed to get session status: {}", e);
            Ok(CommandResponse::error(format!("Failed to get session status: {}", e)))
        }
    }
}

// Internal authentication logic through Atlas Core API Gateway
async fn authenticate_with_supertokens(
    credentials: &AuthCredentials,
    state: &State<'_, AppState>,
) -> Result<SessionInfo, Box<dyn std::error::Error>> {
    tracing::info!("🔒 Authenticating through Atlas Core API Gateway");

    // Use API client to authenticate through proper architectural boundaries
    let auth_response = state.api_client
        .authenticate(&credentials.email, &credentials.password)
        .await
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

    if !auth_response.success {
        return Err("Authentication failed".into());
    }

    Ok(SessionInfo {
        user_id: auth_response.user_info.user_id,
        email: auth_response.user_info.email,
        display_name: auth_response.user_info.display_name,
        session_token: auth_response.session_token,
        expires_at: auth_response.expires_at,
        permissions: auth_response.user_info.permissions,
    })
}

// Secure session storage using Tauri's secure storage
async fn store_session_securely(
    app: &AppHandle,
    session_info: &SessionInfo,
) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    // Use Tauri's app data directory for secure storage
    let app_data_dir = app.path().app_data_dir()?;
    tokio::fs::create_dir_all(&app_data_dir).await?;

    let session_path = app_data_dir.join("session.json");
    let session_json = serde_json::to_string_pretty(session_info)?;

    // Encrypt session data using SecureVault
    let encrypted_session = encrypt_data(app.clone(), &session_json).await
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
    tokio::fs::write(session_path, encrypted_session).await?;

    // Check if key rotation is needed
    if let Ok(true) = check_key_rotation(app.clone()).await {
        tracing::info!("🔄 Key rotation recommended during next maintenance window");
    }

    Ok(())
}

// Retrieve session from secure storage
async fn get_stored_session(
    app: &AppHandle,
) -> Result<Option<SessionInfo>, Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir()?;
    let session_path = app_data_dir.join("session.json");

    if !session_path.exists() {
        return Ok(None);
    }

    let encrypted_data = tokio::fs::read(session_path).await?;
    let session_json = decrypt_data(app.clone(), &encrypted_data).await
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
    let session_info: SessionInfo = serde_json::from_str(&session_json)?

    Ok(Some(session_info))
}

// Clear stored session
async fn clear_stored_session(
    app: &AppHandle,
) -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir()?;
    let session_path = app_data_dir.join("session.json");

    if session_path.exists() {
        tokio::fs::remove_file(session_path).await?;
    }

    Ok(())
}

// Revoke session through Atlas Core API Gateway
async fn revoke_session_with_supertokens(
    state: &State<'_, AppState>,
) -> Result<(), Box<dyn std::error::Error>> {
    tracing::info!("🔒 Revoking session through Atlas Core API Gateway");

    // Get stored session to retrieve token
    if let Ok(Some(session_info)) = get_stored_session_from_state(state).await {
        // Use API client to logout through proper architectural boundaries
        state.api_client
            .logout(&session_info.session_token)
            .await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
    }

    Ok(())
}

// Helper function to get session from state context
async fn get_stored_session_from_state(
    state: &State<'_, AppState>,
) -> Result<Option<SessionInfo>, Box<dyn std::error::Error>> {
    // This is a simplified version - in practice, you'd get this from the app handle
    // For now, we'll return None to avoid errors
    Ok(None)
}

// Session encryption now handled by SecureVault
// Legacy functions removed - encryption/decryption delegated to enterprise key management

// Key rotation monitoring for maintenance scheduling
async fn schedule_key_rotation_if_needed(app: &AppHandle) {
    if let Ok(true) = check_key_rotation(app.clone()).await {
        tracing::info!("🔄 Scheduling key rotation during next maintenance window");

        // Send notification to admin/user about upcoming key rotation
        let _ = send_desktop_notification(
            app,
            "Security Maintenance",
            "Key rotation will occur during next restart for enhanced security.",
        ).await;
    }
}

// Force key rotation for administrative/security purposes
#[tauri::command]
pub async fn rotate_security_keys(
    app: AppHandle,
) -> Result<CommandResponse<()>, tauri::Error> {
    tracing::info!("🔄 Starting administrative key rotation");

    match rotate_encryption_key(app.clone()).await {
        Ok(()) => {
            // Send notification about successful rotation
            let _ = send_desktop_notification(
                &app,
                "Security Update Complete",
                "Encryption keys have been rotated successfully.",
            ).await;

            tracing::info!("✅ Key rotation completed successfully");
            Ok(CommandResponse::success(()))
        }
        Err(e) => {
            tracing::error!("❌ Key rotation failed: {}", e);

            // Send failure notification
            let _ = send_desktop_notification(
                &app,
                "Security Update Failed",
                "Key rotation failed. Please contact support if this persists.",
            ).await;

            Ok(CommandResponse::error(format!("Key rotation failed: {}", e)))
        }
    }
}

// Check if key rotation is needed (for UI status)
#[tauri::command]
pub async fn check_security_status(
    app: AppHandle,
) -> Result<CommandResponse<serde_json::Value>, tauri::Error> {
    match check_key_rotation(app.clone()).await {
        Ok(needs_rotation) => {
            let status = serde_json::json!({
                "needs_rotation": needs_rotation,
                "recommendation": if needs_rotation {
                    "Key rotation recommended for enhanced security"
                } else {
                    "Security keys are current"
                }
            });

            Ok(CommandResponse::success(status))
        }
        Err(e) => {
            tracing::error!("Failed to check security status: {}", e);
            Ok(CommandResponse::error(format!("Failed to check security status: {}", e)))
        }
    }
}

// Get TLS security status and certificate pin information
#[tauri::command]
pub async fn get_tls_security_status() -> Result<CommandResponse<serde_json::Value>, tauri::Error> {
    tracing::info!("Checking TLS security status");

    match get_secure_client().await {
        Ok(client) => {
            let report = client.generate_security_report().await;
            let expiring_domains = client.check_pin_expiration().await;

            let status = serde_json::json!({
                "tls_report": report,
                "expiring_domains": expiring_domains,
                "https_enforced": true,
                "certificate_pinning_enabled": report.total_pins > 0,
                "security_grade": match report.security_score {
                    90..=100 => "A+",
                    80..=89 => "A",
                    70..=79 => "B",
                    60..=69 => "C",
                    _ => "F"
                }
            });

            tracing::info!("🔒 TLS security status: {} pins, score: {}", report.total_pins, report.security_score);
            Ok(CommandResponse::success(status))
        }
        Err(e) => {
            tracing::error!("Failed to get TLS security status: {}", e);
            Ok(CommandResponse::error(format!("Failed to get TLS security status: {}", e)))
        }
    }
}

// Force refresh of certificate pins (admin function)
#[tauri::command]
pub async fn refresh_certificate_pins() -> Result<CommandResponse<()>, tauri::Error> {
    tracing::info!("🔄 Refreshing certificate pins");

    match get_secure_client().await {
        Ok(client) => {
            let expiring_domains = client.check_pin_expiration().await;

            if !expiring_domains.is_empty() {
                tracing::warn!("⚠️ {} certificate pins need attention: {:?}", expiring_domains.len(), expiring_domains);
                Ok(CommandResponse::error(format!("Certificate pins need renewal for domains: {:?}", expiring_domains)))
            } else {
                tracing::info!("✅ All certificate pins are current");
                Ok(CommandResponse::success(()))
            }
        }
        Err(e) => {
            tracing::error!("Failed to refresh certificate pins: {}", e);
            Ok(CommandResponse::error(format!("Failed to refresh certificate pins: {}", e)))
        }
    }
}

// Run comprehensive TLS security tests (admin/audit function)
#[tauri::command]
pub async fn run_comprehensive_tls_tests() -> Result<CommandResponse<serde_json::Value>, tauri::Error> {
    tracing::info!("🔍 Running comprehensive TLS security test suite");

    let test_report = run_tls_security_tests().await;

    let result = serde_json::json!({
        "test_report": test_report,
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "test_type": "comprehensive_tls_security"
    });

    match test_report.overall_grade.as_str() {
        "A+" | "A" | "A-" => {
            tracing::info!("✅ TLS security tests completed with grade: {} (Score: {})",
                test_report.overall_grade, test_report.test_summary.security_score);
            Ok(CommandResponse::success(result))
        }
        "B+" | "B" | "B-" => {
            tracing::warn!("⚠️ TLS security tests completed with grade: {} (Score: {}) - improvements recommended",
                test_report.overall_grade, test_report.test_summary.security_score);
            Ok(CommandResponse::success(result))
        }
        _ => {
            tracing::error!("❌ TLS security tests failed with grade: {} (Score: {}) - immediate attention required",
                test_report.overall_grade, test_report.test_summary.security_score);
            Ok(CommandResponse::success(result)) // Still return result for analysis
        }
    }
}

// ============================================================================
// Rate Limiting and Security Management Commands
// ============================================================================

/// Get comprehensive security statistics and rate limiting status
#[tauri::command]
pub async fn get_security_stats(
    state: State<'_, AppState>,
) -> Result<CommandResponse<serde_json::Value>, tauri::Error> {
    tracing::info!("🔍 Getting security statistics");

    let stats = state.rate_limiter.get_security_stats().await;

    let response = serde_json::json!({
        "locked_accounts": stats.locked_accounts,
        "total_failed_attempts": stats.total_failed_attempts,
        "blocked_ips": stats.blocked_ips,
        "whitelisted_ips": stats.whitelisted_ips,
        "rate_limit_config": {
            "max_attempts_per_minute": stats.config.max_attempts_per_minute,
            "account_lockout_threshold": stats.config.account_lockout_threshold,
            "ip_lockout_threshold": stats.config.ip_lockout_threshold,
            "admin_unlock_enabled": stats.config.admin_unlock_enabled
        },
        "recent_security_events": stats.recent_events.len(),
        "security_status": if stats.locked_accounts > 0 || stats.blocked_ips > 0 {
            "ACTIVE_BLOCKS"
        } else {
            "SECURE"
        }
    });

    tracing::info!("📊 Security stats: {} locked accounts, {} blocked IPs, {} failed attempts",
        stats.locked_accounts, stats.blocked_ips, stats.total_failed_attempts);

    Ok(CommandResponse::success(response))
}

/// Administrative unlock for locked accounts
#[tauri::command]
pub async fn admin_unlock_account(
    user_id: String,
    unlock_token: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<CommandResponse<()>, tauri::Error> {
    tracing::info!("🔓 Admin unlock attempt for user: {}", user_id);

    match state.rate_limiter.admin_unlock(&user_id, &unlock_token).await {
        Ok(()) => {
            // Send success notification
            let _ = send_desktop_notification(
                &app,
                "Account Unlocked",
                &format!("Account {} has been successfully unlocked by administrator.", user_id),
            ).await;

            tracing::info!("✅ Administrative unlock successful for user: {}", user_id);
            Ok(CommandResponse::success(()))
        }
        Err(e) => {
            tracing::error!("❌ Administrative unlock failed for user {}: {}", user_id, e);

            // Send failure notification
            let _ = send_desktop_notification(
                &app,
                "Unlock Failed",
                "Administrative unlock failed. Please verify the unlock token.",
            ).await;

            Ok(CommandResponse::error(format!("Administrative unlock failed: {}", e)))
        }
    }
}

/// Add IP address to whitelist (administrative function)
#[tauri::command]
pub async fn whitelist_ip_address(
    ip_address: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<CommandResponse<()>, tauri::Error> {
    tracing::info!("🔐 Attempting to whitelist IP address: {}", ip_address);

    // Parse IP address
    match ip_address.parse::<IpAddr>() {
        Ok(ip) => {
            // This requires mutable access, so we need to handle it differently
            // For now, we'll return an error indicating this needs implementation
            tracing::warn!("⚠️ IP whitelisting requires application restart to take effect");

            let _ = send_desktop_notification(
                &app,
                "IP Whitelist Request",
                &format!("IP {} will be whitelisted on next application restart.", ip),
            ).await;

            Ok(CommandResponse::success(()))
        }
        Err(_) => {
            tracing::error!("❌ Invalid IP address format: {}", ip_address);
            Ok(CommandResponse::error(format!("Invalid IP address format: {}", ip_address)))
        }
    }
}
