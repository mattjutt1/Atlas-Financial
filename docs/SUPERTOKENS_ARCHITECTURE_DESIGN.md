# SuperTokens Architecture Design for Atlas Financial

## Executive Summary

This document outlines the comprehensive SuperTokens authentication architecture for Atlas Financial, designed to replace the removed NextAuth/Keycloak setup while providing seamless integration with Hasura GraphQL, PCI-DSS 4.0 compliance, and future Clerk migration compatibility.

## Current State Analysis

### Existing Infrastructure
- **Frontend**: Next.js 15 with React 19 (`/home/matt/Atlas-Financial/apps/web`)
- **Backend**: Hasura GraphQL engine (v2.42.0)
- **Database**: PostgreSQL 15 with multiple databases (atlas_financial, firefly, hasura, grafana)
- **Caching**: Redis 7 for session storage
- **Containerization**: Docker Compose development environment
- **Dependencies**: NextAuth still in package.json but implementation removed

### Infrastructure Gaps
- Authentication service completely removed
- Hasura JWT configuration missing
- Frontend auth integration placeholder files only
- No session management implementation

## SuperTokens Architecture Design

### 1. Service Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   SuperTokens    │    │   Hasura        │
│   (Next.js 15)  │◄──►│   Core Service   │◄──►│   GraphQL       │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Redis         │    │   PostgreSQL     │    │   AI Engine     │
│   (Sessions)    │    │   (Auth DB)      │    │   (Protected)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 2. Component Architecture

#### SuperTokens Core Service
- **Purpose**: Self-hosted authentication service
- **Database**: Dedicated `supertokens` PostgreSQL database
- **Features**: User management, session handling, JWT generation
- **Security**: Isolated from financial data for PCI-DSS compliance

#### Next.js Backend Integration
- **SDK**: SuperTokens Node.js SDK in API routes
- **Endpoints**: `/api/auth/*` for authentication flows
- **JWT Claims**: Custom Hasura-specific claims generation
- **Session**: Integration with Redis for scalable session storage

#### Frontend Integration
- **SDK**: SuperTokens React SDK
- **Components**: Pre-built authentication UI components
- **Session Management**: Automatic token refresh and session validation
- **Routing**: Protected route wrapper components

## Database Design

### SuperTokens Database Schema

```sql
-- Database: supertokens (separate for PCI-DSS compliance)
-- Tables managed by SuperTokens Core:
-- - all_auth_recipe_users
-- - emailpassword_users
-- - emailpassword_pswd_reset_tokens
-- - session_info
-- - session_access_token_signing_keys
-- - jwt_signing_keys
-- - user_metadata
-- - user_roles
-- - role_permissions
```

### Database Configuration

```yaml
# PostgreSQL Configuration
databases:
  - atlas_financial    # Main application data
  - firefly            # Financial data
  - hasura             # GraphQL metadata
  - grafana            # Observability data
  - supertokens        # Authentication data (NEW)
```

## Docker Service Configuration

### Updated docker-compose.dev.yml

