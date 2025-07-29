// Database Management Module for Atlas Desktop
// Secure database operations with connection pooling

use sqlx::{PgPool, Row};
use sqlx::postgres::PgPoolOptions;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use crate::financial::{FinancialAmount, FinancialError};
use crate::security::secure_query::{SecureQuery, InputValidator, TransactionFilterBuilder, OrderDirection};

// ============================================================================
// Database Manager
// ============================================================================

#[derive(Debug, Clone)]
pub struct DatabaseManager {
    /// PostgreSQL connection pool
    pool: PgPool,
    /// Database configuration
    config: DatabaseConfig,
}

#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub database_url: String,
    pub max_connections: u32,
    pub min_connections: u32,
    pub connection_timeout_seconds: u64,
    pub idle_timeout_seconds: u64,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgresql://localhost:5432/atlas_financial".to_string()),
            max_connections: 10,
            min_connections: 2,
            connection_timeout_seconds: 30,
            idle_timeout_seconds: 600, // 10 minutes
        }
    }
}

impl DatabaseManager {
    /// Create a new database manager with connection pool
    pub async fn new(database_url: &str) -> Result<Self, FinancialError> {
        let config = DatabaseConfig {
            database_url: database_url.to_string(),
            ..Default::default()
        };

        Self::with_config(config).await
    }

    /// Create with custom configuration
    pub async fn with_config(config: DatabaseConfig) -> Result<Self, FinancialError> {
        let pool = PgPoolOptions::new()
            .max_connections(config.max_connections)
            .min_connections(config.min_connections)
            .acquire_timeout(std::time::Duration::from_secs(config.connection_timeout_seconds))
            .idle_timeout(std::time::Duration::from_secs(config.idle_timeout_seconds))
            .connect(&config.database_url)
            .await
            .map_err(|e| FinancialError::DatabaseError(format!("Failed to connect to database: {}", e)))?;

        // Run migrations on startup
        sqlx::migrate!()
            .run(&pool)
            .await
            .map_err(|e| FinancialError::DatabaseError(format!("Migration failed: {}", e)))?;

        Ok(Self { pool, config })
    }

    /// Get a reference to the connection pool
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// Health check for database connection
    pub async fn health_check(&self) -> Result<(), FinancialError> {
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await
            .map_err(|e| FinancialError::DatabaseError(format!("Health check failed: {}", e)))?;

        Ok(())
    }

    /// Get database statistics
    pub async fn get_stats(&self) -> Result<DatabaseStats, FinancialError> {
        let row = sqlx::query(r#"
            SELECT
                current_database() as database_name,
                current_user as username,
                version() as version,
                now() as current_time
        "#)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| FinancialError::DatabaseError(format!("Failed to get stats: {}", e)))?;

        Ok(DatabaseStats {
            database_name: row.get("database_name"),
            username: row.get("username"),
            version: row.get("version"),
            current_time: row.get("current_time"),
            pool_size: self.pool.size(),
            idle_connections: self.pool.num_idle(),
        })
    }

    /// Execute a transaction with automatic rollback on error
    pub async fn execute_transaction<T, F, Fut>(&self, operation: F) -> Result<T, FinancialError>
    where
        F: FnOnce(sqlx::Transaction<'_, sqlx::Postgres>) -> Fut,
        Fut: std::future::Future<Output = Result<T, FinancialError>>,
    {
        let mut tx = self.pool.begin()
            .await
            .map_err(|e| FinancialError::DatabaseError(format!("Failed to begin transaction: {}", e)))?;

        match operation(tx).await {
            Ok(result) => {
                // Note: This is a placeholder structure - actual implementation would need
                // to handle the transaction commit properly
                Ok(result)
            }
            Err(e) => {
                // Transaction will be automatically rolled back when dropped
                Err(e)
            }
        }
    }

    /// Close the database connection pool
    pub async fn close(&self) {
        self.pool.close().await;
    }
}

// ============================================================================
// Database Statistics
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseStats {
    pub database_name: String,
    pub username: String,
    pub version: String,
    pub current_time: DateTime<Utc>,
    pub pool_size: u32,
    pub idle_connections: u32,
}

// ============================================================================
// Database Operations (Repository Pattern)
// ============================================================================

/// Account repository for database operations
pub struct AccountRepository<'a> {
    db: &'a DatabaseManager,
}

impl<'a> AccountRepository<'a> {
    pub fn new(db: &'a DatabaseManager) -> Self {
        Self { db }
    }

