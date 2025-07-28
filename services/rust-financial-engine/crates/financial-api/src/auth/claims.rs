use chrono::{DateTime, Utc};
/// JWT claims and user context structures
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// JWT claims structure compatible with Atlas Financial
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtClaims {
    /// Subject (user ID)
    pub sub: String,

    /// Issuer
    pub iss: String,

    /// Audience
    pub aud: String,

    /// Issued at
    pub iat: i64,

    /// Expiration time
    pub exp: i64,

    /// User details
    pub user: UserClaims,

    /// Permissions and roles
    pub permissions: Vec<String>,

    /// Organization/tenant context
    pub org_id: Option<String>,

    /// Session ID for revocation
    pub session_id: String,
}

/// User information embedded in JWT
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserClaims {
    pub id: String,
    pub email: String,
    pub name: String,
    pub role: UserRole,
    pub verified: bool,
    pub created_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
}

/// User roles in the Atlas Financial system
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum UserRole {
    /// Regular user with access to their own financial data
    User,

    /// Premium user with access to advanced features
    Premium,

    /// Financial advisor with access to client data
    Advisor,

    /// Organization admin with user management capabilities
    Admin,

    /// System administrator with full access
    SuperAdmin,
}

/// Request context containing authenticated user information
#[derive(Debug, Clone)]
pub struct AuthContext {
    pub user_id: Uuid,
    pub user_email: String,
    pub user_name: String,
    pub user_role: UserRole,
    pub permissions: Vec<String>,
    pub org_id: Option<Uuid>,
    pub session_id: String,
    pub token_issued_at: DateTime<Utc>,
    pub token_expires_at: DateTime<Utc>,
}

/// Permissions for financial operations
pub struct Permissions;

impl Permissions {
    // Portfolio permissions
    pub const PORTFOLIO_READ: &'static str = "portfolio:read";
    pub const PORTFOLIO_WRITE: &'static str = "portfolio:write";
    pub const PORTFOLIO_DELETE: &'static str = "portfolio:delete";
    pub const PORTFOLIO_OPTIMIZE: &'static str = "portfolio:optimize";

    // Debt permissions
    pub const DEBT_READ: &'static str = "debt:read";
    pub const DEBT_WRITE: &'static str = "debt:write";
    pub const DEBT_DELETE: &'static str = "debt:delete";
    pub const DEBT_OPTIMIZE: &'static str = "debt:optimize";

    // User management permissions
    pub const USER_READ: &'static str = "user:read";
    pub const USER_WRITE: &'static str = "user:write";
    pub const USER_DELETE: &'static str = "user:delete";

    // Admin permissions
    pub const ADMIN_USERS: &'static str = "admin:users";
    pub const ADMIN_SYSTEM: &'static str = "admin:system";
    pub const ADMIN_METRICS: &'static str = "admin:metrics";
}

impl JwtClaims {
    /// Check if token is expired
    pub fn is_expired(&self) -> bool {
        let now = Utc::now().timestamp();
        self.exp < now
    }

    /// Check if token was issued in the future (clock skew protection)
    pub fn is_issued_in_future(&self) -> bool {
        let now = Utc::now().timestamp();
        self.iat > now + 60 // Allow 60 second clock skew
    }

    /// Validate basic JWT structure and timing
    pub fn validate_basic(&self) -> Result<(), String> {
        if self.is_expired() {
            return Err("Token expired".to_string());
        }

        if self.is_issued_in_future() {
            return Err("Token issued in the future".to_string());
        }

        if self.sub.is_empty() {
            return Err("Missing subject".to_string());
        }

        if self.user.id.is_empty() {
            return Err("Missing user ID".to_string());
        }

        // Validate UUID format
        if Uuid::parse_str(&self.user.id).is_err() {
            return Err("Invalid user ID format".to_string());
        }

        Ok(())
    }

