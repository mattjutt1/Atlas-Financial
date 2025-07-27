# Atlas Financial - Observability Stack

This document describes the comprehensive observability stack implemented for Atlas Financial, providing production-ready monitoring, metrics collection, and alerting.

## Overview

The observability stack consists of:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Redis Exporter**: Redis cache metrics
- **PostgreSQL Exporter**: Database metrics
- **Custom Metrics**: Business logic and financial calculation metrics

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Atlas Apps    │───▶│   Prometheus    │───▶│    Grafana      │
│                 │    │                 │    │                 │
│ • Rust Engine   │    │ • Metrics Store │    │ • Dashboards    │
│ • AI Engine     │    │ • Alerting      │    │ • Visualization │
│ • Hasura        │    │ • Rules         │    │ • Analysis      │
│ • Other Services│    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │              ┌─────────────────┐
         └──────────────▶│   Exporters     │
                        │                 │
                        │ • Redis         │
                        │ • PostgreSQL    │
                        │ • Node (future) │
                        └─────────────────┘
```

## Services and Ports

| Service | Port | Purpose |
|---------|------|---------|
| Prometheus | 9090 | Metrics collection and storage |
| Grafana | 3001 | Dashboards and visualization |
| Redis Exporter | 9121 | Redis metrics |
| PostgreSQL Exporter | 9187 | Database metrics |

## Access URLs

- **Grafana**: http://localhost:3001 (admin/admin_dev_password)
- **Prometheus**: http://localhost:9090
- **Redis Metrics**: http://localhost:9121/metrics
- **PostgreSQL Metrics**: http://localhost:9187/metrics

## Metrics Collected

### Business Metrics

#### Financial Calculations
- `atlas_financial_financial_calculations_total`: Total financial calculations performed
- `atlas_financial_financial_calculations_errors_total`: Total calculation errors
- `atlas_financial_financial_calculation_duration_seconds`: Calculation latency

#### Debt Optimization
- `atlas_financial_debt_optimizations_total`: Total debt optimizations
- `atlas_financial_debt_optimization_failures_total`: Optimization failures
- `atlas_financial_debt_optimization_duration_seconds`: Optimization latency

#### Portfolio Analysis
- `atlas_financial_portfolio_analyses_total`: Total portfolio analyses
- `atlas_financial_portfolio_analysis_failures_total`: Analysis failures
- `atlas_financial_portfolio_analysis_duration_seconds`: Analysis latency

### System Metrics

#### HTTP Performance
- `atlas_financial_http_requests_total`: Total HTTP requests
- `atlas_financial_http_request_duration_seconds`: Request latency

#### Authentication
- `atlas_financial_authentication_attempts_total`: Authentication attempts
- `atlas_financial_authentication_failures_total`: Authentication failures
- `atlas_financial_authentication_duration_seconds`: Authentication latency

#### Cache Performance
- `atlas_financial_cache_hits_total`: Cache hits
- `atlas_financial_cache_misses_total`: Cache misses
- `atlas_financial_cache_operations_duration_seconds`: Cache operation latency

#### System Resources
- `atlas_financial_active_connections`: Active connections
- `atlas_financial_memory_usage_bytes`: Memory usage
- `atlas_financial_cpu_usage_percent`: CPU usage

### Infrastructure Metrics

#### Redis (via Redis Exporter)
- `redis_connected_clients`: Connected clients
- `redis_memory_used_bytes`: Memory usage
- `redis_keyspace_hits_total`: Cache hits
- `redis_keyspace_misses_total`: Cache misses

#### PostgreSQL (via PostgreSQL Exporter)
- `pg_up`: Database availability
- `pg_stat_database_numbackends`: Active connections
- `pg_stat_database_tup_fetched`: Tuples fetched
- `pg_stat_database_tup_returned`: Tuples returned

## Dashboards

### Atlas Financial - Performance Dashboard
**File**: `/grafana/provisioning/dashboards/atlas/financial-performance.json`

Key panels:
- Financial Operations Rate
- Financial Calculation Latency (95th percentile)
- Redis Cache Performance
- Atlas Services Health

### Atlas Financial - Infrastructure Overview
**File**: `/grafana/provisioning/dashboards/infrastructure/system-overview.json`

Key panels:
- CPU Usage by Service
- Memory Usage by Service
- Request Rate by Service
- Request Latency (95th percentile)
- Redis Connections
- PostgreSQL Connections

### Atlas Financial - Business Metrics
**File**: `/grafana/provisioning/dashboards/business/financial-business-metrics.json`

Key panels:
- Total Debt Optimizations
- Total Portfolio Analyses
- Total Financial Calculations
- Calculation Error Rate
- Business Operations Rate
- Business Operation Latency
- Authentication Metrics
- Cache Performance

## Alerting Rules

### Critical Alerts
- **AtlasServiceDown**: Service unavailable for 1+ minutes
- **FinancialCalculationErrors**: Financial calculation errors detected
- **RedisDown**: Redis cache unavailable
- **PostgreSQLDown**: Database unavailable

### Warning Alerts
- **AtlasHighErrorRate**: High error rate (>10%)
- **FinancialEngineHighLatency**: High calculation latency (>1s)
- **RedisHighMemoryUsage**: High Redis memory usage (>80%)
- **PostgreSQLHighConnections**: High database connection usage (>80%)

### Performance Alerts
- **HighCPUUsage**: CPU usage >80% for 5+ minutes
- **HighMemoryUsage**: Memory usage >2GB for 10+ minutes
- **HighRequestLatency**: 95th percentile latency >2s for 2+ minutes

## Configuration Files

### Prometheus Configuration
**File**: `/prometheus/config/prometheus.yml`

Key features:
- 15-second scrape interval
- Service discovery for all Atlas services
- Custom relabeling for service identification
- 30-day retention period

### Grafana Data Sources
**File**: `/grafana/provisioning/datasources/prometheus.yml`

Configured data sources:
- Prometheus (primary metrics)
- PostgreSQL (application data)
- Redis (cache data)
- TestData (for testing)

### Dashboard Provisioning
**File**: `/grafana/provisioning/dashboards/dashboards.yml`

Organized into folders:
- Atlas Financial (application-specific)
- Infrastructure (system monitoring)
- Business Metrics (business logic)

## Setup Instructions

### 1. Start the Stack

```bash
# Development environment
docker-compose -f docker-compose.dev.yml up -d prometheus grafana redis-exporter postgres-exporter

