#!/bin/bash

# Atlas Financial v1.1 - Integration Testing Script
# Tests complete system integration and validates all service connections

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="infrastructure/docker/docker-compose.fixed.yml"
MAX_WAIT_TIME=300  # 5 minutes
CHECK_INTERVAL=10  # 10 seconds

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=()

# Functions
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

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log_info "Running test: $test_name"
    
    if eval "$test_command" &>/dev/null; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log_success "✓ $test_name"
        return 0
    else
        FAILED_TESTS+=("$test_name")
        log_error "✗ $test_name"
        return 1
    fi
}

print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                        Atlas Financial v1.1                                  ║"
    echo "║                      Integration Testing Suite                               ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available."
        exit 1
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]] || [[ ! -d "infrastructure/docker" ]]; then
        log_error "Please run this script from the Atlas Financial root directory."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

start_services() {
    log_info "Starting Atlas Financial services for testing..."
    
    # Use docker compose (newer) or docker-compose (legacy)
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    # Start all services
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d
    
    log_info "Services started, waiting for health checks..."
}

wait_for_services() {
    log_info "Waiting for all services to be healthy..."
    
    local start_time=$(date +%s)
    local services=("atlas-postgres" "atlas-keycloak" "atlas-hasura" "atlas-firefly" "atlas-grafana" "atlas-redis")
    
    while true; do
        local current_time=$(date +%s)
        local elapsed_time=$((current_time - start_time))
        
        if [[ $elapsed_time -gt $MAX_WAIT_TIME ]]; then
            log_error "Timeout waiting for services to be healthy"
            return 1
        fi
        
        local all_healthy=true
        for service in "${services[@]}"; do
            local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$service" 2>/dev/null || echo "no-health-check")
            if [[ "$health_status" != "healthy" ]]; then
                all_healthy=false
                log_info "Waiting for $service (status: $health_status)..."
                break
            fi
        done
        
        if [[ "$all_healthy" == "true" ]]; then
            log_success "All services are healthy!"
            return 0
        fi
        
        sleep $CHECK_INTERVAL
    done
}

test_service_connectivity() {
    log_info "Testing service connectivity..."
    
    # Test PostgreSQL
    run_test "PostgreSQL Connection" "docker exec atlas-postgres pg_isready -U atlas -d atlas_financial"
    
    # Test Redis
    run_test "Redis Connection" "docker exec atlas-redis redis-cli --no-auth-warning -a \${REDIS_PASSWORD:-atlas_redis_password} ping"
    
    # Test Keycloak Health
    run_test "Keycloak Health Check" "curl -f http://localhost:8080/health/ready"
    
    # Test Hasura GraphQL
    run_test "Hasura Health Check" "curl -f http://localhost:8081/healthz"
    
    # Test Firefly III API
    run_test "Firefly III API" "curl -f http://localhost:8082/api/v1/about"
    
    # Test Grafana
    run_test "Grafana Health Check" "curl -f http://localhost:3001/api/health"
    
    # Test AI Engine (if built)
    if docker ps --format '{{.Names}}' | grep -q "atlas-ai-engine"; then
        run_test "AI Engine Health Check" "curl -f http://localhost:8083/health"
    else
        log_warning "AI Engine not running (likely build issue)"
    fi
}

test_database_connectivity() {
    log_info "Testing database connectivity and setup..."
    
    # Test if all databases were created
    run_test "Firefly Database Exists" "docker exec atlas-postgres psql -U atlas -d firefly -c 'SELECT 1;'"
    run_test "Hasura Database Exists" "docker exec atlas-postgres psql -U atlas -d hasura -c 'SELECT 1;'"
    run_test "Keycloak Database Exists" "docker exec atlas-postgres psql -U atlas -d keycloak -c 'SELECT 1;'"
    run_test "Grafana Database Exists" "docker exec atlas-postgres psql -U atlas -d grafana -c 'SELECT 1;'"
}

test_authentication_flow() {
    log_info "Testing authentication integration..."
    
    # Test Keycloak admin console access
    run_test "Keycloak Admin Console" "curl -f http://localhost:8080/admin/"
    
    # Test JWT keys endpoint (used by Hasura)
    run_test "Keycloak JWT Keys Endpoint" "curl -f http://localhost:8080/realms/master/protocol/openid_connect/certs"
    
    # Test Hasura with admin secret
    run_test "Hasura Admin Access" "curl -f -H 'x-hasura-admin-secret: atlas_hasura_admin_secret' http://localhost:8081/v1/query -d '{\"type\":\"run_sql\",\"args\":{\"sql\":\"SELECT 1\"}}'"
}

test_service_integration() {
    log_info "Testing service integration..."
    
    # Test if Hasura can connect to PostgreSQL
    run_test "Hasura-PostgreSQL Integration" "curl -f -H 'x-hasura-admin-secret: atlas_hasura_admin_secret' http://localhost:8081/v1/query -d '{\"type\":\"run_sql\",\"args\":{\"sql\":\"SELECT current_database()\"}}'"
    
    # Test if services can resolve each other via Docker network
    run_test "Internal DNS Resolution" "docker exec atlas-hasura nslookup postgres"
    run_test "Keycloak-PostgreSQL Connection" "docker exec atlas-keycloak nslookup postgres"
}

cleanup_services() {
    log_info "Cleaning up test environment..."
    
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    $COMPOSE_CMD -f "$COMPOSE_FILE" down
    log_success "Test environment cleaned up"
}

generate_test_report() {
    echo
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                            TEST RESULTS SUMMARY                              ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    
    echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$((TOTAL_TESTS - PASSED_TESTS))${NC}"
    echo -e "Success Rate: ${GREEN}$success_rate%${NC}"
    echo
    
    if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
        echo -e "${RED}Failed Tests:${NC}"
        for test in "${FAILED_TESTS[@]}"; do
            echo -e "  ✗ $test"
        done
        echo
    fi
    
    if [[ $success_rate -eq 100 ]]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED! Atlas Financial is ready for development.${NC}"
        echo -e "${GREEN}You can now proceed with Phase 1: Core Ledger Integration${NC}"
        return 0
    elif [[ $success_rate -ge 80 ]]; then
        echo -e "${YELLOW}⚠️  Most tests passed, but some issues need attention.${NC}"
        echo -e "${YELLOW}Review failed tests before proceeding to Phase 1.${NC}"
        return 1
    else
        echo -e "${RED}❌ Integration testing failed. Significant issues detected.${NC}"
        echo -e "${RED}Please fix the failed tests before proceeding.${NC}"
        return 2
    fi
}

main() {
    print_banner
    check_prerequisites
    
    # Trap cleanup on script exit
    trap cleanup_services EXIT
    
    start_services
    
    if ! wait_for_services; then
        log_error "Services failed to become healthy within timeout"
        exit 1
    fi
    
    # Run all tests
    test_service_connectivity
    test_database_connectivity
    test_authentication_flow
    test_service_integration
    
    # Generate and display results
    generate_test_report
}

# Handle script interruption
trap 'log_error "Integration testing interrupted."; cleanup_services; exit 1' INT

# Run main function
main "$@"