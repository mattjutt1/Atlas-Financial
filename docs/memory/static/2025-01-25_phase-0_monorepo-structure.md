# Static Memory: Monorepo Structure Design

**Date**: 2025-01-25
**Phase**: Phase 0 - Project Bootstrap
**Action**: Monorepo Structure Design
**Status**: Completed

## What Was Done

### 1. Directory Structure Created
```bash
mkdir -p {services/{firefly,hasura,keycloak,ai-engine},apps/{web,mobile},packages/{shared,ui},infrastructure/{docker,k8s},docs/{api,deployment,user},scripts,tests/{integration,e2e}}
```

### 2. Root Package.json Updated
- **File**: `/home/matt/Atlas-Financial/package.json`
- **Changes**:
  - Updated to monorepo workspace structure
  - Added Atlas-specific scripts (atlas:up, atlas:down, atlas:reset)
  - Configured for npm workspaces
  - Added development dependencies for TypeScript, ESLint, Prettier

### 3. Memory System Established
- **File**: `/home/matt/Atlas-Financial/docs/CLAUDE_MEMORY_SYSTEM.md`
- **Purpose**: Define three-tier documentation system (Static, Contextual, Knowledge Graph)
- **Structure**: Created `docs/memory/{static,contextual,knowledge-graph}` directories

## Commands Executed
```bash
# Directory creation
mkdir -p {services/{firefly,hasura,keycloak,ai-engine},apps/{web,mobile},packages/{shared,ui},infrastructure/{docker,k8s},docs/{api,deployment,user},scripts,tests/{integration,e2e}}

# Memory system directories
mkdir -p docs/memory/{static,contextual,knowledge-graph}
```

## Files Created/Modified
1. `/home/matt/Atlas-Financial/package.json` - Updated to v1.1.0 monorepo structure
2. `/home/matt/Atlas-Financial/docs/CLAUDE_MEMORY_SYSTEM.md` - Memory system documentation
3. Directory structure - Complete monorepo layout

## Technical Decisions
- **Monorepo Strategy**: npm workspaces for unified dependency management
- **Service Architecture**: Microservices pattern with separate containers
- **Documentation Strategy**: Three-tier memory system for complete traceability

## Next Steps
- Set up Docker Compose configuration for all services
- Create CI/CD pipeline with GitHub Actions
- Set up basic Next.js frontend structure

## References
- PRD Document: `/home/matt/Atlas-Financial/docs/one shot prompt with prd.txt`
- Firefly III: https://github.com/firefly-iii/firefly-iii
- Hasura Docker Setup: https://hasura.io/docs/latest/getting-started/docker-simple/
- Keycloak Docker: https://www.keycloak.org/getting-started/getting-started-docker
