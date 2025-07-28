# Static Memory: AI Engine Service Setup

**Date**: 2025-01-25
**Phase**: Phase 0 - Project Bootstrap
**Action**: AI Engine Service Structure Creation
**Status**: Completed

## What Was Done

### 1. AI Engine Docker Configuration
**File**: `/home/matt/Atlas-Financial/services/ai-engine/Dockerfile`
**Base Image**: python:3.12-slim
**Exposed Port**: 8000
**Features**:
- Health check endpoint at `/health`
- Volume mounts for models and cache
- FastAPI with Uvicorn server

### 2. Python Dependencies
**File**: `/home/matt/Atlas-Financial/services/ai-engine/requirements.txt`
**Key Dependencies**:
- **FastAPI**: Web framework for API endpoints
- **PyTorch + Transformers**: AI/ML capabilities
- **asyncpg**: PostgreSQL async connectivity
- **httpx**: Hasura GraphQL client
- **sentence-transformers**: Vector embeddings
- **pgvector**: Vector database support

### 3. Main Application Structure
**File**: `/home/matt/Atlas-Financial/services/ai-engine/main.py`
**Architecture**: FastAPI application with structured logging
**Endpoints**:
- `GET /health` - Service health check
- `POST /insights/generate` - Generate AI insights
- `POST /insights/budget-check` - 75/15/10 budget rule validation
- `POST /insights/debt-snowball` - Ramsey debt snowball analysis
- `POST /insights/portfolio-analysis` - Dalio All-Weather portfolio check
- `GET /models/status` - AI model status information

### 4. Configuration Management
**File**: `/home/matt/Atlas-Financial/services/ai-engine/src/config.py`
**Framework**: Pydantic Settings for type-safe configuration
**Key Settings**:
- Hasura endpoint and authentication
- AI model configuration
- Financial rules toggles
- Brutal honesty level settings

### 5. Directory Structure Created
```bash
mkdir -p /home/matt/Atlas-Financial/services/ai-engine/{src/{ai,data,models},scripts,tests}
```
**Structure**:
- `src/ai/` - AI model and processing logic
- `src/data/` - Data access layer (Hasura client)
- `src/models/` - Pydantic data models
- `scripts/` - Utility scripts
- `tests/` - Unit and integration tests

## Commands Executed
```bash
# Create AI Engine directory structure
mkdir -p /home/matt/Atlas-Financial/services/ai-engine/{src/{ai,data,models},scripts,tests}
```

## Files Created/Modified
1. `/home/matt/Atlas-Financial/services/ai-engine/Dockerfile` - Container definition
2. `/home/matt/Atlas-Financial/services/ai-engine/requirements.txt` - Python dependencies
3. `/home/matt/Atlas-Financial/services/ai-engine/main.py` - FastAPI application
4. `/home/matt/Atlas-Financial/services/ai-engine/src/config.py` - Configuration management
5. Directory structure - Complete service layout

## Technical Decisions

### AI Model Strategy
- **Local Processing**: All AI processing happens locally (no external API calls)
- **Llama-based Models**: Using open-source Llama models for financial insights
- **Vector Storage**: pgvector extension for semantic transaction search
- **Batch Processing**: AI insights generated on-demand or scheduled, not real-time

### API Design Philosophy
- **RESTful Endpoints**: Clear separation of concerns for different insight types
- **Async Processing**: Background tasks for storing insights
- **Health Monitoring**: Comprehensive health checks for all dependencies
- **Structured Logging**: JSON logging for observability

### Financial Rules Implementation
**75/15/10 Budget Rule**: Spend ≤75% income, save ≥15%, donate ≥10%
**Ramsey Debt Snowball**: Pay minimums on all debts, extra on smallest balance
**Dalio All-Weather**: Risk parity portfolio allocation analysis

### Security Considerations
- **JWT Integration**: Planned integration with Keycloak JWT tokens
- **CORS Configuration**: Restricted to frontend and Hasura origins
- **Environment Variables**: All secrets externalized
- **Input Validation**: Pydantic models for all API inputs

## Integration Points

### Hasura GraphQL Connection
```python
hasura_client = HasuraClient(
    endpoint=settings.hasura_endpoint,
    admin_secret=settings.hasura_admin_secret
)
```

### Database Vector Storage
```python
# pgvector integration for transaction embeddings
# Enables semantic search: "Show me all dining transactions similar to this"
```

### Docker Compose Integration
```yaml
ai-engine:
  build: ../../services/ai-engine
  ports: ["8083:8000"]
  depends_on: [hasura]
```

## Brutal Honesty Implementation Plan
- **Configurable Tone**: gentle/moderate/brutal honesty levels
- **Rule-Based Insights**: Apply strict financial principles
- **Transparent Reasoning**: AI explains its recommendations
- **No Sugar-Coating**: Direct feedback on financial mistakes

## Next Steps
1. Implement InsightsGenerator class with local LLM
2. Create HasuraClient for GraphQL data access
3. Build FinancialRulesEngine with budget/debt/portfolio logic
4. Add Pydantic models for API request/response
5. Create model download and initialization scripts

## Dependencies for Next Phase
- [ ] Local LLM model selection and download
- [ ] Hasura schema design for financial data
- [ ] Vector database schema for transaction embeddings
- [ ] Integration tests with mock financial data

## Cross-References
- **Previous Static**: `docs/memory/static/2025-01-25_phase-0_docker-compose-setup.md`
- **Related Contextual**: `docs/memory/contextual/ai-engine_context_relationships.md`
- **Current Knowledge Graph**: `docs/memory/knowledge-graph/system-architecture_v1.1.md`
- **PRD Reference**: Section 2.3 (AI & Rules Engine), Section 3 (AI Insights Epic)
- **AI Model Research**: Local LLM options for financial domain
