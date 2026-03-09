-- Add spotify_url column to reviews table for storing direct Spotify track links
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS spotify_url text;
