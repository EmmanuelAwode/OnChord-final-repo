import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Placeholder image for broken album covers */
export const ALBUM_PLACEHOLDER = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop";

/**
 * Fixes Spotify image URLs that might be missing the CDN prefix.
 * Some data may have only the image ID (e.g., "ab67616d0000b273...") 
 * instead of the full URL.
 */
export function fixSpotifyImageUrl(url: string | null | undefined): string {
  if (!url) return ALBUM_PLACEHOLDER;
  
  // Already a full URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  
  // Spotify image ID pattern (starts with ab67616d)
  if (url.startsWith("ab67616d")) {
    return `https://i.scdn.co/image/${url}`;
  }
  
  // Return placeholder for invalid URLs
  return url || ALBUM_PLACEHOLDER;
}

/**
 * Image error handler - sets src to placeholder
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.src = ALBUM_PLACEHOLDER;
}
