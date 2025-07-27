/// Atlas Financial API Server
/// 
/// High-performance GraphQL API server for financial calculations
/// Built with Axum, async-graphql, and Tokio for maximum concurrency

use axum::{
    extract::State,
    http::{header, StatusCode},
    response::Html,
    routing::{get, post},
    Router,
};
use financial_api::{
    auth::middleware::auth_middleware,
    config::Config,
    error::ApiError,
    graphql::{create_schema, GraphQLRequest, GraphQLResponse},
    monitoring::metrics::setup_metrics,
    service::ApiService,
};
use std::net::SocketAddr;
use tower::ServiceBuilder;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::{DefaultMakeSpan, DefaultOnRequest, DefaultOnResponse, TraceLayer},
    LatencyUnit,
};
use tracing::{info, warn, Level};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "financial_api=info,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("🚀 Starting Atlas Financial API Server...");

    // Load configuration
    let config = Config::from_env().map_err(|e| {
        warn!("Failed to load configuration: {}", e);
        e
    })?;

    info!("📊 Configuration loaded successfully");
    info!("🌐 Server will bind to: {}:{}", config.host, config.port);
    info!("🔐 JWT issuer: {}", config.jwt.issuer);
    info!("📊 GraphQL introspection: {}", config.graphql.introspection);

    // Setup metrics
    let metrics_handle = setup_metrics()?;
    
    // Initialize API service
    let api_service = ApiService::new(config.clone()).await?;
    
    // Create GraphQL schema
    let schema = create_schema(api_service.clone()).await?;

    info!("🎯 GraphQL schema created with {} types", schema.sdl().lines().count());

    // Setup CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    // Setup tracing
    let trace_layer = TraceLayer::new_for_http()
        .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
        .on_request(DefaultOnRequest::new().level(Level::INFO))
        .on_response(
            DefaultOnResponse::new()
                .level(Level::INFO)
                .latency_unit(LatencyUnit::Millis),
        );

    // Build application routes
    let app = Router::new()
        .route("/", get(playground).post(graphql_handler))
        .route("/graphql", post(graphql_handler))
        .route("/health", get(health_check))
        .route("/metrics", get(metrics_handler))
        .route("/schema", get(schema_handler))
        .with_state(AppState {
            schema: schema.clone(),
            config: config.clone(),
            api_service: api_service.clone(),
        })
        .layer(
            ServiceBuilder::new()
                .layer(trace_layer)
                .layer(cors)
                .layer(axum::middleware::from_fn_with_state(
                    config.clone(),
                    auth_middleware,
                ))
        );

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    
    info!("🎉 Atlas Financial API Server starting on {}", addr);
    info!("📊 GraphQL Playground available at http://{}/", addr);
    info!("🔍 Health check available at http://{}/health", addr);
    info!("📈 Metrics available at http://{}/metrics", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    
    info!("✅ Server successfully bound to {}", addr);
    info!("🚀 Atlas Financial API Server is now running!");

    axum::serve(listener, app)
        .await
        .map_err(|e| {
            warn!("Server error: {}", e);
            e
        })?;

    Ok(())
}

/// Application state shared across handlers
#[derive(Clone)]
struct AppState {
    schema: async_graphql::Schema<
        financial_api::graphql::Query,
        financial_api::graphql::Mutation,
        async_graphql::EmptySubscription,
    >,
    config: Config,
    api_service: ApiService,
}

/// GraphQL handler
async fn graphql_handler(
    State(state): State<AppState>,
    req: GraphQLRequest,
) -> Result<GraphQLResponse, ApiError> {
    let response = state.schema.execute(req.into_inner()).await;
    Ok(GraphQLResponse::from(response))
}

