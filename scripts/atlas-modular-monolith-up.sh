#!/bin/bash

# Atlas Financial Modular Monolith Startup Script
# Launches the 4-service architecture

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/infrastructure/docker"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.modular-monolith.yml"

echo -e "${BLUE}🏗️  Atlas Financial Modular Monolith Architecture${NC}"
echo -e "${BLUE}📊 Consolidating from 12 services to 4 services${NC}"
echo ""

# Function to print service info
print_service_info() {
    echo -e "${GREEN}🔧 4-Service Architecture:${NC}"
    echo -e "  1️⃣  Atlas Core Platform (Port 3000) - Next.js + Rust + AI + SuperTokens"
    echo -e "  2️⃣  Atlas Data Platform (Port 5432/6379) - PostgreSQL + Redis"
    echo -e "  3️⃣  Atlas API Gateway (Port 8081) - Hasura + External Integrations"
    echo -e "  4️⃣  Atlas Observability (Port 9090/3001) - Prometheus + Grafana"
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed${NC}"
        exit 1
    fi

    # Check if secrets directory exists
    if [ ! -d "$DOCKER_DIR/config/secrets" ]; then
        echo -e "${YELLOW}⚠️  Creating secrets directory...${NC}"
        mkdir -p "$DOCKER_DIR/config/secrets"
    fi

    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        echo -e "${RED}❌ Docker compose file not found: $COMPOSE_FILE${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
    echo ""
}

# Function to generate secrets if they don't exist
generate_secrets() {
    echo -e "${YELLOW}🔐 Checking secrets...${NC}"

    SECRETS_DIR="$DOCKER_DIR/config/secrets"

    # List of required secrets
    secrets=(
        "postgres_password"
        "postgres_connection_uri"
        "supertokens_api_key"
        "hasura_admin_secret"
        "hasura_database_url"
        "jwt_secret_key"
        "redis_password"
        "rust_database_url"
        "ai_engine_secret"
    )

    for secret in "${secrets[@]}"; do
        if [ ! -f "$SECRETS_DIR/${secret}.txt" ]; then
            echo -e "${YELLOW}🔧 Generating ${secret}...${NC}"

            case $secret in
                "postgres_password")
                    echo "atlas_dev_password_$(openssl rand -hex 8)" > "$SECRETS_DIR/${secret}.txt"
                    ;;
                "postgres_connection_uri")
                    PASSWORD=$(cat "$SECRETS_DIR/postgres_password.txt")
                    echo "postgres://atlas:${PASSWORD}@atlas-data-postgres:5432/supertokens" > "$SECRETS_DIR/${secret}.txt"
                    ;;
                "rust_database_url")
                    PASSWORD=$(cat "$SECRETS_DIR/postgres_password.txt")
                    echo "postgres://atlas:${PASSWORD}@atlas-data-postgres:5432/atlas_core" > "$SECRETS_DIR/${secret}.txt"
                    ;;
                "hasura_database_url")
                    PASSWORD=$(cat "$SECRETS_DIR/postgres_password.txt")
                    echo "postgres://atlas:${PASSWORD}@atlas-data-postgres:5432/atlas_core" > "$SECRETS_DIR/${secret}.txt"
                    ;;
                "redis_password")
                    echo "redis_dev_password_$(openssl rand -hex 8)" > "$SECRETS_DIR/${secret}.txt"
                    ;;
                "jwt_secret_key")
                    openssl rand -base64 32 > "$SECRETS_DIR/${secret}.txt"
                    ;;
                "supertokens_api_key")
                    echo "st_$(openssl rand -hex 16)" > "$SECRETS_DIR/${secret}.txt"
                    ;;
                "hasura_admin_secret")
                    echo "hasura_admin_$(openssl rand -hex 16)" > "$SECRETS_DIR/${secret}.txt"
                    ;;
                "ai_engine_secret")
                    echo "ai_secret_$(openssl rand -hex 16)" > "$SECRETS_DIR/${secret}.txt"
                    ;;
            esac

            chmod 600 "$SECRETS_DIR/${secret}.txt"
        fi
    done

    echo -e "${GREEN}✅ Secrets configuration complete${NC}"
    echo ""
}

