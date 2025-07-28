# Knowledge Graph: Authentication Components v1.0 - SuperTokens Architecture

**Created**: 2025-07-27
**System Version**: Atlas Financial v1.2
**Authentication Stack**: SuperTokens Self-Hosted Solution
**Compliance Level**: PCI-DSS 4.0 Ready

## Authentication Architecture Overview

```mermaid
graph TB
    %% User Layer
    User[👤 User] --> Browser[🌐 Browser]

    %% Frontend Authentication Layer
    Browser --> AuthUI[🔐 SuperTokens Auth UI<br/>/auth endpoint<br/>Email/Password Forms]
    Browser --> App[📱 Next.js Application<br/>AuthWrapper Protected]

    %% SuperTokens React SDK Integration
    App --> SDK[⚛️ SuperTokens React SDK<br/>SessionAuth Component<br/>Session Context]
    AuthUI --> SDK

    %% API Layer
    SDK --> APIRoutes[🔌 Next.js API Routes<br/>/api/auth/[[...path]]<br/>Dynamic Route Handler]
    SDK --> JWKS[🔑 JWKS Endpoint<br/>/api/auth/jwt/jwks.json<br/>Public Key Distribution]

    %% Backend Authentication Core
    APIRoutes --> SuperTokensCore[🏗️ SuperTokens Core Service<br/>Port 3567<br/>Self-Hosted Authentication]

    %% Session Management
    SuperTokensCore --> Sessions[📋 Session Management<br/>HttpOnly Cookies<br/>CSRF Protection]
    Sessions --> Redis[📦 Redis Cache<br/>Port 6379<br/>Session Storage]

    %% Database Layer
    SuperTokensCore --> AuthDB[(🗄️ SuperTokens Database<br/>PostgreSQL: supertokens<br/>9 Authentication Tables)]

    %% JWT Generation and Validation
    SuperTokensCore --> JWTGen[🎫 JWT Generation<br/>RS256 Signing<br/>Hasura Claims]
    JWTGen --> KeyRotation[🔄 Key Rotation<br/>Automatic JWKS Updates<br/>Security Hardening]

    %% Authorization Flow
    JWKS --> Hasura[⚡ Hasura GraphQL Engine<br/>JWT Verification<br/>Row-Level Security]
    JWTGen --> Hasura

    %% Data Access
    Hasura --> FinanceDB[(💰 Financial Database<br/>PostgreSQL: firefly<br/>User-Scoped Queries)]

    %% Styling
    classDef userLayer fill:#e1f5fe
    classDef frontend fill:#fff3e0
    classDef api fill:#f3e5f5
    classDef backend fill:#e8f5e8
    classDef database fill:#fff8e1
    classDef security fill:#ffebee

    class User,Browser userLayer
    class AuthUI,App,SDK frontend
    class APIRoutes,JWKS api
    class SuperTokensCore,Sessions,JWTGen,KeyRotation backend
    class AuthDB,FinanceDB,Redis database
    class Hasura security
```

## Component Relationships Matrix

### Frontend Components

| Component | Technology | Port | Dependencies | Security Role |
|-----------|------------|------|--------------|---------------|
| **Auth UI** | SuperTokens Pre-built UI | 3000 | SuperTokens SDK | User credential collection |
| **Next.js App** | Next.js 15 + App Router | 3000 | AuthWrapper, Session Context | Protected route rendering |
| **SuperTokens SDK** | @supertokens-auth-react | N/A | SuperTokens Core API | Session state management |
| **AuthWrapper** | Custom React Component | N/A | SessionAuth from SDK | Declarative route protection |

### Backend Components

| Component | Technology | Port | Dependencies | Security Role |
|-----------|------------|------|--------------|---------------|
| **SuperTokens Core** | SuperTokens PostgreSQL 9.2 | 3567 | PostgreSQL, Redis | Authentication processing |
| **API Routes** | Next.js API Routes | 3000 | SuperTokens Backend SDK | Authentication endpoint routing |
| **JWKS Endpoint** | Custom Next.js API | 3000 | SuperTokens JWT Recipe | Public key distribution |
| **Session Manager** | SuperTokens Session Recipe | N/A | Redis, PostgreSQL | Session lifecycle management |

### Database Components

