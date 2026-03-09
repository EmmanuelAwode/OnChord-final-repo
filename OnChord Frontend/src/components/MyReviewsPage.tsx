import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Star, Heart, MessageCircle, ArrowLeft, Filter } from "lucide-react";
import { BackButton } from "./BackButton";
import { useReviews } from "../lib/useUserInteractions";

interface MyReviewsPageProps {
  onNavigate?: (page: string) => void;
  onOpenAlbum?: (albumId?: string) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function MyReviewsPage({ onNavigate, onOpenAlbum, onBack, canGoBack }: MyReviewsPageProps) {
  const { userReviews } = useReviews();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton onClick={onBack || (() => onNavigate?.("your-space"))} label={canGoBack ? "Back" : "Back to My Space"} />
        <div className="flex-1">
          <h1 className="mb-2">My Reviews</h1>
          <p className="text-muted-foreground">
            All your album reviews in one place
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-border hover:border-primary hover:text-primary"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card key="total-reviews-stat" className="p-4 bg-card border-border text-center">
          <p className="text-2xl text-primary mb-1">{userReviews.length}</p>
          <p className="text-sm text-muted-foreground">Total Reviews</p>
        </Card>
        <Card key="avg-rating-stat" className="p-4 bg-card border-border text-center">
          <p className="text-2xl text-secondary mb-1">
            {userReviews.reduce((acc, r) => acc + r.rating, 0) / userReviews.length}
          </p>
          <p className="text-sm text-muted-foreground">Avg Rating</p>
        </Card>
        <Card key="total-likes-stat" className="p-4 bg-card border-border text-center">
          <p className="text-2xl text-accent mb-1">
            {userReviews.reduce((acc, r) => acc + r.likes, 0)}
          </p>
          <p className="text-sm text-muted-foreground">Total Likes</p>
        </Card>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {userReviews.map((review) => (
          <Card key={review.id} className="p-6 bg-card border-border hover:border-primary/50 transition-all shadow-soft hover:shadow-medium">
            <div className="flex gap-4">
              <div 
                className="flex-shrink-0 cursor-pointer"
                onClick={() => onOpenAlbum?.()}
              >
                <img
                  src={review.albumCover}
                  alt={review.albumTitle}
                  className="w-24 h-24 rounded-lg object-cover hover:scale-105 transition-transform"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-foreground mb-1">{review.albumTitle}</h4>
                    <p className="text-sm text-muted-foreground">{review.albumArtist}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-primary/20 px-3 py-1 rounded-full">
                    <Star className="w-4 h-4 text-primary fill-primary" />
                    <span className="text-foreground">{review.rating}</span>
                  </div>
                </div>
                
                {review.tags && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {review.tags.map((tag) => (
                      <Badge key={tag} className="bg-primary/10 text-primary border-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

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
                  <span className="ml-auto">{review.timestamp}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
