import { useState, useEffect, useMemo } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { Sparkles, Users, TrendingUp, Music, Search, X, Loader2, Link2 } from "lucide-react";
import { useSpotifyConnection, useTopTracks, useTopArtists, computeAverageAudioFeatures, getGenreBreakdown, type AudioFeatures } from "../lib/useSpotify";
import { initiateSpotifyLogin } from "../lib/api/spotify";
import { supabase } from "../lib/supabaseClient";
import { getFollowing } from "../lib/api/follows";
import { type Profile } from "../lib/api/profiles";
import { getUserMusicData, type UserMusicData } from "../lib/api/tasteMatching";
import { classifyMoodByTrackIds } from "../lib/api/mlService";

// Default neutral personality values
const DEFAULT_PERSONALITY = {
  energy: 50,
  danceability: 50,
  valence: 50,
  acousticness: 50,
  instrumentalness: 50,
};

// Personality type definitions
interface PersonalityProfile {
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
}

interface FriendWithPersonality {
  id: string;
  profile: Profile;
  musicData: UserMusicData | null;
  personality: PersonalityProfile | null;
  personalityType: string;
  loading: boolean;
}

interface MusicPersonalityPageProps {
  onNavigate?: (page: string) => void;
}

export function MusicPersonalityPage({ onNavigate }: MusicPersonalityPageProps) {
  const [selectedFriend, setSelectedFriend] = useState<FriendWithPersonality | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Real friends data
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [realFriends, setRealFriends] = useState<FriendWithPersonality[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  
  // Current user's personality from reviews/favorites (non-Spotify)
  const [myMusicData, setMyMusicData] = useState<UserMusicData | null>(null);
  const [myMLPersonality, setMyMLPersonality] = useState<PersonalityProfile | null>(null);
  const [loadingMyData, setLoadingMyData] = useState(false);

  // Spotify data
  const { connected: spotifyConnected, loading: spotifyLoading } = useSpotifyConnection();
  const { tracks: topTracks, loading: tracksLoading } = useTopTracks("medium_term", 50);
  const { artists: topArtists, loading: artistsLoading } = useTopArtists("medium_term", 50);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [audioFeaturesAvailable, setAudioFeaturesAvailable] = useState(true);

  // Helper to compute personality type from features
  const computePersonalityType = (p: PersonalityProfile) => {
    const energy = p.energy;
    const danceability = p.danceability;
    const valence = p.valence;
    const acousticness = p.acousticness;

    if (energy > 70 && danceability > 70) return "The Party Starter";
    if (energy > 70 && valence < 40) return "The Intensity Seeker";
    if (valence > 70 && energy > 50) return "The Optimist";
    if (acousticness > 60) return "The Acoustic Soul";
    if (energy < 40 && valence > 50) return "The Chill Explorer";
    if (danceability > 65) return "The Groove Master";
    if (energy < 40 && valence < 40) return "The Deep Thinker";
    return "The Explorer";
  };

  // Load current user and their music data (always, as fallback to Spotify)
  useEffect(() => {
    async function loadCurrentUser() {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id || null;
      setCurrentUserId(userId);

      if (userId) {
        setLoadingMyData(true);
        try {
          const musicData = await getUserMusicData(userId);
          setMyMusicData(musicData);
          
          // Get personality from ML service using track IDs or album IDs
          const idsToCheck = musicData.trackIds.length > 0 
            ? musicData.trackIds 
            : musicData.albumIds;
            
          if (idsToCheck.length > 0) {
            const moodResult = await classifyMoodByTrackIds(idsToCheck);
            if (moodResult.average_features) {
              const f = moodResult.average_features;
              setMyMLPersonality({
                energy: Math.round((f.energy || 0.5) * 100),
                danceability: Math.round((f.danceability || 0.5) * 100),
                valence: Math.round((f.valence || 0.5) * 100),
                acousticness: Math.round((f.acousticness || 0.5) * 100),
                instrumentalness: Math.round((f.instrumentalness || 0) * 100),
              });
            }
          }
        } catch (error) {
          console.error("Failed to load user music data:", error);
        } finally {
          setLoadingMyData(false);
        }
      }
    }
    loadCurrentUser();
  }, []);

  // Load real friends (people user follows) and their personalities
  useEffect(() => {
    async function loadRealFriends() {
      if (!currentUserId) return;
      
      setLoadingFriends(true);
      try {
        // Get list of user IDs being followed
        const followingIds = await getFollowing();
        
        if (followingIds.length === 0) {
          setRealFriends([]);
          setLoadingFriends(false);
          return;
        }

        // Fetch profiles for followed users
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("*")
          .in("id", followingIds);

        if (error) throw error;

        // Initialize friends with loading state
        const friendsWithData: FriendWithPersonality[] = (profiles || []).map(profile => ({
          id: profile.id,
          profile,
          musicData: null,
          personality: null,
          personalityType: "Music Lover",
          loading: true,
        }));
        setRealFriends(friendsWithData);

        // Load music data for each friend in parallel
        const updatedFriends = await Promise.all(
          friendsWithData.map(async (friend) => {
            try {
              const musicData = await getUserMusicData(friend.id);
              let personality: PersonalityProfile | null = null;
              let personalityType = "Music Lover";

              const idsToCheck = musicData.trackIds.length > 0 
                ? musicData.trackIds 
                : musicData.albumIds;
                
              if (idsToCheck.length > 0) {
                const moodResult = await classifyMoodByTrackIds(idsToCheck);
                if (moodResult.average_features) {
                  const f = moodResult.average_features;
                  personality = {
                    energy: Math.round((f.energy || 0.5) * 100),
                    danceability: Math.round((f.danceability || 0.5) * 100),
                    valence: Math.round((f.valence || 0.5) * 100),
                    acousticness: Math.round((f.acousticness || 0.5) * 100),
                    instrumentalness: Math.round((f.instrumentalness || 0) * 100),
                  };
                  personalityType = computePersonalityType(personality);
                }
              }

              return { ...friend, musicData, personality, personalityType, loading: false };
            } catch {
              return { ...friend, loading: false };
            }
          })
        );

        setRealFriends(updatedFriends);
        // Auto-select first friend if none selected
        if (!selectedFriend && updatedFriends.length > 0) {
          setSelectedFriend(updatedFriends[0]);
        }
      } catch (error) {
        console.error("Failed to load friends:", error);
      } finally {
        setLoadingFriends(false);
      }
    }
    loadRealFriends();
  }, [currentUserId]);

  // Fetch audio features when top tracks are loaded
  useEffect(() => {
    if (!spotifyConnected || topTracks.length === 0) return;

    let cancelled = false;
    setFeaturesLoading(true);

    computeAverageAudioFeatures(topTracks.map((t) => t.id))
      .then((features) => {
        if (!cancelled) {
          setAudioFeatures(features);
          if (!features) setAudioFeaturesAvailable(false);
        }
      })
      .catch(() => {
        if (!cancelled) setAudioFeaturesAvailable(false);
      })
      .finally(() => {
        if (!cancelled) setFeaturesLoading(false);
      });

    return () => { cancelled = true; };
  }, [spotifyConnected, topTracks]);

  // Build personality data from Spotify audio features, ML data, or fallback
  const personalityData = useMemo(() => {
    // My data - prefer Spotify, then ML from reviews, then defaults
    let myPersonality = {
      energy: DEFAULT_PERSONALITY.energy,
      danceability: DEFAULT_PERSONALITY.danceability,
      valence: DEFAULT_PERSONALITY.valence,
      acousticness: DEFAULT_PERSONALITY.acousticness,
      instrumentalness: DEFAULT_PERSONALITY.instrumentalness,
    };

    if (audioFeatures) {
      myPersonality = {
        energy: Math.round(audioFeatures.energy * 100),
        danceability: Math.round(audioFeatures.danceability * 100),
        valence: Math.round(audioFeatures.valence * 100),
        acousticness: Math.round(audioFeatures.acousticness * 100),
        instrumentalness: Math.round(audioFeatures.instrumentalness * 100),
      };
    } else if (myMLPersonality) {
      myPersonality = myMLPersonality;
    }

    // Friend data - use real friend if selected, otherwise defaults
    let friendPersonality = {
      energy: DEFAULT_PERSONALITY.energy,
      danceability: DEFAULT_PERSONALITY.danceability,
      valence: DEFAULT_PERSONALITY.valence,
      acousticness: DEFAULT_PERSONALITY.acousticness,
      instrumentalness: DEFAULT_PERSONALITY.instrumentalness,
    };

    if (selectedFriend?.personality) {
      friendPersonality = selectedFriend.personality;
    }

    return [
      { attribute: "Energy", you: myPersonality.energy, friend: friendPersonality.energy },
      { attribute: "Danceability", you: myPersonality.danceability, friend: friendPersonality.danceability },
      { attribute: "Valence", you: myPersonality.valence, friend: friendPersonality.valence },
      { attribute: "Acousticness", you: myPersonality.acousticness, friend: friendPersonality.acousticness },
      { attribute: "Instrumental", you: myPersonality.instrumentalness, friend: friendPersonality.instrumentalness },
    ];
  }, [audioFeatures, myMLPersonality, selectedFriend]);

  // Genre breakdown from top artists
  const genres = useMemo(() => {
    if (!spotifyConnected || topArtists.length === 0) return [];
    return getGenreBreakdown(topArtists).slice(0, 8);
  }, [spotifyConnected, topArtists]);

  // Determine personality type based on audio features or ML data
  const personalityType = useMemo(() => {
    // Use Spotify data if available, otherwise ML data from reviews
    let energy = 50, danceability = 50, valence = 50, acousticness = 50;
    
    if (audioFeatures) {
      energy = audioFeatures.energy * 100;
      danceability = audioFeatures.danceability * 100;
      valence = audioFeatures.valence * 100;
      acousticness = audioFeatures.acousticness * 100;
    } else if (myMLPersonality) {
      energy = myMLPersonality.energy;
      danceability = myMLPersonality.danceability;
      valence = myMLPersonality.valence;
      acousticness = myMLPersonality.acousticness;
    } else {
      // Still loading or no data available
      const isLoading = loadingMyData || featuresLoading;
      return { 
        title: isLoading ? "Analyzing..." : "Music Explorer", 
        badges: isLoading ? ["Analyzing your music taste..."] : ["Add reviews to see your personality"], 
        loading: isLoading 
      };
    }

    let title = "The Explorer";
    if (energy > 70 && danceability > 70) title = "The Party Starter";
    else if (energy > 70 && valence < 40) title = "The Intensity Seeker";
    else if (valence > 70 && energy > 50) title = "The Optimist";
    else if (acousticness > 60) title = "The Acoustic Soul";
    else if (energy < 40 && valence > 50) title = "The Chill Explorer";
    else if (danceability > 65) title = "The Groove Master";
    else if (energy < 40 && valence < 40) title = "The Deep Thinker";

    const badges: string[] = [];
    if (valence > 60) badges.push("High Valence");
    else if (valence < 40) badges.push("Low Valence");
    if (energy > 60) badges.push("High Energy");
    else if (energy < 40) badges.push("Low Energy");
    else badges.push("Moderate Energy");
    if (genres.length > 5) badges.push("Eclectic Taste");
    else if (genres.length > 0) badges.push(genres[0].genre);
    else if (myMusicData && myMusicData.artistNames.length > 0) badges.push(myMusicData.artistNames[0]);

    return { title, badges: badges.slice(0, 3), loading: false };
  }, [audioFeatures, myMLPersonality, genres, loadingMyData, featuresLoading, myMusicData]);

  const singlePersonalityData = personalityData.map((item) => ({
    attribute: item.attribute,
    value: item.you,
  }));

  // Filter friends based on search query - use real friends
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return realFriends;
    
    const query = searchQuery.toLowerCase();
    return realFriends.filter(
      (friend) =>
        (friend.profile.display_name || "").toLowerCase().includes(query) ||
        (friend.profile.username || "").toLowerCase().includes(query) ||
        (friend.musicData?.artistNames || []).some((artist) => artist.toLowerCase().includes(query))
    );
  }, [searchQuery, realFriends]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl text-foreground">Your Music Personality</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Advanced ML analysis of your listening patterns reveals your unique musical DNA
        </p>
      </div>

      {/* Spotify Connection Prompt */}
      {!spotifyLoading && !spotifyConnected && (
        <Card className="p-6 bg-gradient-to-r from-green-500/10 to-green-600/5 border-green-500/30">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-green-500/20 p-3 rounded-full">
              <Link2 className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-foreground font-medium">Connect Spotify for Real Data</h3>
              <p className="text-sm text-muted-foreground">
                Link your Spotify account to see your actual music personality based on your listening history
              </p>
            </div>
            <Button
              onClick={() => onNavigate?.("settings")}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Connect Spotify
            </Button>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {spotifyConnected && (tracksLoading || featuresLoading) && (
        <Card className="p-8 bg-card border-border">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground">Analyzing your music personality...</p>
          </div>
        </Card>
      )}

      {/* Top Tracks Preview (when Spotify connected) */}
      {spotifyConnected && topTracks.length > 0 && !tracksLoading && (
        <Card className="p-4 bg-card border-border">
          <h3 className="text-sm text-foreground mb-2 flex items-center gap-2">
            <Music className="w-3 h-3 text-primary" />
            Your Top Tracks
            <Badge variant="outline" className="text-xs ml-auto">Recent listening</Badge>
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {topTracks.slice(0, 8).map((track) => (
              <div key={track.id} className="flex-shrink-0 w-16 text-center group">
                <div className="w-16 h-16 rounded overflow-hidden mb-1 shadow-sm">
                  <img
                    src={track.album.images[0]?.url}
                    alt={track.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <p className="text-[10px] text-foreground font-medium truncate">{track.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{track.artists[0]?.name}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Genre Breakdown (when Spotify connected) */}
      {genres.length > 0 && (
        <Card className="p-6 bg-card border-border">
          <h3 className="text-foreground mb-3">Your Genre DNA</h3>
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <Badge
                key={g.genre}
                className="bg-primary/15 text-primary border-0 px-3 py-1.5"
              >
                {g.genre} ({g.percentage}%)
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Personality Overview */}
      <Card className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30">
        <div className="text-center mb-6">
          {personalityType.loading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
              <h2 className="text-2xl text-foreground mb-2">{personalityType.title}</h2>
            </>
          ) : (
            <h2 className="text-2xl text-foreground mb-2">{personalityType.title}</h2>
          )}
          <p className="text-muted-foreground">
            {spotifyConnected && audioFeatures
              ? "Based on your Spotify listening data"
              : myMLPersonality 
                ? "Based on your reviews and favorites"
                : "Your personality type based on listening habits"}
          </p>
          {myMusicData && (
            <p className="text-xs text-muted-foreground mt-1">
              {myMusicData.trackIds.length} tracks • {myMusicData.albumIds.length} albums • {myMusicData.artistNames.length} artists
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {personalityType.badges.map((badge, i) => (
            <Badge
              key={i}
              className={`${
                i === 0 ? "bg-primary/20 text-primary" :
                i === 1 ? "bg-secondary/20 text-secondary" :
                "bg-chart-3/20 text-chart-3"
              } border-0 px-4 py-2`}
            >
              {badge}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="bg-card border border-border w-full md:w-auto">
          <TabsTrigger
            value="single"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Music className="w-4 h-4 mr-2" />
            Your Profile
          </TabsTrigger>
          <TabsTrigger
            value="compare"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Users className="w-4 h-4 mr-2" />
            Compare with Friend
          </TabsTrigger>
        </TabsList>

        {/* Single Profile */}
        <TabsContent value="single" className="mt-6">
          <Card className="p-8 bg-card border-border">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={singlePersonalityData}>
                <PolarGrid stroke="#4C566A" />
                <PolarAngleAxis
                  dataKey="attribute"
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#9CA3AF" }} />
                <Radar
                  name="Your Profile"
                  dataKey="value"
                  stroke="#A78BFA"
                  fill="#A78BFA"
                  fillOpacity={0.6}
                />
                <Legend wrapperStyle={{ color: "#F3F4F6" }} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        {/* Comparison */}
        <TabsContent value="compare" className="mt-6 space-y-6">
          {/* Friend Selector with Search */}
          <Card className="p-6 bg-card border-border shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground">Compare With</h3>
              <Badge className="bg-primary/20 text-primary border-0">
                {filteredFriends.length} {filteredFriends.length === 1 ? 'Friend' : 'Friends'}
              </Badge>
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by name, username, or artist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-background/50 border-2 border-border focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Friends Grid */}
            {loadingFriends ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading friends...</span>
              </div>
            ) : filteredFriends.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 nav-scroll">
                {filteredFriends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => {
                      setSelectedFriend(friend);
                      setSearchQuery("");
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedFriend?.id === friend.id
                        ? "border-primary bg-gradient-to-br from-primary/20 to-primary/10 shadow-md"
                        : "border-border hover:border-primary/50 bg-background/50 hover:bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border-2 border-primary shrink-0">
                        {friend.profile.avatar_url ? (
                          <img src={friend.profile.avatar_url} alt={friend.profile.display_name || "User"} className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                            {(friend.profile.display_name || friend.profile.username || "U")[0].toUpperCase()}
                          </div>
                        )}
                      </Avatar>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{friend.profile.display_name || "User"}</p>
                        <p className="text-xs text-muted-foreground truncate">@{friend.profile.username || "user"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {friend.loading ? (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                          ) : (
                            <Badge className="bg-secondary/20 text-secondary border-0 text-xs">
                              {friend.personalityType}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Artists Preview */}
                    {friend.musicData && friend.musicData.artistNames.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-1">Top artists:</p>
                        <div className="flex flex-wrap gap-1">
                          {friend.musicData.artistNames.slice(0, 2).map((artist, idx) => (
                            <span key={idx} className="text-xs bg-muted/50 px-2 py-0.5 rounded-full text-muted-foreground">
                              {artist}
                            </span>
                          ))}
                          {friend.musicData.artistNames.length > 2 && (
                            <span className="text-xs text-primary">
                              +{friend.musicData.artistNames.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No friends found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {realFriends.length === 0 ? "Follow some users to compare personalities!" : "Try a different search term"}
                </p>
              </div>
            )}
          </Card>

          {/* Side-by-Side Comparison */}
          {selectedFriend ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Your Chart */}
              <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-10 h-10 border-2 border-primary">
                    <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                      You
                    </div>
                  </Avatar>
                  <div>
                    <p className="text-foreground font-medium">Your Profile</p>
                    <p className="text-xs text-muted-foreground">{personalityType.title}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={singlePersonalityData}>
                    <PolarGrid stroke="#4C566A" />
                    <PolarAngleAxis
                      dataKey="attribute"
                      tick={{ fill: "#9CA3AF", fontSize: 10 }}
                    />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#9CA3AF" }} />
                    <Radar
                      name="You"
                      dataKey="value"
                      stroke="#A78BFA"
                      fill="#A78BFA"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>

              {/* Friend's Chart */}
              <Card className="p-6 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-10 h-10 border-2 border-secondary">
                    {selectedFriend.profile.avatar_url ? (
                      <img src={selectedFriend.profile.avatar_url} alt={selectedFriend.profile.display_name || "User"} className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-secondary/20 flex items-center justify-center text-secondary font-medium">
                        {(selectedFriend.profile.display_name || selectedFriend.profile.username || "U")[0].toUpperCase()}
                      </div>
                    )}
                  </Avatar>
                  <div>
                    <p className="text-foreground font-medium">{selectedFriend.profile.display_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{selectedFriend.personalityType}</p>
                  </div>
                </div>
                {selectedFriend.personality ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={personalityData}>
                      <PolarGrid stroke="#4C566A" />
                      <PolarAngleAxis
                        dataKey="attribute"
                        tick={{ fill: "#9CA3AF", fontSize: 10 }}
                      />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#9CA3AF" }} />
                      <Radar
                        name={selectedFriend.profile.display_name || "Friend"}
                        dataKey="friend"
                        stroke="#34D399"
                        fill="#34D399"
                        fillOpacity={0.6}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    {selectedFriend.loading ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <p className="text-center">No music data available for this user</p>
                    )}
                  </div>
                )}
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center bg-card border-border">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Select a friend above to compare personalities</p>
            </Card>
          )}

          {/* Overlay Comparison */}
          {selectedFriend && selectedFriend.personality && (
            <Card className="p-8 bg-card border-border shadow-lg">
              <div className="mb-6 text-center">
                <h3 className="text-lg text-foreground mb-2">Combined Comparison</h3>
                <p className="text-sm text-muted-foreground">
                  See how your music personalities overlap
                </p>
              </div>
              <div className="mb-4 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary rounded-full shadow-md" />
                  <span className="text-sm text-foreground">You</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-secondary rounded-full shadow-md" />
                  <span className="text-sm text-foreground">{selectedFriend.profile.display_name || "Friend"}</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={personalityData}>
                  <PolarGrid stroke="#4C566A" />
                  <PolarAngleAxis
                    dataKey="attribute"
                    tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#9CA3AF" }} />
                  <Radar
                    name="You"
                    dataKey="you"
                    stroke="#A78BFA"
                    fill="#A78BFA"
                    fillOpacity={0.5}
                    strokeWidth={2}
                  />
                  <Radar
                    name={selectedFriend.profile.display_name || "Friend"}
                    dataKey="friend"
                    stroke="#34D399"
                    fill="#34D399"
                    fillOpacity={0.5}
                    strokeWidth={2}
                  />
                  <Legend wrapperStyle={{ color: "#F3F4F6" }} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Personality Breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6 bg-card border-border">
          <div className="flex gap-4">
            <div className="bg-primary/20 p-3 rounded-lg h-fit">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-foreground mb-2">Energy Level: {personalityData[0].you > 60 ? "High" : personalityData[0].you > 40 ? "Moderate" : "Low"}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {personalityData[0].you > 60
                  ? "You prefer intense, high-energy music that gets you pumped up."
                  : personalityData[0].you > 40
                    ? "You prefer music with balanced energy - not too intense, but not too mellow either."
                    : "You gravitate toward calm, relaxed music that helps you unwind."}
              </p>
              <Badge className="bg-primary/20 text-primary border-0">{personalityData[0].you}/100</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex gap-4">
            <div className="bg-secondary/20 p-3 rounded-lg h-fit">
              <Music className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="text-foreground mb-2">Danceability: {personalityData[1].you > 60 ? "High" : personalityData[1].you > 40 ? "Moderate" : "Low"}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {personalityData[1].you > 60
                  ? "You gravitate toward tracks with strong rhythms and grooves that make you want to move."
                  : "You enjoy music for its melody and emotion rather than danceable beats."}
              </p>
              <Badge className="bg-secondary/20 text-secondary border-0">{personalityData[1].you}/100</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex gap-4">
            <div className="bg-chart-3/20 p-3 rounded-lg h-fit">
              <Sparkles className="w-6 h-6 text-chart-3" />
            </div>
            <div>
              <h3 className="text-foreground mb-2">Valence: {personalityData[2].you > 60 ? "Positive" : personalityData[2].you > 40 ? "Balanced" : "Melancholic"}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {personalityData[2].you > 60
                  ? "Your playlists lean toward uplifting and cheerful music that boosts your mood."
                  : personalityData[2].you > 40
                    ? "You enjoy a balanced mix of uplifting and more introspective music."
                    : "You're drawn to emotionally deep, introspective music."}
              </p>
              <Badge className="bg-chart-3/20 text-chart-3 border-0">{personalityData[2].you}/100</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex gap-4">
            <div className="bg-chart-4/20 p-3 rounded-lg h-fit">
              <Music className="w-6 h-6 text-chart-4" />
            </div>
            <div>
              <h3 className="text-foreground mb-2">Acousticness: {personalityData[3].you > 60 ? "High" : personalityData[3].you > 40 ? "Balanced" : "Electronic"}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {personalityData[3].you > 60
                  ? "You prefer organic, acoustic sounds — guitars, pianos, and natural instruments."
                  : personalityData[3].you > 40
                    ? "You enjoy a mix of acoustic and electronic sounds, showing diverse taste."
                    : "You lean toward produced, electronic sounds and synthetic textures."}
              </p>
              <Badge className="bg-chart-4/20 text-chart-4 border-0">{personalityData[3].you}/100</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-foreground mb-3">How We Calculate Your Personality</h3>
        <p className="text-muted-foreground text-sm mb-4">
          {spotifyConnected
            ? "We analyze audio features from your top Spotify tracks using Spotify's API:"
            : "Connect your Spotify account to get real analysis. Our model analyzes these audio features:"}
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="flex items-start gap-2 text-sm">
            <span className="text-primary">•</span>
            <span className="text-muted-foreground">
              <span className="text-foreground">Energy:</span> Overall intensity and activity level
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-primary">•</span>
            <span className="text-muted-foreground">
              <span className="text-foreground">Danceability:</span> Rhythm, tempo, and beat strength
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-primary">•</span>
            <span className="text-muted-foreground">
              <span className="text-foreground">Valence:</span> Musical positiveness and mood
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-primary">•</span>
            <span className="text-muted-foreground">
              <span className="text-foreground">Acousticness:</span> Presence of acoustic instruments
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}