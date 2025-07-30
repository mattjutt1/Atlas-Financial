#!/bin/bash

# Atlas Financial AI Engine - Optimized Deployment Script
# Deploys high-performance AI Engine with comprehensive monitoring and load testing

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_DIR}/.env.optimized"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.optimized.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check available resources
    AVAILABLE_MEMORY=$(free -g | awk '/^Mem:/ {print $7}')
    if [ "$AVAILABLE_MEMORY" -lt 8 ]; then
        warn "Available memory is ${AVAILABLE_MEMORY}GB. Recommended: 8GB+"
    fi
    
    log "Prerequisites check completed"
}

# Create environment file
create_env_file() {
    log "Creating optimized environment configuration..."
    
    cat > "$ENV_FILE" << EOF
# Atlas Financial AI Engine - Optimized Environment Configuration

# Core Configuration
ENVIRONMENT=production
NODE_ENV=production

# Security
JWT_SECRET_KEY=$(openssl rand -base64 32)
SUPERTOKENS_API_KEY=$(openssl rand -base64 32)

# Performance Tuning
MAX_CONCURRENT_REQUESTS=10000
REQUEST_TIMEOUT_MS=10000
BATCH_SIZE=32
BATCH_TIMEOUT_MS=50
CONNECTION_POOL_SIZE=50

# Caching Configuration
CONTEXT_CACHE_TTL=3600
RESULT_CACHE_TTL=300
ENABLE_CACHE_WARMING=true

# Monitoring
ENABLE_PROMETHEUS=true
ENABLE_TRACING=true
LOG_LEVEL=INFO

# Alert Thresholds
ALERT_RESPONSE_TIME_MS=400
ALERT_ERROR_RATE=0.05
ALERT_CPU_USAGE=0.8
ALERT_MEMORY_USAGE=0.8

# Resource Limits
MAX_GPU_MEMORY_MB=16384
REDIS_MAXMEMORY=2gb

# Load Testing Configuration
LOAD_TEST_USERS=1000
LOAD_TEST_DURATION=300
LOAD_TEST_TARGET_P95=400

EOF
    
    log "Environment file created: $ENV_FILE"
}

# Build and start services
deploy_services() {
    log "Building and deploying optimized AI Engine services..."
    
    cd "$PROJECT_DIR"
    
    # Pull latest images
    log "Pulling latest base images..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull
    
    # Build optimized images
    log "Building optimized AI Engine image..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --parallel ai-engine-optimized
    
    # Start infrastructure services first
    log "Starting infrastructure services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d redis-cluster prometheus grafana
    
    # Wait for Redis to be ready
    log "Waiting for Redis to be ready..."
    sleep 10
    
    # Health check Redis
    if ! docker-compose -f "$COMPOSE_FILE" exec redis-cluster redis-cli ping > /dev/null 2>&1; then
        error "Redis failed to start properly"
    fi
    
    # Start AI Engine
    log "Starting optimized AI Engine..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d ai-engine-optimized
    
    # Start mock model endpoints for testing
    log "Starting mock model endpoints..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d monolithic-model supervisor-agent
    
    log "All services deployed successfully"
}

# Wait for services to be healthy
wait_for_services() {
    log "Waiting for services to be healthy..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:8083/health > /dev/null 2>&1; then
            log "AI Engine is healthy"
            break
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -eq $max_attempts ]; then
            error "AI Engine failed to become healthy within 5 minutes"
        fi
        
        log "Waiting for AI Engine to be healthy... (attempt $attempt/$max_attempts)"
        sleep 5
    done
    
    # Check detailed health
    log "Checking detailed system health..."
    curl -s http://localhost:8083/health/detailed | jq '.' || warn "Detailed health check failed"
}

# Run performance validation
validate_performance() {
    log "Running performance validation tests..."
    
    # Quick performance test
    log "Running quick performance test..."
    python3 "$SCRIPT_DIR/load_test.py" \
        --url http://localhost:8083 \
        --users 100 \
        --requests 5 \
        --duration 60 \
        --target-p95 400 || warn "Quick performance test failed"
    
    # Get performance metrics
    log "Collecting performance metrics..."
    curl -s http://localhost:8083/ai/status | jq '.' || warn "Performance metrics collection failed"
}

