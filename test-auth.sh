#!/bin/bash

echo "=== Atlas Financial Authentication Debug Script ==="
echo "Testing Keycloak configuration and authentication flow"
echo

# Test 1: Basic Keycloak connectivity
echo "1. Testing Keycloak connectivity..."
if curl -s -f "http://localhost:8080/" >/dev/null; then
    echo "✓ Keycloak is responding on port 8080"
else
    echo "✗ Keycloak is not responding"
    exit 1
fi

# Test 2: Check available realms via admin console
echo
echo "2. Attempting to get admin token..."
ADMIN_TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin_dev_password" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
    echo "✓ Successfully obtained admin token"
    
    # Test 3: List realms
    echo
    echo "3. Listing available realms..."
    curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
        "http://localhost:8080/admin/realms" | \
        grep -o '"realm":"[^"]*"' | cut -d'"' -f4 | \
        while read realm; do
            echo "  - $realm"
        done
    
    # Test 4: Check Atlas realm specifically
    echo
    echo "4. Checking Atlas realm configuration..."
    ATLAS_REALM=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
        "http://localhost:8080/admin/realms/atlas" 2>/dev/null)
    
    if echo "$ATLAS_REALM" | grep -q '"realm":"atlas"'; then
        echo "✓ Atlas realm exists"
        
        # Test 5: Check atlas-web client
        echo
        echo "5. Checking atlas-web client configuration..."
        CLIENT_INFO=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
            "http://localhost:8080/admin/realms/atlas/clients?clientId=atlas-web")
        
        if echo "$CLIENT_INFO" | grep -q '"clientId":"atlas-web"'; then
            echo "✓ atlas-web client exists"
            echo "Client details:"
            echo "$CLIENT_INFO" | grep -o '"enabled":[^,]*' | head -1
            echo "$CLIENT_INFO" | grep -o '"serviceAccountsEnabled":[^,]*' | head -1
        else
            echo "✗ atlas-web client not found"
            echo "Available clients:"
            curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
                "http://localhost:8080/admin/realms/atlas/clients" | \
                grep -o '"clientId":"[^"]*"' | cut -d'"' -f4 | \
                while read client; do
                    echo "  - $client"
                done
        fi
        
        # Test 6: Check for testuser
        echo
        echo "6. Checking for testuser in Atlas realm..."
        USER_INFO=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
            "http://localhost:8080/admin/realms/atlas/users?username=testuser")
        
        if echo "$USER_INFO" | grep -q '"username":"testuser"'; then
            echo "✓ testuser exists in Atlas realm"
            echo "$USER_INFO" | grep -o '"enabled":[^,]*' | head -1
        else
            echo "✗ testuser not found in Atlas realm"
            echo "Available users:"
            curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
                "http://localhost:8080/admin/realms/atlas/users" | \
                grep -o '"username":"[^"]*"' | cut -d'"' -f4 | \
                while read user; do
                    echo "  - $user"
                done
        fi
        
    else
        echo "✗ Atlas realm not found"
    fi
    
else
    echo "✗ Failed to obtain admin token"
    echo "Response from token endpoint:"
    curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "username=admin" \
      -d "password=admin_dev_password" \
      -d "grant_type=password" \
      -d "client_id=admin-cli"
fi

echo
echo "=== Authentication Debug Complete ==="