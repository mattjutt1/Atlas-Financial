#!/bin/bash

# Atlas Financial Production Deployment Script
# This script provides a comprehensive deployment workflow for Atlas Financial

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
KUBE_NAMESPACE="atlas-financial"
DEPLOYMENT_TIMEOUT="600s"

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

# Error handling
handle_error() {
    local exit_code=$?
    log_error "Deployment failed with exit code $exit_code"
    log_error "Rolling back deployment..."
    rollback_deployment
    exit $exit_code
}

trap handle_error ERR

# Utility functions
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if kubectl is installed and configured
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi

    # Check if we can connect to the cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    # Check if namespace exists
    if ! kubectl get namespace "$KUBE_NAMESPACE" &> /dev/null; then
        log_warning "Namespace $KUBE_NAMESPACE does not exist, creating it..."
        kubectl apply -f "$PROJECT_ROOT/infrastructure/k8s/00-namespace.yaml"
    fi

    # Check if required secrets exist
    local required_secrets=("atlas-financial-secrets" "atlas-financial-tls")
    for secret in "${required_secrets[@]}"; do
        if ! kubectl get secret "$secret" -n "$KUBE_NAMESPACE" &> /dev/null; then
            log_error "Required secret '$secret' not found in namespace '$KUBE_NAMESPACE'"
            log_error "Please ensure all secrets are created before deployment"
            exit 1
        fi
    done

    log_success "Prerequisites check passed"
}

# Validate configuration
validate_configuration() {
    log_info "Validating configuration..."

    # Check if all required environment variables are set
    local required_env_vars=(
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "HASURA_ADMIN_SECRET"
        "SUPERTOKENS_API_KEY"
        "FIREFLY_APP_KEY"
        "GRAFANA_ADMIN_PASSWORD"
    )

    for var in "${required_env_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done

    # Validate Kubernetes manifests
    log_info "Validating Kubernetes manifests..."
    kubectl apply --dry-run=client -f "$PROJECT_ROOT/infrastructure/k8s/" -n "$KUBE_NAMESPACE" > /dev/null

    log_success "Configuration validation passed"
}

# Create or update secrets
update_secrets() {
    log_info "Updating secrets..."

    # Update main secrets
    kubectl create secret generic atlas-financial-secrets \
        --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
        --from-literal=POSTGRES_USER="atlas" \
        --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" \
        --from-literal=HASURA_ADMIN_SECRET="$HASURA_ADMIN_SECRET" \
        --from-literal=SUPERTOKENS_API_KEY="$SUPERTOKENS_API_KEY" \
        --from-literal=FIREFLY_APP_KEY="$FIREFLY_APP_KEY" \
        --from-literal=GRAFANA_ADMIN_PASSWORD="$GRAFANA_ADMIN_PASSWORD" \
        --from-literal=NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$(openssl rand -base64 32)}" \
        --namespace="$KUBE_NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    log_success "Secrets updated successfully"
}

# Deploy infrastructure components
deploy_infrastructure() {
    log_info "Deploying infrastructure components..."

    # Deploy in order of dependencies
    local deployment_order=(
        "00-namespace.yaml"
        "01-secrets.yaml"
        "02-postgresql.yaml"
        "03-redis.yaml"
    )

    for manifest in "${deployment_order[@]}"; do
        log_info "Applying $manifest..."
        kubectl apply -f "$PROJECT_ROOT/infrastructure/k8s/$manifest"
    done

    # Wait for infrastructure to be ready
    log_info "Waiting for infrastructure components to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=database -n "$KUBE_NAMESPACE" --timeout="$DEPLOYMENT_TIMEOUT"
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=cache -n "$KUBE_NAMESPACE" --timeout="$DEPLOYMENT_TIMEOUT"

    log_success "Infrastructure components deployed successfully"
}

# Deploy application services
deploy_applications() {
    log_info "Deploying application services..."

    local deployment_order=(
        "04-supertokens.yaml"
        "05-hasura.yaml"
        "06-firefly.yaml"
        "07-grafana.yaml"
        "08-prometheus.yaml"
        "11-development-placeholders.yaml"
    )

    for manifest in "${deployment_order[@]}"; do
        log_info "Applying $manifest..."
        kubectl apply -f "$PROJECT_ROOT/infrastructure/k8s/$manifest"
    done

    # Wait for application services to be ready
    log_info "Waiting for application services to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=authentication -n "$KUBE_NAMESPACE" --timeout="$DEPLOYMENT_TIMEOUT"
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=api-gateway -n "$KUBE_NAMESPACE" --timeout="$DEPLOYMENT_TIMEOUT"
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=finance-manager -n "$KUBE_NAMESPACE" --timeout="$DEPLOYMENT_TIMEOUT"
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=observability -n "$KUBE_NAMESPACE" --timeout="$DEPLOYMENT_TIMEOUT"

    log_success "Application services deployed successfully"
}

