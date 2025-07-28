# Phase 2: Modular Monolith Architecture Design
**Atlas Financial System Consolidation**

## Executive Summary

This document outlines the transition from Atlas Financial's current microservices architecture (12 services) to a streamlined modular monolith with 4 core services. This consolidation will reduce operational complexity while maintaining security, scalability, and development velocity.

## Current Architecture Analysis

### Current Services (12 Total)
1. **postgres** - PostgreSQL database (Port 5432)
2. **supertokens** - Authentication service (Port 3567)
3. **firefly** - Personal finance manager (Port 8082)
4. **hasura** - GraphQL API gateway (Port 8081)
5. **redis** - Caching layer (Port 6379)
6. **web** - Next.js frontend (Port 3000)
7. **rust-financial-engine** - Financial calculations (Port 8080)
8. **ai-engine** - ML insights (Port 8083) *[pending fixes]*
9. **prometheus** - Monitoring (Port 9090) *[k8s only]*
10. **grafana** - Observability dashboard (Port 3001) *[k8s only]*
11. **cadvisor** - Container metrics (Port 8084) *[k8s only]*
12. **node-exporter** - System metrics (Port 9100) *[k8s only]*

### Problems with Current Architecture
- **Service Discovery Complexity**: 12 services with interdependencies
- **Network Latency**: Multiple service-to-service calls
- **Operational Overhead**: Each service requires monitoring, logging, scaling
- **Data Consistency**: Distributed state management across services
- **Development Friction**: Multiple codebases and deployment pipelines

## Target Modular Monolith Architecture (4 Services)

### Core Principle: "Loosely Coupled Modules, Tightly Integrated Data"

### Service 1: **Atlas Core Platform** (Primary Monolith)
**Port**: 3000 (consolidated)
**Components Consolidated**:
- Next.js Web Frontend
- Rust Financial Engine (embedded as binary/FFI)
- AI Engine (Python modules via PyO3 Rust bindings)
- SuperTokens Authentication (embedded SDK)

**Module Structure**:
```
apps/platform/
├── src/
│   ├── modules/
│   │   ├── auth/           # SuperTokens integration
│   │   ├── financial/      # Rust FFI bindings
│   │   ├── ai/            # PyO3 Python bindings
│   │   ├── dashboard/     # Frontend components
│   │   └── api/           # Unified API layer
│   ├── lib/
│   │   ├── database/      # PostgreSQL connection
│   │   ├── cache/         # Redis integration
│   │   └── security/      # JWT, RBAC, encryption
│   └── shared/
│       ├── types/         # TypeScript definitions
│       ├── constants/     # Configuration
│       └── utils/         # Common utilities
```

**Benefits**:
- Single deployment unit with faster development cycles
- Direct function calls instead of HTTP requests
- Shared memory and data structures
- Simplified authentication and authorization

### Service 2: **Atlas Data Platform** (Consolidated Database Layer)
**Port**: 5432
**Components Consolidated**:
- PostgreSQL primary database
- Redis caching and session storage
- Database migrations and seeding

**Module Structure**:
```
infrastructure/database/
├── postgres/
│   ├── migrations/        # Schema evolution
│   ├── seeds/            # Test data
│   └── indexes/          # Performance optimization
├── redis/
│   ├── config/           # Cache policies
│   └── lua-scripts/      # Atomic operations
└── shared/
    ├── backup/           # Data protection
    └── monitoring/       # Health checks
```

**Benefits**:
- Unified data layer with ACID guarantees
- Simplified connection pooling
- Centralized backup and disaster recovery
- Single source of truth for data integrity

### Service 3: **Atlas API Gateway** (Hasura + External Integrations)
**Port**: 8081
**Components Consolidated**:
- Hasura GraphQL Engine
- Firefly III integration adapter
- External API connectors (banks, brokerages)

**Module Structure**:
```
services/api-gateway/
├── hasura/
│   ├── metadata/         # GraphQL schema
│   ├── migrations/       # Database tracking
│   └── actions/          # Custom resolvers
├── adapters/
│   ├── firefly/          # Personal finance integration
│   ├── plaid/            # Bank connectivity
│   └── alpaca/           # Investment data
└── middleware/
    ├── auth/             # JWT validation
    ├── rate-limiting/    # API protection
    └── logging/          # Request tracking
```

**Benefits**:
- Centralized API governance and security
- Unified GraphQL schema across all data sources
- Rate limiting and authentication in one place
- External integration abstraction layer

### Service 4: **Atlas Observability Platform** (Monitoring & Operations)
**Port**: 9090
**Components Consolidated**:
- Prometheus metrics collection
- Grafana dashboards
- Alert Manager
- Log aggregation

