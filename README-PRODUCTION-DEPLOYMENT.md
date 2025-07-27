# Atlas Financial - Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying Atlas Financial to production. The deployment includes all operational services with production-ready configurations, security hardening, and comprehensive monitoring.

## Production Architecture

### Operational Services (Production Ready)
✅ **PostgreSQL Database** - Multi-database setup with persistent storage
✅ **Redis Cache** - Persistent caching with security configurations
✅ **SuperTokens Authentication** - Production authentication service
✅ **Hasura GraphQL Engine** - API gateway with JWT integration
✅ **Firefly III** - Financial management platform
✅ **Grafana** - Observability and monitoring dashboards
✅ **Prometheus** - Metrics collection and alerting

### Development Placeholders
🔄 **Rust Financial Engine** - Development placeholder (API completion pending)
🔄 **AI Engine** - Development placeholder (structure completion pending)

## Prerequisites

### Infrastructure Requirements
- Kubernetes cluster (v1.25+)
- NGINX Ingress Controller
- cert-manager for SSL/TLS certificates
- Storage class for persistent volumes (recommended: gp2/gp3 for AWS EKS)
- LoadBalancer service support

### Required Tools
- `kubectl` configured for your cluster
- `docker` (for building custom images)
- `helm` (optional, for easier management)
- `jq` (for JSON processing in scripts)
- `bc` (for calculations in health checks)

### Required Secrets
The following secrets must be configured before deployment:

```bash
# Database credentials
export POSTGRES_PASSWORD="your-secure-postgres-password"

# Redis credentials
export REDIS_PASSWORD="your-secure-redis-password"

# Application secrets
export HASURA_ADMIN_SECRET="your-secure-hasura-admin-secret"
export SUPERTOKENS_API_KEY="your-secure-supertokens-api-key"
export FIREFLY_APP_KEY="base64:your-32-character-firefly-app-key"

# Monitoring credentials
export GRAFANA_ADMIN_PASSWORD="your-secure-grafana-password"

# Frontend secrets
export NEXTAUTH_SECRET="your-secure-nextauth-secret"
```

## Deployment Methods

### Method 1: Automated Deployment Script (Recommended)

The automated deployment script provides a comprehensive deployment workflow with validation, health checks, and rollback capabilities.

```bash
# Set required environment variables
export POSTGRES_PASSWORD="your-secure-password"
export REDIS_PASSWORD="your-secure-password"
export HASURA_ADMIN_SECRET="your-secure-secret"
export SUPERTOKENS_API_KEY="your-secure-key"
export FIREFLY_APP_KEY="base64:your-secure-key"
export GRAFANA_ADMIN_PASSWORD="your-secure-password"

# Run the deployment script
./scripts/deploy-production.sh deploy
```

#### Script Features
- ✅ Prerequisites validation
- ✅ Configuration validation
- ✅ Secrets management
- ✅ Ordered service deployment
- ✅ Health checks and monitoring
- ✅ Automatic rollback on failure
- ✅ Deployment reporting

#### Script Usage Options
```bash
./scripts/deploy-production.sh deploy      # Full deployment
./scripts/deploy-production.sh rollback    # Rollback deployment
./scripts/deploy-production.sh health-check # Run health checks
./scripts/deploy-production.sh report      # Generate status report
```

### Method 2: Manual Kubernetes Deployment

For more control over the deployment process:

```bash
# 1. Create namespace and RBAC
kubectl apply -f infrastructure/k8s/00-namespace.yaml

# 2. Create secrets and configuration
kubectl apply -f infrastructure/k8s/01-secrets.yaml

# 3. Deploy infrastructure (PostgreSQL, Redis)
kubectl apply -f infrastructure/k8s/02-postgresql.yaml
kubectl apply -f infrastructure/k8s/03-redis.yaml

# Wait for infrastructure to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=database -n atlas-financial --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=cache -n atlas-financial --timeout=300s

# 4. Deploy application services
kubectl apply -f infrastructure/k8s/04-supertokens.yaml
kubectl apply -f infrastructure/k8s/05-hasura.yaml
kubectl apply -f infrastructure/k8s/06-firefly.yaml
kubectl apply -f infrastructure/k8s/07-grafana.yaml
kubectl apply -f infrastructure/k8s/08-prometheus.yaml

# 5. Deploy development placeholders
kubectl apply -f infrastructure/k8s/11-development-placeholders.yaml

# 6. Deploy networking and monitoring
kubectl apply -f infrastructure/k8s/09-ingress.yaml
kubectl apply -f infrastructure/k8s/10-network-policies.yaml
kubectl apply -f infrastructure/k8s/12-monitoring-dashboards.yaml

# 7. Verify deployment
kubectl get pods -n atlas-financial
kubectl get services -n atlas-financial
kubectl get ingress -n atlas-financial
```

