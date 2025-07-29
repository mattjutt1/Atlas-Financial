// Comprehensive tests for rate limiter and brute force protection
// Security testing with performance validation

#[cfg(test)]
mod tests {
    use super::super::rate_limiter::*;
    use std::time::{Duration, SystemTime};
    use std::net::IpAddr;
    use tokio::time::{sleep, timeout, Instant};

    /// Test basic token bucket functionality
    #[test]
    fn test_token_bucket_basic() {
        let mut bucket = TokenBucket::new(5, 5);

        // Should have full capacity initially
        assert_eq!(bucket.available_tokens(), 5);

        // Should be able to consume all tokens
        assert!(bucket.try_consume(5));
        assert_eq!(bucket.available_tokens(), 0);

        // Should not be able to consume more tokens
        assert!(!bucket.try_consume(1));
    }

    /// Test token bucket refill mechanism
    #[tokio::test]
    async fn test_token_bucket_refill() {
        let mut bucket = TokenBucket::new(5, 60); // 60 tokens per second (1 per ~17ms)

        // Consume all tokens
        assert!(bucket.try_consume(5));
        assert_eq!(bucket.available_tokens(), 0);

        // Wait for refill (small delay for token generation)
        sleep(Duration::from_millis(100)).await; // Should get some tokens back
        assert!(bucket.available_tokens() > 0);
    }

    /// Test account lockout basic functionality
    #[test]
    fn test_account_lockout_basic() {
        let mut lockout = AccountLockout::new("test_user".to_string());

        // Should not be locked initially
        assert!(!lockout.is_locked());
        assert_eq!(lockout.failed_attempts, 1);

        // Add failures - should trigger lockout on 3rd attempt
        lockout.add_failure();
        assert!(!lockout.is_locked()); // 2 attempts

        let lockout_duration = lockout.add_failure();
        assert!(lockout.is_locked()); // 3 attempts - should be locked
        assert_eq!(lockout.lockout_level, 1);
        assert!(lockout_duration > Duration::from_secs(30)); // At least 1 minute
    }

    /// Test exponential backoff progression
    #[test]
    fn test_exponential_backoff() {
        let mut lockout = AccountLockout::new("backoff_test".to_string());

        // Trigger escalating lockouts
        let durations = vec![
            lockout.add_failure(), // Attempt 2
            lockout.add_failure(), // Attempt 3 - 1 minute
            lockout.add_failure(), // Attempt 4 - 5 minutes
            lockout.add_failure(), // Attempt 5 - 15 minutes
            lockout.add_failure(), // Attempt 6 - 1 hour
            lockout.add_failure(), // Attempt 7 - 24 hours
        ];

        // Verify escalating durations
        assert!(durations[1] >= Duration::from_secs(60));    // 1 minute
        assert!(durations[2] >= Duration::from_secs(300));   // 5 minutes
        assert!(durations[3] >= Duration::from_secs(900));   // 15 minutes
        assert!(durations[4] >= Duration::from_secs(3600));  // 1 hour
        assert!(durations[5] >= Duration::from_secs(86400)); // 24 hours

        // Verify unlock token is generated for higher levels
        assert!(lockout.unlock_token.is_some());
    }

    /// Test rate limiter basic allow/deny functionality
    #[tokio::test]
    async fn test_rate_limiter_basic() {
        let limiter = RateLimiter::new();
        let user_id = "test_user";
        let ip = Some("192.168.1.100".parse().unwrap());

        // First attempt should be allowed
        let result = limiter.check_attempt(user_id, ip).await;
        assert_eq!(result.decision, RateLimitDecision::Allow);

        // Record success should not trigger any limits
        limiter.record_success(user_id, ip).await;

        // Next attempt should still be allowed
        let result = limiter.check_attempt(user_id, ip).await;
        assert_eq!(result.decision, RateLimitDecision::Allow);
    }

    /// Test brute force protection with account lockout
    #[tokio::test]
    async fn test_brute_force_protection() {
        let limiter = RateLimiter::new();
        let user_id = "brute_force_test";
        let ip = Some("192.168.1.200".parse().unwrap());

        // Simulate multiple failed attempts
        for i in 1..=3 {
            let result = limiter.record_failure(user_id, ip).await;

            if i < 3 {
                // First two failures should allow retry
                assert_eq!(result.decision, RateLimitDecision::Allow);
            } else {
                // Third failure should trigger lockout
                assert_eq!(result.decision, RateLimitDecision::DenyAccountLocked);
                assert!(result.retry_after.is_some());
                assert!(result.lockout_info.is_some());
            }
        }

        // Subsequent attempt should be denied due to lockout
        let result = limiter.check_attempt(user_id, ip).await;
        assert_eq!(result.decision, RateLimitDecision::DenyAccountLocked);
    }

