# Spotify Login Debugging Guide

This guide helps diagnose and fix Spotify login issues in OnChord.

## Two Types of Spotify Integration

OnChord has two separate Spotify features:

1. **Supabase OAuth (Social Login)**: Users log in via Spotify in AuthPage
2. **Spotify API Connection**: Users connect their Spotify API account in SettingsPage (PKCE flow)

This guide covers fixing the **Supabase OAuth (Social Login)** which is in AuthPage.

## Common Issues and Fixes

### Issue 1: Spotify Provider Not Configured in Supabase

**Symptoms:**
- "No redirect URL returned from Supabase" error on login page
- Spotify login button doesn't redirect to Spotify

**Root Cause:**
- The Spotify OAuth provider is not added to your Supabase project

**Fix:**
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find and enable **Spotify**
4. Enter your Spotify app credentials:
   - **Client ID**: Get from https://developer.spotify.com/dashboard
   - **Client Secret**: Get from https://developer.spotify.com/dashboard
   - **Redirect URL(s)**: Must match exactly what's in your app
     - For local: `http://localhost:3000/`
     - For production: `https://your-app-domain.com/`
5. Save the configuration

### Issue 2: Redirect URI Mismatch

**Symptoms:**
- Spotify OAuth page loads but redirects to wrong URL
- OAuth callback fails with "Invalid redirect_uri"

**Root Cause:**
- The redirect URI in Supabase doesn't match the one in code

**Fix:**
Check all these must match exactly:
- In Supabase OAuth config: The "Redirect URL(s)" field
- In code (AuthPage.tsx): Line 63 uses `window.location.origin` (e.g., `http://localhost:3000`)
- The domain in both should be identical

For different environments, add multiple redirect URIs in Supabase:
```
http://localhost:3000/
http://localhost:5173/
https://your-app-domain.com/
```

### Issue 3: CORS / Allowed Origins Not Configured

**Symptoms:**
- Network requests are blocked with CORS errors
- Browser console shows "No 'Access-Control-Allow-Origin' header"

**Root Cause:**
- Edge Functions don't have ALLOWED_ORIGINS configured

**Fix:**
Run the Supabase setup script to configure allowed origins:
```powershell
./scripts/set-supabase-allowed-origins.ps1 -AllowedOrigins "http://localhost:3000,https://your-app-domain.com"
```

Or set it in Supabase environment variables for each Edge Function.

### Issue 4: Environment Variables Missing or Incorrect

**Symptoms:**
- Auth fails silently
- Console shows "undefined" client ID

**Root Cause:**
- `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing/wrong

**Fix:**
1. Check `.env` file in `OnChord Frontend/` folder
2. Verify these exist and have correct values:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-key-here
   VITE_SPOTIFY_CLIENT_ID=your-spotify-client-id
   VITE_SPOTIFY_REDIRECT_URI=http://localhost:3000 (for local dev)
   ```
3. Restart the development server after changing .env

### Issue 5: PKCE Flow Initialization Error

**Symptoms:**
- Login button works but Spotify page doesn't load
- Error: "No redirect URL returned from Supabase"

**Root Cause:**
- Supabase PKCE flow not properly enabled

**Fix:**
The client is already configured correctly in `supabaseClient.ts` with:
```typescript
auth: {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: "pkce",  // ← This is correct
}
```

If this still fails, check browser console for specific Supabase errors.

## Debugging Steps

### Step 1: Check Browser Console
When clicking "Login with Spotify", check the browser's Developer Console for errors:
- Right-click → Inspect → Console tab
- Look for any error messages starting with `[Spotify Login Error]`
- Screenshot the full error message

### Step 2: Check Network Activity
In Developer Console → Network tab:
1. Click "Login with Spotify"
2. Look for request to `signInWithOAuth`
3. Check the response status and body for error details

### Step 3: Check Supabase Project Settings
1. Log into Supabase dashboard
2. Verify these project settings:
   - **Settings** → **Authentication** → **Providers** → **Spotify** is enabled
   - Spotify credentials (Client ID/Secret) are entered correctly
   - Redirect URLs are configured
   - **Settings** → **API** → Check that your app origin is in the CORS whitelist

