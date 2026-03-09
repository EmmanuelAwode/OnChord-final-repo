// src/lib/api/profiles.ts
import { supabase } from "../supabaseClient";

export interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  display_name?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
}

/**
 * Get current user's profile
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.session.user.id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get a profile by user ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Get a profile by username
 */
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Update current user's profile
 */
export async function updateProfile(updates: UpdateProfileData): Promise<Profile> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", session.session.user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Search profiles by display name or username
 */
export async function searchProfiles(query: string, limit = 20): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get multiple profiles by user IDs
 */
export async function getProfiles(userIds: string[]): Promise<Profile[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (error) throw error;
  return data || [];
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username)
    .maybeSingle();

  if (error) throw error;
  return data === null;
}
