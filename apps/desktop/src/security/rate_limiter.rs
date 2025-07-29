// Rate Limiting and Brute Force Protection for Atlas Financial Desktop
// Bank-grade security with intelligent threat detection

use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error, debug};

/// Token bucket for rate limiting using token bucket algorithm
#[derive(Debug, Clone)]
pub struct TokenBucket {
    capacity: u32,
    tokens: u32,
    refill_rate: u32, // tokens per second
    last_refill: Instant,
}

impl TokenBucket {
    pub fn new(capacity: u32, refill_rate: u32) -> Self {
        Self {
            capacity,
            tokens: capacity,
            refill_rate,
            last_refill: Instant::now(),
        }
    }

    /// Try to consume tokens, returns true if successful
    pub fn try_consume(&mut self, tokens: u32) -> bool {
        self.refill();

        if self.tokens >= tokens {
            self.tokens -= tokens;
            true
        } else {
            false
        }
    }

    /// Refill tokens based on elapsed time
    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill);
        let tokens_to_add = (elapsed.as_secs() as u32 * self.refill_rate)
            .min(self.capacity - self.tokens);

        self.tokens += tokens_to_add;
        self.last_refill = now;
    }

    /// Get current token count
    pub fn available_tokens(&mut self) -> u32 {
        self.refill();
        self.tokens
    }
}

/// Account lockout state with exponential backoff
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountLockout {
    pub user_id: String,
    pub failed_attempts: u32,
    pub lockout_until: Option<SystemTime>,
    pub lockout_level: u32, // 0=no lockout, 1=1min, 2=5min, 3=15min, 4=1hour, 5=24hours
    pub first_failure: SystemTime,
    pub last_failure: SystemTime,
    pub unlock_token: Option<String>, // Secure unlock token for admin override
}

impl AccountLockout {
    pub fn new(user_id: String) -> Self {
        let now = SystemTime::now();
        Self {
            user_id,
            failed_attempts: 1,
            lockout_until: None,
            lockout_level: 0,
            first_failure: now,
            last_failure: now,
            unlock_token: None,
        }
    }

    /// Add a failed attempt and calculate lockout duration
    pub fn add_failure(&mut self) -> Duration {
        let now = SystemTime::now();
        self.failed_attempts += 1;
        self.last_failure = now;

        // Exponential backoff: 1min, 5min, 15min, 1hour, 24hours
        let lockout_duration = match self.failed_attempts {
            3 => {
                self.lockout_level = 1;
                Duration::from_secs(60) // 1 minute
            },
            4 => {
                self.lockout_level = 2;
                Duration::from_secs(300) // 5 minutes
            },
            5 => {
                self.lockout_level = 3;
                Duration::from_secs(900) // 15 minutes
            },
            6 => {
                self.lockout_level = 4;
                Duration::from_secs(3600) // 1 hour
            },
            _ => {
                self.lockout_level = 5;
                Duration::from_secs(86400) // 24 hours
            }
        };

        self.lockout_until = Some(now + lockout_duration);

        // Generate secure unlock token for admin override
        if self.lockout_level >= 3 {
            self.unlock_token = Some(generate_unlock_token());
        }

        lockout_duration
    }

    /// Check if account is currently locked
    pub fn is_locked(&self) -> bool {
        if let Some(lockout_until) = self.lockout_until {
            SystemTime::now() < lockout_until
        } else {
            false
        }
    }

    /// Get remaining lockout time
    pub fn remaining_lockout(&self) -> Option<Duration> {
        if let Some(lockout_until) = self.lockout_until {
            let now = SystemTime::now();
            if now < lockout_until {
                lockout_until.duration_since(now).ok()
            } else {
                None
            }
        } else {
            None
        }
    }

    /// Reset account lockout on successful authentication
    pub fn reset(&mut self) {
        self.failed_attempts = 0;
        self.lockout_until = None;
        self.lockout_level = 0;
        self.unlock_token = None;
    }
}

/// IP-based rate limiting state
#[derive(Debug, Clone)]
pub struct IpRateLimit {
    pub bucket: TokenBucket,
    pub failed_attempts: u32,
    pub last_attempt: Instant,
    pub is_whitelisted: bool,
}

