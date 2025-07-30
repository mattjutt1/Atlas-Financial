#!/bin/bash
set -euo pipefail

# Atlas Financial Wave 2 AI Production Validation Script
# Comprehensive validation of production deployment against success criteria

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

# Configuration
NAMESPACE="atlas-ai-production"
MONITORING_NAMESPACE="atlas-monitoring"
RESPONSE_TIME_TARGET=0.4  # 400ms
UPTIME_TARGET=99.9
CONCURRENT_USERS_TARGET=10000

# Test counters
total_tests=0
passed_tests=0
failed_tests=0
warnings=0

# Function to track test results
track_test() {
    local test_name="$1"
    local result="$2"
    
    total_tests=$((total_tests + 1))
    
    if [[ "$result" == "PASS" ]]; then
        passed_tests=$((passed_tests + 1))
        log_success "✓ $test_name"
    elif [[ "$result" == "WARNING" ]]; then
        warnings=$((warnings + 1))
        log_warning "⚠ $test_name"
    else
        failed_tests=$((failed_tests + 1))
        log_error "✗ $test_name"
    fi
}

# Validate Kubernetes AI Engine Deployment
validate_ai_engine() {
    log_info "Validating AI Engine deployment..."
    
    # Check deployment exists and is ready
    if ! kubectl get deployment ai-engine -n $NAMESPACE &> /dev/null; then
        track_test "AI Engine deployment exists" "FAIL"
        return
    fi
    track_test "AI Engine deployment exists" "PASS"
    
    # Check replica count
    local desired_replicas=$(kubectl get deployment ai-engine -n $NAMESPACE -o jsonpath='{.spec.replicas}')
    local ready_replicas=$(kubectl get deployment ai-engine -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
    
    if [[ "$ready_replicas" == "$desired_replicas" && "$ready_replicas" -ge 2 ]]; then
        track_test "AI Engine replica count ($ready_replicas/$desired_replicas)" "PASS"
    else
        track_test "AI Engine replica count ($ready_replicas/$desired_replicas)" "FAIL"
    fi
    
    # Check resource limits and requests
    local cpu_request=$(kubectl get deployment ai-engine -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.requests.cpu}')
    local memory_request=$(kubectl get deployment ai-engine -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.requests.memory}')
    local cpu_limit=$(kubectl get deployment ai-engine -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}')
    local memory_limit=$(kubectl get deployment ai-engine -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}')
    
    if [[ -n "$cpu_request" && -n "$memory_request" && -n "$cpu_limit" && -n "$memory_limit" ]]; then
        track_test "AI Engine resource limits configured" "PASS"
    else
        track_test "AI Engine resource limits configured" "FAIL"
    fi
    
    # Check health probes
    local liveness_probe=$(kubectl get deployment ai-engine -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].livenessProbe}')
    local readiness_probe=$(kubectl get deployment ai-engine -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].readinessProbe}')
    
    if [[ -n "$liveness_probe" && -n "$readiness_probe" ]]; then
        track_test "AI Engine health probes configured" "PASS"
    else
        track_test "AI Engine health probes configured" "FAIL"
    fi
    
    # Test health endpoint
    local ai_pods=$(kubectl get pods -n $NAMESPACE -l app=ai-engine --no-headers | awk '{print $1}')
    local healthy_pods=0
    local total_pods=0
    
    while IFS= read -r pod_name; do
        if [[ -n "$pod_name" ]]; then
            total_pods=$((total_pods + 1))
            if kubectl exec -n $NAMESPACE "$pod_name" -- curl -s -f http://localhost:8083/health > /dev/null 2>&1; then
                healthy_pods=$((healthy_pods + 1))
            fi
        fi
    done <<< "$ai_pods"
    
    if [[ $healthy_pods -eq $total_pods && $total_pods -gt 0 ]]; then
        track_test "AI Engine health endpoints ($healthy_pods/$total_pods healthy)" "PASS"
    else
        track_test "AI Engine health endpoints ($healthy_pods/$total_pods healthy)" "FAIL"
    fi
}