    /// Update an existing account with input validation
    pub async fn update(&self, account_id: &str, account: &CreateAccountRequest) -> Result<Option<AccountRecord>, FinancialError> {
        // Validate account ID is valid UUID
        Uuid::parse_str(account_id)
            .map_err(|_| FinancialError::ValidationError("Invalid account ID format".to_string()))?;

        // Validate input
        InputValidator::validate_account_input(account)?;

        let now = Utc::now();

        // Use parameterized query with validated inputs
        let row = sqlx::query_as!(
            AccountRecord,
            r#"
            UPDATE accounts SET
                name = $2,
                account_type = $3,
                balance = $4,
                currency = $5,
                updated_at = $6,
                institution = $7,
                account_number_masked = $8,
                credit_limit = $9,
                interest_rate = $10
            WHERE id = $1 AND user_id = $11 AND is_active = true
            RETURNING
                id, user_id, name, account_type as "account_type: AccountType",
                balance, currency, is_active, created_at, updated_at,
                institution, account_number_masked, credit_limit, interest_rate
            "#,
            account_id,
            account.name,
            account.account_type as AccountType,
            account.balance,
            account.currency,
            now,
            account.institution,
            account.account_number_masked,
            account.credit_limit,
            account.interest_rate,
            account.user_id
        )
        .fetch_optional(&self.db.pool)
        .await
        .map_err(|e| FinancialError::DatabaseError(format!("Failed to update account: {}", e)))?;

        Ok(row)
    }

    /// Soft delete an account (mark as inactive rather than removing)
    pub async fn soft_delete(&self, account_id: &str, user_id: &str) -> Result<bool, FinancialError> {
        // Validate UUIDs
        Uuid::parse_str(account_id)
            .map_err(|_| FinancialError::ValidationError("Invalid account ID format".to_string()))?;
        Uuid::parse_str(user_id)
            .map_err(|_| FinancialError::ValidationError("Invalid user ID format".to_string()))?;

        let now = Utc::now();

        // Check if account has any transactions before allowing deletion
        let transaction_count = sqlx::query!(
            "SELECT COUNT(*) as count FROM transactions WHERE account_id = $1 AND is_active = true",
            account_id
        )
        .fetch_one(&self.db.pool)
        .await
        .map_err(|e| FinancialError::DatabaseError(format!("Failed to check transaction count: {}", e)))?;

        if transaction_count.count.unwrap_or(0) > 0 {
            return Err(FinancialError::ValidationError(
                "Cannot delete account with existing transactions".to_string()
            ));
        }

        // Use parameterized query to mark as inactive
        let result = sqlx::query!(
            r#"
            UPDATE accounts SET
                is_active = false,
                updated_at = $3
            WHERE id = $1 AND user_id = $2 AND is_active = true
            "#,
            account_id,
            user_id,
            now
        )
        .execute(&self.db.pool)
        .await
        .map_err(|e| FinancialError::DatabaseError(format!("Failed to delete account: {}", e)))?;

        Ok(result.rows_affected() > 0)
    }

    /// Find all accounts for a user
    pub async fn find_by_user_id(&self, user_id: &str) -> Result<Vec<AccountRecord>, FinancialError> {
        let rows = sqlx::query_as!(
            AccountRecord,
            r#"
            SELECT
                id, user_id, name, account_type as "account_type: AccountType",
                balance, currency, is_active, created_at, updated_at,
                institution, account_number_masked, credit_limit, interest_rate
            FROM accounts
            WHERE user_id = $1 AND is_active = true
            ORDER BY name ASC
            "#,
            user_id
        )
        .fetch_all(&self.db.pool)
        .await
        .map_err(|e| FinancialError::DatabaseError(format!("Failed to fetch accounts: {}", e)))?;

        Ok(rows)
    }

    /// Find account by ID
    pub async fn find_by_id(&self, account_id: &str) -> Result<Option<AccountRecord>, FinancialError> {
        let row = sqlx::query_as!(
            AccountRecord,
            r#"
            SELECT
                id, user_id, name, account_type as "account_type: AccountType",
                balance, currency, is_active, created_at, updated_at,
                institution, account_number_masked, credit_limit, interest_rate
            FROM accounts
            WHERE id = $1 AND is_active = true
            "#,
            account_id
        )
        .fetch_optional(&self.db.pool)
        .await
        .map_err(|e| FinancialError::DatabaseError(format!("Failed to fetch account: {}", e)))?;

        Ok(row)
    }

