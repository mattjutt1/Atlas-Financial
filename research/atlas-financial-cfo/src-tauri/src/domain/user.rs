use chrono::{DateTime, Utc};
use secrecy::{ExposeSecret, Secret};
use serde::{Deserialize, Serialize};
use zeroize::Zeroize;

use super::value_objects::{EntityId, Timestamp};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: EntityId,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: Secret<String>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
    pub last_login: Option<Timestamp>,
    pub is_active: bool,
}

impl User {
    pub fn new(username: String, email: String, password_hash: String) -> Self {
        let now = Timestamp::now();
        Self {
            id: EntityId::new(),
            username,
            email,
            password_hash: Secret::new(password_hash),
            created_at: now,
            updated_at: now,
            last_login: None,
            is_active: true,
        }
    }

    pub fn verify_password(&self, password: &str) -> Result<bool, crate::error::AppError> {
        bcrypt::verify(password, self.password_hash.expose_secret())
            .map_err(|e| crate::error::AppError::Authentication {
                message: format!("Password verification failed: {}", e),
            })
    }

    pub fn update_last_login(&mut self) {
        self.last_login = Some(Timestamp::now());
        self.updated_at = Timestamp::now();
    }

    pub fn change_password(&mut self, new_password_hash: String) {
        self.password_hash = Secret::new(new_password_hash);
        self.updated_at = Timestamp::now();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Zeroize)]
pub struct LoginCredentials {
    pub username: String,
    #[zeroize(skip)]
    pub password: Secret<String>,
}

impl LoginCredentials {
    pub fn new(username: String, password: String) -> Self {
        Self {
            username,
            password: Secret::new(password),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSession {
    pub user_id: EntityId,
    pub username: String,
    pub email: String,
    pub created_at: Timestamp,
    pub expires_at: Timestamp,
}

impl UserSession {
    pub fn new(user: &User, duration_hours: i64) -> Self {
        let now = Utc::now();
        let expires_at = now + chrono::Duration::hours(duration_hours);

        Self {
            user_id: user.id,
            username: user.username.clone(),
            email: user.email.clone(),
            created_at: Timestamp::now(),
            expires_at: Timestamp::from_datetime(expires_at),
        }
    }

    pub fn is_expired(&self) -> bool {
        Utc::now() > self.expires_at.as_datetime()
    }
}
