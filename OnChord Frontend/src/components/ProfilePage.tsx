import { Card } from "./ui/card";
import { handleImageError } from "./ui/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Star, Heart, MessageCircle, Edit, ListMusic } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useReviews } from "../lib/useUserInteractions";
import { useLists } from "../lib/ListsContext";
import { BackButton } from "./BackButton";
import { useProfile } from "../lib/useProfile";
import { useTopArtists } from "../lib/useSpotify";
import { getFollowerCount, getFollowingCount } from "../lib/api/follows";
import { supabase } from "../lib/supabaseClient";

interface ProfilePageProps {
  username?: string;
  onNavigate?: (page: string) => void;
  onOpenAlbum?: (albumId?: string) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function ProfilePage({ username, onNavigate, onOpenAlbum, onBack, canGoBack }: ProfilePageProps) {
  const { userReviews } = useReviews();
  const { userListsMetadata } = useLists();
  const { profile, isLoading } = useProfile();
  const { artists: topArtists, loading: artistsLoading } = useTopArtists("medium_term", 10);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  // Convert lists metadata to array
  const userLists = useMemo(() => Object.values(userListsMetadata), [userListsMetadata]);
  
  // Extract top genres from top artists
  const topGenres = useMemo(() => {
    const genreCount: Record<string, number> = {};
    for (const artist of topArtists) {
      for (const genre of artist.genres || []) {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      }
    }
    return Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);
  }, [topArtists]);
  
  // Use real profile data
  const displayName = profile?.display_name || "Music Lover";
  const displayUsername = profile?.username ? `@${profile.username}` : "@user";
  const displayBio = profile?.bio || "No bio yet";
  const displayAvatar = profile?.avatar_url;