```yaml
services:
  # SuperTokens Core Service
  supertokens:
    image: registry.supertokens.io/supertokens/supertokens-postgresql:9.2
    container_name: atlas-supertokens
    environment:
      POSTGRESQL_CONNECTION_URI: "postgresql://atlas:${POSTGRES_PASSWORD:-atlas_dev_password}@postgres:5432/supertokens"
      API_KEYS: ${SUPERTOKENS_API_KEY:-atlas_supertokens_api_key}
      SUPERTOKENS_HOST: "0.0.0.0"
      SUPERTOKENS_PORT: 3567
    ports:
      - "3567:3567"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - atlas-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3567/hello || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Updated Hasura with JWT Configuration
  hasura:
    image: hasura/graphql-engine:v2.42.0
    container_name: atlas-hasura
    environment:
      HASURA_GRAPHQL_DATABASE_URL: postgres://atlas:${POSTGRES_PASSWORD:-atlas_dev_password}@postgres:5432/firefly
      HASURA_GRAPHQL_METADATA_DATABASE_URL: postgres://atlas:${POSTGRES_PASSWORD:-atlas_dev_password}@postgres:5432/hasura
      HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
      HASURA_GRAPHQL_DEV_MODE: "true"
      HASURA_GRAPHQL_ADMIN_SECRET: ${HASURA_ADMIN_SECRET:-atlas_hasura_admin_secret}
      # JWT Configuration for SuperTokens
      HASURA_GRAPHQL_JWT_SECRET: |
        {
          "jwk_url": "http://web:3000/api/auth/jwt/jwks.json",
          "issuer": "https://api.supertokens.io/auth",
          "audience": "atlas-financial"
        }
      HASURA_GRAPHQL_UNAUTHORIZED_ROLE: anonymous
    ports:
      - "8081:8080"
    depends_on:
      postgres:
        condition: service_healthy
      supertokens:
        condition: service_healthy
    networks:
      - atlas-network

  # Frontend Service (for development)
  web:
    build:
      context: ../../apps/web
      dockerfile: Dockerfile.dev
    container_name: atlas-web
    environment:
      SUPERTOKENS_CONNECTION_URI: http://supertokens:3567
      SUPERTOKENS_API_KEY: ${SUPERTOKENS_API_KEY:-atlas_supertokens_api_key}
      HASURA_GRAPHQL_ENDPOINT: http://hasura:8080/v1/graphql
      HASURA_ADMIN_SECRET: ${HASURA_ADMIN_SECRET:-atlas_hasura_admin_secret}
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:-atlas_nextauth_secret}
    ports:
      - "3000:3000"
    depends_on:
      supertokens:
        condition: service_healthy
    networks:
      - atlas-network
    volumes:
      - ../../apps/web:/app
      - /app/node_modules
```

### Database Initialization Script Update

```bash
#!/bin/bash
# infrastructure/docker/scripts/create-multiple-databases.sh

set -e
set -u

function create_user_and_database() {
    local database=$1
    echo "Creating user and database '$database'"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        CREATE DATABASE $database;
        GRANT ALL PRIVILEGES ON DATABASE $database TO $POSTGRES_USER;
EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        create_user_and_database $db
    done
    echo "Multiple databases created"
fi
```

## Frontend Integration

### Package.json Updates

```json
{
  "dependencies": {
    "supertokens-auth-react": "^0.50.0",
    "supertokens-node": "^20.1.0",
    "supertokens-web-js": "^0.15.0"
  }
}
```

### SuperTokens Configuration

```typescript
// src/lib/supertokens.ts
import SuperTokens from "supertokens-auth-react";
import EmailPassword from "supertokens-auth-react/recipe/emailpassword";
import Session from "supertokens-auth-react/recipe/session";

export const superTokensConfig = {
  appInfo: {
    appName: "Atlas Financial",
    apiDomain: process.env.NEXT_PUBLIC_API_DOMAIN || "http://localhost:3000",
    websiteDomain: process.env.NEXT_PUBLIC_WEBSITE_DOMAIN || "http://localhost:3000",
    apiBasePath: "/api/auth",
    websiteBasePath: "/auth"
  },
  recipeList: [
    EmailPassword.init({
      signInAndUpFeature: {
        disableDefaultUI: false,
        signUpForm: {
          formFields: [
            {
              id: "email",
              label: "Email Address",
              placeholder: "Enter your email"
            },
            {
              id: "password",
              label: "Password",
              placeholder: "Enter your password"
            }
          ]
        }
      }
    }),
    Session.init({
      tokenTransferMethod: "cookie",
      cookieSecure: process.env.NODE_ENV === "production",
      cookieSameSite: "lax"
    })
  ]
};

SuperTokens.init(superTokensConfig);
```

### Backend API Configuration

