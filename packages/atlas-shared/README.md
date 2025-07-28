# Atlas Financial Shared Library

A comprehensive shared library for the Atlas Financial modular monolith architecture, implementing DRY principles across all services while maintaining bank-grade security standards.

## Architecture Overview

This shared library consolidates common functionality across:
- **Frontend Applications**: apps/platform, apps/web
- **Backend Services**: rust-financial-engine, ai-engine, hasura
- **Infrastructure**: Docker, Kubernetes, monitoring

## Packages Structure

```
packages/atlas-shared/
├── auth/                    # Authentication & authorization
├── config/                  # Configuration management
├── errors/                  # Error handling & validation
├── graphql/                 # GraphQL schemas & types
├── utils/                   # Utility functions
├── types/                   # TypeScript type definitions
├── security/                # Security utilities
├── monitoring/              # Observability helpers
└── database/                # Database patterns & connections
```

## Key Features

### 🔐 Security-First Design
- Bank-grade authentication patterns
- Centralized security validation
- Encrypted configuration management
- Audit logging and compliance

### 🏗️ DRY Implementation
- Eliminates code duplication across services
- Consistent patterns and interfaces
- Shared business logic and validation
- Unified error handling

### 🔧 Framework Agnostic
- Works with React, Next.js, Rust, Python
- GraphQL and REST API support
- Environment-specific configurations
- Cross-platform compatibility

### 📊 Observable by Design
- Structured logging
- Metrics collection
- Performance monitoring
- Error tracking

## Usage Examples

### Authentication
```typescript
import { AuthProvider, useAuth } from '@atlas/shared/auth'

// Use consistent auth across all apps
const { user, isAuthenticated, hasRole } = useAuth()
```

### Configuration
```typescript
import { getConfig } from '@atlas/shared/config'

// Environment-aware configuration
const config = getConfig('production')
```

### Error Handling
```typescript
import { ApiError, handleError } from '@atlas/shared/errors'

// Consistent error patterns
throw ApiError.validation('email', 'Invalid format')
```

### GraphQL
```typescript
import { USER_FRAGMENT, GET_USER_ACCOUNTS } from '@atlas/shared/graphql'

// Shared queries and fragments
const { data } = useQuery(GET_USER_ACCOUNTS)
```

## Integration

This library is designed to work seamlessly with:
- **Next.js** applications (platform, web)
- **Rust** services (financial-engine)
- **Python** services (ai-engine)
- **Hasura** GraphQL engine
- **Docker** containerized environments

## Security Standards

All components maintain Atlas Financial's bank-grade security requirements:
- Encrypted data handling
- Secure authentication flows
- Audit trail compliance
- PCI DSS adherence
- SOC 2 Type II compliance

## Documentation

- [Authentication Guide](./auth/README.md)
- [Configuration Management](./config/README.md)
- [Error Handling Patterns](./errors/README.md)
- [GraphQL Integration](./graphql/README.md)
- [Security Best Practices](./security/README.md)