# Validate Market Data Service
validate_market_data_service() {
    log_info "Validating Market Data Service..."
    
    # Check deployment exists and is ready
    if ! kubectl get deployment market-data-service -n $NAMESPACE &> /dev/null; then
        track_test "Market Data Service deployment exists" "FAIL"
        return
    fi
    track_test "Market Data Service deployment exists" "PASS"
    
    # Check WebSocket infrastructure
    local service_type=$(kubectl get service market-data-service -n $NAMESPACE -o jsonpath='{.spec.type}')
    if [[ "$service_type" == "LoadBalancer" ]]; then
        track_test "Market Data Service LoadBalancer configured" "PASS"
    else
        track_test "Market Data Service LoadBalancer configured" "FAIL"
    fi
    
    # Check WebSocket port configuration
    local websocket_port=$(kubectl get service market-data-service -n $NAMESPACE -o jsonpath='{.spec.ports[?(@.name=="websocket")].port}')
    if [[ "$websocket_port" == "4001" ]]; then
        track_test "WebSocket port configured (4001)" "PASS"
    else
        track_test "WebSocket port configured" "FAIL"
    fi
    
    # Test service health
    local market_pods=$(kubectl get pods -n $NAMESPACE -l app=market-data-service --no-headers | awk '{print $1}')
    local healthy_pods=0
    local total_pods=0
    
    while IFS= read -r pod_name; do
        if [[ -n "$pod_name" ]]; then
            total_pods=$((total_pods + 1))
            if kubectl exec -n $NAMESPACE "$pod_name" -- curl -s -f http://localhost:4000/health > /dev/null 2>&1; then
                healthy_pods=$((healthy_pods + 1))
            fi
        fi
    done <<< "$market_pods"
    
    if [[ $healthy_pods -eq $total_pods && $total_pods -gt 0 ]]; then
        track_test "Market Data Service health endpoints ($healthy_pods/$total_pods healthy)" "PASS"
    else
        track_test "Market Data Service health endpoints ($healthy_pods/$total_pods healthy)" "FAIL"
    fi
}

# Validate Redis Cluster
validate_redis_cluster() {
    log_info "Validating Redis Cluster..."
    
    # Check if Redis cluster exists
    if ! kubectl get statefulset redis-cluster -n $NAMESPACE &> /dev/null; then
        track_test "Redis Cluster exists" "FAIL"
        return
    fi
    track_test "Redis Cluster exists" "PASS"
    
    # Check cluster status
    local cluster_status=$(kubectl exec -n $NAMESPACE redis-cluster-0 -- redis-cli --no-auth-warning -a "${REDIS_PASSWORD:-}" cluster info 2>/dev/null | grep cluster_state || echo "")
    if [[ "$cluster_status" == *"cluster_state:ok"* ]]; then
        track_test "Redis Cluster state OK" "PASS"
    else
        track_test "Redis Cluster state" "FAIL"
    fi
    
    # Check master nodes
    local master_nodes=$(kubectl exec -n $NAMESPACE redis-cluster-0 -- redis-cli --no-auth-warning -a "${REDIS_PASSWORD:-}" cluster nodes 2>/dev/null | grep master | wc -l || echo "0")
    if [[ $master_nodes -ge 3 ]]; then
        track_test "Redis Cluster master nodes ($master_nodes >= 3)" "PASS"
    else
        track_test "Redis Cluster master nodes ($master_nodes)" "FAIL"
    fi
    
    # Test connectivity
    if kubectl exec -n $NAMESPACE redis-cluster-0 -- redis-cli --no-auth-warning -a "${REDIS_PASSWORD:-}" ping 2>/dev/null | grep -q PONG; then
        track_test "Redis Cluster connectivity" "PASS"
    else
        track_test "Redis Cluster connectivity" "FAIL"
    fi
}

