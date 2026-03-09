-- Create activities table for real-time activity feed
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  user_avatar text,
  type text NOT NULL CHECK (type IN ('review', 'listening', 'playlist_add', 'like', 'follow')),
  action text NOT NULL,
  album_title text,
  album_artist text,
  album_cover text,
  track_title text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  review_id text,
  playlist_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- Add missing columns if table already existed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'album_title') THEN
    ALTER TABLE activities ADD COLUMN album_title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'album_artist') THEN
    ALTER TABLE activities ADD COLUMN album_artist text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'album_cover') THEN
    ALTER TABLE activities ADD COLUMN album_cover text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'track_title') THEN
    ALTER TABLE activities ADD COLUMN track_title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'rating') THEN
    ALTER TABLE activities ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'review_id') THEN
    ALTER TABLE activities ADD COLUMN review_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'playlist_id') THEN
    ALTER TABLE activities ADD COLUMN playlist_id text;
  END IF;
END $$;

-- Drop foreign key constraint if it exists (for testing with generated UUIDs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'activities_user_id_fkey' 
    AND table_name = 'activities'
  ) THEN
    ALTER TABLE activities DROP CONSTRAINT activities_user_id_fkey;
  END IF;
END $$;


-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS activities_user_id_idx ON activities(user_id);
CREATE INDEX IF NOT EXISTS activities_type_idx ON activities(type);

-- Enable Row Level Security
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create policy: Everyone can view public activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activities' 
    AND policyname = 'Public activities are viewable by everyone'
  ) THEN
    CREATE POLICY "Public activities are viewable by everyone"
      ON activities FOR SELECT
      USING (true);
  END IF;
END $$;

-- Create policy: Users can insert their own activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activities' 
    AND policyname = 'Users can insert their own activities'
  ) THEN
    CREATE POLICY "Users can insert their own activities"
      ON activities FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create policy: Users can delete their own activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activities' 
    AND policyname = 'Users can delete their own activities'
  ) THEN
    CREATE POLICY "Users can delete their own activities"
      ON activities FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Enable real-time for activities table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'activities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE activities;
  END IF;
END $$;
