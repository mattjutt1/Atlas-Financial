#!/bin/bash

# Atlas Financial AI Engine - Flexible Deployment Script
# Supports monolithic, multi-agent, and hybrid deployment modes

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="${PROJECT_ROOT}/config/deployment.env"

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

# Load configuration
load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        log_info "Loading configuration from $CONFIG_FILE"
        source "$CONFIG_FILE"
    else
        log_warning "Configuration file not found, using defaults"
    fi
    
    # Set defaults
    export AI_DEPLOYMENT_MODE="${AI_DEPLOYMENT_MODE:-monolithic}"
    export ENVIRONMENT="${ENVIRONMENT:-development}"
    export COMPOSE_PROFILES="${COMPOSE_PROFILES:-}"
    export AI_MODELS_PATH="${AI_MODELS_PATH:-${PROJECT_ROOT}/models}"
    export ENABLE_MONITORING="${ENABLE_MONITORING:-false}"
    export ENABLE_MODEL_MANAGEMENT="${ENABLE_MODEL_MANAGEMENT:-false}"
}

# Validate deployment mode
validate_deployment_mode() {
    case "$AI_DEPLOYMENT_MODE" in
        monolithic|multi_agent|hybrid)
            log_info "Deployment mode: $AI_DEPLOYMENT_MODE"
            ;;
        *)
            log_error "Invalid deployment mode: $AI_DEPLOYMENT_MODE"
            log_error "Valid modes: monolithic, multi_agent, hybrid"
            exit 1
            ;;
    esac
}

# Set Docker Compose profiles based on deployment mode
set_compose_profiles() {
    local profiles=()
    
    case "$AI_DEPLOYMENT_MODE" in
        monolithic)
            profiles+=("monolithic")
            ;;
        multi_agent)
            profiles+=("multi-agent")
            ;;
        hybrid)
            profiles+=("monolithic" "multi-agent")
            ;;
    esac
    
    if [[ "$ENABLE_MONITORING" == "true" ]]; then
        profiles+=("monitoring")
    fi
    
    if [[ "$ENABLE_MODEL_MANAGEMENT" == "true" ]]; then
        profiles+=("model-management")  
    fi
    
    export COMPOSE_PROFILES=$(IFS=,; echo "${profiles[*]}")
    log_info "Docker Compose profiles: $COMPOSE_PROFILES"
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check GPU support for multi-agent mode
    if [[ "$AI_DEPLOYMENT_MODE" == "multi_agent" || "$AI_DEPLOYMENT_MODE" == "hybrid" ]]; then
        if ! command -v nvidia-docker &> /dev/null && ! docker info | grep -q nvidia; then
            log_warning "NVIDIA Docker runtime not detected. GPU acceleration may not work."
        fi
    fi
    
    # Check available disk space
    local available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    local required_space=10485760  # 10GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        log_warning "Low disk space. At least 10GB recommended for model storage."
    fi
    
    log_success "System requirements check passed"
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    
    local dirs=(
        "$AI_MODELS_PATH"
        "${PROJECT_ROOT}/logs"
        "${PROJECT_ROOT}/cache" 
        "${PROJECT_ROOT}/config"
        "${PROJECT_ROOT}/data/prometheus"
        "${PROJECT_ROOT}/data/grafana"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log_info "Created directory: $dir"
        fi
    done
    
    log_success "Directories created successfully"
}

