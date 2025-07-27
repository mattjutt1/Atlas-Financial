# Atlas Financial Calculation Engine (Rust)

## Overview

Professional-grade Rust microservice providing bank-level precision financial calculations for Atlas Financial. Replaces JavaScript/TypeScript calculations with native decimal arithmetic and sub-10ms response times.

## Architecture

### Core Design Principles
- **Precision First**: All monetary calculations use `rust_decimal` for exact decimal arithmetic
- **Performance Optimized**: Sub-10ms basic operations, sub-100ms complex analysis
- **Seamless Integration**: Native integration with existing Atlas infrastructure
- **Bank-Grade Security**: Comprehensive input validation and secure computation
- **Horizontal Scalability**: Stateless design with connection pooling

### Technology Stack
- **Runtime**: Tokio async runtime
- **Web Framework**: Axum (high-performance, type-safe)
- **Database**: Diesel ORM with PostgreSQL
- **Precision**: rust_decimal for all monetary calculations
- **GraphQL**: async-graphql for Hasura remote schema
- **Authentication**: SuperTokens JWT validation
- **Caching**: Redis integration for performance
- **Monitoring**: Prometheus metrics + structured logging

## Project Structure

```
rust-financial-engine/
├── Cargo.toml                 # Workspace configuration
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # Development environment
├── crates/
│   ├── financial-core/        # Core financial types and calculations
│   ├── financial-api/         # REST and GraphQL API
│   ├── financial-db/          # Database models and migrations
│   └── financial-cli/         # CLI tools for development
├── migrations/                # Diesel database migrations
├── config/                    # Configuration files
├── tests/                     # Integration tests
└── benchmarks/               # Performance benchmarks
```

## Integration Points

### 1. Hasura GraphQL Remote Schema
- Exposes GraphQL endpoint at `/graphql`
- Registers as remote schema in Hasura
- Inherits authentication from Hasura JWT

### 2. PostgreSQL Database
- Extends existing Firefly III schema
- Dedicated tables for calculation cache
- Connection pooling for performance

### 3. SuperTokens Authentication
- JWT validation middleware
- User context extraction
- Permission-based access control

### 4. Redis Caching
- Calculation result caching
- Session-based temporary storage
- Cache invalidation strategies

## Financial Calculation Modules

### 1. Portfolio Analysis (`financial-core/portfolio`)
- Modern Portfolio Theory implementation
- Asset allocation optimization
- Risk-return analysis
- Correlation matrix calculations
- Efficient frontier computation

### 2. Debt Management (`financial-core/debt`)
- Debt snowball algorithm
- Debt avalanche optimization
- Amortization schedule generation
- Payment optimization strategies
- Early payoff calculations

### 3. Time Value of Money (`financial-core/tvm`)
- Present value calculations
- Future value projections
- Net Present Value (NPV)
- Internal Rate of Return (IRR)
- Annuity calculations

### 4. Budget Analysis (`financial-core/budget`)
- Variance analysis
- Cash flow forecasting
- Scenario modeling
- Expense categorization
- Trend analysis

### 5. Risk Assessment (`financial-core/risk`)
- Value at Risk (VaR) calculations
- Monte Carlo simulations
- Stress testing
- Correlation analysis
- Scenario modeling

### 6. Currency Operations (`financial-core/currency`)
- Multi-currency support
- Precision exchange rate handling
- Currency conversion with fees
- Historical rate lookups

## Performance Specifications

### Latency Requirements
- **Basic calculations**: < 10ms (P95)
- **Portfolio analysis**: < 100ms (P95)
- **Complex simulations**: < 1000ms (P95)

### Throughput Targets
- **Concurrent requests**: 1000+ RPS
- **Memory usage**: < 256MB per instance
- **CPU efficiency**: < 50% utilization at target load

### Scaling Strategy
- Horizontal scaling via load balancer
- Database connection pooling
- Redis-based caching layer
- Async request processing

## Development Workflow

### Setup
```bash
# Clone and setup
cd /home/matt/Atlas-Financial/services/rust-financial-engine
cargo build

# Run migrations
diesel migration run

# Start development server
cargo run --bin financial-api

# Run tests
cargo test
cargo test --test integration_tests
```

### Testing Strategy
- **Unit Tests**: Individual calculation validation
- **Property Tests**: Mathematical invariant verification
- **Integration Tests**: End-to-end API testing
- **Performance Tests**: Latency and throughput validation
- **Security Tests**: Input validation and authorization

## Deployment

### Docker Integration
- Multi-stage Dockerfile for optimized production builds
- Integration with existing Atlas docker-compose
- Health checks and monitoring endpoints
- Graceful shutdown handling

### CI/CD Pipeline
- Automated testing on pull requests
- Security scanning with cargo-audit
- Performance regression testing
- Automated deployment to staging/production

## API Documentation

### REST Endpoints
```
POST /api/v1/portfolio/analyze
POST /api/v1/debt/optimize
POST /api/v1/budget/forecast
GET  /api/v1/calculations/{id}
```

### GraphQL Schema
```graphql
type Query {
  portfolioAnalysis(input: PortfolioInput!): PortfolioAnalysis!
  debtOptimization(input: DebtInput!): DebtOptimization!
  budgetForecast(input: BudgetInput!): BudgetForecast!
}

type Mutation {
  calculateScenario(input: ScenarioInput!): ScenarioResult!
}
```

## Security Considerations

### Input Validation
- Comprehensive input sanitization
- Decimal precision limits
- Rate limiting per user
- Request size limitations

### Authentication & Authorization
- SuperTokens JWT validation
- Role-based access control
- Audit logging
- Session management

### Data Protection
- Encryption at rest
- TLS for all communications
- PII data handling
- GDPR compliance

## Monitoring & Observability

### Metrics
- Request latency histograms
- Error rate tracking
- Database connection pool metrics
- Memory and CPU utilization

### Logging
- Structured JSON logging
- Request tracing
- Error stack traces
- Performance profiling

### Health Checks
- `/health` - Basic service health
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe
- `/metrics` - Prometheus metrics

## Future Enhancements

### Phase 1 Roadmap
- [ ] Core financial calculations
- [ ] REST API implementation
- [ ] Database integration
- [ ] Basic authentication

### Phase 2 Roadmap
- [ ] GraphQL remote schema
- [ ] Advanced portfolio analysis
- [ ] Caching implementation
- [ ] Performance optimization

### Phase 3 Roadmap
- [ ] Machine learning integration
- [ ] Real-time market data
- [ ] Advanced risk modeling
- [ ] Multi-tenant support