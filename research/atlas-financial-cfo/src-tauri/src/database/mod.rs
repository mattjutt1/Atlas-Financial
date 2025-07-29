pub mod connection;
pub mod migrations;
pub mod repositories;

use anyhow::Result;
use sqlx::{Pool, Sqlite, SqlitePool};
use std::path::PathBuf;
use tauri::api::path::app_data_dir;
use tracing::{info, warn};

use crate::error::{AppError, AppResult};

pub use connection::*;
pub use repositories::*;

#[derive(Clone)]
pub struct Database {
    pool: Pool<Sqlite>,
}

impl Database {
    pub async fn new() -> AppResult<Self> {
        let db_path = Self::get_database_path()?;

        // Ensure directory exists
        if let Some(parent) = db_path.parent() {
            tokio::fs::create_dir_all(parent).await.map_err(|e| {
                AppError::Database {
                    message: format!("Failed to create database directory: {}", e),
                }
            })?;
        }

        let connection_string = format!("sqlite://{}?mode=rwc", db_path.display());

        info!("Connecting to database at: {}", db_path.display());

        let pool = SqlitePool::connect(&connection_string).await.map_err(|e| {
            AppError::Database {
                message: format!("Failed to connect to database: {}", e),
            }
        })?;

        // Enable foreign keys and WAL mode for better performance
        sqlx::query("PRAGMA foreign_keys = ON")
            .execute(&pool)
            .await?;

        sqlx::query("PRAGMA journal_mode = WAL")
            .execute(&pool)
            .await?;

        sqlx::query("PRAGMA synchronous = NORMAL")
            .execute(&pool)
            .await?;

        let database = Self { pool };

        // Run migrations
        database.migrate().await?;

        info!("Database initialized successfully");

        Ok(database)
    }

    fn get_database_path() -> AppResult<PathBuf> {
        let mut path = app_data_dir(&tauri::Config::default())
            .ok_or_else(|| AppError::Database {
                message: "Failed to get app data directory".to_string(),
            })?;

        path.push("atlas-financial");
        path.push("atlas_financial.db");

        Ok(path)
    }

    pub async fn migrate(&self) -> AppResult<()> {
        info!("Running database migrations");

        // Create migrations table if it doesn't exist
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS _migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version TEXT NOT NULL UNIQUE,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Run migrations in order
        migrations::run_migrations(&self.pool).await?;

        info!("Database migrations completed");
        Ok(())
    }

    pub fn pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }

    pub async fn health_check(&self) -> AppResult<()> {
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Database {
                message: format!("Health check failed: {}", e),
            })?;
        Ok(())
    }

    pub async fn close(&self) {
        self.pool.close().await;
        info!("Database connection closed");
    }
}