### Method 3: CI/CD Pipeline Deployment

Atlas Financial includes a comprehensive GitHub Actions CI/CD pipeline:

```yaml
# .github/workflows/production-deploy.yml
# Triggered on:
# - Push to main branch (staging deployment)
# - Tags matching v* (production deployment)
```

#### Pipeline Features
- 🔒 Security scanning with Trivy and Semgrep
- 🏗️ Multi-architecture Docker builds
- 🧪 Integration testing
- 🚀 Automated deployment to staging/production
- 📊 Compliance checking
- 🔄 Automatic rollback on failure
- 📱 Slack notifications

## Security Configuration

### Network Security
- **Network Policies**: Strict ingress/egress rules between services
- **TLS Termination**: SSL/TLS certificates managed by cert-manager
- **Security Headers**: Comprehensive security headers via Ingress
- **Rate Limiting**: Request rate limiting on public endpoints

### Application Security
- **Non-root Containers**: All containers run as non-root users
- **Read-only Filesystems**: Containers use read-only root filesystems where possible
- **Resource Limits**: CPU and memory limits on all containers
- **Security Contexts**: Proper security contexts with privilege dropping

### Secrets Management
- **Kubernetes Secrets**: Sensitive data stored in Kubernetes secrets
- **Environment Variable Injection**: Secrets injected as environment variables
- **Secret Rotation**: Support for secret rotation without downtime

## Monitoring and Observability

### Metrics Collection
- **Prometheus**: Centralized metrics collection
- **Custom Metrics**: Application-specific metrics
- **Infrastructure Metrics**: Kubernetes and system metrics
- **Business Metrics**: User activity and transaction metrics

### Dashboards
- **System Overview**: High-level system health and performance
- **Infrastructure**: Detailed infrastructure metrics
- **Business Metrics**: User activity and financial data insights

### Alerting
- **Service Health**: Alerts for service availability issues
- **Performance**: Alerts for high response times and error rates
- **Resource Usage**: Alerts for high CPU, memory, and disk usage
- **Business Logic**: Alerts for authentication failures and low activity

### Health Checks
Comprehensive health checking with the included script:

```bash
# Run health checks
./scripts/health-check.sh

# Verbose output
./scripts/health-check.sh --verbose

# JSON output for automation
./scripts/health-check.sh --format json

# Prometheus metrics output
./scripts/health-check.sh --format prometheus
```

## Domain Configuration

### Production Domains
The Ingress configuration expects the following domains:
- `atlas-financial.com` - Main application
- `api.atlas-financial.com` - GraphQL API (Hasura)
- `auth.atlas-financial.com` - Authentication service (SuperTokens)
- `firefly.atlas-financial.com` - Financial management (Firefly III)
- `grafana.atlas-financial.com` - Monitoring dashboard
- `prometheus.atlas-financial.com` - Metrics (restricted access)

### Development/Staging Domains
- `rust-api.atlas-financial.com` - Rust Financial Engine (development)
- `ai-engine.atlas-financial.com` - AI Engine (development)

### SSL/TLS Certificates
Certificates are automatically managed by cert-manager using Let's Encrypt:

