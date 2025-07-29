// Financial Core Module for Atlas Desktop
// MIGRATED: Now uses Rust Financial Engine as primary calculation service
// Maintains compatibility while routing calculations through shared engine

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use std::fmt;
use uuid::Uuid;
use chrono::{DateTime, Utc};

// Import from Rust Financial Engine
use atlas_financial_core::{Money, Currency, FinancialError, Result};

// ============================================================================
// Core Financial Types
// ============================================================================

/// Bank-grade financial amount - Desktop compatibility wrapper
/// MIGRATION: Routes all operations through Rust Financial Engine
/// Maintains API compatibility with existing desktop code
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FinancialAmount {
    /// Internal Money instance from Rust Financial Engine
    #[serde(skip)]
    money: Money,
    /// Legacy compatibility fields
    amount: Decimal,
    currency: String,
}

impl FinancialAmount {
    /// Create a new FinancialAmount using Rust Financial Engine
    pub fn new(amount: Decimal, currency: String) -> Result<Self, FinancialError> {
        // Convert string currency to enum
        let currency_enum = match currency.as_str() {
            "USD" => Currency::USD,
            "EUR" => Currency::EUR,
            "GBP" => Currency::GBP,
            "CAD" => Currency::CAD,
            "AUD" => Currency::AUD,
            "JPY" => Currency::JPY,
            "CHF" => Currency::CHF,
            "CNY" => Currency::CNY,
            _ => return Err(FinancialError::CurrencyError(
                format!("Unsupported currency: {}", currency)
            )),
        };

        // Create Money instance through Financial Engine
        let money = Money::new(amount, currency_enum)?;

        Ok(Self { 
            money,
            amount,
            currency,
        })
    }

    /// Create from decimal with validation
    pub fn from_decimal(amount: Decimal, currency: String) -> Result<Self, FinancialError> {
        Self::new(amount, currency)
    }

    /// Create from string amount with validation
    pub fn from_str(amount: &str, currency: String) -> Result<Self, FinancialError> {
        let decimal_amount = amount.parse::<Decimal>()
            .map_err(|e| FinancialError::ParseError(format!("Invalid amount: {}", e)))?;
        Self::new(decimal_amount, currency)
    }

    /// Create from integer cents (for USD, divide by 100)
    pub fn from_cents(cents: i64, currency: String) -> Result<Self, FinancialError> {
        let amount = Decimal::from(cents) / dec!(100);
        Self::new(amount, currency)
    }

    /// Get the decimal amount
    pub fn amount(&self) -> Decimal {
        self.amount
    }

    /// Get the currency code
    pub fn currency(&self) -> &str {
        &self.currency
    }

    /// Convert to cents (multiply by 100 for USD)
    pub fn to_cents(&self) -> i64 {
        (self.amount * dec!(100)).round().to_i64().unwrap_or(0)
    }

    /// Add two amounts using Rust Financial Engine
    pub fn add(&self, other: &FinancialAmount) -> Result<FinancialAmount, FinancialError> {
        let result_money = self.money.add(&other.money)?;
        
        Ok(FinancialAmount {
            money: result_money,
            amount: result_money.amount(),
            currency: self.currency.clone(),
        })
    }

    /// Subtract two amounts using Rust Financial Engine
    pub fn subtract(&self, other: &FinancialAmount) -> Result<FinancialAmount, FinancialError> {
        let result_money = self.money.subtract(&other.money)?;
        
        Ok(FinancialAmount {
            money: result_money,
            amount: result_money.amount(),
            currency: self.currency.clone(),
        })
    }

    /// Multiply by a decimal factor using Rust Financial Engine
    pub fn multiply(&self, factor: Decimal) -> Result<FinancialAmount, FinancialError> {
        let result_money = self.money.multiply(factor)?;
        
        Ok(FinancialAmount {
            money: result_money,
            amount: result_money.amount(),
            currency: self.currency.clone(),
        })
    }

    /// Divide by a decimal divisor using Rust Financial Engine
    pub fn divide(&self, divisor: Decimal) -> Result<FinancialAmount, FinancialError> {
        let result_money = self.money.divide(divisor)?;
        
        Ok(FinancialAmount {
            money: result_money,
            amount: result_money.amount(),
            currency: self.currency.clone(),
        })
    }

