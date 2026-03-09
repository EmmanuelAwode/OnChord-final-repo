import { useState, useEffect } from "react";
import { getReviews, createReview, updateReviewApi, deleteReviewApi } from "./api/reviews";
import { supabase } from "./supabaseClient";


export function useFollowing() {
  const [following, setFollowing] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("following");
    if (saved) {
      return new Set(JSON.parse(saved));
    }
    // Initialize with empty set - real data comes from Supabase
    return new Set();
  });

  useEffect(() => {
    localStorage.setItem("following", JSON.stringify(Array.from(following)));
  }, [following]);

  const toggleFollow = (userId: string) => {
    setFollowing((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const isFollowing = (userId: string) => following.has(userId);

  return { following, toggleFollow, isFollowing };
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("favorites");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  const toggleFavorite = (itemId: string) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const isFavorite = (itemId: string) => favorites.has(itemId);

  return { favorites, toggleFavorite, isFavorite };
}

export function useLikes() {
  const [likes, setLikes] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("likes");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem("likes", JSON.stringify(Array.from(likes)));
  }, [likes]);

  const toggleLike = (itemId: string) => {
    setLikes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const isLiked = (itemId: string) => likes.has(itemId);

  return { likes, toggleLike, isLiked };
}

export interface Comment {
  id: string;
  reviewId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
  likes: number;
  replies?: Comment[];
}

export function useReviewLikes() {
  const [reviewLikeCounts, setReviewLikeCounts] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("review-like-counts");
    return saved ? JSON.parse(saved) : {};
  });

  const [likedReviews, setLikedReviews] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("liked-reviews");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem("review-like-counts", JSON.stringify(reviewLikeCounts));
  }, [reviewLikeCounts]);

  useEffect(() => {
    localStorage.setItem("liked-reviews", JSON.stringify(Array.from(likedReviews)));
  }, [likedReviews]);

  const toggleReviewLike = (reviewId: string, initialLikes: number = 0) => {
    const isCurrentlyLiked = likedReviews.has(reviewId);
    
    setLikedReviews((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });

    setReviewLikeCounts((prev) => {
      const currentCount = prev[reviewId] ?? initialLikes;
      return {
        ...prev,
        [reviewId]: isCurrentlyLiked ? currentCount - 1 : currentCount + 1,
      };
    });
  };

  const isReviewLiked = (reviewId: string) => likedReviews.has(reviewId);
  
  const getReviewLikes = (reviewId: string, initialLikes: number = 0) => {
    return reviewLikeCounts[reviewId] ?? initialLikes;
  };

  return { toggleReviewLike, isReviewLiked, getReviewLikes };
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  albumId: string;
  albumTitle: string;
  albumArtist: string;
  albumCover: string;
  albumUrl?: string;
  previewUrl?: string;
  spotifyUrl?: string;
  rating: number;
  type: "album" | "track";
  content: string;
  timestamp: string;
  date: string;
  likes: number;
  comments: number;
  tags: string[];
  mood?: string;
  whereListened?: string;
  whenListened?: string;
  listeningContext?: string; // Legacy field - kept for backward compatibility
  favoriteTrack?: string;
  trackDuration?: string;
  isPublic: boolean;
  editedAt?: string; // ISO timestamp of last edit
  isEdited?: boolean; // Flag to indicate if review has been edited
}

export function useReviews() {
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("getSession error:", error);
    })();
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setIsLoadingReviews(true);
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // user not logged in — stop loading reviews
          if (alive) {
            setUserReviews([]);
            setReviewsError(null);
          }
          return;
        }

        const reviews = await getReviews();
        if (alive) {
          setUserReviews(reviews);
          setReviewsError(null);
        }
      } catch (err: any) {
        if (alive) setReviewsError(err?.message ?? "Failed to load reviews");
      } finally {
        if (alive) setIsLoadingReviews(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);


  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const addReview = async (review: Omit<Review, "id" | "timestamp" | "date" | "likes" | "comments">) => {
    const created = await createReview(review);
    setUserReviews((prev) => [created, ...prev]);
    return created;
  };


  const deleteReview = async (reviewId: string) => {
    await deleteReviewApi(reviewId);
    setUserReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };


  const updateReview = async (reviewId: string, updates: Partial<Review>) => {
    const updated = await updateReviewApi(reviewId, updates);
    setUserReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
  };


  return { userReviews, addReview, deleteReview, updateReview, isLoadingReviews, reviewsError };
}

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
  customCover?: string; // User-selected custom cover image
  albums?: ListAlbum[]; // Full album data
  songs?: ListSong[]; // Full song data
  createdAt?: string;
  updatedAt?: string;
  visibility?: "public" | "private" | "friends";
}

export function useLists() {
  const [userLists, setUserLists] = useState<Record<string, ListAlbum[]>>(() => {
    const saved = localStorage.getItem("user-lists");
    return saved ? JSON.parse(saved) : {};
  });

  const [userListsMetadata, setUserListsMetadata] = useState<Record<string, MusicList>>(() => {
    const saved = localStorage.getItem("user-lists-metadata");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem("user-lists", JSON.stringify(userLists));
  }, [userLists]);

  useEffect(() => {
    localStorage.setItem("user-lists-metadata", JSON.stringify(userListsMetadata));
  }, [userListsMetadata]);

  const createList = (listData: {
    title: string;
    description: string;
    visibility: "public" | "private" | "friends";
    albums: ListAlbum[];
    songs?: ListSong[];
  }) => {
    const listId = `user-list-${Date.now()}`;
    const now = new Date().toISOString();
    
    const albums = listData.albums || [];
    const songs = listData.songs || [];
    const allCovers = [...albums.map(a => a.cover), ...songs.map(s => s.cover)];
    
    const newList: MusicList = {
      id: listId,
      title: listData.title,
      description: listData.description,
      albumCount: albums.length,
      songCount: songs.length,
      coverImages: allCovers.slice(0, 4),
      albums,
      songs,
      visibility: listData.visibility,
      createdAt: now,
      updatedAt: now,
    };

    setUserListsMetadata(prev => ({
      ...prev,
      [listId]: newList,
    }));

    // Keep backward compatibility with old structure
    if (albums.length > 0) {
      setUserLists(prev => ({
        ...prev,
        [listId]: albums,
      }));
    }

    return listId;
  };

  const updateList = (listData: {
    id: string;
    title: string;
    description: string;
    visibility: "public" | "private" | "friends";
    albums: ListAlbum[];
    songs?: ListSong[];
  }) => {
    const now = new Date().toISOString();
    const albums = listData.albums || [];
    const songs = listData.songs || [];
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
        updatedAt: now,
      },
    }));

    // Keep backward compatibility
    if (albums.length > 0) {
      setUserLists(prev => ({
        ...prev,
        [listData.id]: albums,
      }));
    }
  };

  const deleteList = (listId: string) => {
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

  const addAlbumToList = (listId: string, album: ListAlbum) => {
    setUserLists((prev) => {
      const currentAlbums = prev[listId] || [];
      // Check if album already exists in list
      if (currentAlbums.some(a => a.id === album.id)) {
        return prev; // Don't add duplicates
      }
      const newAlbums = [...currentAlbums, album];
      
      // Update metadata
      setUserListsMetadata(meta => ({
        ...meta,
        [listId]: {
          ...meta[listId],
          albumCount: newAlbums.length,
          coverImages: newAlbums.slice(0, 4).map(a => a.cover),
          updatedAt: new Date().toISOString(),
        },
      }));
      
      return {
        ...prev,
        [listId]: newAlbums,
      };
    });
  };

  const removeAlbumFromList = (listId: string, albumId: string) => {
    setUserLists((prev) => {
      const currentAlbums = prev[listId] || [];
      return {
        ...prev,
        [listId]: currentAlbums.filter(a => a.id !== albumId),
      };
    });
  };

  const addSongToList = (listId: string, song: ListSong) => {
    setUserListsMetadata((prev) => {
      const currentList = prev[listId];
      if (!currentList) return prev;
      
      const currentSongs = currentList.songs || [];
      // Check if song already exists in list
      if (currentSongs.some(s => s.id === song.id)) {
        return prev; // Don't add duplicates
      }
      const newSongs = [...currentSongs, song];
      const allCovers = [
        ...(currentList.albums || []).map(a => a.cover),
        ...newSongs.map(s => s.cover)
      ];
      
      return {
        ...prev,
        [listId]: {
          ...currentList,
          songs: newSongs,
          songCount: newSongs.length,
          coverImages: allCovers.slice(0, 4),
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const removeSongFromList = (listId: string, songId: string) => {
    setUserListsMetadata((prev) => {
      const currentList = prev[listId];
      if (!currentList) return prev;
      
      const newSongs = (currentList.songs || []).filter(s => s.id !== songId);
      const allCovers = [
        ...(currentList.albums || []).map(a => a.cover),
        ...newSongs.map(s => s.cover)
      ];
      
      return {
        ...prev,
        [listId]: {
          ...currentList,
          songs: newSongs,
          songCount: newSongs.length,
          coverImages: allCovers.slice(0, 4),
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const isSongInList = (listId: string, songId: string): boolean => {
    const list = userListsMetadata[listId];
    if (!list) return false;
    return (list.songs || []).some(s => s.id === songId);
  };

  const updateListCover = (listId: string, coverUrl: string) => {
    setUserListsMetadata((prev) => {
      const currentList = prev[listId];
      if (!currentList) return prev;
      
      return {
        ...prev,
        [listId]: {
          ...currentList,
          customCover: coverUrl,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const getListAlbums = (listId: string): ListAlbum[] => {
    return userLists[listId] || [];
  };

  const isAlbumInList = (listId: string, albumId: string): boolean => {
    const albums = userLists[listId] || [];
    return albums.some(a => a.id === albumId);
  };

  return { 
    userLists, 
    userListsMetadata,
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
    updateListCover
  };
}