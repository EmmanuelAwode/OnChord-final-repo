import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
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
import { 
  Calendar as CalendarIcon, 
  Star, 
  Plus, 
  TrendingUp, 
  Clock,
  Music,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Heart,
  MessageCircle,
  Share2,
  Edit,
  X,
  Disc,
  Info,
  BellDot,
  MapPin,
  Ticket,
  ExternalLink,
  Trash2
} from "lucide-react";
import { StarRating } from "./StarRating";
import { BackButton } from "./BackButton";
import { CommentsModal } from "./CommentsModal";
import { EditedIndicator } from "./EditedIndicator";
import { ReviewDetailModal } from "./ReviewDetailModal";
import { EventModal } from "./EventModal";
import { toast } from "sonner";
import { useReviews } from "../lib/useUserInteractions";
import { useSupabaseLikes } from "../lib/useSupabaseLikes";
import { useReminders, type Reminder } from "../lib/useReminders";
import { reviewComments } from "../lib/useReviewComments";
import { getRecentlyPlayed, isSpotifyConnected } from "../lib/api/spotify";
import { handleImageError } from "./ui/utils";

interface ReviewsPageProps {
  onNavigate?: (page: string) => void;
  onOpenAlbum?: (albumData?: any) => void;
  onEditReview?: (review: any) => void;
  onOpenEvent?: (eventData: any) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function ReviewsPage({ onNavigate, onOpenAlbum, onEditReview, onOpenEvent, onBack, canGoBack }: ReviewsPageProps) {
  const { userReviews: savedReviews, deleteReview } = useReviews();
  const { toggleReviewLike, isReviewLiked, getReviewLikes, isLoading: isLikesLoading } = useSupabaseLikes();
  const { getRemindersForDate, removeReminder } = useReminders();
  const [activeTab, setActiveTab] = useState("calendar");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedWeekStart, setSelectedWeekStart] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDay, setModalDay] = useState<number | null>(null);
  const [reviewDetailModalOpen, setReviewDetailModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedCommentReview, setSelectedCommentReview] = useState<any>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEventFromReminder, setSelectedEventFromReminder] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<any>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "rating-desc" | "rating-asc" | "album-az">("date-desc");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [recentlyListened, setRecentlyListened] = useState<any[]>([]);
  const [recentlyListenedLoading, setRecentlyListenedLoading] = useState(true);
  
  // Fetch recently played tracks from Spotify
  useEffect(() => {
    async function fetchRecentlyPlayed() {
      try {
        const connected = await isSpotifyConnected();
        if (!connected) {
          setRecentlyListened([]);
          setRecentlyListenedLoading(false);
          return;
        }
        const data = await getRecentlyPlayed(10);
        if (data?.items) {
          const tracks = data.items.map((item: any) => ({
            id: item.track?.id || Math.random().toString(),
            trackTitle: item.track?.name || "Unknown Track",
            trackArtist: item.track?.artists?.map((a: any) => a.name).join(", ") || "Unknown Artist",
            albumCover: item.track?.album?.images?.[0]?.url || "",
            timestamp: new Date(item.played_at).toLocaleString(),
          }));
          setRecentlyListened(tracks.slice(0, 6));
        }
      } catch (error) {
        console.error("Failed to fetch recently played:", error);
        setRecentlyListened([]);
      } finally {
        setRecentlyListenedLoading(false);
      }
    }
    fetchRecentlyPlayed();
  }, []);
  
  // Apply filters and sorting to real reviews only
  const myReviews = savedReviews
    .filter(review => {
      if (filterRating !== null && review.rating !== filterRating) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "rating-desc":
          return b.rating - a.rating;
        case "rating-asc":
          return a.rating - b.rating;
        case "album-az":
          return a.albumTitle.localeCompare(b.albumTitle);
        default:
          return 0;
      }
    });
  
  // Map reviews to specific calendar dates for demo
  const getReviewsForDay = (day: number, month?: Date) => {
    const dateToUse = month || selectedMonth;
    const dateStr = `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Return actual reviews that match this date
    return myReviews.filter(review => review.date?.startsWith(dateStr));
  };

  // Get reminders for a specific day
  const getRemindersForDay = (day: number, month?: Date) => {
    const dateToUse = month || selectedMonth;
    const dateStr = `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return getRemindersForDate(dateStr);
  };

  // Check if a day has any content (reviews or reminders)
  const hasContentOnDay = (day: number, month?: Date) => {
    const dayReviews = getReviewsForDay(day, month);
    const dayReminders = getRemindersForDay(day, month);
    return dayReviews.length > 0 || dayReminders.length > 0;
  };
  
  const handleDayClick = (day: number, monthDate?: Date) => {
    const dateToUse = monthDate || selectedMonth;
    
    // Open modal if there are reviews or reminders for this day
    if (hasContentOnDay(day, dateToUse)) {
      setModalDay(day);
      setModalOpen(true);
    }
  };

  const handleReviewClick = (review: any) => {
    setSelectedReview(review);
    setReviewDetailModalOpen(true);
  };

  const handleShare = (review: any) => {
    toast.success("Link copied to clipboard!", {
      description: `Share your review of ${review.albumTitle}`
    });
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
      // Close any open modals showing the deleted review
      setModalOpen(false);
      setReviewDetailModalOpen(false);
    }
  };

  // Get days in current month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(selectedMonth);

  // Week navigation for mobile
  const previousWeek = () => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedWeekStart(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedWeekStart(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedWeekStart(today);
    setSelectedMonth(today);
  };

  // Get the week's days starting from selectedWeekStart
  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(selectedWeekStart);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Go to Sunday
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const weekRangeText = `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const previousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
    setSelectedDate(null);
  };

  const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Filter reviews by selected date
  const displayedReviews = selectedDate 
    ? getReviewsForDay(selectedDate)
    : myReviews.slice(0, 3);
    
  const modalReviews = modalDay ? getReviewsForDay(modalDay) : [];
  const modalReminders = modalDay ? getRemindersForDay(modalDay) : [];
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      {onBack && (
        <BackButton onClick={onBack} label={canGoBack ? "Back" : "Back to Home"} />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between" role="banner" aria-label="Header and actions">
        <div>
          <h1 className="text-3xl text-foreground">My Reviews</h1>
          <p className="text-muted-foreground mt-1">
            Track your musical journey and share your thoughts
          </p>
        </div>
        <Button 
          onClick={() => onNavigate?.("review")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft hover:shadow-medium"
          aria-label="Write a new review"
        >
          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
          Write Review
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" role="region" aria-label="Reviews navigation tabs">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            All Reviews
            <Badge className="ml-1 bg-primary/20 text-primary border-0 h-5 px-2 text-xs">
              {myReviews.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            To Review
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar" className="space-y-6 mt-0">
          {/* Mobile Week View */}
          <Card className="md:hidden p-4 bg-card border-border shadow-soft">
            {/* Week Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm text-foreground">{weekRangeText}</h2>
                  <p className="text-xs text-muted-foreground">
                    {myReviews.length} reviews total • Tap days to view
                  </p>
                </div>
              </div>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={previousWeek}
                className="border-border hover:border-primary/50 hover:bg-primary/10 flex-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="border-border hover:border-primary/50 hover:bg-primary/10 flex-1"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextWeek}
                className="border-border hover:border-primary/50 hover:bg-primary/10 flex-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Week Grid */}
            <div className="space-y-2">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={`header-${i}`} className="text-center py-1 text-xs text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Week Days */}
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((date, i) => {
                  const day = date.getDate();
                  const dayReviews = getReviewsForDay(day, date);
                  const dayReminders = getRemindersForDay(day, date);
                  const hasContent = dayReviews.length > 0 || dayReminders.length > 0;
                  const isToday = new Date().toDateString() === date.toDateString();
                  const isCurrentMonth = date.getMonth() === new Date().getMonth();
                  
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (hasContent) {
                          setSelectedMonth(date);
                          handleDayClick(day, date);
                        }
                      }}
                      className={`relative rounded-lg p-2 transition-all duration-200 min-h-[80px] flex flex-col ${
                        hasContent
                          ? 'bg-primary/10 border-2 border-primary hover:bg-primary/20 cursor-pointer hover:scale-105'
                          : 'bg-muted/30 border-2 border-transparent cursor-not-allowed opacity-60'
                      } ${
                        isToday ? 'ring-2 ring-secondary ring-offset-1 ring-offset-background' : ''
                      } ${
                        !isCurrentMonth ? 'opacity-40' : ''
                      }`}
                    >
                      {/* Day number */}
                      <div className="flex items-start justify-between mb-1">
                        <span className={`text-xs ${hasContent ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                          {day}
                        </span>
                        {hasContent && (
                          <div className="flex items-center gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            {(dayReviews.length + dayReminders.length) > 1 && (
                              <Badge className="bg-secondary text-secondary-foreground border-0 h-3 px-1 text-[8px] ml-0.5">
                                {dayReviews.length + dayReminders.length}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Content indicator */}
                      {hasContent && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-1">
                          <div className="flex items-center gap-1">
                            {dayReviews.length > 0 && (
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center ring-1 ring-primary/20">
                                <Star className="w-2.5 h-2.5 text-primary fill-primary" />
                              </div>
                            )}
                            {dayReminders.length > 0 && (
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent/30 to-accent/20 flex items-center justify-center ring-1 ring-accent/20">
                                <BellDot className="w-2.5 h-2.5 text-accent" />
                              </div>
                            )}
                          </div>
                          <p className="text-[8px] text-primary font-medium">
                            Tap to view
                          </p>
                        </div>
                      )}
                      
                      {/* Empty state */}
                      {!hasContent && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-1">
                          <div className="w-6 h-6 rounded-full bg-muted/20 flex items-center justify-center">
                            <span className="text-[10px] text-muted-foreground/30">—</span>
                          </div>
                          <p className="text-[7px] text-muted-foreground/40">
                            No activity
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Desktop Month View */}
          <Card className="hidden md:block p-6 bg-card border-border shadow-soft">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl text-foreground">{monthName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {myReviews.length} reviews • Click highlighted days to view
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousMonth}
                  className="border-border hover:border-primary/50 hover:bg-primary/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMonth(new Date())}
                  className="border-border hover:border-primary/50 hover:bg-primary/10"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextMonth}
                  className="border-border hover:border-primary/50 hover:bg-primary/10"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-3">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                <div key={`header-${i}`} className="text-center py-3 text-sm text-muted-foreground">
                  {day}
                </div>
              ))}
              
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {/* Calendar Days */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dayReviews = getReviewsForDay(day);
                const dayReminders = getRemindersForDay(day);
                const hasContent = dayReviews.length > 0 || dayReminders.length > 0;
                const isToday = new Date().getDate() === day && 
                               new Date().getMonth() === selectedMonth.getMonth() &&
                               new Date().getFullYear() === selectedMonth.getFullYear();
                
                return (
                  <div
                    key={day}
                    onClick={() => hasContent && handleDayClick(day)}
                    className={`relative rounded-lg p-3 transition-all duration-200 min-h-[140px] flex flex-col ${
                      hasContent
                        ? 'bg-primary/10 border-2 border-primary hover:bg-primary/20 hover:scale-[1.02] hover:shadow-glow-primary cursor-pointer'
                        : 'bg-muted/30 border-2 border-transparent cursor-not-allowed opacity-60'
                    } ${
                      isToday ? 'ring-2 ring-secondary ring-offset-2 ring-offset-background' : ''
                    }`}
                  >
                    {/* Day number */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-medium ${hasContent ? 'text-primary' : 'text-muted-foreground'}`}>
                          {day}
                        </span>
                        {hasContent && (
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                      {hasContent && (dayReviews.length + dayReminders.length) > 1 && (
                        <Badge className="bg-secondary text-secondary-foreground border-0 h-5 px-2 text-[10px]">
                          {dayReviews.length + dayReminders.length}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Content preview */}
                    {hasContent && (
                      <div className="flex-1 space-y-1.5 overflow-hidden">
                        {/* Show reminders first */}
                        {dayReminders.slice(0, 2).map((reminder, idx) => (
                          <div key={`rem-${idx}`} className="flex items-center gap-1.5">
                            <BellDot className="w-2.5 h-2.5 text-accent flex-shrink-0" />
                            <p className="text-xs text-accent truncate leading-tight">
                              {reminder.title}
                            </p>
                          </div>
                        ))}
                        
                        {/* Then show reviews */}
                        {dayReviews.slice(0, hasContent && dayReminders.length > 0 ? 1 : 2).map((review, idx) => (
                          <div key={`rev-${idx}`} className="space-y-0.5">
                            <p className="text-xs text-foreground truncate leading-tight">
                              {review.albumTitle}
                            </p>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  className={`w-2.5 h-2.5 ${
                                    i < Math.floor(review.rating)
                                      ? "text-primary fill-primary"
                                      : "text-muted-foreground/30"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                        
                        {/* Show more count */}
                        {(dayReviews.length + dayReminders.length) > 3 && (
                          <p className="text-[10px] text-primary mt-1">
                            +{(dayReviews.length + dayReminders.length) - 3} more
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Empty state for days without content */}
                    {!hasContent && (
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center mb-1">
                          <span className="text-sm text-muted-foreground/30">—</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground/40 text-center">
                          No activity
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Modal for Day Reviews */}
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] p-0 gap-0">
              <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border bg-gradient-to-br from-primary/10 to-secondary/10">
                <DialogTitle className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/20 flex-shrink-0">
                    <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base text-foreground truncate">
                      {modalDay && selectedMonth.toLocaleDateString('en-US', { month: 'long' })} {modalDay}, {selectedMonth.getFullYear()}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      {modalReviews.length} review{modalReviews.length !== 1 ? 's' : ''}
                      {modalReminders.length > 0 && ` • ${modalReminders.length} reminder${modalReminders.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  View all music reviews and reminders from {modalDay && selectedMonth.toLocaleDateString('en-US', { month: 'long' })} {modalDay}, {selectedMonth.getFullYear()}
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[calc(90vh-120px)] sm:max-h-[calc(85vh-140px)]">
                <div className="p-4 sm:p-6">
                  {modalReviews.length === 0 && modalReminders.length === 0 ? (
                    // Empty state - This shouldn't show since we only open modal for days with content
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                        <Music className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-base sm:text-lg text-foreground mb-2">No activity on this day</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                        You haven't reviewed any music or set any reminders on this day.
                      </p>
                    </div>
                  ) : (
                    // Content list
                    <div className="space-y-3 sm:space-y-4">
                      {/* Reminders Section */}
                      {modalReminders.length > 0 && (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <BellDot className="w-4 h-4 text-accent" />
                            <h3 className="text-sm text-foreground">Reminders</h3>
                          </div>
                          {modalReminders.map((reminder, index) => {
                            // Event data stored in the reminder itself (no mock lookup needed)
                            const eventData = reminder.type === 'event' && reminder.eventData 
                              ? reminder.eventData
                              : null;
                            
                            return (
                            <Card key={`reminder-${index}`} className="p-3 sm:p-4 bg-gradient-to-br from-accent/5 to-accent/10 border-accent/30 hover:border-accent/50 transition-all hover:shadow-soft">
                              <div className="flex gap-3 sm:gap-4 items-start">
                                {/* Icon or Thumbnail */}
                                <div className="flex-shrink-0">
                                  {eventData?.thumbnail ? (
                                    <img 
                                      src={eventData.thumbnail} 
                                      alt={reminder.title}
                                      onError={handleImageError}
                                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-accent/20 flex items-center justify-center">
                                      {reminder.type === 'event' && <Ticket className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />}
                                      {reminder.type === 'album' && <Disc className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />}
                                      {reminder.type === 'custom' && <BellDot className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Reminder Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm sm:text-base text-foreground mb-0.5">
                                        {reminder.title}
                                      </h4>
                                      {eventData ? (
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                          {eventData.venue}
                                        </p>
                                      ) : reminder.description && (
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                          {reminder.description}
                                        </p>
                                      )}
                                    </div>
                                    <Badge className="bg-accent/20 text-accent border-accent/30 border text-[10px] sm:text-xs flex-shrink-0">
                                      Live Event
                                    </Badge>
                                  </div>
                                  
                                  {/* Event Details Grid */}
                                  <div className="grid gap-2 mb-3">
                                    {(eventData?.city || reminder.location) && (
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <MapPin className="w-3 h-3 flex-shrink-0" />
                                        <span>{eventData?.city || reminder.location}</span>
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center gap-1.5 text-xs text-accent">
                                      <Clock className="w-3 h-3 flex-shrink-0" />
                                      <span>{eventData?.time || reminder.time || 'All day'}</span>
                                    </div>
                                    
                                    {eventData?.price && (
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Ticket className="w-3 h-3 flex-shrink-0" />
                                        <span>{eventData.price}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {/* View Details button for events */}
                                    {eventData && (
                                      <Button
                                        onClick={() => {
                                          setSelectedEventFromReminder(eventData);
                                          setEventModalOpen(true);
                                        }}
                                        size="sm"
                                        className="h-7 text-xs bg-accent hover:bg-accent/90 text-white"
                                      >
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        View Details
                                      </Button>
                                    )}
                                    <Button
                                      onClick={() => {
                                        removeReminder(reminder.id);
                                        toast.success("Reminder removed");
                                        // Refresh modal if no more content
                                        if (modalReviews.length === 0 && modalReminders.length === 1) {
                                          setModalOpen(false);
                                        }
                                      }}
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-muted-foreground hover:text-destructive ml-auto"
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                          })}
                        </>
                      )}
                      
                      {/* Reviews Section */}
                      {modalReviews.length > 0 && (
                        <>
                          {modalReminders.length > 0 && (
                            <div className="flex items-center gap-2 mb-2 mt-4">
                              <Star className="w-4 h-4 text-primary" />
                              <h3 className="text-sm text-foreground">Reviews</h3>
                            </div>
                          )}
                          {modalReviews.map((review, index) => {
                            const isLiked = isReviewLiked(review.id);
                            const likeCount = getReviewLikes(review.id);
                            const commentCount = reviewComments[review.id]?.length || review.comments || 0;
                            return (
                              <Card key={index} className="p-3 sm:p-4 bg-card border-border hover:border-primary/50 transition-all hover:shadow-soft">
                                <div className="flex gap-3 sm:gap-4">
                                  {/* Album Cover */}
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
                                      className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg object-cover shadow-medium"
                                    />
                                  </div>
                                  {/* Review Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 sm:gap-3 mb-1 sm:mb-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
                                <h3 className="text-sm sm:text-base text-foreground truncate">{review.albumTitle}</h3>
                                {review.type === "track" && (
                                  <Badge className="bg-secondary/15 text-secondary border-secondary/30 border px-1.5 py-0 text-[10px] sm:text-xs flex-shrink-0">
                                    <Music className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  </Badge>
                                )}
                                {review.type === "album" && (
                                  <Badge className="bg-chart-3/15 text-chart-3 border-chart-3/30 border px-1.5 py-0 text-[10px] sm:text-xs flex-shrink-0">
                                    <Disc className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">{review.albumArtist}</p>
                            </div>
                            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                              <StarRating rating={review.rating} size="sm" showNumber />
                            </div>
                          </div>
                          
                          {/* Personality Tags */}
                          {(review.mood || review.whereListened || review.whenListened || review.favoriteTrack) && (
                            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
                              {review.mood && (
                                <Badge className="bg-gradient-to-r from-primary/15 to-primary/5 text-foreground border-primary/20 border text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 whitespace-normal">
                                  {review.mood}
                                </Badge>
                              )}
                              {review.whereListened && (
                                <Badge className="bg-gradient-to-r from-secondary/15 to-secondary/5 text-foreground border-secondary/20 border text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 whitespace-normal">
                                  {review.whereListened}
                                </Badge>
                              )}
                              {review.whenListened && (
                                <Badge className="bg-gradient-to-r from-accent/15 to-accent/5 text-foreground border-accent/20 border text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 whitespace-normal">
                                  {review.whenListened}
                                </Badge>
                              )}
                              {review.favoriteTrack && (
                                <Badge className="bg-gradient-to-r from-chart-3/15 to-chart-3/5 text-foreground border-chart-3/20 border text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 whitespace-normal">
                                  ♫ {review.favoriteTrack}
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {/* Review Text */}
                          {review.content && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2 sm:mb-3">
                              {review.content}
                            </p>
                          )}
                          
                          {/* Tags */}
                          {review.tags && review.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-3">
                              {review.tags.slice(0, 3).map((tag, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="bg-muted/50 text-muted-foreground border-0 text-[10px] sm:text-xs"
                                >
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {/* Actions */}
                          <div className="flex items-center gap-4 text-muted-foreground mb-3">
                            <button 
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                toggleReviewLike(review.id);
                              }}
                              className={`flex items-center gap-1.5 transition ${
                                isLiked ? "text-secondary" : "hover:text-secondary"
                              }`}
                              aria-pressed={isLiked}
                              aria-label={isLiked ? "Unlike review" : "Like review"}
                            >
                              <Heart className={`w-4 h-4 ${isLiked ? "fill-secondary" : ""}`} aria-hidden="true" />
                              {likeCount}
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCommentReview(review);
                                setCommentsModalOpen(true);
                              }}
                              className="flex items-center gap-1.5 hover:text-chart-3 transition"
                              aria-label="View comments"
                            >
                              <MessageCircle className="w-4 h-4" aria-hidden="true" />
                              {commentCount}
                            </button>
                            <div className="ml-auto flex items-center gap-2">
                              <EditedIndicator isEdited={review.isEdited} editedAt={review.editedAt} />
                              <span className="text-xs">{review.timestamp}</span>
                            </div>
                          </div>
                          {/* See More Info Button */}
                          <Button
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleReviewClick(review);
                            }}
                            variant="outline"
                            size="sm"
                            className="w-full border-primary/30 text-primary hover:bg-primary/10 hover:border-primary"
                            aria-label="See more info about review"
                          >
                            <Info className="w-4 h-4 mr-2" aria-hidden="true" />
                            See More Info
                          </Button>
                        </div>
                      </div>
                  </Card>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Recent Reviews Below Calendar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="text-xl text-foreground">
                  {selectedDate 
                    ? `Reviews from ${selectedMonth.toLocaleDateString('en-US', { month: 'short' })} ${selectedDate}` 
                    : 'Recent Reviews'
                  }
                </h3>
              </div>
              {selectedDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                  className="border-border hover:border-primary/50 hover:bg-primary/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filter
                </Button>
              )}
            </div>
            <div className="grid gap-4">
              {displayedReviews.length === 0 ? (
                <Card className="p-8 bg-card border-border border-dashed">
                  <div className="text-center">
                    <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-foreground mb-1">No reviews on this day</p>
                    <p className="text-sm text-muted-foreground">
                      Select another day or add a review
                    </p>
                  </div>
                </Card>
              ) : (
                displayedReviews.map((review, index) => {
                  const isLiked = isReviewLiked(review.id);
                  const likeCount = getReviewLikes(review.id);
                  const commentCount = reviewComments[review.id]?.length || review.comments || 0;
                  
                  return (
                <Card 
                  key={`${review.id}-${index}`}
                  onClick={() => handleReviewClick(review)}
                  className="p-5 bg-card border-border hover:border-primary/50 transition-all shadow-soft hover:shadow-medium cursor-pointer group"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex gap-4">
                    <div 
                      className="flex-shrink-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAlbum?.();
                      }}
                    >
                      <img
                        src={review.albumCover}
                        alt={review.albumTitle}
                        onError={handleImageError}
                        className="w-20 h-20 rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-foreground">{review.albumTitle}</h4>
                            {review.type === "track" && (
                              <Badge className="bg-secondary/15 text-secondary border-secondary/30 border px-1.5 py-0 text-xs flex-shrink-0">
                                <Music className="w-3 h-3" />
                              </Badge>
                            )}
                            {review.type === "album" && (
                              <Badge className="bg-chart-3/15 text-chart-3 border-chart-3/30 border px-1.5 py-0 text-xs flex-shrink-0">
                                <Disc className="w-3 h-3" />
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{review.albumArtist}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <StarRating rating={review.rating} size="sm" showNumber />
                        </div>
                      </div>
                      
                      {/* Personality Tags */}
                      {(review.mood || review.whereListened || review.whenListened || review.favoriteTrack) && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          {review.mood && (
                            <Badge className="bg-gradient-to-r from-primary/15 to-primary/5 text-foreground border-primary/20 border text-xs px-2 py-0.5 whitespace-normal">
                              {review.mood}
                            </Badge>
                          )}
                          {review.whereListened && (
                            <Badge className="bg-gradient-to-r from-secondary/15 to-secondary/5 text-foreground border-secondary/20 border text-xs px-2 py-0.5 whitespace-normal">
                              {review.whereListened}
                            </Badge>
                          )}
                          {review.whenListened && (
                            <Badge className="bg-gradient-to-r from-accent/15 to-accent/5 text-foreground border-accent/20 border text-xs px-2 py-0.5 whitespace-normal">
                              {review.whenListened}
                            </Badge>
                          )}
                          {review.favoriteTrack && (
                            <Badge className="bg-gradient-to-r from-chart-3/15 to-chart-3/5 text-foreground border-chart-3/20 border text-xs px-2 py-0.5 whitespace-normal">
                              ♫ {review.favoriteTrack}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <p className="text-sm text-foreground mb-3 line-clamp-2">{review.content}</p>
                      <div className="flex items-center gap-4 text-muted-foreground mb-3">
                        <button 
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            toggleReviewLike(review.id);
                          }}
                          className={`flex items-center gap-1.5 transition ${
                            isLiked ? "text-secondary" : "hover:text-secondary"
                          }`}
                          aria-pressed={isLiked}
                          aria-label={isLiked ? "Unlike review" : "Like review"}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? "fill-secondary" : ""}`} aria-hidden="true" />
                          {likeCount}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCommentReview(review);
                            setCommentsModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 hover:text-chart-3 transition"
                          aria-label="View comments"
                        >
                          <MessageCircle className="w-4 h-4" aria-hidden="true" />
                          {commentCount}
                        </button>
                        <div className="ml-auto flex items-center gap-2">
                          <EditedIndicator isEdited={review.isEdited} editedAt={review.editedAt} />
                          <span className="text-xs">{review.timestamp}</span>
                        </div>
                      </div>

                      {/* See More Info Button */}
                      <Button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleReviewClick(review);
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full border-primary/30 text-primary hover:bg-primary/10 hover:border-primary"
                        aria-label="See more info about review"
                      >
                        <Info className="w-4 h-4 mr-2" aria-hidden="true" />
                        See More Info
                      </Button>
                    </div>
                  </div>
                </Card>
                );
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* All Reviews */}
        <TabsContent value="all" className="space-y-4 mt-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-muted-foreground">
              Showing {myReviews.length} review{myReviews.length !== 1 ? 's' : ''}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-border hover:border-primary/50 hover:bg-primary/10"
              onClick={() => setFilterDialogOpen(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Filter
              {(filterRating !== null || sortBy !== "date-desc") && (
                <Badge className="ml-2 bg-primary text-primary-foreground border-0 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                  {(filterRating !== null ? 1 : 0) + (sortBy !== "date-desc" ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </div>

          <div className="grid gap-4">
            {myReviews.map((review, index) => {
              const isLiked = isReviewLiked(review.id);
              const likeCount = getReviewLikes(review.id);
              const commentCount = reviewComments[review.id]?.length || review.comments || 0;
              
              return (
              <Card 
                key={`${review.id}-${index}`}
                onClick={() => handleReviewClick(review)}
                className="p-6 bg-card border-border hover:border-primary/50 transition-all shadow-soft hover:shadow-medium cursor-pointer group"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex gap-4">
                  <div 
                    className="flex-shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAlbum?.();
                    }}
                  >
                    <img
                      src={review.albumCover}
                      alt={review.albumTitle}
                      onError={handleImageError}
                      className="w-32 h-32 rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg text-foreground mb-1">{review.albumTitle}</h3>
                        <p className="text-sm text-muted-foreground">{review.albumArtist}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
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
                    </div>

                    <p className="text-foreground mb-3">{review.content}</p>

                    {review.tags && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {review.tags.map((tag) => (
                          <Badge key={tag} className="bg-primary/10 text-primary border-0 hover:bg-primary/20 transition">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-muted-foreground">
                      <button 
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          toggleReviewLike(review.id);
                        }}
                        className={`flex items-center gap-1.5 transition ${
                          isLiked ? "text-secondary" : "hover:text-secondary"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? "fill-secondary" : ""}`} />
                        <span className="text-sm">{likeCount}</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCommentReview(review);
                          setCommentsModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 hover:text-chart-3 transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">{commentCount}</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(review);
                        }}
                        className="flex items-center gap-1.5 hover:text-foreground transition"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <div className="ml-auto flex items-center gap-2">
                        <EditedIndicator isEdited={review.isEdited} editedAt={review.editedAt} />
                        <span className="text-xs">{review.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
            })}
          </div>
        </TabsContent>

        {/* Suggestions - Recently Listened */}
        <TabsContent value="suggestions" className="space-y-6 mt-0">
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg text-foreground">Share Your Thoughts</h3>
                <p className="text-sm text-muted-foreground">Review songs you've recently listened to</p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-secondary" />
              <h3 className="text-xl text-foreground">Recently Listened</h3>
            </div>

            <div className="grid gap-4">
              {recentlyListened.map((activity, index) => (
                <Card 
                  key={activity.id}
                  className="p-5 bg-card border-border hover:border-primary/50 transition-all shadow-soft hover:shadow-medium cursor-pointer group"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex gap-4 items-center">
                    <div 
                      className="flex-shrink-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAlbum?.();
                      }}
                    >
                      <img
                        src={activity.albumCover}
                        alt={activity.trackTitle}
                        onError={handleImageError}
                        className="w-20 h-20 rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-foreground mb-1">{activity.trackTitle}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{activity.trackArtist}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Listened {activity.timestamp}</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => onNavigate?.("review")}
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            <Card className="p-8 bg-card border-border border-dashed">
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="bg-primary/10 p-4 rounded-full">
                    <Music className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <p className="text-foreground mb-2">Start listening to music</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your Spotify or Apple Music to see personalized recommendations
                </p>
                <Button 
                  onClick={() => onNavigate?.("settings-account")}
                  variant="outline"
                  className="border-border hover:border-primary/50 hover:bg-primary/10"
                >
                  Connect Account
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Detail Modal */}
      <ReviewDetailModal
        review={selectedReview}
        isOpen={reviewDetailModalOpen}
        onClose={() => setReviewDetailModalOpen(false)}
        onOpenComments={() => {
          setSelectedCommentReview(selectedReview);
          setCommentsModalOpen(true);
        }}
        onOpenAlbum={onOpenAlbum}
        onEditReview={(review) => {
          setReviewDetailModalOpen(false);
          onEditReview?.(review); // parent can open CreateReviewPage in edit mode
        }}
        onDeleteReview={(reviewId) => {
          deleteReview(reviewId);
          setReviewDetailModalOpen(false);
          toast.success("Review deleted successfully");
        }}
      />

      {/* Comments Modal */}
      {selectedCommentReview && (
        <CommentsModal
          isOpen={commentsModalOpen}
          onClose={() => {
            setCommentsModalOpen(false);
            setSelectedCommentReview(null);
          }}
          review={selectedCommentReview}
        />
      )}

      {/* Event Modal */}
      {selectedEventFromReminder && (
        <EventModal
          isOpen={eventModalOpen}
          onClose={() => {
            setEventModalOpen(false);
            setSelectedEventFromReminder(null);
          }}
          event={selectedEventFromReminder}
        />
      )}

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

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Filter & Sort Reviews</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Customize how your reviews are displayed
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Sort By Section */}
            <div className="space-y-3">
              <h4 className="text-sm text-foreground">Sort By</h4>
              <div className="grid gap-2">
                <Button
                  variant={sortBy === "date-desc" ? "default" : "outline"}
                  className={`w-full justify-start ${
                    sortBy === "date-desc" 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "border-border hover:border-primary/50 hover:bg-primary/10"
                  }`}
                  onClick={() => setSortBy("date-desc")}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Newest First
                </Button>
                <Button
                  variant={sortBy === "date-asc" ? "default" : "outline"}
                  className={`w-full justify-start ${
                    sortBy === "date-asc" 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "border-border hover:border-primary/50 hover:bg-primary/10"
                  }`}
                  onClick={() => setSortBy("date-asc")}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Oldest First
                </Button>
                <Button
                  variant={sortBy === "rating-desc" ? "default" : "outline"}
                  className={`w-full justify-start ${
                    sortBy === "rating-desc" 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "border-border hover:border-primary/50 hover:bg-primary/10"
                  }`}
                  onClick={() => setSortBy("rating-desc")}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Highest Rated
                </Button>
                <Button
                  variant={sortBy === "rating-asc" ? "default" : "outline"}
                  className={`w-full justify-start ${
                    sortBy === "rating-asc" 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "border-border hover:border-primary/50 hover:bg-primary/10"
                  }`}
                  onClick={() => setSortBy("rating-asc")}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Lowest Rated
                </Button>
                <Button
                  variant={sortBy === "album-az" ? "default" : "outline"}
                  className={`w-full justify-start ${
                    sortBy === "album-az" 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "border-border hover:border-primary/50 hover:bg-primary/10"
                  }`}
                  onClick={() => setSortBy("album-az")}
                >
                  <Music className="w-4 h-4 mr-2" />
                  Album A-Z
                </Button>
              </div>
            </div>

            {/* Filter by Rating Section */}
            <div className="space-y-3">
              <h4 className="text-sm text-foreground">Filter by Rating</h4>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={filterRating === null ? "default" : "outline"}
                  className={`${
                    filterRating === null 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "border-border hover:border-primary/50 hover:bg-primary/10"
                  }`}
                  onClick={() => setFilterRating(null)}
                >
                  All
                </Button>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <Button
                    key={rating}
                    variant={filterRating === rating ? "default" : "outline"}
                    className={`${
                      filterRating === rating 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "border-border hover:border-primary/50 hover:bg-primary/10"
                    }`}
                    onClick={() => setFilterRating(rating)}
                  >
                    <Star className="w-4 h-4 mr-1" />
                    {rating}
                  </Button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-border hover:border-primary/50 hover:bg-primary/10"
                onClick={() => {
                  setSortBy("date-desc");
                  setFilterRating(null);
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Clear All
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setFilterDialogOpen(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}