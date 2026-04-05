# OnChord Codebase Handoff: Complete Project Overview
**Date**: April 3, 2026  
**Project**: OnChord Music Discovery & Sharing Platform  
**Status**: Functional with known gaps and incomplete features

---

## 1. PROJECT OVERVIEW

### What the App Currently Does
OnChord is a music discovery and social sharing platform that integrates with Spotify to let users:
- Create and share music reviews with mood classifications
- Discover new music recommendations based on mood and taste matching
- Find upcoming concerts for their favorite artists
- Build collaborative playlists with friends
- View music listening insights and personality profiles
- Connect with friends and see what they're listening to

### Main User Flows Actually Implemented

1. **Onboarding → Authentication**
   - Email/password signup or Spotify OAuth login
   - Browser-persistent auth via Supabase session
   - Profile creation with optional Spotify sync

2. **Review Creation & Sharing**
   - Create text reviews for songs/albums with star ratings
   - Auto-classify mood (AI-powered or fallback)
   - Share to feed, community, or private list
   - View others' reviews in various feeds

3. **Music Discovery**
   - Personalized new releases from top artists
   - Mood-based discovery (Chill, Hype, Happy, etc.)
   - Search songs, artists, albums (Spotify + iTunes)
   - Browse discover page with trending/featured content

4. **Social Interaction**
   - Follow/unfollow friends
   - Like and comment on reviews
   - View friend activity feed
   - Browse community-wide reviews

5. **Events & Concerts**
   - See upcoming concerts for top artists
   - Fetch from Ticketmaster API
   - Store and display event details

6. **Insights & Analytics**
   - Top tracks/artists/genres dashboard
   - Mood distribution charts
   - Taste matching with friends (basic algorithm + optional ML)
   - Music personality profile (5 archetypes)
   - Listening history analysis

7. **Collab Playlists**
   - Create shared playlists with friends
   - Real-time sync via Supabase subscriptions
   - Add/remove tracks together

8. **Settings & Profile**
   - Edit profile info, avatar, music taste
   - Dark/light theme toggle
   - Notification preferences
   - Disconnect Spotify

### What Parts Are Finished, Partial, Placeholder, Mocked, or Broken

**FULLY WORKING:**
- ✅ Authentication (Spotify OAuth + email/password)
- ✅ Review CRUD (create, read, update, delete)
- ✅ Review feeds (personal, community, friends)
- ✅ Social (follow, like, comment)
- ✅ Collaborative playlists (real-time Supabase sync)
- ✅ Event discovery (Ticketmaster)
- ✅ Settings and profile editing
- ✅ Search (Spotify + iTunes)
- ✅ Insights dashboard (stats, mood analysis, taste match)
- ✅ Music personality profile

**PARTIALLY WORKING:**
- ⚠️ **Direct Messaging**: Database schema exists, but sending messages doesn't work. Receives real-time updates but no send endpoint.
- ⚠️ **Notifications**: Infrastructure exists (database, real-time listeners) but no triggers fire when users receive follows/likes/comments.
- ⚠️ **Activity Feed**: Records exist in DB but not created on user interactions (manual insertion only).
- ⚠️ **Reminders**: Can set reminders to listen to albums, but notifications don't actually trigger.
- ⚠️ **Playlist Invites**: Sending works, accepting flow unclear/untested.

**PLACEHOLDER/DEMO ONLY:**
- 🟡 **RealtimeFeaturesPage**: Demo page showing real-time capabilities without real features.

**BROKEN/DEAD CODE:**
- ❌ **Comment edit/delete**: UI exists but no backend implementation.
- ❌ **Review calendar**: Page exists but no data loaded.
- ❌ **Language/Region settings**: UI only, no i18n backend.
- ❌ **Spotify audio features**: Sometimes unavailable (free tier accounts), affects mood classification accuracy.

---

## 2. TECH STACK

### Frontend
- **Framework**: React 18 + TypeScript
- **Build tool**: Vite 6.3.5
- **UI Components**: shadcn-ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS
- **State Management**: React Context + Custom hooks
- **HTTP Client**: Built-in `fetch` API
- **Charts**: Recharts (for insights dashboard)
- **Notifications**: Sonner toast library
- **Icons**: Lucide React

### Backend
- **Type**: Fully serverless (no traditional backend)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth + Spotify OAuth (PKCE flow)
- **Real-time**: Supabase subscriptions (PostgreSQL LISTEN/NOTIFY)
- **Server-side Logic**: Supabase Edge Functions (TypeScript)
- **RLS**: Row-Level Security on all tables

### ML Service
- **Framework**: FastAPI (separate service)
- **Endpoints**:
  - `/classify-mood` - Classify track mood from audio features
  - `/health` - Health check
  - `/taste-similarity` - Compare user taste profiles
- **Status**: Optional — app has local fallbacks if service is down
- **Data**: Takes Spotify audio features as input

### Database (Supabase PostgreSQL)
**Core Tables** (18 migrations total):
- `profiles` - User info, stats, avatar
- `reviews` - User reviews with mood, rating, visibility
- `follows` - Friendship relationships
- `collaborative_playlists` - Shared playlists with multiple users
- `collaborative_playlist_tracks` - Tracks in collab playlists
- `direct_messages` - Messages between users (not fully functional)
- `notifications` - User notifications (infra exists, not triggered)
- `activities` - Activity log (not auto-populated)
- `music_lists` - Custom music collections
- `music_list_items` - Items in lists
- `favorites` - Liked songs/albums
- `review_likes` - Review engagement
- `review_comments` - Comments on reviews
- `reminders` - Album/artist reminders (notifications missing)
- `listening_stats_cache` - Cached Spotify data
- `notification_settings` - User preferences
- Plus 2-3 internal tables

### Auth Flow
1. User signs up with email + password OR Spotify OAuth
2. Supabase Auth handles session (stored in browser)
3. Session cached client-side to prevent redundant `getSession()` calls
4. Token auto-refreshes via Supabase (transparent)
5. Spotify OAuth uses PKCE for security
6. 10s timeout for Spotify session validity

### External APIs
- **Spotify Web API**: User data, search, top tracks/artists, audio features
- **Ticketmaster API**: Event discovery (rate limited to 2 req/sec)
- **iTunes Search API**: Fallback album art/metadata (no auth required)
- **Custom ML Service**: Mood classification + taste matching (optional)

### Key Libraries
- `@supabase/supabase-js` - Database + auth
- `recharts` - Charts for insights
- `sonner` - Toast notifications
- `lucide-react` - Icons
- `zod` (not widely used yet)
- `use-debounce` - Debounced search

### Hosting & Deployment
- **Frontend**: Likely Vercel or similar (not confirmed in code)
- **Database**: Supabase Cloud
- **ML Service**: Likely self-hosted or cloud function (endpoint is env var)
- **Edge Functions**: Supabase-hosted

---

## 3. HIGH-LEVEL ARCHITECTURE

### Data Flow

```
User Browser
    ↓
  React App (Client-side state + Context)
    ↓ (Auth via Supabase session)
Supabase PostgreSQL (RLS enforces permissions)
    ↓ (Real-time subscriptions via WebSocket)
    ↓ (Updates pushed back to subscribed clients)
    
Parallel integrations:
  - Spotify API (user data, search, tracks)
  - Ticketmaster API (events)
  - iTunes Search (album art)
  - ML Service (mood + taste scoring)
```

### Frontend Architecture

**Route Structure** (in App.tsx):
```
/                              → OnboardingFlow (initial routing)
/auth                          → AuthPage
/home                          → HomePage (main feed)
/reviews/:reviewId             → ReviewDetailModal
/reviews/all                   → ReviewsPage
/profile/:userId               → UserProfilePage
/your-space                    → YourSpacePage (self profile)
/discover                      → DiscoverPage
/explore/:type                 → Various explore modals
/search                        → SearchPage
/insights                      → InsightsPage (mood, taste, personality)
/events                        → EventsPage
/lists                         → ListsPage
/collab-playlists            → CollaborativePlaylistsHub
/activity                      → ActivityFeedPage
/community                     → CommunityFeedPage
/messages                      → MessagingPage (broken)
/notifications                 → NotificationsPage
/settings                      → SettingsPage
/help, /about, /privacy, etc   → Static pages

Modal/Drawer overlays on top of these routes for details
```

**State Management**:
- Auth state: Supabase Auth (global, persisted in browser)
- User profile: React Context (useProfile hook)
- Lists: ListsContext provider
- Cached queries: In-memory cache with 5-min TTL for reviews, 3-min for friend reviews
- Session cache: Single `getSession()` call, subsequent calls use cache
- Preview player: PreviewProvider context

### Backend Services (Serverless)

**Supabase Functions**:
- `spotify-callback` - OAuth redirect handler
- `spotify-refresh` - Token refresh (if needed)
- Others likely exist but not listed in workspace

### Database Access

All queries go through `@supabase/supabase-js`:
```typescript
supabase.from('reviews').select('*').eq('id', id)
supabase.from('profiles').insert({...})
// etc.
```

Real-time subscriptions:
```typescript
supabase.from('reviews').on('*', handler).subscribe()
```

### Spotify Integration

