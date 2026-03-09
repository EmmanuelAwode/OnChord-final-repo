import { Heart, MessageCircle, Share2, TrendingUp, Clock, Calendar, Star, Music2, Headphones, Users, Info, Edit3, Search, Plus, Sparkles, Flame, MapPin, Play, Disc3, UserPlus, Trash2, Activity } from "lucide-react";
import { EditedIndicator } from "./EditedIndicator";
import { ReviewDetailModal } from "./ReviewDetailModal";
import { EmptyState } from "./EmptyState";
import { ExpandableReviewCard } from "./ExpandableReviewCard";
import { CommentsModal } from "./CommentsModal";
import ActivityFeed from "./ActivityFeed";
import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { PreviewButton } from "./SongPreviewPlayer";
import { handleImageError } from "./ui/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useLikes, useReviews } from "../lib/useUserInteractions";
import { useLists } from "../lib/ListsContext";
import { getFollowerCount } from "../lib/api/follows";
import { searchAlbums, Album as SearchAlbum } from "../lib/api/musicSearch";
import { searchProfiles, Profile } from "../lib/api/profiles";
import { useSupabaseFollows } from "../lib/useSupabaseFollows";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";
import { getPublicReviews, getFriendsReviews } from "../lib/api/reviews";
import { getPersonalizedNewReleases, getPersonalizedConcerts, PersonalizedRelease, PersonalizedEvent } from "../lib/api/homeData";

// Simple Event Modal stub
function EventModal({ event, isOpen, onClose }: { event: any; isOpen: boolean; onClose: () => void }) {
  if (!isOpen || !event) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <Card className="max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl text-foreground mb-2">{event.artistName}</h3>
        <p className="text-muted-foreground mb-2">{event.venue}</p>
        <p className="text-muted-foreground mb-4">{event.city} • {event.date}</p>
        <Button onClick={onClose}>Close</Button>
      </Card>
    </div>
  );
}

interface HomePageProps {
  onNavigate?: (page: string) => void;
  username?: string;
  onOpenAlbum?: (albumData?: any) => void;
  onEditReview?: (review: any) => void;
  reviews?: any[];
  initialTab?: string;
}

