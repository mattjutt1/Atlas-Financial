#!/bin/bash

# Atlas Financial v1.1 - One-Command Startup Script
# This script initializes and starts the complete Atlas Financial platform

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="infrastructure/docker/docker-compose.dev.yml"
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

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

print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                          Atlas Financial v1.1                                ║"
    echo "║                   Brutal Honesty Personal Finance Platform                   ║"
    echo "║                              Starting Up...                                  ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker and try again."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi

    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available. Please install Docker Compose and try again."
        exit 1
    fi

    # Check if we're in the right directory
    if [[ ! -f "package.json" ]] || [[ ! -d "infrastructure/docker" ]]; then
        log_error "Please run this script from the Atlas Financial root directory."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

setup_environment() {
    log_info "Setting up environment variables..."

    if [[ ! -f "$ENV_FILE" ]]; then
        if [[ -f "$ENV_EXAMPLE" ]]; then
            log_warning "No .env file found. Creating from .env.example..."
            cp "$ENV_EXAMPLE" "$ENV_FILE"

            # Generate random passwords
            log_info "Generating secure random passwords..."

            # Generate PostgreSQL password
            POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
            sed -i "s/your-secure-postgres-password-here/$POSTGRES_PASSWORD/g" "$ENV_FILE"

            # Generate Keycloak admin password
            KEYCLOAK_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
            sed -i "s/your-keycloak-admin-password-here/$KEYCLOAK_PASSWORD/g" "$ENV_FILE"

            # Generate Firefly III app key
            FIREFLY_KEY=$(openssl rand -base64 32)
            sed -i "s/your-32-character-app-key-here-change-this/$FIREFLY_KEY/g" "$ENV_FILE"

            # Generate Hasura admin secret
            HASURA_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
            sed -i "s/your-hasura-admin-secret-here/$HASURA_SECRET/g" "$ENV_FILE"

            # Generate Grafana admin password
            GRAFANA_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
            sed -i "s/your-grafana-admin-password-here/$GRAFANA_PASSWORD/g" "$ENV_FILE"

            # Generate Redis password
            REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
            sed -i "s/your-redis-password-here/$REDIS_PASSWORD/g" "$ENV_FILE"

            log_success "Environment file created with secure random passwords"
            log_warning "IMPORTANT: Save these credentials securely!"
            echo "Keycloak Admin: admin / $KEYCLOAK_PASSWORD"
            echo "Grafana Admin: admin / $GRAFANA_PASSWORD"

        else
            log_error "No .env.example file found. Cannot set up environment."
            exit 1
        fi
    else
        log_success "Environment file already exists"
    fi
}

build_services() {
    log_info "Building custom services..."

    # Build AI Engine service
    if [[ -d "services/ai-engine" ]]; then
        log_info "Building AI Engine service..."
        # Note: Will be built by docker-compose
    fi

    log_success "Service build preparation complete"
}

start_services() {
    log_info "Starting Atlas Financial services..."

    # Use docker compose (newer) or docker-compose (legacy)
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi

    # Start services in correct order
    log_info "Starting database and infrastructure services..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d postgres redis

    # Wait for database to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    sleep 10

    # Start authentication and API services
    log_info "Starting authentication and API services..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d supertokens hasura

    # Wait for auth services
    log_info "Waiting for authentication services..."
    sleep 15

    # Start application services
    log_info "Starting application services..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d firefly ai-engine grafana
    # Note: rust-financial-engine temporarily disabled due to compilation issues

    # Start monitoring services
    log_info "Starting monitoring and observability services..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d prometheus redis-exporter postgres-exporter

    log_success "All services started"
}

wait_for_services() {
    log_info "Waiting for all services to be healthy..."

    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        log_info "Health check attempt $attempt/$max_attempts..."

        local all_healthy=true

        # Check each service
        services=("postgres:5432" "supertokens:3567/hello" "hasura:8081/healthz" "firefly:8082/health" "grafana:3001/api/health" "prometheus:9090/-/healthy")
        # Note: rust-financial-engine temporarily disabled due to compilation issues

        for service in "${services[@]}"; do
            if [[ "$service" == "postgres:5432" ]]; then
                if ! nc -z localhost 5432 2>/dev/null; then
                    all_healthy=false
                    break
                fi
            else
                IFS=':' read -r host path <<< "$service"
                if ! curl -s -f "http://localhost:$path" >/dev/null 2>&1; then
                    all_healthy=false
                    break
                fi
            fi
        done

        if [[ "$all_healthy" == "true" ]]; then
            log_success "All services are healthy!"
            break
        fi

        if [[ $attempt -eq $max_attempts ]]; then
            log_warning "Some services may still be starting up. Check logs if needed."
            break
        fi

        sleep 10
        ((attempt++))
    done
}

show_access_info() {
    log_success "Atlas Financial v1.1 is now running!"
    echo ""
    echo -e "${GREEN}🌐 Service Access URLs:${NC}"
    echo "  • Web Frontend:     http://localhost:3000 (when started)"
    echo "  • SuperTokens:      http://localhost:3567 (API)"
    echo "  • Hasura Console:   http://localhost:8081"
    echo "  • Firefly III:      http://localhost:8082"
    echo "  • AI Engine API:    http://localhost:8083"
    echo "  • Rust Financial:   http://localhost:8080"
    echo "  • Grafana:          http://localhost:3001"
    echo "  • Prometheus:       http://localhost:9090"
    echo ""
    echo -e "${YELLOW}📋 Default Credentials:${NC}"
    echo "  • SuperTokens: API-based authentication (no admin panel)"
    echo "  • Grafana:  admin / (check .env file)"
    echo ""
    echo -e "${BLUE}📚 Next Steps:${NC}"
    echo "  1. Start the web frontend: npm run dev:web"
    echo "  2. Test SuperTokens authentication via API"
    echo "  3. Connect your first bank account"
    echo "  4. Get your first brutal honesty financial insight!"
    echo ""
    echo -e "${GREEN}🛠  Management Commands:${NC}"
    echo "  • Stop Atlas:    ./scripts/atlas-down.sh"
    echo "  • Reset Atlas:   ./scripts/atlas-reset.sh"
    echo "  • View logs:     docker-compose -f $COMPOSE_FILE logs -f [service]"
    echo ""
}

main() {
    print_banner
    check_prerequisites
    setup_environment
    build_services
    start_services
    wait_for_services
    show_access_info
}

# Handle script interruption
trap 'log_error "Script interrupted. You may need to clean up with: docker-compose -f $COMPOSE_FILE down"' INT

# Run main function
main "$@"