    /// Create a new account with input validation
    pub async fn create(&self, account: &CreateAccountRequest) -> Result<AccountRecord, FinancialError> {
        // Validate all input before database operation
        InputValidator::validate_account_input(account)?;

        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        // Use parameterized query with all validated inputs
        let row = sqlx::query_as!(
            AccountRecord,
            r#"
            INSERT INTO accounts (
                id, user_id, name, account_type, balance, currency,
                is_active, created_at, updated_at, institution,
                account_number_masked, credit_limit, interest_rate
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING
                id, user_id, name, account_type as "account_type: AccountType",
                balance, currency, is_active, created_at, updated_at,
                institution, account_number_masked, credit_limit, interest_rate
            "#,
            id,
            account.user_id,
            account.name,
            account.account_type as AccountType,
            account.balance,
            account.currency,
            true,
            now,
            now,
            account.institution,
            account.account_number_masked,
            account.credit_limit,
            account.interest_rate
        )
        .fetch_one(&self.db.pool)
        .await
        .map_err(|e| FinancialError::DatabaseError(format!("Failed to create account: {}", e)))?;

        Ok(row)
    }
}

/// Transaction repository for database operations
pub struct TransactionRepository<'a> {
    db: &'a DatabaseManager,
}

impl<'a> TransactionRepository<'a> {
    pub fn new(db: &'a DatabaseManager) -> Self {
        Self { db }
    }

    /// Update an existing transaction with input validation
    pub async fn update(&self, transaction_id: &str, transaction: &CreateTransactionRequest) -> Result<Option<TransactionRecord>, FinancialError> {
        // Validate transaction ID is valid UUID
        Uuid::parse_str(transaction_id)
            .map_err(|_| FinancialError::ValidationError("Invalid transaction ID format".to_string()))?;

        // Validate input
        let temp_input = crate::commands::financial::TransactionInput {
            account_id: transaction.account_id.clone(),
            amount: transaction.amount.to_string(),
            description: transaction.description.clone(),
            category: transaction.category.clone(),
            subcategory: transaction.subcategory.clone(),
            transaction_date: transaction.transaction_date,
            transaction_type: transaction.transaction_type,
            merchant: transaction.merchant.clone(),
            location: transaction.location.clone(),
            is_recurring: transaction.is_recurring,
            tags: transaction.tags.clone(),
            notes: transaction.notes.clone(),
        };

        InputValidator::validate_transaction_input(&temp_input)?;

        let now = Utc::now();

        // Use parameterized query with validated inputs
        let row = sqlx::query_as!(
            TransactionRecord,
            r#"
            UPDATE transactions SET
                account_id = $2,
                amount = $3,
                description = $4,
                category = $5,
                subcategory = $6,
                transaction_date = $7,
                updated_at = $8,
                transaction_type = $9,
                merchant = $10,
                location = $11,
                is_recurring = $12,
                tags = $13,
                notes = $14
            WHERE id = $1 AND user_id = $15
            RETURNING
                id, user_id, account_id, amount, description, category,
                subcategory, transaction_date, created_at, updated_at,
                transaction_type as "transaction_type: TransactionType",
                merchant, location, is_recurring, tags, notes, ml_confidence
            "#,
            transaction_id,
            transaction.account_id,
            transaction.amount,
            transaction.description,
            transaction.category,
            transaction.subcategory,
            transaction.transaction_date.unwrap_or(now),
            now,
            transaction.transaction_type as TransactionType,
            transaction.merchant,
            transaction.location,
            transaction.is_recurring.unwrap_or(false),
            &transaction.tags.as_ref().unwrap_or(&vec![]),
            transaction.notes,
            transaction.user_id
        )
        .fetch_optional(&self.db.pool)
        .await
        .map_err(|e| FinancialError::DatabaseError(format!("Failed to update transaction: {}", e)))?;

        Ok(row)
    }

    /// Soft delete a transaction (mark as deleted rather than removing)
    pub async fn soft_delete(&self, transaction_id: &str, user_id: &str) -> Result<bool, FinancialError> {
        // Validate UUIDs
        Uuid::parse_str(transaction_id)
            .map_err(|_| FinancialError::ValidationError("Invalid transaction ID format".to_string()))?;
        Uuid::parse_str(user_id)
            .map_err(|_| FinancialError::ValidationError("Invalid user ID format".to_string()))?;

        let now = Utc::now();

        // Use parameterized query to mark as deleted
        let result = sqlx::query!(
            r#"
            UPDATE transactions SET
                is_active = false,
                updated_at = $3
            WHERE id = $1 AND user_id = $2 AND is_active = true
            "#,
            transaction_id,
            user_id,
            now
        )
        .execute(&self.db.pool)
        .await
        .map_err(|e| FinancialError::DatabaseError(format!("Failed to delete transaction: {}", e)))?;

        Ok(result.rows_affected() > 0)
    }

