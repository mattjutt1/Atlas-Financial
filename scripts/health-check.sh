#!/bin/bash

# Atlas Financial Production Health Check Script
# Comprehensive health monitoring for all Atlas Financial services

set -euo pipefail

# Configuration
KUBE_NAMESPACE="atlas-financial"
TIMEOUT=30
VERBOSE=false
OUTPUT_FORMAT="text"  # text, json, prometheus

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Health check results
declare -A HEALTH_RESULTS
declare -A HEALTH_DETAILS
declare -A RESPONSE_TIMES

# Logging functions
log_info() {
    if [[ "$OUTPUT_FORMAT" == "text" ]]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [[ "$OUTPUT_FORMAT" == "text" ]]; then
        echo -e "${GREEN}[SUCCESS]${NC} $1"
    fi
}

log_warning() {
    if [[ "$OUTPUT_FORMAT" == "text" ]]; then
        echo -e "${YELLOW}[WARNING]${NC} $1"
    fi
}

log_error() {
    if [[ "$OUTPUT_FORMAT" == "text" ]]; then
        echo -e "${RED}[ERROR]${NC} $1"
    fi
}

# Utility functions
measure_time() {
    local start_time=$(date +%s.%N)
    "$@"
    local end_time=$(date +%s.%N)
    echo "$(echo "$end_time - $start_time" | bc -l)"
}

check_port() {
    local host=$1
    local port=$2
    local timeout=${3:-5}

    if timeout "$timeout" bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

check_http_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local timeout=${3:-$TIMEOUT}

    local response
    response=$(curl -s -w "%{http_code}|%{time_total}" --max-time "$timeout" "$url" 2>/dev/null || echo "000|0")
    local status_code="${response##*|}"
    local response_time="${response%|*}"
    response_time="${response_time##*|}"

    if [[ "$status_code" == "$expected_status" ]]; then
        echo "$response_time"
        return 0
    else
        echo "0"
        return 1
    fi
}

# Kubernetes health checks
check_kubernetes_health() {
    log_info "Checking Kubernetes cluster health..."

    # Check cluster connectivity
    if kubectl cluster-info &> /dev/null; then
        HEALTH_RESULTS["kubernetes_cluster"]="healthy"
        HEALTH_DETAILS["kubernetes_cluster"]="Cluster accessible"
    else
        HEALTH_RESULTS["kubernetes_cluster"]="unhealthy"
        HEALTH_DETAILS["kubernetes_cluster"]="Cannot connect to cluster"
        return 1
    fi

    # Check namespace
    if kubectl get namespace "$KUBE_NAMESPACE" &> /dev/null; then
        HEALTH_RESULTS["kubernetes_namespace"]="healthy"
        HEALTH_DETAILS["kubernetes_namespace"]="Namespace exists"
    else
        HEALTH_RESULTS["kubernetes_namespace"]="unhealthy"
        HEALTH_DETAILS["kubernetes_namespace"]="Namespace not found"
        return 1
    fi

    # Check node health
    local unhealthy_nodes
    unhealthy_nodes=$(kubectl get nodes --no-headers | grep -v " Ready " | wc -l)
    if [[ "$unhealthy_nodes" -eq 0 ]]; then
        HEALTH_RESULTS["kubernetes_nodes"]="healthy"
        HEALTH_DETAILS["kubernetes_nodes"]="All nodes ready"
    else
        HEALTH_RESULTS["kubernetes_nodes"]="degraded"
        HEALTH_DETAILS["kubernetes_nodes"]="$unhealthy_nodes unhealthy nodes"
    fi

    log_success "Kubernetes health checked"
}

