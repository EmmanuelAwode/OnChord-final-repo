# OnChord Deployment Runbook

Use this checklist for every production deploy.

## 1. Pre-Deploy

### Verify required environment variables
- Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SPOTIFY_CLIENT_ID`
- `VITE_SPOTIFY_REDIRECT_URI`
- `VITE_ML_SERVICE_URL`
- Optional:
- `VITE_TICKETMASTER_API_KEY`
- `VITE_SENTRY_DSN`
- `VITE_APP_ENV`
- `VITE_SENTRY_TRACES_SAMPLE_RATE`
- ML service:
- `LIGHT_MODE`
- `LASTFM_API_KEY` (optional)
- Supabase edge functions:
- `ALLOWED_ORIGINS` as a comma-separated list of trusted frontend origins, for example `https://onchord-frontend.onrender.com,http://localhost:3001`

### Set edge-function CORS secret
- Run once per environment:
- `./scripts/set-supabase-allowed-origins.ps1 -AllowedOrigins "https://onchord-frontend.onrender.com,http://localhost:3001"`
- If not logged in with Supabase CLI, run `supabase login` first or set `SUPABASE_ACCESS_TOKEN`.

### Build checks
- Frontend: `npm run build`
- ML service: ensure `/health` is healthy in the target environment

### Migration checks
- Apply Supabase SQL migrations in numeric order from `supabase/migrations`.
- Verify new tables/policies/columns in Supabase dashboard after migration.

## 2. Deploy Sequence

1. Deploy ML service first.
2. Validate ML `/health` response.
3. Deploy frontend.
4. Validate frontend can reach ML service and Supabase.
5. Deploy Supabase edge functions (`spotify-callback`, `spotify-refresh`, `ticketmaster-proxy`) if changed.

## 3. Post-Deploy Smoke Test

### Auth
- Sign in with email/password.
- Sign in with Spotify and Google.
- Sign out and refresh.

### Reviews
- Create a single review and an album review.
- Edit review visibility (`public`, `friends`, `private`).
- Delete review.

### Collaborative playlists
- Create playlist.
- Invite collaborator.
- Accept invite.
- Add track and post message.
- Delete playlist as owner.

### Integrations
- Spotify connection and token refresh path.
- Taste matching page loads and shows advanced/basic mode correctly.
- Mood analysis page loads and handles restricted mode gracefully.
- Ticketmaster event loading works.

## 4. Rollback Procedure

### Frontend rollback
1. In Render, open the frontend service.
2. Roll back to the previous successful deploy.
3. Re-run smoke tests for auth and reviews.

### ML service rollback
1. In Render, open the ML service.
2. Roll back to the previous successful deploy.
3. Verify `/health` and retry taste/mood flows.

### Database rollback
- Prefer forward-fix migrations.
- If emergency rollback is required, run a tested down migration script in Supabase SQL editor.
- Never manually delete production tables as rollback.

## 5. Incident Notes Template

- Timestamp:
- Environment:
- Symptom:
- Scope:
- Root cause:
- Mitigation:
- Permanent fix:
