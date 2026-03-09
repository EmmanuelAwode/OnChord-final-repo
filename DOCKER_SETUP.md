# OnChord Docker Setup

This guide explains how to run OnChord using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) (included with Docker Desktop)

## Quick Start

1. **Copy environment file and configure:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `LASTFM_API_KEY` - Your Last.fm API key (optional, for genre lookups)

2. **Build and run:**
   ```bash
   docker compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - ML Service: http://localhost:8000

## Services

| Service | Port | Description |
|---------|------|-------------|
| frontend | 3000 | React/Vite frontend (production build served by Nginx) |
| ml-service | 8000 | FastAPI ML service for mood classification |

## Development Mode

To run the frontend with hot-reloading:

```bash
docker compose --profile dev up frontend-dev ml-service
```

This mounts your local source files and enables Vite's HMR at http://localhost:5173

## Commands

```bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# Rebuild after code changes
docker compose up --build

# Stop all services
docker compose down

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f frontend

# Shell into a container
docker compose exec ml-service bash
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│   ML Service    │
│  (React/Vite)   │     │   (FastAPI)     │
│   Port: 3000    │     │   Port: 8000    │
└────────┬────────┘     └─────────────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐
│    Supabase     │
│   (External)    │
└─────────────────┘
```

## Troubleshooting

### Build fails with npm errors
```bash
# Clear Docker cache and rebuild
docker compose build --no-cache
```

### ML service not starting
Check if models exist:
```bash
ls ml-service/models/
```

### Environment variables not working
Ensure `.env` file exists in project root (same directory as `docker-compose.yml`)

## Production Deployment

For production, consider:
1. Using Docker secrets instead of environment variables
2. Adding SSL/TLS termination (nginx or reverse proxy)
3. Setting up proper logging and monitoring
4. Using a container orchestrator (Kubernetes, ECS, etc.)