    /// Check if amount is positive
    pub fn is_positive(&self) -> bool {
        self.money.is_positive()
    }

    /// Check if amount is negative
    pub fn is_negative(&self) -> bool {
        self.money.is_negative()
    }

    /// Check if amount is zero (delegate to Financial Engine)
    pub fn is_zero(&self) -> bool {
        self.money.amount().is_zero()
    }

    /// Get absolute value using Rust Financial Engine
    pub fn abs(&self) -> FinancialAmount {
        let abs_money = self.money.abs();
        FinancialAmount {
            money: abs_money,
            amount: abs_money.amount(),
            currency: self.currency.clone(),
        }
    }

    /// Round to specified decimal places
    pub fn round(&self, decimal_places: u32) -> FinancialAmount {
        FinancialAmount {
            amount: self.amount.round_dp(decimal_places),
            currency: self.currency.clone(),
        }
    }

    /// Format as currency string
    pub fn format_currency(&self) -> String {
        match self.currency.as_str() {
            "USD" => format!("${:.2}", self.amount),
            "EUR" => format!("€{:.2}", self.amount),
            "GBP" => format!("£{:.2}", self.amount),
            "JPY" => format!("¥{:.0}", self.amount),
            _ => format!("{} {:.2}", self.currency, self.amount),
        }
    }
}

impl fmt::Display for FinancialAmount {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.format_currency())
    }
}

impl Default for FinancialAmount {
    fn default() -> Self {
        Self {
            amount: dec!(0.00),
            currency: "USD".to_string(),
        }
    }
}

// ============================================================================
// Error Types
// ============================================================================

#[derive(Debug, thiserror::Error)]
pub enum FinancialError {
    #[error("Precision error: {0}")]
    PrecisionError(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Currency error: {0}")]
    CurrencyError(String),

    #[error("Parse error: {0}")]
    ParseError(String),

    #[error("Currency mismatch: expected {expected}, got {actual}")]
    CurrencyMismatch { expected: String, actual: String },

    #[error("Arithmetic overflow")]
    ArithmeticOverflow,

    #[error("Division by zero")]
    DivisionByZero,

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("Configuration error: {0}")]
    ConfigurationError(String),

    #[error("Security error: {0}")]
    SecurityError(String),
}

// ============================================================================
// Financial Engine Integration
// ============================================================================

/// Desktop-specific financial engine with native integration
pub struct FinancialEngine {
    /// Connection to the Rust Financial Engine service
    pub service_url: String,
    /// HTTP client for API calls
    pub client: reqwest::Client,
    /// Cache for frequently accessed data
    pub cache: std::collections::HashMap<String, CacheEntry>,
    /// Configuration
    pub config: FinancialEngineConfig,
}

#[derive(Debug, Clone)]
pub struct FinancialEngineConfig {
    pub service_url: String,
    pub api_timeout_seconds: u64,
    pub cache_ttl_seconds: u64,
    pub default_currency: String,
    pub precision: u32,
}

impl Default for FinancialEngineConfig {
    fn default() -> Self {
        Self {
            service_url: "http://localhost:8080".to_string(),
            api_timeout_seconds: 30,
            cache_ttl_seconds: 300, // 5 minutes
            default_currency: "USD".to_string(),
            precision: 4,
        }
    }
}

#[derive(Debug, Clone)]
struct CacheEntry {
    data: String,
    timestamp: DateTime<Utc>,
    ttl: chrono::Duration,
}

impl CacheEntry {
    fn is_expired(&self) -> bool {
        Utc::now() > self.timestamp + self.ttl
    }
}

impl FinancialEngine {
    /// Create a new financial engine instance
    pub async fn new() -> Result<Self, FinancialError> {
        let config = FinancialEngineConfig::default();
        Self::with_config(config).await
    }