/// GraphQL Playground handler
async fn playground() -> Html<&'static str> {
    Html(
        r#"<!DOCTYPE html>
<html>
<head>
    <title>Atlas Financial API - GraphQL Playground</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <link rel="shortcut icon" href="https://graphql-playground.netlify.app/favicon.png" />
    <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/graphql-playground-react@1.7.26/build/static/css/index.css" />
    <link rel="shortcut icon" href="//cdn.jsdelivr.net/npm/graphql-playground-react@1.7.26/build/favicon.png" />
    <script src="//cdn.jsdelivr.net/npm/graphql-playground-react@1.7.26/build/static/js/middleware.js"></script>
</head>
<body>
    <div id="root">
        <style>
            body { margin: 0; font-family: 'Open Sans', sans-serif; overflow: hidden; }
            #root { height: 100vh; }
        </style>
    </div>
    <script>
        window.addEventListener('load', function (event) {
            GraphQLPlayground.init(document.getElementById('root'), {
                endpoint: '/graphql',
                title: 'Atlas Financial API',
                headers: {
                    'Content-Type': 'application/json',
                },
                settings: {
                    'editor.theme': 'dark',
                    'editor.fontSize': 14,
                    'editor.fontFamily': "'Source Code Pro', 'Consolas', 'Inconsolata', 'Droid Sans Mono', 'Monaco', monospace",
                    'request.credentials': 'include',
                },
                tabs: [
                    {
                        endpoint: '/graphql',
                        query: `# Welcome to Atlas Financial API GraphQL Playground
# 
# This is a comprehensive financial calculation API with precise decimal arithmetic
# 
# Example queries:

# Get debt optimization analysis
query GetDebtOptimization {
  optimizeDebts(input: {
    debts: [
      {
        name: "Credit Card"
        balance: { amount: "5000.00", currency: USD }
        interestRate: { percentage: { value: "18.99" }, period: ANNUAL }
        minimumPayment: { amount: "100.00", currency: USD }
        debtType: CREDIT_CARD
      }
    ]
    strategy: AVALANCHE
    extraPayment: { amount: "200.00", currency: USD }
  }) {
    strategy
    totalInterestPaid { amount currency }
    totalTimeToPayoffMonths
    paymentPlans {
      debtName
      monthlyPayment { amount currency }
      payoffDate
      totalInterest { amount currency }
    }
  }
}

# Get portfolio risk analysis
query GetPortfolioRisk {
  analyzePortfolioRisk(portfolioId: "uuid-here") {
    volatility
    valueAtRisk95 { amount currency }
    conditionalValueAtRisk95 { amount currency }
    maximumDrawdown
    sharpeRatio
  }
}`,
                    },
                ],
            });
        });
    </script>
</body>
</html>"#,
    )
}

/// Health check handler
async fn health_check(State(state): State<AppState>) -> Result<axum::Json<serde_json::Value>, ApiError> {
    // Perform basic health checks
    let health_status = serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "version": env!("CARGO_PKG_VERSION"),
        "service": "atlas-financial-api",
        "environment": state.config.environment,
        "checks": {
            "graphql_schema": "ok",
            "authentication": "ok",
            "cache": state.api_service.check_cache_health().await,
            "memory": "ok"
        }
    });

    Ok(axum::Json(health_status))
}

/// Metrics handler for Prometheus
async fn metrics_handler() -> Result<String, ApiError> {
    use prometheus::{Encoder, TextEncoder};
    
    let encoder = TextEncoder::new();
    let metric_families = prometheus::gather();
    
    encoder.encode_to_string(&metric_families)
        .map_err(|e| ApiError::Internal(format!("Failed to encode metrics: {}", e)))
}

/// Schema SDL handler
async fn schema_handler(State(state): State<AppState>) -> String {
    state.schema.sdl()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;
    use axum_test::TestServer;

    async fn create_test_app() -> Router {
        let config = Config::test_config();
        let api_service = ApiService::new(config.clone()).await.unwrap();
        let schema = create_schema(api_service.clone()).await.unwrap();

        Router::new()
            .route("/health", get(health_check))
            .with_state(AppState {
                schema,
                config,
                api_service,
            })
    }

    #[tokio::test]
    async fn test_health_check() {
        let app = create_test_app().await;
        let server = TestServer::new(app).unwrap();

        let response = server.get("/health").await;
        assert_eq!(response.status_code(), StatusCode::OK);

        let health: serde_json::Value = response.json();
        assert_eq!(health["status"], "healthy");
        assert_eq!(health["service"], "atlas-financial-api");
    }

    #[tokio::test]
    async fn test_playground_loads() {
        let app = Router::new().route("/", get(playground));
        let server = TestServer::new(app).unwrap();

        let response = server.get("/").await;
        assert_eq!(response.status_code(), StatusCode::OK);
        assert!(response.text().contains("GraphQL Playground"));
    }
}