use chrono::{DateTime, Utc};
use secrecy::Secret;
use sqlx::{Pool, Sqlite};

use crate::domain::{User, EntityId, Timestamp};
use crate::error::{AppError, AppResult};

#[derive(Clone)]
pub struct UserRepository {
    pool: Pool<Sqlite>,
}

impl UserRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn create(&self, user: &User) -> AppResult<()> {
        sqlx::query(
            r#"
            INSERT INTO users (id, username, email, password_hash, created_at, updated_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(user.id.to_string())
        .bind(&user.username)
        .bind(&user.email)
        .bind(user.password_hash.expose_secret())
        .bind(user.created_at.as_datetime())
        .bind(user.updated_at.as_datetime())
        .bind(user.is_active)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn find_by_id(&self, id: EntityId) -> AppResult<Option<User>> {
        let row = sqlx::query!(
            r#"
            SELECT id, username, email, password_hash, created_at, updated_at, last_login, is_active
            FROM users
            WHERE id = ?
            "#,
            id.to_string()
        )
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(row) => {
                let user = User {
                    id: EntityId::from_uuid(uuid::Uuid::parse_str(&row.id).map_err(|e| {
                        AppError::Database {
                            message: format!("Invalid UUID: {}", e),
                        }
                    })?),
                    username: row.username,
                    email: row.email,
                    password_hash: Secret::new(row.password_hash),
                    created_at: Timestamp::from_datetime(row.created_at),
                    updated_at: Timestamp::from_datetime(row.updated_at),
                    last_login: row.last_login.map(Timestamp::from_datetime),
                    is_active: row.is_active,
                };
                Ok(Some(user))
            }
            None => Ok(None),
        }
    }

    pub async fn find_by_username(&self, username: &str) -> AppResult<Option<User>> {
        let row = sqlx::query!(
            r#"
            SELECT id, username, email, password_hash, created_at, updated_at, last_login, is_active
            FROM users
            WHERE username = ? AND is_active = 1
            "#,
            username
        )
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(row) => {
                let user = User {
                    id: EntityId::from_uuid(uuid::Uuid::parse_str(&row.id).map_err(|e| {
                        AppError::Database {
                            message: format!("Invalid UUID: {}", e),
                        }
                    })?),
                    username: row.username,
                    email: row.email,
                    password_hash: Secret::new(row.password_hash),
                    created_at: Timestamp::from_datetime(row.created_at),
                    updated_at: Timestamp::from_datetime(row.updated_at),
                    last_login: row.last_login.map(Timestamp::from_datetime),
                    is_active: row.is_active,
                };
                Ok(Some(user))
            }
            None => Ok(None),
        }
    }

    pub async fn find_by_email(&self, email: &str) -> AppResult<Option<User>> {
        let row = sqlx::query!(
            r#"
            SELECT id, username, email, password_hash, created_at, updated_at, last_login, is_active
            FROM users
            WHERE email = ? AND is_active = 1
            "#,
            email
        )
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(row) => {
                let user = User {
                    id: EntityId::from_uuid(uuid::Uuid::parse_str(&row.id).map_err(|e| {
                        AppError::Database {
                            message: format!("Invalid UUID: {}", e),
                        }
                    })?),
                    username: row.username,
                    email: row.email,
                    password_hash: Secret::new(row.password_hash),
                    created_at: Timestamp::from_datetime(row.created_at),
                    updated_at: Timestamp::from_datetime(row.updated_at),
                    last_login: row.last_login.map(Timestamp::from_datetime),
                    is_active: row.is_active,
                };
                Ok(Some(user))
            }
            None => Ok(None),
        }
    }

    pub async fn update(&self, user: &User) -> AppResult<()> {
        let affected = sqlx::query(
            r#"
            UPDATE users
            SET username = ?, email = ?, password_hash = ?, updated_at = ?,
                last_login = ?, is_active = ?
            WHERE id = ?
            "#,
        )
        .bind(&user.username)
        .bind(&user.email)
        .bind(user.password_hash.expose_secret())
        .bind(user.updated_at.as_datetime())
        .bind(user.last_login.map(|t| t.as_datetime()))
        .bind(user.is_active)
        .bind(user.id.to_string())
        .execute(&self.pool)
        .await?
        .rows_affected();

        if affected == 0 {
            return Err(AppError::NotFound {
                resource: "User".to_string(),
            });
        }

        Ok(())
    }

    pub async fn delete(&self, id: EntityId) -> AppResult<()> {
        let affected = sqlx::query("DELETE FROM users WHERE id = ?")
            .bind(id.to_string())
            .execute(&self.pool)
            .await?
            .rows_affected();

        if affected == 0 {
            return Err(AppError::NotFound {
                resource: "User".to_string(),
            });
        }

        Ok(())
    }

    pub async fn exists_by_username(&self, username: &str) -> AppResult<bool> {
        let count: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE username = ?")
            .bind(username)
            .fetch_one(&self.pool)
            .await?;

        Ok(count > 0)
    }

    pub async fn exists_by_email(&self, email: &str) -> AppResult<bool> {
        let count: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE email = ?")
            .bind(email)
            .fetch_one(&self.pool)
            .await?;

        Ok(count > 0)
    }
}
