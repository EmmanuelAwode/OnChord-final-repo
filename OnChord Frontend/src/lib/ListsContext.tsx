import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { fixSpotifyImageUrl } from "../components/ui/utils";

export interface ListAlbum {
  id: string;
  title: string;
  artist: string;
  cover: string;
  year?: number;
  genre?: string;
}

export interface ListSong {
  id: string;
  title: string;
  artist: string;
  cover: string;
  duration?: string;
  album?: string;
  previewUrl?: string;
  appleMusicUrl?: string;
  spotifyUrl?: string;
}

export interface MusicList {
  id: string;
  title: string;
  description: string;
  albumCount: number;
  songCount?: number;
  coverImages: string[];
  customCover?: string;
  albums?: ListAlbum[];
  songs?: ListSong[];
  createdAt?: string;
  updatedAt?: string;
  visibility?: "public" | "private" | "friends";
  userId?: string;
}

interface ListsContextType {
  userLists: Record<string, ListAlbum[]>;
  userListsMetadata: Record<string, MusicList>;
  isLoading: boolean;
  createList: (listData: {
    title: string;
    description: string;
    visibility: "public" | "private" | "friends";
    albums: ListAlbum[];
    songs?: ListSong[];
  }) => Promise<string>;
  deleteList: (listId: string) => Promise<void>;
  updateList: (listData: {
    id: string;
    title: string;
    description: string;
    visibility: "public" | "private" | "friends";
    albums: ListAlbum[];
    songs?: ListSong[];
  }) => Promise<void>;
  addAlbumToList: (listId: string, album: ListAlbum) => Promise<void>;
  removeAlbumFromList: (listId: string, albumId: string) => Promise<void>;
  getListAlbums: (listId: string) => ListAlbum[];
  isAlbumInList: (listId: string, albumId: string) => boolean;
  addSongToList: (listId: string, song: ListSong) => Promise<void>;
  removeSongFromList: (listId: string, songId: string) => Promise<void>;
  isSongInList: (listId: string, songId: string) => boolean;
  updateListCover: (listId: string, coverUrl: string) => Promise<void>;
  refreshLists: () => Promise<void>;
}

const ListsContext = createContext<ListsContextType | null>(null);

