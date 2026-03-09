-- Create playlists table for collaborative playlists
CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_image text,
  creator_id uuid NOT NULL,
  collaborators uuid[] DEFAULT '{}',
  is_public boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create playlist_tracks table for collaborative playlist tracks
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL,
  track_id text NOT NULL,
  track_title text NOT NULL,
  track_artist text NOT NULL,
  album_cover text,
  added_by uuid NOT NULL,
  added_by_name text NOT NULL,
  added_by_avatar text,
  position integer NOT NULL DEFAULT 0,
  added_at timestamp with time zone DEFAULT now()
);

-- Drop old foreign key constraint if it exists (may reference wrong table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'playlist_tracks_playlist_id_fkey' 
    AND table_name = 'playlist_tracks'
  ) THEN
    ALTER TABLE playlist_tracks DROP CONSTRAINT playlist_tracks_playlist_id_fkey;
  END IF;
END $$;

-- Drop added_by foreign key constraint if it exists (for testing with generated UUIDs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'playlist_tracks_added_by_fkey' 
    AND table_name = 'playlist_tracks'
  ) THEN
    ALTER TABLE playlist_tracks DROP CONSTRAINT playlist_tracks_added_by_fkey;
  END IF;
END $$;

-- Add correct foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'playlist_tracks_playlist_id_fkey' 
    AND table_name = 'playlist_tracks'
  ) THEN
    ALTER TABLE playlist_tracks ADD CONSTRAINT playlist_tracks_playlist_id_fkey 
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add position column if it doesn't exist (in case table was created by previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'playlist_tracks' 
    AND column_name = 'position'
  ) THEN
    ALTER TABLE playlist_tracks ADD COLUMN position integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add other missing columns to playlist_tracks if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlist_tracks' AND column_name = 'track_title') THEN
    ALTER TABLE playlist_tracks ADD COLUMN track_title text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlist_tracks' AND column_name = 'track_artist') THEN
    ALTER TABLE playlist_tracks ADD COLUMN track_artist text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlist_tracks' AND column_name = 'album_cover') THEN
    ALTER TABLE playlist_tracks ADD COLUMN album_cover text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlist_tracks' AND column_name = 'added_by') THEN
    ALTER TABLE playlist_tracks ADD COLUMN added_by uuid NOT NULL DEFAULT gen_random_uuid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlist_tracks' AND column_name = 'added_by_name') THEN
    ALTER TABLE playlist_tracks ADD COLUMN added_by_name text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlist_tracks' AND column_name = 'added_by_avatar') THEN
    ALTER TABLE playlist_tracks ADD COLUMN added_by_avatar text;
  END IF;
  
  -- Fix type of added_by column if it exists with wrong type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'playlist_tracks' 
    AND column_name = 'added_by' 
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE playlist_tracks ALTER COLUMN added_by TYPE uuid USING added_by::uuid;
  END IF;
END $$;

-- Add missing columns to playlists if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlists' AND column_name = 'description') THEN
    ALTER TABLE playlists ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlists' AND column_name = 'cover_image') THEN
    ALTER TABLE playlists ADD COLUMN cover_image text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlists' AND column_name = 'collaborators') THEN
    ALTER TABLE playlists ADD COLUMN collaborators uuid[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlists' AND column_name = 'is_public') THEN
    ALTER TABLE playlists ADD COLUMN is_public boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlists' AND column_name = 'updated_at') THEN
    ALTER TABLE playlists ADD COLUMN updated_at timestamp with time zone DEFAULT now();
  END IF;
END $$;

-- Drop foreign key constraints if they exist (for testing with generated UUIDs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'playlists_creator_id_fkey' 
    AND table_name = 'playlists'
  ) THEN
    ALTER TABLE playlists DROP CONSTRAINT playlists_creator_id_fkey;
  END IF;
END $$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS playlists_creator_id_idx ON playlists(creator_id);
CREATE INDEX IF NOT EXISTS playlists_updated_at_idx ON playlists(updated_at DESC);
CREATE INDEX IF NOT EXISTS playlist_tracks_playlist_id_idx ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS playlist_tracks_position_idx ON playlist_tracks(position);

-- Enable Row Level Security
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Playlists policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'playlists' 
    AND policyname = 'Public playlists are viewable by everyone'
  ) THEN
    CREATE POLICY "Public playlists are viewable by everyone"
      ON playlists FOR SELECT
      USING (is_public = true OR auth.uid() = creator_id OR auth.uid() = ANY(collaborators));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'playlists' 
    AND policyname = 'Users can create their own playlists'
  ) THEN
    CREATE POLICY "Users can create their own playlists"
      ON playlists FOR INSERT
      WITH CHECK (auth.uid() = creator_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'playlists' 
    AND policyname = 'Creators and collaborators can update playlists'
  ) THEN
    CREATE POLICY "Creators and collaborators can update playlists"
      ON playlists FOR UPDATE
      USING (auth.uid() = creator_id OR auth.uid() = ANY(collaborators));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'playlists' 
    AND policyname = 'Creators can delete their playlists'
  ) THEN
    CREATE POLICY "Creators can delete their playlists"
      ON playlists FOR DELETE
      USING (auth.uid() = creator_id);
  END IF;
END $$;

-- Playlist tracks policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'playlist_tracks' 
    AND policyname = 'Playlist tracks are viewable with playlist access'
  ) THEN
    CREATE POLICY "Playlist tracks are viewable with playlist access"
      ON playlist_tracks FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM playlists 
          WHERE playlists.id = playlist_tracks.playlist_id 
          AND (playlists.is_public = true OR auth.uid() = playlists.creator_id OR auth.uid() = ANY(playlists.collaborators))
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'playlist_tracks' 
    AND policyname = 'Collaborators can add tracks'
  ) THEN
    CREATE POLICY "Collaborators can add tracks"
      ON playlist_tracks FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM playlists 
          WHERE playlists.id = playlist_tracks.playlist_id 
          AND (auth.uid() = playlists.creator_id OR auth.uid() = ANY(playlists.collaborators))
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'playlist_tracks' 
    AND policyname = 'Collaborators can update tracks'
  ) THEN
    CREATE POLICY "Collaborators can update tracks"
      ON playlist_tracks FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM playlists 
          WHERE playlists.id = playlist_tracks.playlist_id 
          AND (auth.uid() = playlists.creator_id OR auth.uid() = ANY(playlists.collaborators))
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'playlist_tracks' 
    AND policyname = 'Collaborators can delete tracks'
  ) THEN
    CREATE POLICY "Collaborators can delete tracks"
      ON playlist_tracks FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM playlists 
          WHERE playlists.id = playlist_tracks.playlist_id 
          AND (auth.uid() = playlists.creator_id OR auth.uid() = ANY(playlists.collaborators))
        )
      );
  END IF;
END $$;

-- Enable real-time for both tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'playlists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE playlists;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'playlist_tracks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE playlist_tracks;
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_playlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE playlists SET updated_at = now() WHERE id = OLD.playlist_id;
    RETURN OLD;
  ELSE
    UPDATE playlists SET updated_at = now() WHERE id = NEW.playlist_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update playlist's updated_at when tracks change
DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_playlist_timestamp_on_track_change ON playlist_tracks;
  CREATE TRIGGER update_playlist_timestamp_on_track_change
  AFTER INSERT OR UPDATE OR DELETE ON playlist_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_updated_at();
END $$;