# Deploy networking and security
deploy_networking() {
    log_info "Deploying networking and security components..."

    kubectl apply -f "$PROJECT_ROOT/infrastructure/k8s/09-ingress.yaml"
    kubectl apply -f "$PROJECT_ROOT/infrastructure/k8s/10-network-policies.yaml"

    log_success "Networking and security components deployed successfully"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."

    # Check if all deployments are ready
    kubectl rollout status deployment -n "$KUBE_NAMESPACE" --timeout="$DEPLOYMENT_TIMEOUT"

    # Check service endpoints
    local services=(
        "atlas-postgres:5432"
        "atlas-redis:6379"
        "atlas-supertokens:3567"
        "atlas-hasura:8080"
        "atlas-firefly:8080"
        "atlas-grafana:3000"
        "atlas-prometheus:9090"
    )

    for service in "${services[@]}"; do
        local service_name="${service%%:*}"
        local port="${service##*:}"

        log_info "Checking $service_name on port $port..."
        if kubectl exec -n "$KUBE_NAMESPACE" deployment/atlas-prometheus -- timeout 10 sh -c "nc -z $service_name $port"; then
            log_success "$service_name is accessible"
        else
            log_error "$service_name is not accessible on port $port"
            return 1
        fi
    done

    log_success "All health checks passed"
}

# Rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."

    # Get all deployments and rollback
    local deployments=($(kubectl get deployments -n "$KUBE_NAMESPACE" -o name))

    for deployment in "${deployments[@]}"; do
        log_info "Rolling back $deployment..."
        kubectl rollout undo "$deployment" -n "$KUBE_NAMESPACE" || true
    done

    # Wait for rollback to complete
    kubectl rollout status deployment -n "$KUBE_NAMESPACE" --timeout=300s || true

    log_warning "Rollback completed"
}

# Generate deployment report
generate_report() {
    log_info "Generating deployment report..."

    local report_file="deployment-report-$(date +%Y%m%d-%H%M%S).txt"

    cat > "$report_file" << EOF
Atlas Financial Production Deployment Report
===========================================

Deployment Date: $(date)
Namespace: $KUBE_NAMESPACE
Kubernetes Cluster: $(kubectl config current-context)

Pod Status:
-----------
$(kubectl get pods -n "$KUBE_NAMESPACE" -o wide)

Service Status:
--------------
$(kubectl get services -n "$KUBE_NAMESPACE" -o wide)

Ingress Status:
--------------
$(kubectl get ingress -n "$KUBE_NAMESPACE" -o wide)

PVC Status:
----------
$(kubectl get pvc -n "$KUBE_NAMESPACE" -o wide)

Resource Usage:
--------------
$(kubectl top pods -n "$KUBE_NAMESPACE" 2>/dev/null || echo "Metrics not available")

Recent Events:
-------------
$(kubectl get events -n "$KUBE_NAMESPACE" --sort-by='.lastTimestamp' | tail -20)
EOF

    log_success "Deployment report saved to $report_file"
}

# Main deployment function
main() {
    log_info "Starting Atlas Financial production deployment..."
    log_info "Timestamp: $(date)"
    log_info "Kubernetes context: $(kubectl config current-context)"
    log_info "Target namespace: $KUBE_NAMESPACE"

    check_prerequisites
    validate_configuration
    update_secrets
    deploy_infrastructure
    deploy_applications
    deploy_networking
    run_health_checks
    generate_report

    log_success "Atlas Financial production deployment completed successfully!"
    log_info "Access the application at: https://atlas-financial.com"
    log_info "Grafana dashboard: https://grafana.atlas-financial.com"
    log_info "Prometheus metrics: https://prometheus.atlas-financial.com"
}

# Parse command line arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    rollback)
        rollback_deployment
        ;;
    health-check)
        run_health_checks
        ;;
    report)
        generate_report
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health-check|report}"
        echo "  deploy      - Deploy Atlas Financial to production"
        echo "  rollback    - Rollback the current deployment"
        echo "  health-check - Run health checks on current deployment"
        echo "  report      - Generate deployment status report"
        exit 1
        ;;
esac
