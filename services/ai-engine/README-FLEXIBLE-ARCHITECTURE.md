# Atlas Financial AI Engine - Flexible Multi-Agent Architecture

## Overview

The Atlas Financial AI Engine provides a flexible, scalable architecture that seamlessly supports both monolithic and multi-agent AI approaches. This design enables immediate deployment with simple models while providing a clear migration path to sophisticated multi-agent systems with specialized financial intelligence.

## Key Features

- **🔄 Flexible Backend Support**: Switch between monolithic and multi-agent modes without changing application code
- **📊 Unified GraphQL API**: Single interface for all AI operations regardless of underlying implementation
- **🎯 Specialized Financial Agents**: Purpose-built agents for budget optimization, investment analysis, debt strategy, market intelligence, and goal planning
- **⚡ High Performance**: Sub-400ms response times with intelligent request routing
- **🔒 Bank-Grade Security**: End-to-end encryption, audit logging, and compliance support
- **📈 A/B Testing Framework**: Built-in testing and gradual rollout capabilities
- **🐳 Container-Native**: Full Docker and Kubernetes support with auto-scaling

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│           (Wave 1 Systems + New AI Features)                │
└─────────────────────────────────────────────────────────────┘
                              │
                    Unified GraphQL API
                              │
┌─────────────────────────────────────────────────────────────┐
│                   AI Engine Core                            │
│        (Orchestration, Routing, Context Management)         │
└─────────────────────────────────────────────────────────────┘
                              │
                    Strategy Pattern Switch
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
┌───────▼────────┐                         ┌───────▼────────┐
│   Monolithic   │                         │  Multi-Agent   │
│    Backend     │                         │    Backend     │
│                │                         │                │
│  Single Model  │                         │  Supervisor +  │
│   (3B/7B)      │                         │   Workers      │
└────────────────┘                         └────────────────┘
```

## Deployment Modes

### 1. Monolithic Mode
- **Single large model** (3B/7B parameters) handles all AI operations
- **Simple deployment** with minimal resource requirements
- **Fast startup** and predictable performance
- **Ideal for**: Initial deployment, development, small-scale operations

### 2. Multi-Agent Mode
- **Supervisor agent** (3B/7B) coordinates specialized workers
- **Specialized workers** (sub-1B each) for specific financial domains
- **Higher accuracy** through domain specialization
- **Better scalability** and parallel processing
- **Ideal for**: Production systems, high-volume operations

### 3. Hybrid Mode
- **Both backends available** for comparison and gradual migration
- **A/B testing** between approaches
- **Fallback capability** for reliability
- **Ideal for**: Migration periods, performance testing

## Specialized AI Agents

### Budget Optimization Agent
- **Focus**: Spending pattern analysis and budget recommendations
- **Capabilities**: Category optimization, anomaly detection, savings identification
- **Model Size**: 800M parameters
- **Response Time**: <300ms

### Investment Analysis Agent
- **Focus**: Portfolio optimization and risk assessment
- **Capabilities**: Asset allocation, rebalancing, performance analysis
- **Model Size**: 800M parameters
- **Response Time**: <400ms

### Debt Strategy Agent
- **Focus**: Debt payoff optimization and consolidation analysis
- **Capabilities**: Payment strategies, interest minimization, timeline optimization
- **Model Size**: 600M parameters
- **Response Time**: <300ms

### Market Intelligence Agent
- **Focus**: Real-time market analysis and alert generation
- **Capabilities**: Trend detection, correlation analysis, opportunity identification
- **Model Size**: 800M parameters
- **Response Time**: <200ms (real-time optimized)

### Goal Planning Agent
- **Focus**: Financial goal achievement and timeline optimization
- **Capabilities**: Milestone tracking, adaptive planning, progress forecasting
- **Model Size**: 600M parameters
- **Response Time**: <300ms

## Quick Start

### Prerequisites

- Docker 20.10+ with Docker Compose v2
- NVIDIA Docker runtime (for GPU acceleration)
- At least 16GB RAM and 10GB free disk space
- Python 3.11+ (for development)

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/atlas-financial/ai-engine.git
cd ai-engine

# Create environment configuration
cp config/deployment.env.example config/deployment.env

# Edit configuration as needed
nano config/deployment.env
```

