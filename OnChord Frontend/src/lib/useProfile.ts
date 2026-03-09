// src/lib/useProfile.ts
import { useState, useEffect } from "react";
import {
  getCurrentProfile,
  getProfile,
  updateProfile,
  searchProfiles,
  type Profile,
  type UpdateProfileData,
} from "./api/profiles";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setIsLoading(true);
      const data = await getCurrentProfile();
      setProfile(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateCurrentProfile(updates: UpdateProfileData) {
    try {
      const updated = await updateProfile(updates);
      setProfile(updated);
      setError(null);
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateCurrentProfile,
    reload: loadProfile,
  };
}

export function useProfileById(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    loadProfile();
  }, [userId]);

  async function loadProfile() {
    if (!userId) return;

    try {
      setIsLoading(true);
      const data = await getProfile(userId);
      setProfile(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    profile,
    isLoading,
    error,
    reload: loadProfile,
  };
}

export function useProfileSearch(query: string) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setProfiles([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      search();
    }, 300); // Debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  async function search() {
    try {
      setIsLoading(true);
      const results = await searchProfiles(query);
      setProfiles(results);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    profiles,
    isLoading,
    error,
  };
}
