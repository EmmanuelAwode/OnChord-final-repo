-- Add persisted moods/tags support to collaborative playlists.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'collaborative_playlists'
      AND column_name = 'moods'
  ) THEN
    ALTER TABLE public.collaborative_playlists ADD COLUMN moods text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'playlists'
      AND column_name = 'moods'
  ) THEN
    ALTER TABLE public.playlists ADD COLUMN moods text[] DEFAULT '{}';
  END IF;
END $$;