**OAuth Flow**:
1. User clicks "Connect Spotify"
2. Redirected to Spotify auth URL (PKCE)
3. After approval, Spotify redirects to `/auth/callback`
4. Frontend exchanges code for access token
5. Token stored in Supabase Auth metadata
6. Subsequent requests include `Authorization: Bearer {token}` header

**Endpoints Used**:
- `GET /v1/me` - Current user
- `GET /v1/me/top/artists` - Top artists (time range selectable)
- `GET /v1/me/top/tracks` - Top tracks
- `GET /v1/me/player/recently-played` - Recent tracks
- `GET /v1/search` - Search (track, artist, album)
- `GET /v1/artists/{id}/albums` - Artist discography
- `GET /v1/audio-features/{id}` - Audio features (energy, danceability, etc.)
- Plus others for recommendations, playlists, etc.

### Ticketmaster Integration

Accessed via Supabase Edge Function proxy (`getArtistEvents`):
- Rate limited to 2 requests/sec
- Fetches events for top artists
- Falls back to empty array on timeout
- Endpoint: `https://app.ticketmaster.com/discovery/v2/events`

### ML Service Integration

**Endpoints**:
- `POST /classify-mood` - Takes Spotify audio features, returns mood label
- `GET /health` - Health check
- `POST /taste-similarity` - Compares user profiles, returns similarity score

**Data Input**:
- Takes Spotify audio features: energy, danceability, valence, etc.
- Returns mood classification or similarity percentages

**Fallback**:
- If ML service is down or times out, app falls back to local taste matching
- Local algorithm compares shared tracks, albums, artists between users

### State Management Details

**sessionCache.ts**:
- Caches result of `supabase.auth.getSession()`
- Returns cached result for 60+ seconds to avoid redundant network calls
- Invalidates on auth state changes

**queryCache.ts**:
- Generic cache for Supabase query results
- TTL: 5 minutes for public reviews, 3 minutes for friend reviews
- Automatic cache invalidation on mutations (create, update, delete)

**localStorage Usage** (12+ keys):
- `supabase.auth.token` - Auth session (Supabase managed)
- `theme-preference` - Light/dark mode
- `spotify-user-info` - Cached Spotify user
- `preview-volume` - Player volume
- Plus others for UI state

### Where Mock Data is Still Used

1. **RealtimeFeaturesPage** - Entirely mock/demo data
2. **Taste Matching** - Uses real user reviews but local comparison algorithm (not ML)
3. **Activity Feed** - Some hardcoded examples, real data not inserted
4. **Notifications** - Database exists but not triggered by real actions
5. **Reminders** - Can set but don't notify (mock functionality)

---

## 4. FULL FEATURE INVENTORY

### AUTH / ONBOARDING

| Feature | Location | Status | Code | Scope |
|---------|----------|--------|------|-------|
| Email/Password Signup | AuthPage | ✅ Working | `src/components/AuthPage.tsx` | Core |
| Spotify OAuth | AuthPage | ✅ Working | `src/lib/api/spotify.ts` + Edge Function | Core |
| Session Persistence | App-wide | ✅ Working | `sessionCache.ts` | Core |
| Forgot Password | AuthPage | ✅ Working | Supabase Auth native | Core |
| Profile Creation | OnboardingFlow | ✅ Working | `src/components/OnboardingFlow.tsx` | Core |
| Spotify Connection | OnboardingFlow | ✅ Working | OAuth flow | Core |
| Disconnect Spotify | SettingsPage | ✅ Working | `src/components/SettingsPage.tsx` | Core |

### HOME / FEED

| Feature | Location | Status | Code | Scope |
|----------|----------|--------|------|-------|
| Main Feed (reviews) | HomePage | ✅ Working | `src/components/HomePage.tsx` | Core |
| Community Reviews | CommunityFeedPage | ✅ Working | `src/components/CommunityFeedPage.tsx` | Core |
| Friend Reviews | HomePage + FriendsReviewsPage | ✅ Working | Multiple pages | Core |
| Pagination (5 items + Load More) | HomePage | ✅ Working | State-managed pagination | Core |
| Skeleton Loaders | HomePage | ✅ Working | SkeletonLoader component | Polish |
| New Releases (Personalized) | HomePage | ✅ Working | `homeData.ts` with timeout | Core |

### REVIEWS

| Feature | Location | Status | Code | Scope |
|---------|----------|--------|------|-------|
| Create Review | CreateReviewPage | ✅ Working | `reviews.ts` + form | Core |
| View Review Details | ReviewDetailModal | ✅ Working | Modal overlay | Core |
| Edit Review | ReviewDetailModal | ✅ Working | `reviews.ts` updateReviewApi | Core |
| Delete Review | ReviewDetailModal | ✅ Working | `reviews.ts` deleteReviewApi | Core |
| Rate Reviews (stars) | CreateReviewPage | ✅ Working | StarRating component | Core |
| Mood Classification | CreateReviewPage | ⚠️ Partial | ML service + fallback | Core |
| Review Visibility (Public/Private/Friends) | CreateReviewPage | ✅ Working | Visibility enum | Core |
| Review Comments | ReviewDetailModal | ✅ Comment view, ⚠️ Edit/delete missing | `reviews.ts` | Core |
| Comment editing/deletion | ReviewDetailModal | ❌ Broken | No endpoint | Non-core |
| Review Likes | ReviewDetailModal | ✅ Working | `reviews.ts` like/unlike | Core |
| Review Sharing | ReviewDetailModal | 🟡 Partial | Share button exists, unclear if functional | Polish |
| Review Calendar | ReviewCreationModal | 🟡 Placeholder | UI exists, no data | Scope-creep |

### SEARCH

| Feature | Location | Status | Code | Scope |
|----------|----------|--------|------|-------|
| Global Music Search | SearchPage | ✅ Working | Spotify + iTunes fallback | Core |
| Search by Song | SearchPage | ✅ Working | `musicSearch.ts` | Core |
| Search by Artist | SearchPage | ✅ Working | `musicSearch.ts` | Core |
| Search by Album | SearchPage | ✅ Working | `musicSearch.ts` | Core |
| Search Results Display | SearchPage | ✅ Working | Card grid layout | Core |
| Quick Album Preview | SongDetailModal | ✅ Working | Preview player hooks | Core |

### DISCOVER

| Feature | Location | Status | Code | Scope |
|----------|----------|--------|------|-------|
| Discover Page (genre/mood browse) | DiscoverPage | ✅ Working | Hardcoded genres, real Spotify data | Core |
| Mood-based Discovery | DiscoverPage | 🟡 Partial | Mood categories exist, filtering unclear | Core |
| Genre Browse | DiscoverPage | ✅ Working | Category links | Core |
| Featured Playlists | DiscoverPage | 🟡 Partial | Fetched but limited display | Polish |
| New Releases | DiscoverPage | ✅ Working | `homeData.ts` | Core |
| Trending Tracks | DiscoverPage | 🟡 Partial | Some data shown | Core |

### COMMUNITY / SOCIAL

| Feature | Location | Status | Code | Scope |
|----------|----------|--------|------|-------|
| Follow/Unfollow Users | UserProfilePage | ✅ Working | `follows.ts` | Core |
| See Followers/Following | UserProfilePage | ✅ Working | Profile page | Core |
| Like Reviews | Feed pages | ✅ Working | `reviews.ts` | Core |
| Comment on Reviews | ReviewDetailModal | ✅ Working | `reviews.ts` | Core |
| Community Feed (all reviews) | CommunityFeedPage | ✅ Working | Public reviews query | Core |
| Find Friends | FindFriendsPage | ✅ Working | User search + follow | Core |
| User Discovery | FindFriendsPage | ✅ Working | Browse users | Core |

### ACTIVITY

| Feature | Location | Status | Code | Scope |
|----------|----------|--------|------|-------|
| Activity Feed (what friends did) | ActivityFeedPage | 🟡 Partial | Database exists, no triggers fire | Core |
| Recent Activity | YourSpacePage | 🟡 Partial | Limited display | Core |
| Activity Types (follow, like, review) | Database | 🟡 Partial | Schema exists, not populated | Core |

### PROFILE / YOUR SPACE

| Feature | Location | Status | Code | Scope |
|----------|----------|--------|------|-------|
| Profile Page (self) | YourSpacePage | ✅ Working | `src/components/YourSpacePage.tsx` | Core |
| Profile Page (others) | UserProfilePage | ✅ Working | `src/components/UserProfilePage.tsx` | Core |
| Edit Profile | EditProfilePage | ✅ Working | `profiles.ts` | Core |
| Avatar Upload | EditProfilePage | ✅ Working | Supabase file upload | Core |
| Bio / Music Taste | EditProfilePage | ✅ Working | Text fields | Core |
| Stats Display (reviews, followers) | Profile pages | ✅ Working | Calculated in UI | Core |
| Recent Reviews | YourSpacePage | ✅ Working | Latest reviews query | Core |
| Top Genres | YourSpacePage | ✅ Working | Computed from reviews | Core |
| Favorite Albums | YourSpacePage | 🟡 Partial | Data exists, display unclear | Core |
| Recent Activity | YourSpacePage | 🟡 Partial | Not auto-populated | Core |

### FAVOURITES / LISTS

