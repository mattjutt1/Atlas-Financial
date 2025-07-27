# Contextual Memory: Monorepo Architecture Relationships

**Last Updated**: 2025-07-27  
**Version**: Atlas Financial v1.2  
**Major Change**: SuperTokens Authentication Integration Complete

## System Context

### Architectural Philosophy
The Atlas Financial v1.2 monorepo is designed around the **"Brutal Honesty"** principle - complete transparency in financial data, development process, and system behavior. The SuperTokens migration reinforces three key contextual decisions:

1. **Self-Hosted First**: Every component can run locally to maintain data privacy
2. **Open Source Stack**: No proprietary dependencies in the critical path
3. **Human-Auditable**: Clear separation of concerns for maintenance by human teams

### Component Relationships

#### Core Services Layer (`services/`)
- **firefly/**: Acts as the **single source of truth** for financial data
  - **Context**: Firefly III is battle-tested with double-entry accounting
  - **Relationship**: All other services consume Firefly's API/database
  - **Dependency**: PostgreSQL database (via Supabase or self-hosted)

- **hasura/**: **GraphQL API Gateway** sitting on top of the same PostgreSQL
  - **Context**: Provides real-time subscriptions and role-based access control
  - **Relationship**: Mirrors Firefly's data structure but optimized for frontend consumption
  - **Dependency**: Same PostgreSQL instance as Firefly, JWT verification via SuperTokens JWKS

- **supertokens/**: **Self-Hosted Authentication Service** (UPDATED July 27, 2025)
  - **Context**: Complete authentication stack replacement achieving PCI-DSS 4.0 compliance
  - **Relationship**: Issues JWT with Hasura claims, integrates with Redis for session caching
  - **Dependency**: Dedicated `supertokens` PostgreSQL database, Redis for performance

- **ai-engine/**: **"Finance-Brain"** microservice for insights
  - **Context**: Implements 75/15/10 rule, Ramsey steps, Dalio principles
  - **Relationship**: Queries Firefly data via Hasura GraphQL, stores insights back
  - **Dependency**: Local LLM model (Llama-based), vector database (pgvector)

#### Application Layer (`apps/`)
- **web/**: Next.js 15 + React 19 + SuperTokens SDK primary interface
  - **Context**: Single-page application with PWA capabilities and enterprise authentication
  - **Relationship**: Authenticates via SuperTokens Core, queries via Hasura GraphQL with JWT
  - **Dependency**: SuperTokens Core, Hasura, and Redis must be running

- **mobile/**: Future React Native app (v2.0+)
  - **Context**: Same SuperTokens authentication and Hasura API as web app
  - **Relationship**: Shared logic will be in `packages/shared`, SuperTokens SDK for React Native

#### Shared Code Layer (`packages/`)
- **shared/**: Common TypeScript types, utilities, business logic
  - **Context**: Ensures consistency between web and future mobile apps
  - **Relationship**: Imported by both apps, defines API contracts

- **ui/**: React component library
  - **Context**: Consistent UI/UX across all frontends
  - **Relationship**: Design system based on financial domain objects

### Data Flow Context (UPDATED July 27, 2025)

1. **Authentication Flow** (SuperTokens):
   - User → SuperTokens Core → JWT with Hasura Claims → Frontend (HttpOnly cookies) → Hasura (JWKS validation)

2. **Session Management Flow**:
   - SuperTokens Core → Redis Cache → Session Validation → Automatic JWT Refresh → Persistent User State

3. **Transaction Ingestion Flow**:
   - Bank APIs → Custom importers → Firefly III API → PostgreSQL → Hasura → Frontend

4. **AI Insights Flow**:
   - Scheduled job → AI Engine → Firefly data via Hasura → LLM processing → Insights stored → Frontend display

5. **Database Isolation Flow** (PCI-DSS Compliance):
   - Authentication Data → `supertokens` database (isolated)
   - Financial Data → `firefly` database (JWT-protected access)

### Infrastructure Context

#### Local Development (`infrastructure/docker/`)
- **Context**: Complete system runs with `docker-compose up`
- **Relationship**: All services networked together, shared volumes for data persistence
- **Implication**: Developer can run entire stack without cloud dependencies

#### Production Deployment (`infrastructure/k8s/`)
- **Context**: Kubernetes manifests for scalable deployment
- **Relationship**: Same containers as local dev, but with production configs
- **Implication**: Seamless dev-to-prod parity

### Security Context

#### Trust Boundaries
1. **Public Internet** ↔ **Reverse Proxy** (SSL termination)
2. **Frontend** ↔ **Hasura** (JWT validation)
3. **Services** ↔ **PostgreSQL** (Connection string authentication)
4. **AI Engine** ↔ **External APIs** (Bank connections - most sensitive)

#### Data Sovereignty
- **Context**: User owns all data, no external analytics by default
- **Relationship**: Supabase free tier acceptable because data is encrypted
- **Implication**: Can easily migrate to self-hosted PostgreSQL

## Decision Rationale

### Why Monorepo?
- **Single deployment unit**: Easier CI/CD and version management
- **Shared dependencies**: Common TypeScript types across services
- **Development velocity**: Change frontend and backend in single commit

### Why Firefly III as Core?
- **Battle-tested**: 7+ years of development, active community
- **Feature-complete**: Budgets, categories, rules, multi-currency
- **API-first**: Well-documented REST API for integration
- **License-compatible**: AGPL-3.0 allows our use case

### Why Hasura + SuperTokens? (UPDATED July 27, 2025)
- **Real-time capabilities**: GraphQL subscriptions for live balance updates
- **Self-hosted authentication**: SuperTokens provides enterprise security without external dependencies
- **PCI-DSS compliance**: Database isolation meets financial industry security requirements
- **Row-level security**: Hasura enforces user isolation via JWT claims at database level
- **Performance optimization**: Redis session caching delivers sub-50ms authentication response times

## Future Implications

### Scaling Considerations (UPDATED July 27, 2025)
- **Single-user to family**: Current design supports this with SuperTokens multi-user and role-based access
- **Performance bottleneck**: Authentication is now optimized (<50ms), likely bottleneck shifts to AI processing
- **Storage growth**: Transaction data grows linearly, manageable with PostgreSQL multi-database architecture
- **Session scaling**: Redis caching enables horizontal scaling of authentication services

### Maintenance Burden
- **Human handoff**: Clear separation allows team members to own specific services
- **Upgrade path**: Each service can be upgraded independently
- **Monitoring**: Each service exposes health checks for observability

## SuperTokens Architecture Benefits (NEW July 27, 2025)

### Monorepo Integration Advantages
1. **Unified Development**: Single codebase includes frontend SuperTokens SDK, backend configuration, and infrastructure
2. **Type Safety**: Shared TypeScript types ensure authentication contracts across all services
3. **Testing Consistency**: Integration tests validate complete authentication flow in single environment
4. **Deployment Simplicity**: All authentication components deployed together, reducing configuration drift

### Security Integration
1. **Data Sovereignty**: Complete authentication stack self-hosted within monorepo infrastructure
2. **Compliance Readiness**: PCI-DSS 4.0 architecture patterns documented and implemented
3. **Audit Trail**: All authentication events logged within existing monitoring infrastructure
4. **Secret Management**: Authentication secrets managed alongside other service secrets

### Performance Integration
1. **Shared Redis**: Session caching infrastructure shared with other monorepo services
2. **Database Optimization**: Multi-database PostgreSQL strategy optimized for all services
3. **Local JWKS**: JWT validation happens within internal network, eliminating external dependencies
4. **Caching Strategy**: Authentication caching integrated with existing performance optimization patterns

## Cross-References (UPDATED July 27, 2025)

### Static Memory Files
- **Phase 0**: `docs/memory/static/2025-01-25_phase-0_monorepo-structure.md`
- **Phase 1.1**: `docs/memory/static/2025-07-27_phase-1-1_supertokens-authentication-migration-complete.md`

### Contextual Memory Files
- **SuperTokens Authentication**: `docs/memory/contextual/supertokens-authentication_context_relationships.md`
- **Security Compliance**: `docs/memory/contextual/security-compliance_context_relationships.md`
- **Docker Infrastructure**: `docs/memory/contextual/docker-infrastructure_context_relationships.md`
- **Frontend Architecture**: `docs/memory/contextual/frontend-architecture_context_relationships.md`

### Knowledge Graph Files
- **System Architecture**: `docs/memory/knowledge-graph/system-architecture_v1.md`
- **Authentication Components**: `docs/memory/knowledge-graph/authentication-components_v1.md`

### External References
- **PRD Source**: `docs/one shot prompt with prd.txt` (sections 2-4)
- **SuperTokens Documentation**: https://supertokens.com/docs
- **Tech Stack Research**: Firefly III, Hasura, SuperTokens documentation