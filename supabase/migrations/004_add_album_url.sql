-- Add album_url column to reviews table for iTunes links
-- Run this in Supabase SQL Editor

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS album_url text;

COMMENT ON COLUMN reviews.album_url IS 'iTunes URL for the album or track being reviewed';
