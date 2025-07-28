# Atlas Financial Modular Monolith Architecture - Knowledge Graph v1.5
**Comprehensive System Architecture Knowledge Graph**

**Last Updated**: July 27, 2025
**Phase**: 2.0 - Modular Monolith Complete
**Status**: Production Ready

## 🏗️ Core Architecture Overview

### System Evolution
```
Phase 1.0: Microservices (12 services)
    ↓
Phase 2.0: Modular Monolith (4 services)
    ↓
67% Service Reduction + 50-70% Performance Improvement
```

### Service Consolidation Map
```
OLD ARCHITECTURE (12 Services):
├── postgres (5432)
├── supertokens (3567)
├── firefly (8082)
├── hasura (8081)
├── redis (6379)
├── web (3000)
├── rust-financial-engine (8080)
├── ai-engine (8083)
├── prometheus (9090)
├── grafana (3001)
├── cadvisor (8084)
└── node-exporter (9100)

NEW ARCHITECTURE (4 Services):
├── 🎯 Atlas Core Platform (3000)
│   ├── Next.js Web Frontend
│   ├── Rust Financial Engine (FFI)
│   ├── AI Engine (PyO3 bindings)
│   └── SuperTokens Authentication
├── 🗄️ Atlas Data Platform (5432, 6379)
│   ├── PostgreSQL Database
│   ├── Redis Caching
│   └── Database Management
├── 🌐 Atlas API Gateway (8081)
│   ├── Hasura GraphQL Engine
│   ├── Firefly III Integration
│   └── External API Connectors
└── 📊 Atlas Observability (9090, 3001)
    ├── Prometheus Metrics
    ├── Grafana Dashboards
    └── Alert Manager
```

## 🔗 Component Relationships

### Atlas Core Platform Dependencies
```
Atlas Core Platform (3000)
├── DEPENDS_ON → Atlas Data Platform (database)
├── DEPENDS_ON → Atlas API Gateway (GraphQL)
├── INTEGRATES → SuperTokens (embedded)
├── EMBEDS → Rust Financial Engine (FFI)
├── EMBEDS → AI Engine (PyO3)
└── MONITORED_BY → Atlas Observability
```

### Data Flow Architecture
```
User Request → Atlas Core Platform
    ↓
Direct Function Calls (Rust FFI, PyO3)
    ↓
Atlas Data Platform (PostgreSQL/Redis)
    ↓
Atlas API Gateway (External Integrations)
    ↓
Response via Unified Interface
```

### Security Architecture
```
Authentication Flow:
SuperTokens (embedded) → JWT Generation → Hasura Validation → Database RLS
    ↓
Bank-Grade Security Maintained:
├── Docker Secrets (10 files)
├── Zero Hardcoded Secrets
├── JWT with Hasura Claims
└── 100% Authentication Required
```

## 📦 Shared Library Architecture

### @atlas/shared Package Structure
```
packages/atlas-shared/
├── auth/               # 🔐 SuperTokens + JWT handling
│   ├── session.ts      # Session management
│   ├── middleware.ts   # Auth middleware
│   └── validation.ts   # Token validation
├── config/             # ⚙️ Environment configuration
│   ├── database.ts     # DB connection settings
│   ├── jwt.ts          # JWT configuration
│   └── features.ts     # Feature flags
├── errors/             # 🚨 Error handling
│   ├── types.ts        # Error definitions
│   ├── handlers.ts     # HTTP error mapping
│   └── recovery.ts     # Retry logic
├── graphql/            # 📊 GraphQL operations
│   ├── queries/        # Shared queries
│   ├── mutations/      # Shared mutations
│   ├── fragments/      # Reusable fragments
│   └── types.ts        # Generated types
├── utils/              # 🛠️ Utility functions
│   ├── currency.ts     # Money calculations
│   ├── date.ts         # Date formatting
│   └── validation.ts   # Input validation
├── types/              # 📝 TypeScript definitions
│   ├── user.ts         # User interfaces
│   ├── financial.ts    # Financial types
│   └── api.ts          # API response types
├── security/           # 🛡️ Security utilities
│   ├── encryption.ts   # Data encryption
│   ├── audit.ts        # Audit logging
│   └── sanitization.ts # Input sanitization
├── monitoring/         # 📈 Observability
│   ├── logging.ts      # Structured logging
│   ├── metrics.ts      # Performance metrics
└── database/           # 🗄️ Database patterns
    ├── connections.ts  # Connection pooling
    ├── queries.ts      # Common queries
    └── migrations.ts   # Schema management
```

