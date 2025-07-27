#!/bin/bash

# Atlas Financial v1.1 - Shutdown Script
# Gracefully stops all Atlas Financial services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

COMPOSE_FILE="infrastructure/docker/docker-compose.dev.yml"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_banner() {
    echo -e "${YELLOW}"
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                          Atlas Financial v1.1                                ║"
    echo "║                              Shutting Down...                                ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

main() {
    print_banner
    
    log_info "Stopping Atlas Financial services..."
    
    # Use docker compose (newer) or docker-compose (legacy)
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    $COMPOSE_CMD -f "$COMPOSE_FILE" down
    
    log_success "Atlas Financial has been stopped"
    log_info "Data volumes are preserved. Use ./scripts/atlas-reset.sh to remove all data."
}

main "$@"