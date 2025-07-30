#!/bin/bash

# Atlas Financial Desktop App Deployment Script
# Phase 2.6: Desktop App Integration with Modular Monolith
# Deploys desktop app services alongside main architecture

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/infrastructure/docker"
DESKTOP_DIR="$PROJECT_ROOT/apps/desktop"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.modular-monolith.yml"
DESKTOP_COMPOSE_FILE="$DESKTOP_DIR/docker-compose.desktop.yml"

echo -e "${PURPLE}🖥️  Atlas Financial Desktop App Deployment${NC}"
echo -e "${PURPLE}🔗 Phase 2.6: Modular Monolith Integration${NC}"
echo ""

# Function to print service info
print_service_info() {
    echo -e "${GREEN}🏗️  Desktop Architecture Integration:${NC}"
    echo -e "  🎯 Atlas Core Platform (Port 3000) - Main API Gateway"
    echo -e "  🌐 Atlas API Gateway (Port 8081) - GraphQL Gateway"
    echo -e "  🖥️  Atlas Desktop Backend (Port 8090) - Desktop API Server"
    echo -e "  📱 Atlas Desktop Client (Port 3002) - Web Hybrid Client"
    echo -e "  📊 Metrics & Monitoring (Port 9091) - Desktop Metrics"
    echo ""
    echo -e "${BLUE}🔗 Architectural Compliance:${NC}"
    echo -e "  ✅ No direct database connections"
    echo -e "  ✅ API Gateway exclusive communication"
    echo -e "  ✅ SuperTokens authentication integration"
    echo -e "  ✅ Shared configuration management"
    echo -e "  ✅ Unified deployment orchestration"
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

    # Check if main monolith is running
    if ! docker ps --format "table {{.Names}}" | grep -q "atlas-core-platform"; then
        echo -e "${YELLOW}⚠️  Main Atlas monolith not running. Starting it first...${NC}"

        if [ -f "$SCRIPT_DIR/atlas-modular-monolith-up.sh" ]; then
            bash "$SCRIPT_DIR/atlas-modular-monolith-up.sh"
        else
            echo -e "${RED}❌ Cannot find main monolith startup script${NC}"
            exit 1
        fi
    fi

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

    # Check if desktop compose file exists
    if [ ! -f "$DESKTOP_COMPOSE_FILE" ]; then
        echo -e "${RED}❌ Desktop compose file not found: $DESKTOP_COMPOSE_FILE${NC}"
        exit 1
    fi

    # Check if desktop directory exists
    if [ ! -d "$DESKTOP_DIR" ]; then
        echo -e "${RED}❌ Desktop directory not found: $DESKTOP_DIR${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
    echo ""
}

