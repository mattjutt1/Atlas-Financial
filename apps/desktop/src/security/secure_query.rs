// Secure Query Builder for Atlas Financial Desktop
// Prevents SQL injection through parameterized queries and input validation

use sqlx::{PgPool, Row, FromRow, Postgres, QueryBuilder};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use std::collections::HashMap;
use regex::Regex;
use once_cell::sync::Lazy;
use crate::financial::FinancialError;

// Compile-time SQL injection detection patterns
pub static SQL_INJECTION_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    vec![
        Regex::new(r"(?i)(\b(union|select|insert|update|delete|drop|alter|create|exec|execute|sp_|xp_)\b)").unwrap(),
        Regex::new(r"(?i)('|(--)|(/\*)|(\*/)|(\bor\b)|(\band\b))").unwrap(),
        Regex::new(r"(?i)(\b(sleep|benchmark|waitfor|delay)\b)").unwrap(),
        Regex::new(r"(?i)(\b(script|javascript|vbscript|onload|onerror)\b)").unwrap(),
        Regex::new(r"(?i)(\\x[0-9a-f]{2})").unwrap(),
        Regex::new(r"(?i)(\b(char|nchar|varchar|nvarchar|cast|convert)\s*\()").unwrap(),
    ]
});

/// Maximum allowed length for various input types
const MAX_DESCRIPTION_LENGTH: usize = 500;
const MAX_CATEGORY_LENGTH: usize = 100;
const MAX_MERCHANT_LENGTH: usize = 200;
const MAX_LOCATION_LENGTH: usize = 300;
const MAX_NOTES_LENGTH: usize = 1000;
const MAX_SEARCH_LENGTH: usize = 200;
const MAX_TAGS_COUNT: usize = 20;
const MAX_TAG_LENGTH: usize = 50;

/// Secure query builder that prevents SQL injection
#[derive(Debug)]
pub struct SecureQuery<'a> {
    pool: &'a PgPool,
    query_builder: QueryBuilder<'a, Postgres>,
    param_count: usize,
}

impl<'a> SecureQuery<'a> {
    /// Create a new secure query builder
    pub fn new(pool: &'a PgPool, base_query: &str) -> Self {
        Self {
            pool,
            query_builder: QueryBuilder::new(base_query),
            param_count: 0,
        }
    }

    /// Add a WHERE clause with parameter validation
    pub fn add_where_clause(mut self, condition: &str, value: impl Into<QueryParam>) -> Result<Self, FinancialError> {
        let param = value.into();
        self.validate_parameter(&param)?;

        let operator = if self.param_count == 0 { " WHERE " } else { " AND " };
        self.query_builder.push(operator);
        self.query_builder.push(condition);

        match param {
            QueryParam::String(s) => self.query_builder.push_bind(s),
            QueryParam::Integer(i) => self.query_builder.push_bind(i),
            QueryParam::Decimal(d) => self.query_builder.push_bind(d),
            QueryParam::DateTime(dt) => self.query_builder.push_bind(dt),
            QueryParam::Boolean(b) => self.query_builder.push_bind(b),
            QueryParam::Uuid(u) => self.query_builder.push_bind(u),
            QueryParam::StringArray(arr) => self.query_builder.push_bind(arr),
        };

        self.param_count += 1;
        Ok(self)
    }

    /// Add an IN clause with array parameter validation
    pub fn add_in_clause(mut self, column: &str, values: Vec<String>) -> Result<Self, FinancialError> {
        if values.is_empty() {
            return Ok(self);
        }

        // Validate all values in the array
        for value in &values {
            self.validate_string_input(value, MAX_SEARCH_LENGTH)?;
        }

        let operator = if self.param_count == 0 { " WHERE " } else { " AND " };
        self.query_builder.push(operator);
        self.query_builder.push(column);
        self.query_builder.push(" = ANY(");
        self.query_builder.push_bind(values);
        self.query_builder.push(")");

        self.param_count += 1;
        Ok(self)
    }

    /// Add ORDER BY clause (only allows predefined columns)
    pub fn add_order_by(mut self, column: &str, direction: OrderDirection) -> Result<Self, FinancialError> {
        self.validate_column_name(column)?;

        self.query_builder.push(" ORDER BY ");
        self.query_builder.push(column);
        match direction {
            OrderDirection::Asc => self.query_builder.push(" ASC"),
            OrderDirection::Desc => self.query_builder.push(" DESC"),
        }

        Ok(self)
    }

