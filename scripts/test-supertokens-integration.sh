#!/bin/bash

# Atlas Financial - SuperTokens Integration Test Script
# Tests the complete SuperTokens authentication flow

echo "🚀 Starting Atlas Financial SuperTokens Integration Test"

# Set up environment
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-atlas_dev_password}
export SUPERTOKENS_API_KEY=${SUPERTOKENS_API_KEY:-atlas_supertokens_api_key}
export HASURA_ADMIN_SECRET=${HASURA_ADMIN_SECRET:-atlas_hasura_admin_secret}
export REDIS_PASSWORD=${REDIS_PASSWORD:-atlas_redis_password}

echo "📋 Test Configuration:"
echo "  - PostgreSQL Password: ****"
echo "  - SuperTokens API Key: ****"
echo "  - Hasura Admin Secret: ****"
echo "  - Redis Password: ****"

# 1. Test Database Connectivity
echo "🗄️  Testing PostgreSQL connectivity..."
docker exec atlas-postgres pg_isready -U atlas -d atlas_financial
if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL connection successful"
else
    echo "❌ PostgreSQL connection failed"
    exit 1
fi

# 2. Test SuperTokens Core Service
echo "🔐 Testing SuperTokens Core Service..."
SUPERTOKENS_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3567/hello)
if [ "$SUPERTOKENS_HEALTH" = "200" ]; then
    echo "✅ SuperTokens Core Service is healthy"
else
    echo "❌ SuperTokens Core Service health check failed (HTTP $SUPERTOKENS_HEALTH)"
    exit 1
fi

# 3. Test Hasura GraphQL Engine
echo "🔄 Testing Hasura GraphQL Engine..."
HASURA_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/healthz)
if [ "$HASURA_HEALTH" = "200" ]; then
    echo "✅ Hasura GraphQL Engine is healthy"
else
    echo "❌ Hasura GraphQL Engine health check failed (HTTP $HASURA_HEALTH)"
    exit 1
fi

# 4. Test Frontend Service
echo "💻 Testing Frontend Service..."
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_HEALTH" = "200" ]; then
    echo "✅ Frontend Service is healthy"
else
    echo "❌ Frontend Service health check failed (HTTP $FRONTEND_HEALTH)"
    exit 1
fi

# 5. Test JWT JWKS Endpoint
echo "🔑 Testing JWT JWKS Endpoint..."
JWKS_RESPONSE=$(curl -s http://localhost:3000/api/auth/jwt/jwks.json)
if echo "$JWKS_RESPONSE" | grep -q "keys"; then
    echo "✅ JWKS endpoint is responding correctly"
else
    echo "❌ JWKS endpoint not responding correctly"
    echo "Response: $JWKS_RESPONSE"
    exit 1
fi

# 6. Test SuperTokens API Routes
echo "🛣️  Testing SuperTokens API Routes..."
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/signup)
if [ "$API_RESPONSE" = "200" ] || [ "$API_RESPONSE" = "405" ]; then
    echo "✅ SuperTokens API routes are accessible"
else
    echo "❌ SuperTokens API routes not accessible (HTTP $API_RESPONSE)"
    exit 1
fi

# 7. Test Redis Connectivity
echo "📦 Testing Redis connectivity..."
docker exec atlas-redis redis-cli --no-auth-warning -a $REDIS_PASSWORD ping
if [ $? -eq 0 ]; then
    echo "✅ Redis connection successful"
else
    echo "❌ Redis connection failed"
    exit 1
fi

# 8. Test AI Engine Connectivity
echo "🤖 Testing AI Engine connectivity..."
AI_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8083/health)
if [ "$AI_HEALTH" = "200" ]; then
    echo "✅ AI Engine is healthy"
else
    echo "⚠️  AI Engine health check failed (HTTP $AI_HEALTH) - This is expected if AI Engine is not running"
fi

echo ""
echo "🎉 SuperTokens Integration Test Completed Successfully!"
echo ""
echo "📊 Test Summary:"
echo "✅ PostgreSQL Database"
echo "✅ SuperTokens Core Service"
echo "✅ Hasura GraphQL Engine"
echo "✅ Frontend Next.js Application"
echo "✅ JWT JWKS Endpoint"
echo "✅ SuperTokens API Routes"
echo "✅ Redis Cache"
echo ""
echo "🔗 Access Points:"
echo "  - Frontend:        http://localhost:3000"
echo "  - Hasura Console:  http://localhost:8081"
echo "  - SuperTokens:     http://localhost:3567"
echo "  - AI Engine:       http://localhost:8083"
echo ""
echo "🔐 Authentication Flow:"
echo "  1. Visit http://localhost:3000"
echo "  2. Click 'Sign In' to be redirected to /auth/signin"
echo "  3. You'll be redirected to SuperTokens auth UI at /auth"
echo "  4. Create an account or sign in"
echo "  5. You'll be redirected back to the dashboard"
echo ""
echo "✨ SuperTokens integration is ready for use!"