### 2. Deploy in Monolithic Mode

```bash
# Deploy with monolithic backend (fastest startup)
AI_DEPLOYMENT_MODE=monolithic ./scripts/deploy-flexible.sh deploy

# Check status
./scripts/deploy-flexible.sh status

# View logs
./scripts/deploy-flexible.sh logs
```

### 3. Deploy in Multi-Agent Mode

```bash
# Deploy with multi-agent backend (higher performance)
AI_DEPLOYMENT_MODE=multi_agent ./scripts/deploy-flexible.sh deploy

# Scale specific agents if needed
./scripts/deploy-flexible.sh scale budget-agent 3
./scripts/deploy-flexible.sh scale investment-agent 2
```

### 4. Test the API

```bash
# Health check
curl http://localhost:8083/health

# AI system status
curl http://localhost:8083/ai/status

# GraphQL playground (development mode)
open http://localhost:8083/ai/dev/graphql-playground
```

## API Usage

### GraphQL Endpoint

The AI Engine exposes a unified GraphQL API at `/ai/graphql` regardless of the underlying backend.

#### Budget Optimization

```graphql
mutation OptimizeBudget($userId: String!, $preferences: BudgetPreferences) {
  optimizeBudget(userId: $userId, preferences: $preferences) {
    totalSavingsPotential
    categoryAdjustments {
      category
      currentAllocation
      recommendedAllocation
      potentialSavings
    }
    recommendations {
      title
      description
      impactScore
      confidence
    }
    confidence
    processingTimeMs
  }
}
```

#### Portfolio Analysis

```graphql
mutation AnalyzePortfolio($userId: String!, $preferences: PortfolioPreferences) {
  analyzePortfolio(userId: $userId, preferences: $preferences) {
    currentAllocation
    recommendedAllocation
    riskScore
    rebalanceActions {
      action
      asset
      amount
      reasoning
    }
    recommendations {
      title
      description
      impactScore
    }
    confidence
    processingTimeMs
  }
}
```

#### Debt Strategy

```graphql
mutation GenerateDebtStrategy($userId: String!, $preferences: DebtPreferences) {
  generateDebtStrategy(userId: $userId, preferences: $preferences) {
    strategyType
    totalInterestSavings
    payoffTimelineMonths
    monthlyPaymentPlan {
      month
      payment
      allocation {
        debtId
        amount
      }
    }
    recommendations {
      title
      description
      estimatedBenefit
    }
    confidence
    processingTimeMs
  }
}
```

### REST Endpoints

#### System Status
```bash
GET /ai/status
```

#### Health Check
```bash
GET /health
GET /health/detailed
```

#### Metrics (Prometheus)
```bash
GET /metrics
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_DEPLOYMENT_MODE` | Deployment mode (monolithic/multi_agent/hybrid) | `monolithic` |
| `ENVIRONMENT` | Environment (development/production) | `development` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `SUPERTOKENS_CONNECTION_URI` | SuperTokens connection URI | `http://localhost:3567` |
| `MAX_CONCURRENT_REQUESTS` | Maximum concurrent requests | `100` |
| `REQUEST_TIMEOUT_MS` | Request timeout in milliseconds | `10000` |
| `ENABLE_MONITORING` | Enable Prometheus monitoring | `true` |
| `AB_TESTING_ENABLED` | Enable A/B testing | `false` |

### Configuration File

Create `config/ai_engine.yml` for detailed configuration:

```yaml
backend:
  deployment_mode: multi_agent
  
  supervisor:
    name: atlas-supervisor-7b
    endpoint: http://supervisor-agent:8080
    specialization_params:
      coordination_strategy: parallel_execution
      quality_threshold: 0.85
  
  workers:
    budget_optimizer:
      enabled: true
      endpoint: http://budget-agent:8080
    investment_analyzer:
      enabled: true
      endpoint: http://investment-agent:8080

performance:
  max_concurrent_requests: 200
  request_timeout_ms: 8000
  enable_request_batching: true

security:
  enable_rate_limiting: true
  rate_limit_requests_per_minute: 150
  encrypt_context_data: true
```

## Monitoring and Observability

### Metrics

The AI Engine exposes Prometheus metrics at `/metrics`:

- `ai_engine_requests_total` - Total requests by backend and operation
- `ai_engine_request_duration_seconds` - Request duration histogram
- `ai_engine_active_agents` - Number of active agents by type

### Health Checks

- **Basic Health**: `GET /health` - Simple liveness check
- **Detailed Health**: `GET /health/detailed` - Full system status including backends
- **AI Status**: `GET /ai/status` - AI-specific system information

### Logging

Structured logging with configurable levels:

```json
{
  "timestamp": "2025-01-29T10:30:00Z",
  "level": "INFO",
  "message": "Processed request using multi_agent backend",
  "request_id": "req_123456",
  "user_id": "user_789",
  "operation": "budget_optimization",
  "backend_used": "multi_agent",
  "processing_time_ms": 245,
  "confidence": 0.92
}
```

### Distributed Tracing

OpenTelemetry integration for request tracing across agents:

```
Request → AI Engine → Supervisor → [Budget Agent, Investment Agent] → Response
  |         |           |              |                |
  +-- 15ms  +-- 25ms    +-- 180ms     +-- 120ms       +-- 85ms
```

## Performance Tuning

### Scaling Guidelines

| Load Level | Concurrent Users | Recommended Setup |
|------------|------------------|-------------------|
| Development | 1-10 | Monolithic mode, 1 instance |
| Small Production | 10-100 | Monolithic mode, 2-3 instances |
| Medium Production | 100-1000 | Multi-agent mode, scaled workers |
| Large Production | 1000+ | Multi-agent mode, auto-scaling |

### Resource Requirements

| Deployment Mode | CPU | Memory | GPU Memory | Storage |
|-----------------|-----|--------|------------|---------|
| Monolithic | 4 cores | 8GB | 4GB | 10GB |
| Multi-Agent | 8 cores | 16GB | 12GB | 20GB |
| Hybrid | 12 cores | 24GB | 16GB | 30GB |

### Optimization Tips

1. **Enable request batching** for high-throughput scenarios
2. **Use connection pooling** for database connections
3. **Configure caching** for frequently accessed data
4. **Scale workers** based on demand patterns
5. **Monitor GPU utilization** and adjust batch sizes

## A/B Testing

### Setup

```bash
# Enable A/B testing
export AB_TESTING_ENABLED=true
export AB_MONOLITHIC_TRAFFIC=0.4
export AB_MULTI_AGENT_TRAFFIC=0.6

# Deploy with A/B testing
./scripts/deploy-flexible.sh deploy
```

### Monitoring Results

```graphql
query ABTestResults {
  aiSystemStatus {
    backendStatus
    performanceMetrics
  }
}
```

### Configuration

```yaml
ab_testing:
  enabled: true
  test_configs:
    - name: "backend_comparison"
      variants:
        - backend: "monolithic"
          traffic: 0.5
        - backend: "multi_agent" 
          traffic: 0.5
      success_metrics:
        - "response_time"
        - "accuracy_score"
        - "user_satisfaction"
      duration_days: 14
```

## Migration Guide

### From Monolithic to Multi-Agent

1. **Prepare Models**: Deploy specialized agent models
2. **Enable Hybrid Mode**: Run both backends simultaneously
3. **Test Performance**: Compare accuracy and response times
4. **Gradual Rollout**: Increase multi-agent traffic progressively
5. **Full Migration**: Switch to multi-agent mode completely

