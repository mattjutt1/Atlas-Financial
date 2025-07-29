// SQL Injection Security Testing for Atlas Financial Desktop
// Automated testing for SQL injection prevention

use crate::security::secure_query::{InputValidator, SQL_INJECTION_PATTERNS};
use crate::commands::financial::TransactionInput;
use crate::storage::CreateAccountRequest;
use uuid::Uuid;
use rust_decimal::Decimal;
use chrono::Utc;

/// SQL injection test patterns that should be detected and blocked
pub const SQL_INJECTION_TEST_CASES: &[&str] = &[
    // Classic SQL injection patterns
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'; DELETE FROM accounts; --",
    "' UNION SELECT * FROM accounts --",
    "'; EXEC xp_cmdshell('dir'); --",

    // Boolean-based blind SQL injection
    "' AND 1=1 --",
    "' AND 1=2 --",
    "' OR EXISTS(SELECT * FROM accounts) --",

    // Time-based blind SQL injection
    "'; WAITFOR DELAY '00:00:10'; --",
    "' OR SLEEP(10) --",
    "'; SELECT pg_sleep(10); --",

    // Union-based SQL injection
    "' UNION ALL SELECT NULL,NULL,password FROM users --",
    "' UNION SELECT 1,2,3,4,5,6,7,8,9,10 --",

    // Error-based SQL injection
    "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(password,FLOOR(RAND(0)*2))x FROM users GROUP BY x)a); --",
    "' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT password FROM users LIMIT 1),0x7e)); --",

    // Stacked queries
    "'; INSERT INTO audit_log VALUES ('hacked'); --",
    "'; UPDATE accounts SET balance = 999999 WHERE id = 1; --",

    // NoSQL injection patterns (just in case)
    "'; return db.users.find(); //",
    "$ne",
    "$where",

    // XSS in database fields
    "<script>alert('xss')</script>",
    "javascript:alert('xss')",
    "onload=alert('xss')",

    // Path traversal
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",

    // Command injection
    "; cat /etc/passwd",
    "| whoami",
    "&& dir",

    // LDAP injection
    "*)(&(objectclass=*))",
    "*)(uid=*))(|(uid=*",

    // XML injection
    "<!ENTITY xxe SYSTEM \"file:///etc/passwd\">",

    // SQL comments and escaping
    "/*",
    "*/",
    "\\x00",
    "\\x1a",

    // Database-specific patterns
    "pg_sleep",
    "information_schema",
    "mysql.user",
    "sys.tables",
    "ALL_TABLES",

    // Encoded injection attempts
    "%27%20OR%201=1--",
    "0x27204f5220313d312d2d",
    "CHAR(39)+OR+CHAR(49)=CHAR(49)--",
];

/// Test SQL injection detection patterns
pub fn test_sql_injection_detection() -> Vec<(String, bool)> {
    let mut results = Vec::new();

    for &test_case in SQL_INJECTION_TEST_CASES {
        let detected = SQL_INJECTION_PATTERNS.iter()
            .any(|pattern| pattern.is_match(test_case));

        results.push((test_case.to_string(), detected));

        if !detected {
            tracing::warn!("SQL injection pattern not detected: {}", test_case);
        }
    }

    results
}

/// Test transaction input validation against SQL injection
pub fn test_transaction_input_security() -> Vec<(String, bool)> {
    let mut results = Vec::new();

    for &malicious_input in SQL_INJECTION_TEST_CASES {
        // Test description field
        let transaction_input = TransactionInput {
            account_id: Uuid::new_v4().to_string(),
            amount: "100.00".to_string(),
            description: malicious_input.to_string(),
            category: None,
            subcategory: None,
            transaction_date: None,
            transaction_type: crate::commands::financial::TransactionType::Debit,
            merchant: None,
            location: None,
            is_recurring: None,
            tags: None,
            notes: None,
        };

        let is_blocked = InputValidator::validate_transaction_input(&transaction_input).is_err();
        results.push((format!("description: {}", malicious_input), is_blocked));

        // Test merchant field
        let transaction_input_merchant = TransactionInput {
            account_id: Uuid::new_v4().to_string(),
            amount: "100.00".to_string(),
            description: "Valid description".to_string(),
            category: None,
            subcategory: None,
            transaction_date: None,
            transaction_type: crate::commands::financial::TransactionType::Debit,
            merchant: Some(malicious_input.to_string()),
            location: None,
            is_recurring: None,
            tags: None,
            notes: None,
        };

        let is_blocked = InputValidator::validate_transaction_input(&transaction_input_merchant).is_err();
        results.push((format!("merchant: {}", malicious_input), is_blocked));

        // Test tags field
        let transaction_input_tags = TransactionInput {
            account_id: Uuid::new_v4().to_string(),
            amount: "100.00".to_string(),
            description: "Valid description".to_string(),
            category: None,
            subcategory: None,
            transaction_date: None,
            transaction_type: crate::commands::financial::TransactionType::Debit,
            merchant: None,
            location: None,
            is_recurring: None,
            tags: Some(vec![malicious_input.to_string()]),
            notes: None,
        };

        let is_blocked = InputValidator::validate_transaction_input(&transaction_input_tags).is_err();
        results.push((format!("tags: {}", malicious_input), is_blocked));
    }

    results
}