| Feature | Location | Status | Code | Scope |
|---------|----------|--------|------|-------|
| Create Music List | ListsPage / CreateListModal | ✅ Working | `lists.ts` | Core |
| Add Songs to List | EditListModal | ✅ Working | `lists.ts` | Core |
| Remove Songs from List | EditListModal | ✅ Working | `lists.ts` | Core |
| View Lists | ListsPage / MyListsPage | ✅ Working | Display lists | Core |
| Edit List Details | EditListModal | ✅ Working | `lists.ts` | Core |
| Delete List | ListsPage | ✅ Working | `lists.ts` | Core |
| Favorite Albums | YourSpacePage | ⚠️ Partial | Database structure exists | Core |
| Favorite Artists | Not visible | ❓ Unclear | Schema unclear | Non-core |
| Share List | Not visible | ❌ Missing | Not implemented | Scope-creep |
| List Permissions | Not visible | ❌ Missing | Not implemented | Scope-creep |

### COLLABORATIVE PLAYLISTS

| Feature | Location | Status | Code | Scope |
|---------|----------|--------|------|-------|
| Create Collab Playlist | CollaborativePlaylistsHub | ✅ Working | `collaborativePlaylists.ts` | Core |
| Add Members | CollaborativePlaylistDetail | ✅ Working | Invite system | Core |
| Add Tracks (real-time) | CollaborativePlaylistView | ✅ Working | Supabase subscriptions | Core |
| Remove Tracks (real-time) | CollaborativePlaylistView | ✅ Working | Supabase subscriptions | Core |
| View Playlist Details | CollaborativePlaylistDetail | ✅ Working | Modal + full view | Core |
| Leave Playlist | CollaborativePlaylistView | ✅ Working | `collaborativePlaylists.ts` | Core |
| Invite Friends | CollaborativePlaylistDetail | ✅ Working | Send link/notification logic | Core |
| Accept Invite | CollaborativePlaylistView | ⚠️ Unclear | Flow unclear from code | Core |
| Delete Playlist (owner) | CollaborativePlaylistView | ✅ Working | Owner-only action | Core |
| Member Limit | Not clear | ❓ Unclear | No validation visible | Core |

### EVENTS / REMINDERS

| Feature | Location | Status | Code | Scope |
|---------|----------|--------|------|-------|
| Browse Events | EventsPage | ✅ Working | Ticketmaster API | Core |
| Filter Events (Discover tab) | EventsPage | ✅ Working | Hip-hop default | Core |
| Event Details | EventModal | ✅ Working | Modal display | Core |
| Set Reminder (album) | YourSpacePage, SongDetailModal | ✅ Can set | `reminders.ts` | Core |
| View Reminders | RemindersModal | ✅ Display | `reminders.ts` | Core |
| Delete Reminder | RemindersModal | ✅ Working | `reminders.ts` | Core |
| Reminder Notifications | Not visible | ❌ Broken | No notification trigger | Core |
| Calendar View (reminders) | Not visible | ❌ Missing | No calendar UI | Scope-creep |

### MESSAGES

| Feature | Location | Status | Code | Scope |
|---------|----------|--------|------|-------|
| Message List | MessagingPage | ✅ Display | Real-time Supabase subscription | Core |
| Send Message | MessagingPage | ❌ Broken | No send endpoint | Core |
| Receive Messages | MessagingPage | ✅ Real-time | Supabase listener works | Core |
| Message History | MessagingPage | ✅ Display | Query works | Core |
| Delete Message | MessagingPage | ❌ Missing | No endpoint | Core |
| Message Search | Not visible | ❌ Missing | Not implemented | Scope-creep |
| Message Reactions | Not visible | ❌ Missing | Not implemented | Scope-creep |

### NOTIFICATIONS

| Feature | Location | Status | Code | Scope |
|---------|----------|--------|------|-------|
| Notification Center | NotificationsPage | ✅ Display | Real-time subscriptions | Core |
| Notification Preferences | SettingsPage | ✅ UI | `notification_settings` table | Core |
| Follow Notifications | ❓ Infra only | 🟡 Not triggered | Database exists, no trigger | Core |
| Like Notifications | ❓ Infra only | 🟡 Not triggered | Database exists, no trigger | Core |
| Comment Notifications | ❓ Infra only | 🟡 Not triggered | Database exists, no trigger | Core |
| Browser Notifications | ✅ Toast messages | Sonner toasts | Core |
| Email Notifications | ❌ Not implemented | Not in code | Non-core |
| Push Notifications | ❌ Not implemented | Not in code | Non-core |

### INSIGHTS DASHBOARD

| Feature | Location | Status | Code | Scope |
|---------|----------|--------|------|-------|
| Top Tracks | InsightsPage | ✅ Working | `insightsData.ts` | Core |
| Top Artists | InsightsPage | ✅ Working | `insightsData.ts` | Core |
| Top Genres | InsightsPage | ✅ Working | Computed from tracks | Core |
| Listening Stats (chart) | InsightsPage | ✅ Working | Recharts display | Core |
| Mood Distribution | InsightsPage | ✅ Working | User reviews analyzed | Core |
| Time Range Toggle (4 weeks, 6 months, all time) | InsightsPage | ✅ Working | Multiple queries | Core |
| Mood Breakdown | MoodAnalysisPage | ✅ Working | Spotify audio features analysis | Core |
| Taste Matching | TasteMatchingPage | ✅ Working (basic) | Local comparison + optional ML | Core |
| Music Personality | MusicPersonalityPage | ✅ Working | 5 archetypes based on taste | Core |

### TASTE MATCH

| Feature | Location | Status | Code | Scope |
|---------|----------|--------|------|-------|
| Compare Taste (friends) | TasteMatchingPage | ✅ Working | Local algorithm | Core |
| ML-powered Taste Match | TasteMatchingPage | ⚠️ Optional | ML service call with fallback | Core |
| Audio Feature Analysis | TasteMatchingPage | ✅ Optional | Spotify audio features | Core |
| Taste Score Calculation | TasteMatchingPage | ✅ Working | Shared tracks/albums/artists | Core |
| Without Spotify Connection | TasteMatchingPage | ✅ Fallback | Uses reviews + favorites | Core |
| Best Match Ranking | TasteMatchingPage | ✅ Working | Sorted by score | Core |

### MOOD ANALYSIS (formerly PlaylistMood)

| Feature | Location | Status | Code | Scope |
|---------|----------|--------|------|-------|
| Mood Classification | MoodAnalysisPage | ✅ Working | ML service or audio features | Core |
| Time Range Analysis | MoodAnalysisPage | ✅ Working | Short/medium/long term | Core |
| Mood Distribution Chart | MoodAnalysisPage | ✅ Working | Recharts pie chart | Core |
| Mood Breakdown (numeric) | MoodAnalysisPage | ✅ Working | Percentages displayed | Core |
| Analyze Latest Releases | MoodAnalysisPage | ✅ Working | Button to refresh | Core |
| Spotify Dependency | MoodAnalysisPage | ⚠️ Audio features | Some free accounts blocked | Core |

### MUSIC PERSONALITY

| Feature | Location | Status | Code | Scope |
|---------|----------|--------|------|-------|
| 5-Archetype Profile | MusicPersonalityPage | ✅ Working | Based on genre/mode distribution | Core |
| Personality Card Display | MusicPersonalityPage | ✅ Working | Large card with description | Core |
| Description Text | MusicPersonalityPage | ✅ Working | Hardcoded personalities | Core |
| Profile Bar (percentage) | MusicPersonalityPage | ✅ Working | Visual bar chart | Polish |

### SETTINGS / THEME / ACCESSIBILITY

| Feature | Location | Status | Code | Scope |
|---------|----------|--------|------|-------|
| Dark/Light Theme | SettingsPage | ✅ Working | CSS class + localStorage | Core |
| Disconnect Spotify | SettingsPage | ✅ Working | `spotify.ts` revoke | Core |
| Change Password | SettingsPage | ✅ Working | Supabase native | Core |
| Notification Preferences | SettingsPage | ✅ UI only | Database exists, not wired | Core |
| Block User | SettingsPage | ❌ Not implemented | Not in code | Scope-creep |
| Delete Account | SettingsPage | ❌ Not implemented | Not in code | Scope-creep |
| Language/Region Settings | SettingsPage | 🟡 UI only | No i18n backend | Scope-creep |
| Music Taste Editor | EditProfilePage | ✅ Working | Multiple choice | Core |
| Avatar Edit | EditProfilePage | ✅ Working | Upload to Supabase | Core |
| Bio Edit | EditProfilePage | ✅ Working | Text field | Core |

### OTHER VISIBLE FEATURES

| Feature | Location | Status | Code | Scope |
|---------|----------|--------|------|-------|
| Album Detail Modal | AlbumModal | ✅ Working | Fetches Spotify details | Core |
| Song Preview Player | SongPreviewPlayer | ✅ Working | HTML5 audio element | Core |
| Loading Screens | Various | ✅ Working | SkeletonLoader components | Polish |
| Error States | Various | ✅ Partial | EmptyState + error messages | Core |
| Help Page | HelpPage | ✅ Static content | Hardcoded FAQ | Polish |
| About Page | AboutPage | ✅ Static content | Hardcoded info | Polish |
| Privacy Page | PrivacyPage | ✅ Static content | Hardcoded policy | Polish |
| Terms Page | TermsPage | ✅ Static content | Hardcoded ToS | Polish |

