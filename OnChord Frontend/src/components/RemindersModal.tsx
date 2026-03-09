import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Bell, Calendar, MapPin, Music, Trash2, X, Clock, Ticket, Disc } from "lucide-react";
import { useReminders } from "../lib/useReminders";
import { toast } from "sonner@2.0.3";
import { EventModal } from "./EventModal";

interface RemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToEvent?: (eventId: string) => void;
}

export function RemindersModal({ isOpen, onClose, onNavigateToEvent }: RemindersModalProps) {
  const { upcomingReminders, pastReminders, removeReminder } = useReminders();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);

  const handleDeleteReminder = async (reminderId: string, title: string) => {
    try {
      await removeReminder(reminderId);
      toast.success("Reminder deleted", {
        description: `"${title}" reminder has been removed`
      });
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      toast.error("Failed to delete reminder");
    }
  };

  const formatDate = (dateStr: string, timeStr?: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    let dateText = '';
    if (isToday) {
      dateText = 'Today';
    } else if (isTomorrow) {
      dateText = 'Tomorrow';
    } else {
      dateText = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      });
    }
    
    if (timeStr) {
      return `${dateText} at ${timeStr}`;
    }
    return dateText;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'event':
        return Ticket;
      case 'album':
        return Disc;
      default:
        return Bell;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'event':
        return 'from-accent/20 to-accent/5 border-accent/30';
      case 'album':
        return 'from-secondary/20 to-secondary/5 border-secondary/30';
      default:
        return 'from-primary/20 to-primary/5 border-primary/30';
    }
  };

  const renderReminderCard = (reminder: any) => {
    const TypeIcon = getTypeIcon(reminder.type);
    const typeColor = getTypeColor(reminder.type);
    const isEventReminder = reminder.type === 'event';

    const handleClick = () => {
      if (isEventReminder) {
        // Build event object from reminder data
        const eventData = {
          id: reminder.eventId || reminder.id,
          artistName: reminder.title,
          eventName: reminder.title,
          venue: reminder.location?.split(',')[0] || 'Venue TBA',
          city: reminder.location?.split(',').slice(1).join(',').trim() || 'Location TBA',
          date: new Date(reminder.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: reminder.time || 'TBA',
          thumbnail: reminder.thumbnail || '/placeholder-event.jpg',
          description: reminder.description,
          price: 'Price varies',
          ticketLink: `https://www.ticketmaster.com/event/${reminder.eventId || ''}`
        };
        setSelectedEvent(eventData);
        setEventModalOpen(true);
      }
    };

    return (
      <Card
        key={reminder.id}
        className={`p-4 bg-card border-border hover:border-primary/50 transition-all group ${isEventReminder ? 'cursor-pointer' : ''}`}
        onClick={handleClick}
      >
        <div className="flex gap-3">
          {reminder.thumbnail && (
            <div className="flex-shrink-0">
              <img
                src={reminder.thumbnail}
                alt={reminder.title}
                className="w-16 h-16 rounded-lg object-cover shadow-soft"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium text-foreground truncate">
                    {reminder.title}
                  </h3>
                  <Badge className={`bg-gradient-to-r ${typeColor} text-foreground border text-xs px-2 py-0 flex-shrink-0`}>
                    <TypeIcon className="w-3 h-3 mr-1" />
                    {reminder.type}
                  </Badge>
                </div>
                {reminder.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {reminder.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-primary" />
                    <span>{formatDate(reminder.date, reminder.time)}</span>
                  </div>
                  {reminder.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-secondary" />
                      <span className="truncate max-w-[150px]">{reminder.location}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteReminder(reminder.id, reminder.title);
                }}
                className="flex-shrink-0 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border bg-gradient-to-br from-primary/10 to-secondary/10">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20 flex-shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-foreground">Reminders</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {upcomingReminders.length} upcoming reminder{upcomingReminders.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-primary/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Manage your upcoming and past reminders for events, albums, and tasks
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-4 sm:px-6 pt-4 border-b border-border">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Upcoming
                <Badge className="ml-1 bg-primary/20 text-primary border-0 h-5 px-2 text-xs">
                  {upcomingReminders.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="past" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Past
                <Badge className="ml-1 bg-muted text-muted-foreground border-0 h-5 px-2 text-xs">
                  {pastReminders.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="max-h-[calc(90vh-200px)] sm:max-h-[calc(85vh-220px)]">
            <div className="p-4 sm:p-6">
              <TabsContent value="upcoming" className="mt-0">
                {upcomingReminders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                      <Bell className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg text-foreground mb-2">No upcoming reminders</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Set reminders for concerts, album releases, and more to stay updated
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingReminders.map(renderReminderCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-0">
                {pastReminders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                      <Calendar className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg text-foreground mb-2">No past reminders</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Past reminders will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastReminders.map(renderReminderCard)}
                  </div>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Event Detail Modal */}
    <EventModal
      event={selectedEvent}
      isOpen={eventModalOpen}
      onClose={() => {
        setEventModalOpen(false);
        setSelectedEvent(null);
      }}
    />
    </>
  );
}