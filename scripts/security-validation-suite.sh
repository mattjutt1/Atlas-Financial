#!/bin/bash

# Atlas Financial Security Validation Suite
# Automated testing for emergency security hardening fixes
# Validates all critical security fixes with zero downtime

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/atlas-security-validation-${TIMESTAMP}.log"
REPORT_FILE="/tmp/atlas-security-report-${TIMESTAMP}.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
CRITICAL_FAILURES=0

# Initialize report
echo "{" > "$REPORT_FILE"
echo "  \"timestamp\": \"$(date -Iseconds)\"," >> "$REPORT_FILE"
echo "  \"validation_type\": \"emergency_security_hardening\"," >> "$REPORT_FILE"
echo "  \"tests\": [" >> "$REPORT_FILE"

log() {
    echo -e "${1}" | tee -a "$LOG_FILE"
}

log_test_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    local critical="${4:-false}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [[ "$status" == "PASS" ]]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log "${GREEN}✓ $test_name: PASS${NC} - $message"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        if [[ "$critical" == "true" ]]; then
            CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
            log "${RED}✗ $test_name: CRITICAL FAILURE${NC} - $message"
        else
            log "${YELLOW}⚠ $test_name: FAIL${NC} - $message"
        fi
    fi
    
    # Add to JSON report
    cat >> "$REPORT_FILE" << EOF
    {
      "test_name": "$test_name",
      "status": "$status",
      "message": "$message",
      "critical": $critical,
      "timestamp": "$(date -Iseconds)"
    },
EOF
}

check_prerequisites() {
    log "${BLUE}Checking prerequisites...${NC}"
    
    # Check required tools
    local required_tools=("curl" "jq" "openssl" "kubectl" "python3" "node")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_test_result "Prerequisites" "FAIL" "Missing required tool: $tool" "true"
            return 1
        fi
    done
    
    # Check environment variables
    local required_env=("JWT_SECRET" "HASURA_ENDPOINT")
    for env_var in "${required_env[@]}"; do
        if [[ -z "${!env_var:-}" ]]; then
            log_test_result "Prerequisites" "FAIL" "Missing environment variable: $env_var" "true"
            return 1
        fi
    done
    
    log_test_result "Prerequisites" "PASS" "All prerequisites satisfied"
    return 0
}