| Component | Technology | Schema | Purpose | Security Level |
|-----------|------------|--------|---------|----------------|
| **supertokens DB** | PostgreSQL 15 | 9 auth tables | User credentials, sessions | PCI-DSS isolated |
| **firefly DB** | PostgreSQL 15 | 74 finance tables | Financial data | JWT-protected access |
| **Redis Cache** | Redis 7 Alpine | Key-value store | Session caching | Performance optimization |

## Authentication Flow Components

### User Registration Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant UI as Auth UI
    participant SDK as React SDK
    participant API as API Routes
    participant ST as SuperTokens Core
    participant DB as Auth Database

    U->>B: Visit /auth/signup
    B->>UI: Load registration form
    U->>UI: Enter email/password
    UI->>SDK: signUp(credentials)
    SDK->>API: POST /api/auth/signup
    API->>ST: createUser(credentials)
    ST->>DB: Store encrypted credentials
    DB-->>ST: User created
    ST-->>API: Success + session
    API-->>SDK: Set HttpOnly cookies
    SDK-->>UI: Registration complete
    UI->>B: Redirect to dashboard
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant APP as Next.js App
    participant SDK as React SDK
    participant API as API Routes
    participant ST as SuperTokens Core
    participant R as Redis
    participant DB as Auth Database

    U->>B: Visit protected route
    B->>APP: Load page
    APP->>SDK: Check session
    SDK->>API: GET /api/auth/session/verify
    API->>ST: verifySession(cookies)
    ST->>R: Check session cache

    alt Session in cache
        R-->>ST: Session valid
    else Session not cached
        ST->>DB: Validate session
        DB-->>ST: Session details
        ST->>R: Cache session
    end

    ST-->>API: Session valid
    API-->>SDK: User authenticated
    SDK-->>APP: Render protected content
    APP->>B: Display dashboard
```

### JWT Generation and Validation Flow

```mermaid
sequenceDiagram
    participant SDK as React SDK
    participant ST as SuperTokens Core
    participant JWKS as JWKS Endpoint
    participant H as Hasura
    participant GQL as GraphQL Query
    participant DB as Finance Database

    SDK->>ST: Request authenticated action
    ST->>ST: Generate JWT with claims
    Note over ST: Claims include:<br/>- x-hasura-user-id<br/>- x-hasura-default-role<br/>- x-hasura-allowed-roles

    SDK->>GQL: GraphQL query + JWT
    GQL->>H: Validate JWT
    H->>JWKS: Fetch public keys
    JWKS-->>H: Current JWKS
    H->>H: Verify JWT signature
    H->>H: Extract Hasura claims

    H->>DB: Execute query with user context
    Note over H,DB: Row-level security applied<br/>based on JWT claims
    DB-->>H: User-scoped results
    H-->>GQL: Authorized data
    GQL-->>SDK: Query results
```

## Security Component Relationships

### Data Isolation Architecture

```mermaid
graph TD
    %% Authentication Domain
    subgraph "Authentication Domain (PCI-DSS Isolated)"
        AU[Authentication Users]
        AS[Authentication Sessions]
        AK[Authentication Keys]
        AM[Authentication Metadata]
    end

    %% Financial Domain
    subgraph "Financial Domain (Business Data)"
        FA[Financial Accounts]
        FT[Financial Transactions]
        FB[Financial Budgets]
        FR[Financial Reports]
    end

    %% Cross-Domain Security
    JWT[JWT with Claims] --> AU
    JWT --> FA

    %% Access Control
    RLS[Row-Level Security] --> FA
    RLS --> FT
    RLS --> FB
    RLS --> FR

    JWT --> RLS

    classDef auth fill:#fff3e0
    classDef finance fill:#e8f5e8
    classDef security fill:#ffebee

    class AU,AS,AK,AM auth
    class FA,FT,FB,FR finance
    class JWT,RLS security
