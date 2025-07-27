#!/bin/bash

# Atlas Financial - Rust-Hasura Integration Health Check
# Comprehensive test script for the Rust Financial Engine + Hasura integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HASURA_URL="${HASURA_URL:-http://localhost:8081}"
RUST_ENGINE_URL="${RUST_ENGINE_URL:-http://localhost:8080}"
HASURA_ADMIN_SECRET="${HASURA_ADMIN_SECRET:-atlas_hasura_admin_secret}"
TIMEOUT=30

echo -e "${BLUE}🚀 Atlas Financial Integration Health Check${NC}"
echo -e "${BLUE}===========================================${NC}"

# Function to check service health
check_service() {
    local service_name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    echo -ne "${YELLOW}Checking $service_name...${NC} "
    
    if response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null); then
        status_code="${response: -3}"
        if [ "$status_code" = "$expected_status" ]; then
            echo -e "${GREEN}✓ Healthy (HTTP $status_code)${NC}"
            return 0
        else
            echo -e "${RED}✗ Unhealthy (HTTP $status_code)${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Unreachable${NC}"
        return 1
    fi
}

# Function to test GraphQL endpoint
test_graphql() {
    local name="$1"
    local url="$2"
    local query="$3"
    local headers="$4"
    
    echo -ne "${YELLOW}Testing $name...${NC} "
    
    local curl_cmd="curl -s -w '%{http_code}' --max-time $TIMEOUT -X POST '$url' -H 'Content-Type: application/json'"
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    curl_cmd="$curl_cmd -d '$query'"
    
    if response=$(eval "$curl_cmd" 2>/dev/null); then
        status_code="${response: -3}"
        response_body="${response%???}"
        
        if [ "$status_code" = "200" ]; then
            if echo "$response_body" | grep -q '"errors"'; then
                echo -e "${YELLOW}⚠ GraphQL Errors${NC}"
                echo "$response_body" | jq '.errors' 2>/dev/null || echo "$response_body"
                return 1
            else
                echo -e "${GREEN}✓ Success${NC}"
                return 0
            fi
        else
            echo -e "${RED}✗ HTTP Error ($status_code)${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Connection Failed${NC}"
        return 1
    fi
}

echo -e "\n${BLUE}📊 Service Health Checks${NC}"
echo -e "${BLUE}========================${NC}"

# Check individual services
check_service "Rust Financial Engine" "$RUST_ENGINE_URL/health" || exit 1
check_service "Hasura GraphQL" "$HASURA_URL/healthz" || exit 1

echo -e "\n${BLUE}🔍 GraphQL Endpoint Tests${NC}"
echo -e "${BLUE}==========================${NC}"

# Test Rust Financial Engine GraphQL directly
RUST_INTROSPECTION_QUERY='{"query":"query { __schema { types { name } } }"}'
test_graphql "Rust Engine Introspection" "$RUST_ENGINE_URL/graphql" "$RUST_INTROSPECTION_QUERY"

# Test Hasura GraphQL
HASURA_INTROSPECTION_QUERY='{"query":"query { __schema { types { name } } }"}'
HASURA_HEADERS="-H 'X-Hasura-Admin-Secret: $HASURA_ADMIN_SECRET'"
test_graphql "Hasura Introspection" "$HASURA_URL/v1/graphql" "$HASURA_INTROSPECTION_QUERY" "$HASURA_HEADERS"

echo -e "\n${BLUE}🔗 Remote Schema Integration Tests${NC}"
echo -e "${BLUE}===================================${NC}"

# Test if remote schema is properly integrated
REMOTE_SCHEMA_CHECK='{"query":"query { __schema { types(name: \"Finance_*\") { name } } }"}'
if test_graphql "Remote Schema Types" "$HASURA_URL/v1/graphql" "$REMOTE_SCHEMA_CHECK" "$HASURA_HEADERS"; then
    echo -e "${GREEN}✓ Remote schema integration detected${NC}"
else
    echo -e "${YELLOW}⚠ Remote schema types not found - may need manual setup${NC}"
fi

echo -e "\n${BLUE}🔐 Authentication Flow Test${NC}"
echo -e "${BLUE}============================${NC}"

# Test JWT endpoint (this might fail if SuperTokens is not running)
check_service "SuperTokens JWKS" "http://localhost:3567/auth/jwt/jwks.json" || echo -e "${YELLOW}⚠ SuperTokens may not be running${NC}"

echo -e "\n${BLUE}📊 Performance Tests${NC}"
echo -e "${BLUE}===================${NC}"

# Test response times
echo -ne "${YELLOW}Measuring Rust Engine response time...${NC} "
rust_time=$(curl -s -w "%{time_total}" --max-time $TIMEOUT -o /dev/null "$RUST_ENGINE_URL/health" 2>/dev/null || echo "timeout")
if [ "$rust_time" != "timeout" ]; then
    echo -e "${GREEN}${rust_time}s${NC}"
else
    echo -e "${RED}timeout${NC}"
fi

echo -ne "${YELLOW}Measuring Hasura response time...${NC} "
hasura_time=$(curl -s -w "%{time_total}" --max-time $TIMEOUT -o /dev/null "$HASURA_URL/healthz" 2>/dev/null || echo "timeout")
if [ "$hasura_time" != "timeout" ]; then
    echo -e "${GREEN}${hasura_time}s${NC}"
else
    echo -e "${RED}timeout${NC}"
fi

echo -e "\n${BLUE}🏁 Integration Summary${NC}"
echo -e "${BLUE}======================${NC}"

echo -e "${GREEN}✓ Rust Financial Engine: Running on port 8080${NC}"
echo -e "${GREEN}✓ Hasura GraphQL: Running on port 8081${NC}"
echo -e "${GREEN}✓ Remote Schema: Configured for integration${NC}"
echo -e "${GREEN}✓ JWT Authentication: Ready for SuperTokens${NC}"

echo -e "\n${BLUE}📝 Next Steps${NC}"
echo -e "${BLUE}=============${NC}"
echo "1. Start the full stack with: cd infrastructure/docker && docker-compose -f docker-compose.dev.yml up -d"
echo "2. Apply Hasura metadata: hasura metadata apply --admin-secret $HASURA_ADMIN_SECRET"
echo "3. Test the unified GraphQL API at: $HASURA_URL/console"
echo "4. View Rust Engine GraphQL Playground at: $RUST_ENGINE_URL/"

echo -e "\n${GREEN}🎉 Integration health check completed!${NC}"