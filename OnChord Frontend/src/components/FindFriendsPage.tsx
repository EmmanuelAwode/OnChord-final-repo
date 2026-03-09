import { useState, useEffect } from "react";
import { Search, UserPlus, UserMinus, Music2, Users, Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { motion } from "motion/react";
import { useProfileSearch } from "../lib/useProfile";
import { followUser, unfollowUser, isFollowing, getFollowers } from "../lib/api/follows";
import { getProfiles, type Profile } from "../lib/api/profiles";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";

interface FindFriendsPageProps {
  onNavigate: (page: string) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function FindFriendsPage({ onNavigate, onBack, canGoBack }: FindFriendsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [followingState, setFollowingState] = useState<Record<string, boolean>>({});
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);
  const [followBackUsers, setFollowBackUsers] = useState<Profile[]>([]);
  const [followerIdSet, setFollowerIdSet] = useState<Set<string>>(new Set());
  const [isLoadingTabs, setIsLoadingTabs] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const { profiles: searchResults, isLoading: isSearching } = useProfileSearch(searchQuery);

  // Get current user ID and load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Check follow status for search results
  useEffect(() => {
    async function checkSearchFollowStatus() {
      if (searchResults.length === 0) return;
      
      const unknownUsers = searchResults.filter(u => followingState[u.id] === undefined);
      if (unknownUsers.length === 0) return;

      const statuses = await Promise.all(
        unknownUsers.map(async (profile) => ({
          id: profile.id,
          following: await isFollowing(profile.id)
        }))
      );

      setFollowingState(prev => {
        const updated = { ...prev };
        statuses.forEach(({ id, following }) => {
          updated[id] = following;
        });
        return updated;
      });
    }

    checkSearchFollowStatus();
  }, [searchResults]);

  async function loadInitialData() {
    setIsLoadingTabs(true);
    try {
      // Get current user
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      
      const userId = session.session.user.id;
      setCurrentUserId(userId);

      // Get followers (people who follow current user)
      const followerIds = await getFollowers();
      setFollowerIdSet(new Set(followerIds));
      
      // Get profiles for followers
      if (followerIds.length > 0) {
        const followerProfiles = await getProfiles(followerIds);
        
        // Check which ones the current user follows back
        const followingStatuses = await Promise.all(
          followerProfiles.map(async (profile) => ({
            id: profile.id,
            isFollowing: await isFollowing(profile.id)
          }))
        );

        // Update following state
        const newFollowingState: Record<string, boolean> = {};
        followingStatuses.forEach(({ id, isFollowing }) => {
          newFollowingState[id] = isFollowing;
        });
        setFollowingState(newFollowingState);

        // Users to follow back (followers that current user doesn't follow)
        const followBackProfiles = followerProfiles.filter(
          profile => !newFollowingState[profile.id]
        );
        setFollowBackUsers(followBackProfiles);
      }

      // For now, use all users as suggested (you can enhance this later with better recommendations)
      // Get all profiles from database (excluding current user)
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", userId)
        .limit(20);
      
      if (allProfiles) {
        setSuggestedUsers(allProfiles);
        
        // Check follow status for all users
        const allUserIds = [...new Set([
          ...allProfiles.map(p => p.id),
          ...(followerIds.length > 0 ? followerIds : [])
        ])];
        
        const allStatuses = await Promise.all(
          allUserIds
            .filter(id => followingState[id] === undefined)
            .map(async (id) => ({
              id,
              following: await isFollowing(id)
            }))
        );

        setFollowingState(prev => {
          const updated = { ...prev };
          allStatuses.forEach(({ id, following }) => {
            updated[id] = following;
          });
          return updated;
        });
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoadingTabs(false);
    }
  }

  async function handleToggleFollow(userId: string) {
    try {
      const isCurrentlyFollowing = followingState[userId];
      
      if (isCurrentlyFollowing) {
        await unfollowUser(userId);
        setFollowingState(prev => ({ ...prev, [userId]: false }));
        toast.success("Unfollowed user");
      } else {
        await followUser(userId);
        setFollowingState(prev => ({ ...prev, [userId]: true }));
        toast.success("Following user");
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status");
    }
  }

  const UserCard = ({ user }: { user: Profile }) => {
    const isFollowing = followingState[user.id];
    const isSelf = user.id === currentUserId;
    const followsYou = followerIdSet.has(user.id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-card to-card/50 rounded-xl p-4 border-2 border-primary/10 hover:border-primary/30 transition-all"
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <button
            onClick={() => onNavigate(`user-${user.id}`)}
            className="flex-shrink-0 group"
          >
            <div className="relative">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name || user.username || "User"}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
                  <span className="text-2xl text-primary">
                    {(user.display_name || user.username || "?")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-secondary to-secondary/80 rounded-full flex items-center justify-center">
                <Music2 className="w-3 h-3 text-white" />
              </div>
            </div>
          </button>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <button
              onClick={() => onNavigate(`user-${user.id}`)}
              className="text-left hover:text-primary transition-colors"
            >
              <h3 className="text-foreground truncate">
                {user.display_name || user.username || "Anonymous"}
              </h3>
              {user.username && (
                <p className="text-sm text-muted-foreground truncate">
                  @{user.username}
                </p>
              )}
            </button>
            {user.bio && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {user.bio}
              </p>
            )}
          </div>

          {/* Follow Button */}
          {!isSelf && (
            <Button
              onClick={() => handleToggleFollow(user.id)}
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              className="flex-shrink-0"
            >
              {isFollowing ? (
                <>
                  <UserMinus className="w-4 h-4 mr-1" />
                  Following
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
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen pb-8">
      <PageHeader
        title="Find Friends"
        subtitle="Connect with other music lovers"
        onBack={onBack}
        canGoBack={canGoBack}
      />

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, username, or interests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-card border-2 border-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Tabs */}
      {!searchQuery ? (
        <Tabs defaultValue="suggested" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="suggested" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Suggested</span>
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">All Users</span>
            </TabsTrigger>
            <TabsTrigger value="follow-back" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Follow Back</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggested" className="space-y-4">
            <div className="mb-4">
              <h3 className="text-muted-foreground mb-2">Discover new users</h3>
            </div>
            {isLoadingTabs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : suggestedUsers.length > 0 ? (
              suggestedUsers
                .filter(u => u.id !== currentUserId && !followingState[u.id])
                .map(user => (
                  <UserCard key={user.id} user={user} />
                ))
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No suggestions available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trending" className="space-y-4">
            <div className="mb-4">
              <h3 className="text-muted-foreground mb-2">All users on OnChord</h3>
            </div>
            {isLoadingTabs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : suggestedUsers.length > 0 ? (
              suggestedUsers
                .filter(u => u.id !== currentUserId)
                .map(user => (
                  <UserCard key={user.id} user={user} />
                ))
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No users found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="follow-back" className="space-y-4">
            <div className="mb-4">
              <h3 className="text-muted-foreground mb-2">Users who follow you</h3>
            </div>
            {isLoadingTabs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : followBackUsers.length > 0 ? (
              followBackUsers.map(user => (
                <UserCard key={user.id} user={user} />
              ))
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No users to follow back</p>
                <p className="text-sm text-muted-foreground mt-2">When someone follows you, they'll appear here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* Search Results */
        <div className="space-y-4">
          <div className="mb-4">
            <h3 className="text-muted-foreground">
              {isSearching ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </span>
              ) : (
                <>
                  {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} for "{searchQuery}"
                </>
              )}
            </h3>
          </div>
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : searchResults.length > 0 ? (
            searchResults
              .filter(u => u.id !== currentUserId)
              .map(user => (
                <UserCard key={user.id} user={user} />
              ))
          ) : (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found matching "{searchQuery}"</p>
              <p className="text-sm text-muted-foreground mt-2">Try searching by name or username</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}