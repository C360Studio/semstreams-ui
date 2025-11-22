# Production Dockerfile for SemStreams UI
# Multi-stage build: Build static SPA with Node.js, serve with Caddy

# Stage 1: Build static SPA
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build static SPA with adapter-static
RUN npm run build

# Stage 2: Serve with Caddy
FROM caddy:2-alpine

# Copy static files from builder
COPY --from=builder /app/build /usr/share/caddy

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Expose port
EXPOSE 3000

# Environment variables (can be overridden at runtime)
ENV BACKEND_URL=http://backend:8080

# Health check - check if Caddy is serving files
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Caddy runs as non-root by default
# Start Caddy server with Caddyfile
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