---

## 5. ROUTES AND PAGES

### Complete Route Listing

| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/` | OnboardingFlow | Entry routing (if auth needed) | ✅ Working |
| `/auth` | AuthPage | Email/Spotify login | ✅ Working |
| `/home` | HomePage | Main personalized feed + new releases | ✅ Working |
| `/reviews/all` | ReviewsPage | All user reviews | ✅ Working |
| `/discover` | DiscoverPage | Browse by genre/mood | ✅ Working |
| `/search` | SearchPage | Global music search | ✅ Working |
| `/insights` | InsightsPage | Dashboard (mood, taste, personality) | ✅ Working |
| `/events` | EventsPage | Concerts from Ticketmaster | ✅ Working |
| `/lists` | ListsPage | Music lists management | ✅ Working |
| `/collab-playlists` | CollaborativePlaylistsHub | See/manage shared playlists | ✅ Working |
| `/activity` | ActivityFeedPage | Friend activity log | 🟡 Partial |
| `/your-space` | YourSpacePage | Personal profile summary | ✅ Working |
| `/profile/:userId` | UserProfilePage | View other user's profile | ✅ Working |
| `/edit-profile` | EditProfilePage | Edit name, bio, avatar, taste | ✅ Working |
| `/community` | CommunityFeedPage | Browse all public reviews | ✅ Working |
| `/messages` | MessagingPage | Direct messaging with friends | ❌ Broken (send) |
| `/notifications` | NotificationsPage | Notification center | 🟡 Partial (no triggers) |
| `/settings` | SettingsPage | Theme, password, preferences | ✅ Working |
| `/help` | HelpPage | FAQ | ✅ Static |
| `/about` | AboutPage | About page | ✅ Static |
| `/privacy` | PrivacyPage | Privacy policy | ✅ Static |
| `/terms` | TermsPage | Terms of service | ✅ Static |
| `/find-friends` | FindFriendsPage | Browse and follow users | ✅ Working |
| `/realtime-demo` | RealtimeFeaturesPage | Demo of real-time features | 🟡 Demo only |

### Modals/Overlays (not full-page routes)

| Modal | Component | Trigger | Status |
|-------|-----------|---------|--------|
| Review Details | ReviewDetailModal | Click review card | ✅ Working |
| Create Review | CreateReviewPage | Button or navigation | ✅ Working |
| Album/Track Detail | AlbumModal, SongDetailModal | Click album/song | ✅ Working |
| Create List | CreateListModal | Button | ✅ Working |
| Edit List | EditListModal | Click list | ✅ Working |
| Event Details | EventModal | Click event | ✅ Working |
| Collab Playlist Detail | CollaborativePlaylistDetail | Click playlist | ✅ Working |
| Reminders | RemindersModal | Settings icon | ✅ Working |
| Notifications | NotificationPanel/Modal | Bell icon | 🟡 Partial |
| Comments | CommentsModal | Comment count | ✅ Working |
| Add to List | AddToListDialog | Context menu on track | ✅ Working |
| Set Reminder | SetReminderDialog | Album details | ✅ Working |

---

## 6. COMPONENT MAP

### Layout / Navigation Components

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| App | App.tsx | Main router + auth flow + cache initialization | ✅ |
| Navigation | Navigation.tsx | Top nav bar with logo, search, icons | ✅ |
| Footer | Footer.tsx | Bottom nav with route links | ✅ |
| PageHeader | PageHeader.tsx | Page title + breadcrumbs | ✅ |
| SidePanel/Drawer | Various | Slide-out menus | ✅ |
| NotificationsPanel | NotificationsPanel.tsx | Real-time notification display | ✅ |
| OnboardingFlow | OnboardingFlow.tsx | Auth routing logic | ✅ |

### Review Components

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| ReviewCard | ReviewCard (implied) | Display single review summary | ✅ |
| ReviewDetailModal | ReviewDetailModal.tsx | Full review + comments + likes | ✅ |
| CreateReviewPage | CreateReviewPage.tsx | Form to create review | ✅ |
| ReviewsList | ReviewsPage.tsx | Grid of reviews with pagination | ✅ |
| ExpandableReviewCard | ExpandableReviewCard.tsx | Review card with expand action | ✅ |
| CommentsModal | CommentsModal.tsx | View/add comments on review | ✅ |
| ReviewCreationModal | ReviewCreationModal.tsx | Inline create (maybe duplicate?) | 🟡 |
| ReviewConfirmation | ReviewConfirmation.tsx | Post-creation confirmation | ✅ |
| StarRating | StarRating.tsx | 5-star rating input | ✅ |

### Feed Components

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| HomePage | HomePage.tsx | Main feed (personalized + community) | ✅ |
| ActivityFeed | ActivityFeed.tsx | Friend activity display | ✅ |
| CommunityFeedPage | CommunityFeedPage.tsx | Public reviews feed | ✅ |
| FriendsReviewsPage | FriendsReviewsPage.tsx | Friend reviews only | ✅ |
| ActivityFeedPage | ActivityFeedPage.tsx | Timeline of user activities | 🟡 |

### Profile / Space Components

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| UserProfilePage | UserProfilePage.tsx | View other user's profile | ✅ |
| YourSpacePage | YourSpacePage.tsx | Own profile + stats summary | ✅ |
| EditProfilePage | EditProfilePage.tsx | Edit profile form | ✅ |
| ProfileCard | ProfileCard (impl. unclear) | Mini profile display | ✅ |

### Insights Components

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| InsightsPage | InsightsPage.tsx | Main dashboard (tabs: mood, taste, personality) | ✅ |
| MoodAnalysisPage | MoodAnalysisPage.tsx | Mood classification + time range | ✅ |
| TasteMatchingPage | TasteMatchingPage.tsx | Taste comparison with all friends | ✅ |
| MusicPersonalityPage | MusicPersonalityPage.tsx | 5-archetype personality profile | ✅ |

### Events / Reminders Components

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| EventsPage | EventsPage.tsx | Browse concerts (tabs: discover, for you) | ✅ |
| EventModal | EventModal.tsx | Event details overlay | ✅ |
| RemindersModal | RemindersModal.tsx | View/manage album reminders | ✅ |
| SetReminderDialog | SetReminderDialog.tsx | Create reminder dialog | ✅ |

### Social / Community Components

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| FindFriendsPage | FindFriendsPage.tsx | Browse users, follow/unfollow | ✅ |
| FollowButton | FollowButton (impl. unclear) | Toggle follow state | ✅ |

### Data/List Components

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| ListsPage | ListsPage.tsx | All personal music lists | ✅ |
| MyListsPage | MyListsPage.tsx | Maybe duplicate of ListsPage? | ✅ |
| ViewListPage | ViewListPage.tsx | View list contents | ✅ |
| CreateListModal | CreateListModal.tsx | Create new list dialog | ✅ |
| EditListModal | EditListModal.tsx | Edit list + add/remove tracks | ✅ |
| AddToListDialog | AddToListDialog.tsx | Add track to list dialog | ✅ |
| CollaborativePlaylistsHub | CollaborativePlaylistsHub.tsx | View all collab playlists | ✅ |
| CollaborativePlaylistPage | CollaborativePlaylistPage.tsx | Full collab playlist view | ✅ |
| CollaborativePlaylistDetail | CollaborativePlaylistDetail.tsx | Modal for playlist details | ✅ |
| CollaborativePlaylistView | CollaborativePlaylistView.tsx | Track display + real-time sync | ✅ |

### Music Detail Components

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| AlbumModal | AlbumModal.tsx | Album details + tracks | ✅ |
| SongDetailModal | SongDetailModal.tsx | Song details (artist, album, preview) | ✅ |
| SongPreviewPlayer | SongPreviewPlayer.tsx | HTML5 audio player | ✅ |
| MusicEmbed | MusicEmbed.tsx | Embedded track display | ✅ |

### Form / Modal Components

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| CreateReviewPage | CreateReviewPage.tsx | Review creation form | ✅ |
| EditProfilePage | EditProfilePage.tsx | Profile edit form | ✅ |
| AuthPage | AuthPage.tsx | Login/signup form | ✅ |
| SearchPage | SearchPage.tsx | Music search form | ✅ |
| DiscoverPage | DiscoverPage.tsx | Genre/mood browse + search | ✅ |

### Utility / State Components

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| SkeletonLoader | SkeletonLoader.tsx | Loading placeholder | ✅ |
| LoadingScreen | LoadingScreen.tsx | Full-page loader (removed) | ✅ |
| EmptyState | EmptyState.tsx | No data placeholder | ✅ |
| ErrorState | ErrorState.tsx | Error display | ✅ |
| BackButton | BackButton.tsx | Navigation back | ✅ |
| Logo | Logo.tsx | App logo | ✅ |
| TypingIndicator | TypingIndicator.tsx | Typing animation (messaging) | ✅ |
| EditedIndicator | EditedIndicator.tsx | "(Edited)" label | ✅ |
| QuickActionButton | QuickActionButton.tsx | FAB-style button | ✅ |
| NotificationsModal | NotificationsModal.tsx | Modal for notifications | ✅ |

### shadcn-ui Primitive Components

Used throughout:
- `ui/button`, `ui/input`, `ui/label`, `ui/card`, `ui/dialog`, `ui/drawer`, `ui/sheet`, `ui/tabs`, `ui/select`, `ui/checkbox`, `ui/radio-group`, `ui/switch`, `ui/progress`, `ui/badge`, `ui/alert-dialog`, `ui/dropdown-menu`, `ui/popover`, `ui/tooltip`, etc.

All accessed from `src/components/ui/` directory.

---

## 7. BACKEND / API SUMMARY

### API Service Layer Files

**Location**: `src/lib/api/`

#### spotify.ts (600+ lines)
**Purpose**: All Spotify integration

**Key Functions**:
- `initSpotifyAuth()` - Start OAuth flow with PKCE
- `handleSpotifyCallback()` - Exchange code for token
- `getSpotifyAccessToken()` - Get current access token (with refresh)
- `getUserProfile()` - Current user info
- `getUserTopTracks()` - Top tracks (time range selectable)
- `getUserTopArtists()` - Top artists (time range selectable)
- `getRecentlyPlayed()` - Recent listening history
- `searchMusic()` - Search tracks, artists, albums
- `getArtistAlbums()` - Discography
- `getTrackAudioFeatures()` - Energy, danceability, valence, etc.
- `getAudioFeaturesMultiple()` - Batch fetch audio features
- `isSpotifyConnected()` - Check if user is connected

**Status**: ✅ All real, live Spotify API calls

#### reviews.ts (300+ lines)
**Purpose**: Review CRUD + caching

**Key Functions**:
- `getReviews()` - User's reviews
- `getPublicReviews()` - All public reviews (cached, 5-min TTL)
- `getFriendsReviews()` - Friend reviews (cached, 3-min TTL)
- `createReview()` - Create + invalidate cache
- `updateReviewApi()` - Edit + invalidate cache
- `deleteReviewApi()` - Delete + invalidate cache
- `likeReview()` / `unlikeReview()`
- `addComment()` / `deleteComment()` - Comment CRUD
- `getReviewComments()`

**Database**: `reviews`, `review_likes`, `review_comments` tables

**Status**: ✅ All working, real data

#### mlService.ts (300+ lines)
**Purpose**: Optional mood classification + taste matching

**Endpoints**:
- `classifyMoodByTrackIds()` - POST to ML service with track IDs
- `classifyMusicMood()` - (renamed legacy function)
- `checkMlServiceHealth()` - GET health check

**Fallback**: If service unavailable, returns empty/defaults

**Status**: ⚠️ Optional, with fallback

**Config**: `ML_SERVICE_URL` env var (likely FastAPI service)

#### homeData.ts (300+ lines)
**Purpose**: Personalized new releases + concerts

**Key Functions**:
- `getPersonalizedNewReleases()` - Top artists' latest albums (cached, 5-min TTL)
- `getPersonalizedConcerts()` - Events for top artists

**Details**:
- Gets user's top 10 artists
- Fetches 3 latest albums per artist
- Rate limits to 2 req/sec to avoid Spotify throttle
- Increased timeout: 15s for top artists, 12s for album fetches (fixed in session)

**Status**: ✅ Working, with fallback to recent events

#### insightsData.ts (250+ lines)
**Purpose**: Listening stats + analytics

**Key Functions**:
- `getListeningStats()` - Top tracks, artists, genres with time range
- `getMonthlyListeningDistribution()` - Month-by-month breakdown
- `getTasteProfile()` - User's genre/mode breakdown for personality

**Status**: ✅ All working, real Spotify data

#### ticketmaster.ts (150 lines)
**Purpose**: Event discovery

**Key Functions**:
- `getArtistEvents()` - Events for artist name (via Supabase Edge Function proxy)

**Rate Limiting**: 2 requests/second

**Status**: ✅ Working via proxy, handles timeouts gracefully

#### tasteMatching.ts (200+ lines)
**Purpose**: Local taste comparison algorithm

**Key Functions**:
- `computeAllCompatibilities()` - Compare user taste with all friends
- `getLocalTasteMatch()` - Analyze shared music
- Fallback if ML service unavailable

**Algorithm**:
- Shared tracks (most weight)
- Shared albums
- Shared artists
- Genre overlap
- Mood/vibe similarity (from reviews)

**Status**: ✅ Working, ML optional

#### Other API files:
- `profiles.ts` - User profile CRUD
- `collaborativePlaylists.ts` - Collab playlist CRUD
- `follow.ts` - Follow/unfollow
- `favorites.ts` - Like songs/albums
- `lists.ts` - Music list CRUD
- `reminders.ts` - Reminder CRUD (notification trigger missing)
- `directMessages.ts` - Message fetch only (send broken)
- `activities.ts` - Activity log (no auto-insert)
- `notifications.ts` - Notification fetch/settings
- `musicSearch.ts` - Spotify + iTunes search

**Status**: Most ✅, some ⚠️ (messaging, notifications, activities)

### Authentication

**Flow**:
1. User enters email + password → Supabase Auth
2. OR user clicks "Connect Spotify" → OAuth to Spotify
3. Spotify redirects to `spotify-callback` Edge Function
4. Function exchanges code for token, stores in Supabase metadata
5. Frontend stores Supabase session (auto-managed by SDK)

**Timeout Strategy**:
- Session cache: Returns cached result for 60+ seconds
- 10s Spotify session validity check
- 45s profile sync watchdog
- Graceful fallbacks if auth fails

**Status**: ✅ Robust, with multiple safety checks

### External API Integration Status

| Service | Used For | Real/Mock | Status |
|---------|----------|-----------|--------|
| Spotify Web API | User data, search, audio features | Real | ✅ |
| Spotify OAuth | Authentication | Real | ✅ |
| Ticketmaster API | Event discovery | Real (via proxy) | ✅ |
| iTunes Search | Album art fallback | Real | ✅ |
| Custom ML Service | Mood classification, taste matching | Real but optional | ⚠️ |

### Database Endpoints (via Supabase SDK)

All queries use `@supabase/supabase-js` SDK:
```typescript
supabase.from('table').select(...).eq(...).order(...).limit(...)
supabase.from('table').insert({...})
supabase.from('table').update({...}).eq(...)
supabase.from('table').delete().eq(...)
supabase.from('table').on('*', callback).subscribe()
```

RLS enforces permissions on all tables.

### Mock / Stubbed Endpoints

- `/realtime-demo` endpoints - Demo data only
- Direct message `send` - No endpoint (broken)
- Create activity - No auto-trigger (manual insert)
- Notification creation - No auto-trigger (manual insert)
- Reminder notification - No notification service

**Status**: Most real, several broken, a few mocked for demo

---

## 8. DATABASE / DATA MODEL

### Core Tables (from migrations)

**Table: profiles**
```
Columns: id (UUID), username, avatar_url, bio, created_at, updated_at, mood_preferences (JSON)
Purpose: User account info
RLS: Users can view public profiles, edit own
```

**Table: reviews**
```
Columns: id, uid (foreign key), track_id, artist_id, album_id, title, rating (1-5), content (text), mood (enum), visibility (public/friends/private), likes_count, comments_count, created_at, updated_at
Purpose: User reviews of tracks/albums
RLS: Create own, view by visibility, edit own, delete own
Indexes: visibility, uid, created_at (for pagination)
```

**Table: follows**
```
Columns: id, follower_id, following_id, created_at
Purpose: Friendship relationships
RLS: Users can follow others, see follows
Indexes: follower_id, following_id, created_at
```

**Table: collaborative_playlists**
```
Columns: id, name, owner_id, created_at, updated_at, is_public (boolean)
Purpose: Shared playlists
RLS: Owner can edit, members can add tracks
Real-time: Subscriptions on insert/update/delete
```

**Table: collaborative_playlist_tracks**
```
Columns: id, playlist_id (FK), track_id, artist_id, added_by, added_at, order_index
Purpose: Tracks in collab playlists
RLS: Members can add/remove
Real-time: Subscriptions push updates to all members
```

**Table: direct_messages**
```
Columns: id, sender_id, recipient_id, content, created_at, read_at (nullable)
Purpose: DM storage
RLS: Users can send to anyone, view own threads
Real-time: ✅ Subscriptions work
Status: ⚠️ Send endpoint broken
```

**Table: notifications**
```
Columns: id, user_id, type (follow/like/comment/etc), trigger_user_id, trigger_review_id, data (JSON), read_at (nullable), created_at
Purpose: Notification log
RLS: Users can view own
Real-time: ✅ Subscriptions work
Status: 🟡 Not auto-created on events
```

**Table: notification_settings**
```
Columns: id, user_id, follow_notifications, like_notifications, comment_notifications, etc. (all boolean)
Purpose: User notification preferences
RLS: Users can edit own
Status: ✅ UI exists, wiring unclear
```

**Table: activities**
```
Columns: id, user_id, activity_type (string), related_user_id, related_review_id, data (JSON), created_at
Purpose: Activity timeline
RLS: Users can view others' public activities
Status: 🟡 Infra exists, no auto-creation
```

**Table: music_lists**
```
Columns: id, user_id, name, description, is_public (boolean), created_at, updated_at
Purpose: Custom music collections
RLS: Owner can edit, others can view if public
```

**Table: music_list_items**
```
Columns: id, list_id (FK), track_id, artist_id, added_at, order_index
Purpose: Tracks in lists
RLS: List owner can add/remove
```

**Table: favorites**
```
Columns: id, user_id, track_id (nullable), album_id (nullable), artist_id (nullable), added_at
Purpose: Liked songs/albums/artists
RLS: Users can like, view own
Indexes: user_id, added_at
```

**Table: review_likes**
```
Columns: id, review_id (FK), user_id (FK), created_at
Purpose: Track review engagement
RLS: Users can like/unlike own reviews
```

**Table: review_comments**
```
Columns: id, review_id (FK), user_id (FK), content (text), created_at, updated_at
Purpose: Comments on reviews
RLS: Create own, edit own (may be broken), delete own (may be broken)
```

**Table: reminders**
```
Columns: id, user_id, track_id (nullable), album_id (nullable), artist_id (nullable), reminder_date, message, created_at, notified_at (nullable)
Purpose: Reminders to listen to music
RLS: Users can set/delete own
Status: ⚠️ Set works, notify doesn't trigger
```

**Table: spotify_connections**
```
Columns: id, user_id (FK), access_token (encrypted), refresh_token (encrypted), token_expires_at, scopes, created_at, updated_at
Purpose: Spotify auth tokens
RLS: Users can access own only
Status: ✅ Managed by Supabase Auth metadata (alternative approach)
```

**Table: listening_stats_cache**
```
Columns: id, user_id (FK), stat_type (string), data (JSON), time_range, cached_at, expires_at
Purpose: Cache Spotify stats to reduce API calls
RLS: Users can view own
Status: May not be actively used (in-memory caching preferred)
```

**Plus 2-3 internal tables**:
- `audit_logs`, `system_config`, etc. (not user-facing)

### Data Relationships

```
profiles (1) ──→ (many) reviews
         ├─→ (many) follows (via follower_id)
         ├─→ (many) follows (via following_id)
         ├─→ (many) collaborative_playlists (owner)
         ├─→ (many) music_lists
         ├─→ (many) favorites
         ├─→ (many) reminders
         ├─→ (many) notifications
         └─→ (many) activities

