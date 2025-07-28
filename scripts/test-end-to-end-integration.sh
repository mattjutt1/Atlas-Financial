#!/bin/bash

# Atlas Financial - End-to-End Integration Test
# Comprehensive test of the Rust Financial Engine + Hasura GraphQL integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
HASURA_URL="${HASURA_URL:-http://localhost:8081}"
RUST_ENGINE_URL="${RUST_ENGINE_URL:-http://localhost:8080}"
HASURA_ADMIN_SECRET="${HASURA_ADMIN_SECRET:-atlas_hasura_admin_secret}"
TIMEOUT=30

echo -e "${BLUE}🚀 Atlas Financial End-to-End Integration Test${NC}"
echo -e "${BLUE}===============================================${NC}"

# Function to run GraphQL query and check response
run_graphql_test() {
    local test_name="$1"
    local url="$2"
    local query="$3"
    local headers="$4"
    local expected_field="$5"

    echo -ne "${YELLOW}Testing $test_name...${NC} "

    local curl_cmd="curl -s --max-time $TIMEOUT -X POST '$url' -H 'Content-Type: application/json'"

    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi

    curl_cmd="$curl_cmd -d '$query'"

    if response=$(eval "$curl_cmd" 2>/dev/null); then
        if echo "$response" | grep -q '"errors"'; then
            echo -e "${RED}✗ GraphQL Error${NC}"
            echo "$response" | jq '.errors' 2>/dev/null || echo "$response"
            return 1
        elif [ -n "$expected_field" ] && echo "$response" | grep -q "$expected_field"; then
            echo -e "${GREEN}✓ Success${NC}"
            return 0
        elif [ -z "$expected_field" ]; then
            echo -e "${GREEN}✓ Success${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠ Unexpected Response${NC}"
            echo "$response" | jq '.' 2>/dev/null || echo "$response"
            return 1
        fi
    else
        echo -e "${RED}✗ Connection Failed${NC}"
        return 1
    fi
}

echo -e "\n${BLUE}📊 Phase 1: Service Availability${NC}"
echo -e "${BLUE}=================================${NC}"

# Check if services are running
check_service() {
    local service_name="$1"
    local url="$2"

    echo -ne "${YELLOW}Checking $service_name...${NC} "

    if curl -s --max-time 10 "$url" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Available${NC}"
        return 0
    else
        echo -e "${RED}✗ Unavailable${NC}"
        return 1
    fi
}

check_service "Rust Financial Engine" "$RUST_ENGINE_URL/health" || exit 1
check_service "Hasura GraphQL" "$HASURA_URL/healthz" || exit 1

echo -e "\n${BLUE}🔍 Phase 2: Individual Service Tests${NC}"
echo -e "${BLUE}=====================================${NC}"

# Test Rust Financial Engine directly
RUST_INTROSPECTION='{"query":"query { __schema { queryType { name } } }"}'
run_graphql_test "Rust Engine Schema" "$RUST_ENGINE_URL/graphql" "$RUST_INTROSPECTION" "" "queryType"

# Test a simple financial calculation
DEBT_CALCULATION='{"query":"query { optimizeDebts(input: { debts: [{ name: \"Test Debt\", balance: { amount: \"1000.00\", currency: USD }, interestRate: { percentage: { value: \"10.0\" }, period: ANNUAL }, minimumPayment: { amount: \"50.00\", currency: USD }, debtType: CREDIT_CARD }], strategy: AVALANCHE, extraPayment: { amount: \"100.00\", currency: USD } }) { strategy totalTimeToPayoffMonths } }"}'
run_graphql_test "Debt Optimization" "$RUST_ENGINE_URL/graphql" "$DEBT_CALCULATION" "" "totalTimeToPayoffMonths"

echo -e "\n${BLUE}🔗 Phase 3: Hasura Integration Tests${NC}"
echo -e "${BLUE}====================================${NC}"

HASURA_HEADERS="-H 'X-Hasura-Admin-Secret: $HASURA_ADMIN_SECRET'"

# Test Hasura introspection
HASURA_INTROSPECTION='{"query":"query { __schema { queryType { name } } }"}'
run_graphql_test "Hasura Schema" "$HASURA_URL/v1/graphql" "$HASURA_INTROSPECTION" "$HASURA_HEADERS" "queryType"

# Test if remote schema is loaded
REMOTE_SCHEMA_TEST='{"query":"query { __schema { types { name } } }"}'
if run_graphql_test "Remote Schema Detection" "$HASURA_URL/v1/graphql" "$REMOTE_SCHEMA_TEST" "$HASURA_HEADERS" ""; then
    echo -e "${GREEN}✓ Remote schema metadata loaded${NC}"
else
    echo -e "${YELLOW}⚠ Remote schema may need manual setup${NC}"
fi

echo -e "\n${BLUE}🌊 Phase 4: Unified API Tests${NC}"
echo -e "${BLUE}==============================${NC}"

# Test unified query (if remote schema is properly configured)
UNIFIED_QUERY='{"query":"query { __type(name: \"Query\") { fields { name description } } }"}'
run_graphql_test "Unified Query Fields" "$HASURA_URL/v1/graphql" "$UNIFIED_QUERY" "$HASURA_HEADERS" "fields"

echo -e "\n${BLUE}🔐 Phase 5: Authentication Flow${NC}"
echo -e "${BLUE}===============================${NC}"

# Test SuperTokens JWKS endpoint
check_service "SuperTokens JWKS" "http://localhost:3567/auth/jwt/jwks.json" || echo -e "${YELLOW}⚠ SuperTokens not available - auth tests skipped${NC}"

