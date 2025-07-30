# Market Data Service Production Dockerfile
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S atlas -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=atlas:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=atlas:nodejs /app/dist ./dist
COPY --from=builder --chown=atlas:nodejs /app/package*.json ./

# Create required directories
RUN mkdir -p /app/logs && chown atlas:nodejs /app/logs

# Switch to non-root user
USER atlas

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "
        const http = require('http');
        const options = { host: 'localhost', port: 4000, path: '/health', timeout: 5000 };
        const req = http.request(options, (res) => {
            if (res.statusCode === 200) process.exit(0);
            process.exit(1);
        });
        req.on('error', () => process.exit(1));
        req.on('timeout', () => process.exit(1));
        req.end();
    "

# Expose ports
EXPOSE 4000 8080

# Start application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

# Labels
LABEL name="atlas-market-data-service"
LABEL version="1.0.0"
LABEL description="Real-time market data service with WebSocket integration"
LABEL maintainer="Atlas Financial Engineering Team"