# Pod health checks
check_pod_health() {
    log_info "Checking pod health..."

    local pods
    pods=$(kubectl get pods -n "$KUBE_NAMESPACE" --no-headers 2>/dev/null || echo "")

    if [[ -z "$pods" ]]; then
        HEALTH_RESULTS["pods"]="unhealthy"
        HEALTH_DETAILS["pods"]="No pods found"
        return 1
    fi

    local total_pods=0
    local running_pods=0
    local ready_pods=0

    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            ((total_pods++))
            local status=$(echo "$line" | awk '{print $3}')
            local ready=$(echo "$line" | awk '{print $2}')

            if [[ "$status" == "Running" ]]; then
                ((running_pods++))
            fi

            if [[ "$ready" =~ ^[0-9]+/[0-9]+$ ]]; then
                local ready_count="${ready%/*}"
                local total_count="${ready#*/}"
                if [[ "$ready_count" == "$total_count" ]]; then
                    ((ready_pods++))
                fi
            fi
        fi
    done <<< "$pods"

    if [[ "$ready_pods" == "$total_pods" ]] && [[ "$running_pods" == "$total_pods" ]]; then
        HEALTH_RESULTS["pods"]="healthy"
        HEALTH_DETAILS["pods"]="$ready_pods/$total_pods pods ready and running"
    elif [[ "$running_pods" -gt 0 ]]; then
        HEALTH_RESULTS["pods"]="degraded"
        HEALTH_DETAILS["pods"]="$ready_pods/$total_pods ready, $running_pods/$total_pods running"
    else
        HEALTH_RESULTS["pods"]="unhealthy"
        HEALTH_DETAILS["pods"]="$ready_pods/$total_pods ready, $running_pods/$total_pods running"
    fi

    log_success "Pod health checked"
}

