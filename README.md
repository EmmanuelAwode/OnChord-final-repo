# OnChord Final Year Project

OnChord is a music-focused social web app for discovering music, writing reviews, building collaborative playlists, and comparing music taste with an ML-assisted service.

## Main Features

- User auth and profile management with Supabase
- Music reviews with reactions and comments
- Public and friends feed experiences
- Favorites and custom lists
- Collaborative playlists with invites, contributors, and live track updates
- Spotify integration for account connection and listening insights
- Event discovery integration (Ticketmaster)
- Taste-matching and music personality endpoints from the ML service

## Project Structure

- OnChord Frontend: React, TypeScript, Vite app
- supabase: SQL migrations and edge function folders
- ml-service: FastAPI service for taste matching and mood logic
- docker-compose.yml: Full stack container orchestration

## Prerequisites

- Node.js 18+
- npm 9+
- Python 3.10+ (for ML service)
- Optional: Docker Desktop for containerized runs

## Environment Setup

Use the root env template as your source of truth:

- .env.example

For local frontend development, ensure these values exist in OnChord Frontend/.env:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_SPOTIFY_CLIENT_ID
- VITE_TICKETMASTER_API_KEY
- VITE_ML_SERVICE_URL

For ML service local development, set LASTFM_API_KEY in ml-service/.env (or export it in your shell).

## Run Locally (Frontend)

1. Open a terminal in OnChord Frontend
2. Install dependencies
3. Start Vite

Commands:

```powershell
npm install
npm run dev
```

App URL:

- http://127.0.0.1:3001/

## Run Locally (ML Service)

1. Open a terminal in ml-service
2. Create/activate a virtual environment
3. Install requirements
4. Start FastAPI with uvicorn

Commands:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

ML API URL:

- http://127.0.0.1:8000/

## Run With Docker

From repo root:

```powershell
docker compose up --build
```

Default ports:

- Frontend: http://localhost:3000
- ML service: http://localhost:8000

## Helpful Scripts

- OnChord Frontend/scripts/test-taste-matching.ts: local taste-matching validation helper
- scripts/set-supabase-allowed-origins.ps1: helper for allowed origins setup

## Submission Notes

- Keep source, migrations, and required assets
- Exclude generated build artifacts and dependency folders when creating a zip
- Ensure environment values are valid before demo/testing
