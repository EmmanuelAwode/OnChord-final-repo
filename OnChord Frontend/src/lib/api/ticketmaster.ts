// Ticketmaster API integration for fetching live events
// Uses Supabase Edge Function proxy to avoid CORS issues

const TICKETMASTER_API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use Supabase Edge Function proxy to avoid CORS in both dev and production
// Falls back to Vite dev proxy if running locally without Supabase
const TICKETMASTER_PROXY_URL = SUPABASE_URL 
  ? `${SUPABASE_URL}/functions/v1/ticketmaster-proxy`
  : '/api/ticketmaster/discovery/v2';

// Headers for Supabase Edge Function calls
const getSupabaseHeaders = () => ({
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'apikey': SUPABASE_ANON_KEY || '',
});

// Rate limiter for Ticketmaster API (max 5 requests per second)
class RateLimiter {
  private lastRequestTime = 0;
  private minInterval: number;

  constructor(requestsPerSecond: number = 4) { // Use 4 to be safe (under 5 limit)
    this.minInterval = 1000 / requestsPerSecond;
  }

  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }
}

const rateLimiter = new RateLimiter(4); // 4 requests per second to stay under limit

export interface TicketmasterEvent {
  id: string;
  artistName: string;
  eventName: string;
  venue: string;
  city: string;
  state?: string;
  country?: string;
  date: string;
  dateISO: string;
  time: string;
  price: string;
  minPrice?: number;
  maxPrice?: number;
  description: string;
  thumbnail: string;
  ticketLink: string;
  latitude?: number;
  longitude?: number;
}

interface TicketmasterAPIEvent {
  id: string;
  name: string;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
    };
  };
  priceRanges?: Array<{
    min: number;
    max: number;
    currency: string;
  }>;
  images: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  url: string;
  info?: string;
  _embedded?: {
    venues: Array<{
      name: string;
      city: {
        name: string;
      };
      state?: {
        name: string;
        stateCode: string;
      };
      country: {
        name: string;
        countryCode: string;
      };
      location?: {
        latitude: string;
        longitude: string;
      };
    }>;
    attractions?: Array<{
      name: string;
    }>;
  };
}

/**
 * Search for events by keyword (artist name, genre, etc.)
 */
export async function searchEvents(
  keyword: string,
  options: {
    size?: number;
    page?: number;
    city?: string;
    stateCode?: string;
    countryCode?: string;
    startDateTime?: string;
    endDateTime?: string;
  } = {}
): Promise<TicketmasterEvent[]> {
  // Check if we have either edge function URL or direct API key
  if (!SUPABASE_URL && !TICKETMASTER_API_KEY) {
    console.warn('Ticketmaster API not configured. Please set VITE_SUPABASE_URL or VITE_TICKETMASTER_API_KEY');
    return [];
  }

  try {
    // Format datetime without milliseconds (Ticketmaster requirement)
    const startDateTime = new Date().toISOString().split('.')[0] + 'Z';
    
    const params = new URLSearchParams({
      keyword,
      classificationName: 'Music', // Filter to music events only
      size: (options.size || 20).toString(),
      page: (options.page || 0).toString(),
      sort: 'date,asc',
      startDateTime: options.startDateTime || startDateTime, // Only future events
    });

    // Add optional filters
    if (options.city) params.append('city', options.city);
    if (options.stateCode) params.append('stateCode', options.stateCode);
    if (options.countryCode) params.append('countryCode', options.countryCode);
    if (options.endDateTime) params.append('endDateTime', options.endDateTime);

    // If using Supabase proxy, add endpoint param
    if (SUPABASE_URL) {
      params.append('endpoint', '/events.json');
    } else {
      // Using Vite dev proxy - add API key directly
      params.append('apikey', TICKETMASTER_API_KEY!);
    }

    // Apply rate limiting to avoid 429 errors
    await rateLimiter.throttle();

    const url = SUPABASE_URL
      ? `${TICKETMASTER_PROXY_URL}?${params.toString()}`
      : `/api/ticketmaster/discovery/v2/events.json?${params.toString()}`;

    const response = await fetch(url, SUPABASE_URL ? { headers: getSupabaseHeaders() } : undefined);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('🔍 Search API error:', errorBody);
      throw new Error(`Ticketmaster API error: ${response.statusText}`);
    }

    const data = await response.json();
    const events = data._embedded?.events || [];

    return events.map((event: TicketmasterAPIEvent) => transformEvent(event));
  } catch (error) {
    console.error('Failed to fetch events from Ticketmaster:', error);
    return [];
  }
}

/**
 * Get events for specific artists (comma-separated artist names)
 */
