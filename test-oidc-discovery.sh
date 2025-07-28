#!/bin/bash

echo "=== OpenID Connect Discovery Debug ==="
echo

# Test different variations of the well-known endpoint
ENDPOINTS=(
    "http://localhost:8080/realms/atlas/.well-known/openid_configuration"
    "http://localhost:8080/realms/atlas/.well-known/openid-configuration"
    "http://localhost:8080/realms/atlas/well-known/openid_configuration"
    "http://localhost:8080/realms/atlas/.well-known/openid-connect-configuration"
    "http://atlas-keycloak:8080/realms/atlas/.well-known/openid_configuration"
)

for endpoint in "${ENDPOINTS[@]}"; do
    echo "Testing: $endpoint"
    response=$(curl -s -w "HTTP_%{http_code}" "$endpoint" 2>/dev/null)
    http_code=$(echo "$response" | grep -o "HTTP_[0-9]*" | cut -d_ -f2)
    content=$(echo "$response" | sed 's/HTTP_[0-9]*$//')

    echo "  Status: $http_code"
    if [ "$http_code" = "200" ]; then
        echo "  ✓ Success!"
        echo "  Content (first 200 chars): ${content:0:200}..."
        break
    elif [ "$http_code" = "404" ]; then
        echo "  ✗ Not Found"
    else
        echo "  ✗ Error: $content"
    fi
    echo
done

echo
echo "=== Testing from Frontend Container ==="
docker exec atlas-frontend-fixed wget -q -O - "http://atlas-keycloak:8080/realms/atlas/.well-known/openid_configuration" 2>/dev/null | head -10

echo
echo "=== Manual OpenID Connect Configuration Check ==="
# Get admin token
ADMIN_TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin_dev_password" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
    echo "Checking realm settings..."
    REALM_INFO=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
        "http://localhost:8080/admin/realms/atlas")

    echo "Realm enabled: $(echo "$REALM_INFO" | grep -o '"enabled":[^,]*')"
    echo "Realm realm: $(echo "$REALM_INFO" | grep -o '"realm":"[^"]*"')"
fi

echo
echo "=== Discovery Debug Complete ==="