# Database health checks
check_database_health() {
    log_info "Checking database health..."

    # Port forward to PostgreSQL for testing
    local postgres_pod
    postgres_pod=$(kubectl get pods -n "$KUBE_NAMESPACE" -l app.kubernetes.io/component=database --no-headers | head -1 | awk '{print $1}')

    if [[ -z "$postgres_pod" ]]; then
        HEALTH_RESULTS["database"]="unhealthy"
        HEALTH_DETAILS["database"]="PostgreSQL pod not found"
        return 1
    fi

    # Check if PostgreSQL is accepting connections
    if kubectl exec -n "$KUBE_NAMESPACE" "$postgres_pod" -- pg_isready -U atlas -d atlas_financial &> /dev/null; then
        HEALTH_RESULTS["database"]="healthy"
        HEALTH_DETAILS["database"]="PostgreSQL accepting connections"

        # Get connection count
        local connections
        connections=$(kubectl exec -n "$KUBE_NAMESPACE" "$postgres_pod" -- psql -U atlas -d atlas_financial -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ' || echo "unknown")
        HEALTH_DETAILS["database_connections"]="Active connections: $connections"

        # Check database sizes
        local db_sizes
        db_sizes=$(kubectl exec -n "$KUBE_NAMESPACE" "$postgres_pod" -- psql -U atlas -d atlas_financial -t -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database WHERE datname IN ('atlas_financial', 'firefly', 'hasura', 'grafana', 'supertokens');" 2>/dev/null || echo "unknown")
        HEALTH_DETAILS["database_sizes"]="$db_sizes"
    else
        HEALTH_RESULTS["database"]="unhealthy"
        HEALTH_DETAILS["database"]="PostgreSQL not accepting connections"
    fi

    log_success "Database health checked"
}

# Redis health checks
check_redis_health() {
    log_info "Checking Redis health..."

    local redis_pod
    redis_pod=$(kubectl get pods -n "$KUBE_NAMESPACE" -l app.kubernetes.io/component=cache --no-headers | head -1 | awk '{print $1}')

    if [[ -z "$redis_pod" ]]; then
        HEALTH_RESULTS["redis"]="unhealthy"
        HEALTH_DETAILS["redis"]="Redis pod not found"
        return 1
    fi

    # Check Redis connectivity
    if kubectl exec -n "$KUBE_NAMESPACE" "$redis_pod" -- redis-cli ping &> /dev/null; then
        HEALTH_RESULTS["redis"]="healthy"
        HEALTH_DETAILS["redis"]="Redis responding to ping"

        # Get Redis info
        local redis_info
        redis_info=$(kubectl exec -n "$KUBE_NAMESPACE" "$redis_pod" -- redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r' || echo "unknown")
        HEALTH_DETAILS["redis_memory"]="Memory usage: $redis_info"

        local connected_clients
        connected_clients=$(kubectl exec -n "$KUBE_NAMESPACE" "$redis_pod" -- redis-cli info clients | grep connected_clients | cut -d: -f2 | tr -d '\r' || echo "unknown")
        HEALTH_DETAILS["redis_clients"]="Connected clients: $connected_clients"
    else
        HEALTH_RESULTS["redis"]="unhealthy"
        HEALTH_DETAILS["redis"]="Redis not responding"
    fi

    log_success "Redis health checked"
}

# Service endpoint health checks
check_service_endpoints() {
    log_info "Checking service endpoints..."

    # Service definitions: name:port:path:expected_status
    local services=(
        "atlas-supertokens:3567:/hello:200"
        "atlas-hasura:8080:/healthz:200"
        "atlas-firefly:8080:/health:200"
        "atlas-grafana:3000:/api/health:200"
        "atlas-prometheus:9090/-/healthy:200"
    )

    for service_def in "${services[@]}"; do
        IFS=':' read -r service_name port path expected_status <<< "$service_def"

        # Port forward to service for testing
        local pod
        pod=$(kubectl get pods -n "$KUBE_NAMESPACE" -l app.kubernetes.io/instance="$service_name" --no-headers 2>/dev/null | head -1 | awk '{print $1}' || echo "")

        if [[ -z "$pod" ]]; then
            HEALTH_RESULTS["$service_name"]="unhealthy"
            HEALTH_DETAILS["$service_name"]="Pod not found"
            continue
        fi

        # Test the endpoint
        local response_time
        if response_time=$(kubectl exec -n "$KUBE_NAMESPACE" "$pod" -- timeout 10 wget -q -O /dev/null --server-response "http://localhost:$port$path" 2>&1 | grep "HTTP/" | tail -1); then
            if echo "$response_time" | grep -q "$expected_status"; then
                HEALTH_RESULTS["$service_name"]="healthy"
                HEALTH_DETAILS["$service_name"]="Endpoint responding with status $expected_status"
                RESPONSE_TIMES["$service_name"]="<1s"
            else
                HEALTH_RESULTS["$service_name"]="degraded"
                HEALTH_DETAILS["$service_name"]="Endpoint responding with unexpected status"
            fi
        else
            HEALTH_RESULTS["$service_name"]="unhealthy"
            HEALTH_DETAILS["$service_name"]="Endpoint not responding"
        fi
    done

    log_success "Service endpoints checked"
}

# External dependencies health checks
check_external_dependencies() {
    log_info "Checking external dependencies..."

    # Check DNS resolution
    if nslookup google.com &> /dev/null; then
        HEALTH_RESULTS["dns"]="healthy"
        HEALTH_DETAILS["dns"]="DNS resolution working"
    else
        HEALTH_RESULTS["dns"]="unhealthy"
        HEALTH_DETAILS["dns"]="DNS resolution failed"
    fi

    # Check internet connectivity
    if curl -s --max-time 10 https://httpbin.org/status/200 &> /dev/null; then
        HEALTH_RESULTS["internet"]="healthy"
        HEALTH_DETAILS["internet"]="Internet connectivity available"
    else
        HEALTH_RESULTS["internet"]="degraded"
        HEALTH_DETAILS["internet"]="Limited internet connectivity"
    fi

    log_success "External dependencies checked"
}

# Resource usage checks
check_resource_usage() {
    log_info "Checking resource usage..."

    # Check if metrics server is available
    if kubectl top nodes &> /dev/null; then
        local node_cpu_usage
        node_cpu_usage=$(kubectl top nodes --no-headers | awk '{sum+=$3} END {print sum}' || echo "0")
        local node_memory_usage
        node_memory_usage=$(kubectl top nodes --no-headers | awk '{sum+=$5} END {print sum}' || echo "0")

        HEALTH_DETAILS["cluster_cpu"]="Total CPU usage: ${node_cpu_usage}m"
        HEALTH_DETAILS["cluster_memory"]="Total memory usage: ${node_memory_usage}Mi"

        # Check pod resource usage
        local pod_resources
        pod_resources=$(kubectl top pods -n "$KUBE_NAMESPACE" --no-headers 2>/dev/null | wc -l || echo "0")
        if [[ "$pod_resources" -gt 0 ]]; then
            HEALTH_RESULTS["resources"]="healthy"
            HEALTH_DETAILS["resources"]="Resource metrics available for $pod_resources pods"
        else
            HEALTH_RESULTS["resources"]="degraded"
            HEALTH_DETAILS["resources"]="Limited resource metrics available"
        fi
    else
        HEALTH_RESULTS["resources"]="degraded"
        HEALTH_DETAILS["resources"]="Metrics server not available"
    fi

    log_success "Resource usage checked"
}

# Generate output based on format
output_results() {
    case "$OUTPUT_FORMAT" in
        json)
            output_json
            ;;
        prometheus)
            output_prometheus
            ;;
        *)
            output_text
            ;;
    esac
}