export async function getArtistEvents(
  artistNames: string[],
  options: {
    size?: number;
    countryCode?: string;
  } = {}
): Promise<TicketmasterEvent[]> {
  if (!TICKETMASTER_API_KEY) {
    console.warn('Ticketmaster API key not found');
    return [];
  }

  try {
    // Format datetime without milliseconds (Ticketmaster requirement)
    const startDateTime = new Date().toISOString().split('.')[0] + 'Z';
    
    // Limit artists to avoid too many requests (max 5 to stay under rate limits)
    const limitedArtists = artistNames.slice(0, 5);
    
    // Fetch events for artists sequentially to respect rate limits
    const allEvents: TicketmasterEvent[][] = [];
    for (const artistName of limitedArtists) {
      const events = await searchEvents(artistName, {
        size: options.size || 10,
        countryCode: options.countryCode || 'US',
        startDateTime,
      });
      allEvents.push(events);
    }
    
    // Flatten and deduplicate
    const uniqueEvents = new Map<string, TicketmasterEvent>();
    allEvents.flat().forEach(event => {
      if (!uniqueEvents.has(event.id)) {
        uniqueEvents.set(event.id, event);
      }
    });

    // Sort by date
    return Array.from(uniqueEvents.values()).sort((a, b) => 
      new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime()
    );
  } catch (error) {
    console.error('Failed to fetch artist events:', error);
    return [];
  }
}

/**
 * Get events near a specific location
 */