    /// Add LIMIT and OFFSET with bounds checking
    pub fn add_pagination(mut self, limit: i32, offset: i32) -> Result<Self, FinancialError> {
        if limit < 1 || limit > 500 {
            return Err(FinancialError::ValidationError("Limit must be between 1 and 500".to_string()));
        }
        if offset < 0 || offset > 100000 {
            return Err(FinancialError::ValidationError("Offset must be between 0 and 100000".to_string()));
        }

        self.query_builder.push(" LIMIT ");
        self.query_builder.push_bind(limit);
        self.query_builder.push(" OFFSET ");
        self.query_builder.push_bind(offset);

        Ok(self)
    }

    /// Execute query and return all rows
    pub async fn fetch_all<T>(&mut self) -> Result<Vec<T>, FinancialError>
    where
        T: for<'r> FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
    {
        let query = self.query_builder.build();
        query.fetch_all(self.pool)
            .await
            .map_err(|e| FinancialError::DatabaseError(format!("Query execution failed: {}", e)))
    }

    /// Execute query and return optional single row
    pub async fn fetch_optional<T>(&mut self) -> Result<Option<T>, FinancialError>
    where
        T: for<'r> FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
    {
        let query = self.query_builder.build();
        query.fetch_optional(self.pool)
            .await
            .map_err(|e| FinancialError::DatabaseError(format!("Query execution failed: {}", e)))
    }

    /// Execute query and return single row
    pub async fn fetch_one<T>(&mut self) -> Result<T, FinancialError>
    where
        T: for<'r> FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
    {
        let query = self.query_builder.build();
        query.fetch_one(self.pool)
            .await
            .map_err(|e| FinancialError::DatabaseError(format!("Query execution failed: {}", e)))
    }

    /// Execute query without returning rows (for INSERT/UPDATE/DELETE)
    pub async fn execute(&mut self) -> Result<u64, FinancialError> {
        let query = self.query_builder.build();
        let result = query.execute(self.pool)
            .await
            .map_err(|e| FinancialError::DatabaseError(format!("Query execution failed: {}", e)))?;

        Ok(result.rows_affected())
    }

    /// Validate parameter against SQL injection patterns
    fn validate_parameter(&self, param: &QueryParam) -> Result<(), FinancialError> {
        match param {
            QueryParam::String(s) => self.validate_string_input(s, MAX_DESCRIPTION_LENGTH),
            QueryParam::StringArray(arr) => {
                for s in arr {
                    self.validate_string_input(s, MAX_TAG_LENGTH)?;
                }
                Ok(())
            },
            _ => Ok(()), // Other types are safe by nature
        }
    }

    /// Validate string input against SQL injection and length limits
    fn validate_string_input(&self, input: &str, max_length: usize) -> Result<(), FinancialError> {
        // Length validation
        if input.len() > max_length {
            return Err(FinancialError::ValidationError(
                format!("Input exceeds maximum length of {} characters", max_length)
            ));
        }

        // SQL injection pattern detection
        for pattern in SQL_INJECTION_PATTERNS.iter() {
            if pattern.is_match(input) {
                tracing::warn!("Potential SQL injection attempt detected: {}", input);
                return Err(FinancialError::SecurityError(
                    "Input contains potentially malicious patterns".to_string()
                ));
            }
        }

        // Check for null bytes and control characters
        if input.contains('\0') || input.chars().any(|c| c.is_control() && c != '\n' && c != '\r' && c != '\t') {
            return Err(FinancialError::SecurityError(
                "Input contains invalid control characters".to_string()
            ));
        }

        Ok(())
    }

    /// Validate column name against whitelist
    fn validate_column_name(&self, column: &str) -> Result<(), FinancialError> {
        const ALLOWED_COLUMNS: &[&str] = &[
            "id", "user_id", "account_id", "name", "account_type", "balance",
            "currency", "created_at", "updated_at", "transaction_date", "amount",
            "description", "category", "subcategory", "merchant", "location",
            "transaction_type", "is_active", "is_recurring"
        ];

        if !ALLOWED_COLUMNS.contains(&column) {
            return Err(FinancialError::SecurityError(
                format!("Column '{}' is not allowed in queries", column)
            ));
        }

        Ok(())
    }
}