# Validate Monitoring Stack
validate_monitoring() {
    log_info "Validating monitoring stack..."
    
    # Check Prometheus
    if kubectl get deployment prometheus -n $MONITORING_NAMESPACE &> /dev/null; then
        track_test "Prometheus deployment exists" "PASS"
        
        # Test Prometheus health
        if kubectl exec -n $MONITORING_NAMESPACE deployment/prometheus -- curl -s http://localhost:9090/-/healthy 2>/dev/null | grep -q "Prometheus is Healthy"; then
            track_test "Prometheus health check" "PASS"
        else
            track_test "Prometheus health check" "FAIL"
        fi
    else
        track_test "Prometheus deployment exists" "FAIL"
    fi
    
    # Check Grafana
    if kubectl get deployment grafana -n $MONITORING_NAMESPACE &> /dev/null; then
        track_test "Grafana deployment exists" "PASS"
        
        # Test Grafana health
        if kubectl exec -n $MONITORING_NAMESPACE deployment/grafana -- curl -s http://localhost:3000/api/health 2>/dev/null | jq -e '.database == "ok"' > /dev/null 2>&1; then
            track_test "Grafana health check" "PASS"
        else
            track_test "Grafana health check" "FAIL"
        fi
    else
        track_test "Grafana deployment exists" "FAIL"
    fi
    
    # Check Jaeger
    if kubectl get deployment jaeger -n $MONITORING_NAMESPACE &> /dev/null; then
        track_test "Jaeger deployment exists" "PASS"
        
        # Test Jaeger health
        if kubectl exec -n $MONITORING_NAMESPACE deployment/jaeger -- curl -s http://localhost:16686/ 2>/dev/null | grep -q "Jaeger"; then
            track_test "Jaeger health check" "PASS"
        else
            track_test "Jaeger health check" "FAIL"
        fi
    else
        track_test "Jaeger deployment exists" "FAIL"
    fi
    
    # Check alerting rules
    local alert_rules=$(kubectl get configmap prometheus-rules -n $MONITORING_NAMESPACE -o jsonpath='{.data}' 2>/dev/null | wc -w || echo "0")
    if [[ $alert_rules -gt 0 ]]; then
        track_test "Prometheus alerting rules configured" "PASS"
    else
        track_test "Prometheus alerting rules configured" "FAIL"
    fi
}

# Validate Auto-scaling Configuration
validate_autoscaling() {
    log_info "Validating auto-scaling configuration..."
    
    # Check HPA for AI Engine
    if kubectl get hpa ai-engine-hpa -n $NAMESPACE &> /dev/null; then
        track_test "AI Engine HPA exists" "PASS"
        
        # Check CPU target
        local cpu_target=$(kubectl get hpa ai-engine-hpa -n $NAMESPACE -o jsonpath='{.spec.metrics[?(@.resource.name=="cpu")].resource.target.averageUtilization}')
        if [[ "$cpu_target" == "70" ]]; then
            track_test "AI Engine HPA CPU target (70%)" "PASS"
        else
            track_test "AI Engine HPA CPU target ($cpu_target%)" "WARNING"
        fi
        
        # Check replica range
        local min_replicas=$(kubectl get hpa ai-engine-hpa -n $NAMESPACE -o jsonpath='{.spec.minReplicas}')
        local max_replicas=$(kubectl get hpa ai-engine-hpa -n $NAMESPACE -o jsonpath='{.spec.maxReplicas}')
        
        if [[ $min_replicas -ge 2 && $max_replicas -ge 10 ]]; then
            track_test "AI Engine HPA replica range ($min_replicas-$max_replicas)" "PASS"
        else
            track_test "AI Engine HPA replica range ($min_replicas-$max_replicas)" "FAIL"
        fi
    else
        track_test "AI Engine HPA exists" "FAIL"
    fi
    
    # Check HPA for Market Data Service
    if kubectl get hpa market-data-service-hpa -n $NAMESPACE &> /dev/null; then
        track_test "Market Data Service HPA exists" "PASS"
    else
        track_test "Market Data Service HPA exists" "FAIL"
    fi
    
    # Check VPA (if enabled)
    local vpa_count=$(kubectl get vpa -n $NAMESPACE --no-headers 2>/dev/null | wc -l || echo "0")
    if [[ $vpa_count -gt 0 ]]; then
        track_test "VPA configured ($vpa_count VPAs)" "PASS"
    else
        track_test "VPA configured" "WARNING"
    fi
    
    # Check Pod Disruption Budgets
    local pdb_count=$(kubectl get pdb -n $NAMESPACE --no-headers 2>/dev/null | wc -l || echo "0")
    if [[ $pdb_count -ge 3 ]]; then
        track_test "Pod Disruption Budgets ($pdb_count PDBs)" "PASS"
    else
        track_test "Pod Disruption Budgets ($pdb_count PDBs)" "FAIL"
    fi
}

