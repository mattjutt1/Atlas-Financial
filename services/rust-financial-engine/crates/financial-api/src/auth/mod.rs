/// Authentication and authorization module
///
/// Provides JWT token validation, Atlas API integration,
/// and middleware for protecting GraphQL endpoints.

pub mod jwt;
pub mod middleware;
pub mod atlas;
pub mod claims;

pub use jwt::*;
pub use middleware::*;
pub use atlas::*;
pub use claims::*;
