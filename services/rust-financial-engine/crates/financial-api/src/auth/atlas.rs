/// Atlas Financial API integration for user validation and session management

use crate::auth::claims::{UserClaims, UserRole};
use crate::error::{ApiError, ApiResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::{debug, error, warn};
use uuid::Uuid;

/// Atlas API client for user authentication and management
#[derive(Clone)]
pub struct AtlasApiClient {
    client: reqwest::Client,
    base_url: String,
    api_key: String,
}

/// Atlas user information response
#[derive(Debug, Deserialize)]
pub struct AtlasUser {
    pub id: String,
    pub email: String,
    pub name: String,
    pub role: String,
    pub verified: bool,
    pub created_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
    pub permissions: Vec<String>,
    pub organization_id: Option<String>,
    pub subscription_status: String,
}

/// Atlas session validation response
#[derive(Debug, Deserialize)]
pub struct AtlasSession {
    pub session_id: String,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub is_active: bool,
    pub device_info: Option<String>,
    pub ip_address: Option<String>,
}

/// Atlas API error response
#[derive(Debug, Deserialize)]
pub struct AtlasApiError {
    pub error: String,
    pub message: String,
    pub code: Option<String>,
}

/// Atlas user session creation request
#[derive(Debug, Serialize)]
pub struct CreateSessionRequest {
    pub user_id: String,
    pub device_info: Option<String>,
    pub ip_address: Option<String>,
}

/// Atlas user validation request
#[derive(Debug, Serialize)]
pub struct ValidateUserRequest {
    pub user_id: String,
    pub session_id: Option<String>,
}

impl AtlasApiClient {
    /// Create a new Atlas API client
    pub fn new(base_url: String, api_key: String) -> ApiResult<Self> {
        if api_key.is_empty() {
            return Err(ApiError::ConfigurationError {
                message: "Atlas API key cannot be empty".to_string(),
            });
        }

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("Atlas-Financial-Engine/1.0")
            .build()
            .map_err(|e| ApiError::ConfigurationError {
                message: format!("Failed to create HTTP client: {}", e),
            })?;

        Ok(Self {
            client,
            base_url,
            api_key,
        })
    }

    /// Validate user credentials and get user information
    pub async fn validate_user(&self, user_id: &str) -> ApiResult<AtlasUser> {
        debug!("Validating user with Atlas API: {}", user_id);

        let url = format!("{}/api/v1/users/{}", self.base_url, user_id);
        
        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .send()
            .await
            .map_err(|e| {
                error!("Failed to call Atlas API: {}", e);
                ApiError::AtlasApiError {
                    message: format!("Request failed: {}", e),
                }
            })?;

        if response.status().is_success() {
            let user: AtlasUser = response.json().await.map_err(|e| {
                error!("Failed to parse Atlas API response: {}", e);
                ApiError::AtlasApiError {
                    message: "Invalid response format".to_string(),
                }
            })?;

            debug!("Successfully validated user: {}", user.email);
            Ok(user)
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            
            warn!("Atlas API returned error {}: {}", status, error_text);
            
            match status.as_u16() {
                404 => Err(ApiError::UserNotFound { id: user_id.to_string() }),
                401 => Err(ApiError::AuthenticationFailed {
                    message: "Invalid API credentials".to_string(),
                }),
                403 => Err(ApiError::AuthorizationFailed {
                    message: "Insufficient API permissions".to_string(),
                }),
                _ => Err(ApiError::AtlasApiError {
                    message: format!("API error {}: {}", status, error_text),
                }),
            }
        }
    }

    /// Validate a user session
    pub async fn validate_session(&self, session_id: &str) -> ApiResult<AtlasSession> {
        debug!("Validating session with Atlas API: {}", session_id);

        let url = format!("{}/api/v1/sessions/{}", self.base_url, session_id);
        
        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .send()
            .await
            .map_err(|e| {
                error!("Failed to call Atlas API for session validation: {}", e);
                ApiError::AtlasApiError {
                    message: format!("Session validation failed: {}", e),
                }
            })?;

        if response.status().is_success() {
            let session: AtlasSession = response.json().await.map_err(|e| {
                error!("Failed to parse session response: {}", e);
                ApiError::AtlasApiError {
                    message: "Invalid session response format".to_string(),
                }
            })?;

            if !session.is_active {
                return Err(ApiError::InvalidToken {
                    reason: "Session is not active".to_string(),
                });
            }

            if session.expires_at < Utc::now() {
                return Err(ApiError::TokenExpired);
            }

            debug!("Successfully validated session for user: {}", session.user_id);
            Ok(session)
        } else {
            let status = response.status();
            warn!("Session validation failed with status: {}", status);
            
            match status.as_u16() {
                404 => Err(ApiError::InvalidToken {
                    reason: "Session not found".to_string(),
                }),
                401 => Err(ApiError::AuthenticationFailed {
                    message: "Invalid API credentials".to_string(),
                }),
                _ => Err(ApiError::AtlasApiError {
                    message: format!("Session validation error: {}", status),
                }),
            }
        }
    }

    /// Create a new user session
    pub async fn create_session(&self, user_id: &str, device_info: Option<String>, ip_address: Option<String>) -> ApiResult<AtlasSession> {
        debug!("Creating session for user: {}", user_id);

        let url = format!("{}/api/v1/sessions", self.base_url);
        let request = CreateSessionRequest {
            user_id: user_id.to_string(),
            device_info,
            ip_address,
        };

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| {
                error!("Failed to create session: {}", e);
                ApiError::AtlasApiError {
                    message: format!("Session creation failed: {}", e),
                }
            })?;

        if response.status().is_success() {
            let session: AtlasSession = response.json().await.map_err(|e| {
                error!("Failed to parse session creation response: {}", e);
                ApiError::AtlasApiError {
                    message: "Invalid session creation response".to_string(),
                }
            })?;

            debug!("Successfully created session: {}", session.session_id);
            Ok(session)
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            
            error!("Session creation failed {}: {}", status, error_text);
            Err(ApiError::AtlasApiError {
                message: format!("Session creation error {}: {}", status, error_text),
            })
        }
    }

    /// Invalidate a user session
    pub async fn invalidate_session(&self, session_id: &str) -> ApiResult<()> {
        debug!("Invalidating session: {}", session_id);

        let url = format!("{}/api/v1/sessions/{}", self.base_url, session_id);
        
        let response = self
            .client
            .delete(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map_err(|e| {
                error!("Failed to invalidate session: {}", e);
                ApiError::AtlasApiError {
                    message: format!("Session invalidation failed: {}", e),
                }
            })?;

        if response.status().is_success() {
            debug!("Successfully invalidated session: {}", session_id);
            Ok(())
        } else {
            let status = response.status();
            warn!("Session invalidation failed with status: {}", status);
            
            // Treat 404 as success (session already doesn't exist)
            if status.as_u16() == 404 {
                Ok(())
            } else {
                Err(ApiError::AtlasApiError {
                    message: format!("Session invalidation error: {}", status),
                })
            }
        }
    }

    /// Get user permissions from Atlas API
    pub async fn get_user_permissions(&self, user_id: &str) -> ApiResult<Vec<String>> {
        debug!("Fetching permissions for user: {}", user_id);

        let url = format!("{}/api/v1/users/{}/permissions", self.base_url, user_id);
        
        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map_err(|e| {
                error!("Failed to fetch user permissions: {}", e);
                ApiError::AtlasApiError {
                    message: format!("Permission fetch failed: {}", e),
                }
            })?;

        if response.status().is_success() {
            #[derive(Deserialize)]
            struct PermissionsResponse {
                permissions: Vec<String>,
            }

            let permissions_response: PermissionsResponse = response.json().await.map_err(|e| {
                error!("Failed to parse permissions response: {}", e);
                ApiError::AtlasApiError {
                    message: "Invalid permissions response format".to_string(),
                }
            })?;

            debug!(
                "Successfully fetched {} permissions for user: {}",
                permissions_response.permissions.len(),
                user_id
            );
            Ok(permissions_response.permissions)
        } else {
            let status = response.status();
            warn!("Permission fetch failed with status: {}", status);
            
            match status.as_u16() {
                404 => Err(ApiError::UserNotFound { id: user_id.to_string() }),
                403 => Ok(vec![]), // User exists but has no permissions
                _ => Err(ApiError::AtlasApiError {
                    message: format!("Permission fetch error: {}", status),
                }),
            }
        }
    }
}

/// Convert Atlas user to JWT user claims
impl AtlasUser {
    pub fn to_user_claims(&self) -> ApiResult<UserClaims> {
        let role = match self.role.as_str() {
            "user" => UserRole::User,
            "premium" => UserRole::Premium,
            "advisor" => UserRole::Advisor,
            "admin" => UserRole::Admin,
            "super_admin" => UserRole::SuperAdmin,
            _ => {
                warn!("Unknown user role: {}, defaulting to User", self.role);
                UserRole::User
            }
        };

        Ok(UserClaims {
            id: self.id.clone(),
            email: self.email.clone(),
            name: self.name.clone(),
            role,
            verified: self.verified,
            created_at: self.created_at,
            last_login: self.last_login,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockito::{Mock, Server};

    #[tokio::test]
    async fn test_atlas_client_creation() {
        let client = AtlasApiClient::new(
            "https://api.atlas-financial.com".to_string(),
            "test-api-key".to_string(),
        );
        assert!(client.is_ok());

        let client_empty_key = AtlasApiClient::new(
            "https://api.atlas-financial.com".to_string(),
            "".to_string(),
        );
        assert!(client_empty_key.is_err());
    }

    #[tokio::test]
    async fn test_user_validation() {
        let mut server = Server::new_async().await;
        let client = AtlasApiClient::new(server.url(), "test-key".to_string()).unwrap();

        let mock = server
            .mock("GET", "/api/v1/users/123")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(
                r#"{
                    "id": "123",
                    "email": "test@example.com",
                    "name": "Test User",
                    "role": "user",
                    "verified": true,
                    "created_at": "2023-01-01T00:00:00Z",
                    "last_login": "2023-01-01T00:00:00Z",
                    "permissions": ["portfolio:read"],
                    "organization_id": null,
                    "subscription_status": "active"
                }"#,
            )
            .create_async()
            .await;

        let result = client.validate_user("123").await;
        assert!(result.is_ok());

        let user = result.unwrap();
        assert_eq!(user.id, "123");
        assert_eq!(user.email, "test@example.com");
        assert_eq!(user.role, "user");

        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_user_not_found() {
        let mut server = Server::new_async().await;
        let client = AtlasApiClient::new(server.url(), "test-key".to_string()).unwrap();

        let mock = server
            .mock("GET", "/api/v1/users/999")
            .with_status(404)
            .create_async()
            .await;

        let result = client.validate_user("999").await;
        assert!(result.is_err());

        if let Err(ApiError::UserNotFound { id }) = result {
            assert_eq!(id, "999");
        } else {
            panic!("Expected UserNotFound error");
        }

        mock.assert_async().await;
    }

    #[test]
    fn test_atlas_user_to_claims() {
        let atlas_user = AtlasUser {
            id: "123".to_string(),
            email: "test@example.com".to_string(),
            name: "Test User".to_string(),
            role: "premium".to_string(),
            verified: true,
            created_at: Utc::now(),
            last_login: Some(Utc::now()),
            permissions: vec!["portfolio:read".to_string()],
            organization_id: None,
            subscription_status: "active".to_string(),
        };

        let claims = atlas_user.to_user_claims().unwrap();
        assert_eq!(claims.id, "123");
        assert_eq!(claims.email, "test@example.com");
        assert_eq!(claims.role, UserRole::Premium);
        assert!(claims.verified);
    }
}