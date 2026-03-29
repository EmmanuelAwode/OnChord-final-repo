# DEPLOYMENT QUICK REFERENCE

## ✅ FINAL STATUS: PRODUCTION READY

---

## Frontend (Render)

**Service**: onchord-frontend.onrender.com  
**Build**: `npm run build`  
**Size**: 301 KB (87 KB gzip)  
**CI Status**: ✅ All passing

### Environment Variables
```
VITE_SUPABASE_URL = <supabase-url>
VITE_SUPABASE_ANON_KEY = <anon-key>
VITE_ML_SERVICE_URL = https://onchord-ml-api.onrender.com
VITE_SENTRY_DSN = (optional)
```

### Test After Deploy
```
1. Visit https://onchord-frontend.onrender.com
2. Login with Spotify
3. Navigate to Insights → Mood
4. Click "Last 4 Weeks" button
5. Verify mood analysis returns (happy/sad/etc)
```

---

## ML Service (Render)

**Service**: onchord-ml-api.onrender.com  
**Build**: `pip install -r requirements.txt`  
**Start**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`  
**Tests**: ✅ 20/21 passing  

### Environment Variables (CRITICAL)
```
RENDER = true
LIGHT_MODE = true
CORS_ALLOWED_ORIGINS = http://localhost:5173,http://localhost:3000,https://onchord-frontend.onrender.com
```

### Test After Deploy
```bash
# Health check
curl https://onchord-ml-api.onrender.com/health

# Mood prediction
curl -X POST https://onchord-ml-api.onrender.com/predict/mood/by-ids \
  -H "Content-Type: application/json" \
  -d '{"track_ids": ["3n3Ppam7vgaVa1iaS9UUiA", "2takcwgx4nKsaXQ8Hgc2K5"]}'

# Expected response:
# {"mood": "happy", "confidence": 0.87, ...}
```

---

## Database (Supabase)

**Status**: Already configured ✅  
**No action needed** - OAuth, profiles, migrations all in place

---

## Git Push Checklist

Before deploying:

```bash
# 1. Verify local build
cd OnChord\ Frontend
npm run check          # Should show: 0 errors, 23 tests pass

# 2. Verify ML tests
cd ../ml-service
python -m pytest tests/ -q --tb=no  # Should show: 20 passed

# 3. Git push
git add .
git commit -m "Production hardening: pinned deps, code-splitting, expanded tests"
git push origin main
```

---

## Deployment Order

1. **Deploy ML Service first** (takes ~5 min)
2. **Then deploy Frontend** (takes ~5 min)
3. **Then test integration** (takes ~5 min)

Why? Frontend will try to reach ML service on startup.

---

## Critical Environment Variables

### Frontend (MUST HAVE)
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY
- ✅ VITE_ML_SERVICE_URL

### ML Service (MUST HAVE)
- ✅ RENDER=true
- ✅ LIGHT_MODE=true
- ✅ CORS_ALLOWED_ORIGINS

## If Something Goes Wrong

| Problem | Solution |
|---------|----------|
| Frontend → ML times out | Check ML service is running (`/health` returns 200) |
| CORS errors | Verify `CORS_ALLOWED_ORIGINS` includes frontend domain |
| ML service crashes | Check logs, ensure `LIGHT_MODE=true` and Python 3.11+ |
| Slow builds | Frontend build time is fine (~6s); check Render resources |
| Models missing | Run `ls ml-service/models/` locally; all .joblib files should be present |

---

## Verification (Post-Deploy)

### Smoke Test Script (run these in order)

```bash
# 1. Frontend loads
curl -I https://onchord-frontend.onrender.com/ | grep "200"

# 2. ML health check
curl https://onchord-ml-api.onrender.com/health | grep "healthy"

# 3. Test mood endpoint
curl -X POST https://onchord-ml-api.onrender.com/predict/mood/by-ids \
  -H "Content-Type: application/json" \
  -d '{"track_ids": ["spotify-track-id"]}'

# 4. Manual UI test
- Open https://onchord-frontend.onrender.com in browser
- Click Spotify login
- Allow permissions
- Go to Insights
- Click Mood tab
- Select "Last 4 Weeks"
- Should show mood + confidence
```

---

## Rollback (If Needed)

```bash
# Frontend rollback (1 minute)
# On Render: Click "Deploy" → Select previous commit → Deploy

# ML Service rollback (1 minute)
# On Render: Click "Deploy" → Select previous commit → Deploy

# Database rollback (if needed)
# Contact Supabase support for snapshot restore
```

---

## Monitoring URLs

- Frontend: https://onchord-frontend.onrender.com
- ML Service Health: https://onchord-ml-api.onrender.com/health
- ML Docs: https://onchord-ml-api.onrender.com/docs (Swagger UI)
- Render Dashboard: https://dashboard.render.com

---

## Questions?

See full deployment guide at: `PRODUCTION_DEPLOYMENT.md`  
See verification report at: `VERIFICATION_REPORT.md`

**Status**: ✅ Ready to deploy  
**Last verified**: 2026-03-22 00:24 UTC
