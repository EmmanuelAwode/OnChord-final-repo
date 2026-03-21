# OnChord Pre-Deploy Checklist

This checklist is ordered by launch priority, not by subsystem.

## Phase 0: Must Fix Before Launch

### 1. Resolve ML production mode
- Priority: Critical
- Effort: 2 to 4 hours
- Goal: Ensure production does not silently disable core ML-driven features.
- Actions:
- Decide whether Render should run full ML models or a graceful fallback mode.
- If keeping `LIGHT_MODE=true`, hide or downgrade taste matching and mood features in the frontend when health checks show degraded capability.
- If enabling full ML in production, verify memory usage and cold start performance.
- Files:
- [render.yaml](render.yaml)
- [ml-service/app/main.py](ml-service/app/main.py)

### 2. Remove auth bootstrap timeout hack
- Priority: Critical
- Effort: 3 to 5 hours
- Goal: Prevent false-ready auth state and intermittent login/session bugs.
- Actions:
- Replace the 3 second forced ready timeout with explicit auth initialization states.
- Separate these states: `auth loading`, `authenticated`, `unauthenticated`, `callback processing`.
- Only render protected screens after session and profile bootstrap complete.
- Add a visible recovery path if auth initialization fails.
- Files:
- [OnChord Frontend/src/App.tsx](OnChord%20Frontend/src/App.tsx)

### 3. Add centralized error monitoring
- Priority: Critical
- Effort: 2 to 4 hours
- Goal: Make production failures observable.
- Actions:
- Add Sentry or equivalent to frontend and ML service.
- Capture uncaught exceptions, rejected promises, API failures, and route-level crashes.
- Add release/environment tagging for `local`, `staging`, and `production`.
- Replace noisy debug `console.log` calls in auth and external API flows with structured logging.
- Files:
- [OnChord Frontend/src/App.tsx](OnChord%20Frontend/src/App.tsx)
- [OnChord Frontend/src/components/AuthPage.tsx](OnChord%20Frontend/src/components/AuthPage.tsx)
- [ml-service/app/main.py](ml-service/app/main.py)

### 4. Add API timeouts and schema validation
- Priority: High
- Effort: 3 to 5 hours
- Goal: Fail safely when ML or third-party services are slow or malformed.
- Actions:
- Add a shared fetch wrapper with timeout and normalized error handling.
- Validate ML responses with Zod before the UI consumes them.
- Show user-facing fallback states when APIs are unavailable.
- Apply this first to ML, Spotify, Ticketmaster, and Songlink clients.
- Files:
- [OnChord Frontend/src/lib/api/mlService.ts](OnChord%20Frontend/src/lib/api/mlService.ts)
- [OnChord Frontend/src/lib/api/spotify.ts](OnChord%20Frontend/src/lib/api/spotify.ts)
- [OnChord Frontend/src/lib/api/ticketmaster.ts](OnChord%20Frontend/src/lib/api/ticketmaster.ts)
- [OnChord Frontend/src/lib/api/songlink.ts](OnChord%20Frontend/src/lib/api/songlink.ts)

### 5. Validate environment variables at startup
- Priority: High
- Effort: 1 to 2 hours
- Goal: Fail fast on broken deployments.
- Actions:
- Add a small env validation module for frontend startup.
- Validate required Supabase, Spotify, ML, and Ticketmaster configuration.
- Add equivalent checks for ML service env vars.
- Files:
- [OnChord Frontend/src/lib/supabaseClient.ts](OnChord%20Frontend/src/lib/supabaseClient.ts)
- [render.yaml](render.yaml)
- [ml-service/app/main.py](ml-service/app/main.py)

## Phase 1: Strongly Recommended Before Public Release

### 6. Add minimum CI quality gates
- Priority: High
- Effort: 4 to 8 hours
- Goal: Stop regressions before they ship.
- Actions:
- Add frontend linting and a `typecheck` script.
- Add at least one Playwright smoke flow for auth, review creation, and collaborative playlist open/delete/invite.
- Run ML tests in CI.
- Make build plus tests mandatory before deployment.
- Files:
- [OnChord Frontend/package.json](OnChord%20Frontend/package.json)
- [ml-service/tests/test_ml_models.py](ml-service/tests/test_ml_models.py)

### 7. Tighten CORS and token-handling boundaries
- Priority: High
- Effort: 1 to 3 hours
- Goal: Reduce unnecessary exposure on Supabase functions.
- Actions:
- Replace wildcard CORS with known frontend origins where possible.
- Review whether Spotify-related edge functions need stricter origin and method controls.
- Confirm auth headers are required for every token refresh/code exchange path.
- Files:
- [supabase/functions/spotify-refresh/index.ts](supabase/functions/spotify-refresh/index.ts)
- [supabase/functions/spotify-callback/index.ts](supabase/functions/spotify-callback/index.ts)
- [supabase/functions/ticketmaster-proxy/index.ts](supabase/functions/ticketmaster-proxy/index.ts)