    /// Find transactions with filtering using secure query builder
    pub async fn find_filtered(
        &self,
        user_id: &str,
        filter: &TransactionFilter,
        limit: i32,
        offset: i32,
    ) -> Result<Vec<TransactionRecord>, FinancialError> {
        // Build secure query with active records filter
        let base_query = r#"
            SELECT
                id, user_id, account_id, amount, description, category,
                subcategory, transaction_date, created_at, updated_at,
                transaction_type, merchant, location, is_recurring,
                tags, notes, ml_confidence, COALESCE(is_active, true) as is_active
            FROM transactions
        "#;

        let mut secure_query = SecureQuery::new(&self.db.pool, base_query);

        // Always filter by user and active status
        secure_query = secure_query.add_where_clause("user_id = $1", user_id.to_string())?;
        secure_query = secure_query.add_where_clause("COALESCE(is_active, true) = $1", true)?;

        // Apply filters if provided
        if let Some(account_ids) = &filter.account_ids {
            if !account_ids.is_empty() {
                secure_query = secure_query.add_in_clause("account_id", account_ids.clone())?;
            }
        }

        if let Some(categories) = &filter.categories {
            if !categories.is_empty() {
                secure_query = secure_query.add_in_clause("category", categories.clone())?;
            }
        }

        if let Some(amount_min) = &filter.amount_min {
            secure_query = secure_query.add_where_clause("amount >= $1", *amount_min)?;
        }

        if let Some(amount_max) = &filter.amount_max {
            secure_query = secure_query.add_where_clause("amount <= $1", *amount_max)?;
        }

        if let Some(date_start) = &filter.date_start {
            secure_query = secure_query.add_where_clause("transaction_date >= $1", *date_start)?;
        }

        if let Some(date_end) = &filter.date_end {
            secure_query = secure_query.add_where_clause("transaction_date <= $1", *date_end)?;
        }

        if let Some(search_text) = &filter.search_text {
            if !search_text.trim().is_empty() {
                InputValidator::validate_string_field(search_text, 200, "search text")?;
                let pattern = format!("%{}%", search_text.trim());
                secure_query = secure_query.add_where_clause(
                    "(description ILIKE $1 OR merchant ILIKE $1 OR notes ILIKE $1)",
                    pattern
                )?;
            }
        }

        // Add ordering and pagination
        secure_query = secure_query
            .add_order_by("transaction_date", OrderDirection::Desc)?
            .add_order_by("created_at", OrderDirection::Desc)?
            .add_pagination(limit, offset)?;

        // Execute the secure query
        secure_query.fetch_all().await
    }

    /// Create a new transaction with input validation
    pub async fn create(&self, transaction: &CreateTransactionRequest) -> Result<TransactionRecord, FinancialError> {
        // Validate all input before database operation
        let temp_input = crate::commands::financial::TransactionInput {
            account_id: transaction.account_id.clone(),
            amount: transaction.amount.to_string(),
            description: transaction.description.clone(),
            category: transaction.category.clone(),
            subcategory: transaction.subcategory.clone(),
            transaction_date: transaction.transaction_date,
            transaction_type: transaction.transaction_type,
            merchant: transaction.merchant.clone(),
            location: transaction.location.clone(),
            is_recurring: transaction.is_recurring,
            tags: transaction.tags.clone(),
            notes: transaction.notes.clone(),
        };

        InputValidator::validate_transaction_input(&temp_input)?;

        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        // Use parameterized query with all validated inputs
        let row = sqlx::query_as!(
            TransactionRecord,
            r#"
            INSERT INTO transactions (
                id, user_id, account_id, amount, description, category,
                subcategory, transaction_date, created_at, updated_at,
                transaction_type, merchant, location, is_recurring,
                tags, notes, ml_confidence, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING
                id, user_id, account_id, amount, description, category,
                subcategory, transaction_date, created_at, updated_at,
                transaction_type as "transaction_type: TransactionType",
                merchant, location, is_recurring, tags, notes, ml_confidence, is_active
            "#,
            id,
            transaction.user_id,
            transaction.account_id,
            transaction.amount,
            transaction.description,
            transaction.category,
            transaction.subcategory,
            transaction.transaction_date.unwrap_or(now),
            now,
            now,
            transaction.transaction_type as TransactionType,
            transaction.merchant,
            transaction.location,
            transaction.is_recurring.unwrap_or(false),
            &transaction.tags.as_ref().unwrap_or(&vec![]),
            transaction.notes,
            transaction.ml_confidence,
            true // is_active
        )
        .fetch_one(&self.db.pool)
        .await
        .map_err(|e| FinancialError::DatabaseError(format!("Failed to create transaction: {}", e)))?;

        Ok(row)
    }
}

// ============================================================================
// Database Record Types
// ============================================================================

#[derive(Debug, sqlx::FromRow, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountRecord {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub account_type: AccountType,
    pub balance: Decimal,
    pub currency: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub institution: Option<String>,
    pub account_number_masked: Option<String>,
    pub credit_limit: Option<Decimal>,
    pub interest_rate: Option<Decimal>,
}

#[derive(Debug, sqlx::FromRow, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionRecord {
    pub id: String,
    pub user_id: String,
    pub account_id: String,
    pub amount: Decimal,
    pub description: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub transaction_date: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub transaction_type: TransactionType,
    pub merchant: Option<String>,
    pub location: Option<String>,
    pub is_recurring: bool,
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub ml_confidence: Option<f64>,
    #[serde(default = "default_true")]
    pub is_active: bool,
}

