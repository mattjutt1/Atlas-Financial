# Rust Financial Engine Dockerfile
# Multi-stage build for optimized production container

# Build stage
FROM rust:1.80-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    musl-dev \
    openssl-dev \
    openssl-libs-static \
    pkgconfig \
    curl

# Set environment variables for static linking
ENV RUSTFLAGS="-C target-feature=-crt-static"
ENV PKG_CONFIG_ALL_STATIC=1
ENV OPENSSL_STATIC=1
ENV OPENSSL_DIR=/usr

# Create app directory
WORKDIR /app

# Copy Cargo files first for better layer caching
COPY Cargo.toml Cargo.lock ./
COPY crates/financial-core/Cargo.toml ./crates/financial-core/
COPY crates/financial-api/Cargo.toml ./crates/financial-api/
COPY crates/financial-db/Cargo.toml ./crates/financial-db/
COPY crates/financial-cli/Cargo.toml ./crates/financial-cli/

# Copy source code
COPY crates/ ./crates/
COPY config/ ./config/

# Build the application in release mode
RUN cargo build --release --bin financial-api

# Runtime stage
FROM alpine:3.18

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    curl \
    libgcc

# Create non-root user
RUN addgroup -g 1001 -S atlas && \
    adduser -S atlas -u 1001 -G atlas

# Create app directory
WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/target/release/financial-api /app/financial-api

# Copy configuration files
COPY --from=builder /app/config/ /app/config/

# Change ownership to non-root user
RUN chown -R atlas:atlas /app

# Switch to non-root user
USER atlas

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Set default command
CMD ["/app/financial-api"]