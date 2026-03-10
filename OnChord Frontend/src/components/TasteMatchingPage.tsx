import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { Users, Sparkles, UserPlus, UserCheck, Loader2, AlertCircle, RefreshCw, Music } from "lucide-react";
import { useSupabaseFollows } from "../lib/useSupabaseFollows";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";
import { checkMlServiceHealth, getEnhancedTasteSimilarity, EnhancedTasteResponse } from "../lib/api/mlService";
import { type Profile } from "../lib/api/profiles";
import { getUserMusicData, type UserMusicData } from "../lib/api/tasteMatching";

interface TasteMatchingPageProps {
  onNavigate?: (page: string) => void;
}

export function TasteMatchingPage({ onNavigate }: TasteMatchingPageProps) {
  const { toggleFollow, isFollowing } = useSupabaseFollows();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Real users from Supabase
  const [realUsers, setRealUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // ML Service state
  const [mlServiceAvailable, setMlServiceAvailable] = useState<boolean | null>(null);

  // User music data and compatibility
  const [myMusicData, setMyMusicData] = useState<UserMusicData | null>(null);
  const [userCompatibilities, setUserCompatibilities] = useState<Record<string, {
    similarity: number;
    sharedArtists: string[];
    sharedTracks: number;
    sharedAlbums: number;
  }>>({});
  const [isComputingAll, setIsComputingAll] = useState(false);
  const [loadingMyData, setLoadingMyData] = useState(false);
  
  // Load current user ID and their music data
  useEffect(() => {
    async function loadUserData() {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id || null;
      setCurrentUserId(userId);
      
      if (userId) {
        setLoadingMyData(true);
        try {
          const musicData = await getUserMusicData(userId);
          setMyMusicData(musicData);
        } catch (error) {
          console.error("Failed to load music data:", error);
        } finally {
          setLoadingMyData(false);
        }
      }
    }
    loadUserData();
  }, []);

  // Load real users from Supabase
  useEffect(() => {
    async function loadRealUsers() {
      setLoadingUsers(true);
      try {
        // Fetch all profiles from Supabase (empty search returns all)
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .limit(50);
        
        if (error) throw error;
        setRealUsers(data || []);
      } catch (error) {
        console.error("Failed to load users:", error);
        toast.error("Failed to load users");
      } finally {
        setLoadingUsers(false);
      }
    }
    loadRealUsers();
  }, []);

  // Check ML service and load sample profiles
  useEffect(() => {
    async function initMlService() {
      try {
        const health = await checkMlServiceHealth();
        setMlServiceAvailable(health.taste_model_loaded);
      } catch {
        setMlServiceAvailable(false);
      }
    }
    initMlService();
  }, []);

  // Compute ML compatibility for all users based on their actual music data
  const computeAllCompatibilities = async () => {
    if (!currentUserId || !myMusicData) {
      toast.error("Please add some reviews or favorites first!");
      return;
    }

    if (myMusicData.totalItems === 0) {
      toast.error("No music data found. Review some albums or add favorites!");
      return;
    }
    
    setIsComputingAll(true);
    const newCompatibilities: typeof userCompatibilities = {};

    for (const user of filteredUsers) {
      try {
        // Fetch their music data
        const theirData = await getUserMusicData(user.id);
        
        if (theirData.totalItems === 0) {
          // No data for this user
          newCompatibilities[user.id] = {
            similarity: 0,
            sharedArtists: [],
            sharedTracks: 0,
            sharedAlbums: 0,
          };
          continue;
        }

        // Call ML service for enhanced comparison
        if (mlServiceAvailable) {
          const result = await getEnhancedTasteSimilarity(
            {
              trackIds: myMusicData.trackIds,
              albumIds: myMusicData.albumIds,
              artists: myMusicData.artistNames,
            },
            {
              trackIds: theirData.trackIds,
              albumIds: theirData.albumIds,
              artists: theirData.artistNames,
            }
          );
          
          // Log ML response for debugging
          console.log(`[TasteMatch] ${user.username}:`, {
            overall: result.overall_similarity,
            audio: result.audio_similarity,
            breakdown: result.breakdown,
            myArtists: myMusicData.artistNames.slice(0, 5),
            theirArtists: theirData.artistNames.slice(0, 5),
          });
          
          newCompatibilities[user.id] = {
            similarity: Math.round(result.overall_similarity),
            sharedArtists: result.shared_artists,
            sharedTracks: result.shared_tracks.length,
            sharedAlbums: result.shared_albums.length,
          };
        } else {
          // Fallback: simple local comparison
          const sharedArtists = myMusicData.artistNames.filter(a => 
            theirData.artistNames.includes(a)
          );
          const sharedTracks = myMusicData.trackIds.filter(t => 
            theirData.trackIds.includes(t)
          );
          const sharedAlbums = myMusicData.albumIds.filter(a => 
            theirData.albumIds.includes(a)
          );

          // Calculate simple similarity
          const trackBonus = Math.min(sharedTracks.length * 5, 30);
          const albumBonus = Math.min(sharedAlbums.length * 3, 20);
          const artistBonus = Math.min(sharedArtists.length * 2, 25);
          const similarity = Math.min(100, trackBonus + albumBonus + artistBonus);

          newCompatibilities[user.id] = {
            similarity,
            sharedArtists,
            sharedTracks: sharedTracks.length,
            sharedAlbums: sharedAlbums.length,
          };
        }
      } catch (error) {
        console.error(`Failed to compute compatibility with ${user.id}:`, error);
        newCompatibilities[user.id] = {
          similarity: 0,
          sharedArtists: [],
          sharedTracks: 0,
          sharedAlbums: 0,
        };
      }
    }
    
    setUserCompatibilities(newCompatibilities);
    setIsComputingAll(false);
    
    const matchCount = Object.values(newCompatibilities).filter(c => c.similarity > 0).length;
    toast.success(`Found ${matchCount} potential matches based on your music taste!`);
  };
  
  // Filter out current user from real users
  const filteredUsers = currentUserId 
    ? realUsers.filter(user => user.id !== currentUserId)
    : realUsers;
  
  // Get display compatibility for a user
  const getCompatibility = (userId: string) => {
    return userCompatibilities[userId] ?? null;
  };

  const handleConnectClick = async (userId: string, userName: string) => {
    const wasFollowing = isFollowing(userId);
    
    try {
      await toggleFollow(userId);
      
      if (wasFollowing) {
        toast.success(`Disconnected from ${userName}`);
      } else {
        toast.success(`Connected with ${userName}!`);
      }
    } catch (error) {
      toast.error(`Failed to ${wasFollowing ? 'disconnect from' : 'connect with'} ${userName}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl text-foreground">Find Your Taste Matches</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover people with similar music taste. Our AI analyzes listening history to find perfect matches.
        </p>
      </div>

      {/* ML-Powered Demo Section */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Demo: Compare Music Taste</h3>
        </div>

        {mlServiceAvailable === false && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-500">ML Features Limited</p>
              <p className="text-xs text-muted-foreground">
                Advanced taste matching is temporarily unavailable. Basic matching still works!
              </p>
            </div>
          </div>
        )}

        {mlServiceAvailable && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Music className="w-4 h-4" />
            <span>ML taste matching ready</span>
          </div>
        )}
      </Card>

      {/* My Music Profile */}
      {mlServiceAvailable && currentUserId && (
        <Card className="p-4 bg-card border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">Your Music Profile</p>
              {loadingMyData ? (
                <p className="text-xs text-muted-foreground">Loading your music data...</p>
              ) : myMusicData ? (
                <p className="text-xs text-muted-foreground">
                  {myMusicData.totalItems} items • {myMusicData.trackIds.length} tracks • {myMusicData.albumIds.length} albums • {myMusicData.artistNames.length} artists
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Add reviews and favorites to build your music profile
                </p>
              )}
            </div>
            <Button
              onClick={computeAllCompatibilities}
              disabled={isComputingAll || !myMusicData || myMusicData.totalItems === 0}
              size="sm"
            >
              {isComputingAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Computing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Find Matches
                </>
              )}
            </Button>
          </div>
          {Object.keys(userCompatibilities).length > 0 && (
            <p className="mt-2 text-xs text-primary">
              ✨ Real taste matching based on your reviews & favorites
            </p>
          )}
        </Card>
      )}

      {/* Taste Match Cards */}
      {loadingUsers ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading users...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No other users found yet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Invite friends to join OnChord to find your taste matches!
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const compat = getCompatibility(user.id);
            const isComputed = compat !== null;
            const displayCompat = compat?.similarity ?? 0;
            const sharedArtists = compat?.sharedArtists ?? [];
            
            return (
              <Card
                key={user.id}
                className="p-6 bg-card border-border hover:border-primary/50 transition"
              >
                {/* Compatibility Header */}
                <div className="text-center mb-4">
                  <div
                    className="w-24 h-24 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{
                      background: isComputed 
                        ? `conic-gradient(#A78BFA ${displayCompat * 3.6}deg, #3B4252 0deg)`
                        : `conic-gradient(#6B7280 180deg, #3B4252 0deg)`,
                    }}
                  >
                    <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center">
                      <div>
                        {isComputed ? (
                          <>
                            <p className="text-2xl text-primary">{displayCompat}%</p>
                            <p className="text-xs text-muted-foreground">Match</p>
                          </>
                        ) : (
                          <>
                            <p className="text-lg text-muted-foreground">?</p>
                            <p className="text-xs text-muted-foreground">Click Find</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Info - Clickable to view profile */}
                <div 
                  className="flex items-center gap-3 mb-4 cursor-pointer hover:bg-muted/30 rounded-lg p-2 -mx-2 transition"
                  onClick={() => onNavigate?.(`user-${user.id}`)}
                >
                  <Avatar className="w-12 h-12">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.display_name || "User"} className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                        {(user.display_name || user.username || "U")[0].toUpperCase()}
                      </div>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate hover:text-primary transition">{user.display_name || "User"}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.username ? `@${user.username}` : "No username"}
                    </p>
                  </div>
                </div>

                {/* Shared Artists */}
                {isComputed && sharedArtists.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Shared Artists</p>
                    <div className="flex flex-wrap gap-2">
                      {sharedArtists.slice(0, 5).map((artist) => (
                        <Badge
                          key={artist}
                          variant="secondary"
                          className="bg-secondary/20 text-secondary border-0"
                        >
                          {artist}
                        </Badge>
                      ))}
                      {sharedArtists.length > 5 && (
                        <Badge variant="outline" className="text-muted-foreground">
                          +{sharedArtists.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Match Details */}
                {isComputed && compat && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {compat.sharedTracks > 0 && `${compat.sharedTracks} tracks`}
                      {compat.sharedTracks > 0 && compat.sharedAlbums > 0 && " • "}
                      {compat.sharedAlbums > 0 && `${compat.sharedAlbums} albums`}
                      {compat.sharedTracks === 0 && compat.sharedAlbums === 0 && "Based on audio similarity"}
                    </span>
                  </div>
                )}

                {/* Connect Button */}
                <Button 
                  className={`w-full transition-all ${
                    isFollowing(user.id)
                      ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                  onClick={() => handleConnectClick(user.id, user.display_name || "User")}
                >
                  {isFollowing(user.id) ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Connected
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Connect
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30">
        <div className="flex gap-4 items-start">
          <div className="bg-primary/20 p-3 rounded-lg">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-foreground mb-2">How It Works</h3>
            <p className="text-muted-foreground text-sm mb-3">
              Our machine learning algorithm analyzes your listening patterns, favorite genres, and review history 
              to find users with similar taste. Higher compatibility means more shared musical preferences!
            </p>
            <p className="text-xs text-muted-foreground">
              Note: OnChord is focused on friendship and music discovery, not dating.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}