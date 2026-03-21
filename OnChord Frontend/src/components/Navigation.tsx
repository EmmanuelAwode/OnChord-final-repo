import { Home, Users, User, Search, Menu, Music2, BarChart3, Sparkles, MessageCircle, Bell, Settings, ChevronUp, Star, Ticket, Info, Shield, FileText, HelpCircle, LogOut, BellDot } from "lucide-react";
import { Badge } from "./ui/badge";
import { cn } from "./ui/utils";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Logo } from "./Logo";
import { useUnreadNotifications } from "./NotificationsModal";
import { useReminders } from "../lib/useReminders";
import NotificationsPanel from "./NotificationsPanel";
import { isSpotifyConnected } from "../lib/api/spotify";
import { supabase } from "../lib/supabaseClient";

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  username: string;
  email: string;
  onOpenNotifications: () => void;
  onOpenReminders: () => void;
  onLogout?: () => void;
}

const navItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "discover", label: "Discover", icon: Sparkles },
  { id: "insights", label: "Insights", icon: BarChart3 },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "events", label: "Events", icon: Ticket },
  { id: "your-space", label: "Your Space", icon: User },
];

export function Navigation({ currentPage, onNavigate, isOpen, onToggle, username, email, onOpenNotifications, onOpenReminders, onLogout }: NavigationProps) {
  const [showConnectedAccounts, setShowConnectedAccounts] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const unreadCount = useUnreadNotifications();
  const { reminderCount } = useReminders();

  const loadSpotifyStatus = async () => {
    try {
      const connected = await isSpotifyConnected();
      setSpotifyConnected(connected);
    } catch {
      setSpotifyConnected(false);
    }
  };

  const loadProfileIdentity = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", userId)
        .maybeSingle();

      setProfileDisplayName(profile?.display_name ?? null);
      setProfileUsername(profile?.username ?? null);
    } catch (error) {
      console.error("Failed to load navigation profile identity:", error);
    }
  };

  const loadUnreadMessageCount = async (userId: string) => {
    try {
      const { data: conversations, error: convoError } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

      if (convoError) throw convoError;

      const conversationIds = (conversations || []).map((c) => c.id);
      if (conversationIds.length === 0) {
        setUnreadMessageCount(0);
        return;
      }

      const { count, error: countError } = await supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("sender_id", userId)
        .is("read_at", null);

      if (countError) throw countError;
      setUnreadMessageCount(count || 0);
    } catch (error) {
      console.error("Failed to load unread message count:", error);
      setUnreadMessageCount(0);
    }
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const uid = data.session?.user?.id || null;
      setCurrentUserId(uid);
      if (uid) {
        loadUnreadMessageCount(uid);
        loadProfileIdentity(uid);
        loadSpotifyStatus();
      } else {
        setUnreadMessageCount(0);
        setProfileDisplayName(null);
        setProfileUsername(null);
        setSpotifyConnected(false);
      }
    });

    const { data: authSub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;

      const uid = session?.user?.id || null;
      setCurrentUserId(uid);

      if (uid) {
        await Promise.all([
          loadUnreadMessageCount(uid),
          loadProfileIdentity(uid),
          loadSpotifyStatus(),
        ]);
      } else {
        setUnreadMessageCount(0);
        setProfileDisplayName(null);
        setProfileUsername(null);
        setSpotifyConnected(false);
      }
    });

    return () => {
      active = false;
      authSub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    loadProfileIdentity(currentUserId);
    loadSpotifyStatus();

    const refresh = () => loadUnreadMessageCount(currentUserId);
    const refreshProfile = () => loadProfileIdentity(currentUserId);
    const refreshSpotify = () => loadSpotifyStatus();

    const channel = supabase
      .channel(`nav_realtime_${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        refresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        refresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${currentUserId}` },
        refreshProfile
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spotify_connections", filter: `user_id=eq.${currentUserId}` },
        refreshSpotify
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const getItemBadge = (itemId: string): number => {
    if (itemId === "messages") return unreadMessageCount;
    return 0;
  };

  const navDisplayName = (profileDisplayName || username || "User").trim();
  const navUsername = (profileUsername || username || "user").trim();
  const navHandle = navUsername.startsWith("@") ? navUsername.slice(1) : navUsername;

  return (
    <>
      {/* Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation - Scrollable */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-card via-card to-card/95 border-t-2 border-primary/20 z-50 backdrop-blur-xl shadow-strong">
        <div className="overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-1 px-2 py-3 min-w-max">
            {/* Real-time Notifications Panel */}
            <div className="flex-shrink-0">
              <NotificationsPanel />
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              const itemBadge = getItemBadge(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 flex-shrink-0",
                    isActive
                      ? "text-primary bg-gradient-to-br from-primary/20 to-accent/10 shadow-glow-primary"
                      : "text-muted-foreground hover:text-primary hover:scale-105"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "drop-shadow-lg")} />
                  <span className="text-xs whitespace-nowrap">{item.label}</span>
                  {itemBadge > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-secondary to-secondary/80 rounded-full flex items-center justify-center shadow-glow-secondary">
                      <span className="text-[10px] text-white font-semibold">{itemBadge > 99 ? "99+" : itemBadge}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Animated Sidebar - Both Mobile (fullscreen) and Desktop */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 h-screen w-full md:w-64 bg-gradient-to-b from-card via-card to-card/95 border-r-2 border-primary/20 z-50 overflow-hidden shadow-strong backdrop-blur-xl"
          >
        <div className="h-full flex flex-col relative">
          {/* Music-themed background pattern */}
          <div className="absolute inset-0 pattern-waveform opacity-50 pointer-events-none"></div>
          
          <div className="p-6 flex-shrink-0 relative z-10">
            {/* Logo and Close Button */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <Logo size="md" showText={true} />
              <div className="flex items-center gap-2">
                {/* Reminders Button */}
                <button
                  onClick={onOpenReminders}
                  className="relative p-2 rounded-lg hover:bg-accent/10 hover:text-accent transition-all hover:scale-110 group"
                  aria-label="Reminders"
                >
                  <BellDot className="w-5 h-5 text-foreground group-hover:text-accent" />
                  {reminderCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center shadow-glow-primary">
                      <span className="text-[10px] text-white font-semibold">{reminderCount}</span>
                    </div>
                  )}
                </button>
                {/* Real-time Notifications Panel */}
                <NotificationsPanel />
                {/* Close button for both mobile and desktop */}
                <button
                  onClick={onToggle}
                  className="p-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-all hover:scale-110"
                  aria-label="Close menu"
                >
                  <svg
                    className="w-5 h-5 text-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Items - Scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pr-4 min-h-0 nav-scroll relative z-10">
            <nav className="space-y-1 pb-4">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const itemBadge = getItemBadge(item.id);
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-glow-primary scale-105"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-105"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {itemBadge > 0 && (
                  <Badge className="ml-auto bg-secondary text-secondary-foreground border-0 h-5 px-2">
                    {itemBadge > 99 ? "99+" : itemBadge}
                  </Badge>
                )}
              </motion.button>
            );
          })}

          <div className="my-4 border-t border-border" />

          <div className="my-4 border-t border-border" />

          <p className="text-xs text-muted-foreground px-4 py-2 uppercase tracking-wider">
            More
          </p>
          <button
            onClick={() => onNavigate("about")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              currentPage === "about"
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-glow-primary scale-105"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-105"
            )}
          >
            <Info className="w-5 h-5" />
            <span>About</span>
          </button>
          <button
            onClick={() => onNavigate("privacy")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              currentPage === "privacy"
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-glow-primary scale-105"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-105"
            )}
          >
            <Shield className="w-5 h-5" />
            <span>Privacy</span>
          </button>
          <button
            onClick={() => onNavigate("terms")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              currentPage === "terms"
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-glow-primary scale-105"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-105"
            )}
          >
            <FileText className="w-5 h-5" />
            <span>Terms</span>
          </button>
          <button
            onClick={() => onNavigate("help")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              currentPage === "help"
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-glow-primary scale-105"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-105"
            )}
          >
            <HelpCircle className="w-5 h-5" />
            <span>Help</span>
          </button>

          <div className="my-4 border-t border-border" />

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:scale-105"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
            </nav>
          </div>

          {/* User Profile with Connected Accounts - Fixed at bottom */}
          <div className="flex-shrink-0 p-6 pt-4 border-t border-primary/20 relative z-10">
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-sm rounded-xl overflow-hidden border-2 border-primary/20">
            <button 
              onClick={() => setShowConnectedAccounts(!showConnectedAccounts)}
              className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-glow-primary">
                <span className="text-white font-semibold">
                  {navDisplayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm text-foreground truncate">{navDisplayName}</p>
                <p className="text-xs text-muted-foreground truncate">@{navHandle}</p>
              </div>
              <ChevronUp 
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  showConnectedAccounts ? "rotate-180" : ""
                )}
              />
            </button>
            
            {showConnectedAccounts && (
              <div className="px-3 pb-3 pt-2 space-y-2 border-t border-border animate-fade-in">
                <p className="text-xs text-muted-foreground mb-2">Connected Accounts</p>
                {spotifyConnected ? (
                  <div className="flex items-center gap-2 p-2 bg-card rounded-lg">
                    <div className="bg-secondary/20 p-1.5 rounded flex-shrink-0">
                      <Music2 className="w-3 h-3 text-secondary" />
                    </div>
                    <span className="text-xs text-foreground flex-1 truncate">Spotify</span>
                    <Badge className="bg-secondary/20 text-secondary border-0 text-[10px] flex-shrink-0">Active</Badge>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground px-2 py-1">No connected accounts</p>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}