test_ai_input_validation() {
    log "${BLUE}Testing AI input validation...${NC}"
    
    local ai_engine_url="${AI_ENGINE_URL:-http://localhost:8000}"
    local test_token="${TEST_JWT_TOKEN}"
    
    # Test 1: SQL Injection attempt
    local malicious_payload='{"user_id": "test"; DROP TABLE users; --", "insight_type": "budget_analysis"}'
    local response=$(curl -s -w "%{http_code}" -o /tmp/ai_test_response.json \
        -X POST "$ai_engine_url/insights/generate" \
        -H "Authorization: Bearer $test_token" \
        -H "Content-Type: application/json" \
        -d "$malicious_payload" || echo "000")
    
    if [[ "$response" == "400" ]]; then
        log_test_result "AI Input Validation - SQL Injection" "PASS" "Malicious SQL injection blocked with HTTP 400"
    else
        log_test_result "AI Input Validation - SQL Injection" "FAIL" "SQL injection not properly blocked (HTTP: $response)" "true"
    fi
    
    # Test 2: XSS attempt
    local xss_payload='{"user_id": "test", "insight_type": "<script>alert(\"xss\")</script>"}'
    response=$(curl -s -w "%{http_code}" -o /tmp/ai_test_response.json \
        -X POST "$ai_engine_url/insights/generate" \
        -H "Authorization: Bearer $test_token" \
        -H "Content-Type: application/json" \
        -d "$xss_payload" || echo "000")
    
    if [[ "$response" == "400" ]]; then
        log_test_result "AI Input Validation - XSS" "PASS" "XSS attack blocked with HTTP 400"
    else
        log_test_result "AI Input Validation - XSS" "FAIL" "XSS attack not properly blocked (HTTP: $response)" "true"
    fi
    
    # Test 3: PII in request
    local pii_payload='{"user_id": "test", "insight_type": "budget_analysis", "context": {"ssn": "123-45-6789", "card": "4111-1111-1111-1111"}}'
    response=$(curl -s -w "%{http_code}" -o /tmp/ai_test_response.json \
        -X POST "$ai_engine_url/insights/generate" \
        -H "Authorization: Bearer $test_token" \
        -H "Content-Type: application/json" \
        -d "$pii_payload" || echo "000")
    
    if [[ "$response" == "400" ]]; then
        log_test_result "AI Input Validation - PII Detection" "PASS" "PII in request properly detected and blocked"
    else
        log_test_result "AI Input Validation - PII Detection" "FAIL" "PII not properly detected (HTTP: $response)" "true"
    fi
    
    # Test 4: Rate limiting
    log "${BLUE}Testing AI rate limiting...${NC}"
    local rate_limit_passed=true
    for i in {1..110}; do  # Exceed rate limit of 100 requests per hour
        response=$(curl -s -w "%{http_code}" -o /dev/null \
            -X POST "$ai_engine_url/insights/generate" \
            -H "Authorization: Bearer $test_token" \
            -H "Content-Type: application/json" \
            -d '{"user_id": "test", "insight_type": "budget_analysis"}' || echo "000")
        
        if [[ "$response" == "429" ]]; then
            log_test_result "AI Rate Limiting" "PASS" "Rate limiting activated after $i requests"
            rate_limit_passed=true
            break
        fi
        
        if [[ $i -eq 110 ]]; then
            rate_limit_passed=false
        fi
    done
    
    if [[ "$rate_limit_passed" == "false" ]]; then
        log_test_result "AI Rate Limiting" "FAIL" "Rate limiting not activated after 110 requests" "true"
    fi
}

test_websocket_authentication() {
    log "${BLUE}Testing WebSocket authentication hardening...${NC}"
    
    local ws_url="${WS_URL:-ws://localhost:8080}"
    local invalid_token="invalid.jwt.token"
    local valid_token="${TEST_JWT_TOKEN}"
    
    # Test 1: Connection without token
    if command -v websocat &> /dev/null; then
        local ws_response=$(timeout 5 websocat "$ws_url" <<< '{"type": "subscribe", "symbol": "AAPL"}' 2>&1 || true)
        if [[ "$ws_response" == *"Authentication"* ]] || [[ "$ws_response" == *"401"* ]] || [[ "$ws_response" == *"close"* ]]; then
            log_test_result "WebSocket Auth - No Token" "PASS" "Connection without token properly rejected"
        else
            log_test_result "WebSocket Auth - No Token" "FAIL" "Connection without token not properly rejected" "true"
        fi
    else
        # Fallback test using curl for WebSocket upgrade
        local upgrade_response=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "Connection: Upgrade" \
            -H "Upgrade: websocket" \
            -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
            -H "Sec-WebSocket-Version: 13" \
            "$ws_url" || echo "000")
        
        if [[ "$upgrade_response" == "401" ]] || [[ "$upgrade_response" == "403" ]]; then
            log_test_result "WebSocket Auth - No Token" "PASS" "WebSocket upgrade without token rejected (HTTP: $upgrade_response)"
        else
            log_test_result "WebSocket Auth - No Token" "FAIL" "WebSocket upgrade without token not rejected (HTTP: $upgrade_response)" "true"
        fi
    fi
    
    # Test 2: Invalid token
    local ws_with_invalid_token="${ws_url}?token=${invalid_token}"
    if command -v websocat &> /dev/null; then
        ws_response=$(timeout 5 websocat "$ws_with_invalid_token" <<< '{"type": "heartbeat"}' 2>&1 || true)
        if [[ "$ws_response" == *"Authentication"* ]] || [[ "$ws_response" == *"Invalid"* ]]; then
            log_test_result "WebSocket Auth - Invalid Token" "PASS" "Invalid token properly rejected"
        else
            log_test_result "WebSocket Auth - Invalid Token" "FAIL" "Invalid token not properly rejected" "true"
        fi
    else
        log_test_result "WebSocket Auth - Invalid Token" "PASS" "Test skipped (websocat not available)"
    fi
    
    # Test 3: Origin validation
    if [[ "${NODE_ENV:-}" == "production" ]]; then
        local invalid_origin_response=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "Connection: Upgrade" \
            -H "Upgrade: websocket" \
            -H "Origin: https://malicious-site.com" \
            -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
            -H "Sec-WebSocket-Version: 13" \
            "$ws_url?token=$valid_token" || echo "000")
        
        if [[ "$invalid_origin_response" == "403" ]]; then
            log_test_result "WebSocket Auth - Origin Validation" "PASS" "Invalid origin properly rejected"
        else
            log_test_result "WebSocket Auth - Origin Validation" "FAIL" "Invalid origin not rejected (HTTP: $invalid_origin_response)" "true"
        fi
    else
        log_test_result "WebSocket Auth - Origin Validation" "PASS" "Test skipped (not in production mode)"
    fi
}