# Generate configuration files
generate_config() {
    log_info "Generating configuration files..."
    
    # Generate AI Engine configuration
    cat > "${PROJECT_ROOT}/config/ai_engine.yml" << EOF
# Atlas Financial AI Engine Configuration
backend:
  deployment_mode: ${AI_DEPLOYMENT_MODE}
  
  monolithic:
    name: atlas-financial-3b
    model_path: /models/atlas-financial-3b
    endpoint: http://monolithic-model:8080
    max_tokens: 2048
    temperature: 0.7
    gpu_memory_mb: 4096
  
  supervisor:
    name: atlas-supervisor-7b
    model_path: /models/atlas-supervisor-7b
    endpoint: http://supervisor-agent:8080
    max_tokens: 4096
    gpu_memory_mb: 8192
    specialization_params:
      coordination_strategy: parallel_execution
      quality_threshold: 0.85
      max_agents_per_request: 5
  
  workers:
    budget_optimizer:
      enabled: true
      endpoint: http://budget-agent:8080
    investment_analyzer:
      enabled: true
      endpoint: http://investment-agent:8080
    debt_strategist:
      enabled: true
      endpoint: http://debt-agent:8080
    market_intelligence:
      enabled: true
      endpoint: http://market-agent:8080
    goal_planner:
      enabled: true
      endpoint: http://goal-agent:8080
  
  load_balancing:
    strategy: round_robin
    health_check_interval: 30
    failure_threshold: 3
  
  failover:
    enable_auto_failover: true
    fallback_to_monolithic: true
    max_retry_attempts: 3

performance:
  max_concurrent_requests: 100
  request_timeout_ms: 10000
  context_cache_ttl_seconds: 3600
  result_cache_ttl_seconds: 300
  enable_request_batching: true
  batch_size: 10
  batch_timeout_ms: 100

security:
  enable_rate_limiting: true
  rate_limit_requests_per_minute: 100
  enable_request_logging: true
  encrypt_context_data: true
  require_https: false

monitoring:
  enable_prometheus_metrics: true
  enable_distributed_tracing: true
  log_level: INFO
  health_check_interval_seconds: 30
  alert_thresholds:
    response_time_ms: 500
    error_rate: 0.05
    cpu_usage: 0.8
    memory_usage: 0.8
EOF
    
    log_success "Configuration files generated"
}

# Pull or build Docker images
prepare_images() {
    log_info "Preparing Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build AI Engine image
    log_info "Building AI Engine image..."
    docker build -f Dockerfile.flexible -t atlas/ai-engine:latest --target production .
    
    # Pull base images
    log_info "Pulling base images..."
    docker-compose -f docker-compose.flexible.yml pull redis postgres supertokens
    
    # Build or pull model images based on deployment mode
    case "$AI_DEPLOYMENT_MODE" in
        monolithic|hybrid)
            log_info "Preparing monolithic model image..."
            if ! docker pull atlas/monolithic-model:latest 2>/dev/null; then
                log_warning "Monolithic model image not found, building placeholder..."
                create_placeholder_model_image "monolithic-model"
            fi
            ;;
    esac
    
    case "$AI_DEPLOYMENT_MODE" in
        multi_agent|hybrid)
            log_info "Preparing multi-agent model images..."
            local agents=("supervisor-agent" "budget-agent" "investment-agent" "debt-agent" "market-agent" "goal-agent")
            
            for agent in "${agents[@]}"; do
                if ! docker pull "atlas/$agent:latest" 2>/dev/null; then
                    log_warning "$agent image not found, building placeholder..."
                    create_placeholder_model_image "$agent"
                fi
            done
            ;;
    esac
    
    log_success "Docker images prepared"
}

