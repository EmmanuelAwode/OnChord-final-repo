// src/lib/sessionCache.ts
// Caches the current user session to avoid redundant supabase.auth.getSession() calls
// This significantly speeds up data loading by eliminating multiple async session fetches

import { supabase } from "./supabaseClient";

let cachedSession: any = null;
let sessionPromise: Promise<any> | null = null;

/**
 * Get the current user session (cached).
 * First call fetches from Supabase, subsequent calls return the cached result.
 * Useful for avoiding redundant session calls across multiple API functions.
 */
export async function getCachedSession() {
  // If there's an ongoing request, wait for it
  if (sessionPromise) {
    return sessionPromise;
  }

  // If we have a cached session, return it immediately
  if (cachedSession !== null) {
    return cachedSession;
  }

  // Fetch and cache the session
  sessionPromise = supabase.auth.getSession();
  
  try {
    const result = await sessionPromise;
    cachedSession = result;
    return result;
  } finally {
    sessionPromise = null;
  }
}

/**
 * Invalidate the session cache (call this when user logs out or session changes)
 */
export function invalidateSessionCache() {
  cachedSession = null;
  sessionPromise = null;
}

/**
 * Set up listener to invalidate cache on auth changes
 */
export function setupSessionCacheListener() {
  supabase.auth.onAuthStateChange(() => {
    invalidateSessionCache();
  });
}
