// src/lib/api/musicSearch.ts
// Music search API using iTunes Search API (no auth required)

export interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  year?: string;
  genre?: string;
  trackCount?: number;
  releaseDate?: string;
  url?: string;
  previewUrl?: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumCover: string;
  duration?: number;
  previewUrl?: string;
  url?: string;
}

interface iTunesAlbumResult {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100: string;
  artworkUrl60: string;
  releaseDate: string;
  primaryGenreName: string;
  trackCount: number;
  collectionType: string;
  collectionViewUrl?: string;
}

interface iTunesTrackResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  artworkUrl60: string;
  trackTimeMillis?: number;
  previewUrl?: string;
  kind: string;
  trackViewUrl?: string;
}

/**
 * Search for albums using iTunes Search API
 */
export async function searchAlbums(query: string, limit = 20, offset = 0): Promise<Album[]> {
  if (!query.trim()) return [];

  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=${limit}&offset=${offset}`
    );

    if (!response.ok) throw new Error("Search failed");

    const data = await response.json();
    
    // Filter and map results
    const albums = (data.results as iTunesAlbumResult[])
      .filter(item => item.collectionType === "Album")
      .map(item => ({
        id: String(item.collectionId),
        title: item.collectionName,
        artist: item.artistName,
        cover: item.artworkUrl100.replace("100x100", "600x600"), // Get high-res artwork
        year: new Date(item.releaseDate).getFullYear().toString(),
        genre: item.primaryGenreName,
        trackCount: item.trackCount,
        releaseDate: item.releaseDate,
        url: item.collectionViewUrl,
      }));

    return albums;
  } catch (error) {
    console.error("Album search error:", error);
    return [];
  }
}

/**
 * Search for tracks using iTunes Search API
 */
export async function searchTracks(query: string, limit = 20, offset = 0): Promise<Track[]> {
  if (!query.trim()) return [];

  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`
    );

    if (!response.ok) throw new Error("Search failed");

    const data = await response.json();
    
    // Filter and map results
    const tracks = (data.results as iTunesTrackResult[])
      .filter(item => item.kind === "song")
      .map(item => ({
        id: String(item.trackId),
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName,
        albumCover: item.artworkUrl100.replace("100x100", "600x600"),
        duration: item.trackTimeMillis,
        previewUrl: item.previewUrl,
        url: item.trackViewUrl,
      }));

    return tracks;
  } catch (error) {
    console.error("Track search error:", error);
    return [];
  }
}

/**
 * Search for both albums and tracks
 */
export async function searchMusic(query: string, limit = 20): Promise<{
  albums: Album[];
  tracks: Track[];
}> {
  const [albums, tracks] = await Promise.all([
    searchAlbums(query, Math.floor(limit / 2)),
    searchTracks(query, Math.floor(limit / 2)),
  ]);

  return { albums, tracks };
}