/// Supported query parameter types
#[derive(Debug, Clone)]
pub enum QueryParam {
    String(String),
    Integer(i32),
    Decimal(Decimal),
    DateTime(DateTime<Utc>),
    Boolean(bool),
    Uuid(Uuid),
    StringArray(Vec<String>),
}

impl From<String> for QueryParam {
    fn from(value: String) -> Self {
        QueryParam::String(value)
    }
}

impl From<&str> for QueryParam {
    fn from(value: &str) -> Self {
        QueryParam::String(value.to_string())
    }
}

impl From<i32> for QueryParam {
    fn from(value: i32) -> Self {
        QueryParam::Integer(value)
    }
}

impl From<Decimal> for QueryParam {
    fn from(value: Decimal) -> Self {
        QueryParam::Decimal(value)
    }
}

impl From<DateTime<Utc>> for QueryParam {
    fn from(value: DateTime<Utc>) -> Self {
        QueryParam::DateTime(value)
    }
}

impl From<bool> for QueryParam {
    fn from(value: bool) -> Self {
        QueryParam::Boolean(value)
    }
}

impl From<Uuid> for QueryParam {
    fn from(value: Uuid) -> Self {
        QueryParam::Uuid(value)
    }
}

impl From<Vec<String>> for QueryParam {
    fn from(value: Vec<String>) -> Self {
        QueryParam::StringArray(value)
    }
}

/// Order direction for sorting
#[derive(Debug, Clone, Copy)]
pub enum OrderDirection {
    Asc,
    Desc,
}

/// Input validation for financial data
pub struct InputValidator;

impl InputValidator {
    /// Validate transaction input
    pub fn validate_transaction_input(input: &crate::commands::financial::TransactionInput) -> Result<(), FinancialError> {
        // Validate UUID format for account_id
        Uuid::parse_str(&input.account_id)
            .map_err(|_| FinancialError::ValidationError("Invalid account ID format".to_string()))?;

        // Validate amount can be parsed as Decimal
        let amount = input.amount.parse::<Decimal>()
            .map_err(|_| FinancialError::ValidationError("Invalid amount format".to_string()))?;

        // Validate amount is within reasonable bounds
        if amount.abs() > Decimal::new(999999999, 2) { // 9,999,999.99 max
            return Err(FinancialError::ValidationError("Amount exceeds maximum allowed value".to_string()));
        }

        // Validate description
        if input.description.trim().is_empty() {
            return Err(FinancialError::ValidationError("Description cannot be empty".to_string()));
        }
        Self::validate_string_field(&input.description, MAX_DESCRIPTION_LENGTH, "description")?;

        // Validate optional fields
        if let Some(category) = &input.category {
            Self::validate_string_field(category, MAX_CATEGORY_LENGTH, "category")?;
        }

        if let Some(subcategory) = &input.subcategory {
            Self::validate_string_field(subcategory, MAX_CATEGORY_LENGTH, "subcategory")?;
        }

        if let Some(merchant) = &input.merchant {
            Self::validate_string_field(merchant, MAX_MERCHANT_LENGTH, "merchant")?;
        }

        if let Some(location) = &input.location {
            Self::validate_string_field(location, MAX_LOCATION_LENGTH, "location")?;
        }

        if let Some(notes) = &input.notes {
            Self::validate_string_field(notes, MAX_NOTES_LENGTH, "notes")?;
        }

        if let Some(tags) = &input.tags {
            if tags.len() > MAX_TAGS_COUNT {
                return Err(FinancialError::ValidationError(
                    format!("Maximum {} tags allowed", MAX_TAGS_COUNT)
                ));
            }
            for tag in tags {
                Self::validate_string_field(tag, MAX_TAG_LENGTH, "tag")?;
            }
        }

        // Validate transaction date is not too far in the future or past
        if let Some(date) = input.transaction_date {
            let now = Utc::now();
            let max_past = now - chrono::Duration::days(3650); // 10 years
            let max_future = now + chrono::Duration::days(365); // 1 year

            if date < max_past || date > max_future {
                return Err(FinancialError::ValidationError(
                    "Transaction date is outside allowed range".to_string()
                ));
            }
        }

        Ok(())
    }

