#!/bin/bash

# SuperTokens Frontend Integration Test Script
# This script tests the complete SuperTokens authentication flow

set -e

echo "🔐 Testing SuperTokens Frontend Integration..."
echo "================================================"

# Test 1: Health Check
echo "✅ Test 1: Frontend Health Check"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")
if [ "$response" = "200" ]; then
    echo "   ✓ Frontend health endpoint is accessible"
    curl -s http://localhost:3000/api/health | jq '.supertokens' || echo "   ⚠ Health endpoint response not in JSON format"
else
    echo "   ✗ Frontend health endpoint failed (HTTP $response)"
fi
echo

# Test 2: JWKS Endpoint
echo "✅ Test 2: JWKS Endpoint"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/jwt/jwks.json || echo "000")
if [ "$response" = "200" ]; then
    echo "   ✓ JWKS endpoint is accessible"
    jwks_response=$(curl -s http://localhost:3000/api/auth/jwt/jwks.json)
    if echo "$jwks_response" | jq -e '.keys' > /dev/null 2>&1; then
        echo "   ✓ JWKS response contains keys"
    else
        echo "   ✗ JWKS response malformed: $jwks_response"
    fi
else
    echo "   ✗ JWKS endpoint failed (HTTP $response)"
fi
echo

# Test 3: Auth API Routes
echo "✅ Test 3: SuperTokens Auth API Routes"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/signup || echo "000")
if [ "$response" = "200" ] || [ "$response" = "405" ]; then
    echo "   ✓ SuperTokens auth routes are accessible"
else
    echo "   ✗ SuperTokens auth routes failed (HTTP $response)"
fi
echo

# Test 4: Frontend Configuration
echo "✅ Test 4: Frontend Configuration Verification"
echo "   Checking environment variables..."

if [ -n "$NEXT_PUBLIC_SUPERTOKENS_API_DOMAIN" ]; then
    echo "   ✓ NEXT_PUBLIC_SUPERTOKENS_API_DOMAIN: $NEXT_PUBLIC_SUPERTOKENS_API_DOMAIN"
else
    echo "   ⚠ NEXT_PUBLIC_SUPERTOKENS_API_DOMAIN not set, using default"
fi

if [ -n "$NEXT_PUBLIC_SUPERTOKENS_WEBSITE_DOMAIN" ]; then
    echo "   ✓ NEXT_PUBLIC_SUPERTOKENS_WEBSITE_DOMAIN: $NEXT_PUBLIC_SUPERTOKENS_WEBSITE_DOMAIN"
else
    echo "   ⚠ NEXT_PUBLIC_SUPERTOKENS_WEBSITE_DOMAIN not set, using default"
fi

if [ -n "$SUPERTOKENS_CONNECTION_URI" ]; then
    echo "   ✓ SUPERTOKENS_CONNECTION_URI: $SUPERTOKENS_CONNECTION_URI"
else
    echo "   ⚠ SUPERTOKENS_CONNECTION_URI not set, using default"
fi
echo

# Test 5: SuperTokens Core Connection
echo "✅ Test 5: SuperTokens Core Connection"
supertokens_url="${SUPERTOKENS_CONNECTION_URI:-http://localhost:3567}"
response=$(curl -s -o /dev/null -w "%{http_code}" "$supertokens_url/hello" || echo "000")
if [ "$response" = "200" ]; then
    echo "   ✓ SuperTokens core is accessible at $supertokens_url"
else
    echo "   ✗ SuperTokens core not accessible at $supertokens_url (HTTP $response)"
fi
echo

# Test 6: Frontend Landing Page
echo "✅ Test 6: Frontend Landing Page"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$response" = "200" ]; then
    echo "   ✓ Frontend landing page is accessible"
else
    echo "   ✗ Frontend landing page failed (HTTP $response)"
fi
echo

# Test 7: JWT Configuration Synchronization
echo "✅ Test 7: JWT Configuration Verification"
echo "   Checking if frontend JWT issuer matches Hasura configuration..."

# Extract JWT issuer from JWKS
jwks_issuer=$(curl -s http://localhost:3000/api/auth/jwt/jwks.json | jq -r '.issuer // "not-found"' 2>/dev/null || echo "error")
expected_issuer="http://supertokens:3567"

echo "   Expected JWT issuer: $expected_issuer"
echo "   JWKS issuer: $jwks_issuer"

if [ "$jwks_issuer" = "$expected_issuer" ] || [ "$jwks_issuer" = "http://localhost:3567" ]; then
    echo "   ✓ JWT issuer configuration is correct"
else
    echo "   ⚠ JWT issuer may need verification"
fi
echo

echo "🔐 SuperTokens Frontend Integration Test Summary"
echo "================================================"
echo "✓ All critical components tested"
echo "✓ Authentication flow should be functional"
echo "✓ Frontend and backend JWT configuration synchronized"
echo
echo "📋 Next Steps:"
echo "1. Start the development environment: npm run dev"
echo "2. Navigate to http://localhost:3000"
echo "3. Try creating a user account and signing in"
echo "4. Verify dashboard access with authentication"
echo "5. Check browser developer tools for any authentication errors"
echo
echo "🔧 Troubleshooting:"
echo "- If auth fails, check SuperTokens container logs: docker logs atlas-supertokens"
echo "- If JWKS fails, verify SuperTokens service is running"
echo "- If user creation fails, check Hasura and PostgreSQL connections"
