import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Avatar } from "./ui/avatar";
import { BackButton } from "./BackButton";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { 
  User, 
  Camera, 
  Mail, 
  MapPin, 
  Link as LinkIcon, 
  Music,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { useProfile } from "../lib/useProfile";
import { isUsernameAvailable } from "../lib/api/profiles";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

interface EditProfilePageProps {
  onNavigate?: (page: string) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function EditProfilePage({ onNavigate, onBack, canGoBack }: EditProfilePageProps) {
  const { profile, isLoading, updateProfile } = useProfile();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [location, setLocation] = useState("San Francisco, CA");
  const [website, setWebsite] = useState("onchord.music");
  const [spotifyConnected, setSpotifyConnected] = useState(true);
  const [appleMusicConnected, setAppleMusicConnected] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile data when it's available
  useEffect(() => {
    if (profile) {
      setName(profile.display_name || "");
      setUsername(profile.username || "");
      setOriginalUsername(profile.username || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif)$/)) {
      toast.error("Please select a valid image file (JPG, PNG, or GIF)");
      return;
    }

    setIsUploadingAvatar(true);

    // Convert to data URL for immediate preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAvatarUrl(dataUrl);
      toast.success("Profile picture updated!");
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      toast.error("Failed to upload profile picture");
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // Check username availability
  useEffect(() => {
    if (!username || username === originalUsername) {
      setUsernameError("");
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(username);
        setUsernameError(available ? "" : "Username already taken");
      } catch (error) {
        console.error("Error checking username:", error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, originalUsername]);

  const handleSave = async () => {
    if (usernameError) {
      toast.error("Please fix errors before saving");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        display_name: name,
        username: username,
        bio: bio,
        avatar_url: avatarUrl,
      });
      
      toast.success("Profile updated successfully!");
      
      if (onBack) {
        onBack();
      } else {
        onNavigate?.("your-space");
      }
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <BackButton onClick={onBack || (() => onNavigate?.("your-space"))} label={canGoBack ? "Back" : "Back to My Space"} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl text-foreground">Edit Profile</h1>
          <p className="text-muted-foreground">Customize your OnChord presence</p>
        </div>
      </div>

      {/* Profile Picture */}
      <Card className="p-6 bg-card border-border shadow-lg">
        <h3 className="text-lg text-foreground mb-4">Profile Picture</h3>
        <div className="flex items-center gap-6">
          <div className="relative group">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile" 
                className="w-24 h-24 rounded-full object-cover border-4 border-primary shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary shadow-lg">
                <User className="w-8 h-8 text-primary" />
              </div>
            )}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
          <div className="space-y-2">
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isUploadingAvatar ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Upload New Photo
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              JPG, PNG or GIF. Max size 2MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </Card>

      {/* Basic Information */}
      <Card className="p-6 bg-card border-border shadow-lg">
        <h3 className="text-lg text-foreground mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground">@</span>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="username"
                className={`flex-1 ${usernameError ? 'border-destructive' : ''}`}
              />
            </div>
            {usernameError ? (
              <p className="text-xs text-destructive mt-1">
                {usernameError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Letters, numbers, and underscores only
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about your musical journey..."
              className="mt-1 min-h-[100px]"
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {bio.length}/160 characters
            </p>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <div className="relative mt-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <div className="relative mt-1">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="yourwebsite.com"
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Connected Accounts */}
      <Card className="p-6 bg-card border-border shadow-lg">
        <h3 className="text-lg text-foreground mb-4">Connected Accounts</h3>
        <div className="space-y-4">
          {/* Spotify */}
          <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1DB954] to-[#1aa34a] rounded-lg flex items-center justify-center shadow-md">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-foreground font-medium">Spotify</p>
                <p className="text-xs text-muted-foreground">
                  {spotifyConnected ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            {spotifyConnected ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-secondary" />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSpotifyConnected(false)}
                  className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button 
                size="sm"
                onClick={() => setSpotifyConnected(true)}
                className="bg-[#1DB954] hover:bg-[#1aa34a] text-white"
              >
                Connect
              </Button>
            )}
          </div>

          {/* Apple Music */}
          <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FA233B] to-[#d91e31] rounded-lg flex items-center justify-center shadow-md">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-foreground font-medium">Apple Music</p>
                <p className="text-xs text-muted-foreground">
                  {appleMusicConnected ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            {appleMusicConnected ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-secondary" />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAppleMusicConnected(false)}
                  className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button 
                size="sm"
                onClick={() => setAppleMusicConnected(true)}
                className="bg-[#FA233B] hover:bg-[#d91e31] text-white"
              >
                Connect
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 p-3 bg-secondary/10 rounded-lg border border-secondary/20">
            <Mail className="w-4 h-4 text-secondary" />
            <p className="text-sm text-muted-foreground">
              Connect your music accounts to unlock personalized insights and seamless playlist syncing
            </p>
          </div>
        </div>
      </Card>

      {/* Privacy Settings */}
      <Card className="p-6 bg-card border-border shadow-lg">
        <h3 className="text-lg text-foreground mb-4">Privacy</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="public-profile">Public Profile</Label>
              <p className="text-sm text-muted-foreground">
                Allow others to view your profile and reviews
              </p>
            </div>
            <Switch
              id="public-profile"
              checked={publicProfile}
              onCheckedChange={setPublicProfile}
            />
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 pb-8">
        <Button
          onClick={handleSave}
          disabled={isSaving || !!usernameError}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onBack || (() => onNavigate?.("your-space"))}
          className="border-border"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