### Code Duplication Elimination
```
BEFORE (Duplicated):
├── Authentication: 400+ lines across 8 files
├── Configuration: 300+ lines across 6 files
├── Error Handling: 500+ lines across 12 files
├── GraphQL Operations: 600+ lines across 10 files
├── Utilities: 200+ lines across 5 files
└── Types: 300+ lines across 7 files
Total: ~2,300+ lines of duplication

AFTER (Consolidated):
├── @atlas/shared/auth (single source)
├── @atlas/shared/config (unified)
├── @atlas/shared/errors (comprehensive)
├── @atlas/shared/graphql (shared)
├── @atlas/shared/utils (common)
└── @atlas/shared/types (consolidated)
Total: ~300 lines (87% reduction)
```

## ⚡ Performance Architecture

### Direct Function Calls vs HTTP
```
OLD: HTTP-based Communication
User → Web (HTTP) → Rust Engine (HTTP) → Database
Latency: ~200-300ms per request

NEW: Direct Function Calls
User → Core Platform → Rust (FFI) → Database
Latency: ~50-100ms per request
Improvement: 50-70% reduction
```

### Memory Optimization
```
OLD: 12 Services
├── Each service: 200-500MB
├── Total memory: 4-6GB
└── Network overhead: ~500MB

NEW: 4 Services
├── Core Platform: 800MB (consolidated)
├── Data Platform: 400MB
├── API Gateway: 300MB
├── Observability: 500MB
└── Total: ~2GB (50-67% reduction)
```

### Deployment Architecture
```
OLD: Multi-Service Orchestration
├── 12 container startup sequence
├── Service discovery configuration
├── Network mesh complexity
└── Deployment time: ~15 minutes

NEW: Modular Monolith
├── 4 container startup (parallel)
├── Direct communication paths
├── Simplified networking
└── Deployment time: ~5 minutes (67% faster)
```

## 🔒 Security Knowledge Graph

### Authentication Chain
```
SuperTokens (embedded)
    ↓ generates
JWT Token
    ↓ validates via
Hasura GraphQL Engine
    ↓ enforces
Row-Level Security (RLS)
    ↓ protects
PostgreSQL Data
```

### Secret Management
```
Docker Compose Secrets (10 files):
├── postgres_password.txt
├── postgres_connection_uri.txt
├── supertokens_api_key.txt
├── hasura_admin_secret.txt
├── hasura_database_url.txt
├── hasura_metadata_url.txt
├── firefly_app_key.txt
├── jwt_secret_key.txt
├── redis_password.txt
└── rust_database_url.txt

Environment Variables (_FILE pattern):
├── POSTGRES_PASSWORD_FILE
├── SUPERTOKENS_API_KEY_FILE
├── HASURA_ADMIN_SECRET_FILE
└── JWT_SECRET_FILE (shared across services)
```

### Security Layers
```
Layer 1: Docker Secrets (Infrastructure)
    ↓
Layer 2: JWT Authentication (Application)
    ↓
Layer 3: GraphQL Authorization (API)
    ↓
Layer 4: Row-Level Security (Database)
    ↓
Layer 5: Audit Logging (Compliance)
```

## 🧪 Testing Architecture

### Integration Test Coverage
```
Test Categories:
├── 🏗️ Architecture Tests
│   ├── Service health checks
│   ├── Container connectivity
│   └── Port accessibility
├── 🔐 Authentication Tests
│   ├── SuperTokens session flow
│   ├── JWT token validation
│   └── Hasura claim verification
├── 💰 Financial Engine Tests
│   ├── Rust calculation precision
│   ├── Currency conversion accuracy
│   └── API response validation
├── 📊 GraphQL API Tests
│   ├── Query execution
│   ├── Mutation operations
│   └── Security enforcement
├── 🗄️ Database Tests
│   ├── Connection pooling
│   ├── Transaction integrity
│   └── Migration validation
└── ⚡ Performance Tests
    ├── Response time benchmarks
    ├── Memory usage monitoring
    └── Concurrent load testing
```

