-- Create notifications table for real-time notification system
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'playlist_add', 'playlist_invite')),
  title text NOT NULL,
  message text NOT NULL,
  action_user_id text,
  action_user_name text,
  action_user_avatar text,
  review_id text,
  playlist_id text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Add missing columns if table already existed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_user_id') THEN
    ALTER TABLE notifications ADD COLUMN action_user_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_user_name') THEN
    ALTER TABLE notifications ADD COLUMN action_user_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_user_avatar') THEN
    ALTER TABLE notifications ADD COLUMN action_user_avatar text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'review_id') THEN
    ALTER TABLE notifications ADD COLUMN review_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'playlist_id') THEN
    ALTER TABLE notifications ADD COLUMN playlist_id text;
  END IF;
END $$;

-- Drop foreign key constraint if it exists (for testing with generated UUIDs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_user_id_fkey' 
    AND table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_user_id_fkey;
  END IF;
END $$;


-- Create index for faster queries
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can view their own notifications'
  ) THEN
    CREATE POLICY "Users can view their own notifications"
      ON notifications FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policy: Users can update their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can update their own notifications'
  ) THEN
    CREATE POLICY "Users can update their own notifications"
      ON notifications FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policy: Users can delete their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can delete their own notifications'
  ) THEN
    CREATE POLICY "Users can delete their own notifications"
      ON notifications FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policy: System can insert notifications (for any user)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'System can insert notifications'
  ) THEN
    CREATE POLICY "System can insert notifications"
      ON notifications FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Enable real-time for notifications table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
