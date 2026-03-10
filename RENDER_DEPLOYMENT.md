# 🚀 Deploying OnChord to Render

This guide walks you through deploying OnChord so others can try it out.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         RENDER                               │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   Static Site       │    │      Web Service            │ │
│  │   (Frontend)        │───▶│      (ML Service)           │ │
│  │   React/Vite        │    │      FastAPI/Python         │ │
│  │   onchord.onrender  │    │   onchord-ml.onrender.com   │ │
│  └──────────┬──────────┘    └─────────────────────────────┘ │
└─────────────┼───────────────────────────────────────────────┘
              │
              ▼
     ┌────────────────────┐
     │     SUPABASE       │  (Already cloud-hosted)
     │  - PostgreSQL DB   │
     │  - Auth            │
     │  - Real-time       │
     └────────────────────┘
```

---

## Prerequisites

1. **GitHub Account** - Push your code to GitHub
2. **Render Account** - Sign up at [render.com](https://render.com) (free tier available)
3. **Spotify Developer App** - Already set up
4. **Supabase Project** - Already set up

---

## Option 1: One-Click Deploy (Recommended)

### Step 1: Push to GitHub

```bash
# Make sure you're in the OnChord-repo folder
cd "OnChord-repo"

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Render deployment"

# Add your GitHub repo as remote
git remote add origin https://github.com/YOUR_USERNAME/onchord.git

# Push
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repo
4. Render will detect `render.yaml` and show 2 services:
   - `onchord-frontend` (Static Site)
   - `onchord-ml-service` (Web Service)
5. Click **"Apply"**

### Step 3: Configure Environment Variables

After deployment starts, go to each service and add environment variables:

#### For `onchord-ml-service`:
| Variable | Value |
|----------|-------|
| `LASTFM_API_KEY` | Your Last.fm API key (optional, for enhanced features) |

#### For `onchord-frontend`:
| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://kyhvtuxtrdhizizkqqrb.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_Qw0BH5ZoZgEVOsZ8HHXXJA_5jHqQHPw` |
| `VITE_SPOTIFY_CLIENT_ID` | `9035284e549f4dfcb4aea82c19969525` |
| `VITE_SPOTIFY_REDIRECT_URI` | `https://YOUR-FRONTEND.onrender.com/settings` |
| `VITE_TICKETMASTER_API_KEY` | `ABFNsBG8qs4JrpgELIeIJHAMoPd6IrQ7` |
| `VITE_ML_SERVICE_URL` | `https://YOUR-ML-SERVICE.onrender.com` |

> ⚠️ Replace `YOUR-FRONTEND` and `YOUR-ML-SERVICE` with your actual Render URLs!

---

## Option 2: Manual Deployment

### Deploy ML Service First

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `onchord-ml-service`
   - **Root Directory**: `ml-service`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
5. Click **"Create Web Service"**
6. Copy the URL (e.g., `https://onchord-ml-service.onrender.com`)

### Deploy Frontend

1. Click **"New"** → **"Static Site"**
2. Connect the same GitHub repo
3. Configure:
   - **Name**: `onchord-frontend`
   - **Root Directory**: `OnChord Frontend`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`
4. Add environment variables (see table above)
5. Click **"Create Static Site"**

---

## Step 4: Update Spotify Developer Settings

**CRITICAL**: Update your Spotify app's redirect URI!

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Click **"Settings"**
4. Under **Redirect URIs**, add:
   ```
   https://YOUR-FRONTEND.onrender.com/settings
   ```
5. Save changes

---

## Step 5: Test Your Deployment

1. Visit your frontend URL: `https://YOUR-FRONTEND.onrender.com`
2. Create an account or log in
3. Connect Spotify in Settings
4. Create some reviews
5. Test taste matching on user profiles

---

## Troubleshooting

### Frontend shows blank page
- Check browser console for errors
- Verify all `VITE_*` environment variables are set
- Trigger a manual redeploy after adding env vars

### ML Service returns errors
- Check service logs in Render dashboard
- Verify the health endpoint: `https://YOUR-ML-SERVICE.onrender.com/health`

### Spotify login fails
- Verify redirect URI matches EXACTLY (including https://)
- Check that your Spotify app is in Development mode

### Free Tier Spin-Down
- Render free tier "spins down" after 15 min of inactivity
- First request after sleep takes ~30 seconds
- Consider upgrading to paid plan for instant responses

---

## Sharing with Others

Once deployed, share your frontend URL:
```
https://YOUR-FRONTEND.onrender.com
```

### Demo Accounts (Already Seeded)
Password for all: `TestPassword123!`

| Username | Style |
|----------|-------|
| `hiphop_alex` | Hip-hop (Kendrick, Drake, J. Cole) |
| `hiphop_jordan` | Hip-hop (similar to alex - high match!) |
| `metal_mike` | Metal (Slayer, Megadeth, Pantera) |
| `ambient_lisa` | Ambient (Brian Eno, Nils Frahm) |
| `indie_emma` | Indie (Radiohead, Phoebe Bridgers) |
| `jazz_marcus` | Jazz (Coltrane, Miles Davis) |

---

## Cost Estimate

| Service | Plan | Cost |
|---------|------|------|
| Render Static Site | Free | $0 |
| Render Web Service | Free | $0 |
| Supabase | Free | $0 |
| Spotify API | Free | $0 |
| **Total** | | **$0/month** |

> Note: Free tier has limitations (spin-down, bandwidth). Upgrade for production use.

---

## Quick Reference

After deployment, your URLs will be:
- **Frontend**: `https://onchord-frontend.onrender.com` (or custom name)
- **ML API**: `https://onchord-ml-service.onrender.com`
- **API Docs**: `https://onchord-ml-service.onrender.com/docs`