    /// Convert to AuthContext
    pub fn to_auth_context(&self) -> Result<AuthContext, String> {
        self.validate_basic()?;

        let user_id =
            Uuid::parse_str(&self.user.id).map_err(|_| "Invalid user ID format".to_string())?;

        let org_id = self
            .org_id
            .as_ref()
            .map(|id| Uuid::parse_str(id))
            .transpose()
            .map_err(|_| "Invalid organization ID format".to_string())?;

        Ok(AuthContext {
            user_id,
            user_email: self.user.email.clone(),
            user_name: self.user.name.clone(),
            user_role: self.user.role.clone(),
            permissions: self.permissions.clone(),
            org_id,
            session_id: self.session_id.clone(),
            token_issued_at: DateTime::from_timestamp(self.iat, 0)
                .ok_or("Invalid issued at timestamp".to_string())?,
            token_expires_at: DateTime::from_timestamp(self.exp, 0)
                .ok_or("Invalid expiration timestamp".to_string())?,
        })
    }
}

impl AuthContext {
    /// Check if user has a specific permission
    pub fn has_permission(&self, permission: &str) -> bool {
        self.permissions.contains(&permission.to_string())
    }

    /// Check if user has any of the specified permissions
    pub fn has_any_permission(&self, permissions: &[&str]) -> bool {
        permissions.iter().any(|p| self.has_permission(p))
    }

    /// Check if user has all of the specified permissions
    pub fn has_all_permissions(&self, permissions: &[&str]) -> bool {
        permissions.iter().all(|p| self.has_permission(p))
    }

    /// Check if user can access resource owned by another user
    pub fn can_access_user_resource(&self, resource_user_id: Uuid) -> bool {
        // Users can always access their own resources
        if self.user_id == resource_user_id {
            return true;
        }

        // Advisors and admins can access resources in their organization
        match self.user_role {
            UserRole::Advisor | UserRole::Admin | UserRole::SuperAdmin => {
                // Would need to check if the resource user is in the same org
                // For now, allow advisors and admins to access any resource
                true
            }
            _ => false,
        }
    }

    /// Check if user can perform portfolio operations
    pub fn can_manage_portfolios(&self) -> bool {
        self.has_permission(Permissions::PORTFOLIO_WRITE)
    }

    /// Check if user can perform debt operations
    pub fn can_manage_debt(&self) -> bool {
        self.has_permission(Permissions::DEBT_WRITE)
    }

    /// Check if user can optimize portfolios/debt
    pub fn can_optimize(&self) -> bool {
        self.has_any_permission(&[Permissions::PORTFOLIO_OPTIMIZE, Permissions::DEBT_OPTIMIZE])
    }

    /// Check if user is an admin
    pub fn is_admin(&self) -> bool {
        matches!(self.user_role, UserRole::Admin | UserRole::SuperAdmin)
    }

    /// Check if user is a super admin
    pub fn is_super_admin(&self) -> bool {
        matches!(self.user_role, UserRole::SuperAdmin)
    }

