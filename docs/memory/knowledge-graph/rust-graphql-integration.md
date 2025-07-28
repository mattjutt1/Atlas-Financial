# Rust Financial Engine GraphQL Integration

## Component Relationships

### GraphQL Layer Architecture
```
┌─────────────────────────────────────────┐
│         Hasura GraphQL Engine           │
│    (Remote Schema Integration)          │
└────────────────┬────────────────────────┘
                 │ HTTP/GraphQL
┌────────────────┴────────────────────────┐
│      Rust Financial Engine API          │
│         (async_graphql)                 │
├─────────────────────────────────────────┤
│  Schema Layer                           │
│  ├── Query (portfolio, debt, user)     │
│  ├── Mutation (CRUD operations)        │
│  └── Subscription (real-time updates)  │
├─────────────────────────────────────────┤
│  Type System                            │
│  ├── GraphQL Types (wrappers)          │
│  ├── Core Type Conversions             │
│  └── Input/Output Types                │
├─────────────────────────────────────────┤
│  Auth Middleware                        │
│  ├── JWT Validation                    │
│  ├── Hasura Claims                     │
│  └── Permission Checks                 │
├─────────────────────────────────────────┤
│  Core Financial Engine                  │
│  ├── Portfolio Analysis                │
│  ├── Debt Optimization                 │
│  └── Risk Assessment                   │
└─────────────────────────────────────────┘
```

## Type Conversion Flow

### Core → GraphQL Types
```rust
financial_core::types::RiskLevel → graphql::types::RiskLevel
financial_core::debt::DebtStrategy → graphql::types::DebtStrategy
financial_core::Money → graphql::types::Money
```

### Key Integration Points

1. **Authentication Flow**
   - SuperTokens → JWT → Hasura → Rust API
   - AuthContext carries user claims
   - Permission-based access control

2. **Data Flow**
   - Frontend → Hasura → Rust GraphQL → Financial Core
   - Real-time subscriptions via WebSocket
   - Caching layer (Redis) for performance

3. **Error Handling**
   - ApiError with GraphQL extensions
   - Proper error propagation to frontend
   - Structured error responses

## Dependencies

### Rust Crates
- `async-graphql` (6.0) - GraphQL server
- `async-graphql-axum` (6.0) - Axum integration
- `futures` (0.3) - Async streams
- `axum` (0.7) - Web framework
- `tokio` (1.40) - Async runtime

### Integration Points
- Hasura GraphQL Engine (remote schema)
- SuperTokens (authentication)
- PostgreSQL (data persistence)
- Redis (caching)

## Performance Considerations

1. **Async Operations**
   - All resolvers are async
   - Concurrent query execution
   - Stream-based subscriptions

2. **Type Safety**
   - Compile-time type checking
   - Zero-cost abstractions
   - Efficient conversions

3. **Caching Strategy**
   - Redis for frequently accessed data
   - Query result caching
   - Session caching

## Security Model

1. **JWT Validation**
   - Every request validated
   - Hasura claims extracted
   - User context propagated

2. **Permission Checks**
   - Field-level permissions
   - Row-level security
   - Operation authorization

3. **Data Isolation**
   - User-scoped queries
   - Tenant isolation
   - Audit logging

---
*Updated: July 28, 2025*
