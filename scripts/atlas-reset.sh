#!/bin/bash

# Atlas Financial v1.1 - Reset Script
# DANGER: This will destroy all data and reset the platform to initial state

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

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_banner() {
    echo -e "${RED}"
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                          Atlas Financial v1.1                                ║"
    echo "║                    ⚠️  DANGER: RESETTING ALL DATA  ⚠️                        ║"
    echo "║                     This will destroy everything!                            ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

confirm_reset() {
    log_warning "This action will:"
    echo "  • Stop all Atlas Financial services"
    echo "  • Remove all containers and images"
    echo "  • DELETE ALL FINANCIAL DATA"
    echo "  • DELETE ALL USER ACCOUNTS"
    echo "  • DELETE ALL AI INSIGHTS"
    echo "  • Remove all Docker volumes and networks"
    echo ""
    
    read -p "Are you absolutely sure you want to continue? (type 'RESET' to confirm): " confirmation
    
    if [[ "$confirmation" != "RESET" ]]; then
        log_info "Reset cancelled. No changes made."
        exit 0
    fi
    
    echo ""
    read -p "Last chance! Type 'I UNDERSTAND' to proceed with data destruction: " final_confirmation
    
    if [[ "$final_confirmation" != "I UNDERSTAND" ]]; then
        log_info "Reset cancelled. No changes made."
        exit 0
    fi
}

main() {
    print_banner
    confirm_reset
    
    log_warning "Beginning Atlas Financial complete reset..."
    
    # Use docker compose (newer) or docker-compose (legacy)
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    # Stop and remove all services
    log_info "Stopping all services..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" down --volumes --remove-orphans
    
    # Remove all Atlas-related images
    log_info "Removing Atlas Docker images..."
    docker images --format "table {{.Repository}}:{{.Tag}}" | grep -E "(atlas|firefly|hasura|keycloak|grafana)" | xargs -r docker rmi -f || true
    
    # Remove all Atlas-related volumes
    log_info "Removing all data volumes..."
    docker volume ls --format "{{.Name}}" | grep -E "atlas" | xargs -r docker volume rm || true
    
    # Remove Atlas network
    log_info "Removing Atlas network..."
    docker network rm atlas-network 2>/dev/null || true
    
    # Clean up any dangling resources
    log_info "Cleaning up dangling resources..."
    docker system prune -f
    
    # Remove .env file (optional)
    read -p "Do you want to remove the .env file with all credentials? (y/N): " remove_env
    if [[ "$remove_env" =~ ^[Yy]$ ]]; then
        rm -f .env
        log_info "Environment file removed"
    fi
    
    log_success "Atlas Financial has been completely reset"
    log_info "Run './scripts/atlas-up.sh' to start fresh"
}

main "$@"