export function ListsProvider({ children }: { children: ReactNode }) {
  const [userLists, setUserLists] = useState<Record<string, ListAlbum[]>>({});
  const [userListsMetadata, setUserListsMetadata] = useState<Record<string, MusicList>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Load lists from Supabase
  const loadLists = useCallback(async (uid: string) => {
    setIsLoading(true);
    try {
      // Fetch user's lists
      const { data: lists, error: listsError } = await supabase
        .from("music_lists")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (listsError) throw listsError;

      // Fetch all items for user's lists
      const listIds = lists?.map(l => l.id) || [];
      let items: any[] = [];
      
      if (listIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from("list_items")
          .select("*")
          .in("list_id", listIds)
          .order("position", { ascending: true });

        if (itemsError) throw itemsError;
        items = itemsData || [];
      }

      // Transform data to local format
      const newMetadata: Record<string, MusicList> = {};
      const newLists: Record<string, ListAlbum[]> = {};

      for (const list of lists || []) {
        const listItems = items.filter(i => i.list_id === list.id);
        const albums = listItems
          .filter(i => i.item_type === "album" || !i.item_type)
          .map(i => ({
            id: i.album_id || i.id,
            title: i.album_title || "",
            artist: i.album_artist || "",
            cover: fixSpotifyImageUrl(i.album_cover),
          }));
        const songs = listItems
          .filter(i => i.item_type === "song")
          .map(i => ({
            id: i.song_id || i.id,
            title: i.song_title || "",
            artist: i.song_artist || "",
            cover: fixSpotifyImageUrl(i.song_cover),
            duration: i.duration,
            album: i.album_name,
            previewUrl: i.preview_url,
            appleMusicUrl: i.apple_music_url,
            spotifyUrl: i.spotify_url,
          }));

        const allCovers = [...albums.map(a => a.cover), ...songs.map(s => s.cover)];

        newMetadata[list.id] = {
          id: list.id,
          title: list.title,
          description: list.description || "",
          albumCount: albums.length,
          songCount: songs.length,
          coverImages: allCovers.slice(0, 4),
          albums,
          songs,
          visibility: list.visibility || (list.is_public ? "public" : "private"),
          createdAt: list.created_at,
          updatedAt: list.updated_at,
          userId: list.user_id,
        };

        newLists[list.id] = albums;
      }

      setUserListsMetadata(newMetadata);
      setUserLists(newLists);
    } catch (error) {
      console.error("Error loading lists:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid) {
        loadLists(uid);
      } else {
        setUserLists({});
        setUserListsMetadata({});
        setIsLoading(false);
      }
    });

    // Initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid) {
        loadLists(uid);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadLists]);

  const refreshLists = useCallback(async () => {
    if (userId) {
      await loadLists(userId);
    }
  }, [userId, loadLists]);

  const createList = async (listData: {
    title: string;
    description: string;
    visibility: "public" | "private" | "friends";
    albums: ListAlbum[];
    songs?: ListSong[];
  }): Promise<string> => {
    if (!userId) throw new Error("Must be logged in to create a list");

    const albums = listData.albums || [];
    const songs = listData.songs || [];

    // Insert into music_lists
    const { data: newList, error: listError } = await supabase
      .from("music_lists")
      .insert({
        user_id: userId,
        title: listData.title,
        description: listData.description,
        visibility: listData.visibility,
        is_public: listData.visibility === "public",
      })
      .select()
      .single();

    if (listError) throw listError;

    const listId = newList.id;

    // Insert items
    const items = [
      ...albums.map((album, idx) => ({
        list_id: listId,
        item_type: "album",
        album_id: album.id,
        album_title: album.title,
        album_artist: album.artist,
        album_cover: album.cover,
        position: idx,
      })),
      ...songs.map((song, idx) => ({
        list_id: listId,
        item_type: "song",
        song_id: song.id,
        song_title: song.title,
        song_artist: song.artist,
        song_cover: song.cover,
        duration: song.duration,
        album_name: song.album,
        preview_url: song.previewUrl,
        apple_music_url: song.appleMusicUrl,
        spotify_url: song.spotifyUrl,
        position: albums.length + idx,
      })),
    ];

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("list_items").insert(items);
      if (itemsError) throw itemsError;
    }

    // Update local state
    const allCovers = [...albums.map(a => a.cover), ...songs.map(s => s.cover)];
    setUserListsMetadata(prev => ({
      ...prev,
      [listId]: {
        id: listId,
        title: listData.title,
        description: listData.description,
        albumCount: albums.length,
        songCount: songs.length,
        coverImages: allCovers.slice(0, 4),
        albums,
        songs,
        visibility: listData.visibility,
        createdAt: newList.created_at,
        updatedAt: newList.updated_at,
        userId,
      },
    }));

    if (albums.length > 0) {
      setUserLists(prev => ({
        ...prev,
        [listId]: albums,
      }));
    }

    return listId;
  };

  const updateList = async (listData: {
    id: string;
    title: string;
    description: string;
    visibility: "public" | "private" | "friends";
    albums: ListAlbum[];
    songs?: ListSong[];
  }): Promise<void> => {
    if (!userId) throw new Error("Must be logged in to update a list");

    const albums = listData.albums || [];
    const songs = listData.songs || [];

    // Update music_lists
    const { error: listError } = await supabase
      .from("music_lists")
      .update({
        title: listData.title,
        description: listData.description,
        visibility: listData.visibility,
        is_public: listData.visibility === "public",
        updated_at: new Date().toISOString(),
      })
      .eq("id", listData.id);

    if (listError) throw listError;

    // Delete existing items and re-insert
    await supabase.from("list_items").delete().eq("list_id", listData.id);

    const items = [
      ...albums.map((album, idx) => ({
        list_id: listData.id,
        item_type: "album",
        album_id: album.id,
        album_title: album.title,
        album_artist: album.artist,
        album_cover: album.cover,
        position: idx,
      })),
      ...songs.map((song, idx) => ({
        list_id: listData.id,
        item_type: "song",
        song_id: song.id,
        song_title: song.title,
        song_artist: song.artist,
        song_cover: song.cover,
        duration: song.duration,
        album_name: song.album,
        preview_url: song.previewUrl,
        apple_music_url: song.appleMusicUrl,
        spotify_url: song.spotifyUrl,
        position: albums.length + idx,
      })),
    ];

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("list_items").insert(items);
      if (itemsError) throw itemsError;
    }

    // Update local state
    const allCovers = [...albums.map(a => a.cover), ...songs.map(s => s.cover)];
    setUserListsMetadata(prev => ({
      ...prev,
      [listData.id]: {
        ...prev[listData.id],
        title: listData.title,
        description: listData.description,
        visibility: listData.visibility,
        albumCount: albums.length,
        songCount: songs.length,
        coverImages: allCovers.slice(0, 4),
        albums,
        songs,
        updatedAt: new Date().toISOString(),
      },
    }));

    setUserLists(prev => ({
      ...prev,
      [listData.id]: albums,
    }));
  };

  const deleteList = async (listId: string): Promise<void> => {
    // Items cascade delete via FK
    const { error } = await supabase.from("music_lists").delete().eq("id", listId);
    if (error) throw error;

    setUserListsMetadata(prev => {
      const newMetadata = { ...prev };
      delete newMetadata[listId];
      return newMetadata;
    });

    setUserLists(prev => {
      const newLists = { ...prev };
      delete newLists[listId];
      return newLists;
    });
  };

  const addAlbumToList = async (listId: string, album: ListAlbum): Promise<void> => {
    const currentList = userListsMetadata[listId];
    if (!currentList) return;
    
    const currentAlbums = currentList.albums || [];
    if (currentAlbums.some(a => a.id === album.id)) return;

    const position = (currentList.albums?.length || 0) + (currentList.songs?.length || 0);

    const { error } = await supabase.from("list_items").insert({
      list_id: listId,
      item_type: "album",
      album_id: album.id,
      album_title: album.title,
      album_artist: album.artist,
      album_cover: album.cover,
      position,
    });

    if (error) throw error;

    const newAlbums = [...currentAlbums, album];
    const allCovers = [...newAlbums.map(a => a.cover), ...(currentList.songs || []).map(s => s.cover)];

    setUserListsMetadata(prev => ({
      ...prev,
      [listId]: {
        ...prev[listId],
        albums: newAlbums,
        albumCount: newAlbums.length,
        coverImages: allCovers.slice(0, 4),
        updatedAt: new Date().toISOString(),
      },
    }));

    setUserLists(prev => ({
      ...prev,
      [listId]: newAlbums,
    }));
  };

  const removeAlbumFromList = async (listId: string, albumId: string): Promise<void> => {
    const { error } = await supabase
      .from("list_items")
      .delete()
      .eq("list_id", listId)
      .eq("album_id", albumId);

    if (error) throw error;

    const currentList = userListsMetadata[listId];
    const newAlbums = (currentList?.albums || []).filter(a => a.id !== albumId);
    const allCovers = [...newAlbums.map(a => a.cover), ...(currentList?.songs || []).map(s => s.cover)];

    setUserListsMetadata(prev => ({
      ...prev,
      [listId]: {
        ...prev[listId],
        albums: newAlbums,
        albumCount: newAlbums.length,
        coverImages: allCovers.slice(0, 4),
        updatedAt: new Date().toISOString(),
      },
    }));

    setUserLists(prev => ({
      ...prev,
      [listId]: newAlbums,
    }));
  };

  const addSongToList = async (listId: string, song: ListSong): Promise<void> => {
    const currentList = userListsMetadata[listId];
    if (!currentList) return;

    const currentSongs = currentList.songs || [];
    if (currentSongs.some(s => s.id === song.id)) return;

    const position = (currentList.albums?.length || 0) + currentSongs.length;

    const { error } = await supabase.from("list_items").insert({
      list_id: listId,
      item_type: "song",
      song_id: song.id,
      song_title: song.title,
      song_artist: song.artist,
      song_cover: song.cover,
      duration: song.duration,
      album_name: song.album,
      preview_url: song.previewUrl,
      apple_music_url: song.appleMusicUrl,
      spotify_url: song.spotifyUrl,
      position,
    });

    if (error) throw error;

    const newSongs = [...currentSongs, song];
    const allCovers = [...(currentList.albums || []).map(a => a.cover), ...newSongs.map(s => s.cover)];

    setUserListsMetadata(prev => ({
      ...prev,
      [listId]: {
        ...prev[listId],
        songs: newSongs,
        songCount: newSongs.length,
        coverImages: allCovers.slice(0, 4),
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const removeSongFromList = async (listId: string, songId: string): Promise<void> => {
    const { error } = await supabase
      .from("list_items")
      .delete()
      .eq("list_id", listId)
      .eq("song_id", songId);

    if (error) throw error;

    const currentList = userListsMetadata[listId];
    const newSongs = (currentList?.songs || []).filter(s => s.id !== songId);
    const allCovers = [...(currentList?.albums || []).map(a => a.cover), ...newSongs.map(s => s.cover)];

    setUserListsMetadata(prev => ({
      ...prev,
      [listId]: {
        ...prev[listId],
        songs: newSongs,
        songCount: newSongs.length,
        coverImages: allCovers.slice(0, 4),
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const isSongInList = (listId: string, songId: string): boolean => {
    const list = userListsMetadata[listId];
    if (!list) return false;
    return (list.songs || []).some(s => s.id === songId);
  };

  const updateListCover = async (listId: string, coverUrl: string): Promise<void> => {
    // For custom covers, we could add a custom_cover column later
    // For now, just update local state
    setUserListsMetadata(prev => ({
      ...prev,
      [listId]: {
        ...prev[listId],
        customCover: coverUrl,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const getListAlbums = (listId: string): ListAlbum[] => {
    return userListsMetadata[listId]?.albums || userLists[listId] || [];
  };

  const isAlbumInList = (listId: string, albumId: string): boolean => {
    const albums = userListsMetadata[listId]?.albums || userLists[listId] || [];
    return albums.some(a => a.id === albumId);
  };

  return (
    <ListsContext.Provider value={{
      userLists,
      userListsMetadata,
      isLoading,
      createList,
      deleteList,
      updateList,
      addAlbumToList,
      removeAlbumFromList,
      getListAlbums,
      isAlbumInList,
      addSongToList,
      removeSongFromList,
      isSongInList,
      updateListCover,
      refreshLists,
    }}>
      {children}
    </ListsContext.Provider>
  );
}

export function useLists() {
  const context = useContext(ListsContext);
  if (!context) {
    throw new Error("useLists must be used within a ListsProvider");
  }
  return context;
}