# Run comprehensive load test
run_load_test() {
    local users=${1:-1000}
    local duration=${2:-300}
    
    log "Running comprehensive load test with $users users for ${duration}s..."
    
    # Build load tester if needed
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build load-tester
    
    # Run load test
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" --profile testing run --rm load-tester \
        python scripts/load_test.py \
        --url http://ai-engine-optimized:8083 \
        --users "$users" \
        --requests 10 \
        --duration "$duration" \
        --target-p95 400
}

# Display service URLs and information
display_info() {
    log "Deployment complete! Service information:"
    echo ""
    echo -e "${BLUE}🚀 AI Engine Services:${NC}"
    echo "  • AI Engine API: http://localhost:8083"
    echo "  • Health Check: http://localhost:8083/health"
    echo "  • Performance Metrics: http://localhost:8083/ai/status"
    echo "  • Prometheus Metrics: http://localhost:8083/metrics"
    echo ""
    echo -e "${BLUE}📊 Monitoring Services:${NC}"
    echo "  • Prometheus: http://localhost:9091"
    echo "  • Grafana: http://localhost:3001 (admin/admin123)"
    echo ""
    echo -e "${BLUE}🔧 Mock Endpoints:${NC}"
    echo "  • Monolithic Model: http://localhost:8080"
    echo "  • Supervisor Agent: http://localhost:8081"
    echo ""
    echo -e "${BLUE}🎯 Performance Targets:${NC}"
    echo "  • Concurrent Users: 10,000"
    echo "  • P95 Response Time: <400ms"
    echo "  • Success Rate: >99%"
    echo "  • Cache Hit Rate: >70%"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "  1. Check service health: curl http://localhost:8083/health/detailed"
    echo "  2. Run load test: $0 --load-test"
    echo "  3. View monitoring: http://localhost:3001"
    echo "  4. Check logs: docker-compose -f $COMPOSE_FILE logs ai-engine-optimized"
    echo ""
}

# Cleanup function
cleanup() {
    log "Cleaning up deployment..."
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v
    docker system prune -f
    log "Cleanup completed"
}

# Show logs
show_logs() {
    local service=${1:-ai-engine-optimized}
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f "$service"
}

# Main deployment function
main() {
    case "${1:-deploy}" in
        "deploy")
            log "Starting Atlas Financial AI Engine optimized deployment..."
            check_prerequisites
            create_env_file
            deploy_services
            wait_for_services
            validate_performance
            display_info
            ;;
            
        "--load-test")
            local users=${2:-1000}
            local duration=${3:-300}
            run_load_test "$users" "$duration"
            ;;
            
        "--cleanup")
            cleanup
            ;;
            
        "--logs")
            show_logs "${2:-ai-engine-optimized}"
            ;;
            
        "--status")
            log "Checking service status..."
            curl -s http://localhost:8083/health/detailed | jq '.'
            curl -s http://localhost:8083/ai/status | jq '.'
            ;;
            
        "--help")
            echo "Atlas Financial AI Engine - Optimized Deployment Script"
            echo ""
            echo "Usage: $0 [COMMAND] [OPTIONS]"
            echo ""
            echo "Commands:"
            echo "  deploy              Deploy all services (default)"
            echo "  --load-test [U] [D] Run load test with U users for D seconds"
            echo "  --cleanup           Stop and remove all services"
            echo "  --logs [SERVICE]    Show logs for service"
            echo "  --status            Show current service status"
            echo "  --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                          # Deploy all services"
            echo "  $0 --load-test 2000 600    # Load test with 2000 users for 10 minutes"
            echo "  $0 --logs ai-engine-optimized  # Show AI Engine logs"
            echo "  $0 --cleanup                # Stop and cleanup"
            ;;
            
        *)
            error "Unknown command: $1. Use --help for usage information."
            ;;
    esac
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}Deployment interrupted by user${NC}"; exit 130' INT

# Run main function
main "$@"