# Create placeholder model images for development
create_placeholder_model_image() {
    local image_name="$1"
    
    cat > "${PROJECT_ROOT}/Dockerfile.${image_name}" << EOF
FROM python:3.11-slim

WORKDIR /app

RUN pip install fastapi uvicorn

COPY <<'EOP' app.py
from fastapi import FastAPI
import uvicorn

app = FastAPI(title="$image_name Placeholder")

@app.get("/health")
async def health():
    return {"status": "healthy", "model": "$image_name"}

@app.post("/predict")
async def predict(data: dict):
    return {
        "model": "$image_name",
        "prediction": "placeholder_result",
        "confidence": 0.85
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
EOP

EXPOSE 8080
CMD ["python", "app.py"]
EOF
    
    docker build -f "Dockerfile.${image_name}" -t "atlas/${image_name}:latest" .
    rm "Dockerfile.${image_name}"
    
    log_info "Created placeholder image for $image_name"
}

# Deploy services
deploy_services() {
    log_info "Deploying AI Engine services..."
    
    cd "$PROJECT_ROOT"
    
    # Stop existing services
    log_info "Stopping existing services..."
    docker-compose -f docker-compose.flexible.yml down --remove-orphans
    
    # Start services based on profiles
    log_info "Starting services with profiles: $COMPOSE_PROFILES"
    COMPOSE_PROFILES="$COMPOSE_PROFILES" docker-compose -f docker-compose.flexible.yml up -d
    
    log_success "Services deployed successfully"
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    local max_attempts=30
    local attempt=1
    
    # Check AI Engine
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:8083/health &>/dev/null; then
            log_success "AI Engine is healthy"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "AI Engine health check failed after $max_attempts attempts"
            return 1
        fi
        
        log_info "Attempt $attempt/$max_attempts: AI Engine not ready, waiting..."
        sleep 10
        ((attempt++))
    done
    
    # Check backend-specific services
    case "$AI_DEPLOYMENT_MODE" in
        monolithic|hybrid)
            if ! curl -f http://localhost:8080/health &>/dev/null; then
                log_warning "Monolithic model health check failed"
            else
                log_success "Monolithic model is healthy"
            fi
            ;;
    esac
    
    case "$AI_DEPLOYMENT_MODE" in
        multi_agent|hybrid)
            if ! curl -f http://localhost:8081/health &>/dev/null; then
                log_warning "Supervisor agent health check failed"
            else
                log_success "Supervisor agent is healthy"
            fi
            ;;
    esac
    
    log_success "Health checks completed"
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    echo "===================="
    echo "Deployment Mode: $AI_DEPLOYMENT_MODE"
    echo "Environment: $ENVIRONMENT"  
    echo "Compose Profiles: $COMPOSE_PROFILES"
    echo ""
    
    log_info "Service Endpoints:"
    echo "AI Engine: http://localhost:8083"
    echo "AI Engine GraphQL: http://localhost:8083/ai/graphql"
    echo "AI Engine Status: http://localhost:8083/ai/status"
    
    if [[ "$ENABLE_MONITORING" == "true" ]]; then
        echo "Prometheus: http://localhost:9091"
        echo "Grafana: http://localhost:3000 (admin/admin123)"
    fi
    
    echo ""
    log_info "Useful Commands:"
    echo "View logs: docker-compose -f docker-compose.flexible.yml logs -f ai-engine"
    echo "Scale services: docker-compose -f docker-compose.flexible.yml up -d --scale budget-agent=3"
    echo "Switch mode: AI_DEPLOYMENT_MODE=multi_agent $0 deploy"
    echo "Stop services: docker-compose -f docker-compose.flexible.yml down"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up AI Engine deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Stop all services
    docker-compose -f docker-compose.flexible.yml down --remove-orphans
    
    # Remove images if requested
    if [[ "${1:-}" == "--remove-images" ]]; then
        log_info "Removing Docker images..."
        docker rmi $(docker images "atlas/*" -q) 2>/dev/null || true
    fi
    
    # Remove volumes if requested
    if [[ "${1:-}" == "--remove-volumes" ]]; then
        log_info "Removing Docker volumes..."
        docker-compose -f docker-compose.flexible.yml down -v
    fi
    
    log_success "Cleanup completed"
}

# Main deployment function
deploy() {
    log_info "Starting Atlas Financial AI Engine deployment..."
    
    load_config
    validate_deployment_mode
    set_compose_profiles
    check_requirements
    create_directories
    generate_config
    prepare_images
    deploy_services
    health_check
    show_status
    
    log_success "Deployment completed successfully!"
}

# Main script logic
main() {
    case "${1:-deploy}" in
        deploy)
            deploy
            ;;
        status)
            load_config
            show_status
            ;;
        cleanup)
            cleanup "${2:-}"
            ;;
        health)
            health_check
            ;;
        logs)
            cd "$PROJECT_ROOT"
            docker-compose -f docker-compose.flexible.yml logs -f "${2:-ai-engine}"
            ;;
        restart)
            load_config
            cd "$PROJECT_ROOT"
            docker-compose -f docker-compose.flexible.yml restart "${2:-ai-engine}"
            ;;
        scale)
            if [[ -z "${2:-}" || -z "${3:-}" ]]; then
                log_error "Usage: $0 scale <service> <count>"
                exit 1
            fi
            load_config
            cd "$PROJECT_ROOT"
            docker-compose -f docker-compose.flexible.yml up -d --scale "$2=$3"
            ;;
        *)
            echo "Usage: $0 {deploy|status|cleanup|health|logs|restart|scale}"
            echo ""
            echo "Commands:"
            echo "  deploy              Deploy AI Engine with current configuration"
            echo "  status              Show deployment status and endpoints"
            echo "  cleanup [--remove-images|--remove-volumes]  Clean up deployment"
            echo "  health              Run health checks"
            echo "  logs [service]      Show logs for service (default: ai-engine)"
            echo "  restart [service]   Restart service (default: ai-engine)"
            echo "  scale <service> <count>  Scale service to specified count"
            echo ""
            echo "Environment Variables:"
            echo "  AI_DEPLOYMENT_MODE   Deployment mode (monolithic|multi_agent|hybrid)"
            echo "  ENVIRONMENT          Environment (development|production)"
            echo "  ENABLE_MONITORING    Enable monitoring stack (true|false)"
            echo "  AI_MODELS_PATH       Path to AI models directory"
            exit 1
            ;;
    esac
}

# Trap signals for cleanup
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"