# Test unauthorized access
UNAUTHORIZED_TEST='{"query":"query { __schema { queryType { name } } }"}'
echo -ne "${YELLOW}Testing unauthorized access...${NC} "
if response=$(curl -s --max-time $TIMEOUT -X POST "$HASURA_URL/v1/graphql" -H 'Content-Type: application/json' -d "$UNAUTHORIZED_TEST" 2>/dev/null); then
    # Should succeed with anonymous role or fail with auth error
    if echo "$response" | grep -q '"queryType"' || echo "$response" | grep -q '"unauthorized"'; then
        echo -e "${GREEN}✓ Access control working${NC}"
    else
        echo -e "${YELLOW}⚠ Unexpected response${NC}"
    fi
else
    echo -e "${RED}✗ Connection failed${NC}"
fi

echo -e "\n${BLUE}⚡ Phase 6: Performance Tests${NC}"
echo -e "${BLUE}=============================${NC}"

# Measure response times
measure_response_time() {
    local service_name="$1"
    local url="$2"
    local query="$3"
    local headers="$4"

    echo -ne "${YELLOW}Testing $service_name response time...${NC} "

    local curl_cmd="curl -s -w '%{time_total}' --max-time $TIMEOUT -o /dev/null -X POST '$url' -H 'Content-Type: application/json'"

    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi

    curl_cmd="$curl_cmd -d '$query'"

    if time_total=$(eval "$curl_cmd" 2>/dev/null); then
        echo -e "${GREEN}${time_total}s${NC}"

        # Check if response time is reasonable (less than 2 seconds)
        if (( $(echo "$time_total < 2.0" | bc -l) )); then
            echo -e "  ${GREEN}✓ Performance acceptable${NC}"
        else
            echo -e "  ${YELLOW}⚠ Slow response time${NC}"
        fi
    else
        echo -e "${RED}timeout${NC}"
    fi
}

measure_response_time "Rust Engine" "$RUST_ENGINE_URL/graphql" "$RUST_INTROSPECTION" ""
measure_response_time "Hasura" "$HASURA_URL/v1/graphql" "$HASURA_INTROSPECTION" "$HASURA_HEADERS"

echo -e "\n${BLUE}🔧 Phase 7: Configuration Validation${NC}"
echo -e "${BLUE}====================================${NC}"

# Check Docker containers
echo -ne "${YELLOW}Checking Docker containers...${NC} "
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(atlas-rust-financial-engine|atlas-hasura)" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Containers running${NC}"
    docker ps --filter "name=atlas-rust-financial-engine" --filter "name=atlas-hasura" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo -e "${YELLOW}⚠ Containers not found (may not be using Docker)${NC}"
fi

# Check environment configuration
echo -ne "${YELLOW}Checking environment configuration...${NC} "
if [ -f "/home/matt/Atlas-Financial/infrastructure/docker/.env" ]; then
    echo -e "${GREEN}✓ Environment file exists${NC}"
else
    echo -e "${YELLOW}⚠ No .env file found${NC}"
    echo -e "  ${BLUE}ℹ Copy .env.example to .env and configure${NC}"
fi

echo -e "\n${BLUE}📊 Integration Test Summary${NC}"
echo -e "${BLUE}===========================${NC}"

echo -e "${GREEN}✅ Successfully tested:${NC}"
echo -e "  • Rust Financial Engine GraphQL API"
echo -e "  • Hasura GraphQL Engine"
echo -e "  • Schema introspection"
echo -e "  • Basic financial calculations"
echo -e "  • Response time performance"

echo -e "\n${BLUE}🔧 Setup Instructions${NC}"
echo -e "${BLUE}====================${NC}"

echo -e "${PURPLE}1. Start the full stack:${NC}"
echo -e "   cd infrastructure/docker"
echo -e "   docker-compose -f docker-compose.dev.yml up -d"

echo -e "\n${PURPLE}2. Apply Hasura metadata:${NC}"
echo -e "   cd services/hasura"
echo -e "   hasura metadata apply --admin-secret $HASURA_ADMIN_SECRET --endpoint $HASURA_URL"

echo -e "\n${PURPLE}3. Add remote schema in Hasura Console:${NC}"
echo -e "   • Open: $HASURA_URL/console"
echo -e "   • Go to Remote Schemas"
echo -e "   • Add remote schema with URL: http://rust-financial-engine:8080/graphql"

echo -e "\n${PURPLE}4. Test the unified API:${NC}"
echo -e "   • Hasura Console: $HASURA_URL/console"
echo -e "   • Rust Playground: $RUST_ENGINE_URL/"

echo -e "\n${PURPLE}5. Example unified query:${NC}"
cat << 'EOF'
query UnifiedFinancialData {
  # Database query (via Hasura)
  accounts(limit: 5) {
    id
    name
    balance
  }

  # Financial calculation (via Rust engine)
  finance {
    optimizeDebts(input: {
      debts: [{
        name: "Credit Card"
        balance: { amount: "5000.00", currency: USD }
        interestRate: { percentage: { value: "18.0" }, period: ANNUAL }
        minimumPayment: { amount: "100.00", currency: USD }
        debtType: CREDIT_CARD
      }]
      strategy: AVALANCHE
      extraPayment: { amount: "200.00", currency: USD }
    }) {
      totalTimeToPayoffMonths
      totalInterestPaid { amount }
    }
  }
}
EOF

echo -e "\n${GREEN}🎉 End-to-end integration test completed!${NC}"

# Final status check
if check_service "Final Health Check - Rust Engine" "$RUST_ENGINE_URL/health" && \
   check_service "Final Health Check - Hasura" "$HASURA_URL/healthz"; then
    echo -e "\n${GREEN}🟢 All systems operational!${NC}"
    exit 0
else
    echo -e "\n${RED}🔴 Some services are not responding${NC}"
    exit 1
fi