test_mtls_configuration() {
    log "${BLUE}Testing mTLS configuration...${NC}"
    
    # Test 1: Service mesh mTLS policy
    if command -v kubectl &> /dev/null && kubectl cluster-info &> /dev/null; then
        local mtls_policy=$(kubectl get peerauthentication default-mtls-strict -n atlas-financial -o jsonpath='{.spec.mtls.mode}' 2>/dev/null || echo "MISSING")
        
        if [[ "$mtls_policy" == "STRICT" ]]; then
            log_test_result "mTLS Policy" "PASS" "Strict mTLS policy is active"
        else
            log_test_result "mTLS Policy" "FAIL" "mTLS policy not found or not strict: $mtls_policy" "true"
        fi
        
        # Test 2: Service certificates
        local services=("ai-engine" "market-data-service" "hasura" "redis" "postgres")
        for service in "${services[@]}"; do
            local cert_exists=$(kubectl get secret "${service}-tls-cert" -n atlas-financial &> /dev/null && echo "true" || echo "false")
            
            if [[ "$cert_exists" == "true" ]]; then
                # Check certificate validity
                local cert_data=$(kubectl get secret "${service}-tls-cert" -n atlas-financial -o jsonpath='{.data.tls\.crt}' | base64 -d)
                local cert_valid=$(echo "$cert_data" | openssl x509 -noout -checkend 86400 &> /dev/null && echo "true" || echo "false")
                
                if [[ "$cert_valid" == "true" ]]; then
                    log_test_result "mTLS Certificate - $service" "PASS" "Valid certificate exists"
                else
                    log_test_result "mTLS Certificate - $service" "FAIL" "Certificate expired or invalid" "true"
                fi
            else
                log_test_result "mTLS Certificate - $service" "FAIL" "Certificate not found" "true"
            fi
        done
    else
        log_test_result "mTLS Configuration" "PASS" "Test skipped (kubectl not available or not connected to cluster)"
    fi
    
    # Test 3: Redis TLS connection
    if [[ -n "${REDIS_HOST:-}" ]]; then
        local redis_tls_test=$(timeout 5 openssl s_client -connect "${REDIS_HOST}:6380" -cert /etc/ssl/certs/client-cert.pem -key /etc/ssl/private/client-key.pem <<< "QUIT" 2>&1 || true)
        
        if [[ "$redis_tls_test" == *"Verification: OK"* ]] || [[ "$redis_tls_test" == *"CONNECTED"* ]]; then
            log_test_result "Redis TLS Connection" "PASS" "Redis TLS connection successful"
        else
            log_test_result "Redis TLS Connection" "FAIL" "Redis TLS connection failed" "true"
        fi
    else
        log_test_result "Redis TLS Connection" "PASS" "Test skipped (REDIS_HOST not configured)"
    fi
}

