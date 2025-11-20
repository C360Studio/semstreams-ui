# Production Dockerfile for SemStreams UI
# Multi-stage build for optimal image size

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Install adapter-node for Docker deployment
RUN npm install --save-dev @sveltejs/adapter-node

# Copy source code
COPY . .

# Create a production svelte.config.js that uses adapter-node
RUN echo "import adapter from '@sveltejs/adapter-node';" > svelte.config.js.production && \
    echo "import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';" >> svelte.config.js.production && \
    echo "const config = { preprocess: vitePreprocess(), kit: { adapter: adapter() } };" >> svelte.config.js.production && \
    echo "export default config;" >> svelte.config.js.production && \
    mv svelte.config.js.production svelte.config.js

# Build SvelteKit app with node adapter
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:22-alpine AS production

WORKDIR /app

# Copy built app and production dependencies from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S svelte -u 1001

# Set ownership
RUN chown -R svelte:nodejs /app

# Switch to non-root user
USER svelte

# Expose port
EXPOSE 3000

# Environment variables (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=3000
ENV ORIGIN=http://localhost:3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start production server
CMD ["node", "build"]
