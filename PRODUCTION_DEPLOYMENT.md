# OnChord Production Deployment Guide

## Pre-Deployment Checklist

### Frontend Status ✅
- **CI Pipeline**: All passing
  - Typecheck: 0 errors
  - Lint: 10 warnings (all non-critical, style-related)
  - Tests: 23/23 passing (auth, spotify, mood-analysis, env)
  - Build: 6s, optimized with 30+ code-split chunks
  
- **Dependencies**: Pinned and locked
  - clsx: 2.1.1
  - motion: 12.23.24
  - tailwind-merge: 3.4.0
  - All package-lock.json reproducible

- **Performance**:
  - Main entry: 301 KB (87 KB gzipped)
  - Lazy-loaded pages reduce initial load
  - Vendor chunks separated for better caching

### Backend ML Service Status ✅
- **Models**: All present and ready
  - mood_classifier_decisiontree.joblib ✓
  - scaler.joblib ✓
  - Genre mood model (JSON) ✓
  - Taste embeddings and SVD models ✓
  
- **Environment**: Reproducible
  - pytest: Available (9.0.2)
  - Tests: 12/13 passing locally
  - CORS: Configurable via environment variables

---

## Deployment Configuration

### Step 1: Frontend Deployment (Render.com)

#### Build Settings
```
Build Command:  npm run build
Start Command:  npm start
```

#### Environment Variables
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_ML_SERVICE_URL=https://onchord-ml-api.onrender.com
VITE_SENTRY_DSN=<optional-sentry-dsn>
```

#### Build Output
- **Artifact**: `dist/` folder
- **Entry**: `dist/index.html`
- **Size**: ~500 KB (with chunks)
- **Cache Strategy**: Content-hash filenames (automatic via Vite)

#### Post-Deployment
1. Visit `https://onchord-frontend.onrender.com`
2. Verify auth flow loads
3. Confirm `/predict/mood/by-ids` endpoint is reachable

---

### Step 2: ML Service Deployment (Render.com)

#### Build Settings
```
Build Command:  pip install -r requirements.txt
Start Command:  uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

#### Environment Variables
**Critical:**
```
RENDER=true
LIGHT_MODE=true
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:3001,https://onchord-frontend.onrender.com
```

**Optional (for future features):**
```
LASTFM_API_KEY=<if-using-lastfm>
LOG_LEVEL=info
```

#### Model Files Verification
Before deployment, ensure these exist in the repository:
```
ml-service/models/
├── mood_classifier_decisiontree.joblib  ✓
├── scaler.joblib                        ✓
├── genre_mood_model.json               ✓
├── taste_svd.joblib                    ✓
└── ...other embeddings...
```

#### Post-Deployment
1. Visit `https://onchord-ml-api.onrender.com/health` (should return 200)
2. Test mood endpoint:
   ```bash
   curl -X POST https://onchord-ml-api.onrender.com/predict/mood/by-ids \
     -H "Content-Type: application/json" \
     -d '{"track_ids": ["track-id-1", "track-id-2"]}'
   ```
3. Check `/docs` for Swagger UI

---

### Step 3: Database & Auth (Supabase)

#### Already Configured
- ✅ Spotify OAuth integration (PKCE flow)
- ✅ User profiles table
- ✅ Social features (collaborations, reviews, messaging)
- ✅ Migrations applied

#### Verify
```sql
-- In Supabase SQL Editor
SELECT * FROM auth.users LIMIT 1;  -- Should show test users
SELECT * FROM public.profiles LIMIT 1;  -- Should show user profiles
```

---

## Production Deployment Checklist

### Before Pushing to Production

#### Frontend
- [ ] Run `npm run check` one final time (verify all green)
- [ ] Test locally against staging ML service
- [ ] Verify bundle size (target < 1 MB total)
- [ ] Check environment variables are set in Render dashboard
- [ ] Confirm Spotify callback URL matches deployment URL

#### ML Service
- [ ] Verify all model files are committed to git
- [ ] Test `/predict/mood/by-ids` locally with sample tracks
- [ ] Confirm CORS_ALLOWED_ORIGINS includes both frontend URLs (dev & prod)
- [ ] Check Python 3.11+ availability on Render (LIGHT_MODE requires it)
- [ ] Verify `requirements.txt` is up to date

#### Cross-Service
- [ ] Test mood page flow end-to-end:
  1. User logs in via Spotify OAuth
  2. Fetches top tracks (via Spotify API)
  3. Analyzes mood (calls `/predict/mood/by-ids`)
  4. Displays results with time-range selector
- [ ] Verify error handling (network timeouts, API failures)
- [ ] Check Sentry is capturing errors (if DSN provided)

