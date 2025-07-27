/// Authentication middleware for Axum

use crate::auth::{AuthContext, JwtManager, TokenBlacklist};
use crate::error::{ApiError, ApiResult};
use axum::{
    extract::{Request, State},
    http::{header::AUTHORIZATION, StatusCode},
    middleware::Next,
    response::Response,
};
use std::sync::Arc;
use tower::ServiceExt;
use tracing::{debug, warn};

/// Shared authentication state
#[derive(Clone)]
pub struct AuthState {
    pub jwt_manager: Arc<JwtManager>,
    pub blacklist: Arc<tokio::sync::RwLock<TokenBlacklist>>,
    pub require_auth: bool,
}

impl AuthState {
    /// Create new authentication state
    pub fn new(
        jwt_manager: JwtManager,
        blacklist: TokenBlacklist,
        require_auth: bool,
    ) -> Self {
        Self {
            jwt_manager: Arc::new(jwt_manager),
            blacklist: Arc::new(tokio::sync::RwLock::new(blacklist)),
            require_auth,
        }
    }
}

/// Extension for adding AuthContext to request
pub struct AuthContextExtension(pub AuthContext);

/// Authentication middleware that validates JWT tokens
pub async fn auth_middleware(
    State(auth_state): State<AuthState>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    debug!("Processing authentication middleware");

    // Skip authentication if not required (for development/testing)
    if !auth_state.require_auth {
        debug!("Authentication not required, skipping validation");
        return Ok(next.run(request).await);
    }

    // Extract authorization header
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|header| header.to_str().ok());

    let auth_context = match auth_header {
        Some(header) => {
            match validate_auth_header(&auth_state, header).await {
                Ok(context) => Some(context),
                Err(e) => {
                    warn!("Authentication failed: {}", e);
                    return Err(e.status_code());
                }
            }
        }
        None => {
            warn!("Missing authorization header");
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // Add auth context to request extensions
    if let Some(context) = auth_context {
        request.extensions_mut().insert(AuthContextExtension(context));
    }

    Ok(next.run(request).await)
}

/// Optional authentication middleware that allows unauthenticated requests
pub async fn optional_auth_middleware(
    State(auth_state): State<AuthState>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    debug!("Processing optional authentication middleware");

    // Always allow the request to proceed, but validate token if present
    if let Some(auth_header) = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|header| header.to_str().ok())
    {
        if let Ok(auth_context) = validate_auth_header(&auth_state, auth_header).await {
            request.extensions_mut().insert(AuthContextExtension(auth_context));
        }
    }

    Ok(next.run(request).await)
}

/// Validate authorization header and return auth context
async fn validate_auth_header(
    auth_state: &AuthState,
    auth_header: &str,
) -> ApiResult<AuthContext> {
    // Extract token from header
    let token = JwtManager::extract_token_from_header(auth_header)?;

    // Check if token is blacklisted
    let blacklist = auth_state.blacklist.read().await;
    if blacklist.is_token_blacklisted(token) {
        return Err(ApiError::InvalidToken {
            reason: "Token has been revoked".to_string(),
        });
    }

    // Validate token and extract context
    let auth_context = auth_state.jwt_manager.validate_and_extract_context(token)?;

    // Check if session is blacklisted
    if blacklist.is_session_blacklisted(&auth_context.session_id) {
        return Err(ApiError::InvalidToken {
            reason: "Session has been terminated".to_string(),
        });
    }

    drop(blacklist); // Release read lock

    debug!(
        "Successfully authenticated user: {} ({})",
        auth_context.user_id, auth_context.user_email
    );

    Ok(auth_context)
}

/// Authorization middleware that checks for specific permissions
pub fn require_permission(permission: &'static str) -> impl Fn(Request, Next) -> Response + Clone {
    move |mut request: Request, next: Next| async move {
        // Extract auth context from request
        let auth_context = match request.extensions().get::<AuthContextExtension>() {
            Some(AuthContextExtension(context)) => context,
            None => {
                warn!("Authorization middleware called without authentication");
                return (StatusCode::UNAUTHORIZED, "Authentication required").into_response();
            }
        };

        // Check permission
        if !auth_context.has_permission(permission) {
            warn!(
                "User {} lacks permission: {}",
                auth_context.user_id, permission
            );
            return (
                StatusCode::FORBIDDEN,
                format!("Insufficient permissions: {} required", permission),
            )
                .into_response();
        }

        debug!(
            "User {} authorized for permission: {}",
            auth_context.user_id, permission
        );

        next.run(request).await
    }
}

/// Authorization middleware that checks for any of the specified permissions
pub fn require_any_permission(
    permissions: &'static [&'static str],
) -> impl Fn(Request, Next) -> Response + Clone {
    move |mut request: Request, next: Next| async move {
        let auth_context = match request.extensions().get::<AuthContextExtension>() {
            Some(AuthContextExtension(context)) => context,
            None => {
                return (StatusCode::UNAUTHORIZED, "Authentication required").into_response();
            }
        };

        if !auth_context.has_any_permission(permissions) {
            warn!(
                "User {} lacks any of permissions: {:?}",
                auth_context.user_id, permissions
            );
            return (
                StatusCode::FORBIDDEN,
                format!("Insufficient permissions: one of {:?} required", permissions),
            )
                .into_response();
        }

        next.run(request).await
    }
}

