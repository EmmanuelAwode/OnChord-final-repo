import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { toast } from "sonner@2.0.3";
import { PageHeader } from "./PageHeader";
import { initiateSpotifyLogin, getSpotifyConnection, disconnectSpotify, handleSpotifyCallback } from "../lib/api/spotify";
import { supabase } from "../lib/supabaseClient";
import { 
  Bell, 
  Lock, 
  Palette, 
  User, 
  Music, 
  Globe, 
  Volume2,
  Download,
  Eye,
  Zap,
  Archive,
  FileText,
  Shield,
  UserPlus,
  Heart,
  MessageCircle,
  Star,
  Radio,
  BarChart3,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  Check,
  LogOut,
  Copy,
  Code
} from "lucide-react";
import { motion } from "motion/react";

const accentColors = [
  { name: "Purple", value: "#A78BFA", id: "purple" },
  { name: "Blue", value: "#60A5FA", id: "blue" },
  { name: "Pink", value: "#F472B6", id: "pink" },
  { name: "Green", value: "#34D399", id: "green" },
  { name: "Orange", value: "#FBBF24", id: "orange" },
];

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];

const dateFormats = [
  { id: "mdy", label: "MM/DD/YYYY", example: "10/01/2025" },
  { id: "dmy", label: "DD/MM/YYYY", example: "01/10/2025" },
  { id: "ymd", label: "YYYY-MM-DD", example: "2025-10-01" },
];

const timeFormats = [
  { id: "12h", label: "12-hour (AM/PM)", example: "2:30 PM" },
  { id: "24h", label: "24-hour", example: "14:30" },
];

interface SettingsPageProps {
  darkMode: boolean;
  onDarkModeChange: (value: boolean) => void;
  accentColor: string;
  onAccentColorChange: (value: string) => void;
  onLogout?: () => void;
  onBack?: () => void;
  canGoBack?: boolean;
  initialTab?: string;
}