    /// Validate account creation input
    pub fn validate_account_input(input: &crate::storage::CreateAccountRequest) -> Result<(), FinancialError> {
        // Validate user_id is valid UUID
        Uuid::parse_str(&input.user_id)
            .map_err(|_| FinancialError::ValidationError("Invalid user ID format".to_string()))?;

        // Validate account name
        if input.name.trim().is_empty() {
            return Err(FinancialError::ValidationError("Account name cannot be empty".to_string()));
        }
        Self::validate_string_field(&input.name, 100, "account name")?;

        // Validate balance is within reasonable bounds
        if input.balance.abs() > Decimal::new(999999999999i64, 2) { // 9,999,999,999.99 max
            return Err(FinancialError::ValidationError("Balance exceeds maximum allowed value".to_string()));
        }

        // Validate currency code
        if !Self::is_valid_currency_code(&input.currency) {
            return Err(FinancialError::ValidationError("Invalid currency code".to_string()));
        }

        // Validate optional fields
        if let Some(institution) = &input.institution {
            Self::validate_string_field(institution, 200, "institution")?;
        }

        if let Some(account_number) = &input.account_number_masked {
            Self::validate_string_field(account_number, 50, "account number")?;
            // Ensure it's actually masked (contains *)
            if !account_number.contains('*') && account_number.len() > 4 {
                return Err(FinancialError::SecurityError(
                    "Account number must be masked".to_string()
                ));
            }
        }

        // Validate credit limit if provided
        if let Some(credit_limit) = &input.credit_limit {
            if *credit_limit < Decimal::ZERO || *credit_limit > Decimal::new(999999999, 2) {
                return Err(FinancialError::ValidationError(
                    "Credit limit must be positive and within reasonable bounds".to_string()
                ));
            }
        }

        // Validate interest rate if provided
        if let Some(interest_rate) = &input.interest_rate {
            if *interest_rate < Decimal::ZERO || *interest_rate > Decimal::new(100, 0) {
                return Err(FinancialError::ValidationError(
                    "Interest rate must be between 0% and 100%".to_string()
                ));
            }
        }

        Ok(())
    }

    /// Validate string field against SQL injection and length
    pub fn validate_string_field(value: &str, max_length: usize, field_name: &str) -> Result<(), FinancialError> {
        if value.len() > max_length {
            return Err(FinancialError::ValidationError(
                format!("{} exceeds maximum length of {} characters", field_name, max_length)
            ));
        }

        // Check for SQL injection patterns
        for pattern in SQL_INJECTION_PATTERNS.iter() {
            if pattern.is_match(value) {
                tracing::warn!("Potential SQL injection attempt in {}: {}", field_name, value);
                return Err(FinancialError::SecurityError(
                    format!("{} contains potentially malicious patterns", field_name)
                ));
            }
        }

        // Check for null bytes and dangerous control characters
        if value.contains('\0') || value.chars().any(|c| c.is_control() && c != '\n' && c != '\r' && c != '\t') {
            return Err(FinancialError::SecurityError(
                format!("{} contains invalid control characters", field_name)
            ));
        }

        Ok(())
    }

    /// Validate currency code against ISO 4217 standard
    fn is_valid_currency_code(code: &str) -> bool {
        const VALID_CURRENCIES: &[&str] = &[
            "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "SEK", "NZD",
            "MXN", "SGD", "HKD", "NOK", "KRW", "TRY", "RUB", "INR", "BRL", "ZAR"
        ];

        code.len() == 3 && VALID_CURRENCIES.contains(&code)
    }
}

/// Secure filter builder for transaction queries
pub struct TransactionFilterBuilder<'a> {
    secure_query: SecureQuery<'a>,
}

impl<'a> TransactionFilterBuilder<'a> {
    /// Create new filter builder
    pub fn new(pool: &'a PgPool, user_id: &str) -> Result<Self, FinancialError> {
        // Validate user_id is valid UUID
        Uuid::parse_str(user_id)
            .map_err(|_| FinancialError::ValidationError("Invalid user ID format".to_string()))?;

        let base_query = r#"
            SELECT
                id, user_id, account_id, amount, description, category,
                subcategory, transaction_date, created_at, updated_at,
                transaction_type, merchant, location, is_recurring,
                tags, notes, ml_confidence
            FROM transactions
        "#;

        let secure_query = SecureQuery::new(pool, base_query)
            .add_where_clause("user_id = $1", user_id.to_string())?;

        Ok(Self { secure_query })
    }