# Production environment
docker-compose -f docker-compose.fixed.yml up -d prometheus grafana redis-exporter postgres-exporter
```

### 2. Verify Services

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Grafana health
curl http://localhost:3001/api/health

# Check metrics endpoints
curl http://localhost:9121/metrics  # Redis
curl http://localhost:9187/metrics  # PostgreSQL
```

### 3. Access Dashboards

1. Open Grafana: http://localhost:3001
2. Login with admin/admin_dev_password
3. Navigate to dashboards in the respective folders

## Monitoring Best Practices

### 1. Metrics Naming
- Use `atlas_financial_` prefix for custom metrics
- Follow Prometheus naming conventions
- Include relevant labels for filtering

### 2. Alert Thresholds
- Critical: Service availability and data integrity
- Warning: Performance degradation
- Info: Unusual but non-critical conditions

### 3. Dashboard Design
- Group related metrics logically
- Use appropriate time ranges
- Include percentile latencies
- Show both rate and absolute values

### 4. Performance Considerations
- 15-second scrape interval balances accuracy and overhead
- 30-day retention provides sufficient history
- Histogram buckets are optimized for financial calculations

## Troubleshooting

### Common Issues

#### Prometheus Can't Scrape Targets
1. Check service health: `docker-compose ps`
2. Verify network connectivity: `docker network inspect atlas-network`
3. Check target URLs in Prometheus: http://localhost:9090/targets

#### Grafana Data Source Connection Issues
1. Verify Prometheus is running: `curl http://prometheus:9090/api/v1/targets`
2. Check data source configuration in Grafana
3. Test connection in Grafana data sources page

#### Missing Metrics
1. Verify services expose `/metrics` endpoints
2. Check Prometheus configuration for correct scrape paths
3. Ensure services are instrumented with Prometheus client libraries

### Health Checks

```bash
# Prometheus health
curl http://localhost:9090/-/healthy

# Grafana health
curl http://localhost:3001/api/health

# Redis exporter health
curl http://localhost:9121/metrics | head -5

# PostgreSQL exporter health
curl http://localhost:9187/metrics | head -5
```

## Future Enhancements

### Planned Additions
1. **Alertmanager**: Alert routing and notification
2. **Jaeger**: Distributed tracing
3. **Node Exporter**: Host system metrics
4. **Custom Exporters**: Business-specific metrics
5. **Log Aggregation**: ELK stack or similar

### Scaling Considerations
1. **Remote Storage**: For long-term metric retention
2. **High Availability**: Prometheus clustering
3. **Performance**: Metric cardinality optimization
4. **Security**: Authentication and authorization

## Support

For issues or questions regarding the observability stack:

1. Check service logs: `docker-compose logs [service_name]`
2. Review configuration files in `/prometheus/` and `/grafana/`
3. Consult Prometheus and Grafana documentation
4. Check Atlas Financial documentation

---

**Note**: This observability stack is designed for development and staging environments. Production deployments should include additional security hardening, backup strategies, and disaster recovery procedures.