impl IpRateLimit {
    pub fn new(is_whitelisted: bool) -> Self {
        // 5 attempts per minute per IP (token bucket with capacity 5, refill 1 per 12 seconds)
        Self {
            bucket: TokenBucket::new(5, 5), // 5 tokens capacity, 5 tokens per minute (1 every 12 seconds)
            failed_attempts: 0,
            last_attempt: Instant::now(),
            is_whitelisted,
        }
    }
}

/// Rate limiting configuration
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    pub max_attempts_per_minute: u32,
    pub account_lockout_threshold: u32,
    pub ip_lockout_threshold: u32,
    pub whitelist_ips: Vec<IpAddr>,
    pub admin_unlock_enabled: bool,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            max_attempts_per_minute: 5,
            account_lockout_threshold: 3,
            ip_lockout_threshold: 10,
            whitelist_ips: vec![
                "127.0.0.1".parse().unwrap(),
                "::1".parse().unwrap(),
            ],
            admin_unlock_enabled: true,
        }
    }
}

/// Comprehensive rate limiter with brute force protection
pub struct RateLimiter {
    config: RateLimitConfig,
    ip_limits: Arc<RwLock<HashMap<IpAddr, IpRateLimit>>>,
    account_lockouts: Arc<RwLock<HashMap<String, AccountLockout>>>,
    audit_log: Arc<RwLock<Vec<AuditEvent>>>,
}

