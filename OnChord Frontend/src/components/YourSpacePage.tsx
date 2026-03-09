import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { handleImageError } from "./ui/utils";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { CommentsModal } from "./CommentsModal";
import { EditedIndicator } from "./EditedIndicator";
import { CreateListModal } from "./CreateListModal";
import { EditListModal } from "./EditListModal";
import { CollaborativePlaylistDetail } from "./CollaborativePlaylistDetail";
import { FavouritesPage } from "./FavouritesPage";
import { CollectionDetailPage } from "./CollectionDetailPage";
import { Star, Heart, MessageCircle, Edit, Music, ListMusic, Users, Settings, Plus, Globe, UserPlus, UserMinus, LogOut, ArrowLeft, Play, Lock, Users as UsersIcon } from "lucide-react";
import { useFollowing, useReviews } from "../lib/useUserInteractions";
import { useLists } from "../lib/ListsContext";
import { useTopArtists } from "../lib/useSpotify";
import { useProfile } from "../lib/useProfile";
import { getFollowerCount, getFollowingCount, getFollowers, getFollowing } from "../lib/api/follows";
import { getProfiles, type Profile } from "../lib/api/profiles";
import { toast } from "sonner@2.0.3";
import { AddToListDialog } from "./AddToListDialog";
import { supabase } from "../lib/supabaseClient";

interface YourSpacePageProps {
  onNavigate?: (page: string) => void;
  onOpenAlbum?: (albumId?: string) => void;
  darkMode?: boolean;
  onDarkModeChange?: (value: boolean) => void;
  accentColor?: string;
  onAccentColorChange?: (color: string) => void;
  initialTab?: string;
  onLogout?: () => void;
  onEditReview?: (review: any) => void;
}