    /// Add account filter
    pub fn with_accounts(mut self, account_ids: Vec<String>) -> Result<Self, FinancialError> {
        if !account_ids.is_empty() {
            // Validate all account IDs are UUIDs
            for id in &account_ids {
                Uuid::parse_str(id)
                    .map_err(|_| FinancialError::ValidationError("Invalid account ID format".to_string()))?;
            }
            self.secure_query = self.secure_query.add_in_clause("account_id", account_ids)?;
        }
        Ok(self)
    }

    /// Add category filter
    pub fn with_categories(mut self, categories: Vec<String>) -> Result<Self, FinancialError> {
        if !categories.is_empty() {
            // Validate categories
            for category in &categories {
                InputValidator::validate_string_field(category, MAX_CATEGORY_LENGTH, "category")?;
            }
            self.secure_query = self.secure_query.add_in_clause("category", categories)?;
        }
        Ok(self)
    }

    /// Add amount range filter
    pub fn with_amount_range(mut self, min: Option<Decimal>, max: Option<Decimal>) -> Result<Self, FinancialError> {
        if let Some(min_amount) = min {
            self.secure_query = self.secure_query.add_where_clause("amount >= $1", min_amount)?;
        }
        if let Some(max_amount) = max {
            self.secure_query = self.secure_query.add_where_clause("amount <= $1", max_amount)?;
        }
        Ok(self)
    }

    /// Add date range filter
    pub fn with_date_range(mut self, start: Option<DateTime<Utc>>, end: Option<DateTime<Utc>>) -> Result<Self, FinancialError> {
        if let Some(start_date) = start {
            self.secure_query = self.secure_query.add_where_clause("transaction_date >= $1", start_date)?;
        }
        if let Some(end_date) = end {
            self.secure_query = self.secure_query.add_where_clause("transaction_date <= $1", end_date)?;
        }
        Ok(self)
    }

    /// Add text search filter
    pub fn with_search_text(mut self, search_text: String) -> Result<Self, FinancialError> {
        if !search_text.trim().is_empty() {
            InputValidator::validate_string_field(&search_text, MAX_SEARCH_LENGTH, "search text")?;
            let pattern = format!("%{}%", search_text.trim());
            self.secure_query = self.secure_query.add_where_clause(
                "(description ILIKE $1 OR merchant ILIKE $1 OR notes ILIKE $1)",
                pattern
            )?;
        }
        Ok(self)
    }

    /// Add ordering and pagination
    pub fn with_pagination(mut self, limit: i32, offset: i32) -> Result<Self, FinancialError> {
        self.secure_query = self.secure_query
            .add_order_by("transaction_date", OrderDirection::Desc)?
            .add_order_by("created_at", OrderDirection::Desc)?
            .add_pagination(limit, offset)?;
        Ok(self)
    }

    /// Execute the query
    pub async fn execute<T>(mut self) -> Result<Vec<T>, FinancialError>
    where
        T: for<'r> FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
    {
        self.secure_query.fetch_all().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sql_injection_detection() {
        let malicious_inputs = vec![
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin'/**/UNION/**/SELECT/**/password/**/FROM/**/users--",
            "'; EXEC sp_configure 'xp_cmdshell', 1--",
            "<script>alert('xss')</script>",
            "1; SELECT * FROM accounts WHERE user_id = 'malicious'",
        ];

        for input in malicious_inputs {
            assert!(
                SQL_INJECTION_PATTERNS.iter().any(|pattern| pattern.is_match(input)),
                "Failed to detect SQL injection in: {}",
                input
            );
        }
    }

    // Note: Input validation tests are in the sql_injection_tests module
    // to avoid circular dependencies with the commands module

    #[test]
    fn test_currency_validation() {
        assert!(InputValidator::is_valid_currency_code("USD"));
        assert!(InputValidator::is_valid_currency_code("EUR"));
        assert!(!InputValidator::is_valid_currency_code("XYZ"));
        assert!(!InputValidator::is_valid_currency_code("us"));
        assert!(!InputValidator::is_valid_currency_code("USDD"));
    }
}
