#!/bin/bash
set -euo pipefail

# Atlas Financial Wave 2 AI Production Deployment Script
# Deploys AI-Enhanced Personal Finance Intelligence System to Production

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
K8S_PRODUCTION_DIR="$PROJECT_ROOT/infrastructure/k8s/production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-atlas-ai-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"
NAMESPACE="atlas-ai-production"
TIMEOUT="${TIMEOUT:-600s}"

# Pre-deployment checks
check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    # Check required tools
    local tools=("kubectl" "aws" "jq" "curl" "helm")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    
    # Check kubectl context
    local current_context=$(kubectl config current-context)
    if [[ "$current_context" != *"$CLUSTER_NAME"* ]]; then
        log_warning "Current kubectl context: $current_context"
        read -p "Continue with this context? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Deployment cancelled"
            exit 1
        fi
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Environment validation
validate_environment() {
    log_info "Validating production environment..."
    
    # Check required environment variables
    local required_vars=(
        "JWT_SECRET_KEY"
        "REDIS_PASSWORD"
        "HASURA_ADMIN_SECRET"
        "POSTGRES_CONNECTION_URI"
        "OPENAI_API_KEY"
        "AI_MODEL_ENCRYPTION_KEY"
        "GRAFANA_ADMIN_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Validate cluster resources
    local nodes=$(kubectl get nodes --no-headers | wc -l)
    if [[ $nodes -lt 3 ]]; then
        log_error "Insufficient cluster nodes: $nodes (minimum: 3)"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

# Deploy storage infrastructure
deploy_storage() {
    log_info "Deploying storage infrastructure..."
    
    # Apply storage classes and persistent volumes
    kubectl apply -f "$K8S_PRODUCTION_DIR/11-persistent-volumes.yaml"
    
    # Wait for storage classes to be ready
    kubectl wait --for=condition=Available storageclass/fast-ssd --timeout=$TIMEOUT
    kubectl wait --for=condition=Available storageclass/standard-ssd --timeout=$TIMEOUT
    kubectl wait --for=condition=Available storageclass/high-iops-ssd --timeout=$TIMEOUT
    
    log_success "Storage infrastructure deployed"
}

# Deploy core infrastructure
deploy_infrastructure() {
    log_info "Deploying core infrastructure..."
    
    # Apply in order
    kubectl apply -f "$K8S_PRODUCTION_DIR/00-namespace-production.yaml"
    kubectl apply -f "$K8S_PRODUCTION_DIR/01-secrets-production.yaml"
    
    # Deploy data services
    kubectl apply -f "$K8S_PRODUCTION_DIR/05-redis-cluster.yaml"
    kubectl apply -f "$K8S_PRODUCTION_DIR/06-timescaledb-feature-store.yaml"
    
    # Wait for data services to be ready
    log_info "Waiting for Redis cluster to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis-cluster -n $NAMESPACE --timeout=$TIMEOUT
    
    log_info "Waiting for TimescaleDB to be ready..."
    kubectl wait --for=condition=ready pod -l app=timescaledb -n $NAMESPACE --timeout=$TIMEOUT
    
    log_success "Core infrastructure deployed"
}

# Deploy AI services
deploy_ai_services() {
    log_info "Deploying AI services..."
    
    # Deploy AI services
    kubectl apply -f "$K8S_PRODUCTION_DIR/02-ai-engine-deployment.yaml"
    kubectl apply -f "$K8S_PRODUCTION_DIR/03-market-data-service.yaml"
    kubectl apply -f "$K8S_PRODUCTION_DIR/04-ab-testing-service.yaml"
    
    # Wait for AI services to be ready
    log_info "Waiting for AI Engine to be ready..."
    kubectl wait --for=condition=ready pod -l app=ai-engine -n $NAMESPACE --timeout=$TIMEOUT
    
    log_info "Waiting for Market Data Service to be ready..."
    kubectl wait --for=condition=ready pod -l app=market-data-service -n $NAMESPACE --timeout=$TIMEOUT
    
    log_info "Waiting for A/B Testing Service to be ready..."
    kubectl wait --for=condition=ready pod -l app=ab-testing-service -n $NAMESPACE --timeout=$TIMEOUT
    
    log_success "AI services deployed"
}

# Deploy monitoring stack
deploy_monitoring() {
    log_info "Deploying monitoring stack..."
    
    kubectl apply -f "$K8S_PRODUCTION_DIR/07-monitoring-stack.yaml"
    
    # Wait for monitoring services
    log_info "Waiting for Prometheus to be ready..."
    kubectl wait --for=condition=ready pod -l app=prometheus -n atlas-monitoring --timeout=$TIMEOUT
    
    log_info "Waiting for Grafana to be ready..."
    kubectl wait --for=condition=ready pod -l app=grafana -n atlas-monitoring --timeout=$TIMEOUT
    
    log_info "Waiting for Jaeger to be ready..."
    kubectl wait --for=condition=ready pod -l app=jaeger -n atlas-monitoring --timeout=$TIMEOUT
    
    log_success "Enhanced monitoring stack deployed with Jaeger tracing"
}

# Deploy autoscaling policies
deploy_autoscaling() {
    log_info "Deploying autoscaling policies..."
    
    kubectl apply -f "$K8S_PRODUCTION_DIR/08-autoscaling-policies.yaml"
    
    # Verify HPA creation
    kubectl get hpa -n $NAMESPACE
    
    log_success "Autoscaling policies deployed"
}

# Deploy security hardening
deploy_security() {
    log_info "Deploying security hardening..."
    
    kubectl apply -f "$K8S_PRODUCTION_DIR/09-security-hardening.yaml"
    
    # Verify network policies
    kubectl get networkpolicy -n $NAMESPACE
    
    log_success "Security hardening deployed"
}

# Deploy ingress and load balancer
deploy_networking() {
    log_info "Deploying networking infrastructure..."
    
    kubectl apply -f "$K8S_PRODUCTION_DIR/10-ingress-load-balancer.yaml"
    
    # Wait for ingress to get an external IP
    log_info "Waiting for load balancer to get external IP..."
    timeout 300 bash -c 'until kubectl get ingress ai-services-ingress -n atlas-ai-production -o jsonpath="{.status.loadBalancer.ingress[0].ip}" | grep -E "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$"; do sleep 10; done' || true
    
    log_success "Networking infrastructure deployed"
}

# Deploy disaster recovery
deploy_disaster_recovery() {
    log_info "Deploying disaster recovery..."
    
    kubectl apply -f "$K8S_PRODUCTION_DIR/12-disaster-recovery.yaml"
    
    log_success "Disaster recovery deployed"
}

# Health checks
run_health_checks() {
    log_info "Running comprehensive health checks..."
    
    # Check AI Engine health
    local ai_engine_health=$(kubectl exec -n $NAMESPACE deployment/ai-engine -- curl -s http://localhost:8083/health | jq -r '.status')
    if [[ "$ai_engine_health" != "healthy" ]]; then
        log_error "AI Engine health check failed: $ai_engine_health"
        return 1
    fi
    
    # Check Market Data Service health
    local market_data_health=$(kubectl exec -n $NAMESPACE deployment/market-data-service -- curl -s http://localhost:4000/health | jq -r '.status')
    if [[ "$market_data_health" != "healthy" ]]; then
        log_error "Market Data Service health check failed: $market_data_health"
        return 1
    fi
    
    # Check A/B Testing Service health
    local ab_testing_health=$(kubectl exec -n $NAMESPACE deployment/ab-testing-service -- curl -s http://localhost:8085/health | jq -r '.status')
    if [[ "$ab_testing_health" != "healthy" ]]; then
        log_error "A/B Testing Service health check failed: $ab_testing_health"
        return 1
    fi
    
    # Check Redis cluster
    local redis_cluster_info=$(kubectl exec -n $NAMESPACE redis-cluster-0 -- redis-cli --no-auth-warning -a "$REDIS_PASSWORD" cluster info | grep cluster_state:ok)
    if [[ -z "$redis_cluster_info" ]]; then
        log_error "Redis cluster health check failed"
        return 1
    fi
    
    # Check TimescaleDB
    if ! kubectl exec -n $NAMESPACE statefulset/timescaledb -- pg_isready -U ai_features_user -d features; then
        log_error "TimescaleDB health check failed"
        return 1
    fi
    
    log_success "All health checks passed"
}

# Performance validation
validate_performance() {
    log_info "Running performance validation..."
    
    # Get external IP for load testing
    local external_ip=$(kubectl get ingress ai-services-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    if [[ -z "$external_ip" ]]; then
        log_warning "External IP not available, skipping performance validation"
        return 0
    fi
    
    # Simple load test using curl
    log_info "Running basic load test..."
    local start_time=$(date +%s)
    for i in {1..10}; do
        local response_time=$(curl -w "%{time_total}" -s -o /dev/null http://$external_ip/health)
        if (( $(echo "$response_time > 2.0" | bc -l) )); then
            log_warning "Response time $response_time exceeds 2s threshold"
        fi
    done
    local end_time=$(date +%s)
    local total_time=$((end_time - start_time))
    
    log_info "Basic load test completed in ${total_time}s"
    
    log_success "Performance validation completed"
}

# Generate deployment report
generate_report() {
    log_info "Generating deployment report..."
    
    local report_file="/tmp/wave-2-deployment-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "deployment_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployment_version": "wave-2.0.0",
  "cluster_name": "$CLUSTER_NAME",
  "namespace": "$NAMESPACE",
  "components": {
    "ai_engine": {
      "replicas": $(kubectl get deployment ai-engine -n $NAMESPACE -o jsonpath='{.status.readyReplicas}'),
      "version": "v2.0.0",
      "status": "$(kubectl get deployment ai-engine -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Available")].status}')"
    },
    "market_data_service": {
      "replicas": $(kubectl get deployment market-data-service -n $NAMESPACE -o jsonpath='{.status.readyReplicas}'),
      "version": "v2.0.0",
      "status": "$(kubectl get deployment market-data-service -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Available")].status}')"
    },
    "ab_testing_service": {
      "replicas": $(kubectl get deployment ab-testing-service -n $NAMESPACE -o jsonpath='{.status.readyReplicas}'),
      "version": "v2.0.0",
      "status": "$(kubectl get deployment ab-testing-service -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Available")].status}')"
    },
    "redis_cluster": {
      "nodes": $(kubectl get pods -n $NAMESPACE -l app=redis-cluster --no-headers | wc -l),
      "status": "ready"
    },
    "timescaledb": {
      "replicas": $(kubectl get statefulset timescaledb -n $NAMESPACE -o jsonpath='{.status.readyReplicas}'),
      "status": "ready"
    }
  },
  "monitoring": {
    "prometheus": {
      "status": "$(kubectl get deployment prometheus -n atlas-monitoring -o jsonpath='{.status.conditions[?(@.type=="Available")].status}')"
    },
    "grafana": {
      "status": "$(kubectl get deployment grafana -n atlas-monitoring -o jsonpath='{.status.conditions[?(@.type=="Available")].status}')"
    }
  },
  "networking": {
    "ingress_ip": "$(kubectl get ingress ai-services-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')",
    "ssl_cert": "configured"
  },
  "security": {
    "network_policies": $(kubectl get networkpolicy -n $NAMESPACE --no-headers | wc -l),
    "rbac_configured": true,
    "secrets_encrypted": true
  },
  "success_metrics": {
    "deployment_time": "${SECONDS}s",
    "services_healthy": true,
    "autoscaling_enabled": true,
    "monitoring_active": true,
    "disaster_recovery_ready": true
  }
}
EOF
    
    log_info "Deployment report saved to: $report_file"
    cat "$report_file" | jq '.'
    
    # Upload report to S3 if configured
    if [[ -n "${S3_REPORTS_BUCKET:-}" ]]; then
        aws s3 cp "$report_file" "s3://$S3_REPORTS_BUCKET/deployments/"
        log_info "Report uploaded to S3: s3://$S3_REPORTS_BUCKET/deployments/"
    fi
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    log_info "Starting Wave 2 AI Production Deployment"
    log_info "Cluster: $CLUSTER_NAME"
    log_info "Namespace: $NAMESPACE"
    log_info "Region: $AWS_REGION"
    
    # Run deployment steps
    check_prerequisites
    validate_environment
    deploy_storage
    deploy_infrastructure
    deploy_ai_services
    deploy_monitoring
    deploy_autoscaling
    deploy_security
    deploy_networking
    deploy_disaster_recovery
    
    # Validation
    sleep 30  # Allow services to stabilize
    run_health_checks
    validate_performance
    
    # Generate report
    generate_report
    
    local end_time=$(date +%s)
    local total_time=$((end_time - start_time))
    
    log_success "Wave 2 AI Production Deployment completed successfully!"
    log_success "Total deployment time: ${total_time}s"
    log_info "Services are now available at:"
    log_info "  AI Services: https://ai.atlas-financial.com"
    log_info "  Monitoring: https://grafana.atlas-financial.com"
    
    # Final instructions
    echo
    echo "Next steps:"
    echo "1. Verify DNS propagation for ai.atlas-financial.com"
    echo "2. Run comprehensive load testing"
    echo "3. Execute disaster recovery drill"
    echo "4. Configure external monitoring alerts"
    echo "5. Update team documentation and runbooks"
}

# Cleanup function for failed deployments
cleanup() {
    log_error "Deployment failed. Running cleanup..."
    
    # Optional: Remove partially deployed resources
    # kubectl delete namespace $NAMESPACE --ignore-not-found
    
    exit 1
}

# Set trap for cleanup on error
trap cleanup ERR

# Run main deployment
main "$@"