reviews (1) ──→ (many) review_likes
           ├─→ (many) review_comments
           └─→ (many) likes from profiles

collaborative_playlists (1) ──→ (many) collaborative_playlist_tracks

music_lists (1) ──→ (many) music_list_items
```

### localStorage Usage

**Keys**:
- `supabase.auth.token` - Session (Supabase-managed)
- `supabase.auth.refresh.token` - Refresh token
- `theme-preference` - "light" | "dark"
- `spotify-user-info` - Cached Spotify profile
- `preview-volume` - Audio player volume (0-1)
- `onboarding-step` - Last completed step
- `last-activity-fetch` - Timestamp
- Various component state keys (UI preferences)

**Status**: ✅ Light usage, mostly auto-managed by Supabase

### Session / In-Memory Caching

**sessionCache.ts**:
- Caches `getSession()` result
- Returns cached for 60+ seconds
- Avoids redundant async auth calls on page load

**queryCache.ts**:
- TTL: 5 min for public reviews, 3 min for friend reviews
- Invalidates on mutations (create, update, delete)
- Generic, reusable cache utility

**Status**: ✅ Integrated and working

### Mock Data / Fixtures

1. **RealtimeFeaturesPage** - Entirely mock with hardcoded data
2. **Taste Matching** - Real user reviews but local algorithm (no ML needed)
3. **Activity Feed** - Sample data shown, not auto-popul
4. **Personality Archetypes** - Hardcoded descriptions, computed archetypes

**Status**: Limited mock data, mostly real

---

## 9. FEATURE STATUS MATRIX

| Feature | Implemented? | Data Type | Status | Priority | Notes |
|---------|--------------|-----------|--------|----------|-------|
| Email/Password Auth | ✅ | Real | Complete | Core | via Supabase |
| Spotify OAuth | ✅ | Real | Complete | Core | PKCE flow, tokens managed |
| Create Review | ✅ | Real | Complete | Core | With mood classification |
| View Reviews | ✅ | Real | Complete | Core | Multiple feed views |
| Edit Review | ✅ | Real | Complete | Core | Can update all fields |
| Delete Review | ✅ | Real | Complete | Core | Owner only |
| Follow User | ✅ | Real | Complete | Core | Bidirectional tracking |
| Like Review | ✅ | Real | Complete | Core | Counter + real-time |
| Comment on Review | ✅ | Real | Complete | Core | No edit/delete |
| Search Music | ✅ | Real | Complete | Core | Spotify + iTunes |
| Browse Discover | ✅ | Real | Complete | Core | By genre + mood |
| View Events | ✅ | Real | Complete | Core | Ticketmaster data |
| Create Music List | ✅ | Real | Complete | Core | Custom collections |
| Collab Playlists | ✅ | Real | Complete | Core | Real-time sync |
| Insights Dashboard | ✅ | Real | Complete | Core | Top tracks/artists/moods |
| Taste Matching | ✅ | Real/Hybrid | Complete | Core | Local + optional ML |
| Mood Analysis | ✅ | Real | Complete | Core | Spotify audio features |
| Music Personality | ✅ | Real | Complete | Core | 5-archetype model |
| View Profile | ✅ | Real | Complete | Core | Self + others |
| Edit Profile | ✅ | Real | Complete | Core | Avatar, bio, taste |
| Community Feed | ✅ | Real | Complete | Core | Public reviews |
| Friend Activity | ⚠️ | Real | Partial | Core | Not auto-populated |
| Direct Messages | ⚠️ | Real | Broken | Core | Receive only, no send |
| Message Notifications | ⚠️ | Real | Broken | Core | No trigger logic |
| Set Reminder | ✅ | Real | Complete | Core | Calendar reminders |
| Reminder Notifications | ⚠️ | Real | Broken | Core | No notification service |
| Invite to Playlist | ✅ | Real | Complete | Core | Via notification |
| Accept Playlist Invite | ⚠️ | Real | Unclear | Core | Flow untested |
| Dark/Light Theme | ✅ | Pref | Complete | Polish | localStorage |
| Notifications Center | ✅ | Real | Partial | Core | Infra only, no triggers |
| Settings Panel | ✅ | Real/Partial | Mostly done | Core | Some missing (delete account) |
| Block User | ❌ | - | Missing | Nice-to-have | Not implemented |
| Delete Account | ❌ | - | Missing | Nice-to-have | Not implemented |
| Language/Region | ❌ | - | UI only | Scope-creep | No i18n backend |
| Comment Edit/Delete | ❌ | - | Broken | Core | No endpoint |
| Review Calendar View | 🟡 | Mock | Placeholder | Scope-creep | UI only |
| Message Search | ❌ | - | Missing | Nice-to-have | Not in code |
| Email Notifications | ❌ | - | Missing | Nice-to-have | Not in code |
| Push Notifications | ❌ | - | Missing | Nice-to-have | Not in code |

---

## 10. INTERIM-REPORT ALIGNMENT

### Comparing Current Codebase to Expected Features

**Feature**: Authentication / Spotify Connect
- ✅ **Clearly in codebase** - src/components/AuthPage.tsx, src/lib/api/spotify.ts
- ✅ **Clearly in interim report** - Core stated feature
- 🟢 **Risk level**: Low
- **Recommendation**: KEEP - Solid implementation, no changes needed

**Feature**: Home Feed and Reviews
- ✅ **Clearly in codebase** - HomePage, ReviewsPage, review APIs
- ✅ **Clearly in interim report** - Core stated feature
- 🟢 **Risk level**: Low
- **Recommendation**: KEEP - Fully functional with pagination

**Feature**: Your Space Profile/Stats
- ✅ **Clearly in codebase** - YourSpacePage, ProfilePage, editProfilePage
- ✅ **Clearly in interim report** - Core stated feature
- 🟢 **Risk level**: Low
- **Recommendation**: KEEP - Complete implementation

**Feature**: Concerts & Events
- ✅ **Clearly in codebase** - EventsPage, ticketmaster.ts API
- ✅ **Clearly in interim report** - Core stated feature
- 🟢 **Risk level**: Low
- **Recommendation**: KEEP - Well-integrated, real Ticketmaster data

**Feature**: Messaging
- ✅ **Clearly in codebase** - MessagingPage, directMessages.ts
- ❓ **Uncertain in interim report** - May have been core or optional
- 🔴 **Risk level**: HIGH
- **Recommendation**: REMOVE or clearly state "receive-only" in demo. Sending is broken. If interim report shows full messaging, this is a gap.

**Feature**: Review Calendar
- 🟡 **Partially in codebase** - ReviewCreationModal has calendar UI but no data
- ❓ **Uncertain in interim report** - May have been planned
- 🟡 **Risk level**: MEDIUM
- **Recommendation**: HIDE or REMOVE before final submission. UI exists but non-functional.

**Feature**: Taste Match
- ✅ **Clearly in codebase** - TasteMatchingPage, tasteMatching.ts
- ✅ **Clearly in interim report** - Core stated feature
- 🟢 **Risk level**: Low
- **Recommendation**: KEEP - Works with local algorithm, optional ML

**Feature**: Mood Analysis
- ✅ **Clearly in codebase** - MoodAnalysisPage, mlService.ts integration
- ✅ **Clearly in interim report** - Core stated feature
- 🟡 **Risk level**: MEDIUM (depends on Spotify audio features availability)
- **Recommendation**: KEEP - But add disclaimer if audio features unavailable

**Feature**: Discover
- ✅ **Clearly in codebase** - DiscoverPage, genre/mood browse
- ✅ **Clearly in interim report** - Core stated feature
- 🟢 **Risk level**: Low
- **Recommendation**: KEEP - Functional as implemented

**Feature**: Notifications
- ✅ **Infrastructure in codebase** - DB tables, real-time listeners
- 🟡 **Partially works** - Receive works, but no triggers fire
- ✅ **Likely in interim report** - Core stated feature
- 🔴 **Risk level**: HIGH
- **Recommendation**: HIDE or clearly state "notifications infrastructure exists but not auto-triggered". If report says notifications auto-trigger, this is a gap.

**Feature**: Collaborative Playlists
- ✅ **Clearly in codebase** - Full CRUD + real-time sync
- ✅ **Clearly in interim report** - Listed as core
- 🟢 **Risk level**: Low
- **Recommendation**: KEEP - Excellent real-time implementation

**Feature**: Music Personality
- ✅ **Clearly in codebase** - MusicPersonalityPage, 5 archetypes
- ✅ **Likely in interim report** - Listed as core
- 🟢 **Risk level**: Low
- **Recommendation**: KEEP - Unique, well-implemented feature

**Feature**: Activity Feed
- ✅ **Infrastructure in codebase** - DB table, display component
- 🟡 **Incomplete** - Shows recent reviews but not auto-populated activities
- ⚠️ **Likely in interim report** - May have been planned
- 🟡 **Risk level**: MEDIUM
- **Recommendation**: SIMPLIFY to just "recent user reviews" or add triggers before submission. Current implementation incomplete.

**Feature**: Community Feed
- ✅ **Clearly in codebase** - CommunityFeedPage, public reviews query
- ✅ **Likely in interim report** - Core social feature
- 🟢 **Risk level**: Low
- **Recommendation**: KEEP - Fully functional

### Summary of Alignment Risks

**🟢 LOW RISK** (keep as-is):
- Authentication, reviews, profile, events, discover, taste match, mood analysis, personality, collab playlists, community feed

**🟡 MEDIUM RISK** (review before submission):
- Review calendar (UI but no data)
- Activity feed (incomplete)
- Mood analysis (depends on Spotify audio features)

**🔴 HIGH RISK** (likely gap if report promised full features):
- Messaging (broken sending)
- Notifications (no auto triggers)

---

## 11. FYP SCOPE ADVICE

### Strong Core FYP Material

1. **Review System + Mood Classification**
   - Users can review tracks/albums with AI-assisted mood tags
   - Real mood classification (Spotify audio features)
   - Optional ML service integration
   - **Why strong**: Clear user value, novel feature, solid implementation

2. **Taste Matching Algorithm**
   - Compares user music taste with all friends
   - Local algorithm + optional ML
   - Works without Spotify connection (fallback to reviews)
   - **Why strong**: Algorithmically interesting, core social feature

3. **Collaborative Playlists with Real-time Sync**
   - Multiple users building playlists together
   - Supabase subscriptions for live updates
   - **Why strong**: Technical achievement, real-time is impressive

4. **Spotify Integration (OAuth + Data Fetching)**
   - PKCE-based OAuth flow
   - Pulls user top artists, tracks, audio features
   - Well-architected
   - **Why strong**: Complex integration, good security practices

5. **Insights Dashboard (Multi-faceted)**
   - Mood distribution analysis
   - Music personality archetype (5 types)
   - Taste matching comparison
   - Listening stats with time ranges
   - **Why strong**: Demonstrates data visualization, algorithmic thinking

### Duplicated / Redundant Functionality

1. **ReviewsPage vs. CommunityFeedPage vs. HomePage**
   - All three show reviews, slightly different filters
   - ReviewsPage = user's own reviews
   - CommunityFeedPage = public reviews
   - HomePage = personalized (friends + new stuff)
   - **Issue**: UI code duplication, could be consolidated
   - **Recommendation**: Keep HomePage + CommunityFeedPage, remove/merge ReviewsPage

2. **ListsPage vs. MyListsPage**
   - Seem to show the same data
   - **Issue**: Possible code duplication
   - **Recommendation**: Check if they're actually different; if not, consolidate

3. **Multiple Profile Pages**
   - UserProfilePage (other users)
   - YourSpacePage (self profile)
   - EditProfilePage (edit form)
   - **Issue**: Some code duplication in display logic
   - **Recommendation**: Keep all three but refactor shared components

4. **Event Display in Multiple Places**
   - EventsPage as main feature
   - Events shown in insights? (unclear)
   - **Recommendation**: Centralize if duplication exists

### Under-Documented / Unclear

1. **ML Service Integration**
   - Custom FastAPI service exists but not well-documented
   - What's the exact endpoint format?
   - What happens if it's down? (Fallback works, but unclear)
   - **Recommendation**: Add inline docs, define contract

2. **Taste Matching Algorithm**
   - Local algorithm logic is in code but not documented
   - How are weights assigned to tracks vs. albums vs. artists?
   - **Recommendation**: Add comment block explaining algorithm

3. **Supabase Edge Functions**
   - `spotify-callback` and `spotify-refresh` exist but not shown in repo list
   - **Recommendation**: Document what they do, show someone else

4. **Database Schema**
   - Some tables seem unused (listening_stats_cache)
   - Some fields unclear (what is `reminder_date` in reminders?)
   - **Recommendation**: Clean up unused tables before submission

5. **Notification System**
   - Real-time listeners work, but no auto-triggers documented
   - **Recommendation**: Add TODO comments or doc explaining gap

### Polish / Scope Creep

1. **Review Calendar**
   - Calendar UI exists but doesn't do anything
   - **Should be**: REMOVED (or hidden)
   - **Impact**: No functionality loss, cleaner UI

2. **Language/Region Settings**
   - UI exists, no i18n backend
   - **Should be**: REMOVED entirely
   - **Impact**: No functionality loss, cleaner code

3. **Comment Edit/Delete**
   - UI suggests it's possible, but no backend
   - **Should be**: Either implement or hide buttons

4. **Extensive Debug Logging**
   - 45+ console.log statements in production
   - **Should be**: Removed before final submission
   - **Impact**: Cleaner logs, no functionality loss

5. **Messaging Feature**
   - Database exists, send is broken
   - **Should be?**: Either fully implement or completely remove
   - **Current state**: Confusing (receive works, send doesn't)

6. **Notification Infrastructure**
   - All the DB, real-time listeners work, but no auto-creation
   - **Should be**: Either complete it or hide the feature
   - **Current state**: Looks complete but doesn't work

### What Should Probably Be Removed or Hidden

1. **Review Calendar** - Non-functional UI
2. **Direct Messaging (send feature)** - Broken
3. **Language/Region Settings** - No backend
4. **Comment Edit/Delete buttons** - No backend
5. **Notification Center auto-triggers** - Don't fire
6. **Reminder Notifications** - Don't trigger
7. **Console.log statements** - Debug clutter
8. **RealtimeFeaturesPage** - Demo-only, not a real feature

### What Needs Quick Fixes Before Submission

1. **Clean console.log** - Find all 45+ and remove/replace with proper logging
2. **Remove unused tables** - listening_stats_cache, etc.
3. **Fix comment edit/delete** - Either implement or hide buttons
4. **Fix messaging** - Implement send endpoint or remove feature entirely
5. **Fix activity auto-triggers** - Add audit triggers or hide feature
6. **Fix reminder notifications** - Implement or remove

---

## 12. FILES YOU SHOULD SHOW ANOTHER AI

### Critical Files for Codebase Understanding

**App Entry Points** (understand routing + auth):
1. `src/App.tsx` (1200+ lines) - Main router, auth initialization, cache setup
2. `src/main.tsx` - React entry point
3. `src/components/OnboardingFlow.tsx` - Initial auth/routing logic

**Route Definitions**:
4. All page files in `src/components/` ending in `Page.tsx`:
   - HomePage.tsx
   - ReviewsPage.tsx
   - InsightsPage.tsx
   - EventsPage.tsx
   - YourSpacePage.tsx
   - DiscoverPage.tsx
   - etc.

**Core Components** (features):
5. `src/components/CreateReviewPage.tsx` - Review creation core
6. `src/components/TasteMatchingPage.tsx` - Taste algorithm
7. `src/components/MoodAnalysisPage.tsx` - Mood classification
8. `src/components/CollaborativePlaylistPage.tsx` - Collab playlists
9. `src/components/InsightsPage.tsx` - Dashboard

**API/Service Layer** (understand data flow):
10. `src/lib/api/spotify.ts` - Spotify integration (600+ lines)
11. `src/lib/api/reviews.ts` - Review CRUD + caching
12. `src/lib/api/mlService.ts` - ML service integration
13. `src/lib/api/homeData.ts` - Personalized data fetching
14. `src/lib/api/insightsData.ts` - Analytics queries
15. `src/lib/api/tasteMatching.ts` - Taste comparison algorithm
16. `src/lib/api/ticketmaster.ts` - Event integration

**Caching & State**:
17. `src/lib/sessionCache.ts` - Session caching strategy
18. `src/lib/queryCache.ts` - Query result caching
19. `src/lib/useProfile.ts` - Profile context hook
20. `src/lib/useSpotify.ts` - Spotify data hook

**Database & Types**:
21. `src/lib/supabaseClient.ts` - DB setup
22. `src/lib/types.ts` - All TypeScript interfaces
23. `OnChord-repo/supabase/migrations/` - All migration files (001-018)

**Configuration**:
24. `src/vite-env.d.ts` - Environment variables
25. `.env.example` or `.env.local` - Config usage

**Test/Seed Data**:
26. `OnChord-repo/OnChord Frontend/scripts/seed-test-profiles.ts` - Sample data

**Build Config**:
27. `OnChord Frontend/vite.config.ts` - Vite build config
28. `OnChord Frontend/package.json` - Dependencies

**Documentation**:
29. `OnChord-repo/BACKEND_SETUP.md`
30. `OnChord-repo/SPOTIFY_SETUP.md`
31. `OnChord-repo/MIGRATION_STATUS.md`

### Folder Structure to Share

```
src/
├── App.tsx ⭐ (main router)
├── main.tsx
├── components/
│   ├── HomePage.tsx ⭐
│   ├── ReviewsPage.tsx ⭐
│   ├── InsightsPage.tsx ⭐
│   ├── TasteMatchingPage.tsx ⭐
│   ├── MoodAnalysisPage.tsx ⭐
│   ├── EventsPage.tsx ⭐
│   ├── CollaborativePlaylistPage.tsx ⭐
│   ├── CreateReviewPage.tsx ⭐
│   ├── YourSpacePage.tsx
│   ├── ProfilePage.tsx
│   ├── SettingsPage.tsx
│   ├── (all other pages)
│   └── ui/ (shadcn-ui components)
├── lib/
│   ├── api/ ⭐ (all service files)
│   │   ├── spotify.ts ⭐
│   │   ├── reviews.ts ⭐
│   │   ├── mlService.ts ⭐
│   │   ├── homeData.ts ⭐
│   │   ├── insightsData.ts ⭐
│   │   ├── tasteMatching.ts ⭐
│   │   └── (others)
│   ├── sessionCache.ts ⭐
│   ├── queryCache.ts ⭐
│   ├── supabaseClient.ts
│   ├── useProfile.ts
│   ├── useSpotify.ts
│   ├── types.ts ⭐
│   └── styles/
├── index.css