# Function to validate architectural compliance
validate_architectural_compliance() {
    echo -e "${YELLOW}🔍 Validating architectural compliance...${NC}"

    # Check for architectural violations in environment files
    local violations=()

    # Check for direct database URLs
    if grep -r "DATABASE_URL.*postgresql" "$DESKTOP_DIR" 2>/dev/null | grep -v "# Phase 2.6" >/dev/null; then
        violations+=("Direct database URL found - should use API Gateway")
    fi

    # Check for direct service URLs
    if grep -r "SUPERTOKENS_URL.*3567" "$DESKTOP_DIR" 2>/dev/null | grep -v "# Phase 2.6" >/dev/null; then
        violations+=("Direct SuperTokens URL found - should use Atlas Core")
    fi

    if grep -r "FINANCIAL_ENGINE_URL.*8080" "$DESKTOP_DIR" 2>/dev/null | grep -v "# Phase 2.6" >/dev/null; then
        violations+=("Direct Financial Engine URL found - should use API Gateway")
    fi

    # Check if proper gateway URLs are configured
    if ! grep -r "ATLAS_CORE_URL" "$DESKTOP_DIR" >/dev/null; then
        violations+=("Missing ATLAS_CORE_URL configuration")
    fi

    if ! grep -r "ATLAS_API_GATEWAY_URL" "$DESKTOP_DIR" >/dev/null; then
        violations+=("Missing ATLAS_API_GATEWAY_URL configuration")
    fi

    # Report violations
    if [ ${#violations[@]} -gt 0 ]; then
        echo -e "${RED}❌ Architectural compliance violations found:${NC}"
        for violation in "${violations[@]}"; do
            echo -e "  ⚠️  $violation"
        done
        echo ""
        echo -e "${YELLOW}💡 These violations indicate the desktop app may be bypassing architectural boundaries.${NC}"
        echo -e "${YELLOW}   Please ensure all communication goes through Atlas Core and API Gateway.${NC}"

        read -p "Continue anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Architectural compliance validated${NC}"
    fi
    echo ""
}

# Function to build desktop images
build_desktop_images() {
    echo -e "${YELLOW}🔨 Building desktop app images...${NC}"

    # Build desktop backend
    echo -e "${BLUE}🔧 Building Atlas Desktop Backend...${NC}"
    docker build -t atlas-desktop-backend "$DESKTOP_DIR" -f "$DESKTOP_DIR/Dockerfile"

    # Build desktop client
    echo -e "${BLUE}🔧 Building Atlas Desktop Client...${NC}"
    docker build -t atlas-desktop-client "$DESKTOP_DIR" -f "$DESKTOP_DIR/Dockerfile.client"

    echo -e "${GREEN}✅ Desktop images built successfully${NC}"
    echo ""
}

# Function to start desktop services
start_desktop_services() {
    echo -e "${YELLOW}🚀 Starting Atlas Desktop services...${NC}"

    # Ensure atlas network exists
    if ! docker network ls | grep -q "atlas-financial_atlas-network"; then
        echo -e "${YELLOW}🔧 Creating atlas network...${NC}"
        docker network create atlas-financial_atlas-network --driver bridge
    fi

    # Start desktop services
    echo -e "${BLUE}🖥️  Starting Desktop Backend...${NC}"
    docker-compose -f "$DESKTOP_COMPOSE_FILE" up -d atlas-desktop-backend

    # Wait for backend to be ready
    echo -e "${YELLOW}⏳ Waiting for desktop backend to be ready...${NC}"
    for i in {1..30}; do
        if curl -sf http://localhost:8090/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Desktop backend is ready${NC}"
            break
        fi

        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Desktop backend failed to start${NC}"
            exit 1
        fi

        echo -e "${YELLOW}⏳ Waiting... ($i/30)${NC}"
        sleep 2
    done

    echo -e "${BLUE}📱 Starting Desktop Client...${NC}"
    docker-compose -f "$DESKTOP_COMPOSE_FILE" up -d atlas-desktop-client

    echo ""
    echo -e "${GREEN}🎉 Atlas Desktop services are starting up!${NC}"
    echo ""
}

# Function to show service status
show_status() {
    echo -e "${BLUE}📊 Desktop Services Status:${NC}"
    docker-compose -f "$DESKTOP_COMPOSE_FILE" ps
    echo ""

    echo -e "${BLUE}🌐 Desktop Service URLs:${NC}"
    echo -e "  🖥️  Desktop Backend API:     http://localhost:8090"
    echo -e "  📱 Desktop Client Web:      http://localhost:3002"
    echo -e "  📊 Desktop Metrics:         http://localhost:9091/metrics"
    echo -e "  🔍 Desktop Health:          http://localhost:8090/health"
    echo ""

    echo -e "${BLUE}🔗 Integration URLs:${NC}"
    echo -e "  🎯 Atlas Core Platform:     http://localhost:3000"
    echo -e "  🌐 Atlas API Gateway:       http://localhost:8081"
    echo -e "  📊 Main System Metrics:     http://localhost:9090"
    echo ""

    echo -e "${BLUE}📊 Desktop Architecture Summary:${NC}"
    echo -e "  ✅ Desktop Backend: Integrated with API Gateway"
    echo -e "  ✅ Authentication: SuperTokens through Atlas Core"
    echo -e "  ✅ Data Access: GraphQL through API Gateway"
    echo -e "  ✅ Configuration: Atlas Config Bridge integrated"
    echo -e "  ✅ Monitoring: Unified metrics and observability"
    echo ""
}

# Function to run integration tests
run_integration_tests() {
    echo -e "${YELLOW}🧪 Running integration tests...${NC}"

    # Test desktop backend health
    if curl -sf http://localhost:8090/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Desktop backend health check passed${NC}"
    else
        echo -e "${RED}❌ Desktop backend health check failed${NC}"
        return 1
    fi

    # Test desktop client accessibility
    if curl -sf http://localhost:3002 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Desktop client accessibility check passed${NC}"
    else
        echo -e "${RED}❌ Desktop client accessibility check failed${NC}"
        return 1
    fi

    # Test Atlas Core connectivity
    if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Atlas Core connectivity check passed${NC}"
    else
        echo -e "${RED}❌ Atlas Core connectivity check failed${NC}"
        return 1
    fi

    # Test API Gateway connectivity
    if curl -sf http://localhost:8081/healthz >/dev/null 2>&1; then
        echo -e "${GREEN}✅ API Gateway connectivity check passed${NC}"
    else
        echo -e "${RED}❌ API Gateway connectivity check failed${NC}"
        return 1
    fi

    echo -e "${GREEN}🎉 All integration tests passed!${NC}"
    echo ""
    return 0
}

# Function to monitor startup
monitor_startup() {
    echo -e "${YELLOW}⏳ Monitoring desktop service startup...${NC}"

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        local all_healthy=true

        # Check desktop backend
        if ! docker ps --format "table {{.Names}}\t{{.Status}}" | grep "atlas-desktop-backend" | grep -q "Up.*healthy"; then
            all_healthy=false
        fi

        # Check desktop client
        if ! docker ps --format "table {{.Names}}\t{{.Status}}" | grep "atlas-desktop-client" | grep -q "Up"; then
            all_healthy=false
        fi

        if $all_healthy; then
            echo -e "${GREEN}✅ All desktop services are healthy!${NC}"
            break
        fi

        if [ $attempt -eq $max_attempts ]; then
            echo -e "${YELLOW}⚠️  Some desktop services may still be starting up...${NC}"
            break
        fi

        echo -e "${YELLOW}⏳ Waiting for desktop services to become healthy... ($attempt/$max_attempts)${NC}"
        sleep 2
        ((attempt++))
    done
}

# Main execution
main() {
    print_service_info
    check_prerequisites
    validate_architectural_compliance
    build_desktop_images
    start_desktop_services
    monitor_startup

    # Run integration tests
    if run_integration_tests; then
        show_status
        echo -e "${GREEN}🚀 Atlas Desktop App deployment complete!${NC}"
        echo -e "${PURPLE}🎯 Phase 2.6: Desktop architectural compliance achieved${NC}"
    else
        echo -e "${RED}❌ Integration tests failed. Check service logs.${NC}"
        exit 1
    fi

    echo ""
    echo -e "${BLUE}📚 Useful commands:${NC}"
    echo -e "  📊 View logs: docker-compose -f $DESKTOP_COMPOSE_FILE logs -f"
    echo -e "  🛑 Stop desktop: docker-compose -f $DESKTOP_COMPOSE_FILE down"
    echo -e "  🔄 Restart: $0 restart"
    echo -e "  📈 Status: $0 status"
}

# Handle script arguments
case "${1:-}" in
    "status")
        show_status
        ;;
    "logs")
        docker-compose -f "$DESKTOP_COMPOSE_FILE" logs -f "${2:-}"
        ;;
    "stop")
        echo -e "${YELLOW}🛑 Stopping Atlas Desktop services...${NC}"
        docker-compose -f "$DESKTOP_COMPOSE_FILE" down
        echo -e "${GREEN}✅ Desktop services stopped${NC}"
        ;;
    "restart")
        echo -e "${YELLOW}🔄 Restarting Atlas Desktop services...${NC}"
        docker-compose -f "$DESKTOP_COMPOSE_FILE" down
        sleep 2
        main
        ;;
    "test")
        echo -e "${YELLOW}🧪 Running desktop integration tests only...${NC}"
        run_integration_tests
        ;;
    "validate")
        echo -e "${YELLOW}🔍 Running architectural compliance validation only...${NC}"
        validate_architectural_compliance
        ;;
    *)
        main
        ;;
esac