    /// Get default permissions for user role
    pub fn default_permissions_for_role(role: &UserRole) -> Vec<String> {
        match role {
            UserRole::User => vec![
                Permissions::PORTFOLIO_READ.to_string(),
                Permissions::DEBT_READ.to_string(),
            ],
            UserRole::Premium => vec![
                Permissions::PORTFOLIO_READ.to_string(),
                Permissions::PORTFOLIO_WRITE.to_string(),
                Permissions::PORTFOLIO_OPTIMIZE.to_string(),
                Permissions::DEBT_READ.to_string(),
                Permissions::DEBT_WRITE.to_string(),
                Permissions::DEBT_OPTIMIZE.to_string(),
            ],
            UserRole::Advisor => vec![
                Permissions::PORTFOLIO_READ.to_string(),
                Permissions::PORTFOLIO_WRITE.to_string(),
                Permissions::PORTFOLIO_OPTIMIZE.to_string(),
                Permissions::DEBT_READ.to_string(),
                Permissions::DEBT_WRITE.to_string(),
                Permissions::DEBT_OPTIMIZE.to_string(),
                Permissions::USER_READ.to_string(),
            ],
            UserRole::Admin => vec![
                Permissions::PORTFOLIO_READ.to_string(),
                Permissions::PORTFOLIO_WRITE.to_string(),
                Permissions::PORTFOLIO_DELETE.to_string(),
                Permissions::PORTFOLIO_OPTIMIZE.to_string(),
                Permissions::DEBT_READ.to_string(),
                Permissions::DEBT_WRITE.to_string(),
                Permissions::DEBT_DELETE.to_string(),
                Permissions::DEBT_OPTIMIZE.to_string(),
                Permissions::USER_READ.to_string(),
                Permissions::USER_WRITE.to_string(),
                Permissions::ADMIN_USERS.to_string(),
            ],
            UserRole::SuperAdmin => vec![
                Permissions::PORTFOLIO_READ.to_string(),
                Permissions::PORTFOLIO_WRITE.to_string(),
                Permissions::PORTFOLIO_DELETE.to_string(),
                Permissions::PORTFOLIO_OPTIMIZE.to_string(),
                Permissions::DEBT_READ.to_string(),
                Permissions::DEBT_WRITE.to_string(),
                Permissions::DEBT_DELETE.to_string(),
                Permissions::DEBT_OPTIMIZE.to_string(),
                Permissions::USER_READ.to_string(),
                Permissions::USER_WRITE.to_string(),
                Permissions::USER_DELETE.to_string(),
                Permissions::ADMIN_USERS.to_string(),
                Permissions::ADMIN_SYSTEM.to_string(),
                Permissions::ADMIN_METRICS.to_string(),
            ],
        }
    }
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserRole::User => write!(f, "user"),
            UserRole::Premium => write!(f, "premium"),
            UserRole::Advisor => write!(f, "advisor"),
            UserRole::Admin => write!(f, "admin"),
            UserRole::SuperAdmin => write!(f, "super_admin"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jwt_claims_validation() {
        let now = Utc::now();
        let claims = JwtClaims {
            sub: "123e4567-e89b-12d3-a456-426614174000".to_string(),
            iss: "atlas-financial".to_string(),
            aud: "financial-api".to_string(),
            iat: now.timestamp() - 3600,
            exp: now.timestamp() + 3600,
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
        };

        assert!(claims.validate_basic().is_ok());
        assert!(!claims.is_expired());
        assert!(!claims.is_issued_in_future());
    }

    #[test]
    fn test_auth_context_permissions() {
        let user_id = Uuid::new_v4();
        let context = AuthContext {
            user_id,
            user_email: "test@example.com".to_string(),
            user_name: "Test User".to_string(),
            user_role: UserRole::Premium,
            permissions: vec![
                Permissions::PORTFOLIO_READ.to_string(),
                Permissions::PORTFOLIO_WRITE.to_string(),
            ],
            org_id: None,
            session_id: "session123".to_string(),
            token_issued_at: Utc::now(),
            token_expires_at: Utc::now(),
        };

        assert!(context.has_permission(Permissions::PORTFOLIO_READ));
        assert!(context.has_permission(Permissions::PORTFOLIO_WRITE));
        assert!(!context.has_permission(Permissions::ADMIN_USERS));

        assert!(context.can_access_user_resource(user_id));
        assert!(!context.can_access_user_resource(Uuid::new_v4()));

        assert!(context.can_manage_portfolios());
    }

    #[test]
    fn test_default_permissions() {
        let user_perms = AuthContext::default_permissions_for_role(&UserRole::User);
        assert!(user_perms.contains(&Permissions::PORTFOLIO_READ.to_string()));
        assert!(!user_perms.contains(&Permissions::PORTFOLIO_WRITE.to_string()));

        let admin_perms = AuthContext::default_permissions_for_role(&UserRole::Admin);
        assert!(admin_perms.contains(&Permissions::ADMIN_USERS.to_string()));
        assert!(admin_perms.contains(&Permissions::PORTFOLIO_DELETE.to_string()));
    }
}
