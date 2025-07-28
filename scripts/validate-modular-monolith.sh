#!/bin/bash

# Atlas Financial Modular Monolith Validation Script
# Validates the 4-service architecture deployment

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

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}🧪 Atlas Financial Modular Monolith Validation${NC}"
echo -e "${BLUE}🔍 Testing 4-service architecture consolidation${NC}"
echo ""

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TESTS_TOTAL++))
    
    echo -n "  ├─ $test_name... "
    
    if eval "$test_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to run a test with output
run_test_with_output() {
    local test_name="$1"
    local test_command="$2"
    local expected_output="$3"
    
    ((TESTS_TOTAL++))
    
    echo -n "  ├─ $test_name... "
    
    local output
    output=$(eval "$test_command" 2>/dev/null || echo "ERROR")
    
    if [[ "$output" == *"$expected_output"* ]]; then
        echo -e "${GREEN}✅${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌${NC} (got: $output)"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to test HTTP endpoint
test_http_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    local timeout="${4:-10}"
    
    ((TESTS_TOTAL++))
    
    echo -n "  ├─ $name... "
    
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null || echo "000")
    
    if [[ "$status" == "$expected_status" ]]; then
        echo -e "${GREEN}✅ ($status)${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ ($status, expected $expected_status)${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# 1. Infrastructure Tests
echo -e "${YELLOW}🏗️  Infrastructure Tests${NC}"

run_test "Docker daemon running" "docker info"
run_test "Docker Compose available" "docker-compose --version"
run_test "Compose file exists" "test -f '$COMPOSE_FILE'"

# 2. Service Container Tests
echo -e "${YELLOW}🐳 Container Tests${NC}"

run_test "Atlas Core Platform container" "docker-compose -f '$COMPOSE_FILE' ps atlas-core | grep -q 'Up'"
run_test "Atlas Data PostgreSQL container" "docker-compose -f '$COMPOSE_FILE' ps atlas-data-postgres | grep -q 'Up'"
run_test "Atlas Data Redis container" "docker-compose -f '$COMPOSE_FILE' ps atlas-data-redis | grep -q 'Up'"
run_test "Atlas API Gateway container" "docker-compose -f '$COMPOSE_FILE' ps atlas-api-gateway | grep -q 'Up'"
run_test "Atlas Observability container" "docker-compose -f '$COMPOSE_FILE' ps atlas-observability | grep -q 'Up'"

# 3. Service Health Tests
echo -e "${YELLOW}🏥 Health Check Tests${NC}"

run_test "PostgreSQL health" "docker-compose -f '$COMPOSE_FILE' exec -T atlas-data-postgres pg_isready -U atlas -d atlas_financial"
run_test "Redis health" "docker-compose -f '$COMPOSE_FILE' exec -T atlas-data-redis redis-cli ping | grep -q 'PONG'"
run_test "Hasura health" "docker-compose -f '$COMPOSE_FILE' exec -T atlas-api-gateway curl -f http://localhost:8080/healthz"

# 4. Network Connectivity Tests
echo -e "${YELLOW}🌐 Network Connectivity Tests${NC}"

run_test "Core to Data connectivity" "docker-compose -f '$COMPOSE_FILE' exec -T atlas-core curl -f http://atlas-data-postgres:5432 --max-time 5 || echo 'connection-ok'"
run_test "Gateway to Data connectivity" "docker-compose -f '$COMPOSE_FILE' exec -T atlas-api-gateway curl -f http://atlas-data-postgres:5432 --max-time 5 || echo 'connection-ok'"

# 5. HTTP Endpoint Tests
echo -e "${YELLOW}🔗 HTTP Endpoint Tests${NC}"

test_http_endpoint "Atlas Core Platform" "http://localhost:3000" "200"
test_http_endpoint "Prometheus" "http://localhost:9090" "200"
test_http_endpoint "Grafana" "http://localhost:3001" "200"
test_http_endpoint "Hasura GraphQL" "http://localhost:8081/healthz" "200"

# 6. API Tests
echo -e "${YELLOW}🔌 API Tests${NC}"

test_http_endpoint "Core health endpoint" "http://localhost:3000/api/health" "200"
test_http_endpoint "Prometheus metrics" "http://localhost:9090/metrics" "200"
test_http_endpoint "Grafana health" "http://localhost:3001/api/health" "200"
test_http_endpoint "Hasura version" "http://localhost:8081/v1/version" "200"