```typescript
// src/lib/supertokens-backend.ts
import SuperTokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
import Dashboard from "supertokens-node/recipe/dashboard";

export const backendConfig = () => {
  return {
    framework: "express",
    supertokens: {
      connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || "http://localhost:3567",
      apiKey: process.env.SUPERTOKENS_API_KEY
    },
    appInfo: {
      appName: "Atlas Financial",
      apiDomain: process.env.API_DOMAIN || "http://localhost:3000",
      websiteDomain: process.env.WEBSITE_DOMAIN || "http://localhost:3000",
      apiBasePath: "/api/auth",
      websiteBasePath: "/auth"
    },
    recipeList: [
      EmailPassword.init(),
      Session.init({
        jwt: {
          enable: true,
          issuer: "https://api.supertokens.io/auth",
          audience: "atlas-financial"
        },
        override: {
          functions: (originalImplementation) => {
            return {
              ...originalImplementation,
              createNewSession: async (input) => {
                // Add custom Hasura JWT claims
                input.accessTokenPayload = {
                  ...input.accessTokenPayload,
                  "https://hasura.io/jwt/claims": {
                    "x-hasura-user-id": input.userId,
                    "x-hasura-default-role": "user",
                    "x-hasura-allowed-roles": ["user", "anonymous"]
                  }
                };
                return originalImplementation.createNewSession(input);
              }
            };
          }
        }
      }),
      Dashboard.init({
        apiKey: process.env.SUPERTOKENS_API_KEY
      })
    ],
    isInServerlessEnv: false
  };
};

SuperTokens.init(backendConfig());
```

### API Routes Implementation

```typescript
// src/app/api/auth/[[...path]]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { superTokensNextWrapper } from "supertokens-node/nextjs";
import { middleware } from "supertokens-node/framework/express";
import "../../../lib/supertokens-backend";

const handleAuth = async (request: NextRequest) => {
  const response = NextResponse.next();

  await superTokensNextWrapper(
    async (next) => {
      await middleware()(request, response, next);
    },
    request,
    response
  );

  return response;
};

export async function GET(request: NextRequest) {
  return handleAuth(request);
}

export async function POST(request: NextRequest) {
  return handleAuth(request);
}

export async function DELETE(request: NextRequest) {
  return handleAuth(request);
}

export async function PUT(request: NextRequest) {
  return handleAuth(request);
}

export async function PATCH(request: NextRequest) {
  return handleAuth(request);
}

export async function HEAD(request: NextRequest) {
  return handleAuth(request);
}
```

### JWKS Endpoint

```typescript
// src/app/api/auth/jwt/jwks.json/route.ts
import { NextRequest, NextResponse } from "next/server";
import SuperTokens from "supertokens-node";

export async function GET(request: NextRequest) {
  try {
    const jwks = await SuperTokens.getJWKS();
    return NextResponse.json(jwks);
  } catch (error) {
    return NextResponse.json({ error: "Failed to get JWKS" }, { status: 500 });
  }
}
```

## JWT Integration with Hasura

### JWT Claims Structure

```json
{
  "sub": "user_id_here",
  "iat": 1640995200,
  "exp": 1641081600,
  "iss": "https://api.supertokens.io/auth",
  "aud": "atlas-financial",
  "https://hasura.io/jwt/claims": {
    "x-hasura-user-id": "user_id_here",
    "x-hasura-default-role": "user",
    "x-hasura-allowed-roles": ["user", "admin", "anonymous"]
  }
}
```

### Hasura Permission Rules

```yaml
# User role permissions
user:
  select:
    filter: { user_id: { _eq: "X-Hasura-User-Id" } }
    columns: ["*"]
  insert:
    check: { user_id: { _eq: "X-Hasura-User-Id" } }
    columns: ["*"]
  update:
    filter: { user_id: { _eq: "X-Hasura-User-Id" } }
    check: { user_id: { _eq: "X-Hasura-User-Id" } }
    columns: ["*"]
  delete:
    filter: { user_id: { _eq: "X-Hasura-User-Id" } }

# Anonymous role permissions
anonymous:
  select:
    filter: false
    columns: []
```

## Security & PCI-DSS Compliance

### Data Separation Strategy
- **Authentication Data**: Isolated in `supertokens` database
- **Financial Data**: Separate `firefly` database
- **Application Data**: Separate `atlas_financial` database
- **Compliance**: Meets PCI-DSS requirement for data segregation

### Security Features
- **Encryption in Transit**: TLS 1.2+ for all communications
- **Encryption at Rest**: PostgreSQL encryption for auth database
- **Session Security**: HttpOnly cookies, secure flags in production
- **CSRF Protection**: Built-in SuperTokens CSRF protection
- **Rate Limiting**: API rate limiting on auth endpoints
- **Audit Logging**: Authentication events logged for compliance

### Environment Security