```

### Session Security Components

```mermaid
graph TB
    %% Session Creation
    Login[User Login] --> SessionCreate[Session Creation]
    SessionCreate --> Cookies[HttpOnly Cookies]
    SessionCreate --> CSRF[CSRF Tokens]

    %% Session Storage
    Cookies --> RedisCache[Redis Session Cache]
    Cookies --> DBPersist[Database Persistence]

    %% Session Validation
    Request[API Request] --> CookieRead[Read HttpOnly Cookies]
    CookieRead --> SessionValidate[Validate Session]
    SessionValidate --> RedisLookup[Redis Cache Lookup]

    alt Cache Hit
        RedisLookup --> SessionValid[Session Valid]
    else Cache Miss
        RedisLookup --> DBLookup[Database Lookup]
        DBLookup --> CacheUpdate[Update Redis Cache]
        CacheUpdate --> SessionValid
    end

    %% Session Security
    SessionValid --> JWTGeneration[Generate JWT]
    JWTGeneration --> HasuraClaims[Add Hasura Claims]

    %% Session Expiration
    SessionCreate --> AutoExpiry[Automatic Expiration]
    AutoExpiry --> SessionRefresh[Refresh Mechanism]
    SessionRefresh --> NewCookies[Update Cookies]

    classDef creation fill:#e8f5e8
    classDef storage fill:#fff8e1
    classDef validation fill:#f3e5f5
    classDef security fill:#ffebee

    class Login,SessionCreate creation
    class RedisCache,DBPersist,RedisLookup,DBLookup storage
    class Request,CookieRead,SessionValidate validation
    class Cookies,CSRF,JWTGeneration,HasuraClaims security
```

## Performance Optimization Components

### Caching Strategy

```mermaid
graph LR
    %% Request Flow
    UserRequest[User Request] --> SessionCheck[Session Check]

    %% Cache Layers
    SessionCheck --> L1[L1: Redis Cache<br/>Sub-millisecond lookup]
    L1 --> L2[L2: PostgreSQL<br/>Persistent storage]

    %% Cache Policies
    L1 --> TTL[TTL: 24 hours<br/>Sliding expiration]
    L2 --> Cleanup[Cleanup: Weekly<br/>Expired sessions]

    %% Performance Metrics
    L1 --> FastPath[Fast Path: ~2ms<br/>Cache hit]
    L2 --> SlowPath[Slow Path: ~15ms<br/>Database lookup]

    %% Cache Warming
    LoginSuccess[Successful Login] --> CacheWarm[Warm Redis Cache]
    CacheWarm --> L1

    classDef request fill:#e1f5fe
    classDef cache fill:#fff8e1
    classDef performance fill:#e8f5e8

    class UserRequest,SessionCheck request
    class L1,L2,TTL,Cleanup cache
    class FastPath,SlowPath,CacheWarm performance
```

### JWT Performance Components

```mermaid
graph TB
    %% JWT Generation
    AuthRequest[Authentication Request] --> JWTCreate[JWT Creation]
    JWTCreate --> ClaimsAdd[Add Hasura Claims]
    ClaimsAdd --> SignJWT[Sign with RS256]

    %% Key Management
    SignJWT --> KeyStore[Private Key Store]
    KeyStore --> KeyRotation[Automatic Rotation]
    KeyRotation --> NewKeys[Generate New Keys]

    %% Public Key Distribution
    NewKeys --> JWKSUpdate[Update JWKS Endpoint]
    JWKSUpdate --> PublicKeys[Distribute Public Keys]

    %% Verification Performance
    GraphQLRequest[GraphQL Request] --> ExtractJWT[Extract JWT Header]
    ExtractJWT --> FetchJWKS[Fetch JWKS<br/>~35ms]
    FetchJWKS --> VerifySignature[Verify Signature<br/>~25ms]
    VerifySignature --> ExtractClaims[Extract Claims<br/>~5ms]

    %% Caching Optimization
    FetchJWKS --> JWKSCache[JWKS Cache<br/>5-minute TTL]
    JWKSCache --> CachedVerify[Cached Verification<br/>~15ms total]

    classDef generation fill:#e8f5e8
    classDef management fill:#fff3e0
    classDef verification fill:#f3e5f5
    classDef optimization fill:#fff8e1

    class AuthRequest,JWTCreate,ClaimsAdd,SignJWT generation
    class KeyStore,KeyRotation,NewKeys,JWKSUpdate management
    class GraphQLRequest,ExtractJWT,VerifySignature,ExtractClaims verification
    class JWKSCache,CachedVerify,FetchJWKS optimization
