-- Normalize collaborative playlist track metadata across legacy and modern schemas.
--
-- Goals:
-- - Keep playlist_tracks compatible whether it came from legacy playlists or
--   collaborative_playlists-backed flows.
-- - Ensure track duration and attribution metadata can be stored and read
--   consistently by the frontend.
-- - Preserve existing data where possible.

-- Add missing compatibility columns to playlist_tracks.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'playlist_tracks'
      AND column_name = 'duration_ms'
  ) THEN
    ALTER TABLE public.playlist_tracks ADD COLUMN duration_ms integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'playlist_tracks'
      AND column_name = 'added_by_name'
  ) THEN
    ALTER TABLE public.playlist_tracks ADD COLUMN added_by_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'playlist_tracks'
      AND column_name = 'added_by_avatar'
  ) THEN
    ALTER TABLE public.playlist_tracks ADD COLUMN added_by_avatar text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'playlist_tracks'
      AND column_name = 'preview_url'
  ) THEN
    ALTER TABLE public.playlist_tracks ADD COLUMN preview_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'playlist_tracks'
      AND column_name = 'spotify_url'
  ) THEN
    ALTER TABLE public.playlist_tracks ADD COLUMN spotify_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'playlist_tracks'
      AND column_name = 'apple_music_url'
  ) THEN
    ALTER TABLE public.playlist_tracks ADD COLUMN apple_music_url text;
  END IF;
END $$;

-- Add a legacy-friendly cover URL alias to collaborative_playlists if it does not exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'collaborative_playlists'
      AND column_name = 'cover_url'
  ) THEN
    ALTER TABLE public.collaborative_playlists ADD COLUMN cover_url text;
  END IF;
END $$;

-- Backfill added_by_name/added_by_avatar from profiles where available.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'playlist_tracks'
      AND column_name = 'added_by_name'
  ) THEN
    UPDATE public.playlist_tracks pt
    SET
      added_by_name = COALESCE(NULLIF(pt.added_by_name, ''), p.display_name, p.username, 'Collaborator'),
      added_by_avatar = COALESCE(pt.added_by_avatar, p.avatar_url)
    FROM public.profiles p
    WHERE p.id = pt.added_by
      AND (pt.added_by_name IS NULL OR pt.added_by_name = '' OR pt.added_by_avatar IS NULL);
  END IF;
END $$;

-- Keep cover_url aligned with cover_image for modern rows when both columns exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'collaborative_playlists'
      AND column_name = 'cover_url'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'collaborative_playlists'
      AND column_name = 'cover_image'
  ) THEN
    UPDATE public.collaborative_playlists
    SET cover_url = COALESCE(cover_url, cover_image)
    WHERE cover_url IS NULL AND cover_image IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_added_by ON public.playlist_tracks(added_by);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON public.playlist_tracks(track_id);
