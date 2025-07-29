// Security Module for Atlas Financial Desktop
// Enterprise-grade security with hardware-based key management

pub mod vault;
pub mod secure_query;
pub mod sql_injection_tests;
pub mod tls;
pub mod tls_tests;
pub mod rate_limiter;
pub mod comprehensive_security_tests;
pub mod security_test_runner;

#[cfg(test)]
pub mod rate_limiter_tests;

pub use vault::{
    SecureVault,
    VaultError,
    KeyMetadata,
    encrypt_data,
    decrypt_data,
    check_key_rotation,
    rotate_encryption_key,
    get_vault,
};

pub use secure_query::{
    SecureQuery,
    InputValidator,
    TransactionFilterBuilder,
    QueryParam,
    OrderDirection,
};

pub use sql_injection_tests::{
    generate_security_test_report,
    run_security_startup_tests,
    SecurityTestReport,
    SecurityRecommendation,
};

pub use tls::{
    SecureTlsClient,
    TlsError,
    TlsPolicy,
    CertificatePin,
    TlsSecurityReport,
    get_secure_client,
    validate_https_url,
    extract_domain,
};

pub use tls_tests::{
    run_tls_security_tests,
    TlsTestReport,
    TlsTestSummary,
    CertificateTest,
    HttpsTest,
    PerformanceTest,
    SecurityRecommendation,
    ComplianceStatus,
};

pub use rate_limiter::{
    RateLimiter,
    RateLimitConfig,
    RateLimitDecision,
    RateLimitResult,
    AccountLockout,
    TokenBucket,
    AuditEvent,
    AuditEventType,
    AuditSeverity,
    SecurityStats,
};

pub use comprehensive_security_tests::{
    ComprehensiveSecurityTester,
    ComprehensiveSecurityReport,
    ComplianceLevel,
    VaultTestResults,
    SqlInjectionTestResults,
    TlsSecurityResults,
    RateLimitingTestResults,
    IntegrationTestResults,
    PerformanceImpactResults,
    UserWorkflowResults,
    VulnerabilityAssessment,
    SecurityRecommendation,
    ComplianceGap,
    RemediationItem,
};

pub use security_test_runner::{
    SecurityTestRunner,
    SecurityValidationSuite,
    SecurityPosture,
    SecurityGrade,
    SecurityMaturityLevel,
    RiskAssessment,
    RiskLevel,
    ValidationSummary,
    ComplianceCertification,
    ComplianceStatus,
};