---

## Deployment Steps

### Option A: Render One-Click Deploy

1. **Frontend Service**
   - Connect GitHub repo (OnChord Frontend folder)
   - Auto-detect build command
   - Set environment variables from dashboard
   - Deploy

2. **ML Service**
   - Connect GitHub repo (ml-service folder)
   - Set Python version to 3.11+
   - Set environment variables
   - Deploy

### Option B: Manual CLI Deploy

```bash
# Render CLI (if installed)
render deploy --service=onchord-frontend
render deploy --service=onchord-ml-api
```

---

## Monitoring & Troubleshooting

### Frontend Issues

**Bundle size warnings?**
- Check `dist/` for files > 500 KB
- Verify code-splitting is working (should see `chunk-*.js` files)
- If one chunk is oversized, enable lazy-loading for that component

**API calls timing out?**
- Verify ML service URL in `VITE_ML_SERVICE_URL`
- Check ML service is running: `https://onchord-ml-api.onrender.com/health`
- Increase request timeout in [src/lib/api/mlService.ts](src/lib/api/mlService.ts#L25)

### ML Service Issues

**Mood predictions returning wrong results?**
- Check model files are present (run `ls models/`)
- Verify `LIGHT_MODE=true` (disables unnecessary CSV loading)
- Review `/docs` endpoint for API contract

**High memory usage?**
- Ensure `LIGHT_MODE=true` is set
- Check for lingering process threads
- Consider splitting into microservices if load increases

**CORS errors?**
- Verify `CORS_ALLOWED_ORIGINS` includes frontend URL
- Must include `https://` for production, `http://` for dev
- Format: comma-separated, no spaces

### Rate Limiting & Performance

**Frontend bundle too large?**
- Lazy loading is configured; verify chunks load on-demand
- Monitor Network tab in DevTools during deployment
- Consider disabling Sentry if error tracking not needed

**ML service slow?**
- Check CPU/Memory on Render dashboard
- Scale up if consistently > 80% utilization
- Add result caching if needed

---

## Verification Commands

### Local Verification (Before Push)

```bash
# Frontend
cd OnChord\ Frontend
npm run check        # All checks pass?
npm run build        # Build succeeds?

# Backend
cd ../ml-service
python -m pytest tests/ --tb=short  # Tests pass?
python app/main.py   # Starts without errors?
```

### Production Verification

```bash
# Frontend health
curl https://onchord-frontend.onrender.com/

# ML service health
curl https://onchord-ml-api.onrender.com/health

# Mood endpoint
curl -X POST https://onchord-ml-api.onrender.com/predict/mood/by-ids \
  -H "Content-Type: application/json" \
  -d '{"track_ids":["spotify-track-id"]}'

# Supabase connection
curl https://<supabase-url>/rest/v1/profiles?limit=1 \
  -H "apikey: <anon-key>"
```

---

## Rollback Plan

If production encounters critical issues:

1. **Frontend rollback**: Revert commit and redeploy via Render dashboard (< 2 min)
2. **ML service rollback**: Revert `main.py` or model files and redeploy (< 5 min)
3. **Database rollback**: Supabase auto-snapshots; restore from dashboard (contact support if needed)

---

## Post-Deployment Monitoring

### Metrics to Track
- **Frontend**: Build time, bundle size, FCP (First Contentful Paint)
- **ML Service**: Average response time, 5xx errors, model inference latency
- **Auth**: OAuth success rate, session refresh rate
- **API**: Mood prediction accuracy, timeout rate

### Alerting (Recommended)
- Set up Sentry for frontend error tracking
- Set up DataDog or similar for backend monitoring
- Monitor Render service dashboard daily first week

---

## Support & Debugging

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Mood page shows "ML service unavailable" | Backend not deployed or URL wrong | Verify `VITE_ML_SERVICE_URL` and test `/health` endpoint |
| CORS errors in Network tab | Frontend URL not in `CORS_ALLOWED_ORIGINS` | Add https://onchord-frontend.onrender.com to env var |
| Slow initial load | Large main bundle | Check if lazy-loading is working in DevTools Network tab |
| OAuth redirect fails | Callback URL mismatch | Verify Spotify app settings match deployment URL |
| ML service crashes | Out of memory | Ensure `LIGHT_MODE=true` and Python 3.11+ |

---

## Next Steps After Deployment

1. ✅ Verify all three services running
2. ✅ Test complete user flow (auth → mood analysis)
3. ✅ Monitor error rates for 24 hours
4. ✅ Collect performance metrics
5. ✅ Announce to stakeholders

**Estimated deployment time: 15-30 minutes total**