supabase/
├── migrations/ ⭐ (001-018.sql)
└── functions/ (spotify-callback, etc.)

OnChord-repo/
├── BACKEND_SETUP.md
├── SPOTIFY_SETUP.md
├── MIGRATION_STATUS.md
└── ML_SYSTEM_DESIGN.md

vite.config.ts
package.json
```

**Marked with ⭐** = Most important to share first

### What to Say When Sharing

> "Here's the OnChord codebase. It's a Spotify-integrated music review + discovery app with real-time collaborative features.
>
> **Start with these**:
> - App.tsx for routing/auth
> - src/lib/api/ for understanding data flow
> - HomePage, ReviewsPage, InsightsPage for core features
> - supabase/migrations for database schema
>
> **Known gaps**:
> - Messaging: receive works, send is broken
> - Notifications: infra complete, triggers don't fire
> - Activity feed: not auto-populated
> - Review calendar: UI only
> - 45+ console.log statements need cleanup
>
> **The good parts**:
> - Spotify OAuth (PKCE)
> - Taste matching algorithm
> - Mood classification with fallback
> - Real-time collab playlists
> - Excellent caching strategy
>
> Ask me anything about the architecture."

---

## 13. EXECUTIVE SUMMARY FOR CHATGPT

### OnChord: Music Review & Discovery Platform – Codebase Handoff

**What is OnChord?**

OnChord is a full-stack web app (React/TypeScript + Supabase) that lets users review music, discover new songs, analyze their listening habits, and collaborate with friends on playlists. It integrates deeply with Spotify for user data and uses a custom ML service for optional mood classification.

**Current State: Mostly Functional, Some Incomplete Features**

- ✅ **Working**: Reviews, feeds, profiles, search, events, collab playlists, insights dashboard, taste matching, mood analysis, music personality
- ⚠️ **Broken**: Direct messaging (send endpoint missing), notifications (no auto-triggers), activity feed (not auto-populated), reminders (notifications don't fire)
- 🟡 **Placeholder**: Review calendar (UI only), language settings (UI only)
- 🔧 **Tech debt**: 45+ console.log statements, potential code duplication in review feeds

**Architecture in 30 Seconds**

```
User → React Frontend (auth cached, query results cached, session cached)
     → Supabase (PostgreSQL + real-time subscriptions + RLS)
     → Spotify API (OAuth, user data, search, audio features)
     → Ticketmaster API (events)
     → Custom ML Service (mood classification, optional)