/// Test account input validation against SQL injection
pub fn test_account_input_security() -> Vec<(String, bool)> {
    let mut results = Vec::new();

    for &malicious_input in SQL_INJECTION_TEST_CASES {
        // Test account name field
        let account_input = CreateAccountRequest {
            user_id: Uuid::new_v4().to_string(),
            name: malicious_input.to_string(),
            account_type: crate::storage::AccountType::Checking,
            balance: Decimal::new(100000, 2), // $1000.00
            currency: "USD".to_string(),
            institution: None,
            account_number_masked: None,
            credit_limit: None,
            interest_rate: None,
        };

        let is_blocked = InputValidator::validate_account_input(&account_input).is_err();
        results.push((format!("account_name: {}", malicious_input), is_blocked));

        // Test institution field
        let account_input_institution = CreateAccountRequest {
            user_id: Uuid::new_v4().to_string(),
            name: "Valid Account Name".to_string(),
            account_type: crate::storage::AccountType::Checking,
            balance: Decimal::new(100000, 2),
            currency: "USD".to_string(),
            institution: Some(malicious_input.to_string()),
            account_number_masked: None,
            credit_limit: None,
            interest_rate: None,
        };

        let is_blocked = InputValidator::validate_account_input(&account_input_institution).is_err();
        results.push((format!("institution: {}", malicious_input), is_blocked));
    }

    results
}

/// Performance test for SQL injection detection
pub fn benchmark_sql_injection_detection(iterations: u32) -> std::time::Duration {
    let start = std::time::Instant::now();

    for _ in 0..iterations {
        for &test_case in SQL_INJECTION_TEST_CASES {
            // Simulate pattern matching overhead
            let _detected = SQL_INJECTION_PATTERNS.iter()
                .any(|pattern| pattern.is_match(test_case));
        }
    }

    start.elapsed()
}

/// Generate comprehensive security test report
pub fn generate_security_test_report() -> SecurityTestReport {
    let detection_results = test_sql_injection_detection();
    let transaction_results = test_transaction_input_security();
    let account_results = test_account_input_security();

    let total_patterns = SQL_INJECTION_TEST_CASES.len();
    let detected_patterns = detection_results.iter().filter(|(_, detected)| *detected).count();

    let total_transaction_tests = transaction_results.len();
    let blocked_transaction_tests = transaction_results.iter().filter(|(_, blocked)| *blocked).count();

    let total_account_tests = account_results.len();
    let blocked_account_tests = account_results.iter().filter(|(_, blocked)| *blocked).count();

    // Performance benchmark
    let benchmark_time = benchmark_sql_injection_detection(1000);

    SecurityTestReport {
        pattern_detection_rate: (detected_patterns as f64 / total_patterns as f64) * 100.0,
        transaction_blocking_rate: (blocked_transaction_tests as f64 / total_transaction_tests as f64) * 100.0,
        account_blocking_rate: (blocked_account_tests as f64 / total_account_tests as f64) * 100.0,
        benchmark_time_ms: benchmark_time.as_millis() as u64,
        failed_detections: detection_results.into_iter()
            .filter(|(_, detected)| !*detected)
            .map(|(pattern, _)| pattern)
            .collect(),
        failed_transaction_blocks: transaction_results.into_iter()
            .filter(|(_, blocked)| !*blocked)
            .map(|(test, _)| test)
            .collect(),
        failed_account_blocks: account_results.into_iter()
            .filter(|(_, blocked)| !*blocked)
            .map(|(test, _)| test)
            .collect(),
        recommendation: generate_security_recommendations(detected_patterns, total_patterns),
    }
}

/// Security test report structure
#[derive(Debug, Clone)]
pub struct SecurityTestReport {
    pub pattern_detection_rate: f64,
    pub transaction_blocking_rate: f64,
    pub account_blocking_rate: f64,
    pub benchmark_time_ms: u64,
    pub failed_detections: Vec<String>,
    pub failed_transaction_blocks: Vec<String>,
    pub failed_account_blocks: Vec<String>,
    pub recommendation: SecurityRecommendation,
}