```bash
# Step 1: Deploy in hybrid mode
AI_DEPLOYMENT_MODE=hybrid ./scripts/deploy-flexible.sh deploy

# Step 2: Monitor both backends
./scripts/deploy-flexible.sh logs ai-engine

# Step 3: Gradually shift traffic
export AB_TESTING_ENABLED=true
export AB_MULTI_AGENT_TRAFFIC=0.8

# Step 4: Full migration
AI_DEPLOYMENT_MODE=multi_agent ./scripts/deploy-flexible.sh deploy
```

## Development

### Local Development Setup

```bash
# Install dependencies
poetry install --extras dev

# Start development server
poetry run python main_flexible.py

# Run tests
poetry run pytest

# Code formatting
poetry run black src tests
poetry run isort src tests

# Type checking
poetry run mypy src
```

### Adding New Agents

1. **Create Agent Interface**:
```python
# src/agents/new_agent.py
class NewAgent:
    async def execute_task(self, task: AgentTask) -> AgentResult:
        # Implementation
        pass
```

2. **Register Agent**:
```python
# src/core/engine.py
def _determine_required_agents(self, request: AIRequest) -> List[str]:
    agent_mapping = {
        # ... existing mappings
        OperationType.NEW_OPERATION: ["new_agent"],
    }
```

3. **Add Configuration**:
```yaml
# config/ai_engine.yml
workers:
  new_agent:
    enabled: true
    endpoint: http://new-agent:8080
```

### Testing

```bash
# Unit tests
poetry run pytest tests/unit

# Integration tests
poetry run pytest tests/integration

# End-to-end tests
poetry run pytest tests/e2e

# Load testing
poetry run pytest tests/load -m slow
```

## Troubleshooting

### Common Issues

#### 1. Models Not Loading

```bash
# Check model paths
ls -la /path/to/models/

# Check GPU availability
nvidia-smi

# Check container logs
docker logs atlas-budget-agent
```

#### 2. High Response Times

```bash
# Check resource usage
docker stats

# Scale agents
./scripts/deploy-flexible.sh scale budget-agent 3

# Monitor metrics
curl http://localhost:8083/metrics | grep ai_engine_request_duration
```

#### 3. Agent Communication Failures

```bash
# Check network connectivity
docker exec atlas-ai-engine curl http://budget-agent:8080/health

# Check service discovery
docker-compose -f docker-compose.flexible.yml ps

# Restart services
./scripts/deploy-flexible.sh restart
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Deploy with debug enabled
ENVIRONMENT=development ./scripts/deploy-flexible.sh deploy

# View detailed logs
./scripts/deploy-flexible.sh logs ai-engine
```

## Security

### Authentication

- **JWT-based authentication** with SuperTokens integration
- **Role-based access control** for admin endpoints
- **API rate limiting** with Redis backing

### Data Protection

- **End-to-end encryption** for sensitive financial data
- **Context data encryption** in Redis cache
- **Audit logging** for all AI decisions
- **GDPR compliance** with data anonymization

### Network Security

- **TLS encryption** for all external communications
- **Internal service mesh** for agent-to-agent communication
- **Network policies** for container isolation

## Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/new-agent`
3. **Write tests** for new functionality
4. **Ensure code quality**: `poetry run black src && poetry run mypy src`
5. **Submit pull request** with detailed description

### Code Standards

- **Python 3.11+** with type hints
- **Black formatting** with 100 character line length
- **Comprehensive tests** with >90% coverage
- **Documentation** for all public APIs

## License

Copyright (c) 2025 Atlas Financial. All rights reserved.

## Support

- **Documentation**: [https://docs.atlas-financial.com/ai-engine](https://docs.atlas-financial.com/ai-engine)
- **Issues**: [https://github.com/atlas-financial/ai-engine/issues](https://github.com/atlas-financial/ai-engine/issues)
- **Discussions**: [https://github.com/atlas-financial/ai-engine/discussions](https://github.com/atlas-financial/ai-engine/discussions)
- **Email**: [ai-support@atlas-financial.com](mailto:ai-support@atlas-financial.com)