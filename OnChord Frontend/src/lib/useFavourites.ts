import { useState, useEffect } from 'react';

export interface FavouriteSong {
  id: string;
  title: string;
  artist: string;
  albumId: string;
  albumCover: string;
  duration?: string;
  addedAt: string;
}

export interface FavouriteAlbum {
  id: string;
  title: string;
  artist: string;
  cover: string;
  releaseType?: string;
  releaseDate?: string;
  trackCount?: number;
  addedAt: string;
}

const FAVOURITES_KEY = 'onchord_favourites';

interface FavouritesData {
  songs: FavouriteSong[];
  albums: FavouriteAlbum[];
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function normalizeFavouritesData(raw: unknown): FavouritesData {
  const fallback: FavouritesData = { songs: [], albums: [] };
  if (!raw || typeof raw !== "object") return fallback;

  const source = raw as { songs?: unknown[]; albums?: unknown[] };
  const songsInput = Array.isArray(source.songs) ? source.songs : [];
  const albumsInput = Array.isArray(source.albums) ? source.albums : [];

  const songsById = new Map<string, FavouriteSong>();
  const albumsById = new Map<string, FavouriteAlbum>();

  const maybeAddSong = (item: any) => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.title !== "string") return;
    if (songsById.has(item.id)) return;
    songsById.set(item.id, {
      id: item.id,
      title: item.title,
      artist: typeof item.artist === "string" ? item.artist : "Unknown",
      albumId: typeof item.albumId === "string" ? item.albumId : "",
      albumCover: typeof item.albumCover === "string" ? item.albumCover : (typeof item.cover === "string" ? item.cover : ""),
      duration: typeof item.duration === "string" ? item.duration : undefined,
      addedAt: isValidDate(item.addedAt) ? item.addedAt : new Date().toISOString(),
    });
  };

  const maybeAddAlbum = (item: any) => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.title !== "string") return;
    if (albumsById.has(item.id)) return;
    albumsById.set(item.id, {
      id: item.id,
      title: item.title,
      artist: typeof item.artist === "string" ? item.artist : "Unknown",
      cover: typeof item.cover === "string" ? item.cover : (typeof item.albumCover === "string" ? item.albumCover : ""),
      releaseType: typeof item.releaseType === "string" ? item.releaseType : undefined,
      releaseDate: typeof item.releaseDate === "string" ? item.releaseDate : undefined,
      trackCount: typeof item.trackCount === "number" ? item.trackCount : undefined,
      addedAt: isValidDate(item.addedAt) ? item.addedAt : new Date().toISOString(),
    });
  };

  for (const item of songsInput) {
    maybeAddSong(item);
  }

  for (const item of albumsInput) {
    const looksLikeSingle =
      (typeof item?.releaseType === "string" && item.releaseType.toLowerCase() === "single") ||
      item?.trackCount === 1 ||
      String(item?.title || "").toLowerCase().endsWith("- single");

    if (looksLikeSingle) {
      maybeAddSong({
        ...item,
        albumId: typeof item?.albumId === "string" ? item.albumId : item?.id,
        albumCover: typeof item?.albumCover === "string" ? item.albumCover : item?.cover,
      });
      continue;
    }

    maybeAddAlbum(item);
  }

  return {
    songs: Array.from(songsById.values()),
    albums: Array.from(albumsById.values()),
  };
}

export function useFavourites() {
  const [favourites, setFavourites] = useState<FavouritesData>({
    songs: [],
    albums: [],
  });

  // Load favourites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(FAVOURITES_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFavourites(normalizeFavouritesData(parsed));
      } catch (error) {
        console.error('Failed to parse favourites:', error);
        setFavourites({ songs: [], albums: [] });
      }
    }
  }, []);

  // Save favourites to localStorage whenever they change
  useEffect(() => {
    if (favourites.songs.length > 0 || favourites.albums.length > 0 || localStorage.getItem(FAVOURITES_KEY)) {
      localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
    }
  }, [favourites]);

  const addSong = (song: Omit<FavouriteSong, 'addedAt'>) => {
    const newSong: FavouriteSong = {
      ...song,
      addedAt: new Date().toISOString(),
    };
    setFavourites(prev => ({
      ...prev,
      songs: [...prev.songs, newSong],
    }));
    return newSong;
  };

  const removeSong = (songId: string) => {
    setFavourites(prev => ({
      ...prev,
      songs: prev.songs.filter(s => s.id !== songId),
    }));
  };

  const addAlbum = (album: Omit<FavouriteAlbum, 'addedAt'>) => {
    const newAlbum: FavouriteAlbum = {
      ...album,
      addedAt: new Date().toISOString(),
    };
    setFavourites(prev => ({
      ...prev,
      albums: [...prev.albums, newAlbum],
    }));
    return newAlbum;
  };

  const removeAlbum = (albumId: string) => {
    setFavourites(prev => ({
      ...prev,
      albums: prev.albums.filter(a => a.id !== albumId),
    }));
  };

  const isSongFavourite = (songId: string) => {
    return favourites.songs.some(s => s.id === songId);
  };

  const isAlbumFavourite = (albumId: string) => {
    return favourites.albums.some(a => a.id === albumId);
  };

  const toggleSong = (song: Omit<FavouriteSong, 'addedAt'>) => {
    if (isSongFavourite(song.id)) {
      removeSong(song.id);
      return false;
    } else {
      addSong(song);
      return true;
    }
  };

  const toggleAlbum = (album: Omit<FavouriteAlbum, 'addedAt'>) => {
    if (isAlbumFavourite(album.id)) {
      removeAlbum(album.id);
      return false;
    } else {
      addAlbum(album);
      return true;
    }
  };

  return {
    favourites,
    addSong,
    removeSong,
    addAlbum,
    removeAlbum,
    isSongFavourite,
    isAlbumFavourite,
    toggleSong,
    toggleAlbum,
  };
}