# Function to build images if needed
build_images() {
    echo -e "${YELLOW}🔨 Building Atlas Core Platform...${NC}"

    # Check if platform directory exists
    if [ ! -d "$PROJECT_ROOT/apps/platform" ]; then
        echo -e "${YELLOW}⚠️  Platform directory not found, creating basic structure...${NC}"
        mkdir -p "$PROJECT_ROOT/apps/platform"

        # Copy web app as base for now
        if [ -d "$PROJECT_ROOT/apps/web" ]; then
            cp -r "$PROJECT_ROOT/apps/web"/* "$PROJECT_ROOT/apps/platform/"
        fi
    fi

    echo -e "${GREEN}✅ Build preparation complete${NC}"
    echo ""
}

# Function to start services
start_services() {
    echo -e "${YELLOW}🚀 Starting Atlas Financial Modular Monolith...${NC}"

    # Set environment variables
    export POSTGRES_PASSWORD=$(cat "$DOCKER_DIR/config/secrets/postgres_password.txt")
    export REDIS_PASSWORD=$(cat "$DOCKER_DIR/config/secrets/redis_password.txt")
    export GRAFANA_ADMIN_PASSWORD="admin_dev_password" # pragma: allowlist secret

    # Start services in order
    echo -e "${BLUE}📊 Starting Data Platform...${NC}"
    docker-compose -f "$COMPOSE_FILE" up -d atlas-data-postgres atlas-data-redis

    # Wait for data platform to be ready
    echo -e "${YELLOW}⏳ Waiting for data platform to be ready...${NC}"
    for i in {1..30}; do
        if docker-compose -f "$COMPOSE_FILE" exec -T atlas-data-postgres pg_isready -U atlas -d atlas_financial >/dev/null 2>&1 && \
           docker-compose -f "$COMPOSE_FILE" exec -T atlas-data-redis redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Data platform is ready${NC}"
            break
        fi

        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Data platform failed to start${NC}"
            exit 1
        fi

        echo -e "${YELLOW}⏳ Waiting... ($i/30)${NC}"
        sleep 2
    done

    echo -e "${BLUE}🌐 Starting API Gateway...${NC}"
    docker-compose -f "$COMPOSE_FILE" up -d atlas-api-gateway

    echo -e "${BLUE}🔍 Starting Observability Platform...${NC}"
    docker-compose -f "$COMPOSE_FILE" up -d atlas-observability

    echo -e "${BLUE}🎯 Starting Core Platform...${NC}"
    docker-compose -f "$COMPOSE_FILE" up -d atlas-core

    echo ""
    echo -e "${GREEN}🎉 Atlas Financial Modular Monolith is starting up!${NC}"
    echo ""
}

# Function to show service status
show_status() {
    echo -e "${BLUE}📊 Service Status:${NC}"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""

    echo -e "${BLUE}🌐 Service URLs:${NC}"
    echo -e "  🎯 Atlas Core Platform:    http://localhost:3000"
    echo -e "  🔍 Prometheus:             http://localhost:9090"
    echo -e "  📊 Grafana:                http://localhost:3001"
    echo -e "  🌐 Hasura Console:         http://localhost:8081/console"
    echo -e "  📈 Core Metrics:           http://localhost:3000/api/metrics"
    echo ""

    echo -e "${BLUE}🔐 Admin Credentials:${NC}"
    echo -e "  Grafana:    admin / admin_dev_password"
    echo -e "  Hasura:     Admin Secret in secrets/hasura_admin_secret.txt"
    echo ""

    echo -e "${YELLOW}📊 Architecture Consolidation Summary:${NC}"
    echo -e "  ✅ Reduced from 12 services to 4 services (67% reduction)"
    echo -e "  ✅ Single deployment unit (Atlas Core Platform)"
    echo -e "  ✅ Unified data layer (PostgreSQL + Redis)"
    echo -e "  ✅ Consolidated API gateway"
    echo -e "  ✅ Integrated observability"
    echo ""
}

# Function to monitor startup
monitor_startup() {
    echo -e "${YELLOW}⏳ Monitoring service startup...${NC}"

    # Wait for all services to be healthy
    local max_attempts=60
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        local all_healthy=true

        # Check each service
        if ! docker-compose -f "$COMPOSE_FILE" ps --services | xargs -I {} sh -c 'docker-compose -f "$0" ps "$1" | tail -n +3 | grep -q "Up.*healthy"' "$COMPOSE_FILE" {}; then
            all_healthy=false
        fi

        if $all_healthy; then
            echo -e "${GREEN}✅ All services are healthy!${NC}"
            break
        fi

        if [ $attempt -eq $max_attempts ]; then
            echo -e "${YELLOW}⚠️  Some services may still be starting up...${NC}"
            break
        fi

        echo -e "${YELLOW}⏳ Waiting for services to become healthy... ($attempt/$max_attempts)${NC}"
        sleep 3
        ((attempt++))
    done
}

# Main execution
main() {
    print_service_info
    check_prerequisites
    generate_secrets
    build_images
    start_services
    monitor_startup
    show_status

    echo -e "${GREEN}🚀 Atlas Financial Modular Monolith is ready!${NC}"
    echo -e "${BLUE}📚 For logs: docker-compose -f $COMPOSE_FILE logs -f${NC}"
    echo -e "${BLUE}🛑 To stop: docker-compose -f $COMPOSE_FILE down${NC}"
}

# Handle script arguments
case "${1:-}" in
    "status")
        show_status
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f "${2:-}"
        ;;
    "stop")
        echo -e "${YELLOW}🛑 Stopping Atlas Financial Modular Monolith...${NC}"
        docker-compose -f "$COMPOSE_FILE" down
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;
    "restart")
        echo -e "${YELLOW}🔄 Restarting Atlas Financial Modular Monolith...${NC}"
        docker-compose -f "$COMPOSE_FILE" down
        sleep 2
        main
        ;;
    *)
        main
        ;;
esac
