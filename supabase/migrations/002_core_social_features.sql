-- Core Social Features for OnChord
-- Run this in Supabase SQL Editor

-- ============================================
-- FOLLOWS / FRIENDS
-- ============================================
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  -- Prevent self-follows
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all follows"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (follower_id = auth.uid());

-- ============================================
-- REVIEW LIKES
-- ============================================
CREATE TABLE IF NOT EXISTS review_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

CREATE INDEX idx_review_likes_user ON review_likes(user_id);
CREATE INDEX idx_review_likes_review ON review_likes(review_id);

-- Enable RLS
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all review likes"
  ON review_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like reviews"
  ON review_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike reviews"
  ON review_likes FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- REVIEW COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES review_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_review_comments_review ON review_comments(review_id);
CREATE INDEX idx_review_comments_user ON review_comments(user_id);
CREATE INDEX idx_review_comments_parent ON review_comments(parent_comment_id);

-- Enable RLS
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on public reviews"
  ON review_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reviews 
      WHERE reviews.id = review_comments.review_id 
      AND (reviews.is_public = true OR reviews.uid = auth.uid())
    )
  );

CREATE POLICY "Users can create comments"
  ON review_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON review_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON review_comments FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- MUSIC LISTS (Collections)
-- ============================================
CREATE TABLE IF NOT EXISTS music_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_music_lists_user ON music_lists(user_id);
CREATE INDEX idx_music_lists_public ON music_lists(is_public);

-- Enable RLS
ALTER TABLE music_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public lists and own lists"
  ON music_lists FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can create own lists"
  ON music_lists FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own lists"
  ON music_lists FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own lists"
  ON music_lists FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- LIST ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES music_lists(id) ON DELETE CASCADE NOT NULL,
  album_id text,
  song_id text,
  album_title text,
  album_artist text,
  album_cover text,
  added_at timestamptz DEFAULT NOW(),
  position int
);

CREATE INDEX idx_list_items_list ON list_items(list_id);

-- Enable RLS
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items in accessible lists"
  ON list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM music_lists 
      WHERE music_lists.id = list_items.list_id 
      AND (music_lists.is_public = true OR music_lists.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can add items to own lists"
  ON list_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM music_lists 
      WHERE music_lists.id = list_items.list_id 
      AND music_lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in own lists"
  ON list_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM music_lists 
      WHERE music_lists.id = list_items.list_id 
      AND music_lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from own lists"
  ON list_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM music_lists 
      WHERE music_lists.id = list_items.list_id 
      AND music_lists.user_id = auth.uid()
    )
  );

-- ============================================
-- COLLABORATIVE PLAYLISTS
-- ============================================
CREATE TABLE IF NOT EXISTS collaborative_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_collab_playlists_creator ON collaborative_playlists(created_by);

-- ============================================
-- PLAYLIST CONTRIBUTORS
-- ============================================
CREATE TABLE IF NOT EXISTS playlist_contributors (
  playlist_id uuid REFERENCES collaborative_playlists(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz DEFAULT NOW(),
  PRIMARY KEY (playlist_id, user_id)
);

CREATE INDEX idx_playlist_contributors_user ON playlist_contributors(user_id);

-- Enable RLS for COLLABORATIVE PLAYLISTS (after playlist_contributors exists)
ALTER TABLE collaborative_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contributors can view their playlists"
  ON collaborative_playlists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playlist_contributors 
      WHERE playlist_contributors.playlist_id = collaborative_playlists.id 
      AND playlist_contributors.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create playlists"
  ON collaborative_playlists FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Contributors can update playlists"
  ON collaborative_playlists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM playlist_contributors 
      WHERE playlist_contributors.playlist_id = collaborative_playlists.id 
      AND playlist_contributors.user_id = auth.uid()
    )
  );

-- Enable RLS for PLAYLIST CONTRIBUTORS
ALTER TABLE playlist_contributors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contributors can view playlist members"
  ON playlist_contributors FOR SELECT
  USING (
    playlist_id IN (
      SELECT playlist_id FROM playlist_contributors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can add contributors"
  ON playlist_contributors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collaborative_playlists 
      WHERE collaborative_playlists.id = playlist_contributors.playlist_id 
      AND collaborative_playlists.created_by = auth.uid()
    )
  );

-- ============================================
-- PLAYLIST TRACKS
-- ============================================
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES collaborative_playlists(id) ON DELETE CASCADE NOT NULL,
  track_id text NOT NULL,
  track_title text,
  track_artist text,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
CREATE INDEX idx_playlist_tracks_user ON playlist_tracks(added_by);

-- Enable RLS
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contributors can view playlist tracks"
  ON playlist_tracks FOR SELECT
  USING (
    playlist_id IN (
      SELECT playlist_id FROM playlist_contributors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Contributors can add tracks"
  ON playlist_tracks FOR INSERT
  WITH CHECK (
    added_by = auth.uid() AND
    playlist_id IN (
      SELECT playlist_id FROM playlist_contributors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own tracks"
  ON playlist_tracks FOR DELETE
  USING (added_by = auth.uid());

-- ============================================
-- PLAYLIST MESSAGES (Chat)
-- ============================================
CREATE TABLE IF NOT EXISTS playlist_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES collaborative_playlists(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message text,
  message_type text DEFAULT 'text',
  image_url text,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_playlist_messages_playlist ON playlist_messages(playlist_id, created_at);
CREATE INDEX idx_playlist_messages_user ON playlist_messages(user_id);

-- Enable RLS
ALTER TABLE playlist_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contributors can view playlist messages"
  ON playlist_messages FOR SELECT
  USING (
    playlist_id IN (
      SELECT playlist_id FROM playlist_contributors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Contributors can send messages"
  ON playlist_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    playlist_id IN (
      SELECT playlist_id FROM playlist_contributors WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  related_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  related_review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================
-- EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  location text,
  image_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_creator ON events(created_by);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view events"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "Users can create events"
  ON events FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own events"
  ON events FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own events"
  ON events FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- FAVORITES (Albums/Songs)
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id text NOT NULL,
  item_type text NOT NULL, -- 'album', 'song', 'artist'
  item_title text,
  item_artist text,
  item_cover text,
  added_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, item_id, item_type)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

-- Enable RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove favorites"
  ON favorites FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- ENABLE REALTIME
-- ============================================
-- Enable Realtime for collaborative features
ALTER PUBLICATION supabase_realtime ADD TABLE playlist_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE playlist_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE review_comments;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get follower count
CREATE OR REPLACE FUNCTION get_follower_count(target_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*) FROM follows WHERE following_id = target_user_id;
$$;

-- Function to get following count
CREATE OR REPLACE FUNCTION get_following_count(target_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*) FROM follows WHERE follower_id = target_user_id;
$$;

-- Function to get review like count
CREATE OR REPLACE FUNCTION get_review_like_count(target_review_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*) FROM review_likes WHERE review_id = target_review_id;
$$;

-- Function to get review comment count
CREATE OR REPLACE FUNCTION get_review_comment_count(target_review_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*) FROM review_comments WHERE review_id = target_review_id;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_music_lists_updated_at BEFORE UPDATE ON music_lists
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_collaborative_playlists_updated_at BEFORE UPDATE ON collaborative_playlists
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_review_comments_updated_at BEFORE UPDATE ON review_comments
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