/// Audit event for security logging
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEvent {
    pub timestamp: SystemTime,
    pub event_type: AuditEventType,
    pub user_id: Option<String>,
    pub ip_address: Option<IpAddr>,
    pub details: String,
    pub severity: AuditSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuditEventType {
    AuthenticationAttempt,
    AuthenticationSuccess,
    AuthenticationFailure,
    AccountLockout,
    AccountUnlock,
    RateLimitExceeded,
    BruteForceDetected,
    WhitelistBypass,
    AdminOverride,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuditSeverity {
    Info,
    Warning,
    Critical,
    Emergency,
}

/// Rate limiting decision
#[derive(Debug, PartialEq)]
pub enum RateLimitDecision {
    Allow,
    DenyRateLimit,
    DenyAccountLocked,
    DenyBruteForceProtection,
}

/// Rate limiting result with detailed information
#[derive(Debug)]
pub struct RateLimitResult {
    pub decision: RateLimitDecision,
    pub retry_after: Option<Duration>,
    pub remaining_attempts: Option<u32>,
    pub lockout_info: Option<AccountLockout>,
    pub audit_event: AuditEvent,
}

impl RateLimiter {
    /// Create new rate limiter with default configuration
    pub fn new() -> Self {
        Self::with_config(RateLimitConfig::default())
    }

    /// Create new rate limiter with custom configuration
    pub fn with_config(config: RateLimitConfig) -> Self {
        Self {
            config,
            ip_limits: Arc::new(RwLock::new(HashMap::new())),
            account_lockouts: Arc::new(RwLock::new(HashMap::new())),
            audit_log: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Check if authentication attempt is allowed (primary rate limiting function)
    pub async fn check_attempt(&self, user_id: &str, ip: Option<IpAddr>) -> RateLimitResult {
        let start_time = Instant::now();

        // Check account lockout first (fastest check)
        if let Some(lockout_result) = self.check_account_lockout(user_id).await {
            self.log_performance("check_attempt", start_time.elapsed()).await;
            return lockout_result;
        }

        // Check IP-based rate limiting if IP is available
        if let Some(ip_addr) = ip {
            if let Some(ip_result) = self.check_ip_rate_limit(ip_addr).await {
                self.log_performance("check_attempt", start_time.elapsed()).await;
                return ip_result;
            }
        }

        // If all checks pass, allow the attempt
        let audit_event = AuditEvent {
            timestamp: SystemTime::now(),
            event_type: AuditEventType::AuthenticationAttempt,
            user_id: Some(user_id.to_string()),
            ip_address: ip,
            details: "Authentication attempt allowed".to_string(),
            severity: AuditSeverity::Info,
        };

        self.log_audit_event(audit_event.clone()).await;
        self.log_performance("check_attempt", start_time.elapsed()).await;

        RateLimitResult {
            decision: RateLimitDecision::Allow,
            retry_after: None,
            remaining_attempts: Some(self.config.account_lockout_threshold),
            lockout_info: None,
            audit_event,
        }
    }

    /// Record successful authentication
    pub async fn record_success(&self, user_id: &str, ip: Option<IpAddr>) {
        let start_time = Instant::now();

        // Reset account lockout on successful authentication
        {
            let mut lockouts = self.account_lockouts.write().await;
            if let Some(lockout) = lockouts.get_mut(user_id) {
                lockout.reset();
                info!("🔓 Account lockout reset for user: {}", user_id);
            }
        }

        // Create audit event
        let audit_event = AuditEvent {
            timestamp: SystemTime::now(),
            event_type: AuditEventType::AuthenticationSuccess,
            user_id: Some(user_id.to_string()),
            ip_address: ip,
            details: "Authentication successful - lockout reset".to_string(),
            severity: AuditSeverity::Info,
        };

        self.log_audit_event(audit_event).await;
        self.log_performance("record_success", start_time.elapsed()).await;
    }

    /// Record failed authentication attempt with full protection logic
    pub async fn record_failure(&self, user_id: &str, ip: Option<IpAddr>) -> RateLimitResult {
        let start_time = Instant::now();
        let now = SystemTime::now();

        // Update account lockout state
        let mut lockouts = self.account_lockouts.write().await;
        let lockout = lockouts.entry(user_id.to_string())
            .or_insert_with(|| AccountLockout::new(user_id.to_string()));

        let lockout_duration = lockout.add_failure();
        let lockout_info = lockout.clone();

        // Update IP rate limiting if available
        if let Some(ip_addr) = ip {
            let mut ip_limits = self.ip_limits.write().await;
            let ip_limit = ip_limits.entry(ip_addr)
                .or_insert_with(|| IpRateLimit::new(self.config.whitelist_ips.contains(&ip_addr)));
            ip_limit.failed_attempts += 1;
        }

        // Determine event type and severity
        let (event_type, severity) = if lockout.failed_attempts >= 10 {
            (AuditEventType::BruteForceDetected, AuditSeverity::Emergency)
        } else if lockout.lockout_level >= 3 {
            (AuditEventType::AccountLockout, AuditSeverity::Critical)
        } else {
            (AuditEventType::AuthenticationFailure, AuditSeverity::Warning)
        };

        // Create detailed audit event
        let audit_event = AuditEvent {
            timestamp: now,
            event_type,
            user_id: Some(user_id.to_string()),
            ip_address: ip,
            details: format!(
                "Failed attempt #{} - Lockout level: {} - Duration: {:?} - Unlock token: {}",
                lockout.failed_attempts,
                lockout.lockout_level,
                lockout_duration,
                lockout.unlock_token.as_deref().unwrap_or("none")
            ),
            severity,
        };

        // Log security event
        match severity {
            AuditSeverity::Emergency => {
                error!("🚨 BRUTE FORCE DETECTED - User: {} - Attempts: {} - IP: {:?}",
                    user_id, lockout.failed_attempts, ip);
            },
            AuditSeverity::Critical => {
                warn!("🔒 ACCOUNT LOCKED - User: {} - Level: {} - Duration: {:?} - Unlock token: {}",
                    user_id, lockout.lockout_level, lockout_duration,
                    lockout.unlock_token.as_deref().unwrap_or("none"));
            },
            _ => {
                warn!("⚠️ Failed authentication - User: {} - Attempts: {}",
                    user_id, lockout.failed_attempts);
            }
        }

        self.log_audit_event(audit_event.clone()).await;
        self.log_performance("record_failure", start_time.elapsed()).await;

        RateLimitResult {
            decision: if lockout.is_locked() {
                RateLimitDecision::DenyAccountLocked
            } else {
                RateLimitDecision::Allow
            },
            retry_after: lockout.remaining_lockout(),
            remaining_attempts: Some(self.config.account_lockout_threshold.saturating_sub(lockout.failed_attempts)),
            lockout_info: Some(lockout_info),
            audit_event,
        }
    }

    /// Administrative unlock with secure token verification
    pub async fn admin_unlock(&self, user_id: &str, unlock_token: &str) -> Result<(), String> {
        let start_time = Instant::now();

        if !self.config.admin_unlock_enabled {
            return Err("Administrative unlock is disabled".to_string());
        }

        let mut lockouts = self.account_lockouts.write().await;
        if let Some(lockout) = lockouts.get_mut(user_id) {
            if let Some(ref stored_token) = lockout.unlock_token {
                if stored_token == unlock_token {
                    lockout.reset();

                    let audit_event = AuditEvent {
                        timestamp: SystemTime::now(),
                        event_type: AuditEventType::AdminOverride,
                        user_id: Some(user_id.to_string()),
                        ip_address: None,
                        details: format!("Administrative unlock successful for user: {}", user_id),
                        severity: AuditSeverity::Warning,
                    };

                    self.log_audit_event(audit_event).await;
                    self.log_performance("admin_unlock", start_time.elapsed()).await;

                    info!("🔓 Administrative unlock successful for user: {}", user_id);
                    Ok(())
                } else {
                    error!("🚨 Invalid unlock token for user: {}", user_id);
                    Err("Invalid unlock token".to_string())
                }
            } else {
                Err("No unlock token available for this account".to_string())
            }
        } else {
            Err("Account lockout not found".to_string())
        }
    }

    /// Add IP to whitelist (administrative function)
    pub async fn whitelist_ip(&mut self, ip: IpAddr) {
        self.config.whitelist_ips.push(ip);

        // Update existing IP limit if it exists
        {
            let mut ip_limits = self.ip_limits.write().await;
            if let Some(ip_limit) = ip_limits.get_mut(&ip) {
                ip_limit.is_whitelisted = true;
            }
        }

        let audit_event = AuditEvent {
            timestamp: SystemTime::now(),
            event_type: AuditEventType::WhitelistBypass,
            user_id: None,
            ip_address: Some(ip),
            details: format!("IP address added to whitelist: {}", ip),
            severity: AuditSeverity::Info,
        };

        self.log_audit_event(audit_event).await;
        info!("✅ IP address whitelisted: {}", ip);
    }

    /// Get current security statistics
    pub async fn get_security_stats(&self) -> SecurityStats {
        let lockouts = self.account_lockouts.read().await;
        let ip_limits = self.ip_limits.read().await;
        let audit_log = self.audit_log.read().await;

        let locked_accounts = lockouts.values().filter(|l| l.is_locked()).count();
        let total_failed_attempts: u32 = lockouts.values().map(|l| l.failed_attempts).sum();
        let blocked_ips = ip_limits.values().filter(|l| l.failed_attempts >= self.config.ip_lockout_threshold).count();

        // Get recent audit events (last 100)
        let recent_events = audit_log.iter().rev().take(100).cloned().collect();

        SecurityStats {
            locked_accounts,
            total_failed_attempts,
            blocked_ips,
            whitelisted_ips: self.config.whitelist_ips.len(),
            recent_events,
            config: self.config.clone(),
        }
    }

    /// Check account lockout status
    async fn check_account_lockout(&self, user_id: &str) -> Option<RateLimitResult> {
        let lockouts = self.account_lockouts.read().await;
        if let Some(lockout) = lockouts.get(user_id) {
            if lockout.is_locked() {
                let audit_event = AuditEvent {
                    timestamp: SystemTime::now(),
                    event_type: AuditEventType::AccountLockout,
                    user_id: Some(user_id.to_string()),
                    ip_address: None,
                    details: format!("Account locked - Level: {} - Remaining: {:?}",
                        lockout.lockout_level, lockout.remaining_lockout()),
                    severity: AuditSeverity::Critical,
                };

                return Some(RateLimitResult {
                    decision: RateLimitDecision::DenyAccountLocked,
                    retry_after: lockout.remaining_lockout(),
                    remaining_attempts: Some(0),
                    lockout_info: Some(lockout.clone()),
                    audit_event,
                });
            }
        }
        None
    }

    /// Check IP-based rate limiting
    async fn check_ip_rate_limit(&self, ip: IpAddr) -> Option<RateLimitResult> {
        let mut ip_limits = self.ip_limits.write().await;
        let ip_limit = ip_limits.entry(ip)
            .or_insert_with(|| IpRateLimit::new(self.config.whitelist_ips.contains(&ip)));

        // Skip rate limiting for whitelisted IPs
        if ip_limit.is_whitelisted {
            return None;
        }

        // Check token bucket rate limiting
        if !ip_limit.bucket.try_consume(1) {
            let audit_event = AuditEvent {
                timestamp: SystemTime::now(),
                event_type: AuditEventType::RateLimitExceeded,
                user_id: None,
                ip_address: Some(ip),
                details: format!("IP rate limit exceeded - Available tokens: {}",
                    ip_limit.bucket.available_tokens()),
                severity: AuditSeverity::Warning,
            };

            return Some(RateLimitResult {
                decision: RateLimitDecision::DenyRateLimit,
                retry_after: Some(Duration::from_secs(60 / self.config.max_attempts_per_minute as u64)),
                remaining_attempts: Some(ip_limit.bucket.available_tokens()),
                lockout_info: None,
                audit_event,
            });
        }

        None
    }

    /// Log audit event with automatic cleanup
    async fn log_audit_event(&self, event: AuditEvent) {
        let mut audit_log = self.audit_log.write().await;
        audit_log.push(event);

        // Keep only last 10,000 events to prevent memory bloat
        if audit_log.len() > 10_000 {
            audit_log.drain(0..1_000);
        }
    }

    /// Log performance metrics (development/debugging)
    async fn log_performance(&self, operation: &str, duration: Duration) {
        if duration > Duration::from_millis(10) {
            warn!("⚠️ Rate limiter operation '{}' took {:?} (target: <10ms)", operation, duration);
        } else {
            debug!("✅ Rate limiter operation '{}' completed in {:?}", operation, duration);
        }
    }

    /// Export audit log for external analysis
    pub async fn export_audit_log(&self) -> Vec<AuditEvent> {
        let audit_log = self.audit_log.read().await;
        audit_log.clone()
    }

    /// Clear old audit events (maintenance function)
    pub async fn cleanup_audit_log(&self, older_than: Duration) {
        let cutoff = SystemTime::now() - older_than;
        let mut audit_log = self.audit_log.write().await;
        audit_log.retain(|event| event.timestamp > cutoff);
        info!("🧹 Cleaned up audit log - {} events retained", audit_log.len());
    }
}

/// Security statistics for monitoring and reporting
#[derive(Debug, Serialize, Deserialize)]
pub struct SecurityStats {
    pub locked_accounts: usize,
    pub total_failed_attempts: u32,
    pub blocked_ips: usize,
    pub whitelisted_ips: usize,
    pub recent_events: Vec<AuditEvent>,
    pub config: RateLimitConfig,
}

/// Generate secure unlock token for administrative overrides
fn generate_unlock_token() -> String {
    use rand::Rng;
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut rng = rand::thread_rng();

    (0..16)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn test_token_bucket() {
        let mut bucket = TokenBucket::new(5, 1);

        // Should have full capacity initially
        assert_eq!(bucket.available_tokens(), 5);
        assert!(bucket.try_consume(5));
        assert_eq!(bucket.available_tokens(), 0);
        assert!(!bucket.try_consume(1));
    }

    #[test]
    fn test_account_lockout() {
        let mut lockout = AccountLockout::new("test_user".to_string());

        // First two failures should not trigger lockout
        lockout.add_failure();
        lockout.add_failure();
        assert!(!lockout.is_locked());

        // Third failure should trigger lockout
        lockout.add_failure();
        assert!(lockout.is_locked());
        assert_eq!(lockout.lockout_level, 1);
    }

    #[tokio::test]
    async fn test_rate_limiter_basic() {
        let limiter = RateLimiter::new();
        let user_id = "test_user";
        let ip = Some("192.168.1.100".parse().unwrap());

        // First attempt should be allowed
        let result = limiter.check_attempt(user_id, ip).await;
        assert_eq!(result.decision, RateLimitDecision::Allow);

        // Record success should reset any counters
        limiter.record_success(user_id, ip).await;
    }

    #[tokio::test]
    async fn test_brute_force_protection() {
        let limiter = RateLimiter::new();
        let user_id = "brute_force_test";
        let ip = Some("192.168.1.200".parse().unwrap());

        // Simulate 3 failed attempts to trigger lockout
        for i in 1..=3 {
            let result = limiter.record_failure(user_id, ip).await;
            if i >= 3 {
                assert_eq!(result.decision, RateLimitDecision::DenyAccountLocked);
                assert!(result.retry_after.is_some());
            }
        }

        // Next attempt should be denied due to lockout
        let result = limiter.check_attempt(user_id, ip).await;
        assert_eq!(result.decision, RateLimitDecision::DenyAccountLocked);
    }
}