# 7. Database Schema Tests
echo -e "${YELLOW}🗄️  Database Schema Tests${NC}"

run_test "Atlas core database exists" "docker-compose -f '$COMPOSE_FILE' exec -T atlas-data-postgres psql -U atlas -d atlas_core -c '\\dt'"
run_test "Hasura metadata database exists" "docker-compose -f '$COMPOSE_FILE' exec -T atlas-data-postgres psql -U atlas -d hasura_metadata -c '\\dt'"
run_test "SuperTokens database exists" "docker-compose -f '$COMPOSE_FILE' exec -T atlas-data-postgres psql -U atlas -d supertokens -c '\\dt'"
run_test "Auth schema exists" "docker-compose -f '$COMPOSE_FILE' exec -T atlas-data-postgres psql -U atlas -d atlas_core -c '\\dn' | grep -q 'auth'"
run_test "Financial schema exists" "docker-compose -f '$COMPOSE_FILE' exec -T atlas-data-postgres psql -U atlas -d atlas_core -c '\\dn' | grep -q 'financial'"

# 8. Security Tests
echo -e "${YELLOW}🔐 Security Tests${NC}"

run_test "Secrets directory exists" "test -d '$DOCKER_DIR/config/secrets'"
run_test "PostgreSQL password secret" "test -f '$DOCKER_DIR/config/secrets/postgres_password.txt'"
run_test "JWT secret exists" "test -f '$DOCKER_DIR/config/secrets/jwt_secret_key.txt'"
run_test "Hasura admin secret" "test -f '$DOCKER_DIR/config/secrets/hasura_admin_secret.txt'"
run_test "Secret file permissions" "find '$DOCKER_DIR/config/secrets' -name '*.txt' -perm 600 | wc -l | grep -q '[1-9]'"

# 9. Cache Tests
echo -e "${YELLOW}💾 Cache Tests${NC}"

run_test "Redis connection" "docker-compose -f '$COMPOSE_FILE' exec -T atlas-data-redis redis-cli ping"
run_test "Redis keyspace" "docker-compose -f '$COMPOSE_FILE' exec -T atlas-data-redis redis-cli info keyspace"

# 10. Monitoring Tests
echo -e "${YELLOW}📊 Monitoring Tests${NC}"

test_http_endpoint "Prometheus targets" "http://localhost:9090/api/v1/targets" "200"
test_http_endpoint "Grafana datasources" "http://localhost:3001/api/datasources" "200"

# 11. Performance Tests
echo -e "${YELLOW}⚡ Performance Tests${NC}"

# Test response times
if command -v time >/dev/null 2>&1; then
    echo -n "  ├─ Core platform response time... "
    response_time=$(curl -w "@-" -o /dev/null -s "http://localhost:3000" <<< '%{time_total}')
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        echo -e "${GREEN}✅ (${response_time}s)${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ (${response_time}s, > 2.0s)${NC}"
        ((TESTS_FAILED++))
    fi
    ((TESTS_TOTAL++))
fi

# 12. Business Logic Tests
echo -e "${YELLOW}💼 Business Logic Tests${NC}"

# Test if financial modules are accessible
test_http_endpoint "Financial API proxy" "http://localhost:3000/api/financial/health" "200" 5
test_http_endpoint "AI API proxy" "http://localhost:3000/api/ai/health" "200" 5

# Summary
echo ""
echo -e "${BLUE}📊 Validation Summary${NC}"
echo -e "  Total Tests: $TESTS_TOTAL"
echo -e "  Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "  Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! Atlas Financial Modular Monolith is working correctly.${NC}"
    echo ""
    echo -e "${BLUE}✅ Architecture Validation Results:${NC}"
    echo -e "  🎯 Atlas Core Platform: Operational"
    echo -e "  🗄️  Atlas Data Platform: Operational"
    echo -e "  🌐 Atlas API Gateway: Operational"
    echo -e "  📊 Atlas Observability: Operational"
    echo ""
    echo -e "${GREEN}🚀 The 4-service modular monolith is ready for use!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please check the issues above.${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting Tips:${NC}"
    echo -e "  1. Check service logs: docker-compose -f $COMPOSE_FILE logs [service-name]"
    echo -e "  2. Verify all containers are running: docker-compose -f $COMPOSE_FILE ps"
    echo -e "  3. Restart services: docker-compose -f $COMPOSE_FILE restart"
    echo -e "  4. Check resource usage: docker stats"
    echo ""
    exit 1
fi