export function YourSpacePage({ 
  onNavigate, 
  onOpenAlbum,
  darkMode,
  onDarkModeChange,
  accentColor,
  onAccentColorChange,
  initialTab = "profile",
  onLogout,
  onEditReview
}: YourSpacePageProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const { userReviews: savedReviews } = useReviews();
  const userReviews = savedReviews;
  const { toggleFollow, isFollowing } = useFollowing();
  const { profile, isLoading: profileLoading } = useProfile();
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followerProfiles, setFollowerProfiles] = useState<Profile[]>([]);
  const [followingProfiles, setFollowingProfiles] = useState<Profile[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  
  // Use real profile data if available, otherwise fall back to defaults
  const displayName = profile?.display_name || "Music Lover";
  const displayUsername = profile?.username ? `@${profile.username}` : "@user";
  const displayBio = profile?.bio || "No bio yet";
  const displayAvatar = profile?.avatar_url;
  
  // Collaborative playlists state (empty until real collab playlist system is implemented)
  const [collaborativePlaylists, setCollaborativePlaylists] = useState<any[]>([]);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  
  // Fetch top artists from Spotify
  const { artists: topArtists, loading: artistsLoading } = useTopArtists("medium_term", 10);
  
  // Compute top genres from top artists
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

  // Add to list state
  const { getListAlbums, createList, userListsMetadata, updateList, deleteList } = useLists();
  const [addToListOpen, setAddToListOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<{id: string; title: string} | null>(null);

  // Create list state
  const [createListModalOpen, setCreateListModalOpen] = useState(false);

  // Edit list state
  const [editListModalOpen, setEditListModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<{
    id: string;
    title: string;
    description: string;
    visibility: "public" | "private" | "friends";
    songs: any[];
  } | null>(null);

  // Selected list detail view state
  const [selectedListDetail, setSelectedListDetail] = useState<string | null>(null);

  // Selected playlist detail view state
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [playlistTracksState, setPlaylistTracksState] = useState<Record<string, any[]>>({});

  // Update active tab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Load follower/following counts and profiles
  useEffect(() => {
    async function loadCounts() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      setLoadingConnections(true);
      
      try {
        const [followers, following, followerIds, followingIds] = await Promise.all([
          getFollowerCount(session.session.user.id),
          getFollowingCount(session.session.user.id),
          getFollowers(),
          getFollowing(),
        ]);

        setFollowersCount(followers);
        setFollowingCount(following);

        // Load profiles for followers and following
        const [followerProfilesData, followingProfilesData] = await Promise.all([
          getProfiles(followerIds),
          getProfiles(followingIds),
        ]);

        setFollowerProfiles(followerProfilesData);
        setFollowingProfiles(followingProfilesData);
      } catch (error) {
        console.error('Error loading connections:', error);
      } finally {
        setLoadingConnections(false);
      }
    }

    loadCounts();
  }, []);

  const handleFollowToggle = (userId: string, userName: string) => {
    toggleFollow(userId);
    if (isFollowing(userId)) {
      toast.success(`Unfollowed ${userName}`);
      // Update local state
      setFollowingProfiles(prev => prev.filter(p => p.id !== userId));
      setFollowingCount(prev => prev - 1);
    } else {
      toast.success(`Following ${userName}`);
      setFollowingCount(prev => prev + 1);
    }
  };

  const handleAddTrackClick = () => {
    onNavigate?.("playlist");
  };

  const handleListClick = (listId: string) => {
    setSelectedListDetail(listId);
    setActiveTab("lists");
  };

  const handleBackToLists = () => {
    setSelectedListDetail(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2">Your Space</h1>
        <p className="text-muted-foreground">
          Manage your profile, lists, playlists, and connections
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border w-full grid grid-cols-3 md:grid-cols-6 h-auto p-1">
          <TabsTrigger 
            value="profile" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2"
          >
            <Star className="w-4 h-4" />
            <span className="text-xs md:text-sm">Profile</span>
          </TabsTrigger>
          <TabsTrigger 
            value="favourites" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2"
          >
            <Heart className="w-4 h-4" />
            <span className="text-xs md:text-sm">Favourites</span>
          </TabsTrigger>
          <TabsTrigger 
            value="lists" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2"
          >
            <ListMusic className="w-4 h-4" />
            <span className="text-xs md:text-sm">Lists</span>
          </TabsTrigger>
          <TabsTrigger 
            value="followers" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2"
          >
            <Users className="w-4 h-4" />
            <span className="text-xs md:text-sm">Followers</span>
          </TabsTrigger>
          <TabsTrigger 
            value="playlist" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2"
          >
            <Music className="w-4 h-4" />
            <span className="text-xs md:text-sm">Collab</span>
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2"
          >
            <Settings className="w-4 h-4" />
            <span className="text-xs md:text-sm">Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          {/* Profile Header */}
          <Card className="p-6 bg-card border-border">
            <div className="flex flex-col md:flex-row gap-6">
              {displayAvatar ? (
                <img 
                  src={displayAvatar} 
                  alt={displayName}
                  className="w-24 h-24 rounded-full object-cover flex-shrink-0"
                  onError={handleImageError}
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
                    Edit
                  </Button>
                </div>
                <p className="text-foreground mb-4">{displayBio}</p>
              </div>
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                key: 'playlists-stat',
                tab: 'playlist',
                icon: Music,
                value: collaborativePlaylists.length,
                label: 'Playlists',
                color: 'primary'
              },
              {
                key: 'lists-stat',
                tab: 'lists',
                icon: ListMusic,
                value: 18,
                label: 'Lists',
                color: 'secondary'
              },
              {
                key: 'followers-stat',
                tab: 'followers',
                icon: Users,
                value: followersCount,
                label: 'Followers',
                color: 'chart-3'
              }
            ].map((stat) => {
              const Icon = stat.icon;
              const borderClass = stat.color === 'primary' ? 'border-primary/30 hover:border-primary/50 hover:shadow-glow-primary' : 
                                  stat.color === 'secondary' ? 'border-secondary/30 hover:border-secondary/50 hover:shadow-glow-secondary' :
                                  'border-chart-3/30 hover:border-chart-3/50 hover:shadow-medium';
              const bgClass = stat.color === 'primary' ? 'bg-primary/10 group-hover:bg-primary/20' :
                              stat.color === 'secondary' ? 'bg-secondary/10 group-hover:bg-secondary/20' :
                              'bg-chart-3/10 group-hover:bg-chart-3/20';
              const textClass = stat.color === 'primary' ? 'text-primary' :
                                stat.color === 'secondary' ? 'text-secondary' :
                                'text-chart-3';
              const hoverTextClass = stat.color === 'primary' ? 'group-hover:text-primary' :
                                     stat.color === 'secondary' ? 'group-hover:text-secondary' :
                                     'group-hover:text-chart-3';
              
              return (
                <Card 
                  key={stat.key}
                  onClick={() => setActiveTab(stat.tab as any)}
                  className={`p-6 bg-card ${borderClass} transition-all cursor-pointer group text-center`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg ${bgClass} flex items-center justify-center group-hover:scale-110 transition-all`}>
                      <Icon className={`w-6 h-6 ${textClass}`} />
                    </div>
                    <div>
                      <p className={`text-3xl text-foreground mb-1 ${hoverTextClass} transition`}>{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Listening Summary */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-foreground mb-4">Listening Summary</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Top Genres</p>
                <div className="flex flex-wrap gap-2">
                  {artistsLoading ? (
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  ) : topGenres.length > 0 ? (
                    topGenres.map((genre) => (
                      <Badge key={genre} variant="secondary" className="bg-primary/20 text-primary border-0">
                        {genre}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Connect Spotify to see your top genres</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Top Artists</p>
                <div className="flex flex-wrap gap-2">
                  {artistsLoading ? (
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  ) : topArtists.length > 0 ? (
                    topArtists.map((artist) => (
                      <Badge key={artist.id} variant="secondary" className="bg-secondary/20 text-secondary border-0">
                        {artist.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Connect Spotify to see your top artists</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Favourites Tab */}
        <TabsContent value="favourites" className="space-y-6 mt-6">
          <FavouritesPage onOpenAlbum={onOpenAlbum} />
        </TabsContent>

        {/* Lists Tab */}
        <TabsContent value="lists" className="space-y-6 mt-6">
          {selectedListDetail ? (
            /* List Detail View */
            <CollectionDetailPage
              listId={selectedListDetail}
              onNavigate={onNavigate}
              onOpenAlbum={onOpenAlbum}
              onBack={handleBackToLists}
              canGoBack={true}
            />
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card key="total-lists-stat" className="p-4 bg-card border-border text-center">
              <p className="text-2xl text-primary mb-1">{Object.keys(userListsMetadata).length}</p>
              <p className="text-sm text-muted-foreground">Total Lists</p>
            </Card>
            <Card key="total-albums-stat" className="p-4 bg-card border-border text-center">
              <p className="text-2xl text-secondary mb-1">
                {Object.values(userListsMetadata).reduce((acc, list) => acc + list.albumCount, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Albums</p>
            </Card>
            <Card key="avg-per-list-stat" className="p-4 bg-card border-border text-center col-span-2 md:col-span-1">
              <p className="text-2xl text-accent mb-1">
                {Object.keys(userListsMetadata).length > 0 
                  ? Math.round(Object.values(userListsMetadata).reduce((acc, list) => acc + list.albumCount, 0) / Object.keys(userListsMetadata).length)
                  : 0}
              </p>
              <p className="text-sm text-muted-foreground">Avg per List</p>
            </Card>
          </div>

          {/* Lists Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* User-created lists first */}
            {Object.values(userListsMetadata).map((list) => {
              const visibilityIcon = list.visibility === "private" ? Lock : list.visibility === "friends" ? UsersIcon : Globe;
              const VisIcon = visibilityIcon;
              return (
                <Card 
                  key={list.id}
                  onClick={() => handleListClick(list.id)}
                  className="p-6 bg-card border-border hover:border-primary/50 transition-all cursor-pointer group shadow-soft hover:shadow-medium"
                >
                  {/* List Cover Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-4 rounded-lg overflow-hidden">
                    {list.coverImages.slice(0, 4).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt=""
                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                        onError={handleImageError}
                      />
                    ))}
                  </div>

                  {/* List Info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-foreground group-hover:text-primary transition">
                        {list.title}
                      </h3>
                      <Badge variant="outline" className="border-primary/30 text-primary flex-shrink-0 text-xs">
                        <VisIcon className="w-3 h-3 mr-1" />
                        {list.visibility === "private" ? "Private" : list.visibility === "friends" ? "Friends" : "Public"}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {list.description || "No description"}
                    </p>
                    
                    <div className="flex items-center gap-2 pt-2">
                      <Music className="w-4 h-4 text-primary" />
                      <span className="text-sm text-primary">{list.albumCount} albums</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 border-border hover:border-primary hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingList({
                          id: list.id,
                          title: list.title,
                          description: list.description || "",
                          visibility: list.visibility,
                          songs: list.songs || []
                        });
                        setEditListModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleListClick(list.id);
                      }}
                    >
                      View
                    </Button>
                  </div>
                </Card>
              );  
            })
            }

            {/* Empty state when no lists */}
            {Object.keys(userListsMetadata).length === 0 && (
              <div className="col-span-2 text-center py-8">
                <ListMusic className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No lists yet. Create your first list!</p>
              </div>
            )}
          </div>

              <Button 
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md"
                onClick={() => setCreateListModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New List
              </Button>
            </>
          )}
        </TabsContent>

        {/* Followers Tab */}
        <TabsContent value="followers" className="space-y-6 mt-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card key="followers-count-stat" className="p-4 bg-card border-border text-center">
              <p className="text-2xl text-chart-3 mb-1">{followersCount}</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </Card>
            <Card key="following-count-stat" className="p-4 bg-card border-border text-center">
              <p className="text-2xl text-primary mb-1">{followingCount}</p>
              <p className="text-sm text-muted-foreground">Following</p>
            </Card>
          </div>

          {/* Find Friends Button */}
          <Button 
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md"
            onClick={() => onNavigate?.("find-friends")}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Find Friends
          </Button>

          {/* Tabs for Followers/Following */}
          <Card className="p-6 bg-card border-border">
            {loadingConnections ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading connections...</p>
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="bg-background border border-border w-full grid grid-cols-3 mb-6">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="followers">Followers</TabsTrigger>
                  <TabsTrigger value="following">Following</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-3">
                  {/* Combine both followers and following, removing duplicates */}
                  {(() => {
                    const allConnectionIds = new Set([
                      ...followerProfiles.map(p => p.id),
                      ...followingProfiles.map(p => p.id),
                    ]);
                    const allConnections = Array.from(allConnectionIds).map(id => {
                      const profile = followerProfiles.find(p => p.id === id) || followingProfiles.find(p => p.id === id);
                      return profile!;
                    });

                    if (allConnections.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No connections yet</p>
                        </div>
                      );
                    }

                    return allConnections.map((connection) => {
                      const followsYou = followerProfiles.some(p => p.id === connection.id);
                      
                      return (
                        <div 
                          key={connection.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-background hover:bg-muted/20 transition-all group cursor-pointer"
                        >
                          <div 
                            className="flex items-center gap-3 flex-1 min-w-0"
                            onClick={() => onNavigate?.(`user-${connection.id}`)}
                          >
                            {connection.avatar_url ? (
                              <img 
                                src={connection.avatar_url} 
                                alt={connection.display_name || 'User'}
                                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                onError={handleImageError}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm text-primary">
                                  {(connection.display_name || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-foreground truncate">{connection.display_name || 'Anonymous'}</h4>
                                {followsYou && (
                                  <Badge variant="outline" className="border-secondary/50 text-secondary text-xs flex-shrink-0">
                                    Follows you
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">@{connection.username}</p>
                              {connection.bio && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{connection.bio}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={isFollowing(connection.id) ? "outline" : "default"}
                            className={
                              isFollowing(connection.id)
                                ? "border-border hover:border-destructive hover:text-destructive flex-shrink-0"
                                : "bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
                            }
                            onClick={() => handleFollowToggle(connection.id, connection.display_name || 'User')}
                          >
                            {isFollowing(connection.id) ? (
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
                        </div>
                      );
                    });
                  })()}
                </TabsContent>

                <TabsContent value="followers" className="space-y-3">
                  {followerProfiles.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No followers yet</p>
                    </div>
                  ) : (
                    followerProfiles.map((connection) => (
                      <div 
                        key={connection.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-background hover:bg-muted/20 transition-all group cursor-pointer"
                      >
                        <div 
                          className="flex items-center gap-3 flex-1 min-w-0"
                          onClick={() => onNavigate?.(`user-${connection.id}`)}
                        >
                          {connection.avatar_url ? (
                            <img 
                              src={connection.avatar_url} 
                              alt={connection.display_name || 'User'}
                              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                              onError={handleImageError}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm text-primary">
                                {(connection.display_name || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-foreground truncate">{connection.display_name || 'Anonymous'}</h4>
                            <p className="text-sm text-muted-foreground truncate">@{connection.username}</p>
                            {connection.bio && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{connection.bio}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isFollowing(connection.id) ? "outline" : "default"}
                          className={
                            isFollowing(connection.id)
                              ? "border-border hover:border-destructive hover:text-destructive flex-shrink-0"
                              : "bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
                          }
                          onClick={() => handleFollowToggle(connection.id, connection.display_name || 'User')}
                        >
                          {isFollowing(connection.id) ? (
                            <>
                              <UserMinus className="w-4 h-4 mr-1" />
                              Unfollow
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-1" />
                              Follow Back
                            </>
                          )}
                        </Button>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="following" className="space-y-3">
                  {followingProfiles.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Not following anyone yet</p>
                    </div>
                  ) : (
                    followingProfiles.map((connection) => {
                      const followsYou = followerProfiles.some(p => p.id === connection.id);
                      
                      return (
                        <div 
                          key={connection.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-background hover:bg-muted/20 transition-all group cursor-pointer"
                        >
                          <div 
                            className="flex items-center gap-3 flex-1 min-w-0"
                            onClick={() => onNavigate?.(`user-${connection.id}`)}
                          >
                            {connection.avatar_url ? (
                              <img 
                                src={connection.avatar_url} 
                                alt={connection.display_name || 'User'}
                                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                onError={handleImageError}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm text-primary">
                                  {(connection.display_name || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-foreground truncate">{connection.display_name || 'Anonymous'}</h4>
                                {followsYou && (
                                  <Badge variant="outline" className="border-secondary/50 text-secondary text-xs flex-shrink-0">
                                    Follows you
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">@{connection.username}</p>
                              {connection.bio && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{connection.bio}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border hover:border-destructive hover:text-destructive flex-shrink-0"
                            onClick={() => handleFollowToggle(connection.id, connection.display_name || 'User')}
                          >
                            <UserMinus className="w-4 h-4 mr-1" />
                            Unfollow
                          </Button>
                        </div>
                      );
                    })
                  )}
                </TabsContent>
              </Tabs>
            )}
          </Card>
        </TabsContent>

        {/* Collaborative Playlists Tab */}
        <TabsContent value="playlist" className="space-y-6 mt-6">
          {selectedPlaylistId ? (
            /* Playlist Detail View */
            <CollaborativePlaylistDetail
              playlist={collaborativePlaylists.find(p => p.id === selectedPlaylistId)!}
              tracks={playlistTracksState[selectedPlaylistId] || []}
              onBack={() => setSelectedPlaylistId(null)}
              onAddTrack={(track) => {
                setPlaylistTracksState(prev => ({
                  ...prev,
                  [selectedPlaylistId]: [track, ...(prev[selectedPlaylistId] || [])],
                }));
              }}
              onRemoveTrack={(trackId) => {
                setPlaylistTracksState(prev => ({
                  ...prev,
                  [selectedPlaylistId]: (prev[selectedPlaylistId] || []).filter(t => t.id !== trackId),
                }));
              }}
            />
          ) : (
            /* Playlist Grid View */
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card key="playlists-count-stat" className="p-4 bg-card border-border text-center">
                  <p className="text-2xl text-primary mb-1">{collaborativePlaylists.length}</p>
                  <p className="text-sm text-muted-foreground">Playlists</p>
                </Card>
                <Card key="total-tracks-stat" className="p-4 bg-card border-border text-center">
                  <p className="text-2xl text-secondary mb-1">
                    {collaborativePlaylists.reduce((sum, p) => sum + p.trackCount, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Tracks</p>
                </Card>
                <Card key="collaborators-stat" className="p-4 bg-card border-border text-center col-span-2 md:col-span-1">
                  <p className="text-2xl text-accent mb-1">
                    {new Set(collaborativePlaylists.flatMap(p => p.contributors.map(c => c.id))).size}
                  </p>
                  <p className="text-sm text-muted-foreground">Collaborators</p>
                </Card>
              </div>

              {/* Playlists Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {collaborativePlaylists.length === 0 ? (
                  <div className="col-span-2 text-center py-8">
                    <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">No collaborative playlists yet</p>
                    <p className="text-sm text-muted-foreground">Create one to start collaborating with friends!</p>
                  </div>
                ) : (
                  collaborativePlaylists.map((playlist) => (
                  <Card
                    key={playlist.id}
                    className="group bg-card border-border hover:border-primary/50 transition-all shadow-soft hover:shadow-medium overflow-hidden"
                  >
                    <div 
                      className="flex gap-4 p-5 cursor-pointer" 
                      onClick={() => setSelectedPlaylistId(playlist.id)}
                    >
                      {/* Playlist Cover */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={playlist.cover}
                          alt={playlist.title}
                          className="w-24 h-24 rounded-lg object-cover shadow-md group-hover:scale-105 transition-transform"
                          onError={handleImageError}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg" />
                        <div className="absolute bottom-1 left-1 right-1">
                          <Badge className="bg-primary/90 text-white border-0 text-xs w-full justify-center">
                            {playlist.trackCount} tracks
                          </Badge>
                        </div>
                      </div>

                      {/* Playlist Info */}
                      <div className="flex-1 space-y-2">
                        <div>
                          <h3 className="text-foreground mb-1 group-hover:text-primary transition-colors">
                            {playlist.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {playlist.description}
                          </p>
                        </div>

                        {/* Moods */}
                        <div className="flex flex-wrap gap-1.5">
                          {playlist.moods.slice(0, 2).map((mood) => (
                            <Badge
                              key={mood}
                              variant="outline"
                              className="text-xs border-primary/30 text-primary"
                            >
                              {mood}
                            </Badge>
                          ))}
                        </div>

                        {/* Contributors */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {playlist.contributors.length} collaborators
                            </span>
                          </div>
                          <div className="flex -space-x-2">
                            {playlist.contributors.slice(0, 3).map((contributor) => (
                              <div
                                key={contributor.id}
                                className="w-7 h-7 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center"
                                title={contributor.name}
                              >
                                <span className="text-xs text-primary">
                                  {contributor.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            ))}
                            {playlist.contributors.length > 3 && (
                              <div className="w-7 h-7 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center">
                                <span className="text-xs text-primary">
                                  +{playlist.contributors.length - 3}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Updated {playlist.lastUpdated}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 px-5 pb-5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-border hover:border-primary hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlaylistId(playlist.id);
                        }}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlaylistId(playlist.id);
                        }}
                      >
                        <Music className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </Card>
                ))
                )}
              </div>

              <Button
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-md"
                onClick={handleAddTrackClick}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Collaborative Playlist
              </Button>
            </>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          <Card className="p-6 bg-card border-border">
            <h3 className="text-foreground mb-4">Quick Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Toggle dark theme</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => onDarkModeChange?.(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-switch-background peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-foreground mb-3">Accent Color</p>
                <div className="flex gap-3">
                  {["purple", "blue", "pink", "green", "orange"].map((color) => (
                    <button
                      key={color}
                      onClick={() => onAccentColorChange?.(color)}
                      className={`w-10 h-10 rounded-full transition-all ${
                        accentColor === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                      }`}
                      style={{
                        backgroundColor: {
                          purple: "#A855F7",
                          blue: "#3B82F6",
                          pink: "#EC4899",
                          green: "#10B981",
                          orange: "#F59E0B",
                        }[color],
                      }}
                      aria-label={`Select ${color} accent color`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            <Button 
              variant="outline" 
              className="w-full border-border hover:border-primary hover:text-primary"
              onClick={() => onNavigate?.("settings")}
            >
              View All Settings
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Comments Modal */}
      {selectedReview && (
        <CommentsModal
          isOpen={commentsModalOpen}
          onClose={() => {
            setCommentsModalOpen(false);
            setSelectedReview(null);
          }}
          review={selectedReview}
        />
      )}

      {/* Add to List Dialog */}
      {addToListOpen && selectedList && (
        <AddToListDialog
          isOpen={addToListOpen}
          onClose={() => {
            setAddToListOpen(false);
            setSelectedList(null);
          }}
          listId={selectedList.id}
          listTitle={selectedList.title}
        />
      )}

      {/* Create List Modal */}
      {createListModalOpen && (
        <CreateListModal
          isOpen={createListModalOpen}
          onClose={() => setCreateListModalOpen(false)}
          onCreateList={async (listData) => {
            // Create list - albums can be added later through the list detail view
            try {
              await createList({
                title: listData.title,
                description: listData.description,
                visibility: listData.visibility,
                albums: [],
              });
            } catch (error) {
              console.error("Error creating list:", error);
            }
          }}
        />
      )}

      {/* Edit List Modal */}
      {editListModalOpen && editingList && (
        <EditListModal
          isOpen={editListModalOpen}
          onClose={() => {
            setEditListModalOpen(false);
            setEditingList(null);
          }}
          listId={editingList.id}
          initialTitle={editingList.title}
          initialDescription={editingList.description}
          initialVisibility={editingList.visibility}
          initialSongs={editingList.songs}
          onDeleteList={async () => {
            try {
              await deleteList(editingList.id);
              setEditListModalOpen(false);
              setEditingList(null);
            } catch (error) {
              console.error("Error deleting list:", error);
            }
          }}
          onUpdateList={async (listData) => {
            // Update list metadata
            try {
              await updateList({
                id: editingList.id,
                title: listData.title,
                description: listData.description,
                visibility: listData.visibility,
                albums: [],
                songs: listData.songs || [],
              });
            } catch (error) {
              console.error("Error updating list:", error);
            }
          }}
        />
      )}
    </div>
  );
}