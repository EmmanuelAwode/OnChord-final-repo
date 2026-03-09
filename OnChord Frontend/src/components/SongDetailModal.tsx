import React from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { SpotifyTrackItem } from "../lib/useSpotify";
import { Button } from "./ui/button";
import { Sparkles } from "lucide-react";

interface SongDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: SpotifyTrackItem | null;
  onOpenReviewModal?: (mediaType: "album" | "song", mediaId: string, mediaTitle: string, mediaArtist: string, mediaCover: string) => void;
}

export const SongDetailModal: React.FC<SongDetailModalProps> = ({ isOpen, onClose, track, onOpenReviewModal }) => {
  if (!track) return null;
  
  const handleReview = () => {
    onOpenReviewModal?.(
      "song",
      track.id,
      track.name,
      track.artists.map((a) => a.name).join(", "),
      track.album.images[0]?.url || ""
    );
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose} aria-modal="true" role="dialog" aria-label={`Details for ${track.name}`}> 
      <DialogContent className="max-w-md">
        <DialogTitle>{track.name}</DialogTitle>
        <div className="flex gap-4 items-center mt-2">
          <img
            src={track.album.images[0]?.url}
            alt={track.album.name}
            className="w-24 h-24 rounded-lg object-cover shadow"
          />
          <div>
            <div className="font-semibold text-lg">{track.name}</div>
            <div className="text-sm text-muted-foreground mb-1">
              {track.artists.map((a) => a.name).join(", ")}
            </div>
            <div className="text-xs text-muted-foreground mb-1">
              Album: {track.album.name}
            </div>
            <div className="text-xs text-muted-foreground mb-1">
              Duration: {Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, "0")}
            </div>
            <div className="text-xs text-muted-foreground">
              Popularity: {track.popularity}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={handleReview} className="bg-primary hover:bg-primary/90 text-primary-foreground" aria-label="Review this song">
            <Sparkles className="w-4 h-4 mr-2" />
            Review Song
          </Button>
          <Button onClick={onClose} variant="outline" aria-label="Close song details">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