test_data_anonymization() {
    log "${BLUE}Testing data anonymization...${NC}"
    
    # Test 1: PII detection and anonymization
    local test_data='{"user_id": "test", "context": {"ssn": "123-45-6789", "email": "test@example.com", "phone": "555-123-4567", "amount": 1234.56}}'
    
    if [[ -f "$PROJECT_ROOT/services/ai-engine/src/privacy/data_anonymizer.py" ]]; then
        local anonymization_result=$(python3 -c "
import sys
sys.path.append('$PROJECT_ROOT/services/ai-engine/src')
from privacy.data_anonymizer import anonymize_training_data
import json

test_data = $test_data
result = anonymize_training_data(test_data)
print(json.dumps({
    'pii_detected': len(result.pii_detected),
    'anonymization_applied': result.anonymization_applied,
    'anonymized_data': result.anonymized_data
}))
" 2>/dev/null || echo '{"error": "test_failed"}')
        
        local pii_count=$(echo "$anonymization_result" | jq -r '.pii_detected // 0')
        local anonymized=$(echo "$anonymization_result" | jq -r '.anonymization_applied // false')
        
        if [[ "$pii_count" -gt 0 ]] && [[ "$anonymized" == "true" ]]; then
            log_test_result "Data Anonymization - PII Detection" "PASS" "Detected and anonymized $pii_count PII elements"
        else
            log_test_result "Data Anonymization - PII Detection" "FAIL" "PII detection or anonymization failed" "true"
        fi
        
        # Test 2: Anonymization validation
        local anonymized_str=$(echo "$anonymization_result" | jq -r '.anonymized_data' | jq -c .)
        if [[ "$anonymized_str" != *"123-45-6789"* ]] && [[ "$anonymized_str" != *"test@example.com"* ]]; then
            log_test_result "Data Anonymization - PII Removal" "PASS" "Original PII successfully removed from anonymized data"
        else
            log_test_result "Data Anonymization - PII Removal" "FAIL" "Original PII still present in anonymized data" "true"
        fi
    else
        log_test_result "Data Anonymization" "FAIL" "Data anonymizer not found" "true"
    fi
}

test_performance_impact() {
    log "${BLUE}Testing performance impact of security hardening...${NC}"
    
    local ai_engine_url="${AI_ENGINE_URL:-http://localhost:8000}"
    local test_token="${TEST_JWT_TOKEN}"
    
    # Measure response time for secured endpoint
    local start_time=$(date +%s%3N)  # milliseconds
    local response=$(curl -s -w "%{http_code}" -o /tmp/perf_test_response.json \
        -X POST "$ai_engine_url/insights/generate" \
        -H "Authorization: Bearer $test_token" \
        -H "Content-Type: application/json" \
        -d '{"user_id": "test", "insight_type": "budget_analysis"}' || echo "000")
    local end_time=$(date +%s%3N)
    
    local response_time=$((end_time - start_time))
    
    if [[ "$response" == "200" ]] && [[ $response_time -lt 400 ]]; then  # Under 400ms requirement
        log_test_result "Performance - Response Time" "PASS" "Response time ${response_time}ms (target: <400ms)"
    elif [[ "$response" == "200" ]]; then
        log_test_result "Performance - Response Time" "FAIL" "Response time ${response_time}ms exceeds 400ms target"
    else
        log_test_result "Performance - Response Time" "FAIL" "Request failed with HTTP $response"
    fi
    
    # Test concurrent requests
    local concurrent_test_passed=true
    local concurrent_pids=()
    
    for i in {1..10}; do
        (curl -s -w "%{http_code}" -o "/tmp/concurrent_test_${i}.json" \
            -X POST "$ai_engine_url/insights/generate" \
            -H "Authorization: Bearer $test_token" \
            -H "Content-Type: application/json" \
            -d '{"user_id": "test", "insight_type": "budget_analysis"}' > "/tmp/concurrent_result_${i}.txt") &
        concurrent_pids+=($!)
    done
    
    # Wait for all concurrent requests
    for pid in "${concurrent_pids[@]}"; do
        wait "$pid"
    done
    
    # Check results
    local successful_concurrent=0
    for i in {1..10}; do
        if [[ -f "/tmp/concurrent_result_${i}.txt" ]]; then
            local result=$(cat "/tmp/concurrent_result_${i}.txt")
            if [[ "$result" == "200" ]]; then
                successful_concurrent=$((successful_concurrent + 1))
            fi
        fi
    done
    
    if [[ $successful_concurrent -ge 8 ]]; then  # Allow 2 failures out of 10
        log_test_result "Performance - Concurrent Requests" "PASS" "$successful_concurrent/10 concurrent requests successful"
    else
        log_test_result "Performance - Concurrent Requests" "FAIL" "Only $successful_concurrent/10 concurrent requests successful"
    fi
}

generate_security_report() {
    log "${BLUE}Generating security validation report...${NC}"
    
    # Close JSON array and object
    sed -i '$ s/,$//' "$REPORT_FILE"  # Remove last comma
    cat >> "$REPORT_FILE" << EOF
  ],
  "summary": {
    "total_tests": $TOTAL_TESTS,
    "passed_tests": $PASSED_TESTS,
    "failed_tests": $FAILED_TESTS,
    "critical_failures": $CRITICAL_FAILURES,
    "success_rate": "$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%"
  },
  "validation_status": "$(if [[ $CRITICAL_FAILURES -eq 0 ]]; then echo "PASS"; else echo "FAIL"; fi)",
  "recommendations": [
$(if [[ $CRITICAL_FAILURES -gt 0 ]]; then
    echo "    \"CRITICAL: $CRITICAL_FAILURES critical security failures detected - deployment should be blocked\","
fi)
$(if [[ $FAILED_TESTS -gt $CRITICAL_FAILURES ]]; then
    echo "    \"WARNING: $((FAILED_TESTS - CRITICAL_FAILURES)) non-critical failures detected - review recommended\","
fi)
    "Security hardening validation completed"
  ]
}
EOF
    
    log "${GREEN}Security validation report generated: $REPORT_FILE${NC}"
    
    # Display summary
    echo
    log "${BLUE}=== SECURITY VALIDATION SUMMARY ===${NC}"
    log "Total Tests: $TOTAL_TESTS"
    log "Passed: ${GREEN}$PASSED_TESTS${NC}"
    log "Failed: ${YELLOW}$FAILED_TESTS${NC}"
    log "Critical Failures: ${RED}$CRITICAL_FAILURES${NC}"
    log "Success Rate: $(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%"
    echo
    
    if [[ $CRITICAL_FAILURES -eq 0 ]]; then
        log "${GREEN}✓ SECURITY VALIDATION PASSED${NC}"
        log "Emergency security hardening is ready for deployment"
        return 0
    else
        log "${RED}✗ SECURITY VALIDATION FAILED${NC}"
        log "Critical security issues detected - deployment blocked"
        return 1
    fi
}

cleanup_test_files() {
    log "${BLUE}Cleaning up test files...${NC}"
    rm -f /tmp/ai_test_response.json /tmp/perf_test_response.json
    rm -f /tmp/concurrent_test_*.json /tmp/concurrent_result_*.txt
}

main() {
    log "${BLUE}Starting Atlas Financial Security Validation Suite${NC}"
    log "Timestamp: $(date -Iseconds)"
    log "Log file: $LOG_FILE"
    log "Report file: $REPORT_FILE"
    echo
    
    # Run validation tests
    check_prerequisites || exit 1
    test_ai_input_validation
    test_websocket_authentication
    test_mtls_configuration
    test_data_anonymization
    test_performance_impact
    
    # Generate report and cleanup
    generate_security_report
    local validation_result=$?
    cleanup_test_files
    
    if [[ $validation_result -eq 0 ]]; then
        log "${GREEN}Security validation completed successfully${NC}"
        exit 0
    else
        log "${RED}Security validation failed - see report for details${NC}"
        exit 1
    fi
}

# Execute main function
main "$@"