```yaml
cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

## Scaling Configuration

### Horizontal Pod Autoscaling (HPA)
Services are configured with HPA based on CPU and memory usage:

- **SuperTokens**: 2-10 replicas
- **Hasura**: 2-10 replicas
- **Firefly III**: 2-8 replicas

### Vertical Scaling
Resource requests and limits are configured for optimal performance:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "300m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

## Storage Configuration

### Persistent Volumes
- **PostgreSQL**: 50Gi persistent storage
- **Redis**: 10Gi persistent storage
- **Grafana**: 10Gi persistent storage
- **Prometheus**: 100Gi persistent storage
- **Firefly III**: 10Gi for file uploads

### Storage Classes
Configure appropriate storage classes for your cloud provider:
- **AWS EKS**: `gp2` or `gp3`
- **Google GKE**: `standard` or `ssd`
- **Azure AKS**: `default` or `managed-premium`

## Backup and Recovery

### Database Backups
PostgreSQL backups should be configured using your cloud provider's backup solutions:

```bash
# Example for AWS RDS
# Automated backups are enabled with point-in-time recovery
```

### Persistent Volume Snapshots
Configure volume snapshots for persistent data:

```bash
# Create volume snapshot class
kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: atlas-financial-snapshots
driver: ebs.csi.aws.com
deletionPolicy: Retain
EOF
```

## Troubleshooting

### Common Issues

#### 1. Pod Startup Issues
```bash
# Check pod status
kubectl get pods -n atlas-financial

# Check pod logs
kubectl logs <pod-name> -n atlas-financial

# Describe pod for events
kubectl describe pod <pod-name> -n atlas-financial
```

#### 2. Service Connectivity Issues
```bash
# Check service endpoints
kubectl get endpoints -n atlas-financial

# Test service connectivity
kubectl exec -n atlas-financial <pod-name> -- nc -zv <service-name> <port>
```

#### 3. Ingress Issues
```bash
# Check ingress status
kubectl get ingress -n atlas-financial

# Check ingress controller logs
kubectl logs -n ingress-nginx <ingress-controller-pod>
```

#### 4. Certificate Issues
```bash
# Check certificate status
kubectl get certificates -n atlas-financial

# Check cert-manager logs
kubectl logs -n cert-manager <cert-manager-pod>
```

### Health Check Diagnostics
The health check script provides comprehensive diagnostics:

```bash
# Full health check with details
./scripts/health-check.sh --verbose

# Check specific components
kubectl exec -n atlas-financial <prometheus-pod> -- wget -qO- http://atlas-postgres:5432
```

### Log Aggregation
All containers are configured with structured logging:

```bash
# View aggregated logs
kubectl logs -l app.kubernetes.io/name=atlas-financial -n atlas-financial --tail=100
```

## Performance Optimization

### Database Optimization
- Connection pooling configured
- Query optimization monitoring via pg_stat_statements
- Index optimization based on query patterns

### Cache Optimization
- Redis configured with appropriate eviction policies
- Connection pooling for Redis connections
- Cache hit ratio monitoring

### Application Optimization
- Resource limits tuned based on load testing
- JVM tuning for Java-based services
- Connection pooling for database connections

## Security Compliance

### Compliance Scanning
The CI/CD pipeline includes compliance scanning:
- **Checkov**: Infrastructure as Code security scanning
- **Trivy**: Container vulnerability scanning
- **Semgrep**: Static code analysis

### Security Best Practices
- Regular security updates via automated CI/CD
- Principle of least privilege for all services
- Network segmentation via NetworkPolicies
- Secrets rotation procedures
- Security monitoring and alerting

## Maintenance Procedures

### Regular Maintenance
1. **Weekly**: Review monitoring dashboards and alerts
2. **Monthly**: Update container images for security patches
3. **Quarterly**: Review and test backup/recovery procedures
4. **Annually**: Security audit and penetration testing

### Update Procedures
```bash
# Update specific service
kubectl set image deployment/atlas-hasura atlas-hasura=hasura/graphql-engine:v2.42.1 -n atlas-financial

# Monitor rollout
kubectl rollout status deployment/atlas-hasura -n atlas-financial

# Rollback if needed
kubectl rollout undo deployment/atlas-hasura -n atlas-financial
```

### Disaster Recovery
1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Backup Frequency**: Daily automated backups
4. **Geo-replication**: Configured for critical data

## Support and Contacts

### Emergency Contacts
- **Production Issues**: [Your on-call system]
- **Security Issues**: [Your security team]
- **Infrastructure Issues**: [Your DevOps team]

### Documentation
- **Runbooks**: [Link to operational runbooks]
- **Architecture**: [Link to system architecture docs]
- **API Documentation**: [Link to API documentation]

### Monitoring URLs
- **Grafana**: https://grafana.atlas-financial.com
- **Prometheus**: https://prometheus.atlas-financial.com
- **Application**: https://atlas-financial.com

---

**Atlas Financial Production Deployment Guide v1.0**
*Generated for Phase 1.6 Production Readiness*
*Last Updated: July 27, 2025*