/// Security recommendations based on test results
#[derive(Debug, Clone)]
pub enum SecurityRecommendation {
    Excellent,
    Good,
    NeedsImprovement(Vec<String>),
    Critical(Vec<String>),
}

fn generate_security_recommendations(detected: usize, total: usize) -> SecurityRecommendation {
    let detection_rate = (detected as f64 / total as f64) * 100.0;

    match detection_rate {
        rate if rate >= 95.0 => SecurityRecommendation::Excellent,
        rate if rate >= 85.0 => SecurityRecommendation::Good,
        rate if rate >= 70.0 => SecurityRecommendation::NeedsImprovement(vec![
            "Consider adding more specific SQL injection patterns".to_string(),
            "Review input validation for edge cases".to_string(),
        ]),
        _ => SecurityRecommendation::Critical(vec![
            "URGENT: SQL injection detection is insufficient".to_string(),
            "Add comprehensive pattern matching immediately".to_string(),
            "Implement additional security layers".to_string(),
            "Consider using a Web Application Firewall (WAF)".to_string(),
        ]),
    }
}

/// Run automated security tests on application startup
pub async fn run_security_startup_tests() -> Result<(), String> {
    tracing::info!("Running SQL injection security tests...");

    let report = generate_security_test_report();

    // Log results
    tracing::info!("Security Test Results:");
    tracing::info!("  Pattern Detection Rate: {:.1}%", report.pattern_detection_rate);
    tracing::info!("  Transaction Blocking Rate: {:.1}%", report.transaction_blocking_rate);
    tracing::info!("  Account Blocking Rate: {:.1}%", report.account_blocking_rate);
    tracing::info!("  Benchmark Time: {}ms", report.benchmark_time_ms);

    // Log failed detections
    if !report.failed_detections.is_empty() {
        tracing::warn!("Failed to detect {} SQL injection patterns:", report.failed_detections.len());
        for pattern in &report.failed_detections {
            tracing::warn!("  - {}", pattern);
        }
    }

    // Check if security meets minimum standards
    match report.recommendation {
        SecurityRecommendation::Critical(issues) => {
            tracing::error!("CRITICAL SECURITY ISSUES DETECTED:");
            for issue in &issues {
                tracing::error!("  - {}", issue);
            }
            return Err("Critical security vulnerabilities detected".to_string());
        },
        SecurityRecommendation::NeedsImprovement(suggestions) => {
            tracing::warn!("Security improvements recommended:");
            for suggestion in &suggestions {
                tracing::warn!("  - {}", suggestion);
            }
        },
        SecurityRecommendation::Good => {
            tracing::info!("Security measures are good but could be enhanced");
        },
        SecurityRecommendation::Excellent => {
            tracing::info!("Excellent security measures in place");
        },
    }

    // Performance check
    if report.benchmark_time_ms > 100 {
        tracing::warn!("SQL injection detection may impact performance: {}ms", report.benchmark_time_ms);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_injection_patterns_detected() {
        let results = test_sql_injection_detection();
        let failed_detections: Vec<_> = results.iter()
            .filter(|(_, detected)| !*detected)
            .collect();

        if !failed_detections.is_empty() {
            panic!("Failed to detect {} SQL injection patterns: {:?}",
                   failed_detections.len(), failed_detections);
        }
    }

    #[test]
    fn test_transaction_input_security_coverage() {
        let results = test_transaction_input_security();
        let failed_blocks: Vec<_> = results.iter()
            .filter(|(_, blocked)| !*blocked)
            .collect();

        // Should block at least 90% of malicious inputs
        let blocking_rate = (results.len() - failed_blocks.len()) as f64 / results.len() as f64;
        assert!(blocking_rate >= 0.9,
               "Transaction input security blocking rate too low: {:.1}%",
               blocking_rate * 100.0);
    }

    #[test]
    fn test_performance_benchmark() {
        let duration = benchmark_sql_injection_detection(100);

        // Should complete 100 iterations in less than 50ms
        assert!(duration.as_millis() < 50,
               "SQL injection detection too slow: {}ms",
               duration.as_millis());
    }

    #[test]
    fn test_security_report_generation() {
        let report = generate_security_test_report();

        // Verify report structure
        assert!(report.pattern_detection_rate >= 0.0 && report.pattern_detection_rate <= 100.0);
        assert!(report.transaction_blocking_rate >= 0.0 && report.transaction_blocking_rate <= 100.0);
        assert!(report.account_blocking_rate >= 0.0 && report.account_blocking_rate <= 100.0);
        assert!(report.benchmark_time_ms > 0);
    }
}
