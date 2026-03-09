import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar, MapPin, ExternalLink, Search, Music, Loader2, RefreshCw, Heart, Sparkles, Filter, DollarSign, Clock, X } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { EventModal } from "./EventModal";
import { SetReminderDialog } from "./SetReminderDialog";
import { BackButton } from "./BackButton";
import { getHipHopEvents, searchEvents, getArtistEvents, getEventById, type TicketmasterEvent } from "../lib/api/ticketmaster";
import { getFavorites } from "../lib/api/favorites";
import { toast } from "sonner";

interface EventCardProps {
  event: TicketmasterEvent;
  isPersonalized?: boolean;
  onCardClick: () => void;
  onSetReminder: () => void;
}

function EventCard({ event, isPersonalized, onCardClick, onSetReminder }: EventCardProps) {
  return (
    <Card
      className="overflow-hidden bg-card border-border hover:border-primary transition-all group cursor-pointer"
      onClick={onCardClick}
    >
      <div className="flex flex-col md:flex-row">
        {/* Event Image */}
        <div className="relative w-full md:w-48 h-48 md:h-auto overflow-hidden flex-shrink-0">
          <img
            src={event.thumbnail}
            alt={event.artistName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 flex gap-2">
            <Badge className="bg-primary text-primary-foreground">
              Live
            </Badge>
            {isPersonalized && (
              <Badge className="bg-secondary text-secondary-foreground">
                <Heart className="w-3 h-3 mr-1" />
                For You
              </Badge>
            )}
          </div>
        </div>

        {/* Event Details */}
        <div className="flex-1 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-foreground mb-2">{event.artistName}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 text-primary" />
                  {event.date} {event.time && `• ${event.time}`}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 text-secondary" />
                  {event.venue}, {event.city}
                </div>
                {event.price && (
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className={event.minPrice ? "text-green-500" : "text-muted-foreground"}>
                      {event.price}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 md:items-end">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(event.ticketLink, '_blank');
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Get Tickets
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetReminder();
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Remind Me
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface EventsPageProps {
  onNavigate?: (page: string, eventId?: string) => void;
  onBack?: () => void;
  canGoBack?: boolean;
  initialEventId?: string;
}

export function EventsPage({ onNavigate, onBack, canGoBack, initialEventId }: EventsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderEventData, setReminderEventData] = useState<any>(null);
  const [events, setEvents] = useState<TicketmasterEvent[]>([]);
  const [personalizedEvents, setPersonalizedEvents] = useState<TicketmasterEvent[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingPersonalized, setIsLoadingPersonalized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("for-you");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadedEventIds = useRef(new Set<string>());
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Filter states
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Load initial events and personalized recommendations
  useEffect(() => {
    loadEvents();
    loadPersonalizedEvents();
  }, []);

  // Open specific event when initialEventId is provided (from reminders)
  useEffect(() => {
    if (initialEventId) {
      const fetchAndOpenEvent = async () => {
        try {
          const event = await getEventById(initialEventId);
          if (event) {
            setSelectedEvent(event);
            setEventModalOpen(true);
          } else {
            toast.error('Could not find event details');
          }
        } catch (error) {
          console.error('Failed to fetch event:', error);
          toast.error('Failed to load event details');
        }
      };
      fetchAndOpenEvent();
    }
  }, [initialEventId]);

  // Search debounce
  useEffect(() => {
    if (!searchQuery) {
      loadEvents();
      return;
    }

    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  async function loadEvents(reset: boolean = true) {
    if (reset) {
      setIsLoading(true);
      setCurrentPage(0);
      loadedEventIds.current.clear();
    }
    setError(null);
    
    try {
      const result = await getHipHopEvents({ size: 50, page: reset ? 0 : currentPage });
      
      if (result.events.length === 0 && reset) {
        // No events found - show empty state
        console.log('No Ticketmaster events found');
        setEvents([]);
        setHasMore(false);
        toast.info('No events found. Check your Ticketmaster API key in .env for live events.');
      } else {
        // Filter out duplicates
        const newEvents = result.events.filter(event => !loadedEventIds.current.has(event.id));
        newEvents.forEach(event => loadedEventIds.current.add(event.id));
        
        if (reset) {
          setEvents(newEvents);
        } else {
          setEvents(prev => [...prev, ...newEvents]);
        }
        setHasMore(result.hasMore);
        
        if (reset && newEvents.length > 0) {
          toast.success(`Loaded ${newEvents.length} live events from Ticketmaster`);
        }
      }
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Failed to load events');
      if (reset) {
        setEvents([]); // Show empty state on error
      }
      setHasMore(false);
      toast.error('Failed to load live events. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  }

  const loadMoreEvents = useCallback(async () => {
    if (isLoadingMore || !hasMore || isLoading) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    
    try {
      const result = await getHipHopEvents({ size: 50, page: nextPage });
      
      // Filter out duplicates
      const newEvents = result.events.filter(event => !loadedEventIds.current.has(event.id));
      newEvents.forEach(event => loadedEventIds.current.add(event.id));
      
      if (newEvents.length > 0) {
        setEvents(prev => [...prev, ...newEvents]);
        setCurrentPage(nextPage);
        console.log(`📄 Loaded ${newEvents.length} more events (page ${nextPage + 1})`);
      }
      
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Failed to load more events:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMore, isLoading, isLoadingMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore && activeTab === 'discover') {
          loadMoreEvents();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, loadMoreEvents, activeTab]);

  async function loadPersonalizedEvents() {
    setIsLoadingPersonalized(true);
    
    try {
      // Get user's favorite artists from Supabase
      const favorites = await getFavorites('artist');
      const artistNames = favorites
        .map(f => f.item_artist || f.item_title)
        .filter((name): name is string => !!name);
      
      setFavoriteArtists(artistNames);
      
      if (artistNames.length === 0) {
        console.log('No favorite artists found for personalized recommendations');
        setPersonalizedEvents([]);
        return;
      }

      console.log('🎵 Loading concerts for favorite artists:', artistNames);
      
      // Fetch events for favorite artists
      const artistEvents = await getArtistEvents(artistNames.slice(0, 10), { size: 15 });
      
      if (artistEvents.length > 0) {
        setPersonalizedEvents(artistEvents);
        console.log(`🎫 Found ${artistEvents.length} personalized events`);
      }
    } catch (err) {
      console.error('Failed to load personalized events:', err);
    } finally {
      setIsLoadingPersonalized(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    
    try {
      const searchResults = await searchEvents(searchQuery, { size: 30 });
      
      if (searchResults.length === 0) {
        // No real events found - show empty state, don't fall back to mock
        setEvents([]);
        toast.info(`No upcoming concerts found for "${searchQuery}"`);
      } else {
        setEvents(searchResults);
        toast.success(`Found ${searchResults.length} events for "${searchQuery}"`);
      }
    } catch (err) {
      console.error('Search failed:', err);
      toast.error('Search failed. Try again.');
      setEvents([]); // Show empty state on search error
    } finally {
      setIsSearching(false);
    }
  }

  // Get unique locations for filter dropdown
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    events.forEach(event => {
      if (event.state) locations.add(event.state);
      else if (event.city) locations.add(event.city.split(',')[0]);
    });
    return Array.from(locations).sort();
  }, [events]);

  // Filter events based on all criteria
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Search query filter
    if (searchQuery) {
      filtered = filtered.filter(
        (event) =>
          event.artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Location filter (text-based, case-insensitive)
    if (locationFilter && locationFilter !== "all" && locationFilter.trim()) {
      const locationQuery = locationFilter.toLowerCase().trim();
      filtered = filtered.filter(event => 
        event.state?.toLowerCase().includes(locationQuery) || 
        event.city?.toLowerCase().includes(locationQuery) ||
        event.venue?.toLowerCase().includes(locationQuery)
      );
    }

    // Price filter
    if (priceFilter !== "all") {
      filtered = filtered.filter(event => {
        if (!event.minPrice) return priceFilter === "unknown";
        switch (priceFilter) {
          case "under50": return event.minPrice < 50;
          case "50to100": return event.minPrice >= 50 && event.minPrice <= 100;
          case "100to200": return event.minPrice > 100 && event.minPrice <= 200;
          case "over200": return event.minPrice > 200;
          default: return true;
        }
      });
    }

    // Date filter
    if (dateFilter !== "all") {
      const today = new Date();
      const eventDate = (event: TicketmasterEvent) => new Date(event.dateISO);
      
      filtered = filtered.filter(event => {
        const date = eventDate(event);
        const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (dateFilter) {
          case "thisWeek": return diffDays >= 0 && diffDays <= 7;
          case "thisMonth": return diffDays >= 0 && diffDays <= 30;
          case "next3Months": return diffDays >= 0 && diffDays <= 90;
          case "next6Months": return diffDays >= 0 && diffDays <= 180;
          default: return true;
        }
      });
    }

    return filtered;
  }, [events, searchQuery, locationFilter, priceFilter, dateFilter]);

  // Check if any filters are active
  const hasActiveFilters = (locationFilter !== "all" && locationFilter.trim() !== "") || priceFilter !== "all" || dateFilter !== "all";

  const clearFilters = () => {
    setLocationFilter("all");
    setPriceFilter("all");
    setDateFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {onBack && (
        <BackButton onClick={onBack} label={canGoBack ? "Back" : "Back to Home"} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2">Concerts & Events</h1>
          <p className="text-muted-foreground">
            Find live shows from your favorite hip-hop artists
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={loadEvents}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
        )}
        <Input
          type="text"
          placeholder="Search by artist, venue, or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 pr-10 bg-card border-border"
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {[(locationFilter !== "all" && locationFilter.trim() !== ""), priceFilter !== "all", dateFilter !== "all"].filter(Boolean).length}
            </Badge>
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="w-3 h-3" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-card border border-border rounded-lg">
          {/* Location Filter */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="City or state..."
                value={locationFilter === "all" ? "" : locationFilter}
                onChange={(e) => setLocationFilter(e.target.value || "all")}
                className="bg-background pr-8"
                list="location-suggestions"
              />
              {locationFilter && locationFilter !== "all" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-muted"
                  onClick={() => setLocationFilter("all")}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
              <datalist id="location-suggestions">
                {uniqueLocations.map(location => (
                  <option key={location} value={location} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Price Filter */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Price Range
            </label>
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Any price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any price</SelectItem>
                <SelectItem value="under50">Under $50</SelectItem>
                <SelectItem value="50to100">$50 - $100</SelectItem>
                <SelectItem value="100to200">$100 - $200</SelectItem>
                <SelectItem value="over200">Over $200</SelectItem>
                <SelectItem value="unknown">Price TBA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Filter */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Date
            </label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Any date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any date</SelectItem>
                <SelectItem value="thisWeek">This week</SelectItem>
                <SelectItem value="thisMonth">This month</SelectItem>
                <SelectItem value="next3Months">Next 3 months</SelectItem>
                <SelectItem value="next6Months">Next 6 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Results count */}
      {(hasActiveFilters || searchQuery || events.length > 0) && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <span>
            {hasActiveFilters || searchQuery 
              ? `Showing ${filteredEvents.length} of ${events.length} loaded events`
              : `${events.length} events loaded`}
          </span>
          {hasMore && !hasActiveFilters && !searchQuery && (
            <Badge variant="outline" className="text-xs">More available</Badge>
          )}
        </div>
      )}

      {/* Tabs for For You / Discover */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-card">
          <TabsTrigger value="for-you" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            For You
          </TabsTrigger>
          <TabsTrigger value="discover" className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            Discover
          </TabsTrigger>
        </TabsList>

        {/* For You Tab - Personalized Recommendations */}
        <TabsContent value="for-you" className="mt-6">
          {isLoadingPersonalized ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Finding concerts based on your favorites...</p>
            </div>
          ) : personalizedEvents.length > 0 ? (
            <div className="space-y-4">
              {favoriteArtists.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Heart className="w-4 h-4 text-secondary" />
                  <span>Based on: {favoriteArtists.slice(0, 5).join(', ')}{favoriteArtists.length > 5 ? ` +${favoriteArtists.length - 5} more` : ''}</span>
                </div>
              )}
              <div className="grid gap-4">
                {personalizedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isPersonalized={true}
                    onCardClick={() => {
                      setSelectedEvent(event);
                      setEventModalOpen(true);
                    }}
                    onSetReminder={() => {
                      setReminderEventData(event);
                      setReminderDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Heart}
              title="No Personalized Recommendations Yet"
              description={
                favoriteArtists.length === 0
                  ? "Start favoriting artists to see concert recommendations based on your taste!"
                  : "No upcoming concerts found for your favorite artists. Check back soon!"
              }
              action={
                favoriteArtists.length === 0 ? (
                  <Button variant="outline" onClick={() => onNavigate?.('discover')}>
                    <Music className="w-4 h-4 mr-2" />
                    Discover Artists
                  </Button>
                ) : undefined
              }
            />
          )}
        </TabsContent>

        {/* Discover Tab - All Hip-Hop Events */}
        <TabsContent value="discover" className="mt-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading events...</p>
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-4">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onCardClick={() => {
                      setSelectedEvent(event);
                      setEventModalOpen(true);
                    }}
                    onSetReminder={() => {
                      setReminderEventData(event);
                      setReminderDialogOpen(true);
                    }}
                  />
                ))}
              </div>
              
              {/* Infinite scroll trigger */}
              <div ref={loadMoreRef} className="py-4">
                {isLoadingMore && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Loading more events...</span>
                  </div>
                )}
                {!hasMore && events.length > 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    You've seen all {events.length} available events
                  </p>
                )}
                {hasMore && !isLoadingMore && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={loadMoreEvents}
                  >
                    Load More Events
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Music}
              title="No Events Found"
              description={
                searchQuery
                  ? `No events found for "${searchQuery}". Try different keywords.`
                  : "No upcoming events at the moment. Check back soon!"
              }
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Powered by Ticketmaster */}
      <div className="text-center pt-8">
        <p className="text-xs text-muted-foreground">
          Event data powered by Ticketmaster API
        </p>
      </div>

      {/* Event Modal */}
      <EventModal
        event={selectedEvent}
        isOpen={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false);
          setSelectedEvent(null);
        }}
      />

      {/* Set Reminder Dialog */}
      <SetReminderDialog
        isOpen={reminderDialogOpen}
        onClose={() => {
          setReminderDialogOpen(false);
          setReminderEventData(null);
        }}
        defaultData={reminderEventData ? {
          type: 'event',
          title: reminderEventData.artistName,
          description: `Live at ${reminderEventData.venue}`,
          date: reminderEventData.dateISO || new Date(reminderEventData.date).toISOString().split('T')[0],
          thumbnail: reminderEventData.thumbnail,
          location: `${reminderEventData.venue}, ${reminderEventData.city}`,
          eventId: reminderEventData.id
        } : undefined}
      />
    </div>
  );
}