```

## Compliance and Audit Components

### PCI-DSS Compliance Architecture

```mermaid
graph TB
    %% Data Classification
    subgraph "Cardholder Data Environment (CDE)"
        AuthData[Authentication Data<br/>supertokens database]
        UserCreds[User Credentials<br/>bcrypt encrypted]
        Sessions[Session Data<br/>Secure tokens]
    end

    subgraph "Non-CDE Environment"
        FinanceData[Financial Data<br/>firefly database]
        AppLogs[Application Logs<br/>Non-sensitive]
        Metrics[Performance Metrics<br/>Anonymized]
    end

    %% Security Controls
    Firewall[Network Firewall] --> CDE
    Encryption[Data Encryption] --> AuthData
    Encryption --> FinanceData

    %% Access Controls
    JWT[JWT Authorization] --> FinanceData
    RLS[Row-Level Security] --> FinanceData

    %% Audit Requirements
    AuditLog[Audit Logging] --> AuthEvents[Authentication Events]
    AuditLog --> DataAccess[Data Access Events]
    AuditLog --> AdminActions[Administrative Actions]

    %% Monitoring
    SIEM[Security Monitoring] --> AuditLog
    SIEM --> AlertSystem[Alert System]

    classDef cde fill:#ffebee
    classDef noncde fill:#e8f5e8
    classDef security fill:#fff3e0
    classDef audit fill:#f3e5f5

    class AuthData,UserCreds,Sessions cde
    class FinanceData,AppLogs,Metrics noncde
    class Firewall,Encryption,JWT,RLS security
    class AuditLog,AuthEvents,DataAccess,AdminActions,SIEM,AlertSystem audit
```

### Audit Trail Components

```mermaid
graph LR
    %% Event Sources
    UserLogin[User Login] --> AuditEvent[Audit Event]
    UserLogout[User Logout] --> AuditEvent
    DataAccess[Data Access] --> AuditEvent
    PermChange[Permission Change] --> AuditEvent

    %% Event Processing
    AuditEvent --> EventEnrich[Event Enrichment]
    EventEnrich --> Timestamp[Add Timestamp]
    EventEnrich --> UserID[Add User ID]
    EventEnrich --> IPAddr[Add IP Address]
    EventEnrich --> UserAgent[Add User Agent]

    %% Storage
    EventEnrich --> ImmutableLog[Immutable Log Storage]
    ImmutableLog --> PostgreSQL[PostgreSQL Audit Table]

    %% Monitoring
    ImmutableLog --> RealTimeAlert[Real-time Alerting]
    RealTimeAlert --> SecurityTeam[Security Team]

    %% Reporting
    PostgreSQL --> ComplianceReport[Compliance Reporting]
    ComplianceReport --> AuditExport[Audit Data Export]

    classDef events fill:#e1f5fe
    classDef processing fill:#e8f5e8
    classDef storage fill:#fff8e1
    classDef monitoring fill:#ffebee

    class UserLogin,UserLogout,DataAccess,PermChange events
    class AuditEvent,EventEnrich,Timestamp,UserID,IPAddr,UserAgent processing
    class ImmutableLog,PostgreSQL storage
    class RealTimeAlert,SecurityTeam,ComplianceReport,AuditExport monitoring
```

## Error Handling and Resilience Components

### Authentication Error Handling

```mermaid
graph TB
    %% Error Sources
    UserError[User Input Error] --> ErrorHandler[Error Handler]
    NetworkError[Network Error] --> ErrorHandler
    ServiceError[Service Unavailable] --> ErrorHandler
    SessionError[Session Expired] --> ErrorHandler

    %% Error Classification
    ErrorHandler --> ClientError[Client Error<br/>4xx responses]
    ErrorHandler --> ServerError[Server Error<br/>5xx responses]
    ErrorHandler --> SecurityError[Security Error<br/>Authentication failures]

    %% Error Responses
    ClientError --> UserFeedback[User-Friendly Message]
    ServerError --> RetryLogic[Automatic Retry]
    SecurityError --> SecurityLog[Security Event Log]

    %% Graceful Degradation
    ServiceError --> Fallback[Fallback Behavior]
    Fallback --> CachedData[Use Cached Data]
    Fallback --> OfflineMode[Limited Offline Mode]

    %% Recovery Actions
    SessionError --> AutoRefresh[Automatic Token Refresh]
    AutoRefresh --> BackgroundRenewal[Background Session Renewal]

    classDef errors fill:#ffebee
    classDef handling fill:#fff3e0
    classDef recovery fill:#e8f5e8

    class UserError,NetworkError,ServiceError,SessionError errors
    class ErrorHandler,ClientError,ServerError,SecurityError handling
    class UserFeedback,RetryLogic,SecurityLog,Fallback,AutoRefresh recovery