output_text() {
    echo
    echo "Atlas Financial Production Health Check Report"
    echo "============================================="
    echo "Timestamp: $(date)"
    echo "Namespace: $KUBE_NAMESPACE"
    echo

    local overall_status="healthy"
    local healthy_count=0
    local degraded_count=0
    local unhealthy_count=0

    for component in "${!HEALTH_RESULTS[@]}"; do
        local status="${HEALTH_RESULTS[$component]}"
        local details="${HEALTH_DETAILS[$component]:-}"
        local response_time="${RESPONSE_TIMES[$component]:-}"

        case "$status" in
            healthy)
                echo -e "${GREEN}✓${NC} $component: $status"
                ((healthy_count++))
                ;;
            degraded)
                echo -e "${YELLOW}⚠${NC} $component: $status"
                ((degraded_count++))
                if [[ "$overall_status" == "healthy" ]]; then
                    overall_status="degraded"
                fi
                ;;
            unhealthy)
                echo -e "${RED}✗${NC} $component: $status"
                ((unhealthy_count++))
                overall_status="unhealthy"
                ;;
        esac

        if [[ -n "$details" ]] && [[ "$VERBOSE" == "true" ]]; then
            echo "  Details: $details"
        fi

        if [[ -n "$response_time" ]]; then
            echo "  Response time: $response_time"
        fi
    done

    echo
    echo "Summary:"
    echo "--------"
    echo "Overall status: $overall_status"
    echo "Healthy components: $healthy_count"
    echo "Degraded components: $degraded_count"
    echo "Unhealthy components: $unhealthy_count"
    echo "Total components checked: $((healthy_count + degraded_count + unhealthy_count))"

    # Set exit code based on overall status
    case "$overall_status" in
        healthy)
            exit 0
            ;;
        degraded)
            exit 1
            ;;
        unhealthy)
            exit 2
            ;;
    esac
}

output_json() {
    local json_output='{"timestamp":"'$(date -Iseconds)'","namespace":"'$KUBE_NAMESPACE'","components":{'
    local first=true

    for component in "${!HEALTH_RESULTS[@]}"; do
        if [[ "$first" == "true" ]]; then
            first=false
        else
            json_output+=','
        fi

        local status="${HEALTH_RESULTS[$component]}"
        local details="${HEALTH_DETAILS[$component]:-}"
        local response_time="${RESPONSE_TIMES[$component]:-}"

        json_output+='"'$component'":{"status":"'$status'"'
        if [[ -n "$details" ]]; then
            json_output+=',"details":"'$details'"'
        fi
        if [[ -n "$response_time" ]]; then
            json_output+=',"response_time":"'$response_time'"'
        fi
        json_output+='}'
    done

    json_output+='}}'
    echo "$json_output" | jq '.' 2>/dev/null || echo "$json_output"
}

output_prometheus() {
    echo "# HELP atlas_financial_health_status Health status of Atlas Financial components (1=healthy, 0.5=degraded, 0=unhealthy)"
    echo "# TYPE atlas_financial_health_status gauge"

    for component in "${!HEALTH_RESULTS[@]}"; do
        local status="${HEALTH_RESULTS[$component]}"
        local value

        case "$status" in
            healthy) value=1 ;;
            degraded) value=0.5 ;;
            unhealthy) value=0 ;;
        esac

        echo "atlas_financial_health_status{component=\"$component\",namespace=\"$KUBE_NAMESPACE\"} $value"
    done
}

# Main execution
main() {
    check_kubernetes_health
    check_pod_health
    check_database_health
    check_redis_health
    check_service_endpoints
    check_external_dependencies
    check_resource_usage

    output_results
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -f|--format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        -n|--namespace)
            KUBE_NAMESPACE="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -v, --verbose        Enable verbose output"
            echo "  -f, --format FORMAT  Output format (text, json, prometheus)"
            echo "  -n, --namespace NS   Kubernetes namespace (default: atlas-financial)"
            echo "  -t, --timeout SEC    Timeout for checks (default: 30)"
            echo "  -h, --help          Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Execute main function
main
