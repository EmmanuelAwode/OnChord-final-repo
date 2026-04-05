import { useState, useEffect, lazy, Suspense } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { AuthPage } from "./components/AuthPage";
import { LoadingScreen } from "./components/LoadingScreen";
import { Navigation } from "./components/Navigation";
import { PreviewProvider } from "./components/SongPreviewPlayer";
import { ListsProvider } from "./lib/ListsContext";
import { QuickActionButton } from "./components/QuickActionButton";
import { Footer } from "./components/Footer";
import { NotificationsModal } from "./components/NotificationsModal";
import { RemindersModal } from "./components/RemindersModal";
import { AlbumModal } from "./components/AlbumModal";
import { ReviewCreationModal } from "./components/ReviewCreationModal";
import { useReviews } from "./lib/useUserInteractions";
import { useNavigationHistory } from "./lib/useNavigationHistory";
import { setupSessionCacheListener } from "./lib/sessionCache";
import { supabase } from "./lib/supabaseClient";
import { getAlbum, isSpotifyAutolinkDisabled } from "./lib/api/spotify";
import { Toaster } from "./components/ui/sonner";

// Lazy-loaded page components for code-splitting
const ResetPasswordPage = lazy(() => import("./components/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));
const HomePage = lazy(() => import("./components/HomePage").then(m => ({ default: m.HomePage })));
const DiscoverPage = lazy(() => import("./components/DiscoverPage").then(m => ({ default: m.DiscoverPage })));
const InsightsPage = lazy(() => import("./components/InsightsPage").then(m => ({ default: m.InsightsPage })));
const ProfilePage = lazy(() => import("./components/ProfilePage").then(m => ({ default: m.ProfilePage })));
const ReviewsPage = lazy(() => import("./components/ReviewsPage").then(m => ({ default: m.ReviewsPage })));
const MessagingPage = lazy(() => import("./components/MessagingPage").then(m => ({ default: m.MessagingPage })));
const CollaborativePlaylistPage = lazy(() => import("./components/CollaborativePlaylistPage").then(m => ({ default: m.CollaborativePlaylistPage })));
const CollaborativePlaylistsHub = lazy(() => import("./components/CollaborativePlaylistsHub").then(m => ({ default: m.CollaborativePlaylistsHub })));
const CreateReviewPage = lazy(() => import("./components/CreateReviewPage").then(m => ({ default: m.CreateReviewPage })));
const SettingsPage = lazy(() => import("./components/SettingsPage").then(m => ({ default: m.SettingsPage })));
const EditProfilePage = lazy(() => import("./components/EditProfilePage").then(m => ({ default: m.EditProfilePage })));
const CollectionDetailPage = lazy(() => import("./components/CollectionDetailPage").then(m => ({ default: m.CollectionDetailPage })));
const EventsPage = lazy(() => import("./components/EventsPage").then(m => ({ default: m.EventsPage })));
const AboutPage = lazy(() => import("./components/AboutPage").then(m => ({ default: m.AboutPage })));
const PrivacyPage = lazy(() => import("./components/PrivacyPage").then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("./components/TermsPage").then(m => ({ default: m.TermsPage })));
const HelpPage = lazy(() => import("./components/HelpPage").then(m => ({ default: m.HelpPage })));
const YourSpacePage = lazy(() => import("./components/YourSpacePage").then(m => ({ default: m.YourSpacePage })));
const ListsPage = lazy(() => import("./components/ListsPage").then(m => ({ default: m.ListsPage })));
const OnboardingFlow = lazy(() => import("./components/OnboardingFlow").then(m => ({ default: m.OnboardingFlow })));
const FindFriendsPage = lazy(() => import("./components/FindFriendsPage").then(m => ({ default: m.FindFriendsPage })));
const FriendsReviewsPage = lazy(() => import("./components/FriendsReviewsPage").then(m => ({ default: m.FriendsReviewsPage })));
const UserProfilePage = lazy(() => import("./components/UserProfilePage").then(m => ({ default: m.UserProfilePage })));

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-pulse flex flex-col items-center gap-3">
      <div className="h-2 w-12 bg-primary/30 rounded" />
    </div>
  </div>
);

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const { currentPage, navigate, goBack, canGoBack } = useNavigationHistory("home");

  const [darkMode, setDarkMode] = useState(true);
  const [accentColor, setAccentColor] = useState("purple");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [remindersModalOpen, setRemindersModalOpen] = useState(false);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);

  const [selectedAlbumData, setSelectedAlbumData] = useState<any>(null);
  const [albumModalLoading, setAlbumModalLoading] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | undefined>(undefined);
  const [editingReview, setEditingReview] = useState<any>(null);

  // ============================================================================
  // LOADING STATE MANAGEMENT
  // ============================================================================
  // isAuthReady: Single source of truth for whether the app is ready for user interaction
  // - Set to true only AFTER session check completes (10s timeout)
  // - ALL navigation/interactive elements are DISABLED until this is true
  // - Prevents click handlers from firing during auth initialization
  // - Background profile sync continues after isAuthReady is true
  //
  // Protection layers:
  // 1. Navigation component: clicks disabled during loading
  // 2. Footer component: navigation links disabled during loading  
  // 3. Quick action button: actions prevented during loading
  // 4. Navigation handler: early return if !isAuthReady
  // 5. Quick action handler: early return if !isAuthReady
  // ============================================================================
  const [session, setSession] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authInitError, setAuthInitError] = useState<string | null>(null);
  const [authWatchdogTriggered, setAuthWatchdogTriggered] = useState(false);
  
  const [insightsTab, setInsightsTab] = useState<string>("dashboard");

  const [userData, setUserData] = useState({
    username: "Marcus Williams",
    email: "marcus@onchord.com",
  });

  const { userReviews, addReview, updateReview, deleteReview, isLoadingReviews, reviewsError } =
    useReviews();

  // Review Creation Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewMediaType, setReviewMediaType] = useState<"album" | "song">("album");
  const [reviewMediaDetails, setReviewMediaDetails] = useState({
    id: "",
    title: "",
    artist: "",
    cover: "",
  });

  const withTimeout = async <T,>(
    promise: PromiseLike<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const AUTH_INIT_TIMEOUT_MS = 20000; // Auth session lookup with timeout
  const PROFILE_INIT_TIMEOUT_MS = 45000; // Increased for slow network (was 30s)

  const isTimeoutError = (error: unknown) =>
    error instanceof Error && error.message.toLowerCase().includes("timed out");

  const getSessionWithRetry = async () => {
    try {
      return await withTimeout(
        supabase.auth.getSession(),
        AUTH_INIT_TIMEOUT_MS,
        "Auth session lookup timed out"
      );
    } catch (error) {
      if (!isTimeoutError(error)) throw error;

      // Retry once to avoid transient network stalls causing a hard failure.
      return await withTimeout(
        supabase.auth.getSession(),
        AUTH_INIT_TIMEOUT_MS,
        "Auth session lookup timed out"
      );
    }
  };

  const syncProfileAndRoute = async (u: any | null) => {
    if (!u) {
      setNeedsOnboarding(false);
      return;
    }

    const profileQuery = supabase
      .from("profiles")
      .select("username, accent_color, email, onboarding_completed")
      .eq("id", u.id)
      .maybeSingle();

    let data: any;
    let error: any;
    try {
      const result = await withTimeout(
        Promise.resolve(profileQuery),
        PROFILE_INIT_TIMEOUT_MS,
        "Profile initialization timed out"
      );
      data = result.data;
      error = result.error;
    } catch (profileError) {
      // If profile bootstrap times out, allow user into app with safe fallback values.
      if (isTimeoutError(profileError)) {
        const email = u.email ?? "";
        const username = (u.user_metadata?.username as string) || email.split("@")[0] || "User";
        setUserData({ username, email });
        setNeedsOnboarding(false);
        return;
      }
      throw profileError;
    }

    if (error) {
      console.error("profiles fetch error:", error);
      setNeedsOnboarding(true);
      return;
    }

    // ✅ IMPORTANT: if no row exists yet, user must onboard
    if (!data) {
      setNeedsOnboarding(true);
      return;
    }

    // ✅ Decide onboarding ONLY by onboarding_completed
    if (!data.onboarding_completed) {
      setNeedsOnboarding(true);
      return;
    }

    const email = u.email ?? data.email ?? "";
    const username = (data.username ?? "").trim();
    const accent = (data.accent_color ?? "").trim();

    setUserData({ username: username || "User", email });
    if (accent) setAccentColor(accent);
    setNeedsOnboarding(false);
  };

  // Non-blocking background profile sync (doesn't delay app load)
  const syncProfileInBackground = async (u: any | null) => {
    if (!u) {
      setNeedsOnboarding(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, accent_color, email, onboarding_completed")
        .eq("id", u.id)
        .maybeSingle()
        .abortSignal();

      if (error) {
        console.error("background profile fetch error:", error);
        setNeedsOnboarding(true);
        return;
      }

      if (!data) {
        setNeedsOnboarding(true);
        return;
      }

      if (!data.onboarding_completed) {
        setNeedsOnboarding(true);
        return;
      }

      const email = u.email ?? data.email ?? "";
      const username = (data.username ?? "").trim();
      const accent = (data.accent_color ?? "").trim();

      setUserData({ username: username || "User", email });
      if (accent) setAccentColor(accent);
      setNeedsOnboarding(false);
    } catch (error) {
      console.error("background sync error:", error);
    }
  };

  // Initialize session cache listener (reduces redundant auth calls)
  useEffect(() => {
    setupSessionCacheListener();
  }, []);

  useEffect(() => {
    let mounted = true;
    const authWatchdog = setTimeout(() => {
      if (!mounted) return;
      // Recovery path: clear stale OAuth callback state and allow app to render.
      if (window.location.search || window.location.hash || window.location.pathname !== "/") {
        window.history.replaceState({}, document.title, "/");
      }
      sessionStorage.removeItem("spotify_pkce_code_verifier");
      sessionStorage.removeItem("spotify_pkce_flow");
      setAuthWatchdogTriggered(true);
      setAuthInitError("Login is taking too long. Please retry.");
      setIsAuthReady(true);
    }, AUTH_INIT_TIMEOUT_MS + 10000);

    const init = async () => {
      // ===== CRITICAL: Auth Initialization with Click Protection =====
      // 1. Check session (getSessionWithRetry) -> 10s timeout
      // 2. Set isAuthReady=true IMMEDIATELY to unlock UI (prevents blocked user experience)
      // 3. Fetch profile data in background (non-blocking, up to 45s)
      //
      // WHY THIS ORDER:
      // - Users see app UI within 1-2s instead of 20s
      // - Navigation/clicks are still blocked via isAuthReady guard
      // - Profile data loads asynchronously without blocking login flow
      //
      // PROTECTION MECHANISMS:
      // - Navigation handlers check "if (!isAuthReady) return" early
      // - Navigation/Footer buttons have "disabled={!isAuthReady}"
      // - Quick action button checks isAuthReady before navigating
      // - No navigation state changes occur until isAuthReady=true
      // ================================================================
      
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const spotifyVerifier = sessionStorage.getItem("spotify_pkce_code_verifier");
        const spotifyFlowMarker = sessionStorage.getItem("spotify_pkce_flow");

        // Clean URL immediately — remove stale code params and path fragments
        // This prevents SettingsPage from trying to re-process old Spotify callbacks
        if (window.location.pathname !== "/" || window.location.hash) {
          // Preserve code param only if it's fresh (has a verifier or is a Supabase code)
          const cleanUrl = code ? "/?code=" + code : "/";
          window.history.replaceState({}, document.title, cleanUrl);
        }

        // If this is a Spotify API callback (not Supabase social login), don't let Supabase touch it
        if (code && spotifyVerifier && spotifyFlowMarker === "api_connect") {
          // Navigate to settings to let SettingsPage handle the Spotify API callback
          // But first get the existing session
          const { data } = await getSessionWithRetry();
          if (!mounted) return;
          setSession(data.session);
          // Fetch profile in background (non-blocking)
          syncProfileInBackground(data.session?.user ?? null);
          setAuthInitError(null);
          setIsAuthReady(true);
          navigate("settings");
          return;
        }

        // For Supabase OAuth / email verification:
        // detectSessionInUrl + flowType: "pkce" handles the code exchange automatically
        // Just wait for getSession to return the result
        const { data, error } = await getSessionWithRetry();
        if (!mounted) return;

        if (error) console.error("getSession error:", error);

        const sess = data.session;
        setSession(sess);

        // Clean up URL after session is processed
        if (window.location.search || window.location.hash || window.location.pathname !== "/") {
          window.history.replaceState({}, document.title, "/");
        }

        // Load app immediately, fetch profile in background (non-blocking)
        setAuthInitError(null);
        setIsAuthReady(true);
        syncProfileInBackground(sess?.user ?? null);
      } catch (e) {
        console.error("init auth error:", e);
        if (mounted) {
          if (window.location.search || window.location.hash || window.location.pathname !== "/") {
            window.history.replaceState({}, document.title, "/");
          }
          if (isTimeoutError(e)) {
            // Graceful fallback: treat as signed out instead of blocking app load.
            setSession(null);
            setNeedsOnboarding(false);
            setAuthInitError(null);
          } else {
            setAuthInitError("Couldn't initialize your session. Please retry.");
          }
        }
      } finally {
        if (mounted) {
          setIsAuthReady(true);
        }
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      // Fetch profile in background (non-blocking)
      syncProfileInBackground(newSession?.user ?? null);
      setAuthInitError(null);

      // Auto-link Spotify API connection when user signs in via Spotify OAuth
      if (
        _event === "SIGNED_IN" &&
        newSession?.user?.app_metadata?.provider === "spotify" &&
        newSession.provider_token &&
        !isSpotifyAutolinkDisabled()
      ) {
        try {
          const user = newSession.user;
          const spotifyProfile = user.user_metadata;
          await supabase.from("spotify_connections").upsert(
            {
              user_id: user.id,
              access_token: newSession.provider_token,
              ...(newSession.provider_refresh_token
                ? { refresh_token: newSession.provider_refresh_token }
                : {}),
              expires_at: new Date(
                Date.now() + 3600 * 1000
              ).toISOString(),
              spotify_user_id: spotifyProfile?.provider_id ?? spotifyProfile?.sub ?? null,
              spotify_display_name: spotifyProfile?.full_name ?? spotifyProfile?.name ?? null,
              spotify_email: spotifyProfile?.email ?? user.email ?? null,
            },
            { onConflict: "user_id" }
          );
          console.log("Auto-linked Spotify connection from social login");
        } catch (e) {
          console.error("Failed to auto-link Spotify connection:", e);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(authWatchdog);
      sub.subscription.unsubscribe();
    };
  }, []);

  // 1) Restore local UI prefs/user data (runs once)
  useEffect(() => {
    const savedAccentColor = localStorage.getItem("onchord_accent_color");

    // Legacy key from older builds; avoid hydrating stale cross-account names.
    localStorage.removeItem("onchord_user_data");

    if (savedAccentColor) setAccentColor(savedAccentColor);
  }, []);

  // Collaborative playlists state - starts empty, created by user
  const [collaborativePlaylists, setCollaborativePlaylists] = useState<any[]>([]);

  // Simulate initial loading - disabled for faster development
  useEffect(() => {
    // Skip loading screen for now to avoid timeout
    setIsLoading(false);
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Close sidebar on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [sidebarOpen]);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Apply accent color to CSS variables
  useEffect(() => {
    const accentColors: Record<string, string> = {
      purple: "#A855F7",
      blue: "#3B82F6",
      pink: "#EC4899",
      green: "#10B981",
      orange: "#F59E0B",
    };
    
    document.documentElement.style.setProperty("--primary", accentColors[accentColor]);
    document.documentElement.style.setProperty("--accent", accentColors[accentColor]);
    document.documentElement.style.setProperty("--ring", accentColors[accentColor]);
  }, [accentColor]);

  // REPLACE your handleOnboardingComplete with this
  const handleOnboardingComplete = async (
    data: { displayName: string; accentColor: string }
  ): Promise<boolean> => {
    const uid = session?.user?.id;
    const email = session?.user?.email ?? userData.email;

    if (!uid) {
      toast.error("Not logged in");
      return false;
    }

    const username = data.displayName.trim();
    if (!username) {
      toast.error("Please enter a display name");
      return false;
    }

    toast.loading("Saving your profile...", { id: "onboarding-save" });

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: uid,
          email,
          username,
          accent_color: data.accentColor,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      console.error("Failed to save profile:", error);
      toast.error(error.message, { id: "onboarding-save" });
      return false;
    }

    setUserData((prev) => ({ ...prev, username, email }));
    setAccentColor(data.accentColor);
    setNeedsOnboarding(false);

    toast.success("Welcome!", { id: "onboarding-save" });
    navigate("home");
    return true;
  };

  const handleOpenAlbumModal = async (albumData?: any) => {
    setAlbumModalOpen(true);

    // If it's a string, treat it as a Spotify album ID and fetch full data
    if (typeof albumData === "string") {
      setAlbumModalLoading(true);
      setSelectedAlbumData(null);
      try {
        const spotifyAlbum = await getAlbum(albumData);
        setSelectedAlbumData(spotifyAlbum);
      } catch (err) {
        console.error("Failed to fetch album:", err);
        // No fallback - modal will show loading state or empty
        setSelectedAlbumData(null);
      } finally {
        setAlbumModalLoading(false);
      }
    } else {
      setSelectedAlbumData(albumData || null);
    }
  };

  const handleCloseAlbumModal = () => {
    setAlbumModalOpen(false);
    setSelectedAlbumData(null);
  };

  const handleOpenPlaylist = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    navigate("playlist-detail");
  };

  const handleLogout = async () => {
    // Force-clear all local state first so we don't get stuck
    setSession(null);
    setNeedsOnboarding(false);
    localStorage.clear();
    sessionStorage.clear();

    // Try to sign out from Supabase (with timeout so it doesn't hang)
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise(resolve => setTimeout(resolve, 2000)),
      ]);
    } catch (e) {
      console.error("signOut error:", e);
    }

    // Force clean reload to login page
    window.history.replaceState({}, document.title, "/");
    window.location.reload();
  };


  const handleQuickAction = (action: string) => {
    // PROTECTION: Prevent quick action navigation during auth loading
    // Quick action buttons should not respond until app is fully initialized
    if (!isAuthReady) return;
    
    switch (action) {
      case "review":
        navigate("review");
        break;
      case "collab":
        navigate("playlist");
        break;
      case "list":
        navigate("your-space-lists");
        break;
      case "event":
        navigate("events");
        break;
      case "connect":
        navigate("find-friends");
        break;
      default:
        break;
    }
  };

  const handleOpenReviewModal = (mediaType: "album" | "song", mediaId: string, mediaTitle: string, mediaArtist: string, mediaCover: string) => {
    setReviewMediaType(mediaType);
    setReviewMediaDetails({
      id: mediaId,
      title: mediaTitle,
      artist: mediaArtist,
      cover: mediaCover,
    });
    setReviewModalOpen(true);
    // Close the album modal if it's open
    setAlbumModalOpen(false);
  };

  // Navigation handler with options support
  const handleNavigate = (page: string, options?: { insightsTab?: string }) => {
    if (options?.insightsTab) {
      setInsightsTab(options.insightsTab);
    }
    navigate(page);
  };