```bash
# .env.local (development)
POSTGRES_PASSWORD=atlas_dev_password
SUPERTOKENS_API_KEY=atlas_supertokens_api_key
HASURA_ADMIN_SECRET=atlas_hasura_admin_secret
NEXTAUTH_SECRET=atlas_nextauth_secret
REDIS_PASSWORD=atlas_redis_password

# Production environment variables managed via Docker secrets
```

## Migration Strategy

### Phase 1: Infrastructure Setup (1-2 days)
1. **Update docker-compose.dev.yml**
   - Add SuperTokens core service
   - Update Hasura JWT configuration
   - Add frontend service configuration

2. **Update database initialization**
   - Add `supertokens` database creation
   - Test service connectivity

3. **Environment configuration**
   - Set up development environment variables
   - Test service startup sequence

### Phase 2: Backend Integration (2-3 days)
1. **Remove NextAuth dependencies**
   ```bash
   npm uninstall next-auth
   npm install supertokens-auth-react supertokens-node supertokens-web-js
   ```

2. **Implement SuperTokens backend**
   - Create backend configuration
   - Implement API routes
   - Add JWT claims customization
   - Set up session verification middleware

3. **Test backend functionality**
   - Verify SuperTokens core connectivity
   - Test JWT generation and claims
   - Validate JWKS endpoint

### Phase 3: Hasura Configuration (1 day)
1. **Configure JWT environment**
   - Update HASURA_GRAPHQL_JWT_SECRET
   - Set JWKS URL endpoint
   - Configure role hierarchy

2. **Set up permissions**
   - Define user role permissions
   - Configure anonymous access
   - Test GraphQL queries with JWT

### Phase 4: Frontend Integration (2-3 days)
1. **Remove NextAuth frontend**
   ```typescript
   // Remove from src/components/providers/SessionProvider.tsx
   // Remove from src/hooks/useAuthentication.ts
   // Remove from src/app/layout.tsx
   ```

2. **Implement SuperTokens frontend**
   - Add SuperTokens provider
   - Implement auth UI components
   - Update session management hooks
   - Create protected route wrapper

3. **Test authentication flows**
   - Sign up flow
   - Sign in flow
   - Session management
   - Protected routes

### Phase 5: Testing & Validation (1-2 days)
1. **End-to-end testing**
   - Complete authentication flows
   - GraphQL queries with authentication
   - Session persistence and refresh
   - Error handling scenarios

2. **Security validation**
   - JWT token validation
   - CSRF protection testing
   - Session security testing
   - Role-based access control

### Phase 6: Documentation & Deployment Prep (1 day)
1. **Update documentation**
   - API documentation
   - Deployment guide
   - Development setup guide

2. **Production configuration**
   - Production environment variables
   - Security hardening checklist
   - Monitoring and alerting setup

## Clerk Migration Compatibility

### Abstract Auth Provider Interface

```typescript
// src/lib/auth-provider.ts
export interface AuthProvider {
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  getSession: () => Promise<Session | null>;
  getUser: () => Promise<User | null>;
  onSessionChange: (callback: (session: Session | null) => void) => void;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface Session {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface User {
  id: string;
  email: string;
  roles: string[];
  metadata?: Record<string, any>;
}
```

### Provider Strategy Implementation

```typescript
// src/lib/auth-providers/supertokens-provider.ts
import { AuthProvider, AuthResult, Session, User } from '../auth-provider';
import SuperTokens from 'supertokens-web-js';

export class SuperTokensProvider implements AuthProvider {
  async signIn(email: string, password: string): Promise<AuthResult> {
    // SuperTokens implementation
  }

  async signUp(email: string, password: string): Promise<AuthResult> {
    // SuperTokens implementation
  }

  async signOut(): Promise<void> {
    // SuperTokens implementation
  }

  async getSession(): Promise<Session | null> {
    // SuperTokens implementation
  }

  async getUser(): Promise<User | null> {
    // SuperTokens implementation
  }

  onSessionChange(callback: (session: Session | null) => void): void {
    // SuperTokens implementation
  }
}
```

```typescript
// src/lib/auth-providers/clerk-provider.ts
import { AuthProvider, AuthResult, Session, User } from '../auth-provider';
import { ClerkProvider as ClerkJS } from '@clerk/nextjs';

export class ClerkProvider implements AuthProvider {
  async signIn(email: string, password: string): Promise<AuthResult> {
    // Clerk implementation
  }

  // ... other methods with Clerk implementation
}
```

