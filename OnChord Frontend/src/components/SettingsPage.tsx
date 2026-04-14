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
import { toast } from "sonner";
import { PageHeader } from "./PageHeader";
import { initiateSpotifyLogin, getSpotifyConnection, disconnectSpotify, handleSpotifyCallback } from "../lib/api/spotify";
import { supabase } from "../lib/supabaseClient";
import { 
  Lock, 
  Palette, 
  User, 
  Music, 
  Shield,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  Check,
  LogOut,
  Loader2
} from "lucide-react";

const accentColors = [
  { name: "Purple", value: "#A78BFA", id: "purple" },
  { name: "Blue", value: "#60A5FA", id: "blue" },
  { name: "Pink", value: "#F472B6", id: "pink" },
  { name: "Green", value: "#34D399", id: "green" },
  { name: "Orange", value: "#FBBF24", id: "orange" },
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
  const [isDisconnectingSpotify, setIsDisconnectingSpotify] = useState(false);
  
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
    const flowMarker = sessionStorage.getItem("spotify_pkce_flow");
    
    if (code && hasVerifier && flowMarker === "api_connect") {
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
    if (isDisconnectingSpotify) return;
    setIsDisconnectingSpotify(true);
    try {
      console.log("Calling disconnectSpotify...");
      await disconnectSpotify();
      console.log("disconnectSpotify completed");
      await loadSpotifyConnection();
      setSpotifyConnection(null);
      toast.success("Spotify disconnected");
    } catch (error) {
      console.error("Failed to disconnect Spotify:", error);
      toast.error("Failed to disconnect Spotify");
    } finally {
      setIsDisconnectingSpotify(false);
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

  // Persist settings to localStorage when they change
  useEffect(() => { saveSetting("themeMode", themeMode); }, [themeMode]);
  useEffect(() => { saveSetting("fontSize", fontSize); }, [fontSize]);
  useEffect(() => { saveSetting("displayDensity", displayDensity); }, [displayDensity]);
  useEffect(() => { saveSetting("reduceMotion", reduceMotion); }, [reduceMotion]);
  useEffect(() => { saveSetting("highContrast", highContrast); }, [highContrast]);

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
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

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

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all required password fields");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      // Re-authenticate for email/password users before changing credentials.
      if (userProvider === "email") {
        if (!userEmail) {
          toast.error("No email found for this account");
          return;
        }

        if (!currentPassword) {
          toast.error("Please enter your current password");
          return;
        }

        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: currentPassword,
        });

        if (reauthError) {
          toast.error("Current password is incorrect");
          return;
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
      toast.success("Password updated successfully");
    } catch (error: any) {
      console.error("Failed to change password:", error);
      toast.error(error?.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
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
                          disabled={isDisconnectingSpotify}
                        >
                          {isDisconnectingSpotify ? "Disconnecting..." : "Disconnect"}
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
                  <Button
                    variant="outline"
                    className="w-full justify-between border-border"
                    onClick={() => setShowPasswordForm((prev) => !prev)}
                  >
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Change Password
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  {showPasswordForm && (
                    <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3 animate-fade-in">
                      {userProvider === "email" ? (
                        <div className="space-y-2">
                          <Label className="text-sm text-foreground">Current Password</Label>
                          <Input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          You signed in with {userProvider === "spotify" ? "Spotify" : "social login"}. Set a new password to enable email/password login.
                        </p>
                      )}

                      <div className="space-y-2">
                        <Label className="text-sm text-foreground">New Password</Label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-foreground">Confirm New Password</Label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowPasswordForm(false);
                            setCurrentPassword("");
                            setNewPassword("");
                            setConfirmPassword("");
                          }}
                          disabled={isUpdatingPassword}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handlePasswordChange} disabled={isUpdatingPassword}>
                          {isUpdatingPassword ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            "Update Password"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator className="bg-border" />

              {/* Session */}
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
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}