  // Load follower/following counts
  useEffect(() => {
    async function loadCounts() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const [followers, following] = await Promise.all([
        getFollowerCount(session.session.user.id),
        getFollowingCount(session.session.user.id),
      ]);

      setFollowersCount(followers);
      setFollowingCount(following);
    }

    loadCounts();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {canGoBack && <BackButton onClick={onBack || (() => onNavigate?.("home"))} label="Back" />}
        <Card className="p-6 bg-card border-border">
          <div className="animate-pulse space-y-4">
            <div className="flex gap-6">
              <div className="w-24 h-24 rounded-full bg-primary/20" />
              <div className="flex-1 space-y-3">
                <div className="h-8 bg-primary/20 rounded w-48" />
                <div className="h-4 bg-primary/20 rounded w-32" />
                <div className="h-4 bg-primary/20 rounded w-full" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canGoBack && <BackButton onClick={onBack || (() => onNavigate?.("home"))} label="Back" />}
      {/* Profile Header */}
      <Card className="p-6 bg-card border-border">
        <div className="flex flex-col md:flex-row gap-6">
          {displayAvatar ? (
            <img 
              src={displayAvatar} 
              alt={displayName}
              className="w-24 h-24 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-primary text-4xl font-medium">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-2xl text-foreground">{displayName}</h2>
                <p className="text-muted-foreground">{displayUsername}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-border hover:border-primary hover:text-primary"
                onClick={() => onNavigate?.("edit-profile")}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
            <p className="text-foreground mb-4">{displayBio}</p>
            <div className="flex gap-6">
              <div>
                <p className="text-foreground">{userReviews.length}</p>
                <p className="text-sm text-muted-foreground">Reviews</p>
              </div>
              <div>
                <p className="text-foreground">{userLists.length}</p>
                <p className="text-sm text-muted-foreground">Lists</p>
              </div>
              <div>
                <p className="text-foreground">{followersCount}</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Listening Summary */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-foreground mb-4">Listening Summary</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Top Genres</p>
            <div className="flex flex-wrap gap-2">
              {artistsLoading ? (
                <span className="text-muted-foreground text-sm">Loading...</span>
              ) : topGenres.length > 0 ? (
                topGenres.map((genre) => (
                  <Badge key={genre} variant="secondary" className="bg-primary/20 text-primary border-0">
                    {genre}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">Connect Spotify to see your top genres</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Top Artists</p>
            <div className="flex flex-wrap gap-2">
              {artistsLoading ? (
                <span className="text-muted-foreground text-sm">Loading...</span>
              ) : topArtists.length > 0 ? (
                topArtists.slice(0, 5).map((artist) => (
                  <Badge key={artist.id} variant="secondary" className="bg-secondary/20 text-secondary border-0">
                    {artist.name}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">Connect Spotify to see your top artists</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Collections Overview */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-foreground mb-4">Collections</h3>
        <div className="grid grid-cols-2 gap-4">
          <div 
            onClick={() => onNavigate?.("your-space")}
            className="p-4 bg-background rounded-lg hover:bg-primary/10 transition cursor-pointer group border border-transparent hover:border-primary"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl text-foreground group-hover:text-primary transition">{userReviews.length}</p>
                <p className="text-sm text-muted-foreground">Reviews</p>
              </div>
            </div>
          </div>
          <div 
            onClick={() => onNavigate?.("your-space")}
            className="p-4 bg-background rounded-lg hover:bg-secondary/10 transition cursor-pointer group border border-transparent hover:border-secondary"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center group-hover:scale-110 transition">
                <ListMusic className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl text-foreground group-hover:text-secondary transition">{userLists.length}</p>
                <p className="text-sm text-muted-foreground">Lists</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs for Reviews and Lists */}
      <Tabs defaultValue="reviews" className="w-full">
        <TabsList className="bg-card border border-border w-full md:w-auto">
          <TabsTrigger value="reviews" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Recent Reviews
          </TabsTrigger>
          <TabsTrigger value="lists" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Recent Lists
          </TabsTrigger>
        </TabsList>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">Showing {Math.min(3, userReviews.length)} of {userReviews.length} reviews</p>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onNavigate?.("your-space")}
              className="text-primary hover:text-primary/80"
            >
              View All →
            </Button>
          </div>
          {userReviews.slice(0, 3).map((review) => (
            <Card key={review.id} className="p-6 bg-card border-border">
              <div className="flex gap-4">
                <div 
                  className="flex-shrink-0 cursor-pointer"
                  onClick={() => onOpenAlbum?.()}
                >
                  <img
                    src={review.albumCover}
                    alt={review.albumTitle}
                    className="w-24 h-24 rounded-lg object-cover"
                    onError={handleImageError}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-foreground">{review.albumTitle}</h4>
                      <p className="text-sm text-muted-foreground">{review.albumArtist}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-primary/20 px-3 py-1 rounded-full">
                      <Star className="w-4 h-4 text-primary fill-primary" />
                      <span className="text-foreground">{review.rating}</span>
                    </div>
                  </div>
                  <p className="text-foreground mb-3">{review.content}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <button className="flex items-center gap-1 hover:text-primary transition">
                      <Heart className="w-4 h-4" />
                      {review.likes}
                    </button>
                    <button className="flex items-center gap-1 hover:text-primary transition">
                      <MessageCircle className="w-4 h-4" />
                      {review.comments}
                    </button>
                    <span>{review.timestamp}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Lists Tab */}
        <TabsContent value="lists" className="space-y-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">Showing {Math.min(3, userLists.length)} of {userLists.length} lists</p>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onNavigate?.("your-space")}
              className="text-primary hover:text-primary/80"
            >
              View All →
            </Button>
          </div>
          {userLists.length === 0 ? (
            <Card className="p-6 bg-card border-border">
              <p className="text-muted-foreground text-center">No lists yet. Create your first list!</p>
            </Card>
          ) : (
            userLists.slice(0, 3).map((list) => (
              <Card key={list.id} className="p-6 bg-card border-border hover:border-primary/50 transition cursor-pointer">
                <div className="flex gap-4">
                  <div className="grid grid-cols-2 gap-1 w-24 h-24">
                    {(list.coverImages || []).slice(0, 4).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt=""
                        className="w-full h-full object-cover rounded"
                      />
                    ))}
                    {(!list.coverImages || list.coverImages.length === 0) && (
                      <div className="w-full h-full bg-primary/20 rounded flex items-center justify-center col-span-2 row-span-2">
                        <ListMusic className="w-8 h-8 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-foreground mb-1">{list.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{list.description}</p>
                    <p className="text-sm text-primary">{list.albumCount} albums{list.songCount ? `, ${list.songCount} songs` : ''}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}