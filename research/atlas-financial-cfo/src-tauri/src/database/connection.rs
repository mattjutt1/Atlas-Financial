use sqlx::{Pool, Sqlite};
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::error::{AppError, AppResult};

/// Database connection manager with connection pooling
#[derive(Clone)]
pub struct DatabaseConnection {
    pool: Pool<Sqlite>,
    encryption_key: Arc<RwLock<Option<String>>>,
}

impl DatabaseConnection {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self {
            pool,
            encryption_key: Arc::new(RwLock::new(None)),
        }
    }

    pub fn pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }

    /// Set encryption key for database operations
    pub async fn set_encryption_key(&self, key: String) -> AppResult<()> {
        let mut encryption_key = self.encryption_key.write().await;
        *encryption_key = Some(key);

        // Apply encryption key to database
        sqlx::query(&format!("PRAGMA key = '{}'", &key))
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Encryption {
                message: format!("Failed to set encryption key: {}", e),
            })?;

        Ok(())
    }

    /// Check if encryption key is set
    pub async fn has_encryption_key(&self) -> bool {
        let encryption_key = self.encryption_key.read().await;
        encryption_key.is_some()
    }

    /// Clear encryption key (for logout)
    pub async fn clear_encryption_key(&self) {
        let mut encryption_key = self.encryption_key.write().await;
        *encryption_key = None;
    }

    /// Test database connectivity
    pub async fn test_connection(&self) -> AppResult<()> {
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Database {
                message: format!("Connection test failed: {}", e),
            })?;
        Ok(())
    }

    /// Execute a raw SQL query (for migrations)
    pub async fn execute_raw(&self, sql: &str) -> AppResult<()> {
        sqlx::query(sql)
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Database {
                message: format!("Failed to execute query: {}", e),
            })?;
        Ok(())
    }

    /// Begin a database transaction
    pub async fn begin_transaction(&self) -> AppResult<sqlx::Transaction<'_, Sqlite>> {
        self.pool
            .begin()
            .await
            .map_err(|e| AppError::Database {
                message: format!("Failed to begin transaction: {}", e),
            })
    }
}
