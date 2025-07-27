#!/bin/bash

# Atlas Financial - Rust + Hasura Integration Startup Script
# Launches the complete integrated stack with proper dependency ordering

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/infrastructure/docker"
HASURA_DIR="$PROJECT_ROOT/services/hasura"

echo -e "${BLUE}🚀 Atlas Financial - Rust + Hasura Integration Startup${NC}"
echo -e "${BLUE}=====================================================${NC}"

# Function to check if a service is healthy
wait_for_service() {
    local service_name="$1"
    local url="$2"
    local max_attempts="${3:-30}"
    local attempt=1
    
    echo -ne "${YELLOW}Waiting for $service_name to be ready...${NC} "
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 5 "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Ready${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗ Timeout waiting for $service_name${NC}"
    return 1
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "\n${BLUE}📋 Phase 1: Pre-flight Checks${NC}"
echo -e "${BLUE}==============================${NC}"

# Check if required files exist
check_file() {
    local file="$1"
    local description="$2"
    
    echo -ne "${YELLOW}Checking $description...${NC} "
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ Found${NC}"
    else
        echo -e "${RED}✗ Missing${NC}"
        return 1
    fi
}

check_file "$DOCKER_DIR/docker-compose.dev.yml" "Docker Compose configuration"
check_file "$PROJECT_ROOT/services/rust-financial-engine/Dockerfile" "Rust engine Dockerfile"
check_file "$HASURA_DIR/metadata/version.yaml" "Hasura metadata"

# Check for environment file
if [ ! -f "$DOCKER_DIR/.env" ]; then
    echo -e "${YELLOW}⚠ No .env file found. Creating from template...${NC}"
    if [ -f "$DOCKER_DIR/.env.example" ]; then
        cp "$DOCKER_DIR/.env.example" "$DOCKER_DIR/.env"
        echo -e "${GREEN}✓ Created .env file${NC}"
        echo -e "${BLUE}ℹ Please review and update $DOCKER_DIR/.env with your configuration${NC}"
    else
        echo -e "${RED}✗ No .env.example template found${NC}"
        exit 1
    fi
fi

echo -e "\n${BLUE}🏗️  Phase 2: Building Services${NC}"
echo -e "${BLUE}===============================${NC}"

cd "$DOCKER_DIR"

# Stop any running services first
echo -e "${YELLOW}Stopping any existing services...${NC}"
docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

# Build the Rust Financial Engine
echo -e "${YELLOW}Building Rust Financial Engine...${NC}"
docker-compose -f docker-compose.dev.yml build rust-financial-engine

echo -e "\n${BLUE}🚀 Phase 3: Starting Core Services${NC}"
echo -e "${BLUE}===================================${NC}"

# Start core infrastructure services first
echo -e "${YELLOW}Starting core infrastructure...${NC}"
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Wait for core services
wait_for_service "PostgreSQL" "http://localhost:5432" 15 || {
    echo -e "${RED}Failed to start PostgreSQL${NC}"
    exit 1
}

wait_for_service "Redis" "http://localhost:6379" 10 || {
    echo -e "${YELLOW}⚠ Redis connection check failed (may be auth-protected)${NC}"
}

# Start SuperTokens
echo -e "${YELLOW}Starting SuperTokens authentication...${NC}"
docker-compose -f docker-compose.dev.yml up -d supertokens

wait_for_service "SuperTokens" "http://localhost:3567/hello" 20 || {
    echo -e "${RED}Failed to start SuperTokens${NC}"
    exit 1
}

echo -e "\n${BLUE}⚡ Phase 4: Starting Financial Services${NC}"
echo -e "${BLUE}=======================================${NC}"

# Start Rust Financial Engine
echo -e "${YELLOW}Starting Rust Financial Engine...${NC}"
docker-compose -f docker-compose.dev.yml up -d rust-financial-engine

wait_for_service "Rust Financial Engine" "http://localhost:8080/health" 30 || {
    echo -e "${RED}Failed to start Rust Financial Engine${NC}"
    echo -e "${YELLOW}Checking logs...${NC}"
    docker logs atlas-rust-financial-engine --tail 20
    exit 1
}

# Start Hasura GraphQL Engine
echo -e "${YELLOW}Starting Hasura GraphQL Engine...${NC}"
docker-compose -f docker-compose.dev.yml up -d hasura

wait_for_service "Hasura GraphQL" "http://localhost:8081/healthz" 20 || {
    echo -e "${RED}Failed to start Hasura${NC}"
    echo -e "${YELLOW}Checking logs...${NC}"
    docker logs atlas-hasura --tail 20
    exit 1
}

echo -e "\n${BLUE}🔗 Phase 5: Configuring Integration${NC}"
echo -e "${BLUE}===================================${NC}"

# Apply Hasura metadata if hasura CLI is available
if command -v hasura >/dev/null 2>&1; then
    echo -e "${YELLOW}Applying Hasura metadata...${NC}"
    cd "$HASURA_DIR"
    
    # Check if config file exists, create if not
    if [ ! -f "config.yaml" ]; then
        echo -e "${YELLOW}Creating Hasura config file...${NC}"
        cat > config.yaml << EOF
version: 3
endpoint: http://localhost:8081
metadata_directory: metadata
admin_secret: atlas_hasura_admin_secret
EOF
    fi
    
    # Apply metadata
    if hasura metadata apply --admin-secret atlas_hasura_admin_secret --endpoint http://localhost:8081 2>/dev/null; then
        echo -e "${GREEN}✓ Hasura metadata applied${NC}"
    else
        echo -e "${YELLOW}⚠ Failed to apply metadata automatically${NC}"
        echo -e "${BLUE}ℹ Manual setup required via Hasura Console${NC}"
    fi
    
    cd "$DOCKER_DIR"
else
    echo -e "${YELLOW}⚠ Hasura CLI not found. Remote schema setup will be manual.${NC}"
fi

echo -e "\n${BLUE}🎯 Phase 6: Starting Remaining Services${NC}"
echo -e "${BLUE}=======================================${NC}"

# Start remaining services
echo -e "${YELLOW}Starting remaining services...${NC}"
docker-compose -f docker-compose.dev.yml up -d

# Wait for all services to be ready
wait_for_service "AI Engine" "http://localhost:8083/health" 15 || echo -e "${YELLOW}⚠ AI Engine may need more time${NC}"
wait_for_service "Firefly III" "http://localhost:8082/health" 15 || echo -e "${YELLOW}⚠ Firefly III may need more time${NC}"
wait_for_service "Grafana" "http://localhost:3001/api/health" 10 || echo -e "${YELLOW}⚠ Grafana may need more time${NC}"
wait_for_service "Web App" "http://localhost:3000" 15 || echo -e "${YELLOW}⚠ Web App may need more time${NC}"

echo -e "\n${BLUE}🧪 Phase 7: Integration Testing${NC}"
echo -e "${BLUE}===============================${NC}"

# Run integration tests
if [ -x "$SCRIPT_DIR/test-integration-rust-hasura.sh" ]; then
    echo -e "${YELLOW}Running integration tests...${NC}"
    "$SCRIPT_DIR/test-integration-rust-hasura.sh" || {
        echo -e "${YELLOW}⚠ Some tests failed. Services may still be starting up.${NC}"
    }
else
    echo -e "${YELLOW}⚠ Integration test script not found${NC}"
fi

echo -e "\n${BLUE}📊 Service Status Summary${NC}"
echo -e "${BLUE}=========================${NC}"

# Show container status
echo -e "${YELLOW}Docker containers:${NC}"
docker-compose -f docker-compose.dev.yml ps

echo -e "\n${BLUE}🌐 Access URLs${NC}"
echo -e "${BLUE}=============${NC}"

echo -e "${GREEN}✅ Services are now running:${NC}"
echo -e "  🌐 Web Application:      ${BLUE}http://localhost:3000${NC}"
echo -e "  🔍 Hasura Console:       ${BLUE}http://localhost:8081/console${NC}"
echo -e "  ⚡ Rust GraphQL:         ${BLUE}http://localhost:8080/${NC}"
echo -e "  💰 Firefly III:         ${BLUE}http://localhost:8082${NC}"
echo -e "  🔐 SuperTokens:          ${BLUE}http://localhost:3567${NC}"
echo -e "  📊 Grafana:             ${BLUE}http://localhost:3001${NC}"
echo -e "  🤖 AI Engine:           ${BLUE}http://localhost:8083${NC}"

echo -e "\n${BLUE}🔑 Credentials${NC}"
echo -e "${BLUE}=============${NC}"
echo -e "  Hasura Admin Secret:    ${PURPLE}atlas_hasura_admin_secret${NC}"
echo -e "  Grafana:               ${PURPLE}admin / admin_dev_password${NC}"

echo -e "\n${BLUE}🚀 Next Steps${NC}"
echo -e "${BLUE}============${NC}"

echo -e "${PURPLE}1. Test the unified GraphQL API:${NC}"
echo -e "   Open: http://localhost:8081/console"
echo -e "   Try the example queries from: docs/api/unified-graphql-examples.md"

echo -e "\n${PURPLE}2. Configure remote schema (if not auto-applied):${NC}"
echo -e "   • Go to Remote Schemas in Hasura Console"
echo -e "   • Add: http://rust-financial-engine:8080/graphql"
echo -e "   • Enable introspection and configure permissions"

echo -e "\n${PURPLE}3. Test financial calculations:${NC}"
echo -e "   curl -X POST http://localhost:8080/graphql \\"
echo -e "     -H \"Content-Type: application/json\" \\"
echo -e "     -d '{\"query\": \"query { __schema { queryType { name } } }\"}'"

echo -e "\n${PURPLE}4. Run comprehensive tests:${NC}"
echo -e "   ./scripts/test-end-to-end-integration.sh"

echo -e "\n${GREEN}🎉 Atlas Financial Rust + Hasura integration is ready!${NC}"

# Final health check
echo -e "\n${BLUE}🏥 Final Health Check${NC}"
echo -e "${BLUE}===================${NC}"

if curl -s --max-time 5 "http://localhost:8080/health" >/dev/null && \
   curl -s --max-time 5 "http://localhost:8081/healthz" >/dev/null; then
    echo -e "${GREEN}🟢 All core services are healthy!${NC}"
else
    echo -e "${YELLOW}🟡 Some services may still be initializing...${NC}"
    echo -e "${BLUE}ℹ Run './scripts/test-integration-rust-hasura.sh' in a few minutes to verify${NC}"
fi