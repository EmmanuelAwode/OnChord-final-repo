import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Calendar, Clock, MapPin, Check } from "lucide-react";
import { useReminders } from "../lib/useReminders";
import { toast } from "sonner@2.0.3";

interface SetReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultData?: {
    type: 'event' | 'album' | 'custom';
    title: string;
    description?: string;
    date?: string;
    time?: string;
    eventId?: string;
    albumId?: string;
    thumbnail?: string;
    location?: string;
  };
}

export function SetReminderDialog({ isOpen, onClose, defaultData }: SetReminderDialogProps) {
  const { addReminder } = useReminders();
  const [title, setTitle] = useState(defaultData?.title || "");
  const [description, setDescription] = useState(defaultData?.description || "");
  const [date, setDate] = useState(defaultData?.date || "");
  const [time, setTime] = useState(defaultData?.time || "");
  const [location, setLocation] = useState(defaultData?.location || "");
  const [showSuccess, setShowSuccess] = useState(false);

  // Update state when defaultData changes (e.g., when dialog opens with new event)
  useEffect(() => {
    if (defaultData) {
      setTitle(defaultData.title || "");
      setDescription(defaultData.description || "");
      setDate(defaultData.date || "");
      setTime(defaultData.time || "");
      setLocation(defaultData.location || "");
    }
  }, [defaultData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !date) {
      toast.error("Please fill in required fields", {
        description: "Title and date are required"
      });
      return;
    }

    try {
      await addReminder({
        type: defaultData?.type || 'custom',
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        time: time || undefined,
        eventId: defaultData?.eventId,
        albumId: defaultData?.albumId,
        thumbnail: defaultData?.thumbnail,
        location: location.trim() || undefined,
      });

      // Show success state
      setShowSuccess(true);
      
      // Auto close after showing success
      setTimeout(() => {
        setShowSuccess(false);
        handleClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to add reminder:', error);
      toast.error("Failed to save reminder", {
        description: "Please try again"
      });
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setDate("");
    setTime("");
    setLocation("");
    setShowSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center mb-4 animate-scale-in shadow-glow-secondary">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl text-foreground mb-2">Reminder Set!</h3>
            <p className="text-sm text-muted-foreground text-center">
              You'll be notified about "{title}"
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <span>Set Reminder</span>
              </DialogTitle>
              <DialogDescription>
                Add a reminder for an event, album, or custom task.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {/* Preview Image */}
              {defaultData?.thumbnail && (
                <div className="flex justify-center">
                  <img
                    src={defaultData.thumbnail}
                    alt={title}
                    className="w-24 h-24 rounded-lg object-cover shadow-soft"
                  />
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What do you want to remember?"
                  className="bg-card border-border"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add additional details (optional)"
                  className="bg-card border-border min-h-[80px]"
                  rows={3}
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-card border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Time
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>
              </div>

              {/* Location */}
              {defaultData?.type === 'event' && (
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Venue or location"
                    className="bg-card border-border"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 border-border hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Set Reminder
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}