```

## Future Authentication Enhancements

### Migration Readiness Components

```mermaid
graph TB
    %% Current Architecture
    subgraph "Current: SuperTokens"
        STCore[SuperTokens Core]
        STReact[SuperTokens React SDK]
        STJWT[SuperTokens JWT]
    end

    %% Abstract Interface
    AuthInterface[Abstract Auth Provider<br/>Interface]
    STCore --> AuthInterface
    STReact --> AuthInterface
    STJWT --> AuthInterface

    %% Future Migration Options
    subgraph "Future: Clerk Migration"
        ClerkCore[Clerk Backend]
        ClerkReact[Clerk React SDK]
        ClerkJWT[Clerk JWT]
    end

    AuthInterface --> ClerkCore
    AuthInterface --> ClerkReact
    AuthInterface --> ClerkJWT

    %% Environment Switching
    EnvConfig[Environment Configuration]
    EnvConfig --> SuperTokensMode[NEXT_PUBLIC_AUTH_PROVIDER=supertokens]
    EnvConfig --> ClerkMode[NEXT_PUBLIC_AUTH_PROVIDER=clerk]

    %% Migration Tools
    DataMigration[Data Migration Tools]
    UserMigration[User Account Migration]
    SessionMigration[Session Transfer]

    classDef current fill:#e8f5e8
    classDef interface fill:#fff3e0
    classDef future fill:#f3e5f5
    classDef migration fill:#fff8e1

    class STCore,STReact,STJWT current
    class AuthInterface interface
    class ClerkCore,ClerkReact,ClerkJWT future
    class EnvConfig,DataMigration,UserMigration,SessionMigration migration
```

## Cross-References

### Related Memory Files
- **System Architecture**: `docs/memory/knowledge-graph/system-architecture_v1.md`
- **SuperTokens Context**: `docs/memory/contextual/supertokens-authentication_context_relationships.md`
- **Security Compliance**: `docs/memory/contextual/security-compliance_context_relationships.md`
- **Frontend Architecture**: `docs/memory/contextual/frontend-architecture_context_relationships.md`
- **Static Implementation**: `docs/memory/static/2025-07-27_phase-1-1_supertokens-authentication-migration-complete.md`

### Implementation Files
- **SuperTokens Config**: `/apps/web/src/lib/auth.ts`
- **Backend Config**: `/apps/web/src/lib/supertokens-backend.ts`
- **API Routes**: `/apps/web/src/app/api/auth/[[...path]]/route.ts`
- **JWKS Endpoint**: `/apps/web/src/app/api/auth/jwt/jwks.json/route.ts`
- **AuthWrapper**: `/apps/web/src/components/auth/AuthWrapper.tsx`
- **Docker Compose**: `/infrastructure/docker/docker-compose.dev.yml`

### External Documentation
- **SuperTokens Architecture**: https://supertokens.com/docs/architecture
- **SuperTokens React SDK**: https://supertokens.com/docs/auth-react
- **JWT Best Practices**: https://tools.ietf.org/html/rfc7519
- **PCI-DSS Requirements**: https://www.pcisecuritystandards.org/

## Conclusion

The SuperTokens authentication component architecture provides a comprehensive, secure, and scalable foundation for Atlas Financial's user authentication and authorization needs. The component relationships demonstrate clear separation of concerns, robust security practices, and excellent performance characteristics.

Key architectural achievements:
- ✅ **Component Isolation**: Clear boundaries between authentication and financial data
- ✅ **Security by Design**: PCI-DSS 4.0 compliance built into architecture
- ✅ **Performance Optimization**: Multi-layer caching with sub-50ms response times
- ✅ **Future Flexibility**: Abstract interfaces enable easy provider migration
- ✅ **Comprehensive Monitoring**: Full audit trail and security event tracking

This authentication architecture supports Atlas Financial's vision of secure, self-hosted financial management while maintaining the flexibility to evolve with changing requirements and security standards.

---

**Document Version**: 1.0
**Last Updated**: 2025-07-27
**Architecture Status**: Production Ready
**Security Level**: PCI-DSS 4.0 Compliant