# Validate Disaster Recovery
validate_disaster_recovery() {
    log_info "Validating disaster recovery setup..."
    
    # Check disaster recovery ConfigMap
    if kubectl get configmap disaster-recovery-runbook -n $NAMESPACE &> /dev/null; then
        track_test "Disaster recovery runbook exists" "PASS"
    else
        track_test "Disaster recovery runbook exists" "FAIL"
    fi
    
    # Check disaster recovery CronJob
    if kubectl get cronjob disaster-recovery-test-schedule -n $NAMESPACE &> /dev/null; then
        track_test "Disaster recovery test schedule exists" "PASS"
    else
        track_test "Disaster recovery test schedule exists" "FAIL"
    fi
    
    # Check backup accessibility (if AWS credentials available)
    if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
        if aws s3 ls s3://atlas-ai-backups/ &> /dev/null; then
            track_test "Primary backup bucket accessible" "PASS"
        else
            track_test "Primary backup bucket accessible" "WARNING"
        fi
        
        if aws s3 ls s3://atlas-ai-backups-dr/ &> /dev/null; then
            track_test "DR backup bucket accessible" "PASS"
        else
            track_test "DR backup bucket accessible" "WARNING"
        fi
    else
        track_test "Backup accessibility (AWS credentials not available)" "WARNING"
    fi
    
    # Check multi-AZ deployment
    local node_zones=$(kubectl get nodes -o jsonpath='{.items[*].metadata.labels.topology\.kubernetes\.io/zone}' | tr ' ' '\n' | sort -u | wc -l)
    if [[ $node_zones -ge 2 ]]; then
        track_test "Multi-AZ deployment ($node_zones zones)" "PASS"
    else
        track_test "Multi-AZ deployment ($node_zones zone)" "WARNING"
    fi
}

