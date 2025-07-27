/// JWT token validation and management

use crate::auth::claims::{JwtClaims, AuthContext};
use crate::error::{ApiError, ApiResult};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use tracing::{debug, warn};

/// JWT token manager for encoding and decoding tokens
#[derive(Clone)]
pub struct JwtManager {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    validation: Validation,
    algorithm: Algorithm,
}

/// JWT token response
#[derive(Debug, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: i64,
}

impl JwtManager {
    /// Create a new JWT manager with the given secret
    pub fn new(secret: &str, allowed_issuers: Vec<String>) -> ApiResult<Self> {
        if secret.len() < 32 {
            return Err(ApiError::ConfigurationError {
                message: "JWT secret must be at least 32 characters".to_string(),
            });
        }

        let algorithm = Algorithm::HS256;
        let encoding_key = EncodingKey::from_secret(secret.as_bytes());
        let decoding_key = DecodingKey::from_secret(secret.as_bytes());
        
        let mut validation = Validation::new(algorithm);
        validation.set_issuer(&allowed_issuers);
        validation.set_audience(&["financial-api"]);
        validation.leeway = 60; // Allow 60 second clock skew
        
        Ok(Self {
            encoding_key,
            decoding_key,
            validation,
            algorithm,
        })
    }

    /// Encode JWT claims into a token
    pub fn encode_token(&self, claims: &JwtClaims) -> ApiResult<String> {
        let header = Header::new(self.algorithm);
        
        encode(&header, claims, &self.encoding_key)
            .map_err(|e| {
                warn!("Failed to encode JWT token: {}", e);
                ApiError::InternalError {
                    message: "Failed to generate authentication token".to_string(),
                }
            })
    }

    /// Decode and validate a JWT token
    pub fn decode_token(&self, token: &str) -> ApiResult<JwtClaims> {
        let token_data = decode::<JwtClaims>(token, &self.decoding_key, &self.validation)
            .map_err(|e| {
                debug!("JWT validation failed: {}", e);
                match e.kind() {
                    jsonwebtoken::errors::ErrorKind::ExpiredSignature => {
                        ApiError::TokenExpired
                    }
                    jsonwebtoken::errors::ErrorKind::InvalidToken
                    | jsonwebtoken::errors::ErrorKind::InvalidSignature
                    | jsonwebtoken::errors::ErrorKind::InvalidAlgorithm => {
                        ApiError::InvalidToken {
                            reason: "Invalid token signature or format".to_string(),
                        }
                    }
                    jsonwebtoken::errors::ErrorKind::InvalidIssuer => {
                        ApiError::InvalidToken {
                            reason: "Invalid token issuer".to_string(),
                        }
                    }
                    jsonwebtoken::errors::ErrorKind::InvalidAudience => {
                        ApiError::InvalidToken {
                            reason: "Invalid token audience".to_string(),
                        }
                    }
                    _ => ApiError::InvalidToken {
                        reason: format!("Token validation failed: {}", e),
                    },
                }
            })?;

        let claims = token_data.claims;
        
        // Additional custom validation
        claims.validate_basic()
            .map_err(|msg| ApiError::InvalidToken { reason: msg })?;

        Ok(claims)
    }

    /// Extract token from Authorization header
    pub fn extract_token_from_header(auth_header: &str) -> ApiResult<&str> {
        if let Some(token) = auth_header.strip_prefix("Bearer ") {
            if token.is_empty() {
                return Err(ApiError::InvalidToken {
                    reason: "Empty bearer token".to_string(),
                });
            }
            Ok(token)
        } else {
            Err(ApiError::InvalidToken {
                reason: "Invalid authorization header format. Expected 'Bearer <token>'".to_string(),
            })
        }
    }

    /// Validate token and return auth context
    pub fn validate_and_extract_context(&self, token: &str) -> ApiResult<AuthContext> {
        let claims = self.decode_token(token)?;
        claims.to_auth_context()
            .map_err(|msg| ApiError::InvalidToken { reason: msg })
    }

    /// Validate authorization header and return auth context
    pub fn validate_auth_header(&self, auth_header: &str) -> ApiResult<AuthContext> {
        let token = Self::extract_token_from_header(auth_header)?;
        self.validate_and_extract_context(token)
    }
}

/// Token blacklist for revoked tokens (in production, use Redis or database)
#[derive(Clone)]
pub struct TokenBlacklist {
    blacklisted_tokens: HashSet<String>,
    blacklisted_sessions: HashSet<String>,
}

impl TokenBlacklist {
    /// Create a new token blacklist
    pub fn new() -> Self {
        Self {
            blacklisted_tokens: HashSet::new(),
            blacklisted_sessions: HashSet::new(),
        }
    }

    /// Add a token to the blacklist
    pub fn blacklist_token(&mut self, token: &str) {
        self.blacklisted_tokens.insert(token.to_string());
    }