/// Authorization middleware that checks for admin role
pub fn require_admin() -> impl Fn(Request, Next) -> Response + Clone {
    move |mut request: Request, next: Next| async move {
        let auth_context = match request.extensions().get::<AuthContextExtension>() {
            Some(AuthContextExtension(context)) => context,
            None => {
                return (StatusCode::UNAUTHORIZED, "Authentication required").into_response();
            }
        };

        if !auth_context.is_admin() {
            warn!("User {} is not an admin", auth_context.user_id);
            return (StatusCode::FORBIDDEN, "Admin role required").into_response();
        }

        next.run(request).await
    }
}

/// Helper function to extract auth context from request extensions
pub fn extract_auth_context(request: &Request) -> ApiResult<&AuthContext> {
    request
        .extensions()
        .get::<AuthContextExtension>()
        .map(|ext| &ext.0)
        .ok_or_else(|| ApiError::AuthenticationFailed {
            message: "No authentication context found".to_string(),
        })
}

/// Helper function to extract auth context from request (optional)
pub fn extract_optional_auth_context(request: &Request) -> Option<&AuthContext> {
    request
        .extensions()
        .get::<AuthContextExtension>()
        .map(|ext| &ext.0)
}

/// GraphQL context that includes authentication
#[derive(Clone)]
pub struct GraphQLContext {
    pub auth: Option<AuthContext>,
    pub auth_state: AuthState,
}

impl GraphQLContext {
    /// Create new GraphQL context
    pub fn new(auth: Option<AuthContext>, auth_state: AuthState) -> Self {
        Self { auth, auth_state }
    }

    /// Get authenticated user context or return error
    pub fn require_auth(&self) -> ApiResult<&AuthContext> {
        self.auth.as_ref().ok_or_else(|| {
            ApiError::AuthenticationFailed {
                message: "Authentication required for this operation".to_string(),
            }
        })
    }

    /// Check if user has permission
    pub fn has_permission(&self, permission: &str) -> bool {
        self.auth
            .as_ref()
            .map(|auth| auth.has_permission(permission))
            .unwrap_or(false)
    }

    /// Require specific permission
    pub fn require_permission(&self, permission: &str) -> ApiResult<()> {
        let auth = self.require_auth()?;
        if !auth.has_permission(permission) {
            return Err(ApiError::InsufficientPermissions {
                resource: permission.to_string(),
            });
        }
        Ok(())
    }

    /// Check if user can access resource owned by another user
    pub fn can_access_user_resource(&self, user_id: uuid::Uuid) -> ApiResult<bool> {
        let auth = self.require_auth()?;
        Ok(auth.can_access_user_resource(user_id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::claims::{JwtClaims, UserClaims, UserRole, Permissions};
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use chrono::{Duration, Utc};
    use tower::ServiceExt;
    use uuid::Uuid;

    fn create_test_jwt_manager() -> JwtManager {
        JwtManager::new(
            "test-secret-key-that-is-long-enough-for-testing",
            vec!["atlas-financial".to_string()],
        )
        .unwrap()
    }

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
            permissions: vec![Permissions::PORTFOLIO_READ.to_string()],
            org_id: None,
            session_id: "session123".to_string(),
        }
    }

    #[tokio::test]
    async fn test_valid_token_middleware() {
        let jwt_manager = create_test_jwt_manager();
        let claims = create_test_claims();
        let token = jwt_manager.encode_token(&claims).unwrap();

        let auth_state = AuthState::new(jwt_manager, TokenBlacklist::new(), true);

        let request = Request::builder()
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .body(Body::empty())
            .unwrap();

        // This would normally be tested with the actual middleware stack
        let result = validate_auth_header(&auth_state, &format!("Bearer {}", token)).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_invalid_token_middleware() {
        let jwt_manager = create_test_jwt_manager();
        let auth_state = AuthState::new(jwt_manager, TokenBlacklist::new(), true);

        let result = validate_auth_header(&auth_state, "Bearer invalid-token").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_blacklisted_token() {
        let jwt_manager = create_test_jwt_manager();
        let claims = create_test_claims();
        let token = jwt_manager.encode_token(&claims).unwrap();

        let mut blacklist = TokenBlacklist::new();
        blacklist.blacklist_token(&token);

        let auth_state = AuthState::new(jwt_manager, blacklist, true);

        let result = validate_auth_header(&auth_state, &format!("Bearer {}", token)).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_graphql_context() {
        let jwt_manager = create_test_jwt_manager();
        let auth_state = AuthState::new(jwt_manager, TokenBlacklist::new(), true);

        // Test without authentication
        let context = GraphQLContext::new(None, auth_state.clone());
        assert!(context.require_auth().is_err());
        assert!(!context.has_permission(Permissions::PORTFOLIO_READ));

        // Test with authentication
        let claims = create_test_claims();
        let auth_context = claims.to_auth_context().unwrap();
        let context = GraphQLContext::new(Some(auth_context), auth_state);

        assert!(context.require_auth().is_ok());
        assert!(context.has_permission(Permissions::PORTFOLIO_READ));
        assert!(context.require_permission(Permissions::PORTFOLIO_READ).is_ok());
        assert!(context.require_permission(Permissions::ADMIN_USERS).is_err());
    }
}