# SemStreams UI - Generic Flow Builder

**Backend-Agnostic** visual flow builder for any SemStreams-compatible application.

## Overview

SemStreams UI is a standalone visual flow builder that works with **any** application built on the SemStreams framework, including:

- **semstreams** - Core stream processing framework
- **semmem** - Semantic memory management
- **semops** - Operations and monitoring
- **Your application** - Any SemStreams-based system

The UI discovers components, schemas, and capabilities **at runtime** from the backend's OpenAPI spec and `/components/types` endpoint. There's no hardcoding of component types or backend-specific logic.

## Features

- **Backend-Agnostic**: Works with any SemStreams-compatible API
- **Runtime Discovery**: Dynamically loads component schemas from backend
- **Flow Management**: Create, edit, and deploy processing flows
- **Visual Canvas**: Drag-and-drop flow editor using Svelte Flow
- **Type-Safe**: TypeScript types generated from OpenAPI specs
- **Real-time Updates**: WebSocket integration for live data
- **Flow Persistence**: NATS KV-backed storage

## Tech Stack

- **SvelteKit 2** - Full-stack framework
- **Svelte 5** - Reactive UI with runes system
- **TypeScript** - Type safety via OpenAPI code generation
- **Svelte Flow** - Visual flow editor
- **Pico CSS** - Lightweight styling
- **Playwright** - E2E testing

## Quick Start

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- A running SemStreams-compatible backend (semstreams, semmem, etc.)
- Docker (optional, for containerized deployment)

### Full Stack Development (Recommended)

Start both backend infrastructure and frontend with a single command:

```bash
# Install dependencies first
npm install

# Start everything (NATS + backend + UI)
task dev:full
# Access at http://localhost:3001
```

This starts:

- **Caddy** at `localhost:3001` (reverse proxy - unified access point)
- **NATS** (internal Docker network - message broker)
- **Backend** (internal Docker network - API server)
- **Vite** at `localhost:5173` (dev server with HMR)

**Manage backend separately:**

```bash
task dev:backend:start   # Start NATS + backend in background
task dev                 # Start frontend (in another terminal)
task dev:backend:logs    # View backend logs
task dev:backend:stop    # Stop backend when done
```

**Custom ports (avoid collisions):**

```bash
DEV_UI_PORT=3002 DEV_VITE_PORT=5174 task dev:full
```

> **Note:** Requires Docker and the semstreams backend at `../semstreams` (configurable via `BACKEND_CONTEXT`).

### Development Mode (Native)

```bash
# Install dependencies
npm install

# Start your SemStreams-based backend application
# Example: cd /path/to/your-backend && ./your-backend-binary
# The backend must expose the required API endpoints (see INTEGRATION_EXAMPLE.md)

# In another terminal, start UI dev server
npm run dev
# or
task dev
```

The UI will be available at `http://localhost:5173` and expects the backend at `http://localhost:8080`.

### Development Mode (Docker)

```bash
# Start UI in Docker (expects backend at host.docker.internal:8080)
task dev:docker

# Or with Caddy reverse proxy (production-like)
task dev:with-caddy
# Available at http://localhost:3000
```

## Configuration

### Connecting to Different Backends

The UI connects to backends via environment variables:

**`.env` file:**

```bash
# Backend URL (for native dev)
BACKEND_URL=http://localhost:8080

# Backend host (for Docker SSR)
BACKEND_HOST=backend:8080

# OpenAPI spec for type generation (REQUIRED)
# Point this to your backend's OpenAPI specification
OPENAPI_SPEC_PATH=/path/to/your-backend/specs/openapi.v3.yaml
```

**Example paths:**

```bash
# Local backend
OPENAPI_SPEC_PATH=/home/user/myapp/specs/openapi.v3.yaml

# Monorepo structure
OPENAPI_SPEC_PATH=../my-backend/specs/openapi.v3.yaml

# Absolute path
OPENAPI_SPEC_PATH=/var/projects/backend/specs/openapi.v3.yaml
```