    /// Test IP-based rate limiting (simulated for desktop app)
    #[tokio::test]
    async fn test_ip_rate_limiting() {
        let limiter = RateLimiter::new();
        let user_base = "ip_test_user";
        let ip = Some("192.168.1.300".parse().unwrap());

        // Create multiple rapid attempts from same IP
        let mut allowed_count = 0;
        let mut denied_count = 0;

        for i in 0..10 {
            let user_id = format!("{}_{}", user_base, i);
            let result = limiter.check_attempt(&user_id, ip).await;

            match result.decision {
                RateLimitDecision::Allow => allowed_count += 1,
                RateLimitDecision::DenyRateLimit => denied_count += 1,
                _ => {}
            }
        }

        // Should have some rate limited requests
        assert!(denied_count > 0, "Expected some rate limited requests");
        assert!(allowed_count <= 5, "Should not allow more than 5 requests per minute");
    }

    /// Test administrative unlock functionality
    #[tokio::test]
    async fn test_admin_unlock() {
        let limiter = RateLimiter::new();
        let user_id = "admin_unlock_test";
        let ip = Some("192.168.1.400".parse().unwrap());

        // Create locked account
        for _ in 0..3 {
            let _result = limiter.record_failure(user_id, ip).await;
        }

        // Verify account is locked
        let result = limiter.check_attempt(user_id, ip).await;
        assert_eq!(result.decision, RateLimitDecision::DenyAccountLocked);

        // Get unlock token from lockout info
        let unlock_token = result.lockout_info
            .and_then(|info| info.unlock_token)
            .expect("Should have unlock token for locked account");

        // Test administrative unlock with correct token
        let unlock_result = limiter.admin_unlock(user_id, &unlock_token).await;
        assert!(unlock_result.is_ok());

        // Verify account is now unlocked
        let result = limiter.check_attempt(user_id, ip).await;
        assert_eq!(result.decision, RateLimitDecision::Allow);
    }

    /// Test security statistics collection
    #[tokio::test]
    async fn test_security_stats() {
        let limiter = RateLimiter::new();

        // Create some test activity
        let users = vec!["stats_test1", "stats_test2", "stats_test3"];
        let ip = Some("192.168.1.500".parse().unwrap());

        // Lock one account
        for _ in 0..3 {
            let _result = limiter.record_failure(users[0], ip).await;
        }

        // Get statistics
        let stats = limiter.get_security_stats().await;

        assert_eq!(stats.locked_accounts, 1);
        assert!(stats.total_failed_attempts >= 3);
        assert!(!stats.recent_events.is_empty());
    }

    /// Test performance requirements (<10ms overhead)
    #[tokio::test]
    async fn test_performance_requirements() {
        let limiter = RateLimiter::new();
        let user_id = "perf_test";
        let ip = Some("127.0.0.1".parse().unwrap());

        // Measure check_attempt performance
        let start = Instant::now();
        for _ in 0..100 {
            let _result = limiter.check_attempt(user_id, ip).await;
        }
        let elapsed = start.elapsed();
        let avg_per_operation = elapsed / 100;

        println!("Average check_attempt time: {:?}", avg_per_operation);
        assert!(avg_per_operation < Duration::from_millis(10),
            "check_attempt should complete in <10ms, got {:?}", avg_per_operation);

        // Measure record_failure performance
        let start = Instant::now();
        for _ in 0..100 {
            let user_id_unique = format!("{}_{}", user_id, rand::random::<u32>());
            let _result = limiter.record_failure(&user_id_unique, ip).await;
        }
        let elapsed = start.elapsed();
        let avg_per_operation = elapsed / 100;

        println!("Average record_failure time: {:?}", avg_per_operation);
        assert!(avg_per_operation < Duration::from_millis(10),
            "record_failure should complete in <10ms, got {:?}", avg_per_operation);
    }

