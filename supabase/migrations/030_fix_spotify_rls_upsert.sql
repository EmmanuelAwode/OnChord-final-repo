-- Fix RLS policies for spotify_connections to allow UPSERT operations
-- UPSERT requires both INSERT and UPDATE permissions, which should be covered by existing policies
-- However, we'll make them explicit and ensure they work together

-- Drop existing policies to recreate them with better coverage
DROP POLICY IF EXISTS "Users can insert own Spotify connection" ON spotify_connections;
DROP POLICY IF EXISTS "Users can update own Spotify connection" ON spotify_connections;

-- Create a combined INSERT policy that explicitly allows UPSERT
-- This handles the INSERT part of an UPSERT operation
CREATE POLICY "Users can insert own Spotify connection"
  ON spotify_connections FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create an UPDATE policy for UPSERT
-- This handles the UPDATE part when the row already exists
CREATE POLICY "Users can update own Spotify connection"
  ON spotify_connections FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Optional: Add a policy that allows the service role (Edge Functions) to upsert
-- This is for the spotify-refresh edge function which runs as a service
-- UNCOMMENT ONLY IF YOU HAVE EDGE FUNCTIONS THAT NEED THIS
-- ALTER TABLE spotify_connections DISABLE ROW LEVEL SECURITY;
-- Or create a service role policy:
-- CREATE POLICY "Service can manage Spotify connections"
--   ON spotify_connections
--   USING (auth.role() = 'service_role')
--   WITH CHECK (auth.role() = 'service_role');