### TypeScript Type Generation

Generate TypeScript types from any backend's OpenAPI spec:

```bash
# From semstreams
task generate-types:semstreams

# From semmem
task generate-types:semmem

# From custom spec path
OPENAPI_SPEC_PATH=/path/to/spec.yaml task generate-types

# From running backend
BACKEND_URL=http://localhost:8080 task generate-types:from-url
```

## Development Workflows

### Local Development (Backend + UI)

```bash
# Terminal 1: Start backend
cd semstreams && task build && ./bin/streamkit

# Terminal 2: Start UI
cd semstreams-ui && npm run dev
```

### Docker Development

```bash
# UI only (backend running elsewhere)
task dev:docker

# UI + Caddy (production-like)
task dev:with-caddy
```

### Type Checking & Linting

```bash
# Type checking
npm run check
task check

# Linting
npm run lint
task lint

# Formatting
npm run format
task format
```

## Testing

### Unit Tests (Vitest)

```bash
# Run unit tests
npm test
task test

# Watch mode
npm run test:ui

# Coverage
npm run test:coverage
```

All 31 component tests passing ✅

### E2E Tests (Playwright)

Playwright automatically manages a full Docker stack (NATS + backend + UI + Caddy):

```bash
# Run E2E tests (auto-manages Docker)
npm run test:e2e
task test:e2e

# Against specific backend
task test:e2e:semstreams
task test:e2e:semmem

# UI mode (interactive)
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Cleanup (if tests crash)
task clean
```

## Using SemStreams UI with Your Application

### Backend Requirements

Your SemStreams-based application must expose:

1. **OpenAPI Spec** at `/openapi.yaml` (or provide as file)
2. **Component Types** endpoint: `GET /components/types`
3. **Flow Management** endpoints:
   - `GET /flowbuilder/flows` - List flows
   - `POST /flowbuilder/flows` - Create flow
   - `GET /flowbuilder/flows/:id` - Get flow
   - `PUT /flowbuilder/flows/:id` - Update flow
   - `DELETE /flowbuilder/flows/:id` - Delete flow
4. **Health Check**: `GET /health`

### Integration Steps

1. **Build your SemStreams application** with the standard API
2. **Generate OpenAPI spec** using your backend's schema exporter:
   ```bash
   cd your-app && task schema:generate
   ```
3. **Generate TypeScript types**:
   ```bash
   cd semstreams-ui
   OPENAPI_SPEC_PATH=../your-app/specs/openapi.v3.yaml task generate-types
   ```
4. **Start your backend** (native or Docker)
5. **Start the UI**:
   ```bash
   BACKEND_URL=http://localhost:8080 npm run dev
   # or
   docker compose up
   ```

## Production Deployment

For production deployment, see the orchestration configuration in the main backend projects:

- **[semdocs](https://github.com/c360/semdocs)** - Documentation and examples project
- **[semstreams](https://github.com/c360/semstreams)** - Core stream processing framework

These projects include complete `docker-compose` files that orchestrate the full stack (backend services, NATS, and UI).

### Building the UI Image

This repository provides the UI Docker image for production use:

```bash
# Build the static UI image
docker build -t semstreams-ui:latest .

# Push to registry (if needed)
docker tag semstreams-ui:latest your-registry/semstreams-ui:latest
docker push your-registry/semstreams-ui:latest
```

The production image:

- Builds the static SPA using `adapter-static`
- Serves files via Caddy web server (~15MB total)
- Proxies API requests to backend via `BACKEND_URL` environment variable
- Includes health checks and security headers

### Environment Variables

The UI container accepts:

- `BACKEND_URL` - Backend service URL (default: `http://backend:8080`)

Example from backend project's docker-compose:

```yaml
services:
  ui:
    image: semstreams-ui:latest
    environment:
      - BACKEND_URL=http://backend:8080
    ports:
      - "3000:3000"
```

## Architecture

### Request Flow

```
Browser → Caddy → SvelteKit (SSR + Client) → Your Backend API
                                            → NATS KV
                                            → Components Registry
```

- **Caddy** proxies `/flowbuilder/*`, `/components/*`, `/health` to backend
- **SvelteKit SSR** transforms backend URLs via `hooks.server.ts`
- **Client-side** navigation using SvelteKit routing
- **Component Discovery** happens at runtime from `/components/types`

### Directory Structure

```
semstreams-ui/
├── src/
│   ├── lib/
│   │   ├── components/        # Generic Svelte 5 components
│   │   ├── services/          # API clients (backend-agnostic)
│   │   ├── types/             # TypeScript types (generated)
│   │   └── validation/        # Schema validation
│   ├── routes/                # SvelteKit routes
│   │   ├── +page.svelte       # Flow list
│   │   └── flows/[id]/        # Flow editor
│   └── hooks.server.ts        # SSR fetch transformation
├── e2e/                       # Playwright E2E tests
├── docker-compose.yml         # Development compose
├── docker-compose.e2e.yml     # E2E testing compose
├── Caddyfile                  # Reverse proxy config
├── .env                       # Backend configuration
└── Taskfile.yml              # Task commands
```

## Task Commands

### Development

- `task dev` - Start dev server (expects backend at localhost:8080)
- `task dev:docker` - Start UI in Docker
- `task dev:with-caddy` - Start UI + Caddy in Docker

### Type Generation

- `task generate-types` - Generate from configured spec
- `task generate-types:semstreams` - Generate from semstreams
- `task generate-types:semmem` - Generate from semmem
- `task generate-types:from-url` - Generate from running backend

### Testing

- `task test` - Run unit tests
- `task test:e2e` - Run E2E tests
- `task test:e2e:semstreams` - E2E against semstreams backend
- `task test:e2e:semmem` - E2E against semmem backend

### Cleanup

- `task clean` - Clean Docker volumes and containers

## Troubleshooting

### Backend Connection Issues

```bash
# Check backend is running
curl http://localhost:8080/health

# Check component discovery
curl http://localhost:8080/components/types

# Check OpenAPI spec
curl http://localhost:8080/openapi.yaml
```

### Type Generation Failures

```bash
# Verify spec path is correct
echo $OPENAPI_SPEC_PATH
ls -la $OPENAPI_SPEC_PATH

# Regenerate backend spec (if your backend supports it)
# cd /path/to/your-backend && <regenerate-command>

# Regenerate UI types
task generate-types
```

### Docker Port Conflicts

```bash
# Check what's running
docker ps

# Clean up all compose stacks
task clean

# Or manually
docker compose -f docker-compose.yml down -v
docker compose -f docker-compose.e2e.yml down -v
```

## CI/CD

The UI includes CI workflows for:

- Type checking and linting
- Unit tests (Vitest)
- E2E tests (Playwright with Docker)
- Contract validation (OpenAPI compliance)

See `.github/workflows/ci.yml` for details.

## Contributing

1. Create a branch
2. Make changes (keep backend-agnostic!)
3. Run checks: `task lint && task check && task test`
4. Run E2E: `task test:e2e`
5. Submit PR

## Documentation

- **[E2E_SETUP.md](./E2E_SETUP.md)** - End-to-end testing guide
- **[INTEGRATION_EXAMPLE.md](./INTEGRATION_EXAMPLE.md)** - How to integrate with your backend
- **[Taskfile.yml](./Taskfile.yml)** - Available tasks and commands

## Design Philosophy

**"Generic, not specific"** - This UI should work with ANY SemStreams application without modification. Backend-specific features belong in the backend, not the UI.

**"Runtime discovery over build-time coupling"** - The UI learns about components and schemas from the backend at runtime via OpenAPI, not compile-time dependencies.

**"Container-first distribution"** - The UI is designed to be deployed as a Docker container that can connect to any compatible backend.