### Step 4: Verify Spotify App Configuration
1. Go to https://developer.spotify.com/dashboard
2. Select your OnChord app
3. Check Redirect URIs match exactly what's in Supabase
4. Copy the Client ID - verify it matches `VITE_SPOTIFY_CLIENT_ID` in .env

## Testing the Fix

After making changes:

1. **Restart the development server**:
   ```powershell
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Clear browser cache**:
   - Press `Ctrl+Shift+Delete` → Select "All time" → Clear data

3. **Test the login flow**:
   - Navigate to http://localhost:3000
   - Click "Login with Spotify"
   - Verify it redirects to Spotify's authorization page
   - Grant permissions
   - Verify it redirects back and logs you in

## Improved Error Messages

The fix adds better error logging. When Spotify login fails:
- Check browser console for `[Spotify Login Error]` prefix
- The error message now includes hints about what to check in Supabase
- Look for `[Spotify Auto-Link]` messages to see if the connection was saved

## Getting Help

If issues persist:
1. Collect these details:
   - Full error message from browser console
   - Screenshots of Supabase OAuth settings
   - Your environment variables (.env file without secrets)
2. Create an issue with the collected information

## Key Files Modified

- `src/components/AuthPage.tsx` - Fixed redirect URI handling
- `src/App.tsx` - Improved PKCE flow detection and error logging
- This debugging guide

## Using With New Spotify Accounts

**Short Answer:** YES, it works with brand new Spotify accounts!

**What happens when a new user logs in with Spotify:**

1. ✅ Spotify OAuth provider validates their Spotify account
2. ✅ Supabase creates a new auth.users row
3. ✅ Auto-link saves their Spotify connection (tokens, profile info)
4. ⏳ User is sent to **Onboarding** to create their OnChord profile

**Requirements for new accounts to work:**

- Spotify account must be active and valid
- Spotify must return an `access_token` (required for OAuth) 
- `refresh_token` should be present (needed for later token refresh)
- Email can be unverified - but having one is recommended

**What gets auto-saved for new users:**

When a new user logs in, OnChord automatically saves:
- ✅ Spotify access token (for API calls)
- ✅ Spotify refresh token (for token refresh)
- ✅ Spotify user ID and profile name
- ✅ Spotify email address
- ✅ Token expiration time

**Common flow for new users:**

1. Click "Login with Spotify"
2. Authorize on Spotify's page
3. Redirected back to OnChord home
4. See onboarding flow (create username, pick accent color)
5. After onboarding, Spotify connection is ready to use

**Potential Issues with New Accounts:**

| Issue | Cause | Solution |
|-------|-------|----------|
| Login works but onboarding doesn't appear | Profile not created | Refresh page or restart browser |
| Auto-link shows warning in console | Refresh token missing | Rare - reconnect Spotify in settings if issues occur |
| Spotify data doesn't load | Token expired or revoked | User needs to reconnect in settings |

**If a new user can't connect Spotify:**

1. Clear browser cache (`Ctrl+Shift+Delete`)
2. Check browser console for `[Spotify Auto-Link]` messages
3. Try reconnecting in Settings → Connected Services
4. Use the standard PKCE flow in Settings as alternative

## Environment Configuration Checklist

- [ ] VITE_SUPABASE_URL is set correctly
- [ ] VITE_SUPABASE_ANON_KEY is set correctly  
- [ ] VITE_SPOTIFY_CLIENT_ID is set correctly
- [ ] VITE_SPOTIFY_REDIRECT_URI matches Supabase config
- [ ] Spotify OAuth provider is enabled in Supabase
- [ ] Spotify Client ID/Secret are entered in Supabase
- [ ] Redirect URIs are configured in Supabase
- [ ] CORS/Allowed Origins are configured
- [ ] Development server is restarted after .env changes
- [ ] Browser cache is cleared