    /// Create with custom configuration
    pub async fn with_config(config: FinancialEngineConfig) -> Result<Self, FinancialError> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(config.api_timeout_seconds))
            .build()
            .map_err(|e| FinancialError::NetworkError(e.to_string()))?;

        let engine = Self {
            service_url: config.service_url.clone(),
            client,
            cache: std::collections::HashMap::new(),
            config,
        };

        // Test connection to financial engine service
        engine.health_check().await?;

        Ok(engine)
    }

    /// Health check for the financial engine service
    pub async fn health_check(&self) -> Result<(), FinancialError> {
        let url = format!("{}/health", self.service_url);

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| FinancialError::NetworkError(format!("Health check failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(FinancialError::NetworkError(
                format!("Health check failed with status: {}", response.status())
            ));
        }

        Ok(())
    }

    /// Calculate net worth using the financial engine
    pub async fn calculate_net_worth(&self, user_id: &str) -> Result<FinancialAmount, FinancialError> {
        let cache_key = format!("net_worth_{}", user_id);

        // Check cache first
        if let Some(cached) = self.get_cached(&cache_key) {
            if let Ok(amount) = serde_json::from_str::<FinancialAmount>(&cached.data) {
                return Ok(amount);
            }
        }

        // Call financial engine service
        let url = format!("{}/api/v1/net-worth/{}", self.service_url, user_id);

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| FinancialError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            return Err(FinancialError::NetworkError(
                format!("Net worth calculation failed: {}", response.status())
            ));
        }

        let net_worth: FinancialAmount = response
            .json()
            .await
            .map_err(|e| FinancialError::ParseError(e.to_string()))?;

        // Cache the result
        self.set_cache(cache_key, &net_worth).await?;

        Ok(net_worth)
    }

    /// Perform financial calculations using the engine
    pub async fn calculate(
        &self,
        operation: FinancialOperation,
    ) -> Result<FinancialAmount, FinancialError> {
        let url = format!("{}/api/v1/calculate", self.service_url);

        let response = self.client
            .post(&url)
            .json(&operation)
            .send()
            .await
            .map_err(|e| FinancialError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            return Err(FinancialError::NetworkError(
                format!("Calculation failed: {}", response.status())
            ));
        }

        let result: FinancialAmount = response
            .json()
            .await
            .map_err(|e| FinancialError::ParseError(e.to_string()))?;

        Ok(result)
    }

    /// Get cached data if not expired
    fn get_cached(&self, key: &str) -> Option<&CacheEntry> {
        self.cache.get(key).filter(|entry| !entry.is_expired())
    }

    /// Set cache entry
    async fn set_cache<T: Serialize>(&self, key: String, data: &T) -> Result<(), FinancialError> {
        let json_data = serde_json::to_string(data)
            .map_err(|e| FinancialError::ParseError(e.to_string()))?;

        let entry = CacheEntry {
            data: json_data,
            timestamp: Utc::now(),
            ttl: chrono::Duration::seconds(self.config.cache_ttl_seconds as i64),
        };

        // Note: In a real implementation, this would need proper synchronization
        // since we're mutating the cache from an async context
        // For now, this is a placeholder structure

        Ok(())
    }

    /// Clear expired cache entries
    pub fn clean_cache(&mut self) {
        self.cache.retain(|_, entry| !entry.is_expired());
    }

    /// Validate currency conversion rates
    pub async fn get_exchange_rate(
        &self,
        from_currency: &str,
        to_currency: &str,
    ) -> Result<Decimal, FinancialError> {
        if from_currency == to_currency {
            return Ok(dec!(1.0));
        }

        let url = format!(
            "{}/api/v1/exchange-rates/{}/{}",
            self.service_url, from_currency, to_currency
        );

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| FinancialError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            return Err(FinancialError::NetworkError(
                format!("Exchange rate fetch failed: {}", response.status())
            ));
        }

        #[derive(Deserialize)]
        struct ExchangeRateResponse {
            rate: Decimal,
        }

        let rate_response: ExchangeRateResponse = response
            .json()
            .await
            .map_err(|e| FinancialError::ParseError(e.to_string()))?;

        Ok(rate_response.rate)
    }
}

