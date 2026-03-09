import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Heart, MessageCircle, Share2, UserPlus, UserMinus, Music, Bell, Users, Sparkles, TrendingUp, Disc, Clock, Star, Calendar as CalendarIcon, Edit, Info, Trash2, MoreVertical, Loader2 } from "lucide-react";
import { getPublicReviews, type Review } from "../lib/api/reviews";
import { useProfile } from "../lib/useProfile";
import { reviewComments } from "../lib/useReviewComments";
import { StarRating } from "./StarRating";
import { ReviewDetailModal } from "./ReviewDetailModal";
import { useLikes, useReviews } from "../lib/useUserInteractions";
import { useSupabaseFollows } from "../lib/useSupabaseFollows";
import { useSupabaseLikes } from "../lib/useSupabaseLikes";
import { toast } from "sonner";
import { handleImageError } from "./ui/utils";

const notificationIcons = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  playlist: Music,
};

const notificationColors = {
  like: "text-secondary",
  comment: "text-chart-3",
  follow: "text-primary",
  playlist: "text-chart-4",
};

// Empty notifications for now (future feature)
const notifications: any[] = [];

interface CommunityFeedPageProps {
  onOpenAlbum?: (albumId?: string) => void;
}

export function CommunityFeedPage({ onOpenAlbum }: CommunityFeedPageProps = {}) {
  const { profile } = useProfile();
  const { userReviews: savedReviews, deleteReview } = useReviews();
  const [activeTab, setActiveTab] = useState("feed");
  const [reviewDetailModalOpen, setReviewDetailModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<any>(null);
  const [publicReviews, setPublicReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const { toggleFollow, isFollowing, isLoading: isFollowsLoading } = useSupabaseFollows();
  const { toggleReviewLike, isReviewLiked, getReviewLikes, isLoading: isLikesLoading } = useSupabaseLikes();
  
  // Load public reviews from API
  useEffect(() => {
    async function loadReviews() {
      setIsLoadingReviews(true);
      try {
        const reviews = await getPublicReviews(50);
        setPublicReviews(reviews);
      } catch (error) {
        console.error("Failed to load reviews:", error);
      } finally {
        setIsLoadingReviews(false);
      }
    }
    loadReviews();
  }, []);
  
  // Combine user reviews (only public ones) with loaded reviews
  const publicUserReviews = savedReviews.filter(r => r.isPublic);
  const allReviews = [...publicUserReviews, ...publicReviews];

  const handleToggleLike = (e: React.MouseEvent, reviewId: string, initialLikes: number) => {
    e.stopPropagation();
    toggleReviewLike(reviewId, initialLikes);
  };

  const handleFollowToggle = (userId: string, userName: string) => {
    toggleFollow(userId);
    if (isFollowing(userId)) {
      toast.success(`Unfollowed ${userName}`);
    } else {
      toast.success(`Following ${userName}`);
    }
  };

  const handleReviewClick = (review: any) => {
    setSelectedReview(review);
    setReviewDetailModalOpen(true);
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-foreground">Community</h1>
            <p className="text-sm text-muted-foreground">
              {activeTab === "feed" 
                ? "Discover what others are listening to" 
                : `${unreadCount} unread`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="feed" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2 relative">
            <Bell className="w-4 h-4" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="ml-1 bg-secondary text-secondary-foreground border-0 h-5 px-2 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Feed Content */}
        <TabsContent value="feed" className="space-y-4 mt-6">
          {allReviews.map((review, index) => {
            const isLiked = isReviewLiked(review.id);
            const likeCount = getReviewLikes(review.id, review.likes);
            const commentCount = reviewComments[review.id]?.length || review.comments || 0;
            
            return (
              <Card 
                key={review.id}
                onClick={() => handleReviewClick(review)}
                className="overflow-hidden bg-card border-border hover:border-primary/30 transition-all shadow-soft hover:shadow-medium group cursor-pointer"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="p-5">
                  {/* User Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-11 h-11 ring-2 ring-border group-hover:ring-primary/50 transition-all">
                      <img src={review.userAvatar} alt={review.userName} className="object-cover" onError={handleImageError} />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground truncate">{review.userName}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          reviewed {review.type === "track" ? "a track" : "an album"}
                        </p>
                        <span className="text-xs text-muted-foreground">·</span>
                        <p className="text-xs text-muted-foreground">{review.timestamp}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gradient-to-br from-primary/15 to-primary/5 px-3 py-1.5 rounded-full flex-shrink-0">
                      <StarRating rating={review.rating} size="sm" showNumber />
                    </div>
                    {/* Delete option for user's own reviews */}
                    {profile && review.userId === profile.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteClick(e, review)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Review
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Album & Review Content */}
                  <div className="flex gap-4">
                    <div 
                      className="relative flex-shrink-0 group/album cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAlbum?.();
                      }}
                    >
                      <img
                        src={review.albumCover}
                        alt={review.albumTitle}
                        onError={handleImageError}
                        className="w-28 h-28 rounded-lg object-cover shadow-soft group-hover/album:shadow-glow-primary transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-lg opacity-0 group-hover/album:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-foreground truncate">{review.albumTitle}</h4>
                        {review.type === "track" && (
                          <Badge className="bg-secondary/15 text-secondary border-secondary/30 border px-2 py-0 text-xs flex-shrink-0">
                            <Music className="w-3 h-3 mr-1" />
                            Track
                          </Badge>
                        )}
                        {review.type === "album" && (
                          <Badge className="bg-chart-3/15 text-chart-3 border-chart-3/30 border px-2 py-0 text-xs flex-shrink-0">
                            <Disc className="w-3 h-3 mr-1" />
                            Album
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm text-muted-foreground truncate">{review.albumArtist}</p>
                        {review.type === "track" && review.trackDuration && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {review.trackDuration}
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Personality Tags */}
                      {(review.mood || review.whereListened || review.whenListened || review.listeningContext || review.favoriteTrack) && (
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {review.mood && (
                            <Badge className="bg-gradient-to-r from-primary/15 to-primary/5 text-foreground border-primary/20 border px-2 py-0.5 text-xs whitespace-normal">
                              {review.mood}
                            </Badge>
                          )}
                          {review.whereListened && (
                            <Badge className="bg-gradient-to-r from-secondary/15 to-secondary/5 text-foreground border-secondary/20 border px-2 py-0.5 text-xs whitespace-normal">
                              {review.whereListened}
                            </Badge>
                          )}
                          {review.whenListened && (
                            <Badge className="bg-gradient-to-r from-accent/15 to-accent/5 text-foreground border-accent/20 border px-2 py-0.5 text-xs whitespace-normal">
                              {review.whenListened}
                            </Badge>
                          )}
                          {review.favoriteTrack && (
                            <Badge className="bg-gradient-to-r from-chart-3/15 to-chart-3/5 text-foreground border-chart-3/20 border px-2 py-0.5 text-xs whitespace-normal">
                              ♫ {review.favoriteTrack}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3">{review.content}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-4 pt-4 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleToggleLike(e, review.id, review.likes)}
                      className={`flex items-center gap-2 h-9 px-3 rounded-lg transition-all ${
                        isLiked 
                          ? 'text-secondary hover:text-secondary bg-secondary/10 hover:bg-secondary/20' 
                          : 'text-muted-foreground hover:text-secondary hover:bg-secondary/10'
                      }`}
                    >
                      <Heart className={`w-4 h-4 transition-all ${isLiked ? 'fill-secondary scale-110' : ''}`} />
                      <span className="text-sm">{likeCount}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 h-9 px-3 rounded-lg text-muted-foreground hover:text-chart-3 hover:bg-chart-3/10 transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm">{commentCount}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all ml-auto"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* See More Info Button */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReviewClick(review);
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full border-primary/30 text-primary hover:bg-primary/10 hover:border-primary"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    See More Info
                  </Button>
                </div>
              </Card>
            );
          })}

          {/* Load More */}
          <Card className="p-8 bg-gradient-to-br from-card to-muted/20 border-border/50 border-dashed">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-foreground mb-2">You're all caught up!</p>
              <p className="text-sm text-muted-foreground mb-4">
                Discover new music lovers to follow
              </p>
              <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 hover:border-primary">
                Explore Community
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Content */}
        <TabsContent value="notifications" className="space-y-3 mt-6">
          {unreadCount > 0 && (
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
                Mark all as read
              </Button>
            </div>
          )}

          {notifications.map((notification, index) => {
            const Icon = notificationIcons[notification.type as keyof typeof notificationIcons];
            const iconColor = notificationColors[notification.type as keyof typeof notificationColors];

            return (
              <Card
                key={notification.id}
                className={`overflow-hidden border-border transition-all hover:border-primary/30 cursor-pointer shadow-soft hover:shadow-medium animate-slide-in ${
                  !notification.read ? "bg-gradient-to-r from-primary/5 to-transparent border-primary/20" : "bg-card"
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex gap-4 p-4">
                  {/* Icon */}
                  <div className={`${iconColor} bg-current/10 p-2.5 rounded-lg h-fit flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>

                  {/* User Avatar */}
                  <Avatar className="w-11 h-11 flex-shrink-0 ring-2 ring-border">
                    <img
                      src={notification.userAvatar}
                      alt={notification.userName}
                      className="object-cover"
                      onError={handleImageError}
                    />
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground mb-1 leading-relaxed">
                      <span className="font-medium">{notification.userName}</span>{" "}
                      <span className="text-muted-foreground">{notification.content}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{notification.timestamp}</p>
                  </div>

                  {/* Unread Badge */}
                  {!notification.read && (
                    <div className="w-2 h-2 bg-secondary rounded-full flex-shrink-0 mt-2 shadow-glow-secondary" />
                  )}
                </div>
              </Card>
            );
          })}

          {/* All Caught Up State */}
          <Card className="p-8 bg-gradient-to-br from-card to-muted/20 border-border/50 border-dashed">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="bg-gradient-to-br from-primary/20 to-secondary/20 p-4 rounded-full">
                  <Bell className="w-7 h-7 text-primary" />
                </div>
              </div>
              <p className="text-foreground mb-1">You're all caught up!</p>
              <p className="text-sm text-muted-foreground">
                No more notifications to show
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Detail Modal */}
      <ReviewDetailModal
        review={selectedReview}
        isOpen={reviewDetailModalOpen}
        onClose={() => setReviewDetailModalOpen(false)}
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