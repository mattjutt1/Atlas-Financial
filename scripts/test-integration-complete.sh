#!/bin/bash

# Atlas Financial Core Ledger MVP Integration Verification Script
# Generated on 2025-07-25

set -e

echo "
╔═══════════════════════════════════════════════════════════════════════════════╗
║                  Atlas Financial v1.1 Integration Test                       ║
║                      Core Ledger MVP Verification                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}[INFO]${NC} Testing Atlas Financial Core Ledger MVP Integration..."

# Test 1: Service Health Checks
echo -e "\n${BLUE}[TEST 1]${NC} Service Health Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

services=("atlas-postgres" "atlas-redis" "atlas-keycloak" "atlas-firefly" "atlas-hasura")
for service in "${services[@]}"; do
    if docker ps --format "{{.Names}}" | grep -q "^${service}$"; then
        echo -e "${GREEN}✓${NC} ${service} is running"
    else
        echo -e "${RED}✗${NC} ${service} is not running"
        exit 1
    fi
done

# Test 2: Database Connectivity
echo -e "\n${BLUE}[TEST 2]${NC} Database Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker exec atlas-postgres pg_isready -U atlas -d firefly > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} PostgreSQL firefly database is ready"
else
    echo -e "${RED}✗${NC} PostgreSQL firefly database is not ready"
    exit 1
fi

if docker exec atlas-postgres pg_isready -U atlas -d hasura > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} PostgreSQL hasura database is ready"
else
    echo -e "${RED}✗${NC} PostgreSQL hasura database is not ready"
    exit 1
fi

# Test 3: Firefly III API Health
echo -e "\n${BLUE}[TEST 3]${NC} Firefly III API Health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if curl -s http://localhost:8082/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Firefly III API is responding"
else
    echo -e "${RED}✗${NC} Firefly III API is not responding"
    exit 1
fi

# Test 4: Hasura GraphQL Engine Health
echo -e "\n${BLUE}[TEST 4]${NC} Hasura GraphQL Engine Health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if curl -s http://localhost:8081/healthz | grep -q "OK"; then
    echo -e "${GREEN}✓${NC} Hasura GraphQL Engine is healthy"
else
    echo -e "${RED}✗${NC} Hasura GraphQL Engine is not healthy"
    exit 1
fi

# Test 5: GraphQL Schema and Data Access
echo -e "\n${BLUE}[TEST 5]${NC} GraphQL Schema and Data Access"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test basic query
QUERY_RESULT=$(curl -s -X POST http://localhost:8081/v1/graphql \
    -H 'Content-Type: application/json' \
    -H 'X-Hasura-Admin-Secret: atlas_hasura_admin_secret' \
    -d '{"query": "query { account_types(limit: 3) { id type } }"}')

if echo "$QUERY_RESULT" | grep -q '"data"'; then
    echo -e "${GREEN}✓${NC} Basic GraphQL queries are working"
else
    echo -e "${RED}✗${NC} Basic GraphQL queries are failing"
    exit 1
fi

# Test relationship queries
RELATIONSHIP_QUERY=$(curl -s -X POST http://localhost:8081/v1/graphql \
    -H 'Content-Type: application/json' \
    -H 'X-Hasura-Admin-Secret: atlas_hasura_admin_secret' \
    -d '{"query": "query { accounts { id name account_type { type } user { email } } }"}')

if echo "$RELATIONSHIP_QUERY" | grep -q '"data"'; then
    echo -e "${GREEN}✓${NC} GraphQL relationship queries are working"
else
    echo -e "${RED}✗${NC} GraphQL relationship queries are failing"
    exit 1
fi

# Test 6: Data Integrity
echo -e "\n${BLUE}[TEST 6]${NC} Data Integrity Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check that Firefly III has created its core tables
TABLES_COUNT=$(docker exec atlas-postgres psql -U atlas -d firefly -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [ "$TABLES_COUNT" -gt 20 ]; then
    echo -e "${GREEN}✓${NC} Firefly III database schema is properly initialized ($TABLES_COUNT tables)"
else
    echo -e "${RED}✗${NC} Firefly III database schema appears incomplete ($TABLES_COUNT tables)"
    exit 1
fi

# Final Summary
echo -e "\n${GREEN}
╔═══════════════════════════════════════════════════════════════════════════════╗
║                            SUCCESS!                                           ║
║         Atlas Financial Core Ledger MVP Integration Complete                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝
${NC}"

echo -e "${BLUE}Integration Summary:${NC}"
echo "• PostgreSQL: Multiple databases (atlas_financial, firefly, hasura, keycloak)"
echo "• Firefly III: Personal finance manager with full database schema"
echo "• Hasura GraphQL: API gateway with tracked tables and relationships"
echo "• Keycloak: Identity provider (basic setup - realm configuration pending)"
echo "• Redis: Caching and session storage"

echo -e "\n${BLUE}Available Services:${NC}"
echo "• PostgreSQL:    localhost:5432"
echo "• Keycloak:      http://localhost:8080"
echo "• Hasura:        http://localhost:8081"
echo "• Firefly III:   http://localhost:8082"
echo "• Redis:         localhost:6379"

echo -e "\n${BLUE}GraphQL Endpoint:${NC}"
echo "• URL: http://localhost:8081/v1/graphql"
echo "• Admin Secret: atlas_hasura_admin_secret"
echo "• Console: http://localhost:8081/console"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Complete Keycloak Atlas realm configuration"
echo "2. Enable JWT authentication between Keycloak and Hasura"
echo "3. Set up role-based permissions in Hasura"
echo "4. Connect frontend to GraphQL API"

echo -e "\n${GREEN}[SUCCESS]${NC} Core Ledger MVP Integration Test Passed!"