### 8. Add graceful degraded states for external services
- Priority: High
- Effort: 2 to 4 hours
- Goal: Keep the app usable when dependencies fail.
- Actions:
- For ML down: disable insights widgets cleanly and explain why.
- For Spotify down: preserve browsing/reviewing where possible.
- For Ticketmaster down: show retry state and fallback copy, not empty screens.
- Add retry buttons for recoverable failures.
- Files:
- [OnChord Frontend/src/components/TasteMatchingPage.tsx](OnChord%20Frontend/src/components/TasteMatchingPage.tsx)
- [OnChord Frontend/src/components/InsightsPage.tsx](OnChord%20Frontend/src/components/InsightsPage.tsx)
- [OnChord Frontend/src/components/EventsPage.tsx](OnChord%20Frontend/src/components/EventsPage.tsx)

### 9. Fix documentation drift
- Priority: Medium
- Effort: 1 hour
- Goal: Prevent avoidable setup and deployment mistakes.
- Actions:
- Update backend docs to use `playlist_collaborators`, not `playlist_contributors`.
- Fix frontend README typo `npm ipm` to `npm install`.
- Add a single source of truth for production env vars and migration order.
- Files:
- [BACKEND_SETUP.md](BACKEND_SETUP.md)
- [OnChord Frontend/README.md](OnChord%20Frontend/README.md)

### 10. Add rollout and rollback procedure
- Priority: Medium
- Effort: 1 to 2 hours
- Goal: Make deployment repeatable.
- Actions:
- Document migration order.
- Document how to verify edge functions after deploy.
- Document how to revert frontend and ML deploys independently.
- Add a post-deploy smoke checklist.
- Files:
- [render.yaml](render.yaml)
- [MIGRATION_STATUS.md](MIGRATION_STATUS.md)

## Phase 2: Nice To Have Before Marketing Push

### 11. Strengthen frontend UX around empty/loading/error states
- Priority: Medium
- Effort: 3 to 6 hours
- Goal: Make the product feel intentional for first-time users.
- Actions:
- Audit no-data states across Home, Reviews, Events, Messages, and Collaborative Playlists.
- Replace passive empty cards with guided actions.
- Ensure every long-running action has loading and success/failure feedback.
- Files:
- [OnChord Frontend/src/components/HomePage.tsx](OnChord%20Frontend/src/components/HomePage.tsx)
- [OnChord Frontend/src/components/ReviewsPage.tsx](OnChord%20Frontend/src/components/ReviewsPage.tsx)
- [OnChord Frontend/src/components/EventsPage.tsx](OnChord%20Frontend/src/components/EventsPage.tsx)
- [OnChord Frontend/src/components/CollaborativePlaylistPage.tsx](OnChord%20Frontend/src/components/CollaborativePlaylistPage.tsx)

### 12. Add one or two sticky engagement features
- Priority: Medium
- Effort: 1 to 3 days depending on scope
- Best candidates:
- Release radar on Home with friend overlap context.
- Shareable taste profile card.
- Review drafts/autosave.
- Presence cues in collaborative playlists.

## Pre-Deploy Verification Runbook

### Database and backend
- Run all pending Supabase migrations in order.
- Verify tables and policies added by the latest migrations exist.
- Verify Spotify edge functions are deployed and return expected responses.
- Verify ML `/health` returns expected capability state.

### Frontend
- Run production build locally.
- Validate auth flows: email sign-in, social sign-in, sign-out, refresh, password reset.
- Validate review creation/edit/delete for both album and single flows.
- Validate review visibility: public, friends, private.
- Validate collaborative playlist create, invite, accept, chat, add tracks, delete.
- Validate notifications for invite, comment, and message flows.

### Third-party integrations
- Verify Spotify connection, refresh, and expired-token recovery.
- Verify Ticketmaster proxy responses and rate behavior.
- Verify Songlink/open-in-app behavior on mobile and desktop.

### Production sanity checks after deploy
- Create a fresh user account.
- Complete onboarding.
- Create one review.
- Like/comment on a review from a second account.
- Create and delete one collaborative playlist.
- Trigger at least one notification.
- Open Insights and Taste Matching screens.

## Recommended Execution Order

1. Fix auth initialization.
2. Decide ML production strategy.
3. Add monitoring.
4. Add API timeout and validation layer.
5. Add env validation.
6. Tighten docs and rollout procedure.
7. Add CI smoke coverage.
8. Polish degraded and empty states.
9. Add one retention-focused UI feature.

## Ship Decision Rule

Do not publicly launch until all Phase 0 items are done and at least items 6, 8, and 9 from Phase 1 are complete.