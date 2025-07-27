# Atlas Financial - Rust Financial Engine + Hasura GraphQL Integration

This document provides comprehensive documentation for the integration between the Rust Financial Engine and Hasura GraphQL Engine, creating a unified API surface for the Atlas Financial platform.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │  Hasura GraphQL │    │ Rust Financial  │
│   (Frontend)    │◄──►│    Engine       │◄──►│    Engine       │
│                 │    │   (Port 8081)   │    │   (Port 8080)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  SuperTokens    │    │   PostgreSQL    │    │     Redis       │
│ Authentication  │    │   Database      │    │     Cache       │
│   (Port 3567)   │    │   (Port 5432)   │    │   (Port 6379)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key Features

### 🔗 Unified GraphQL API
- Single GraphQL endpoint at `http://localhost:8081/v1/graphql`
- Combines database operations (Hasura) with financial calculations (Rust)
- Schema stitching with proper namespacing (`finance` namespace for Rust operations)

### 🔐 JWT Authentication Integration
- SuperTokens provides JWT tokens
- Hasura validates tokens and extracts user claims
- Tokens are forwarded to Rust Financial Engine for authorization
- Role-based access control for both database and calculations

### ⚡ High Performance
- Rust Financial Engine provides sub-millisecond calculations
- Redis caching for expensive computations
- Connection pooling and optimized queries
- Comprehensive monitoring and metrics

### 🛡️ Security & Reliability
- JWT token validation at multiple layers
- Rate limiting and request size limits
- Error handling with proper propagation
- Retry logic for network failures
- Health checks and monitoring

## Services Configuration

### Rust Financial Engine (Port 8080)

The Rust Financial Engine provides high-performance financial calculations:

```yaml
environment:
  HOST: "0.0.0.0"
  PORT: 8080
  ENVIRONMENT: development
  
  # JWT Configuration
  JWT_ISSUER: http://supertokens:3567
  JWT_AUDIENCE: atlas-financial
  JWKS_URL: http://supertokens:3567/auth/jwt/jwks.json
  
  # Redis Configuration
  REDIS_URL: redis://:password@redis:6379
  REDIS_ENABLED: "true"
  
  # Performance Settings
  MAX_CONCURRENT_REQUESTS: 1000
  RATE_LIMIT_PER_MINUTE: 1000
```

**Key Endpoints:**
- `GET /health` - Health check endpoint
- `POST /graphql` - GraphQL API endpoint
- `GET /` - GraphQL Playground (development)
- `GET /metrics` - Prometheus metrics
- `GET /schema` - GraphQL SDL schema

### Hasura GraphQL Engine (Port 8081)

Hasura provides the unified GraphQL API gateway:

```yaml
environment:
  # Database Configuration
  HASURA_GRAPHQL_DATABASE_URL: postgres://atlas:password@postgres:5432/firefly
  HASURA_GRAPHQL_METADATA_DATABASE_URL: postgres://atlas:password@postgres:5432/hasura
  
  # JWT Configuration
  HASURA_GRAPHQL_JWT_SECRET: |
    {
      "jwk_url": "http://supertokens:3567/auth/jwt/jwks.json",
      "issuer": "http://supertokens:3567",
      "audience": "atlas-financial"
    }
  
  # Admin Configuration
  HASURA_GRAPHQL_ADMIN_SECRET: atlas_hasura_admin_secret
  HASURA_GRAPHQL_UNAUTHORIZED_ROLE: anonymous
```

**Key Features:**
- Remote schema integration with Rust Financial Engine
- JWT authentication with SuperTokens
- Role-based permissions
- Real-time subscriptions
- Database introspection and management

## Remote Schema Configuration

The remote schema configuration in `/services/hasura/metadata/remote_schemas.yaml`:

```yaml
- name: rust-financial-engine
  definition:
    url: http://rust-financial-engine:8080/graphql
    timeout_seconds: 30
    retry_conf:
      max_retries: 3
      retry_interval_seconds: 2
      timeout_seconds: 30
    forward_client_headers: true
    headers:
      - name: Content-Type
        value: application/json
      - name: X-Hasura-Role
        value_from_env: HASURA_GRAPHQL_UNAUTHORIZED_ROLE
    customization:
      root_fields_namespace: finance
      type_names:
        prefix: Finance_
        suffix: _Type
```

## API Usage Examples

### 1. Unified Financial Query

```graphql
query UnifiedFinancialData($userId: String!) {
  # Database operations via Hasura
  accounts(where: {user_id: {_eq: $userId}}) {
    id
    name
    balance
    currency
  }
  
  # Financial calculations via Rust Engine
  finance {
    get_optimizeDebts(input: {
      debts: [{
        name: "Credit Card"
        balance: { amount: "5000.00", currency: USD }
        interestRate: { percentage: { value: "18.99" }, period: ANNUAL }
        minimumPayment: { amount: "150.00", currency: USD }
        debtType: CREDIT_CARD
      }]
      strategy: AVALANCHE
      extraPayment: { amount: "500.00", currency: USD }
    }) {
      strategy
      totalInterestPaid { amount currency }
      totalTimeToPayoffMonths
      paymentPlans {
        debtName
        monthlyPayment { amount currency }
        payoffDate
      }
    }
  }
}
```

### 2. Portfolio Analysis with Transactions

```graphql
query PortfolioAnalysis($portfolioId: String!, $userId: String!) {
  # Transaction history from database
  transactions(where: {user_id: {_eq: $userId}}, limit: 50) {
    id
    amount
    description
    date
  }
  
  # Risk analysis from Rust engine
  finance {
    get_analyzePortfolioRisk(portfolioId: $portfolioId) {
      volatility
      valueAtRisk95 { amount currency }
      sharpeRatio
      riskAnalysis {
        riskLevel
        recommendation
      }
    }
  }
}
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Hasura
    participant SuperTokens
    participant RustEngine
    
    Client->>SuperTokens: Login request
    SuperTokens->>Client: JWT token
    Client->>Hasura: GraphQL request + JWT
    Hasura->>SuperTokens: Validate JWT (JWKS)
    SuperTokens->>Hasura: Token valid + claims
    Hasura->>RustEngine: Forward request + JWT
    RustEngine->>SuperTokens: Validate JWT
    SuperTokens->>RustEngine: Token valid
    RustEngine->>Hasura: Calculation result
    Hasura->>Client: Unified response
```

## Setup Instructions

### 1. Prerequisites

- Docker and Docker Compose
- Hasura CLI (optional, for metadata management)
- Node.js (for frontend development)

### 2. Environment Configuration

```bash
# Copy environment template
cp infrastructure/docker/.env.example infrastructure/docker/.env

# Edit the .env file with your configuration
# Key variables:
# - POSTGRES_PASSWORD
# - HASURA_ADMIN_SECRET
# - SUPERTOKENS_API_KEY
# - REDIS_PASSWORD
```

### 3. Start Services

```bash
# Start all services
cd infrastructure/docker
docker-compose -f docker-compose.dev.yml up -d

# Check service health
./scripts/test-integration-rust-hasura.sh
```

### 4. Configure Hasura Remote Schema

Option A: Using Hasura CLI (recommended)
```bash
cd services/hasura
hasura metadata apply --admin-secret atlas_hasura_admin_secret --endpoint http://localhost:8081
```

Option B: Using Hasura Console
1. Open http://localhost:8081/console
2. Go to "Remote Schemas"
3. Click "Add"
4. Configure:
   - Name: `rust-financial-engine`
   - GraphQL Server URL: `http://rust-financial-engine:8080/graphql`
   - Headers: None (authentication handled automatically)

### 5. Test Integration

```bash
# Run comprehensive end-to-end tests
./scripts/test-end-to-end-integration.sh

# Test individual components
curl http://localhost:8080/health  # Rust engine health
curl http://localhost:8081/healthz # Hasura health
```

## Development Workflow

### 1. Making Changes to Rust Engine

```bash
# Build and restart Rust engine
cd services/rust-financial-engine
cargo build --release

# Restart container
docker-compose -f infrastructure/docker/docker-compose.dev.yml restart rust-financial-engine
```