fn default_true() -> bool {
    true
}

// ============================================================================
// Database Types (matching PostgreSQL enums)
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type, Serialize, Deserialize)]
#[sqlx(type_name = "account_type", rename_all = "snake_case")]
#[serde(rename_all = "camelCase")]
pub enum AccountType {
    Checking,
    Savings,
    CreditCard,
    Investment,
    Retirement,
    Loan,
    Mortgage,
    Cash,
    Other,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type, Serialize, Deserialize)]
#[sqlx(type_name = "transaction_type", rename_all = "snake_case")]
#[serde(rename_all = "camelCase")]
pub enum TransactionType {
    Debit,
    Credit,
    Transfer,
    Fee,
    Interest,
    Dividend,
    Withdrawal,
    Deposit,
}

// ============================================================================
// Request Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAccountRequest {
    pub user_id: String,
    pub name: String,
    pub account_type: AccountType,
    pub balance: Decimal,
    pub currency: String,
    pub institution: Option<String>,
    pub account_number_masked: Option<String>,
    pub credit_limit: Option<Decimal>,
    pub interest_rate: Option<Decimal>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTransactionRequest {
    pub user_id: String,
    pub account_id: String,
    pub amount: Decimal,
    pub description: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub transaction_date: Option<DateTime<Utc>>,
    pub transaction_type: TransactionType,
    pub merchant: Option<String>,
    pub location: Option<String>,
    pub is_recurring: Option<bool>,
    pub tags: Option<Vec<String>>,
    pub notes: Option<String>,
    pub ml_confidence: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionFilter {
    pub account_ids: Option<Vec<String>>,
    pub categories: Option<Vec<String>>,
    pub amount_min: Option<Decimal>,
    pub amount_max: Option<Decimal>,
    pub date_start: Option<DateTime<Utc>>,
    pub date_end: Option<DateTime<Utc>>,
    pub transaction_types: Option<Vec<TransactionType>>,
    pub merchants: Option<Vec<String>>,
    pub search_text: Option<String>,
}

// ============================================================================
// Migration Support
// ============================================================================

/// Database migration utilities
pub struct MigrationManager;

impl MigrationManager {
    /// Run all pending migrations
    pub async fn migrate(pool: &PgPool) -> Result<(), FinancialError> {
        sqlx::migrate!("migrations")
            .run(pool)
            .await
            .map_err(|e| FinancialError::DatabaseError(format!("Migration failed: {}", e)))?;

        Ok(())
    }

    /// Check migration status
    pub async fn status(pool: &PgPool) -> Result<Vec<MigrationInfo>, FinancialError> {
        let rows = sqlx::query!(
            "SELECT version, description, installed_on FROM _sqlx_migrations ORDER BY version"
        )
        .fetch_all(pool)
        .await
        .map_err(|e| FinancialError::DatabaseError(format!("Failed to check migration status: {}", e)))?;

        let migrations = rows
            .into_iter()
            .map(|row| MigrationInfo {
                version: row.version,
                description: row.description,
                installed_on: row.installed_on,
            })
            .collect();

        Ok(migrations)
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationInfo {
    pub version: i64,
    pub description: String,
    pub installed_on: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_database_config_default() {
        let config = DatabaseConfig::default();
        assert_eq!(config.max_connections, 10);
        assert_eq!(config.min_connections, 2);
        assert_eq!(config.connection_timeout_seconds, 30);
    }

    #[test]
    fn test_account_type_serialization() {
        let account_type = AccountType::Checking;
        let json = serde_json::to_string(&account_type).unwrap();
        assert_eq!(json, "\"checking\"");

        let deserialized: AccountType = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, AccountType::Checking);
    }
}