export function HomePage({ onNavigate, username, onOpenAlbum, onEditReview, reviews: propReviews, initialTab }: HomePageProps = {}) {
  const { userReviews: savedReviews, deleteReview } = useReviews();
  const { userListsMetadata } = useLists();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchAlbumsResults, setSearchAlbumsResults] = useState<SearchAlbum[]>([]);
  const [searchUsersResults, setSearchUsersResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  // Restore tab from localStorage or use initialTab or default to "for-you"
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab) return initialTab;
    const savedTab = localStorage.getItem("onchord_home_tab");
    return savedTab || "for-you";
  });
  const [likedReviews, setLikedReviews] = useState<string[]>([]);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [reviewDetailModalOpen, setReviewDetailModalOpen] = useState(false);
  const [selectedReviewDetail, setSelectedReviewDetail] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [realDisplayName, setRealDisplayName] = useState<string | null>(null);
  const [publicReviewsList, setPublicReviewsList] = useState<any[]>([]);
  const [friendsReviewsList, setFriendsReviewsList] = useState<any[]>([]);
  const [personalizedReleases, setPersonalizedReleases] = useState<PersonalizedRelease[]>([]);
  const [personalizedConcerts, setPersonalizedConcerts] = useState<PersonalizedEvent[]>([]);
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [loadingConcerts, setLoadingConcerts] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  
  // Load current user ID and profile
  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id || null;
      setCurrentUserId(uid);
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", uid)
          .single();
        if (profile?.display_name) {
          setRealDisplayName(profile.display_name.split(' ')[0]);
        }
        // Load follower count
        const count = await getFollowerCount(uid);
        setFollowerCount(count);
      }
    }
    loadUser();
  }, []);

  // Load real public reviews and friends reviews
  useEffect(() => {
    async function loadFeed() {
      try {
        const [pubReviews, frReviews] = await Promise.all([
          getPublicReviews(20),
          getFriendsReviews()
        ]);
        setPublicReviewsList(pubReviews);
        setFriendsReviewsList(frReviews);
      } catch (err) {
        console.error("Failed to load feed reviews:", err);
      }
    }
    loadFeed();
  }, [savedReviews]); // Re-fetch when user creates/deletes a review

  // Load personalized releases and concerts
  useEffect(() => {
    async function loadPersonalizedData() {
      // Load releases
      setLoadingReleases(true);
      try {
        const releases = await getPersonalizedNewReleases(4);
        setPersonalizedReleases(releases);
      } catch (err) {
        console.error("Failed to load personalized releases:", err);
      } finally {
        setLoadingReleases(false);
      }

      // Load concerts
      setLoadingConcerts(true);
      try {
        const concerts = await getPersonalizedConcerts(4);
        setPersonalizedConcerts(concerts);
      } catch (err) {
        console.error("Failed to load personalized concerts:", err);
      } finally {
        setLoadingConcerts(false);
      }
    }
    loadPersonalizedData();
  }, [currentUserId]);

  const displayName = username || realDisplayName || "Music Lover";
  
  // Get user lists as array for display
  const userListsArray = Object.values(userListsMetadata);
  
  // My reviews: real DB reviews
  const myReviews = savedReviews;
  
  // Community: real public reviews from other users
  const communityReviews = publicReviewsList.filter(r => r.userId !== currentUserId);
  const feedReviews = communityReviews;

  const { toggleFollow, isFollowing, isLoading: isFollowsLoading } = useSupabaseFollows();
  const { toggleLike: toggleLikePersist, isLiked } = useLikes();

  const toggleLike = (reviewId: string) => {
    setLikedReviews(prev => 
      prev.includes(reviewId) 
        ? prev.filter(id => id !== reviewId)
        : [...prev, reviewId]
    );
    toggleLikePersist(reviewId);
  };

  const handleReviewClick = (review: any) => {
    setSelectedReviewDetail(review);
    setReviewDetailModalOpen(true);
  };

  const handleFollowToggle = async (userId: string, userName: string) => {
    try {
      await toggleFollow(userId);
      
      if (isFollowing(userId)) {
        toast.success(`Unfollowed ${userName}`);
      } else {
        toast.success(`Following ${userName}`);
      }
    } catch (error) {
      toast.error(`Failed to follow ${userName}`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, review: any) => {
    e.stopPropagation();
    setReviewToDelete(review);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (reviewToDelete) {
      deleteReview(reviewToDelete.id);
      toast.success("Review deleted successfully");
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
    }
  };

  const handleShare = (review: any) => {
    toast.success("Link copied to clipboard!", {
      description: `Share your review of ${review.albumTitle}`
    });
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Search with real APIs
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchAlbumsResults([]);
        setSearchUsersResults([]);
        return;
      }
      
      setSearchLoading(true);
      try {
        const [albumsResult, usersResult] = await Promise.all([
          searchAlbums(searchQuery, 8),
          searchProfiles(searchQuery, 10)
        ]);
        setSearchAlbumsResults(albumsResult);
        // Filter out current user from search results
        setSearchUsersResults(currentUserId 
          ? usersResult.filter(u => u.id !== currentUserId) 
          : usersResult
        );
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearchLoading(false);
      }
    };
    
    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, currentUserId]);

  // Filter reviews from public reviews
  const filteredReviews = searchQuery.trim() 
    ? publicReviewsList.filter(
        (review) =>
          review.albumTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          review.albumArtist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          review.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const hasSearchResults = searchQuery.trim() && (searchAlbumsResults.length > 0 || searchUsersResults.length > 0 || filteredReviews.length > 0);

  return (
    <div className="min-h-screen relative pb-12">
      {/* Hero Header Section */}
      <div className="mb-6 space-y-4 animate-fade-in">
        {/* Greeting & Stats */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl text-foreground mb-1">
              {getGreeting()}, {displayName}! 👋
            </h1>
            <p className="text-muted-foreground">Your musical journey continues</p>
          </div>
          
          {/* Personal Stats Cards */}
          <div className="grid grid-cols-3 gap-2 md:gap-3 w-full lg:w-auto">
            <Card 
              onClick={() => onNavigate?.('your-space-reviews')}
              className="p-3 md:p-4 text-center border-border hover:border-primary hover:shadow-glow-primary transition-all cursor-pointer group shadow-soft hover:shadow-medium"
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 mb-1 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                  <Star className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <p className="text-lg md:text-2xl text-primary group-hover:scale-110 transition-transform">{savedReviews.length}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Reviews</p>
              </div>
            </Card>
            <Card 
              onClick={() => onNavigate?.('your-space-lists')}
              className="p-3 md:p-4 text-center border-border hover:border-secondary hover:shadow-glow-secondary transition-all cursor-pointer group shadow-soft hover:shadow-medium"
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary/10 mb-1 group-hover:scale-110 group-hover:bg-secondary/20 transition-all">
                  <Music2 className="w-4 h-4 md:w-5 md:h-5 text-secondary" />
                </div>
                <p className="text-lg md:text-2xl text-secondary group-hover:scale-110 transition-transform">{userListsArray.length}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Lists</p>
              </div>
            </Card>
            <Card 
              onClick={() => onNavigate?.('your-space-followers')}
              className="p-3 md:p-4 text-center border-border hover:border-chart-3 transition-all cursor-pointer group shadow-soft hover:shadow-medium"
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-chart-3/10 mb-1 group-hover:scale-110 group-hover:bg-chart-3/20 transition-all">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-chart-3" />
                </div>
                <p className="text-lg md:text-2xl text-chart-3 group-hover:scale-110 transition-transform">{followerCount}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Followers</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="shadow-soft">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search albums, artists, users, or reviews..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) {
                  setActiveTab("search");
                  localStorage.setItem("onchord_home_tab", "search");
                }
              }}
              className="pl-12 pr-4 py-6 border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
            />
          </div>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(tab) => {
        setActiveTab(tab);
        localStorage.setItem("onchord_home_tab", tab);
      }} className="space-y-6">
        <TabsList className="w-full">
          <TabsTrigger value="for-you" className="flex-1 text-xs sm:text-sm">
            <Star className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">For You</span>
            <span className="sm:hidden">You</span>
          </TabsTrigger>
          <TabsTrigger value="community" className="flex-1 text-xs sm:text-sm">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Community</span>
            <span className="sm:hidden">Feed</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 text-xs sm:text-sm">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Activity</span>
            <span className="sm:hidden">Live</span>
          </TabsTrigger>
          <TabsTrigger value="discover" className="flex-1 text-xs sm:text-sm">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Discover</span>
            <span className="sm:hidden">Find</span>
          </TabsTrigger>
        </TabsList>

        {/* For You Tab */}
        <TabsContent value="for-you" className="space-y-6">
          {/* My Recent Reviews */}
          <section className="space-y-4" role="region" aria-label="Your recent reviews">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl text-foreground">Your Recent Reviews</h2>
              <Button 
                onClick={() => onNavigate?.("review")}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                aria-label="Write a new review"
              >
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                Write
              </Button>
            </div>

            <div className="grid gap-4">
              {myReviews.slice(0, 3).map((review, index) => (
                <Card 
                  key={`my-review-${review.id}-${index}`}
                  className="p-4 md:p-6 bg-card border-border hover:border-primary/50 transition-all shadow-soft hover:shadow-medium"
                >
                  <div className="flex gap-4">
                    <div 
                      className="flex-shrink-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAlbum?.({
                          albumId: review.albumId,
                          albumTitle: review.albumTitle,
                          albumArtist: review.albumArtist,
                          albumCover: review.albumCover,
                          albumUrl: review.albumUrl,
                          spotifyUrl: review.spotifyUrl,
                          previewUrl: review.previewUrl,
                          rating: review.rating,
                          year: review.date?.slice(0, 4),
                        });
                      }}
                    >
                      <img
                        src={review.albumCover}
                        alt={review.albumTitle}
                        onError={handleImageError}
                        className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover hover:scale-105 transition-transform"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-foreground mb-1 truncate">{review.albumTitle}</h3>
                          <p className="text-sm text-muted-foreground truncate">{review.albumArtist}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-primary/20 px-3 py-1 rounded-full">
                          <Star className="w-4 h-4 text-primary fill-primary" />
                          <span className="text-foreground">{review.rating}</span>
                        </div>
                      </div>
                      
                      {review.tags && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {review.tags.map((tag: string) => (
                            <Badge key={tag} className="bg-primary/10 text-primary border-0 text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <p className="text-foreground mb-3 text-sm line-clamp-2">{review.content}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(review.id);
                          }}
                          className={`flex items-center gap-1 transition ${
                            likedReviews.includes(review.id) ? "text-secondary" : "hover:text-secondary"
                          }`}
                          aria-pressed={likedReviews.includes(review.id)}
                          aria-label={likedReviews.includes(review.id) ? "Unlike review" : "Like review"}
                        >
                          <Heart className={`w-4 h-4 ${likedReviews.includes(review.id) ? "fill-secondary" : ""}`} aria-hidden="true" />
                          {review.likes + (likedReviews.includes(review.id) ? 1 : 0)}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReview(review);
                            setCommentsModalOpen(true);
                          }}
                          className="flex items-center gap-1 hover:text-primary transition"
                          aria-label="View comments"
                        >
                          <MessageCircle className="w-4 h-4" aria-hidden="true" />
                          {review.comments}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(review);
                          }}
                          className="flex items-center gap-1 hover:text-foreground transition"
                          aria-label="Share review"
                        >
                          <Share2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditReview?.(review);
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary"
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          onClick={(e: React.MouseEvent) => handleDeleteClick(e, review)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReviewDetail(review);
                            setReviewDetailModalOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-secondary/30 text-secondary hover:bg-secondary/10 hover:border-secondary"
                          aria-label="More info about review"
                        >
                          <Info className="w-4 h-4 mr-2" aria-hidden="true" />
                          More Info
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Your Collections */}
          <section className="space-y-4" role="region" aria-label="Your collections">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl text-foreground">Your Collections</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onNavigate?.("your-space-lists")}
                className="text-primary hover:text-primary/80 hover:bg-primary/10"
              >
                View All
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userListsArray.length > 0 ? (
                userListsArray.slice(0, 3).map((list) => (
                  <Card 
                    key={list.id} 
                    onClick={() => onNavigate?.(`collection-${list.id}`)}
                    className="p-4 bg-card border-border hover:border-primary/50 transition-all shadow-soft hover:shadow-medium cursor-pointer group"
                  >
                    <div className="grid grid-cols-2 gap-2 mb-3 rounded-lg overflow-hidden">
                      {(list.coverImages || []).slice(0, 4).map((cover, i) => (
                        <div key={i} className="aspect-square overflow-hidden rounded-md">
                          <img
                            src={cover}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={handleImageError}
                          />
                        </div>
                      ))}
                      {/* Fill empty slots if less than 4 covers */}
                      {Array.from({ length: Math.max(0, 4 - (list.coverImages?.length || 0)) }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square overflow-hidden rounded-md bg-muted flex items-center justify-center">
                          <Music2 className="w-6 h-6 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                    <h4 className="text-foreground mb-1 truncate">{list.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{list.description}</p>
                    <Badge className="bg-primary/10 text-primary border-0 text-xs">
                      {(list.albumCount || 0) + (list.songCount || 0)} items
                    </Badge>
                  </Card>
                ))
              ) : (
                <Card className="p-6 col-span-full bg-card border-border text-center">
                  <Music2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-3">No collections yet</p>
                  <Button 
                    variant="outline" 
                    onClick={() => onNavigate?.("your-space-lists")}
                    className="border-primary text-primary hover:bg-primary/10"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create a Collection
                  </Button>
                </Card>
              )}
            </div>
          </section>
        </TabsContent>

        {/* Community Tab */}
        <TabsContent value="community" className="space-y-6" role="region" aria-label="Community feed">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl text-foreground">Community Feed</h2>
              <Badge className="bg-chart-3/20 text-chart-3 border-0">
                <Flame className="w-3 h-3 mr-1" />
                Trending
              </Badge>
            </div>
          </div>

          <div className="grid gap-4">
            {feedReviews.map((review, index) => (
              <Card 
                key={`friend-review-${review.id}-${index}`}
                onClick={() => handleReviewClick(review)}
                className="p-4 md:p-6 bg-card border-border hover:border-primary/50 transition-all shadow-soft hover:shadow-medium cursor-pointer"
              >
                {/* User Header */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar 
                    className="w-10 h-10 ring-2 ring-border hover:ring-primary transition cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (review.userId) onNavigate?.(`user-${review.userId}`);
                    }}
                  >
                    <img src={review.userAvatar} alt={review.userName} className="object-cover" onError={handleImageError} />
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        className="text-foreground hover:text-primary transition cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (review.userId) onNavigate?.(`user-${review.userId}`);
                        }}
                      >{review.userName}</span>
                      <span className="text-muted-foreground text-sm">reviewed</span>
                      <span className="text-foreground truncate">{review.albumTitle}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{review.timestamp}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div 
                    className="flex-shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAlbum?.({
                        albumId: review.albumId,
                        albumTitle: review.albumTitle,
                        albumArtist: review.albumArtist,
                        albumCover: review.albumCover,
                        albumUrl: review.albumUrl,
                        spotifyUrl: review.spotifyUrl,
                        previewUrl: review.previewUrl,
                        rating: review.rating,
                        year: review.date?.slice(0, 4),
                      });
                    }}
                  >
                    <img
                      src={review.albumCover}
                      alt={review.albumTitle}
                      onError={handleImageError}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover hover:scale-105 transition-transform"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(review.rating)
                              ? "text-primary fill-primary"
                              : "text-muted"
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-sm text-foreground">{review.rating}</span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">{review.albumArtist}</p>
                    <p className="text-foreground mb-3 line-clamp-2">{review.content}</p>

                    {review.tags && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {review.tags.map((tag) => (
                          <Badge key={tag} className="bg-secondary/10 text-secondary border-0 text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(review.id);
                        }}
                        className={`flex items-center gap-1 transition ${
                          likedReviews.includes(review.id) ? "text-secondary" : "hover:text-secondary"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${likedReviews.includes(review.id) ? "fill-secondary" : ""}`} />
                        {review.likes + (likedReviews.includes(review.id) ? 1 : 0)}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReview(review);
                          setCommentsModalOpen(true);
                        }}
                        className="flex items-center gap-1 hover:text-primary transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {review.comments}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(review);
                        }}
                        className="flex items-center gap-1 hover:text-foreground transition"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6" role="region" aria-label="Live activity feed">
          <ActivityFeed />
        </TabsContent>

        {/* Discover Tab */}
        <TabsContent value="discover" className="space-y-6" role="region" aria-label="Discover new music and events">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* New Releases - Personalized */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-xl text-foreground">New Releases</h2>
                <Badge className="bg-primary/10 text-primary border-0 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  For You
                </Badge>
              </div>
              
              <div className="space-y-3">
                {loadingReleases ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={`release-skeleton-${i}`} className="p-4 bg-card border-border animate-pulse">
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-md bg-muted"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                          <div className="h-3 bg-muted rounded w-1/4"></div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : personalizedReleases.length > 0 ? (
                  personalizedReleases.map((release) => (
                    <Card 
                      key={release.id} 
                      className="p-4 bg-card border-border hover:border-primary/50 transition-all shadow-soft hover:shadow-medium cursor-pointer group"
                      onClick={() => onOpenAlbum?.({ 
                        id: release.id, 
                        title: release.title, 
                        artist: release.artist,
                        cover: release.cover,
                        spotifyId: release.id
                      })}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <img
                            src={release.cover}
                            alt={release.title}
                            className="w-16 h-16 rounded-md object-cover group-hover:scale-105 transition-transform"
                            onError={handleImageError}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground truncate group-hover:text-primary transition mb-0.5">{release.title}</p>
                          <p className="text-sm text-muted-foreground truncate mb-1">{release.artist}</p>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-secondary/10 text-secondary border-0 text-xs px-1.5 py-0">
                              {release.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{release.releaseDate}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{release.trackCount} tracks</span>
                            <span>•</span>
                            <span>{release.duration}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  // Empty state when no releases
                  <Card className="p-6 bg-card border-border text-center">
                    <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No new releases to show</p>
                    <p className="text-xs text-muted-foreground mt-1">Connect Spotify to get personalized recommendations</p>
                  </Card>
                )}
              </div>
            </section>

            {/* Upcoming Concerts - Personalized */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/10">
                  <MapPin className="w-4 h-4 text-secondary" />
                </div>
                <h2 className="text-xl text-foreground">Concerts</h2>
                <Badge className="bg-secondary/10 text-secondary border-0 text-xs">
                  <Music2 className="w-3 h-3 mr-1" />
                  Your Artists
                </Badge>
              </div>
              
              <div className="space-y-3">
                {loadingConcerts ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={`concert-skeleton-${i}`} className="p-4 bg-card border-border animate-pulse">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                        <div className="h-3 bg-muted rounded w-1/3"></div>
                      </div>
                    </Card>
                  ))
                ) : personalizedConcerts.length > 0 && personalizedConcerts[0].date ? (
                  personalizedConcerts.map((event) => (
                    <Card 
                      key={event.id} 
                      className="p-4 bg-card border-border hover:border-secondary/50 transition-all shadow-soft hover:shadow-medium cursor-pointer group"
                      onClick={() => {
                        if (event.ticketLink) {
                          window.open(event.ticketLink, "_blank");
                        } else {
                          setSelectedEvent(event);
                          setEventModalOpen(true);
                        }
                      }}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Music2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-foreground group-hover:text-secondary transition flex-1">{event.artistName}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1 pl-6">{event.venue}</p>
                      <p className="text-sm text-muted-foreground mb-2 pl-6">{event.city}</p>
                      <div className="flex items-center justify-between pl-6">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{event.date}</span>
                        </div>
                        {event.ticketLink && (
                          <Badge className="bg-chart-3/10 text-chart-3 border-0 text-xs">
                            Get Tickets
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))
                ) : (
                  // Empty state when no concerts
                  <Card className="p-6 bg-card border-border text-center">
                    <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No upcoming concerts found</p>
                    <p className="text-xs text-muted-foreground mt-1">Check back later for events from your favorite artists</p>
                  </Card>
                )}
              </div>
            </section>
          </div>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-6" role="region" aria-label="Search results">
          {!searchQuery.trim() ? (
            <EmptyState
              icon={Search}
              title="Start searching"
              description="Enter a search query to find albums, artists, users, and reviews"
            />
          ) : !hasSearchResults ? (
            <EmptyState
              icon={Search}
              title="No results found"
              description={`No results found for "${searchQuery}"`}
            />
          ) : (
            <div className="space-y-6">
              {/* Loading state */}
              {searchLoading && (
                <div className="text-center py-8">
                  <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-muted-foreground mt-2">Searching...</p>
                </div>
              )}
              
              {/* Albums */}
              {searchAlbumsResults.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Disc3 className="w-5 h-5 text-primary" />
                    <h2 className="text-xl text-foreground">Albums ({searchAlbumsResults.length})</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {searchAlbumsResults.slice(0, 8).map((album) => (
                      <Card
                        key={album.id}
                        onClick={() => onOpenAlbum?.({
                          id: album.id,
                          title: album.title,
                          artist: album.artist,
                          cover: album.cover,
                          year: album.year,
                          url: album.url
                        })}
                        className="p-4 bg-card border-border hover:border-primary/50 transition-all shadow-soft hover:shadow-medium cursor-pointer group"
                      >
                        <img
                          src={album.cover}
                          alt={album.title}
                          className="w-full aspect-square rounded-lg object-cover mb-3 group-hover:scale-105 transition-transform"
                          onError={handleImageError}
                        />
                        <h3 className="text-foreground truncate mb-1 group-hover:text-primary transition">{album.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">{album.artist}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className="bg-secondary/10 text-secondary border-0 text-xs">
                            {album.year}
                          </Badge>
                          {album.genre && (
                            <Badge className="bg-primary/10 text-primary border-0 text-xs">
                              {album.genre}
                            </Badge>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* Users */}
              {searchUsersResults.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-secondary" />
                    <h2 className="text-xl text-foreground">Users ({searchUsersResults.length})</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {searchUsersResults.slice(0, 6).map((user) => (
                      <Card
                        key={user.id}
                        onClick={() => onNavigate?.(`user-${user.id}`)}
                        className="p-4 bg-card border-border hover:border-secondary/50 transition-all shadow-soft hover:shadow-medium cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="w-16 h-16 ring-2 ring-border group-hover:ring-secondary transition">
                            <img src={user.avatar_url || '/default-avatar.png'} alt={user.display_name || 'User'} className="object-cover" onError={handleImageError} />
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-foreground mb-1 truncate group-hover:text-secondary transition">{user.display_name || 'Anonymous'}</h3>
                            <p className="text-sm text-muted-foreground mb-2 truncate">@{user.username || 'user'}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className={
                              isFollowing(user.id)
                                ? "border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                                : "border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFollowToggle(user.id, user.display_name || 'User');
                            }}
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* Reviews */}
              {filteredReviews.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-chart-4" />
                    <h2 className="text-xl text-foreground">Reviews ({filteredReviews.length})</h2>
                  </div>
                  <div className="grid gap-4">
                    {filteredReviews.slice(0, 5).map((review, index) => (
                      <Card 
                        key={`search-review-${review.id}-${index}`} 
                        className="p-4 md:p-6 bg-card border-border hover:border-primary/50 transition-all shadow-soft hover:shadow-medium"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-10 h-10 ring-2 ring-border">
                            <img src={review.userAvatar} alt={review.userName} className="object-cover" onError={handleImageError} />
                          </Avatar>
                          <div>
                            <span className="text-foreground">{review.userName}</span>
                            <p className="text-xs text-muted-foreground">{review.timestamp}</p>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div 
                            className="flex-shrink-0 cursor-pointer"
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
                            <img
                              src={review.albumCover}
                              alt={review.albumTitle}
                              onError={handleImageError}
                              className="w-20 h-20 rounded-lg object-cover hover:scale-105 transition-transform"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h3 className="text-foreground mb-1 truncate">{review.albumTitle}</h3>
                                <p className="text-sm text-muted-foreground truncate">{review.albumArtist}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-primary fill-primary" />
                                <span className="text-foreground">{review.rating}</span>
                              </div>
                            </div>
                            
                            <p className="text-foreground text-sm line-clamp-2">{review.content}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
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

      {/* Event Modal */}
      <EventModal
        event={selectedEvent}
        isOpen={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false);
          setSelectedEvent(null);
        }}
      />

      {/* Review Detail Modal */}
      <ReviewDetailModal
        review={selectedReviewDetail}
        isOpen={reviewDetailModalOpen}
        onClose={() => setReviewDetailModalOpen(false)}
        onOpenComments={() => {
          setCommentsModalOpen(true);
        }}
        onOpenAlbum={onOpenAlbum}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Review?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this review? This action cannot be undone and the review will be permanently removed from all feeds and pages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-accent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}