// ============================================================================
// Financial Operations
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FinancialOperation {
    /// Calculate compound interest
    CompoundInterest {
        principal: FinancialAmount,
        rate: Decimal,
        periods: i32,
        compounds_per_period: i32,
    },
    /// Calculate present value
    PresentValue {
        future_value: FinancialAmount,
        rate: Decimal,
        periods: i32,
    },
    /// Calculate future value
    FutureValue {
        present_value: FinancialAmount,
        rate: Decimal,
        periods: i32,
    },
    /// Calculate loan payment
    LoanPayment {
        principal: FinancialAmount,
        rate: Decimal,
        periods: i32,
    },
    /// Calculate portfolio risk
    PortfolioRisk {
        assets: Vec<AssetAllocation>,
        correlation_matrix: Vec<Vec<Decimal>>,
    },
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetAllocation {
    pub asset_id: String,
    pub weight: Decimal,
    pub expected_return: Decimal,
    pub volatility: Decimal,
}

// ============================================================================
// Utility Functions
// ============================================================================

/// Create a zero amount in the specified currency
pub fn zero_amount(currency: &str) -> FinancialAmount {
    FinancialAmount::new(dec!(0.00), currency.to_string()).unwrap()
}

/// Create amount from string with validation
pub fn parse_amount(amount_str: &str, currency: &str) -> Result<FinancialAmount, FinancialError> {
    FinancialAmount::from_str(amount_str, currency.to_string())
}

/// Validate decimal precision for financial amounts
pub fn validate_financial_precision(amount: Decimal) -> Result<(), FinancialError> {
    if amount.scale() > 4 {
        return Err(FinancialError::PrecisionError(
            "Financial amounts cannot exceed 4 decimal places".to_string()
        ));
    }
    Ok(())
}

/// Convert between currencies (placeholder for actual implementation)
pub async fn convert_currency(
    amount: &FinancialAmount,
    to_currency: &str,
    engine: &FinancialEngine,
) -> Result<FinancialAmount, FinancialError> {
    if amount.currency() == to_currency {
        return Ok(amount.clone());
    }

    let rate = engine.get_exchange_rate(amount.currency(), to_currency).await?;
    let converted_amount = amount.multiply(rate)?;

    Ok(FinancialAmount::new(converted_amount.amount(), to_currency.to_string())?)
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_financial_amount_creation() {
        let amount = FinancialAmount::new(dec!(100.50), "USD".to_string()).unwrap();
        assert_eq!(amount.amount(), dec!(100.50));
        assert_eq!(amount.currency(), "USD");
    }

    #[test]
    fn test_financial_amount_arithmetic() {
        let amount1 = FinancialAmount::new(dec!(100.00), "USD".to_string()).unwrap();
        let amount2 = FinancialAmount::new(dec!(50.25), "USD".to_string()).unwrap();

        let sum = amount1.add(&amount2).unwrap();
        assert_eq!(sum.amount(), dec!(150.25));

        let diff = amount1.subtract(&amount2).unwrap();
        assert_eq!(diff.amount(), dec!(49.75));

        let product = amount1.multiply(dec!(2.0)).unwrap();
        assert_eq!(product.amount(), dec!(200.00));

        let quotient = amount1.divide(dec!(2.0)).unwrap();
        assert_eq!(quotient.amount(), dec!(50.00));
    }

    #[test]
    fn test_currency_mismatch() {
        let usd = FinancialAmount::new(dec!(100.00), "USD".to_string()).unwrap();
        let eur = FinancialAmount::new(dec!(50.00), "EUR".to_string()).unwrap();

        assert!(usd.add(&eur).is_err());
        assert!(usd.subtract(&eur).is_err());
    }

    #[test]
    fn test_precision_validation() {
        // Should succeed with 4 decimal places
        assert!(FinancialAmount::new(dec!(100.1234), "USD".to_string()).is_ok());

        // Should fail with more than 4 decimal places
        assert!(FinancialAmount::new(dec!(100.12345), "USD".to_string()).is_err());
    }

    #[test]
    fn test_currency_formatting() {
        let usd = FinancialAmount::new(dec!(1234.56), "USD".to_string()).unwrap();
        assert_eq!(usd.format_currency(), "$1234.56");

        let eur = FinancialAmount::new(dec!(1234.56), "EUR".to_string()).unwrap();
        assert_eq!(eur.format_currency(), "€1234.56");

        let jpy = FinancialAmount::new(dec!(1234.0), "JPY".to_string()).unwrap();
        assert_eq!(jpy.format_currency(), "¥1234");
    }

    #[test]
    fn test_cents_conversion() {
        let amount = FinancialAmount::from_cents(12345, "USD".to_string()).unwrap();
        assert_eq!(amount.amount(), dec!(123.45));
        assert_eq!(amount.to_cents(), 12345);
    }
}
