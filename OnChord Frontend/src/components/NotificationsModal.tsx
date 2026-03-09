import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Heart, MessageCircle, UserPlus, ListMusic, Calendar, Bell, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { EmptyState } from "./EmptyState";
import { Badge } from "./ui/badge";

// Notifications will be implemented via Supabase real-time subscriptions in future
// For now, use empty array
const placeholderNotifications: any[] = [];

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (page: string) => void;
}

export function NotificationsModal({ isOpen, onClose, onNavigate }: NotificationsModalProps) {
  const [allNotifications, setAllNotifications] = useState(placeholderNotifications);
  const [filter, setFilter] = useState("all");

  const getIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-5 h-5 text-accent" />;
      case "comment":
        return <MessageCircle className="w-5 h-5 text-primary" />;
      case "follow":
        return <UserPlus className="w-5 h-5 text-secondary" />;
      case "playlist":
        return <ListMusic className="w-5 h-5 text-accent" />;
      case "event":
        return <Calendar className="w-5 h-5 text-primary" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const markAllAsRead = () => {
    setAllNotifications(
      allNotifications.map((notif) => ({ ...notif, read: true }))
    );
  };

  const handleNotificationClick = (notification: typeof placeholderNotifications[0]) => {
    // Mark as read
    setAllNotifications(
      allNotifications.map((n) => 
        n.id === notification.id ? { ...n, read: true } : n
      )
    );

    // Navigate based on notification type
    onClose(); // Close modal first
    switch (notification.type) {
      case "like":
      case "comment":
        onNavigate?.("your-space");
        break;
      case "follow":
        onNavigate?.("feed");
        break;
      case "playlist":
        onNavigate?.("your-space");
        break;
      case "event":
        onNavigate?.("events");
        break;
      default:
        break;
    }
  };

  const filteredNotifications = filter === "unread" 
    ? allNotifications.filter(n => !n.read)
    : allNotifications;

  const unreadCount = allNotifications.filter(n => !n.read).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Notifications</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                  Stay updated with your music community
                </DialogDescription>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Check className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {/* Tabs */}
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-card border border-border w-full mb-4">
              <TabsTrigger
                value="all"
                className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                All {allNotifications.length > 0 && `(${allNotifications.length})`}
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-0">
              {filteredNotifications.length > 0 ? (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <Card
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 bg-card border-border hover:border-primary transition-all cursor-pointer group ${
                        !notification.read ? 'bg-primary/5 border-primary/30' : ''
                      }`}
                    >
                      <div className="flex gap-4">
                        <Avatar className="w-12 h-12 flex-shrink-0 ring-2 ring-transparent group-hover:ring-primary transition">
                          <img 
                            src={notification.userAvatar} 
                            alt={notification.userName}
                            className="object-cover"
                          />
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            <div className="flex-shrink-0 mt-1">
                              {getIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-foreground group-hover:text-primary transition">
                                <span className="font-medium">{notification.userName}</span>{" "}
                                {notification.content}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notification.timestamp}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Bell}
                  title={filter === "unread" ? "All Caught Up!" : "No Notifications"}
                  description={
                    filter === "unread"
                      ? "You've read all your notifications. Nice work!"
                      : "You don't have any notifications yet. Start engaging with the community!"
                  }
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export unread count hook for use in Navigation
export function useUnreadNotifications() {
  // Notifications will come from Supabase in future - return 0 for now
  return 0;
}
