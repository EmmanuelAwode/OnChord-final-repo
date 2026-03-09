import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Star, X, Globe, Users, Lock } from "lucide-react";
import { Badge } from "./ui/badge";

interface ReviewCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (review: {
    id?: string;
    rating: number;
    content: string;
    mood?: string;
    listeningContext?: string;
    favoriteTrack?: string;
    visibility: "public" | "friends" | "private";
  }) => void;
  mediaType: "album" | "song";
  mediaTitle: string;
  mediaArtist: string;
  mediaCover: string;
  editMode?: boolean;
  existingReview?: {
    id: string;
    rating: number;
    content: string;
    mood?: string;
    listeningContext?: string;
    favoriteTrack?: string;
    visibility?: "public" | "friends" | "private";
  };
}

const moods = ["😊 Happy", "😔 Sad", "😤 Angry", "😌 Chill", "🔥 Hype", "🧠 Thoughtful", "💪 Motivated", "😭 Emotional"];
const contexts = ["Commute", "Workout", "Study", "Party", "Late Night", "Chill Session", "Focus Time", "Celebration"];

const visibilityOptions = [
  { value: "public", label: "Public", description: "Everyone can see", icon: Globe },
  { value: "friends", label: "Friends Only", description: "Only your friends", icon: Users },
  { value: "private", label: "Private", description: "Only you", icon: Lock },
] as const;

export function ReviewCreationModal({
  isOpen,
  onClose,
  onSubmit,
  mediaType,
  mediaTitle,
  mediaArtist,
  mediaCover,
  editMode,
  existingReview,
}: ReviewCreationModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedContext, setSelectedContext] = useState("");
  const [favoriteTrack, setFavoriteTrack] = useState("");
  const [visibility, setVisibility] = useState("public");

  useEffect(() => {
    if (editMode && existingReview) {
      setRating(existingReview.rating);
      setContent(existingReview.content);
      setSelectedMood(existingReview.mood || "");
      setSelectedContext(existingReview.listeningContext || "");
      setFavoriteTrack(existingReview.favoriteTrack || "");
      setVisibility(existingReview.visibility || "public");
    }
  }, [editMode, existingReview]);

  const handleSubmit = () => {
    if (rating === 0 || content.trim() === "") {
      return;
    }

    onSubmit({
      id: existingReview?.id,
      rating,
      content: content.trim(),
      mood: selectedMood,
      listeningContext: selectedContext,
      favoriteTrack: favoriteTrack.trim() || undefined,
      visibility,
    });

    // Reset form
    setRating(0);
    setContent("");
    setSelectedMood("");
    setSelectedContext("");
    setFavoriteTrack("");
    setVisibility("public");
    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setRating(0);
    setContent("");
    setSelectedMood("");
    setSelectedContext("");
    setFavoriteTrack("");
    setVisibility("public");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl text-foreground">
            Review {mediaType === "album" ? "Album" : "Single"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Share your thoughts and rating
          </DialogDescription>
        </DialogHeader>

        {/* Close button */}
        <button
          onClick={handleCancel}
          className="absolute right-4 top-4 rounded-full p-2 hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-foreground" />
        </button>

        <div className="space-y-6 pt-4">
          {/* Media Info */}
          <div className="flex gap-4 p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border border-primary/20">
            <img
              src={mediaCover}
              alt={mediaTitle}
              className="w-20 h-20 rounded-lg object-cover shadow-lg"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-foreground font-medium truncate">{mediaTitle}</h3>
              <p className="text-sm text-muted-foreground truncate">{mediaArtist}</p>
              <Badge className="mt-2 bg-secondary/20 text-secondary border-0 text-xs">
                {mediaType === "album" ? "Album" : "Single"}
              </Badge>
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <label className="text-sm text-foreground">Rating *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "text-primary fill-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 1 && "Terrible"}
                {rating === 2 && "Not good"}
                {rating === 3 && "It's okay"}
                {rating === 4 && "Really good"}
                {rating === 5 && "Masterpiece"}
              </p>
            )}
          </div>

          {/* Review Content */}
          <div className="space-y-2">
            <label className="text-sm text-foreground">Your Review *</label>
            <Textarea
              placeholder="Share your thoughts on this music... What did you like? What stood out to you?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] bg-background border-border resize-none"
            />
            <p className="text-xs text-muted-foreground">{content.length} characters</p>
          </div>

          {/* Mood */}
          <div className="space-y-2">
            <label className="text-sm text-foreground">Mood (Optional)</label>
            <div className="flex flex-wrap gap-2">
              {moods.map((mood) => (
                <Button
                  key={mood}
                  type="button"
                  size="sm"
                  variant={selectedMood === mood ? "default" : "outline"}
                  className={
                    selectedMood === mood
                      ? "bg-primary text-primary-foreground"
                      : "border-border hover:border-primary"
                  }
                  onClick={() => setSelectedMood(selectedMood === mood ? "" : mood)}
                >
                  {mood}
                </Button>
              ))}
            </div>
          </div>

          {/* Listening Context */}
          <div className="space-y-2">
            <label className="text-sm text-foreground">Listening Context (Optional)</label>
            <div className="flex flex-wrap gap-2">
              {contexts.map((context) => (
                <Button
                  key={context}
                  type="button"
                  size="sm"
                  variant={selectedContext === context ? "default" : "outline"}
                  className={
                    selectedContext === context
                      ? "bg-secondary text-secondary-foreground"
                      : "border-border hover:border-secondary"
                  }
                  onClick={() => setSelectedContext(selectedContext === context ? "" : context)}
                >
                  {context}
                </Button>
              ))}
            </div>
          </div>

          {/* Favorite Track (only for albums) */}
          {mediaType === "album" && (
            <div className="space-y-2">
              <label className="text-sm text-foreground">Favorite Track (Optional)</label>
              <input
                type="text"
                placeholder="e.g., Track 3: Song Title"
                value={favoriteTrack}
                onChange={(e) => setFavoriteTrack(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {/* Visibility */}
          <div className="space-y-3 p-5 bg-muted/30 rounded-lg border border-primary/20">
            <div>
              <h3 className="text-foreground flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4 text-primary" />
                Who can see this review?
              </h3>
              <p className="text-xs text-muted-foreground">
                Control who can view your review
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {visibilityOptions.map((option) => {
                const isSelected = visibility === option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVisibility(option.value)}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all
                      ${isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50 bg-background/50'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className={`
                        p-2 rounded-full
                        ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}
                      `}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={`text-sm ${isSelected ? 'text-foreground' : 'text-foreground'}`}>
                          {option.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {option.description}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || content.trim() === ""}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Review
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="border-border hover:bg-muted"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}