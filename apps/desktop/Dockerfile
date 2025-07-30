# Atlas Financial Desktop App - Containerized Backend Services
# Phase 2.6: Modular Monolith Integration
# Multi-stage build for production deployment

# ============================================================================
# Stage 1: Rust Builder
# ============================================================================
FROM rust:1.75-alpine AS rust-builder

# Install system dependencies
RUN apk add --no-cache \
    musl-dev \
    sqlite-dev \
    openssl-dev \
    pkgconfig \
    git

# Set working directory
WORKDIR /app

# Copy Rust configuration files
COPY Cargo.toml .
COPY src/ ./src/

# Build release binary
RUN cargo build --release --bin atlas-desktop-backend

# ============================================================================
# Stage 2: Node.js Builder (for Tauri frontend)
# ============================================================================
FROM node:18-alpine AS node-builder

# Set working directory
WORKDIR /app

# Copy package configuration
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy frontend source
COPY src-tauri/ ./src-tauri/
COPY public/ ./public/
COPY index.html ./

# Build Tauri application
RUN npm run tauri build

# ============================================================================
# Stage 3: Production Runtime
# ============================================================================
FROM alpine:3.18 AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    openssl \
    ca-certificates \
    sqlite \
    curl \
    tzdata

# Create non-root user for security
RUN addgroup -g 1001 atlas && \
    adduser -D -s /bin/sh -u 1001 -G atlas atlas

# Set working directory
WORKDIR /app

# Copy built applications
COPY --from=rust-builder /app/target/release/atlas-desktop-backend ./bin/
COPY --from=node-builder /app/src-tauri/target/release/bundle/deb/*.deb ./packages/

# Create application directories
RUN mkdir -p /app/data /app/config /app/logs && \
    chown -R atlas:atlas /app

# Switch to non-root user
USER atlas

# Environment variables
ENV ATLAS_CORE_URL=http://atlas-core:3000 \
    ATLAS_API_GATEWAY_URL=http://atlas-api-gateway:8081 \
    ENVIRONMENT=production \
    LOG_LEVEL=info \
    RUST_LOG=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8090/health || exit 1

# Expose ports
EXPOSE 8090 9091

# Start command
CMD ["./bin/atlas-desktop-backend"]
