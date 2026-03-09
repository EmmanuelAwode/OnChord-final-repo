-- Add preview_url column to reviews table for music previews  
-- Run this in Supabase SQL Editor

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS preview_url text;

COMMENT ON COLUMN reviews.preview_url IS 'Preview URL for the track/album (typically from iTunes API)';