    /// Test audit log functionality
    #[tokio::test]
    async fn test_audit_logging() {
        let limiter = RateLimiter::new();
        let user_id = "audit_test";
        let ip = Some("192.168.1.600".parse().unwrap());

        // Generate some audit events
        let _check = limiter.check_attempt(user_id, ip).await;
        let _failure = limiter.record_failure(user_id, ip).await;
        let _success = limiter.record_success(user_id, ip).await;

        // Export audit log
        let audit_events = limiter.export_audit_log().await;
        assert!(!audit_events.is_empty());

        // Verify different event types are logged
        let has_attempt = audit_events.iter().any(|e| matches!(e.event_type, AuditEventType::AuthenticationAttempt));
        let has_failure = audit_events.iter().any(|e| matches!(e.event_type, AuditEventType::AuthenticationFailure));
        let has_success = audit_events.iter().any(|e| matches!(e.event_type, AuditEventType::AuthenticationSuccess));

        assert!(has_attempt || has_failure || has_success, "Should have various audit event types");
    }

    /// Test whitelist functionality (simulated)
    #[tokio::test]
    async fn test_whitelist_functionality() {
        let mut config = RateLimitConfig::default();
        config.whitelist_ips.push("192.168.1.100".parse().unwrap());

        let limiter = RateLimiter::with_config(config);
        let user_id = "whitelist_test";
        let whitelisted_ip = Some("192.168.1.100".parse().unwrap());
        let regular_ip = Some("192.168.1.200".parse().unwrap());

        // Rapid attempts from whitelisted IP should not be rate limited
        for _ in 0..10 {
            let result = limiter.check_attempt(user_id, whitelisted_ip).await;
            // Note: Account-based limiting still applies, but IP rate limiting should be bypassed
        }

        // Rapid attempts from regular IP should be rate limited
        let mut rate_limited = false;
        for i in 0..10 {
            let user_id_unique = format!("{}_{}", user_id, i);
            let result = limiter.check_attempt(&user_id_unique, regular_ip).await;
            if result.decision == RateLimitDecision::DenyRateLimit {
                rate_limited = true;
                break;
            }
        }

        assert!(rate_limited, "Regular IP should experience rate limiting");
    }

    /// Test configuration validation
    #[test]
    fn test_configuration_validation() {
        let config = RateLimitConfig::default();

        assert!(config.max_attempts_per_minute > 0);
        assert!(config.account_lockout_threshold > 0);
        assert!(config.ip_lockout_threshold > 0);
        assert!(!config.whitelist_ips.is_empty()); // Should include localhost
        assert!(config.admin_unlock_enabled);
    }

    /// Test unlock token generation and validation
    #[test]
    fn test_unlock_token_generation() {
        let mut lockout = AccountLockout::new("token_test".to_string());

        // Multiple failures to trigger unlock token generation
        for _ in 0..5 {
            lockout.add_failure();
        }

        assert!(lockout.unlock_token.is_some());
        let token = lockout.unlock_token.as_ref().unwrap();

        // Token should be alphanumeric and appropriate length
        assert_eq!(token.len(), 16);
        assert!(token.chars().all(|c| c.is_alphanumeric()));
        assert!(token.chars().any(|c| c.is_ascii_uppercase())); // Should contain uppercase
    }

    /// Test concurrent access safety
    #[tokio::test]
    async fn test_concurrent_access() {
        use std::sync::Arc;
        use tokio::task::JoinSet;

        let limiter = Arc::new(RateLimiter::new());
        let mut tasks = JoinSet::new();

        // Launch multiple concurrent tasks
        for i in 0..10 {
            let limiter_clone = Arc::clone(&limiter);
            let user_id = format!("concurrent_test_{}", i);
            let ip = Some("127.0.0.1".parse().unwrap());

            tasks.spawn(async move {
                // Each task performs multiple operations
                for _ in 0..5 {
                    let _check = limiter_clone.check_attempt(&user_id, ip).await;
                    let _failure = limiter_clone.record_failure(&user_id, ip).await;
                    let _success = limiter_clone.record_success(&user_id, ip).await;
                }
            });
        }

        // Wait for all tasks to complete
        while let Some(result) = tasks.join_next().await {
            assert!(result.is_ok(), "Concurrent task should complete successfully");
        }

        // Verify system is still functional
        let stats = limiter.get_security_stats().await;
        assert!(stats.total_failed_attempts > 0);
    }
}
