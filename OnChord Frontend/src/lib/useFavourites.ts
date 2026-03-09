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
  releaseDate?: string;
  trackCount?: number;
  addedAt: string;
}

const FAVOURITES_KEY = 'onchord_favourites';

interface FavouritesData {
  songs: FavouriteSong[];
  albums: FavouriteAlbum[];
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
        setFavourites(parsed);
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
