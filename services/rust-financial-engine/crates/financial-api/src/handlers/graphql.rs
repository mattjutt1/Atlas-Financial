use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::{Request, Response};
/// GraphQL HTTP handlers
///
/// Contains handlers for GraphQL endpoints
use axum::{extract::State, http::StatusCode, response::Json};
use serde_json::Value;

use crate::error::Result;
use crate::graphql::resolvers::{ApiContext, ApiSchema};

/// GraphQL request handler
pub async fn graphql_handler(
    State(schema): State<ApiSchema>,
    Json(request): Json<Request>,
) -> Result<Json<Response>> {
    let response = schema.execute(request).await;
    Ok(Json(response))
}

/// GraphQL playground handler (development only)
pub async fn graphql_playground() -> std::result::Result<String, StatusCode> {
    // TODO: Only enable in development mode
    Ok(playground_source(GraphQLPlaygroundConfig::new("/graphql")))
}
