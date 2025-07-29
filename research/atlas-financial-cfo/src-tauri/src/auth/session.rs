use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::domain::{EntityId, Timestamp, UserSession};
use crate::error::{AppError, AppResult};

/// Session manager for handling user sessions and security
#[derive(Clone)]
pub struct SessionManager {
    sessions: Arc<RwLock<HashMap<String, SessionData>>>,
    max_sessions_per_user: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionData {
    pub session: UserSession,
    pub session_token: String,
    pub last_activity: Timestamp,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            max_sessions_per_user: 5, // Maximum concurrent sessions per user
        }
    }

    /// Create a new session
    pub async fn create_session(
        &self,
        session: UserSession,
        session_token: String,
        ip_address: Option<String>,
        user_agent: Option<String>,
    ) -> AppResult<()> {
        let mut sessions = self.sessions.write().await;

        // Check session limit per user
        let user_session_count = sessions
            .values()
            .filter(|s| s.session.user_id == session.user_id)
            .count();

        if user_session_count >= self.max_sessions_per_user {
            // Remove oldest session for this user
            let oldest_token = sessions
                .iter()
                .filter(|(_, s)| s.session.user_id == session.user_id)
                .min_by_key(|(_, s)| s.last_activity.as_datetime())
                .map(|(token, _)| token.clone());

            if let Some(token) = oldest_token {
                sessions.remove(&token);
            }
        }

        let session_data = SessionData {
            session,
            session_token: session_token.clone(),
            last_activity: Timestamp::now(),
            ip_address,
            user_agent,
        };

        sessions.insert(session_token, session_data);
        Ok(())
    }

    /// Verify and update session activity
    pub async fn verify_session(&self, session_token: &str) -> AppResult<UserSession> {
        let mut sessions = self.sessions.write().await;

        match sessions.get_mut(session_token) {
            Some(session_data) => {
                if session_data.session.is_expired() {
                    sessions.remove(session_token);
                    return Err(AppError::Authentication {
                        message: "Session expired".to_string(),
                    });
                }

                // Update last activity
                session_data.last_activity = Timestamp::now();
                Ok(session_data.session.clone())
            }
            None => Err(AppError::Authentication {
                message: "Invalid session".to_string(),
            }),
        }
    }

    /// Remove a session
    pub async fn remove_session(&self, session_token: &str) -> AppResult<()> {
        let mut sessions = self.sessions.write().await;
        sessions.remove(session_token);
        Ok(())
    }

    /// Remove all sessions for a user
    pub async fn remove_user_sessions(&self, user_id: EntityId) -> AppResult<()> {
        let mut sessions = self.sessions.write().await;
        sessions.retain(|_, session_data| session_data.session.user_id != user_id);
        Ok(())
    }

    /// Get active sessions for a user
    pub async fn get_user_sessions(&self, user_id: EntityId) -> AppResult<Vec<SessionData>> {
        let sessions = self.sessions.read().await;
        let user_sessions = sessions
            .values()
            .filter(|s| s.session.user_id == user_id && !s.session.is_expired())
            .cloned()
            .collect();
        Ok(user_sessions)
    }

    /// Clean up expired sessions
    pub async fn cleanup_expired_sessions(&self) -> usize {
        let mut sessions = self.sessions.write().await;
        let initial_count = sessions.len();
        sessions.retain(|_, session_data| !session_data.session.is_expired());
        initial_count - sessions.len()
    }

    /// Get session statistics
    pub async fn get_session_stats(&self) -> SessionStats {
        let sessions = self.sessions.read().await;
        let active_sessions = sessions.len();
        let unique_users = sessions
            .values()
            .map(|s| s.session.user_id)
            .collect::<std::collections::HashSet<_>>()
            .len();

        SessionStats {
            active_sessions,
            unique_users,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionStats {
    pub active_sessions: usize,
    pub unique_users: usize,
}