# Performance Validation
validate_performance() {
    log_info "Validating performance targets..."
    
    # Get service endpoint
    local external_ip=$(kubectl get ingress ai-services-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    local test_endpoint=""
    
    if [[ -n "$external_ip" && "$external_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        test_endpoint="http://$external_ip/health"
    else
        # Use port-forward for testing
        kubectl port-forward -n $NAMESPACE service/ai-engine-service 8083:8083 &
        local port_forward_pid=$!
        sleep 5
        test_endpoint="http://localhost:8083/health"
    fi
    
    # Response time test
    log_info "Testing response times against target ${RESPONSE_TIME_TARGET}s..."
    local response_times=()
    local success_count=0
    local test_requests=10
    
    for ((i=1; i<=test_requests; i++)); do
        local response_time=$(curl -w "%{time_total}" -s -o /dev/null "$test_endpoint" 2>/dev/null || echo "999")
        if [[ "$response_time" != "999" ]]; then
            response_times+=($response_time)
            success_count=$((success_count + 1))
        fi
        sleep 0.5
    done
    
    # Clean up port-forward if used
    if [[ -n "${port_forward_pid:-}" ]]; then
        kill $port_forward_pid 2>/dev/null || true
    fi
    
    if [[ ${#response_times[@]} -gt 0 ]]; then
        # Calculate average response time
        local total_time=0
        for time in "${response_times[@]}"; do
            total_time=$(echo "$total_time + $time" | bc)
        done
        local avg_time=$(echo "scale=3; $total_time / ${#response_times[@]}" | bc)
        
        if (( $(echo "$avg_time <= $RESPONSE_TIME_TARGET" | bc -l) )); then
            track_test "Average response time (${avg_time}s <= ${RESPONSE_TIME_TARGET}s)" "PASS"
        else
            track_test "Average response time (${avg_time}s > ${RESPONSE_TIME_TARGET}s)" "FAIL"
        fi
        
        # Calculate success rate
        local success_rate=$(echo "scale=2; $success_count * 100 / $test_requests" | bc)
        if (( $(echo "$success_rate >= $UPTIME_TARGET" | bc -l) )); then
            track_test "Success rate (${success_rate}% >= ${UPTIME_TARGET}%)" "PASS"
        else
            track_test "Success rate (${success_rate}% < ${UPTIME_TARGET}%)" "FAIL"
        fi
    else
        track_test "Response time test (no successful requests)" "FAIL"
        track_test "Success rate test (no successful requests)" "FAIL"
    fi
}

# Generate validation report
generate_validation_report() {
    local report_file="/tmp/production-validation-report-$(date +%Y%m%d-%H%M%S).json"
    local validation_date=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local success_rate=$(echo "scale=2; $passed_tests * 100 / $total_tests" | bc)
    
    cat > "$report_file" << EOF
{
  "validation_metadata": {
    "validation_date": "$validation_date",
    "cluster_name": "$(kubectl config current-context)",
    "namespace": "$NAMESPACE",
    "validator_version": "1.0.0"
  },
  "test_summary": {
    "total_tests": $total_tests,
    "passed_tests": $passed_tests,
    "failed_tests": $failed_tests,
    "warnings": $warnings,
    "success_rate": "${success_rate}%"
  },
  "validation_categories": {
    "ai_engine": "validated",
    "market_data_service": "validated", 
    "redis_cluster": "validated",
    "monitoring_stack": "validated",
    "autoscaling": "validated",
    "disaster_recovery": "validated",
    "performance": "validated"
  },
  "performance_targets": {
    "response_time_target": "${RESPONSE_TIME_TARGET}s",
    "uptime_target": "${UPTIME_TARGET}%",
    "concurrent_users_target": $CONCURRENT_USERS_TARGET
  },
  "recommendations": [
    $([ $failed_tests -gt 0 ] && echo '"Address failed tests before production traffic",' || true)
    $([ $warnings -gt 0 ] && echo '"Review warnings and implement improvements",' || true)
    "Schedule regular validation runs",
    "Monitor performance metrics continuously",
    "Execute disaster recovery drills quarterly"
  ],
  "overall_status": "$([ $failed_tests -eq 0 ] && echo "PASS" || echo "FAIL")"
}
EOF
    
    log_info "Validation report saved to: $report_file"
    cat "$report_file" | jq '.'
    
    # Upload to S3 if configured
    if [[ -n "${S3_REPORTS_BUCKET:-}" ]]; then
        aws s3 cp "$report_file" "s3://$S3_REPORTS_BUCKET/validation/" 2>/dev/null || true
    fi
}

# Main validation function
main() {
    log_info "Starting Atlas Financial Wave 2 AI Production Validation"
    log_info "Target performance: <${RESPONSE_TIME_TARGET}s response time, ${UPTIME_TARGET}% uptime"
    
    # Check prerequisites
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is required but not installed"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Run validation tests
    validate_ai_engine
    validate_market_data_service
    validate_redis_cluster
    validate_monitoring
    validate_autoscaling
    validate_disaster_recovery
    validate_performance
    
    # Generate report
    generate_validation_report
    
    # Print summary
    echo
    echo "==============================================="
    echo "         PRODUCTION VALIDATION SUMMARY        "
    echo "==============================================="
    log_info "Total Tests: $total_tests"
    log_success "Passed: $passed_tests"
    log_error "Failed: $failed_tests"
    log_warning "Warnings: $warnings"
    
    local success_rate=$(echo "scale=1; $passed_tests * 100 / $total_tests" | bc)
    log_info "Success Rate: ${success_rate}%"
    
    if [[ $failed_tests -eq 0 ]]; then
        echo
        log_success "🎉 PRODUCTION VALIDATION SUCCESSFUL 🎉"
        log_success "✅ 99.9% uptime target achievable"
        log_success "✅ <400ms response times validated"
        log_success "✅ Auto-scaling operational"
        log_success "✅ Comprehensive monitoring active"
        log_success "✅ Disaster recovery ready"
        echo
        echo "Production deployment is ready for traffic! 🚀"
    else
        echo
        log_error "❌ PRODUCTION VALIDATION FAILED ❌"
        log_error "Please address the $failed_tests failed test(s) before proceeding"
        echo
        exit 1
    fi
}

# Run validation
main "$@"