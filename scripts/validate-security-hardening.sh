#!/bin/bash

# Atlas Financial Security Validation Script
# Validates Phase 1 security hardening implementation

set -e

echo "🔒 Atlas Financial Security Validation"
echo "======================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Success/failure counters
PASS=0
FAIL=0

check_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((FAIL++))
    fi
}

echo -e "\n${YELLOW}📁 1. Docker Compose Secrets Management${NC}"
echo "----------------------------------------"

# Check secrets directory exists
if [ -d "infrastructure/docker/config/secrets" ]; then
    check_result 0 "Secrets directory exists"
else
    check_result 1 "Secrets directory missing"
fi

# Check required secret files exist
SECRET_FILES=(
    "postgres_password.txt"
    "supertokens_api_key.txt"
    "hasura_admin_secret.txt"
    "firefly_app_key.txt"
    "jwt_secret_key.txt"
    "redis_password.txt"
    "postgres_connection_uri.txt"
    "hasura_database_url.txt"
    "hasura_metadata_url.txt"
    "rust_database_url.txt"
)

for file in "${SECRET_FILES[@]}"; do
    if [ -f "infrastructure/docker/config/secrets/$file" ]; then
        check_result 0 "Secret file exists: $file"
    else
        check_result 1 "Secret file missing: $file"
    fi
done

# Check secrets are not empty
if [ -f "infrastructure/docker/config/secrets/postgres_password.txt" ]; then
    if [ -s "infrastructure/docker/config/secrets/postgres_password.txt" ]; then
        check_result 0 "Postgres password is not empty"
    else
        check_result 1 "Postgres password is empty"
    fi
fi

echo -e "\n${YELLOW}🔐 2. .gitignore Security${NC}"
echo "------------------------"

# Check secrets are gitignored
if grep -q "infrastructure/docker/config/secrets/" .gitignore; then
    check_result 0 "Secrets directory is gitignored"
else
    check_result 1 "Secrets directory not gitignored"
fi

if grep -q "\*\*/secrets/\*.txt" .gitignore; then
    check_result 0 "Secret files pattern gitignored"
else
    check_result 1 "Secret files pattern not gitignored"
fi

echo -e "\n${YELLOW}🐳 3. Docker Compose Configuration${NC}"
echo "-----------------------------------"

# Check Docker Compose uses secrets
if grep -q "secrets:" infrastructure/docker/docker-compose.dev.yml; then
    check_result 0 "Docker Compose defines secrets"
else
    check_result 1 "Docker Compose missing secrets definition"
fi

# Check services use _FILE environment variables
if grep -q "_FILE:" infrastructure/docker/docker-compose.dev.yml; then
    check_result 0 "Services use _FILE environment variables"
else
    check_result 1 "Services missing _FILE environment variables"
fi

# Check no hardcoded passwords in docker-compose
if grep -q "atlas_dev_password" infrastructure/docker/docker-compose.dev.yml; then
    check_result 1 "Hardcoded passwords found in docker-compose"
else
    check_result 0 "No hardcoded passwords in docker-compose"
fi

echo -e "\n${YELLOW}🔒 4. Hasura Security Configuration${NC}"
echo "------------------------------------"

# Check Hasura dev mode disabled
if grep -q "HASURA_GRAPHQL_DEV_MODE.*false" infrastructure/docker/docker-compose.dev.yml; then
    check_result 0 "Hasura dev mode disabled"
else
    check_result 1 "Hasura dev mode not disabled"
fi

# Check Hasura console disabled
if grep -q "HASURA_GRAPHQL_ENABLE_CONSOLE.*false" infrastructure/docker/docker-compose.dev.yml; then
    check_result 0 "Hasura console disabled"
else
    check_result 1 "Hasura console not disabled"
fi

# Check allowlist enabled
if grep -q "HASURA_GRAPHQL_ENABLE_ALLOWLIST.*true" infrastructure/docker/docker-compose.dev.yml; then
    check_result 0 "Hasura allowlist enabled"
else
    check_result 1 "Hasura allowlist not enabled"
fi

# Check introspection disabled
if grep -q "HASURA_GRAPHQL_ENABLE_INTROSPECTION.*false" infrastructure/docker/docker-compose.dev.yml; then
    check_result 0 "Hasura introspection disabled"
else
    check_result 1 "Hasura introspection not disabled"
fi

# Check rate/complexity limits set
if grep -q "HASURA_GRAPHQL_QUERY_COMPLEXITY_LIMIT" infrastructure/docker/docker-compose.dev.yml; then
    check_result 0 "Hasura query complexity limit set"
else
    check_result 1 "Hasura query complexity limit missing"
fi

# Check no anonymous role
if grep -q "anonymous" infrastructure/docker/docker-compose.dev.yml; then
    check_result 1 "Anonymous role still present"
else
    check_result 0 "Anonymous role removed"
fi

echo -e "\n${YELLOW}🎯 5. SuperTokens JWT Configuration${NC}"
echo "-----------------------------------"

# Check JWT issuer is correct
if grep -q "http://supertokens:3567" infrastructure/docker/docker-compose.dev.yml; then
    check_result 0 "JWT issuer configured correctly"
else
    check_result 1 "JWT issuer misconfigured"
fi

# Check JWT audience is set
if grep -q "atlas-financial" infrastructure/docker/docker-compose.dev.yml; then
    check_result 0 "JWT audience configured"
else
    check_result 1 "JWT audience missing"
fi

echo -e "\n${YELLOW}📋 6. Hasura Allow List${NC}"
echo "------------------------"

# Check allow list file exists
if [ -f "services/hasura/metadata/allow_list.yaml" ]; then
    check_result 0 "Hasura allow list file exists"
else
    check_result 1 "Hasura allow list file missing"
fi

# Check allow list has required queries
if [ -f "services/hasura/metadata/allow_list.yaml" ]; then
    if grep -q "GetCurrentUser" services/hasura/metadata/allow_list.yaml; then
        check_result 0 "Allow list contains user queries"
    else
        check_result 1 "Allow list missing user queries"
    fi

    if grep -q "GetUserAccounts" services/hasura/metadata/allow_list.yaml; then
        check_result 0 "Allow list contains account queries"
    else
        check_result 1 "Allow list missing account queries"
    fi
fi

echo -e "\n${YELLOW}🔧 7. Hasura Config File Security${NC}"
echo "----------------------------------"

# Check config uses secrets
if grep -q "_file:" services/hasura/config.yaml; then
    check_result 0 "Hasura config uses secret files"
else
    check_result 1 "Hasura config missing secret files"
fi

# Check dev mode disabled in config
if grep -q "dev_mode: false" services/hasura/config.yaml; then
    check_result 0 "Dev mode disabled in config"
else
    check_result 1 "Dev mode not disabled in config"
fi

# Check console disabled in config
if grep -q "enable_console: false" services/hasura/config.yaml; then
    check_result 0 "Console disabled in config"
else
    check_result 1 "Console not disabled in config"
fi

echo -e "\n${YELLOW}📊 Summary${NC}"
echo "----------"
echo -e "${GREEN}✅ Passed: $PASS${NC}"
echo -e "${RED}❌ Failed: $FAIL${NC}"

if [ $FAIL -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All security checks passed! Atlas Financial is hardened.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Security hardening incomplete. Please address failed checks.${NC}"
    exit 1
fi
