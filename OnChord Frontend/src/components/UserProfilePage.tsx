import { Card } from "./ui/card";
import { handleImageError } from "./ui/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Star, Heart, MessageCircle, UserPlus, UserMinus, Users, Music2 } from "lucide-react";
import { useState, useEffect } from "react";
import { BackButton } from "./BackButton";
import { useProfileById } from "../lib/useProfile";
import { getFollowerCount, getFollowingCount, followUser, unfollowUser, isFollowing as checkIsFollowing, getFollowers, getFollowing } from "../lib/api/follows";
import { getProfiles, type Profile } from "../lib/api/profiles";
import { getUserReviews } from "../lib/api/reviews";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";
import { motion } from "motion/react";

interface UserProfilePageProps {
  userId: string;
  onNavigate?: (page: string) => void;
  onOpenAlbum?: (albumData?: any) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function UserProfilePage({ userId, onNavigate, onOpenAlbum, onBack, canGoBack }: UserProfilePageProps) {
  const { profile, isLoading } = useProfileById(userId);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isCurrentlyFollowing, setIsCurrentlyFollowing] = useState(false);
  const [followsYou, setFollowsYou] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("reviews");
  const [followerProfiles, setFollowerProfiles] = useState<Profile[]>([]);
  const [followingProfiles, setFollowingProfiles] = useState<Profile[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Load everything about this user
  useEffect(() => {
    async function loadUserData() {
      try {
        // Check current user
        const { data: session } = await supabase.auth.getSession();
        const myId = session?.session?.user?.id || null;
        setCurrentUserId(myId);
        setIsOwnProfile(myId === userId);

        // Load counts
        const [followers, following] = await Promise.all([
          getFollowerCount(userId),
          getFollowingCount(userId),
        ]);
        setFollowersCount(followers);
        setFollowingCount(following);

        // Check follow relationship
        if (myId && myId !== userId) {
          const [iFollow, theyFollowMe] = await Promise.all([
            checkIsFollowing(userId),
            // Check if this user follows the current user
            (async () => {
              const { data } = await supabase
                .from("follows")
                .select("id")
                .eq("follower_id", userId)
                .eq("following_id", myId)
                .maybeSingle();
              return !!data;
            })(),
          ]);
          setIsCurrentlyFollowing(iFollow);
          setFollowsYou(theyFollowMe);
        }

        // Load follower/following profiles for this user
        setLoadingConnections(true);
        const [followerData, followingData] = await Promise.all([
          // Get followers of this user
          (async () => {
            const { data } = await supabase
              .from("follows")
              .select("follower_id")
              .eq("following_id", userId);
            return data?.map(f => f.follower_id) || [];
          })(),
          // Get who this user follows
          (async () => {
            const { data } = await supabase
              .from("follows")
              .select("following_id")
              .eq("follower_id", userId);
            return data?.map(f => f.following_id) || [];
          })(),
        ]);

        const [fProfiles, fgProfiles] = await Promise.all([
          getProfiles(followerData),
          getProfiles(followingData),
        ]);
        setFollowerProfiles(fProfiles);
        setFollowingProfiles(fgProfiles);

        // Load user's public reviews
        setLoadingReviews(true);
        try {
          const reviews = await getUserReviews(userId);
          setUserReviews(reviews);
        } catch (err) {
          console.error("Error loading user reviews:", err);
        } finally {
          setLoadingReviews(false);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setLoadingConnections(false);
      }
    }

    loadUserData();
  }, [userId]);

  async function handleToggleFollow() {
    setFollowLoading(true);
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(userId);
        setIsCurrentlyFollowing(false);
        setFollowersCount(prev => prev - 1);
        toast.success(`Unfollowed ${profile?.display_name || "user"}`);
      } else {
        await followUser(userId);
        setIsCurrentlyFollowing(true);
        setFollowersCount(prev => prev + 1);
        toast.success(`Following ${profile?.display_name || "user"}`);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
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

  if (!profile) {
    return (
      <div className="space-y-6 animate-fade-in">
        {canGoBack && <BackButton onClick={onBack || (() => onNavigate?.("home"))} label="Back" />}
        <Card className="p-8 bg-card border-border text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl text-foreground mb-2">User Not Found</h2>
          <p className="text-muted-foreground">This profile doesn't exist or has been removed.</p>
        </Card>
      </div>
    );
  }

  const displayName = profile.display_name || profile.username || "Anonymous";
  const displayUsername = profile.username ? `@${profile.username}` : "";
  const displayBio = profile.bio || "";
  const displayAvatar = profile.avatar_url;

  return (
    <div className="space-y-6 animate-fade-in">
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
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-primary text-4xl font-medium">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-2xl text-foreground">{displayName}</h2>
                {displayUsername && (
                  <p className="text-muted-foreground">{displayUsername}</p>
                )}
                {followsYou && !isOwnProfile && (
                  <Badge variant="outline" className="border-secondary/50 text-secondary text-xs mt-1">
                    Follows you
                  </Badge>
                )}
              </div>

              {/* Follow/Edit Button */}
              {isOwnProfile ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border hover:border-primary hover:text-primary"
                  onClick={() => onNavigate?.("edit-profile")}
                >
                  Edit Profile
                </Button>
              ) : (
                <Button
                  onClick={handleToggleFollow}
                  variant={isCurrentlyFollowing ? "outline" : "default"}
                  size="sm"
                  className="flex-shrink-0"
                  disabled={followLoading}
                >
                  {isCurrentlyFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4 mr-1" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1" />
                      {followsYou ? "Follow Back" : "Follow"}
                    </>
                  )}
                </Button>
              )}
            </div>

            {displayBio && (
              <p className="text-foreground mb-4">{displayBio}</p>
            )}

            <div className="flex gap-6">
              <div>
                <p className="text-foreground">{followersCount}</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
              <div>
                <p className="text-foreground">{followingCount}</p>
                <p className="text-sm text-muted-foreground">Following</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Connections & Reviews */}
      <Card className="p-6 bg-card border-border">
        {loadingConnections ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="reviews" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Reviews ({userReviews.length})
              </TabsTrigger>
              <TabsTrigger value="followers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Followers ({followerProfiles.length})
              </TabsTrigger>
              <TabsTrigger value="following" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Following ({followingProfiles.length})
              </TabsTrigger>
            </TabsList>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-3">
              {loadingReviews ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : userReviews.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No reviews yet</p>
                </div>
              ) : (
                userReviews.map((review: any) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-background hover:bg-muted/20 transition-all cursor-pointer"
                    onClick={() => onOpenAlbum?.({
                      albumId: review.albumId,
                      albumTitle: review.albumTitle,
                      albumArtist: review.albumArtist,
                      albumCover: review.albumCover,
                      albumUrl: review.albumUrl,
                      spotifyUrl: review.spotifyUrl,
                      previewUrl: review.previewUrl,
                      rating: review.rating,
                      year: review.date?.slice(0, 4),
                    })}
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {review.albumCover ? (
                          <img
                            src={review.albumCover}
                            alt={review.albumTitle}
                            className="w-16 h-16 rounded-lg object-cover"
                            onError={handleImageError}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Music2 className="w-6 h-6 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <h4 className="text-foreground truncate text-sm">{review.albumTitle}</h4>
                            <p className="text-xs text-muted-foreground truncate">{review.albumArtist}</p>
                          </div>
                          <div className="flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full flex-shrink-0">
                            <Star className="w-3 h-3 text-primary fill-primary" />
                            <span className="text-xs text-foreground">{review.rating}</span>
                          </div>
                        </div>
                        {review.content && (
                          <p className="text-foreground text-xs line-clamp-2 mt-1">{review.content}</p>
                        )}
                        {review.tags && review.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {review.tags.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} className="bg-secondary/10 text-secondary border-0 text-[10px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-2">{review.timestamp}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </TabsContent>

            <TabsContent value="followers" className="space-y-3">
              {followerProfiles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No followers yet</p>
                </div>
              ) : (
                followerProfiles.map((user) => (
                  <ConnectionCard
                    key={user.id}
                    user={user}
                    isSelf={user.id === currentUserId}
                    onNavigate={onNavigate}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="following" className="space-y-3">
              {followingProfiles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Not following anyone yet</p>
                </div>
              ) : (
                followingProfiles.map((user) => (
                  <ConnectionCard
                    key={user.id}
                    user={user}
                    isSelf={user.id === currentUserId}
                    onNavigate={onNavigate}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </Card>
    </div>
  );
}

/** Small user card used in the followers/following lists */
function ConnectionCard({ user, isSelf, onNavigate }: { user: Profile; isSelf: boolean; onNavigate?: (page: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-muted/20 transition-all cursor-pointer"
      onClick={() => onNavigate?.(`user-${user.id}`)}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.display_name || "User"}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm text-primary">
              {(user.display_name || "U").charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-foreground truncate text-sm">
            {user.display_name || "Anonymous"}
          </h4>
          {user.username && (
            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
          )}
        </div>
      </div>
      {isSelf && (
        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
          You
        </Badge>
      )}
    </motion.div>
  );
}