    /// Add a session to the blacklist (affects all tokens for that session)
    pub fn blacklist_session(&mut self, session_id: &str) {
        self.blacklisted_sessions.insert(session_id.to_string());
    }

    /// Check if a token is blacklisted
    pub fn is_token_blacklisted(&self, token: &str) -> bool {
        self.blacklisted_tokens.contains(token)
    }

    /// Check if a session is blacklisted
    pub fn is_session_blacklisted(&self, session_id: &str) -> bool {
        self.blacklisted_sessions.contains(session_id)
    }

    /// Check if a token or its session is blacklisted
    pub fn is_blacklisted(&self, token: &str, session_id: &str) -> bool {
        self.is_token_blacklisted(token) || self.is_session_blacklisted(session_id)
    }

    /// Remove expired tokens from blacklist (call periodically)
    pub fn cleanup_expired(&mut self, jwt_manager: &JwtManager) {
        // In a real implementation, you'd check token expiration
        // For now, just clear everything (not recommended for production)
        self.blacklisted_tokens.retain(|token| {
            // Try to decode token and check if it's expired
            match jwt_manager.decode_token(token) {
                Ok(_) => true,  // Keep non-expired tokens
                Err(_) => false, // Remove expired/invalid tokens
            }
        });
    }
}

impl Default for TokenBlacklist {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::claims::{UserClaims, UserRole};
    use chrono::{Duration, Utc};
    use uuid::Uuid;

    fn create_test_claims() -> JwtClaims {
        let now = Utc::now();
        JwtClaims {
            sub: "123e4567-e89b-12d3-a456-426614174000".to_string(),
            iss: "atlas-financial".to_string(),
            aud: "financial-api".to_string(),
            iat: now.timestamp(),
            exp: (now + Duration::hours(1)).timestamp(),
            user: UserClaims {
                id: "123e4567-e89b-12d3-a456-426614174000".to_string(),
                email: "test@example.com".to_string(),
                name: "Test User".to_string(),
                role: UserRole::User,
                verified: true,
                created_at: now,
                last_login: Some(now),
            },
            permissions: vec!["portfolio:read".to_string()],
            org_id: None,
            session_id: "session123".to_string(),
        }
    }

    #[test]
    fn test_jwt_encode_decode() {
        let jwt_manager = JwtManager::new(
            "super-secret-key-that-is-at-least-32-chars",
            vec!["atlas-financial".to_string()],
        ).unwrap();

        let claims = create_test_claims();
        let token = jwt_manager.encode_token(&claims).unwrap();
        
        assert!(!token.is_empty());

        let decoded_claims = jwt_manager.decode_token(&token).unwrap();
        assert_eq!(decoded_claims.user.id, claims.user.id);
        assert_eq!(decoded_claims.user.email, claims.user.email);
    }

    #[test]
    fn test_token_extraction() {
        let valid_header = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
        let token = JwtManager::extract_token_from_header(valid_header).unwrap();
        assert_eq!(token, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test");

        let invalid_header = "Basic dGVzdA==";
        let result = JwtManager::extract_token_from_header(invalid_header);
        assert!(result.is_err());

        let empty_bearer = "Bearer ";
        let result = JwtManager::extract_token_from_header(empty_bearer);
        assert!(result.is_err());
    }

    #[test]
    fn test_expired_token() {
        let jwt_manager = JwtManager::new(
            "super-secret-key-that-is-at-least-32-chars",
            vec!["atlas-financial".to_string()],
        ).unwrap();

        let mut claims = create_test_claims();
        // Set expiration to 1 hour ago
        claims.exp = (Utc::now() - Duration::hours(1)).timestamp();

        let token = jwt_manager.encode_token(&claims).unwrap();
        let result = jwt_manager.decode_token(&token);
        
        assert!(result.is_err());
        if let Err(ApiError::TokenExpired) = result {
            // Expected
        } else {
            panic!("Expected TokenExpired error");
        }
    }

    #[test]
    fn test_token_blacklist() {
        let mut blacklist = TokenBlacklist::new();
        
        assert!(!blacklist.is_token_blacklisted("token1"));
        
        blacklist.blacklist_token("token1");
        assert!(blacklist.is_token_blacklisted("token1"));
        
        blacklist.blacklist_session("session1");
        assert!(blacklist.is_session_blacklisted("session1"));
        assert!(blacklist.is_blacklisted("any_token", "session1"));
    }

    #[test]
    fn test_jwt_manager_creation_validation() {
        // Short secret should fail
        let result = JwtManager::new("short", vec!["issuer".to_string()]);
        assert!(result.is_err());

        // Valid secret should succeed
        let result = JwtManager::new(
            "this-is-a-sufficiently-long-secret-key",
            vec!["issuer".to_string()],
        );
        assert!(result.is_ok());
    }
}