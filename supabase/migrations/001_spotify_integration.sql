-- Spotify OAuth Integration Tables
-- Run this in Supabase SQL Editor

-- Store Spotify connection tokens
CREATE TABLE IF NOT EXISTS spotify_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  spotify_user_id text,
  spotify_display_name text,
  spotify_email text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE spotify_connections ENABLE ROW LEVEL SECURITY;

-- Users can only view and modify their own Spotify connection
CREATE POLICY "Users can view own Spotify connection"
  ON spotify_connections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own Spotify connection"
  ON spotify_connections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own Spotify connection"
  ON spotify_connections FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own Spotify connection"
  ON spotify_connections FOR DELETE
  USING (user_id = auth.uid());

-- Optional: Cache user's top tracks for taste matching
CREATE TABLE IF NOT EXISTS user_spotify_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id text NOT NULL,
  track_name text,
  artist_name text,
  album_name text,
  popularity int,
  added_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

-- Enable RLS for tracks
ALTER TABLE user_spotify_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own Spotify tracks"
  ON user_spotify_tracks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own Spotify tracks"
  ON user_spotify_tracks FOR ALL
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spotify_connections_user_id ON spotify_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_spotify_tracks_user_id ON user_spotify_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_spotify_connections_expires_at ON spotify_connections(expires_at);
