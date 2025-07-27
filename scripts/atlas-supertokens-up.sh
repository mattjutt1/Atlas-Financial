#!/bin/bash

# Atlas Financial - SuperTokens Startup Script
# Starts all services with SuperTokens authentication

echo "🚀 Starting Atlas Financial with SuperTokens Authentication"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Set working directory
cd "$(dirname "$0")/.."

# Load environment variables
if [ -f infrastructure/.env ]; then
    echo "📋 Loading environment variables from infrastructure/.env"
    set -a
    source infrastructure/.env
    set +a
else
    echo "⚠️  No infrastructure/.env file found, using defaults"
fi

echo "🐳 Starting Docker services..."

# Start all services using docker-compose
cd infrastructure/docker
docker-compose -f docker-compose.dev.yml up -d

echo "⏳ Waiting for services to start..."

# Wait for PostgreSQL
echo "🗄️  Waiting for PostgreSQL..."
while ! docker exec atlas-postgres pg_isready -U atlas -d atlas_financial > /dev/null 2>&1; do
    sleep 2
done
echo "✅ PostgreSQL is ready"

# Wait for SuperTokens
echo "🔐 Waiting for SuperTokens..."
while ! curl -s http://localhost:3567/hello > /dev/null; do
    sleep 2
done
echo "✅ SuperTokens is ready"

# Wait for Hasura
echo "🔄 Waiting for Hasura..."
while ! curl -s http://localhost:8081/healthz > /dev/null; do
    sleep 2
done
echo "✅ Hasura is ready"

# Wait for Redis
echo "📦 Waiting for Redis..."
while ! docker exec atlas-redis redis-cli --no-auth-warning -a ${REDIS_PASSWORD:-atlas_redis_password} ping > /dev/null 2>&1; do
    sleep 2
done
echo "✅ Redis is ready"

echo ""
echo "🎉 Atlas Financial with SuperTokens is now running!"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.dev.yml ps
echo ""
echo "🔗 Access Points:"
echo "  - Frontend:        http://localhost:3000"
echo "  - Hasura Console:  http://localhost:8081"
echo "  - SuperTokens:     http://localhost:3567"
echo "  - Firefly III:     http://localhost:8082"
echo "  - Grafana:         http://localhost:3001"
echo "  - AI Engine:       http://localhost:8083"
echo ""
echo "🔐 Authentication:"
echo "  - SuperTokens Dashboard: http://localhost:3567/auth/dashboard"
echo "  - Frontend Auth:         http://localhost:3000/auth"
echo ""
echo "📝 Next Steps:"
echo "  1. Visit http://localhost:3000 to access the application"
echo "  2. Create an account using the SuperTokens auth flow"
echo "  3. Run integration tests: ./scripts/test-supertokens-integration.sh"
echo ""
echo "🛠️  To stop all services: ./scripts/atlas-down.sh"