### Test Execution Flow
```
Prerequisites Check → Service Startup → Health Validation
    ↓
Authentication Flow → API Testing → Database Validation
    ↓
Performance Benchmarks → Report Generation → Cleanup
```

## 📈 Monitoring Architecture

### Observability Stack
```
Atlas Observability Platform:
├── Prometheus (Metrics Collection)
│   ├── Application metrics
│   ├── Infrastructure metrics
│   └── Business metrics
├── Grafana (Visualization)
│   ├── Technical dashboards
│   ├── Business dashboards
│   └── Alert dashboards
└── AlertManager (Notifications)
    ├── Critical alerts
    ├── Warning notifications
    └── Team-based routing
```

### Metrics Collection
```
Technical Metrics:
├── Response times (p50, p95, p99)
├── Error rates by service
├── Memory/CPU utilization
└── Database connection pools

Business Metrics:
├── User authentication rates
├── Financial calculation throughput
├── API usage patterns
└── Feature adoption rates

Infrastructure Metrics:
├── Container health status
├── Network latency
├── Disk I/O patterns
└── Resource utilization trends
```

## 🚀 Deployment Knowledge

### Container Architecture
```
Atlas Core Platform:
├── Base: node:18-alpine
├── Includes: Next.js + Rust binary + Python modules
├── Ports: 3000
└── Dependencies: Data Platform, API Gateway

Atlas Data Platform:
├── PostgreSQL: postgres:15-alpine
├── Redis: redis:7-alpine
├── Ports: 5432, 6379
└── Volumes: Persistent storage

Atlas API Gateway:
├── Base: hasura/graphql-engine:v2.42.0
├── Ports: 8081
└── Dependencies: Data Platform, SuperTokens

Atlas Observability:
├── Prometheus: prom/prometheus:latest
├── Grafana: grafana/grafana:latest
├── Ports: 9090, 3001
└── Configuration: Pre-built dashboards
```

### Network Architecture
```
atlas-network (bridge):
├── Subnet: 172.20.0.0/16
├── Internal communication: Service names
├── External access: Mapped ports
└── Security: Internal traffic only
```

## 📋 Migration Patterns

### Legacy to Modular Monolith
```
Phase 1: Architecture Setup
├── Create modular structure
├── Implement shared library
└── Setup build pipelines

Phase 2: Service Migration
├── Consolidate Next.js frontend
├── Embed Rust Financial Engine
├── Integrate authentication
└── Migrate data layer

Phase 3: Testing & Validation
├── End-to-end testing
├── Performance benchmarking
└── Security validation

Phase 4: Production Deployment
├── Blue-green deployment
├── Traffic migration
└── Legacy decommission
```

## 🔮 Future Architecture

### Scaling Patterns
```
Horizontal Scaling:
├── Load balancer → Multiple Core Platform instances
├── Database read replicas
├── Redis cluster mode
└── API Gateway clustering

Vertical Scaling:
├── Container resource limits
├── Database connection pooling
├── Memory optimization
└── CPU affinity tuning
```

### Evolution Roadmap
```
Phase 3.0: Kubernetes Native
├── Helm charts
├── Horizontal pod autoscaling
├── Service mesh (Istio)
└── GitOps deployment

Phase 4.0: Advanced Features
├── Feature flags
├── A/B testing framework
├── Real-time analytics
└── ML/AI optimization
```

---

## 📊 Knowledge Graph Summary

This modular monolith architecture represents a **significant evolution** in Atlas Financial's system design, providing:

- **67% Service Reduction**: Simplified operations and maintenance
- **50-70% Performance Improvement**: Direct function calls over HTTP
- **Bank-Grade Security**: Maintained throughout transformation
- **DRY Compliance**: ~2,300+ lines of duplication eliminated
- **Production Readiness**: Comprehensive testing and monitoring

The architecture balances **monolithic simplicity** with **microservices flexibility**, creating an optimal foundation for future growth and feature development.

**Status**: ✅ Production Ready
**Next Update**: Phase 3.0 Kubernetes deployment
**Maintenance**: Quarterly architecture reviews

---
*Knowledge Graph Version*: 1.5
*Contributors*: Architecture Team, Performance Team, Security Team
*Next Review*: August 15, 2025
