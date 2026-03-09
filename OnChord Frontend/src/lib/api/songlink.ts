// src/lib/api/songlink.ts
// Odesli/song.link API — converts iTunes URLs to Spotify, Apple Music, YouTube Music, etc.
// No auth required. Rate limit: 10 req/min without API key.

export interface SonglinkResult {
  spotifyUrl?: string;
  appleMusicUrl?: string;
  youtubeMusicUrl?: string;
  tidalUrl?: string;
  deezerUrl?: string;
  pageUrl?: string; // Universal song.link page
}

/**
 * Given an iTunes/Apple Music URL, resolve direct links to all major platforms.
 * Uses the Odesli (song.link) API.
 */
export async function getSonglinkData(iTunesUrl: string): Promise<SonglinkResult> {
  if (!iTunesUrl) return {};

  try {
    const response = await fetch(
      `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(iTunesUrl)}&songIfSingle=true&userCountry=US`
    );

    if (!response.ok) {
      console.warn('Songlink API error:', response.status);
      return {};
    }

    const data = await response.json();

    return {
      spotifyUrl: data.linksByPlatform?.spotify?.url || undefined,
      appleMusicUrl: data.linksByPlatform?.appleMusic?.url || undefined,
      youtubeMusicUrl: data.linksByPlatform?.youtubeMusic?.url || undefined,
      tidalUrl: data.linksByPlatform?.tidal?.url || undefined,
      deezerUrl: data.linksByPlatform?.deezer?.url || undefined,
      pageUrl: data.pageUrl || undefined,
    };
  } catch (error) {
    console.error('Songlink lookup failed:', error);
    return {};
  }
}
