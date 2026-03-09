import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Calendar, MapPin, Music2, ExternalLink, Clock, DollarSign, X } from "lucide-react";

interface Event {
  id: string;
  artistName: string;
  venue: string;
  city: string;
  date: string;
  thumbnail: string;
  time?: string;
  price?: string;
  description?: string;
  ticketLink?: string;
  eventName?: string;
}

interface EventModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventModal({ event, isOpen, onClose }: EventModalProps) {
  if (!event) return null;

  // Use eventName if available, fallback to artistName
  const title = event.eventName || event.artistName;
  const ticketUrl = event.ticketLink || 'https://www.ticketmaster.com';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-xl max-h-[90vh] bg-card border-border p-0 overflow-hidden flex flex-col">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 bg-background/80 hover:bg-background rounded-full w-8 h-8"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Event Image Header */}
        <div className="relative w-full h-32 sm:h-36 flex-shrink-0 overflow-hidden">
          <img
            src={event.thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <Badge className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-primary text-primary-foreground">
            Live Event
          </Badge>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4 sm:p-6">
            <DialogHeader className="mb-4 sm:mb-6">
              <div className="flex items-start gap-3 mb-2">
                <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                  <Music2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl sm:text-2xl text-foreground mb-1">
                    {title}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground text-sm">
                    {event.venue}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Event Details Grid */}
            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              {/* Date */}
              <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg bg-background border border-border">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm sm:text-base text-foreground">{event.date}</p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg bg-background border border-border">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-secondary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm sm:text-base text-foreground">{event.city}</p>
                </div>
              </div>

              {/* Time (if available) */}
              {event.time && (
                <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg bg-background border border-border">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-chart-3 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="text-sm sm:text-base text-foreground">{event.time}</p>
                  </div>
                </div>
              )}

              {/* Price (if available) */}
              {event.price && (
                <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg bg-background border border-border">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-accent flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Price Range</p>
                    <p className="text-sm sm:text-base text-foreground">{event.price}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div className="mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-base text-foreground mb-2">About This Event</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}

            {/* Quick Link to Tickets */}
            <div className="mb-4 p-2.5 sm:p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Ready to go?</p>
              <Button
                size="sm"
                variant="link"
                className="text-primary hover:text-primary/80 p-0 h-auto"
                onClick={() => window.open(ticketUrl, '_blank')}
              >
                Tickets
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3">
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base"
                onClick={() => window.open(ticketUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Get Tickets
              </Button>
              <Button
                variant="outline"
                className="border-border hover:bg-muted text-sm sm:text-base px-4 sm:px-6"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}