### 2. Updating Hasura Metadata

```bash
# Export current metadata
cd services/hasura
hasura metadata export --admin-secret atlas_hasura_admin_secret --endpoint http://localhost:8081

# Apply metadata changes
hasura metadata apply --admin-secret atlas_hasura_admin_secret --endpoint http://localhost:8081
```

### 3. Testing Changes

```bash
# Quick health check
./scripts/test-integration-rust-hasura.sh

# Full end-to-end test
./scripts/test-end-to-end-integration.sh

# Manual testing via GraphQL playgrounds
# Hasura Console: http://localhost:8081/console
# Rust Playground: http://localhost:8080/
```

## Monitoring and Observability

### Health Checks

All services include comprehensive health checks:

- **Rust Engine**: `GET /health` - Returns service status, cache health, memory usage
- **Hasura**: `GET /healthz` - Returns GraphQL engine status
- **Integration**: Custom scripts validate end-to-end functionality

### Metrics

- **Rust Engine**: Prometheus metrics at `/metrics`
- **Hasura**: Built-in query analytics and logging
- **Docker**: Container health status and resource usage

### Logging

Structured logging across all services:
- Request/response logging
- Error tracking with stack traces
- Performance metrics
- Authentication events

## Troubleshooting

### Common Issues

1. **Remote Schema Not Loading**
   ```bash
   # Check if Rust engine is accessible from Hasura
   docker exec atlas-hasura curl http://rust-financial-engine:8080/health
   
   # Restart services in order
   docker-compose restart rust-financial-engine hasura
   ```

2. **JWT Authentication Errors**
   ```bash
   # Verify SuperTokens JWKS endpoint
   curl http://localhost:3567/auth/jwt/jwks.json
   
   # Check Hasura JWT configuration
   docker logs atlas-hasura | grep -i jwt
   ```

3. **GraphQL Schema Errors**
   ```bash
   # Check Rust engine schema
   curl -X POST http://localhost:8080/graphql \
     -H "Content-Type: application/json" \
     -d '{"query": "query { __schema { queryType { name } } }"}'
   ```

### Debug Commands

```bash
# View service logs
docker logs atlas-rust-financial-engine
docker logs atlas-hasura
docker logs atlas-supertokens

# Check network connectivity
docker network inspect atlas_atlas-network

# Monitor resource usage
docker stats atlas-rust-financial-engine atlas-hasura
```

## Performance Optimization

### Rust Engine Optimization

- **Redis Caching**: Enable for expensive calculations
- **Connection Pooling**: Configured for high concurrency
- **Compression**: Gzip enabled for large responses
- **Rate Limiting**: Prevents resource exhaustion

### Hasura Optimization

- **Query Caching**: Enable response caching
- **Connection Limits**: Tune database connections
- **Batching**: Use query batching for multiple operations
- **Subscriptions**: Optimize real-time features

## Security Considerations

### Authentication
- JWT tokens with proper expiration
- Role-based access control
- Secure token storage and transmission

### Authorization
- Field-level permissions in Hasura
- Method-level permissions in Rust engine
- User context propagation

### Network Security
- Internal Docker networking
- HTTPS in production
- Firewall configuration

## Production Deployment

### Environment Differences

```yaml
# Production environment variables
ENVIRONMENT: production
HASURA_GRAPHQL_DEV_MODE: "false"
HASURA_GRAPHQL_ENABLE_CONSOLE: "false"
RUST_ENGINE_LOG_LEVEL: warn
ENABLE_METRICS: "true"
```

### Scaling Considerations

- **Horizontal Scaling**: Multiple Rust engine instances
- **Load Balancing**: HAProxy or similar
- **Database**: Read replicas for analytics
- **Cache**: Redis cluster for high availability

## Support and Documentation

- **API Documentation**: `/docs/api/unified-graphql-examples.md`
- **Architecture**: `/docs/ARCHITECTURE.md`
- **Deployment**: `/docs/deployment/`
- **Examples**: `/examples/graphql-queries/`

For technical support, please refer to the troubleshooting section or contact the development team.