export function SettingsPage({ 
  darkMode, 
  onDarkModeChange, 
  accentColor, 
  onAccentColorChange,
  onLogout,
  onBack,
  canGoBack,
  initialTab = "appearance"
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const connectedServicesRef = useRef<HTMLDivElement>(null);
  const [shouldHighlight, setShouldHighlight] = useState(false);
  
  // Spotify connection state
  const [spotifyConnection, setSpotifyConnection] = useState<any>(null);
  const [isLoadingSpotify, setIsLoadingSpotify] = useState(true);
  
  // User ID state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProvider, setUserProvider] = useState<string | null>(null);
  
  // Load current user ID
  useEffect(() => {
    async function loadUserId() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      setCurrentUserId(user?.id || null);
      setUserEmail(user?.email || null);
      setUserProvider(user?.app_metadata?.provider || "email");
    }
    loadUserId();
  }, []);
  
  // Load Spotify connection on mount
  useEffect(() => {
    loadSpotifyConnection();
  }, []);
  
  // Handle OAuth callback - Spotify API redirects back with ?code=xxx
  // Only process if PKCE verifier exists (meaning this was a Spotify API connect, not Supabase social login)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const hasVerifier = sessionStorage.getItem("spotify_pkce_code_verifier");
    
    if (code && hasVerifier) {
      handleSpotifyOAuthCallback(code);
      // Remove code from URL without reloading
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("code");
      window.history.replaceState({}, document.title, cleanUrl.toString());
    }
  }, []);
  
  async function loadSpotifyConnection() {
    try {
      const connection = await getSpotifyConnection();
      setSpotifyConnection(connection);
    } catch (error) {
      console.error("Failed to load Spotify connection:", error);
    } finally {
      setIsLoadingSpotify(false);
    }
  }
  
  async function handleSpotifyOAuthCallback(code: string) {
    try {
      await handleSpotifyCallback(code);
      toast.success("Spotify connected successfully!");
      await loadSpotifyConnection();
    } catch (error) {
      console.error("Spotify callback error:", error);
      toast.error("Failed to connect Spotify");
    }
  }
  
  async function handleConnectSpotify() {
    try {
      initiateSpotifyLogin();
    } catch (error) {
      console.error("Failed to initiate Spotify login:", error);
      toast.error("Failed to connect Spotify");
    }
  }
  
  async function handleDisconnectSpotify() {
    console.log("handleDisconnectSpotify called");
    try {
      console.log("Calling disconnectSpotify...");
      await disconnectSpotify();
      console.log("disconnectSpotify completed");
      setSpotifyConnection(null);
      toast.success("Spotify disconnected");
    } catch (error) {
      console.error("Failed to disconnect Spotify:", error);
      toast.error("Failed to disconnect Spotify");
    }
  }
  
  // Update active tab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
    // If navigating to account tab, highlight the connected services section
    if (initialTab === "account") {
      setShouldHighlight(true);
      // Scroll to connected services after a short delay to ensure the tab content is rendered
      setTimeout(() => {
        connectedServicesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Remove highlight after 2 seconds
        setTimeout(() => setShouldHighlight(false), 2000);
      }, 300);
    }
  }, [initialTab]);

  // Helper to load settings from localStorage
  const loadSetting = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(`onchord_settings_${key}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // Helper to save settings to localStorage
  const saveSetting = (key: string, value: any) => {
    try {
      localStorage.setItem(`onchord_settings_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error("Failed to save setting:", error);
    }
  };
  
  // Appearance settings
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "auto">(() => 
    loadSetting("themeMode", darkMode ? "dark" : "light")
  );
  const [fontSize, setFontSize] = useState(() => loadSetting("fontSize", [16]));
  const [displayDensity, setDisplayDensity] = useState(() => loadSetting("displayDensity", "comfortable"));
  const [reduceMotion, setReduceMotion] = useState(() => loadSetting("reduceMotion", false));
  const [highContrast, setHighContrast] = useState(() => loadSetting("highContrast", false));

  // Language & Region
  const [language, setLanguage] = useState(() => loadSetting("language", "en"));
  const [dateFormat, setDateFormat] = useState(() => loadSetting("dateFormat", "mdy"));
  const [timeFormat, setTimeFormat] = useState(() => loadSetting("timeFormat", "12h"));
  const [timezone, setTimezone] = useState(() => loadSetting("timezone", "auto"));

  // Audio settings
  const [audioQuality, setAudioQuality] = useState(() => loadSetting("audioQuality", "high"));
  const [normalizeVolume, setNormalizeVolume] = useState(() => loadSetting("normalizeVolume", true));
  const [crossfade, setCrossfade] = useState(() => loadSetting("crossfade", true));
  const [crossfadeDuration, setCrossfadeDuration] = useState(() => loadSetting("crossfadeDuration", [3]));
  const [gaplessPlayback, setGaplessPlayback] = useState(() => loadSetting("gaplessPlayback", true));
  const [autoplay, setAutoplay] = useState(() => loadSetting("autoplay", true));

  // Notifications
  const [notifications, setNotifications] = useState(() => loadSetting("notifications", {
    likes: true,
    comments: true,
    follows: true,
    messages: true,
    newReleases: true,
    recommendations: true,
    weeklyRecap: true,
    friendActivity: false,
    tasteMatch: true,
    playlistUpdates: true,
  }));
  const [notificationSound, setNotificationSound] = useState(() => loadSetting("notificationSound", true));
  const [emailNotifications, setEmailNotifications] = useState(() => loadSetting("emailNotifications", true));
  const [pushNotifications, setPushNotifications] = useState(() => loadSetting("pushNotifications", true));

  // Privacy
  const [privacy, setPrivacy] = useState(() => loadSetting("privacy", {
    publicReviews: true,
    publicLists: true,
    showActivity: true,
    allowMessages: true,
    showListeningHistory: true,
    discoverableByEmail: false,
    showOnlineStatus: true,
    allowTagging: true,
  }));

  // Advanced
  const [betaFeatures, setBetaFeatures] = useState(() => loadSetting("betaFeatures", false));
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => loadSetting("analyticsEnabled", true));

  // Persist settings to localStorage when they change
  useEffect(() => { saveSetting("themeMode", themeMode); }, [themeMode]);
  useEffect(() => { saveSetting("fontSize", fontSize); }, [fontSize]);
  useEffect(() => { saveSetting("displayDensity", displayDensity); }, [displayDensity]);
  useEffect(() => { saveSetting("reduceMotion", reduceMotion); }, [reduceMotion]);
  useEffect(() => { saveSetting("highContrast", highContrast); }, [highContrast]);
  useEffect(() => { saveSetting("language", language); }, [language]);
  useEffect(() => { saveSetting("dateFormat", dateFormat); }, [dateFormat]);
  useEffect(() => { saveSetting("timeFormat", timeFormat); }, [timeFormat]);
  useEffect(() => { saveSetting("timezone", timezone); }, [timezone]);
  useEffect(() => { saveSetting("audioQuality", audioQuality); }, [audioQuality]);
  useEffect(() => { saveSetting("normalizeVolume", normalizeVolume); }, [normalizeVolume]);
  useEffect(() => { saveSetting("crossfade", crossfade); }, [crossfade]);
  useEffect(() => { saveSetting("crossfadeDuration", crossfadeDuration); }, [crossfadeDuration]);
  useEffect(() => { saveSetting("gaplessPlayback", gaplessPlayback); }, [gaplessPlayback]);
  useEffect(() => { saveSetting("autoplay", autoplay); }, [autoplay]);
  useEffect(() => { saveSetting("notifications", notifications); }, [notifications]);
  useEffect(() => { saveSetting("notificationSound", notificationSound); }, [notificationSound]);
  useEffect(() => { saveSetting("emailNotifications", emailNotifications); }, [emailNotifications]);
  useEffect(() => { saveSetting("pushNotifications", pushNotifications); }, [pushNotifications]);
  useEffect(() => { saveSetting("privacy", privacy); }, [privacy]);
  useEffect(() => { saveSetting("betaFeatures", betaFeatures); }, [betaFeatures]);
  useEffect(() => { saveSetting("analyticsEnabled", analyticsEnabled); }, [analyticsEnabled]);

  // Apply reduce motion setting
  useEffect(() => {
    if (reduceMotion) {
      document.documentElement.classList.add("reduce-motion");
      document.documentElement.style.setProperty("--transition-duration", "0ms");
    } else {
      document.documentElement.classList.remove("reduce-motion");
      document.documentElement.style.removeProperty("--transition-duration");
    }
  }, [reduceMotion]);

  // Apply high contrast setting
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [highContrast]);

  // Apply display density setting
  useEffect(() => {
    document.documentElement.setAttribute("data-density", displayDensity);
  }, [displayDensity]);

  // Apply font size on mount
  useEffect(() => {
    document.documentElement.style.setProperty("--font-size", `${fontSize[0]}px`);
  }, []);

  // Modals
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  const handleThemeChange = (mode: "light" | "dark" | "auto") => {
    setThemeMode(mode);
    if (mode === "auto") {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      onDarkModeChange(systemPrefersDark);
    } else {
      onDarkModeChange(mode === "dark");
    }
  };

  const handleFontSizeChange = (value: number[]) => {
    setFontSize(value);
    document.documentElement.style.setProperty("--font-size", `${value[0]}px`);
    
    // Add animation class temporarily for smooth transition
    document.body.classList.add('font-transition-active');
    setTimeout(() => {
      document.body.classList.remove('font-transition-active');
    }, 600);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Settings"
        subtitle="Customize your OnChord experience"
        showBackButton={canGoBack}
        onBack={onBack}
      />

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="language" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Language</span>
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">Audio</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
        </TabsList>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6 mt-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/20 p-2 rounded-lg">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl text-foreground">Theme</h2>
            </div>

            <div className="space-y-6">
              {/* Theme Mode */}
              <div>
                <Label className="text-foreground mb-3 block">Display Mode</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "light", label: "Light", icon: Sun },
                    { id: "dark", label: "Dark", icon: Moon },
                    { id: "auto", label: "Auto", icon: Monitor },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => handleThemeChange(id as any)}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        themeMode === id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      aria-pressed={themeMode === id}
                      aria-label={`Select ${label} theme`}
                    >
                      <Icon className="w-6 h-6 text-foreground mx-auto mb-2" aria-hidden="true" />
                      <p className="text-sm text-foreground">{label}</p>
                      {themeMode === id && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-4 h-4 text-primary" aria-hidden="true" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Accent Color */}
              <div>
                <Label className="text-foreground mb-3 block">Accent Color</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose your preferred accent color
                </p>
                <div className="flex flex-wrap gap-3">
                  {accentColors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => onAccentColorChange(color.id)}
                      className={`relative w-16 h-16 rounded-lg transition hover:scale-105 ${
                        accentColor === color.id ? "ring-2 ring-offset-2 ring-offset-card" : ""
                      }`}
                      style={{
                        backgroundColor: color.value,
                        ringColor: color.value,
                      }}
                      aria-pressed={accentColor === color.id}
                      aria-label={`Select ${color.name} accent color`}
                    >
                      {accentColor === color.id && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4" aria-hidden="true" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Font Size */}
              <div>
                <Label className="text-foreground mb-3 block">Font Size</Label>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Small</span>
                    <span className="text-sm text-muted-foreground">{fontSize[0]}px</span>
                    <span className="text-sm text-muted-foreground">Large</span>
                  </div>
                  <Slider
                    value={fontSize}
                    onValueChange={handleFontSizeChange}
                    min={12}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Display Density */}
              <div>
                <Label className="text-foreground mb-3 block">Display Density</Label>
                <Select value={displayDensity} onValueChange={setDisplayDensity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact - More content</SelectItem>
                    <SelectItem value="comfortable">Comfortable - Balanced</SelectItem>
                    <SelectItem value="spacious">Spacious - Easy on eyes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-border" />

              {/* Accessibility */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Reduce Motion</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimize animations and transitions
                    </p>
                  </div>
                  <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">High Contrast</Label>
                    <p className="text-sm text-muted-foreground">
                      Increase color contrast for better visibility
                    </p>
                  </div>
                  <Switch checked={highContrast} onCheckedChange={setHighContrast} />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Language & Region Settings */}
        <TabsContent value="language" className="space-y-6 mt-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-secondary/20 p-2 rounded-lg">
                <Globe className="w-5 h-5 text-secondary" />
              </div>
              <h2 className="text-xl text-foreground">Language & Region</h2>
            </div>

            <div className="space-y-6">
              {/* Language Selection */}
              <div>
                <Label className="text-foreground mb-3 block">Display Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  Changes will take effect after restarting the app
                </p>
              </div>

              <Separator className="bg-border" />

              {/* Date Format */}
              <div>
                <Label className="text-foreground mb-3 block">Date Format</Label>
                <Select value={dateFormat} onValueChange={setDateFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateFormats.map((format) => (
                      <SelectItem key={format.id} value={format.id}>
                        {format.label} - {format.example}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-border" />

              {/* Time Format */}
              <div>
                <Label className="text-foreground mb-3 block">Time Format</Label>
                <Select value={timeFormat} onValueChange={setTimeFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeFormats.map((format) => (
                      <SelectItem key={format.id} value={format.id}>
                        {format.label} - {format.example}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-border" />

              {/* Timezone */}
              <div>
                <Label className="text-foreground mb-3 block">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatic (Detect from device)</SelectItem>
                    <SelectItem value="utc">UTC (Coordinated Universal Time)</SelectItem>
                    <SelectItem value="est">EST (Eastern Standard Time)</SelectItem>
                    <SelectItem value="pst">PST (Pacific Standard Time)</SelectItem>
                    <SelectItem value="cet">CET (Central European Time)</SelectItem>
                    <SelectItem value="jst">JST (Japan Standard Time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Audio Settings */}
        <TabsContent value="audio" className="space-y-6 mt-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-chart-1/20 p-2 rounded-lg">
                <Volume2 className="w-5 h-5 text-chart-1" />
              </div>
              <h2 className="text-xl text-foreground">Playback Settings</h2>
            </div>

            <div className="space-y-6">
              {/* Audio Quality */}
              <div>
                <Label className="text-foreground mb-3 block">Streaming Quality</Label>
                <Select value={audioQuality} onValueChange={setAudioQuality}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - 96 kbps (Save data)</SelectItem>
                    <SelectItem value="normal">Normal - 160 kbps</SelectItem>
                    <SelectItem value="high">High - 320 kbps (Recommended)</SelectItem>
                    <SelectItem value="lossless">Lossless - FLAC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-border" />

              {/* Playback Features */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Normalize Volume</Label>
                    <p className="text-sm text-muted-foreground">
                      Keep volume consistent across tracks
                    </p>
                  </div>
                  <Switch checked={normalizeVolume} onCheckedChange={setNormalizeVolume} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Crossfade</Label>
                    <p className="text-sm text-muted-foreground">
                      Smooth transitions between songs
                    </p>
                  </div>
                  <Switch checked={crossfade} onCheckedChange={setCrossfade} />
                </div>

                {crossfade && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-4 space-y-3"
                  >
                    <Label className="text-sm text-muted-foreground">Crossfade Duration</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={crossfadeDuration}
                        onValueChange={setCrossfadeDuration}
                        min={0}
                        max={12}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm text-foreground w-12">{crossfadeDuration[0]}s</span>
                    </div>
                  </motion.div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Gapless Playback</Label>
                    <p className="text-sm text-muted-foreground">
                      No silence between tracks
                    </p>
                  </div>
                  <Switch checked={gaplessPlayback} onCheckedChange={setGaplessPlayback} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Autoplay</Label>
                    <p className="text-sm text-muted-foreground">
                      Continue with similar tracks when queue ends
                    </p>
                  </div>
                  <Switch checked={autoplay} onCheckedChange={setAutoplay} />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-secondary/20 p-2 rounded-lg">
                <Bell className="w-5 h-5 text-secondary" />
              </div>
              <h2 className="text-xl text-foreground">Notification Preferences</h2>
            </div>

            <div className="space-y-6">
              {/* Notification Channels */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications on this device
                    </p>
                  </div>
                  <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates via email
                    </p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Notification Sounds</Label>
                    <p className="text-sm text-muted-foreground">
                      Play sound when notifications arrive
                    </p>
                  </div>
                  <Switch checked={notificationSound} onCheckedChange={setNotificationSound} />
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Notification Types */}
              <div>
                <Label className="text-foreground mb-4 block">What to be notified about</Label>
                <div className="space-y-4">
                  {[
                    { key: "likes", icon: Heart, label: "Likes", desc: "When someone likes your review" },
                    { key: "comments", icon: MessageCircle, label: "Comments", desc: "When someone comments on your content" },
                    { key: "follows", icon: UserPlus, label: "New Followers", desc: "When someone starts following you" },
                    { key: "messages", icon: MessageCircle, label: "Messages", desc: "Direct message notifications" },
                    { key: "newReleases", icon: Music, label: "New Releases", desc: "From artists you follow" },
                    { key: "recommendations", icon: Star, label: "Recommendations", desc: "Personalized music suggestions" },
                    { key: "weeklyRecap", icon: BarChart3, label: "Weekly Recap", desc: "Your listening statistics" },
                    { key: "friendActivity", icon: Radio, label: "Friend Activity", desc: "What your friends are listening to" },
                    { key: "tasteMatch", icon: Zap, label: "Taste Matches", desc: "When you match with other users" },
                    { key: "playlistUpdates", icon: Music, label: "Playlist Updates", desc: "Changes to collaborative playlists" },
                  ].map(({ key, icon: Icon, label, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted p-2 rounded-lg">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <Label className="text-foreground">{label}</Label>
                          <p className="text-sm text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications[key as keyof typeof notifications]}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, [key]: checked })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6 mt-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-chart-3/20 p-2 rounded-lg">
                <Lock className="w-5 h-5 text-chart-3" />
              </div>
              <h2 className="text-xl text-foreground">Privacy & Security</h2>
            </div>

            <div className="space-y-6">
              {/* Profile Privacy */}
              <div>
                <Label className="text-foreground mb-4 block">Profile Visibility</Label>
                <div className="space-y-4">
                  {[
                    { key: "publicReviews", label: "Public Reviews", desc: "Allow others to see your reviews" },
                    { key: "publicLists", label: "Public Playlists", desc: "Make your playlists visible to everyone" },
                    { key: "showActivity", label: "Activity Status", desc: "Show your listening activity to friends" },
                    { key: "showListeningHistory", label: "Listening History", desc: "Display your recent tracks publicly" },
                    { key: "showOnlineStatus", label: "Online Status", desc: "Let others see when you're active" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <Label className="text-foreground">{label}</Label>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={privacy[key as keyof typeof privacy]}
                        onCheckedChange={(checked) =>
                          setPrivacy({ ...privacy, [key]: checked })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Communication Privacy */}
              <div>
                <Label className="text-foreground mb-4 block">Communication</Label>
                <div className="space-y-4">
                  {[
                    { key: "allowMessages", label: "Direct Messages", desc: "Allow others to message you" },
                    { key: "allowTagging", label: "Tagging", desc: "Let others tag you in posts" },
                    { key: "discoverableByEmail", label: "Email Discovery", desc: "Allow people to find you by email" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <Label className="text-foreground">{label}</Label>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={privacy[key as keyof typeof privacy]}
                        onCheckedChange={(checked) =>
                          setPrivacy({ ...privacy, [key]: checked })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Data Controls */}
              <div>
                <Label className="text-foreground mb-4 block">Data Management</Label>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-between border-border">
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Your Data
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between border-border">
                    <span className="flex items-center gap-2">
                      <Archive className="w-4 h-4" />
                      Request Account Archive
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between border-border">
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Privacy Policy
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6 mt-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-chart-4/20 p-2 rounded-lg">
                <User className="w-5 h-5 text-chart-4" />
              </div>
              <h2 className="text-xl text-foreground">Account Information</h2>
            </div>

            <div className="space-y-6">
              {/* Email & Login Method */}
              <div>
                <Label className="text-foreground mb-3 block">Your Details</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/20 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-foreground font-medium">{userEmail || "Loading..."}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-chart-4/20 p-2 rounded-lg">
                        <Shield className="w-5 h-5 text-chart-4" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Login Method</p>
                        <p className="text-foreground font-medium capitalize">
                          {userProvider === "spotify" ? "Spotify" : userProvider === "email" ? "Email & Password" : userProvider || "Loading..."}
                        </p>
                      </div>
                    </div>
                    {userProvider === "spotify" && (
                      <Badge className="bg-[#1DB954]/20 text-[#1DB954] border-0">
                        <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                        Spotify
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Connected Services */}
              <div 
                ref={connectedServicesRef}
                className={`transition-all duration-500 ${shouldHighlight ? 'ring-2 ring-primary/50 rounded-lg p-4 -m-4 bg-primary/5' : ''}`}
              >
                <Label className="text-foreground mb-3 block">Connected Services</Label>
                <div className="space-y-3">
                  {/* Spotify Connection */}
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-secondary/20 p-2 rounded-lg">
                        <Music className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <p className="text-foreground">Spotify</p>
                        {isLoadingSpotify ? (
                          <p className="text-sm text-muted-foreground">Loading...</p>
                        ) : spotifyConnection ? (
                          <p className="text-sm text-muted-foreground">
                            {spotifyConnection.spotify_display_name || spotifyConnection.spotify_email || "Connected"}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Not connected</p>
                        )}
                      </div>
                    </div>
                    {spotifyConnection ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-secondary/20 text-secondary border-0">Active</Badge>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            console.log("Disconnect clicked");
                            handleDisconnectSpotify();
                          }}
                        >
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleConnectSpotify}
                        disabled={isLoadingSpotify}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-chart-4/20 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-chart-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-foreground">Instagram</p>
                        <p className="text-sm text-muted-foreground">Coming soon</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-muted-foreground border-muted-foreground/20">Soon</Badge>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">
                      Connect your Spotify account to access real music data, search for albums, and enable personalized features.
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Security */}
              <div>
                <Label className="text-foreground mb-3 block">Security</Label>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-between border-border">
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Change Password
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between border-border">
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Two-Factor Authentication
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between border-border">
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Active Sessions
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Session Management */}
              <div>
                <Label className="text-foreground mb-3 block">Session</Label>
                <Button 
                  variant="outline" 
                  className="w-full justify-between border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                  onClick={onLogout}
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  You'll need to sign in again to access your account
                </p>
              </div>

              <Separator className="bg-border" />

              {/* Developer Info */}
              <div>
                <Label className="text-foreground mb-3 block flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Developer Info
                </Label>
                <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Your User ID (for testing)</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-background rounded text-xs text-foreground font-mono break-all">
                        {currentUserId || 'Loading...'}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (currentUserId) {
                            navigator.clipboard.writeText(currentUserId);
                            toast.success('User ID copied to clipboard!');
                          }
                        }}
                        disabled={!currentUserId}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 Use this ID to update mock data and test follow features. Log in with both accounts to get both IDs.
                  </p>
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Danger Zone */}
              <div>
                <Label className="text-destructive mb-3 block">Danger Zone</Label>
                <div className="space-y-3 p-4 border-2 border-destructive/20 rounded-lg">
                  <Button 
                    variant="outline" 
                    className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={() => setShowDeactivateDialog(true)}
                  >
                    Deactivate Account
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    Delete Account Permanently
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    These actions cannot be undone. Please be certain.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pb-8">
        <Button 
          variant="outline" 
          className="border-border"
          onClick={() => {
            // Reset to defaults
            setThemeMode(darkMode ? "dark" : "light");
            setFontSize([16]);
            setDisplayDensity("comfortable");
            setReduceMotion(false);
            setHighContrast(false);
            setLanguage("en");
            setDateFormat("mdy");
            setTimeFormat("12h");
            setTimezone("auto");
            setAudioQuality("high");
            setNormalizeVolume(true);
            setCrossfade(true);
            setCrossfadeDuration([3]);
            setGaplessPlayback(true);
            setAutoplay(true);
            setNotifications({
              likes: true,
              comments: true,
              follows: true,
              messages: true,
              newReleases: true,
              recommendations: true,
              weeklyRecap: true,
              friendActivity: false,
              tasteMatch: true,
              playlistUpdates: true,
            });
            setNotificationSound(true);
            setEmailNotifications(true);
            setPushNotifications(true);
            setPrivacy({
              publicReviews: true,
              publicLists: true,
              showActivity: true,
              allowMessages: true,
              showListeningHistory: true,
              discoverableByEmail: false,
              showOnlineStatus: true,
              allowTagging: true,
            });
            setBetaFeatures(false);
            setAnalyticsEnabled(true);
            document.documentElement.style.setProperty("--font-size", "16px");
            toast.success("Settings reset to defaults");
          }}
        >
          Reset to Defaults
        </Button>
        <Button 
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => toast.success("All settings are automatically saved!")}
        >
          <Check className="w-4 h-4 mr-2" />
          Save All Changes
        </Button>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Account Permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete your account,
              all your reviews, playlists, and remove all your data from our servers.
              <br /><br />
              <strong className="text-destructive">Are you absolutely sure?</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                toast.error("Account deletion initiated. You will receive a confirmation email.");
                setShowDeleteDialog(false);
              }}
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Account Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Deactivate Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Your profile will be hidden from other users. You can reactivate your
              account anytime by logging back in. Your data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive/80 hover:bg-destructive text-destructive-foreground"
              onClick={() => {
                toast.success("Account deactivated. You can reactivate anytime.");
                setShowDeactivateDialog(false);
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}