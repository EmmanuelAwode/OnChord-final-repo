# Spotify OAuth Integration - Setup Guide

## 🎵 What You've Built

A complete Spotify OAuth integration that allows users to:
- Connect their Spotify account securely
- Search for albums, tracks, and artists
- Access their listening history and top tracks
- Enable future features like taste matching

## 📁 Files Created

### Backend (Supabase)
```
supabase/
├── migrations/
│   └── 001_spotify_integration.sql    # Database tables
└── functions/
    ├── spotify-callback/
    │   └── index.ts                   # OAuth token exchange
    └── spotify-refresh/
        └── index.ts                   # Token refresh handler
```

### Frontend
```
OnChord Frontend/src/lib/api/
└── spotify.ts                         # Spotify API client

Updated:
- SettingsPage.tsx                     # Added Spotify connect/disconnect UI
- .env                                 # Added Spotify env variables
```

---

## 🚀 Setup Instructions

### Step 1: Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create App"
3. Fill in:
   - **App name**: OnChord
   - **App description**: Music review and social platform
   - **Redirect URI**: `http://localhost:5173/settings?tab=account`
   - **Which API/SDKs are you planning to use?**: Web API
4. Agree to terms and click "Save"
5. Copy your **Client ID** and **Client Secret**

### Step 2: Configure Environment Variables

#### Frontend (.env)
Update `OnChord Frontend/.env`:
```env
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/settings?tab=account
```

#### Supabase Edge Functions
In your Supabase dashboard:
1. Go to **Edge Functions** → **Manage secrets**
2. Add these secrets:
   ```
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   SPOTIFY_REDIRECT_URI=http://localhost:5173/settings?tab=account
   ```

### Step 3: Create Database Tables

1. Open Supabase SQL Editor
2. Run the migration file: `supabase/migrations/001_spotify_integration.sql`
3. This creates:
   - `spotify_connections` table
   - `user_spotify_tracks` table (for caching)
   - Row Level Security policies

### Step 4: Deploy Edge Functions

Install Supabase CLI if you haven't:
```bash
npm install -g supabase
```

Login to Supabase:
```bash
supabase login
```

Link your project:
```bash
cd "c:\Users\colli\Downloads\OnChord Web App"
supabase link --project-ref kyhvtuxtrdhizizkqqrb
```

Deploy the functions:
```bash
supabase functions deploy spotify-callback
supabase functions deploy spotify-refresh
```

### Step 5: Test the Integration

1. Start your frontend dev server:
   ```bash
   cd "OnChord Frontend"
   npm run dev
   ```

2. Navigate to **Settings → Account tab**

3. Click **Connect** next to Spotify

4. Authorize the app on Spotify

5. You should see "Connected" with your Spotify display name

---

## 🔧 How It Works

### OAuth Flow
```
1. User clicks "Connect Spotify"
   ↓
2. Redirects to Spotify authorization page
   ↓
3. User authorizes → Spotify redirects back with code
   ↓
4. Frontend calls Edge Function with code
   ↓
5. Edge Function exchanges code for tokens
   ↓
6. Tokens stored in Supabase (encrypted)
   ↓
7. User can now access Spotify API
```

### Token Refresh
- Tokens expire after 1 hour
- `spotify-refresh` function automatically refreshes when needed
- Called before every Spotify API request

### Available API Functions

In `src/lib/api/spotify.ts`:

```typescript
// OAuth
initiateSpotifyLogin()              // Start OAuth flow
handleSpotifyCallback(code)         // Exchange code for tokens
getSpotifyConnection()              // Check connection status
disconnectSpotify()                 // Remove connection

// Spotify API
spotifySearch(query, type)          // Search albums/tracks/artists
getUserTopTracks(timeRange)         // Get user's top tracks
getUserTopArtists(timeRange)        // Get user's top artists
getAlbum(albumId)                   // Get album details
getTrack(trackId)                   // Get track details
getTrackAudioFeatures(trackId)      // Get audio features (for ML)
getRecentlyPlayed(limit)            // Get recently played
```

---

## 📝 Next Steps

### 1. Update Search Page
Replace mock data with real Spotify search:
```typescript
import { spotifySearch } from "../lib/api/spotify";

const results = await spotifySearch(searchQuery, "album");
```

### 2. Create Review from Spotify
Allow users to search Spotify when creating reviews.

### 3. Sync User's Top Tracks
Store user's top tracks in `user_spotify_tracks` table for taste matching.

### 4. Enable Album Covers
Use real Spotify album covers in reviews.

### 5. Connect to ML Service (Later)
Use `getTrackAudioFeatures()` to get data for your taste matching algorithm.

---

## 🔒 Security Notes

- ✅ Client Secret never exposed to frontend
- ✅ Tokens stored server-side in Supabase
- ✅ Row Level Security prevents users from accessing others' tokens
- ✅ Tokens automatically refreshed before expiry
- ✅ OAuth uses PKCE flow (Proof Key for Code Exchange)

---

## 🐛 Troubleshooting

### "Failed to connect Spotify"
- Check Edge Functions are deployed: `supabase functions list`
- Verify environment secrets are set in Supabase dashboard
- Check browser console for detailed error

### "Redirect URI mismatch"
- Ensure redirect URI in Spotify dashboard matches `.env`
- Must be exact: `http://localhost:5173/settings?tab=account`

### Edge Function errors
View logs:
```bash
supabase functions logs spotify-callback
supabase functions logs spotify-refresh
```

---

## 📚 Resources

- [Spotify Web API Docs](https://developer.spotify.com/documentation/web-api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OAuth 2.0 Authorization Code Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)

---

**You're all set!** 🎉 Users can now connect their Spotify accounts and access real music data.