```

Real-time features (collab playlists, messaging, notifications) use Supabase subscriptions (LISTEN/NOTIFY).

**Top 3 Technical Achievements**

1. **Spotify OAuth with PKCE + Session Caching** – Secure, efficient auth flow with smart session caching to avoid redundant calls
2. **Real-time Collaborative Playlists** – Multiple users editing same playlist simultaneously via Supabase subscriptions
3. **Local Taste Matching Algorithm with ML Fallback** – Works offline without Spotify (or ML service), but can use ML for better accuracy

**Core Features (MVP-ish)**

- Create/share music reviews with mood tags (AI-classified or manual)
- Browse community reviews, friend activity, personalized new releases
- Analyze listening habits: top tracks/artists/genres, mood distribution chart
- Compare taste with friends (% similarity score)
- Discover music by genre/mood
- Find upcoming concerts for favorite artists
- Build collaborative playlists in real-time with friends
- Music personality profile (5 archetypes)

**Known Issues (Be Aware)**

1. **Messaging is broken** – Database works, real-time updates work, but there's no endpoint to actually send messages. Users can only receive and view history.
2. **Notifications don't auto-fire** – Database and real-time listeners are set up perfectly, but nothing actually creates notification records when users like/follow/comment.
3. **Activity feed incomplete** – Shows recent reviews but doesn't auto-log user activities. Manual insertion works.
4. **No i18n** – Language/region settings exist in UI but no backend.
5. **Spotify audio features sometimes unavailable** – Free tier Spotify accounts can't access audio features, so mood classification may fail for them.

**Code Quality Notes**

- Good: Strong separation of concerns (API layer, components, types)
- Good: Excellent caching strategy (session cache + query cache with TTL + cache invalidation)
- Good: Proper RLS on all database tables
- Issue: Extensive debug logging (should be cleaned up before final submission)
- Issue: Some UI code duplication (review feeds, profile pages)
- Issue: A few dead features (review calendar, comment edit/delete, language settings)

**What to Show Someone Else About This Code**

1. `App.tsx` (1200 lines) – Shows entire auth flow, route structure, real-time initialization
2. `src/lib/api/spotify.ts` – Clean OAuth + token management example
3. `src/lib/api/tasteMatching.ts` – The core taste-matching algorithm
4. `supabase/migrations/` – Database schema (18 migrations, well-structured)
5. `src/components/TasteMatchingPage.tsx` – Feature component using multiple APIs

**For a Final Year Project Submission**

✅ **Keep these** (core + functional):
- Review system, feeds, social features
- Collaborative playlists
- Taste matching
- Mood analysis
- Insights dashboard
- Events
- Spotify OAuth

⚠️ **Fix before submitting**:
- Remove console.log statements
- Hide or remove non-functional features (review calendar, messaging send, comment edit)
- Add docstrings to complex functions
- Clean up any dead code

❌ **Remove/hide**:
- Language settings UI (no backend)
- Notification auto-triggers (if not fully implemented)
- Activity feed (if not auto-populating)
- Review calendar (if just UI)

**Risk Assessment**

- If your interim report promised "full messaging" – HIGH risk, needs fix or reframing
- If your interim report promised "auto notifications" – HIGH risk, needs fix or reframing
- If your interim report promised "activity logging" – MEDIUM risk, could hide feature or complete it
- Everything else is solid

**Quick Start for Next Person**

1. Review App.tsx for overall flow
2. Read SPOTIFY_SETUP.md and BACKEND_SETUP.md
3. Check supabase/migrations/ for database structure
4. Read src/lib/api/spotify.ts for Spotify integration pattern
5. Look at src/lib/api/tasteMatching.ts for algorithm logic
6. Test the app: sign up, create review, try taste match, add to collab playlist

---

**Last Updated**: April 3, 2026  
**Prepared by**: [Your Name]  
**For**: Next developer or final project evaluation

This codebase is ~80% complete and functional. The remaining 20% is either broken features, design scope creep, or tech debt (logging). With 1-2 days of focused work, you could have a polished, submission-ready FYP project.

