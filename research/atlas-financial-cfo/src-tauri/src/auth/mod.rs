pub mod service;
pub mod session;

use bcrypt::{hash, DEFAULT_COST};
use secrecy::{ExposeSecret, Secret};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::domain::{User, UserSession, LoginCredentials, EntityId, Timestamp};
use crate::error::{AppError, AppResult};

pub use service::*;
pub use session::*;

#[derive(Clone)]
pub struct AuthService {
    sessions: Arc<RwLock<HashMap<String, UserSession>>>,
    user_repository: Arc<crate::database::UserRepository>,
}

impl AuthService {
    pub fn new(user_repository: Arc<crate::database::UserRepository>) -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            user_repository,
        }
    }

    pub async fn register_user(
        &self,
        username: String,
        email: String,
        password: String,
    ) -> AppResult<User> {
        // Validate inputs
        self.validate_registration(&username, &email, &password).await?;

        // Hash password
        let password_hash = hash(password.as_bytes(), DEFAULT_COST)
            .map_err(|e| AppError::Authentication {
                message: format!("Password hashing failed: {}", e),
            })?;

        // Create user
        let user = User::new(username, email, password_hash);

        // Store in database
        self.user_repository.create(&user).await?;

        Ok(user)
    }

    pub async fn authenticate(
        &self,
        credentials: LoginCredentials,
    ) -> AppResult<UserSession> {
        // Find user by username
        let user = self
            .user_repository
            .find_by_username(&credentials.username)
            .await?
            .ok_or_else(|| AppError::Authentication {
                message: "Invalid credentials".to_string(),
            })?;

        // Verify password
        if !user.verify_password(credentials.password.expose_secret())? {
            return Err(AppError::Authentication {
                message: "Invalid credentials".to_string(),
            });
        }

        // Update last login
        let mut updated_user = user.clone();
        updated_user.update_last_login();
        self.user_repository.update(&updated_user).await?;

        // Create session
        let session = UserSession::new(&user, 24); // 24 hour session
        let session_token = Uuid::new_v4().to_string();

        // Store session
        {
            let mut sessions = self.sessions.write().await;
            sessions.insert(session_token.clone(), session.clone());
        }

        Ok(session)
    }

    pub async fn verify_session(&self, session_token: &str) -> AppResult<UserSession> {
        let sessions = self.sessions.read().await;

        match sessions.get(session_token) {
            Some(session) => {
                if session.is_expired() {
                    drop(sessions);
                    self.logout(session_token).await?;
                    Err(AppError::Authentication {
                        message: "Session expired".to_string(),
                    })
                } else {
                    Ok(session.clone())
                }
            }
            None => Err(AppError::Authentication {
                message: "Invalid session".to_string(),
            }),
        }
    }

    pub async fn logout(&self, session_token: &str) -> AppResult<()> {
        let mut sessions = self.sessions.write().await;
        sessions.remove(session_token);
        Ok(())
    }

    pub async fn get_user_by_session(&self, session_token: &str) -> AppResult<User> {
        let session = self.verify_session(session_token).await?;
        self.user_repository
            .find_by_id(session.user_id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                resource: "User".to_string(),
            })
    }

    async fn validate_registration(
        &self,
        username: &str,
        email: &str,
        password: &str,
    ) -> AppResult<()> {
        // Username validation
        if username.len() < 3 || username.len() > 50 {
            return Err(AppError::Validation {
                message: "Username must be between 3 and 50 characters".to_string(),
            });
        }

        if !username.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
            return Err(AppError::Validation {
                message: "Username can only contain alphanumeric characters, underscores, and hyphens".to_string(),
            });
        }

        // Email validation
        if !email.contains('@') || !email.contains('.') {
            return Err(AppError::Validation {
                message: "Invalid email format".to_string(),
            });
        }

        // Password validation
        if password.len() < 8 {
            return Err(AppError::Validation {
                message: "Password must be at least 8 characters long".to_string(),
            });
        }

        // Check for existing username/email
        if self.user_repository.exists_by_username(username).await? {
            return Err(AppError::Validation {
                message: "Username already exists".to_string(),
            });
        }

        if self.user_repository.exists_by_email(email).await? {
            return Err(AppError::Validation {
                message: "Email already exists".to_string(),
            });
        }

        Ok(())
    }

    /// Clean up expired sessions
    pub async fn cleanup_expired_sessions(&self) {
        let mut sessions = self.sessions.write().await;
        sessions.retain(|_, session| !session.is_expired());
    }
}