**Module Structure**:
```
infrastructure/observability/
├── prometheus/
│   ├── config/           # Scraping configuration
│   ├── rules/            # Alerting rules
│   └── targets/          # Service discovery
├── grafana/
│   ├── dashboards/       # Pre-built visualizations
│   ├── datasources/      # Metric sources
│   └── alerting/         # Notification policies
└── logging/
    ├── loki/             # Log aggregation
    └── promtail/         # Log collection
```

**Benefits**:
- Single pane of glass for system health
- Centralized alerting and incident response
- Unified logging and metrics correlation
- Simplified operational procedures

## Migration Strategy

### Phase 2.1: Core Platform Consolidation
1. **Create unified Next.js application** with module structure
2. **Integrate Rust Financial Engine** via FFI/WASM bindings
3. **Embed SuperTokens** as authentication module
4. **Migrate AI Engine** to PyO3 Python bindings
5. **Test unified deployment** and performance benchmarks

### Phase 2.2: Data Layer Consolidation
1. **Consolidate database schemas** into unified PostgreSQL
2. **Integrate Redis** as cache module within core platform
3. **Migrate Firefly III data** to native Atlas schema
4. **Implement unified backup strategy**

### Phase 2.3: API Gateway Restructuring
1. **Refactor Hasura metadata** for consolidated services
2. **Create external integration adapters**
3. **Implement centralized authentication**
4. **Test API performance and security**

### Phase 2.4: Observability Integration
1. **Deploy monitoring stack** as single service
2. **Configure metrics collection** from 4 services instead of 12
3. **Create unified dashboards** and alert policies
4. **Test end-to-end observability**

## Security Considerations

### Enhanced Security Posture
- **Reduced Attack Surface**: 4 services vs 12 reduces potential vulnerabilities
- **Simplified Secret Management**: Fewer secrets to rotate and manage
- **Unified Authentication**: Single auth flow instead of service-to-service tokens
- **Network Security**: Internal communications become function calls

### Maintained Security Features
- **Zero-Trust Architecture**: All external communications still authenticated
- **Data Encryption**: At-rest and in-transit encryption preserved
- **Audit Logging**: Centralized logging for compliance
- **Secret Management**: Docker secrets still used for external integrations

## Performance Optimization

### Expected Improvements
- **Latency Reduction**: 50-70% reduction in service-to-service call overhead
- **Memory Efficiency**: Shared data structures and connection pooling
- **Deployment Speed**: Single container vs 12 container orchestration
- **Development Velocity**: Unified codebase and testing pipeline

### Benchmarking Targets
- **API Response Time**: <100ms for financial calculations (vs current 200-300ms)
- **Page Load Time**: <2s for dashboard (vs current 3-4s)
- **Memory Usage**: <2GB total (vs current 4-6GB)
- **CPU Utilization**: <30% average load (vs current 50-60%)

## Risk Mitigation

### Technical Risks
- **Module Coupling**: Strict interface boundaries and dependency injection
- **Deployment Complexity**: Blue-green deployment strategy with rollback
- **Performance Regression**: Comprehensive load testing before migration
- **Data Migration**: Incremental migration with validation checkpoints

### Operational Risks
- **Team Knowledge**: Documentation and training for new architecture
- **Monitoring Gaps**: Enhanced observability during transition period
- **Feature Regression**: Comprehensive integration testing
- **Rollback Strategy**: Maintain parallel systems during migration

## Success Metrics

### Quantitative Targets
- **Service Count**: 12 → 4 services (67% reduction)
- **Deployment Time**: 15min → 5min (67% improvement)
- **Memory Usage**: 4-6GB → 2GB (50-67% reduction)
- **API Latency**: 200-300ms → <100ms (60-70% improvement)
- **Development Cycle**: 2-3 days → 1 day (50% improvement)

### Qualitative Improvements
- Simplified operational procedures
- Faster feature development and deployment
- Improved system reliability and maintainability
- Enhanced developer experience
- Better resource utilization

## Implementation Timeline

### Week 1-2: Architecture Setup
- Create modular monolith structure
- Set up build and deployment pipelines
- Implement module boundaries and interfaces

### Week 3-4: Core Migration
- Migrate Next.js frontend to unified platform
- Integrate Rust Financial Engine via FFI
- Implement unified authentication layer

### Week 5-6: Data and API
- Consolidate database schemas
- Refactor Hasura for new architecture
- Implement external integration adapters

### Week 7-8: Testing and Deployment
- Comprehensive integration testing
- Performance benchmarking
- Production deployment with monitoring

## Conclusion

The modular monolith architecture will significantly reduce Atlas Financial's operational complexity while maintaining all security and performance requirements. This consolidation from 12 to 4 services will improve development velocity, reduce latency, and simplify maintenance while preserving the bank-grade security posture achieved in Phase 1.8.

---
**Document Status**: Design Complete
**Next Steps**: Begin Phase 2.1 Implementation
**Approval Required**: Architecture Review Board