### Environment-Based Provider Selection

```typescript
// src/lib/auth.ts
import { AuthProvider } from './auth-provider';
import { SuperTokensProvider } from './auth-providers/supertokens-provider';
import { ClerkProvider } from './auth-providers/clerk-provider';

export function getAuthProvider(): AuthProvider {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'supertokens';

  switch (provider) {
    case 'supertokens':
      return new SuperTokensProvider();
    case 'clerk':
      return new ClerkProvider();
    default:
      throw new Error(`Unsupported auth provider: ${provider}`);
  }
}

export const authProvider = getAuthProvider();
```

### Migration Environment Variables

```bash
# SuperTokens Configuration
NEXT_PUBLIC_AUTH_PROVIDER=supertokens
SUPERTOKENS_CONNECTION_URI=http://localhost:3567
SUPERTOKENS_API_KEY=your_api_key

# Clerk Configuration (for future migration)
# NEXT_PUBLIC_AUTH_PROVIDER=clerk
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
# CLERK_SECRET_KEY=sk_test_...
```

## Performance & Monitoring

### Performance Targets
- **Authentication Response Time**: < 200ms
- **JWT Verification**: < 50ms
- **Session Validation**: < 30ms
- **GraphQL Query Authorization**: < 100ms

### Monitoring Strategy
- **Health Checks**: All services with health endpoints
- **Metrics**: Authentication success/failure rates
- **Logging**: Structured logging for auth events
- **Alerting**: Failed authentication attempts, service downtime

### Caching Strategy
- **JWT Claims**: Cache user roles and permissions
- **Session Data**: Redis for session storage
- **JWKS**: Cache public keys for JWT verification
- **User Metadata**: Cache frequently accessed user data

## Deployment Configuration

### Production Environment Variables

```yaml
# Production docker-compose.yml
services:
  supertokens:
    environment:
      POSTGRESQL_CONNECTION_URI: ${SUPERTOKENS_DB_URL}
      API_KEYS: ${SUPERTOKENS_API_KEY}

  hasura:
    environment:
      HASURA_GRAPHQL_JWT_SECRET: ${HASURA_JWT_SECRET}

  web:
    environment:
      SUPERTOKENS_CONNECTION_URI: ${SUPERTOKENS_CONNECTION_URI}
      SUPERTOKENS_API_KEY: ${SUPERTOKENS_API_KEY}
```

### Security Hardening Checklist

- [ ] Enable HTTPS in production
- [ ] Configure secure cookie settings
- [ ] Set up CORS properly
- [ ] Enable rate limiting on auth endpoints
- [ ] Configure proper session timeouts
- [ ] Set up audit logging
- [ ] Enable database encryption at rest
- [ ] Configure network security groups
- [ ] Set up monitoring and alerting
- [ ] Regular security updates

## Conclusion

This SuperTokens architecture provides:

1. **Complete Authentication Solution**: Self-hosted, secure, PCI-DSS compliant
2. **Seamless Hasura Integration**: JWT-based authorization with custom claims
3. **Docker Containerization**: Full development and production environment
4. **Future Migration Path**: Abstract provider interface for easy Clerk migration
5. **Security Compliance**: Meets PCI-DSS 4.0 requirements for financial applications
6. **Performance Optimization**: Sub-400ms response times with proper caching
7. **Monitoring & Observability**: Comprehensive logging and health checks

The architecture is designed to be production-ready, secure, scalable, and migration-friendly while integrating seamlessly with the existing Atlas Financial technology stack.

## Next Steps

1. **Review and Approve Architecture**: Stakeholder review of this design document
2. **Begin Phase 1 Implementation**: Infrastructure setup and service configuration
3. **Iterative Development**: Follow the 6-phase implementation plan
4. **Testing and Validation**: Comprehensive testing before production deployment
5. **Documentation Updates**: Keep documentation current throughout implementation
6. **Production Deployment**: Staged rollout with monitoring and rollback procedures

---

*Document Version: 1.0*
*Last Updated: 2025-07-26*
*Author: Claude Code - Next.js 15 & React 19 Expert*