const handleSubmitReview = async (reviewData: {
  id?: string;
  rating: number;
  content: string;
  mood?: string;
  listeningContext?: string;
  favoriteTrack?: string;
  visibility: "public" | "friends" | "private";
}) => {
  const type: "album" | "track" = reviewMediaType === "song" ? "track" : "album";
  const isPublic = reviewData.visibility !== "private";

  try {
    if (reviewData.id) {
      await updateReview(reviewData.id, {
        rating: reviewData.rating,
        content: reviewData.content,
        mood: reviewData.mood || undefined,
        // your DB uses where_listened; keep mapping simple:
        whereListened: reviewData.listeningContext || undefined,
        favoriteTrack: reviewData.favoriteTrack || undefined,
        visibility: reviewData.visibility,
        isPublic,
        type,
      });

      import("sonner").then(({ toast }) => toast.success("Review updated successfully!"));
      setEditingReview(null);
      return;
    }

    const uid = session?.user?.id;
    if (!uid) throw new Error("Not logged in");

    await addReview({
      userId: uid,
      userName: userData.username,
      userAvatar: "", // Profile data is fetched in createReview API

      albumId: reviewMediaDetails.id,
      albumTitle: reviewMediaDetails.title,
      albumArtist: reviewMediaDetails.artist,
      albumCover: reviewMediaDetails.cover,

      rating: reviewData.rating,
      type,
      content: reviewData.content,

      tags: [],
      mood: reviewData.mood || undefined,
      whereListened: reviewData.listeningContext || undefined,
      favoriteTrack: reviewData.favoriteTrack || undefined,

      visibility: reviewData.visibility,
      isPublic,
    });


    import("sonner").then(({ toast }) =>
      toast.success(`Review for "${reviewMediaDetails.title}" submitted successfully!`)
    );
  } catch (e: any) {
    import("sonner").then(({ toast }) =>
      toast.error(e?.message ?? "Failed to submit review")
    );
  }
};

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return (
          <HomePage
            onNavigate={navigate}
            username={userData.username}
            onOpenAlbum={handleOpenAlbumModal}
            onEditReview={setEditingReview}
            reviews={userReviews}
          />
        );
      case "discover":
        return <DiscoverPage onNavigate={handleNavigate} onOpenAlbum={handleOpenAlbumModal} onOpenReviewModal={handleOpenReviewModal} />;
      case "search":
        // Redirect to home page
        navigate("home");
        return <HomePage onNavigate={navigate} username={userData.username} onOpenAlbum={handleOpenAlbumModal} />;
      case "events":
        const eventId = pendingEventId;
        if (eventId) {
          setPendingEventId(null); // Clear after using
        }
        return <EventsPage onNavigate={navigate} onBack={goBack} canGoBack={canGoBack} initialEventId={eventId || undefined} />;
      case "insights":
        return <InsightsPage onNavigate={navigate} defaultTab={insightsTab} />;
      case "reviews":
        return <ReviewsPage onNavigate={navigate} onOpenAlbum={handleOpenAlbumModal} onEditReview={setEditingReview} />;
      case "your-space":
        return (
          <YourSpacePage 
            onNavigate={navigate} 
            onOpenAlbum={handleOpenAlbumModal}
            darkMode={darkMode}
            onDarkModeChange={setDarkMode}
            accentColor={accentColor}
            onAccentColorChange={setAccentColor}
            onLogout={handleLogout}
            onEditReview={setEditingReview}
          />
        );
      case "your-space-lists":
        return (
          <YourSpacePage 
            onNavigate={navigate} 
            onOpenAlbum={handleOpenAlbumModal}
            darkMode={darkMode}
            onDarkModeChange={setDarkMode}
            accentColor={accentColor}
            onAccentColorChange={setAccentColor}
            initialTab="lists"
            onLogout={handleLogout}
            onEditReview={setEditingReview}
          />
        );
      case "your-space-followers":
        return (
          <YourSpacePage 
            onNavigate={navigate} 
            onOpenAlbum={handleOpenAlbumModal}
            darkMode={darkMode}
            onDarkModeChange={setDarkMode}
            accentColor={accentColor}
            onAccentColorChange={setAccentColor}
            initialTab="followers"
            onLogout={handleLogout}
            onEditReview={setEditingReview}
          />
        );
      case "lists":
        return (
          <ListsPage
            onNavigate={navigate}
            onOpenAlbum={handleOpenAlbumModal}
          />
        );
      case "profile":
        return <ProfilePage username={userData.username} onNavigate={navigate} onOpenAlbum={handleOpenAlbumModal} onBack={goBack} canGoBack={canGoBack} />;
      case "edit-profile": 
        return <EditProfilePage onNavigate={navigate} onBack={goBack} canGoBack={canGoBack} />;
      case "feed":
        // Redirect to home page
        navigate("home");
        return <HomePage onNavigate={navigate} username={userData.username} onOpenAlbum={handleOpenAlbumModal} />;
      case "messages":
        return <MessagingPage onBack={goBack} canGoBack={canGoBack} onOpenAlbum={handleOpenAlbumModal} onNavigate={navigate} />;
      case "playlist":
        return (
          <CollaborativePlaylistsHub 
            onNavigate={navigate} 
            onOpenPlaylist={handleOpenPlaylist}
            playlists={collaborativePlaylists}
            setPlaylists={setCollaborativePlaylists}
            onBack={goBack}
            canGoBack={canGoBack}
          />
        );
      case "playlist-detail":
        return (
          <CollaborativePlaylistPage 
            onNavigate={navigate} 
            playlistId={selectedPlaylistId}
            playlists={collaborativePlaylists}
            setPlaylists={setCollaborativePlaylists}
            onBack={goBack}
            canGoBack={canGoBack}
            onOpenTrack={handleOpenAlbumModal}
          />
        );
      case "review":
        return <CreateReviewPage onNavigate={navigate} onBack={goBack} editingReview={editingReview} onClearEdit={() => setEditingReview(null)} />;
      case "settings":
        return (
          <SettingsPage 
            darkMode={darkMode}
            onDarkModeChange={setDarkMode}
            accentColor={accentColor}
            onAccentColorChange={setAccentColor}
            onLogout={handleLogout}
            onBack={goBack}
            canGoBack={canGoBack}
          />
        );
      case "about":
        return <AboutPage onNavigate={navigate} onBack={goBack} canGoBack={canGoBack} />;
      case "privacy":
        return <PrivacyPage onNavigate={navigate} onBack={goBack} canGoBack={canGoBack} />;
      case "terms":
        return <TermsPage onNavigate={navigate} onBack={goBack} canGoBack={canGoBack} />;
      case "help":
        return <HelpPage onNavigate={navigate} onBack={goBack} canGoBack={canGoBack} />;
      case "find-friends":
        return <FindFriendsPage onNavigate={navigate} onBack={goBack} canGoBack={canGoBack} />;
      case "friends-reviews":
        return <FriendsReviewsPage onNavigate={navigate} onOpenAlbum={handleOpenAlbumModal} onBack={goBack} canGoBack={canGoBack} />;
      default:
        // Check if it's a messaging page with a specific user  
        if (currentPage.startsWith("messaging-")) {
          const targetUserId = currentPage.replace("messaging-", "");
          return (
            <MessagingPage 
              onBack={goBack} 
              canGoBack={canGoBack} 
              onOpenAlbum={handleOpenAlbumModal} 
              onNavigate={navigate}
              targetUserId={targetUserId}
            />
          );
        }
        // Check if it's a settings page with a specific tab
        if (currentPage.startsWith("settings-")) {
          const settingsTab = currentPage.replace("settings-", "");
          return (
            <SettingsPage 
              darkMode={darkMode}
              onDarkModeChange={setDarkMode}
              accentColor={accentColor}
              onAccentColorChange={setAccentColor}
              onLogout={handleLogout}
              onBack={goBack}
              canGoBack={canGoBack}
              initialTab={settingsTab}
            />
          );
        }
        // Check if it's a collection detail page
        if (currentPage.startsWith("collection-")) {
          const listId = currentPage.replace("collection-", "");
          return (
            <CollectionDetailPage 
              listId={listId}
              onNavigate={navigate}
              onOpenAlbum={handleOpenAlbumModal}
              onBack={goBack}
              canGoBack={canGoBack}
            />
          );
        }
        // Check if it's a user profile page
        if (currentPage.startsWith("user-")) {
          const userId = currentPage.replace("user-", "");
          return (
            <UserProfilePage
              userId={userId}
              onNavigate={navigate}
              onOpenAlbum={handleOpenAlbumModal}
              onBack={goBack}
              canGoBack={canGoBack}
            />
          );
        }
        return <HomePage onNavigate={navigate} username={userData.username} onOpenAlbum={handleOpenAlbumModal} />;
    }
  };

  // 🔑 Handle Supabase password recovery route
  if (window.location.pathname === "/reset-password") {
    return <ResetPasswordPage />;
  }

  // Show loading screen
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthReady) {
    return <LoadingScreen />;
  }

  if (authInitError && !session?.user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-card/80 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-2xl text-center">
          <h2 className="text-xl text-foreground mb-2">Connection Issue</h2>
          <p className="text-muted-foreground mb-6">{authInitError}</p>
          {authWatchdogTriggered ? (
            <p className="text-xs text-muted-foreground mb-4">
              We cleared stale login callback data so you can retry safely.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!session?.user && !needsOnboarding) {
    return (
      <AuthPage
        onAuthed={({ username, email }) => {
          setUserData({ username, email });
          // DO NOT force onboarding here.
          // The session effect + profiles check will decide.
          navigate("home");
        }}
      />
    );
  }


  // Show onboarding flow for new users
  if (needsOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <PreviewProvider>
    <ListsProvider>
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Music-themed background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        {/* Waveform pattern */}
        <div className="absolute inset-0 pattern-waveform opacity-30"></div>
      </div>
      
      <Navigation 
        currentPage={currentPage} 
        onNavigate={(page) => {
          // Prevent navigation during auth initialization
          if (!isAuthReady) return;
          navigate(page);
          setSidebarOpen(false); // Close sidebar on navigation
        }}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        username={userData.username}
        email={userData.email}
        onOpenNotifications={() => setNotificationsModalOpen(true)}
        onOpenReminders={() => setRemindersModalOpen(true)}
        onLogout={handleLogout}
        isAuthReady={isAuthReady}
      />
      
      {/* Main Content with Page Transitions */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'} px-3 pt-3 md:pl-24 md:pr-8 md:pt-8 pb-20 md:pb-8 relative z-10`}>
        {/* Toggle Button - Fixed position - Only show when closed on desktop */}
        <AnimatePresence>
          {!sidebarOpen && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(true)}
              className="hidden md:flex fixed top-6 left-6 z-40 p-3 rounded-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-xl border-2 border-primary/30 shadow-md hover:shadow-lg hover:border-primary hover:scale-110 transition-all items-center justify-center group"
              aria-label="Open menu"
            >
              <svg
                className="w-6 h-6 text-primary group-hover:text-primary transition-colors drop-shadow-lg"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        <motion.div 
          className="max-w-[1280px] mx-auto"
          animate={{ 
            paddingLeft: sidebarOpen ? '1rem' : '0'
          }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Suspense fallback={<PageLoadingFallback />}>
                {renderPage()}
              </Suspense>
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <Footer onNavigate={navigate} isAuthReady={isAuthReady} />
        </motion.div>
      </main>

      {/* Quick Action Button */}
      {currentPage !== "messages" && <QuickActionButton onAction={handleQuickAction} />}

      {/* Album Modal */}
      <AlbumModal 
        isOpen={albumModalOpen} 
        onClose={handleCloseAlbumModal}
        albumData={selectedAlbumData}
        loading={albumModalLoading}
        onOpenReviewModal={handleOpenReviewModal}
        reviews={userReviews}
      />

      {/* Review Creation Modal */}
      <ReviewCreationModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSubmit={handleSubmitReview}
        mediaType={reviewMediaType}
        mediaTitle={reviewMediaDetails.title}
        mediaArtist={reviewMediaDetails.artist}
        mediaCover={reviewMediaDetails.cover}
      />

      {/* Edit Review Modal */}
      {editingReview && (
        <ReviewCreationModal
          isOpen={!!editingReview}
          onClose={() => setEditingReview(null)}
          onSubmit={handleSubmitReview}
          mediaType={editingReview.type || "album"}
          mediaTitle={editingReview.albumTitle}
          mediaArtist={editingReview.albumArtist}
          mediaCover={editingReview.albumCover}
          editMode={true}
          existingReview={{
            id: editingReview.id,
            rating: editingReview.rating,
            content: editingReview.content,
            mood: editingReview.mood,
            listeningContext: editingReview.listeningContext,
            favoriteTrack: editingReview.favoriteTrack,
            visibility: editingReview.visibility || "public",
          }}
        />
      )}

      {/* Notifications Modal */}
      <NotificationsModal 
        isOpen={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
        onNavigate={(page) => {
          navigate(page);
          setNotificationsModalOpen(false);
        }}
      />

      {/* Reminders Modal */}
      <RemindersModal 
        isOpen={remindersModalOpen}
        onClose={() => setRemindersModalOpen(false)}
        onNavigateToEvent={(eventId) => {
          setPendingEventId(eventId);
          navigate('events');
          setRemindersModalOpen(false);
        }}
      />

      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        theme={darkMode ? "dark" : "light"}
        richColors
      />
    </div>
    </ListsProvider>
    </PreviewProvider>
  );
}