export async function getEventsNearLocation(
  latitude: number,
  longitude: number,
  radiusMiles: number = 50,
  options: {
    size?: number;
    startDateTime?: string;
  } = {}
): Promise<TicketmasterEvent[]> {
  if (!SUPABASE_URL && !TICKETMASTER_API_KEY) {
    console.warn('Ticketmaster API not configured');
    return [];
  }

  try {
    const params = new URLSearchParams({
      classificationName: 'Music',
      latlong: `${latitude},${longitude}`,
      radius: radiusMiles.toString(),
      unit: 'miles',
      size: (options.size || 20).toString(),
      sort: 'date,asc',
    });

    if (options.startDateTime) {
      // Remove milliseconds if present
      const cleanDateTime = options.startDateTime.includes('.') 
        ? options.startDateTime.split('.')[0] + 'Z' 
        : options.startDateTime;
      params.append('startDateTime', cleanDateTime);
    } else {
      params.append('startDateTime', new Date().toISOString().split('.')[0] + 'Z');
    }

    // If using Supabase proxy, add endpoint param
    if (SUPABASE_URL) {
      params.append('endpoint', '/events.json');
    } else {
      params.append('apikey', TICKETMASTER_API_KEY!);
    }

    // Apply rate limiting to avoid 429 errors
    await rateLimiter.throttle();

    const url = SUPABASE_URL
      ? `${TICKETMASTER_PROXY_URL}?${params.toString()}`
      : `/api/ticketmaster/discovery/v2/events.json?${params.toString()}`;

    const response = await fetch(url, SUPABASE_URL ? { headers: getSupabaseHeaders() } : undefined);

    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.statusText}`);
    }

    const data = await response.json();
    const events = data._embedded?.events || [];

    return events.map((event: TicketmasterAPIEvent) => transformEvent(event));
  } catch (error) {
    console.error('Failed to fetch nearby events:', error);
    return [];
  }
}

/**
 * Get hip-hop specific events
 */
export async function getHipHopEvents(
  options: {
    size?: number;
    page?: number;
    city?: string;
    stateCode?: string;
    countryCode?: string;
  } = {}
): Promise<{ events: TicketmasterEvent[]; hasMore: boolean; totalPages: number }> {
  if (!SUPABASE_URL && !TICKETMASTER_API_KEY) {
    console.warn('Ticketmaster API not configured');
    return { events: [], hasMore: false, totalPages: 0 };
  }

  try {
    // Format datetime without milliseconds (Ticketmaster requirement)
    const startDateTime = new Date().toISOString().split('.')[0] + 'Z';
    
    // Use segmentId for Music (KZFzniwnSyZfZ7v7nJ) and genreId for Hip-Hop/Rap (KnvZfZ7vAv1)
    // Also include R&B genre (KnvZfZ7vAee) for more results
    const params = new URLSearchParams({
      segmentId: 'KZFzniwnSyZfZ7v7nJ', // Music segment
      genreId: 'KnvZfZ7vAv1,KnvZfZ7vAee', // Hip-Hop/Rap + R&B
      size: (options.size || 50).toString(),
      page: (options.page || 0).toString(),
      sort: 'date,asc',
      startDateTime,
    });

    if (options.city) params.append('city', options.city);
    if (options.stateCode) params.append('stateCode', options.stateCode);
    if (options.countryCode) params.append('countryCode', options.countryCode || 'US');

    // If using Supabase proxy, add endpoint param
    if (SUPABASE_URL) {
      params.append('endpoint', '/events.json');
    } else {
      params.append('apikey', TICKETMASTER_API_KEY!);
    }

    // Apply rate limiting to avoid 429 errors
    await rateLimiter.throttle();

    const url = SUPABASE_URL
      ? `${TICKETMASTER_PROXY_URL}?${params.toString()}`
      : `/api/ticketmaster/discovery/v2/events.json?${params.toString()}`;

    const response = await fetch(url, SUPABASE_URL ? { headers: getSupabaseHeaders() } : undefined);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('🎫 Ticketmaster API error response:', errorBody);
      throw new Error(`Ticketmaster API error: ${response.statusText}`);
    }

    const data = await response.json();
    const currentPage = data.page?.number || 0;
    const totalPages = data.page?.totalPages || 1;
    const hasMore = currentPage < totalPages - 1;
    const events = data._embedded?.events || [];

    return {
      events: events.map((event: TicketmasterAPIEvent) => transformEvent(event)),
      hasMore,
      totalPages,
    };
  } catch (error) {
    console.error('Failed to fetch hip-hop events:', error);
    return { events: [], hasMore: false, totalPages: 0 };
  }
}

/**
 * Transform Ticketmaster API event to our format
 */
function transformEvent(event: TicketmasterAPIEvent): TicketmasterEvent {
  const venue = event._embedded?.venues?.[0];
  // Get artist from attractions, or extract from event name
  const attractionName = event._embedded?.attractions?.[0]?.name;
  // Use attraction name if available, otherwise use event name as artist
  const artist = attractionName || event.name;
  // Full event name (usually includes tour name, etc.)
  const eventName = event.name;
  const image = event.images
    .sort((a, b) => b.width - a.width)[0]; // Get highest resolution image

  // Format date
  const date = new Date(event.dates.start.localDate);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Format time
  let timeStr = 'TBA';
  if (event.dates.start.localTime) {
    const time = event.dates.start.localTime.split(':');
    const hour = parseInt(time[0]);
    const minute = time[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    timeStr = `${displayHour}:${minute} ${ampm}`;
  }

  // Format price
  let priceStr = 'Price varies';
  if (event.priceRanges && event.priceRanges.length > 0) {
    const minPrice = Math.round(event.priceRanges[0].min);
    const maxPrice = Math.round(event.priceRanges[0].max);
    const currency = event.priceRanges[0].currency === 'USD' ? '$' : event.priceRanges[0].currency;
    priceStr = `${currency}${minPrice} - ${currency}${maxPrice}`;
  }

  // Build city string
  let cityStr = venue?.city?.name || 'Location TBA';
  if (venue?.state?.stateCode) {
    cityStr += `, ${venue.state.stateCode}`;
  } else if (venue?.country?.countryCode && venue.country.countryCode !== 'US') {
    cityStr += `, ${venue.country.countryCode}`;
  }

  // Extract numeric prices for filtering
  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  if (event.priceRanges && event.priceRanges.length > 0) {
    minPrice = event.priceRanges[0].min;
    maxPrice = event.priceRanges[0].max;
  }

  return {
    id: event.id,
    artistName: artist,
    eventName: eventName,
    venue: venue?.name || 'Venue TBA',
    city: cityStr,
    state: venue?.state?.name,
    country: venue?.country?.name,
    date: formattedDate,
    dateISO: event.dates.start.localDate,
    time: timeStr,
    price: priceStr,
    minPrice,
    maxPrice,
    description: event.info || `See ${artist} live at ${venue?.name || 'this venue'}!`,
    thumbnail: image?.url || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400',
    ticketLink: event.url,
    latitude: venue?.location ? parseFloat(venue.location.latitude) : undefined,
    longitude: venue?.location ? parseFloat(venue.location.longitude) : undefined,
  };
}

/**
 * Get user's location and fetch nearby events
 */
export async function getEventsNearMe(
  options: {
    size?: number;
    radiusMiles?: number;
  } = {}
): Promise<TicketmasterEvent[]> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      // Fallback to US-wide hip-hop events
      getHipHopEvents({ size: options.size || 20 }).then(result => resolve(result.events));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const events = await getEventsNearLocation(
          latitude,
          longitude,
          options.radiusMiles || 50,
          { size: options.size || 20 }
        );
        resolve(events);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        // Fallback to US-wide hip-hop events
        getHipHopEvents({ size: options.size || 20 }).then(result => resolve(result.events));
      }
    );
  });
}

/**
 * Get a single event by ID
 */
export async function getEventById(eventId: string): Promise<TicketmasterEvent | null> {
  if (!SUPABASE_URL && !TICKETMASTER_API_KEY) {
    console.warn('Ticketmaster API not configured');
    return null;
  }

  try {
    // Apply rate limiting to avoid 429 errors
    await rateLimiter.throttle();

    let url: string;
    if (SUPABASE_URL) {
      const params = new URLSearchParams({ endpoint: `/events/${eventId}.json` });
      url = `${TICKETMASTER_PROXY_URL}?${params.toString()}`;
    } else {
      url = `/api/ticketmaster/discovery/v2/events/${eventId}.json?apikey=${TICKETMASTER_API_KEY}`;
    }

    const response = await fetch(url, SUPABASE_URL ? { headers: getSupabaseHeaders() } : undefined);

    if (!response.ok) {
      console.error('Failed to fetch event:', response.statusText);
      return null;
    }

    const event = await response.json();
    return transformEvent(event);
  } catch (error) {
    console.error('Failed to fetch event by ID:', error);
    return null;
  }
}
