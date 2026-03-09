-- ============================================
-- ENHANCE MUSIC LISTS FOR FULL SYNC
-- Migration: 013_enhance_music_lists.sql
-- ============================================

-- Add visibility column to music_lists (public, private, friends)
-- Keep is_public for backward compatibility, but add granular visibility
ALTER TABLE music_lists 
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends'));

-- Migrate existing is_public to visibility
UPDATE music_lists SET visibility = CASE WHEN is_public = true THEN 'public' ELSE 'private' END WHERE visibility IS NULL;

-- Add song-specific fields to list_items
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS song_title text;
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS song_artist text;
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS song_cover text;
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS duration text;
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS album_name text;
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS preview_url text;
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS apple_music_url text;
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS spotify_url text;
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'album' CHECK (item_type IN ('album', 'song'));

-- Update RLS policy for visibility (friends visibility would need follow check)
DROP POLICY IF EXISTS "Users can view public lists and own lists" ON music_lists;

CREATE POLICY "Users can view accessible lists"
  ON music_lists FOR SELECT
  USING (
    user_id = auth.uid() 
    OR visibility = 'public'
    OR (
      visibility = 'friends' 
      AND EXISTS (
        SELECT 1 FROM follows 
        WHERE follows.follower_id = auth.uid() 
        AND follows.following_id = music_lists.user_id
      )
    )
  );

-- Create index for visibility queries
CREATE INDEX IF NOT EXISTS idx_music_lists_visibility ON music_lists(visibility);
