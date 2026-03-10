-- Seed data for testing real-time features
-- Run this after running all migrations

-- Insert sample notifications (using generated UUIDs for testing)
INSERT INTO notifications (user_id, type, title, message, action_user_id, action_user_name, action_user_avatar, review_id, is_read, created_at)
VALUES 
  (gen_random_uuid(), 'like', 'New Like', 'Sarah Johnson liked your review of "Good Kid, M.A.A.D City"', gen_random_uuid()::text, 'Sarah Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 'review-1', false, now() - interval '2 minutes'),
  (gen_random_uuid(), 'comment', 'New Comment', 'Michael Chen commented on your review: "Great taste! This album is a masterpiece."', gen_random_uuid()::text, 'Michael Chen', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'review-2', false, now() - interval '15 minutes'),
  (gen_random_uuid(), 'follow', 'New Follower', 'Emma Davis started following you', gen_random_uuid()::text, 'Emma Davis', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', null, false, now() - interval '1 hour');

-- Insert sample activities (using generated UUIDs for testing)
INSERT INTO activities (user_id, user_name, user_avatar, type, action, album_title, album_artist, album_cover, rating, created_at)
VALUES 
  (gen_random_uuid(), 'Sarah Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 'review', 'reviewed', 'Good Kid, M.A.A.D City', 'Kendrick Lamar', 'https://i.scdn.co/image/ab67616d0000b273d28d2ebdedb220e479743797', 5, now() - interval '2 minutes'),
  (gen_random_uuid(), 'Michael Chen', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'like', 'liked', 'To Pimp a Butterfly', 'Kendrick Lamar', 'https://i.scdn.co/image/ab67616d0000b273cdb10bfc3c0a409ffb9ada6b', null, now() - interval '15 minutes'),
  (gen_random_uuid(), 'Emma Davis', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', 'playlist_add', 'added a track to their playlist', 'DAMN.', 'Kendrick Lamar', 'https://i.scdn.co/image/ab67616d0000b2738b52c6b9bc4e43d873869699', null, now() - interval '1 hour');

-- Insert sample playlist (using generated UUIDs for testing)
INSERT INTO playlists (id, name, description, cover_image, creator_id, collaborators, is_public, created_at)
VALUES 
  ('3fa85f64-5717-4562-b3fc-2c963f66afa6'::uuid, 'Summer Vibes 2024', 'Collaborative playlist for summer road trips', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500', gen_random_uuid(), ARRAY[gen_random_uuid(), gen_random_uuid()], true, now() - interval '2 days');

-- Insert sample playlist tracks
INSERT INTO playlist_tracks (playlist_id, track_id, track_title, track_artist, album_cover, added_by, added_by_name, added_by_avatar, position, added_at)
VALUES 
  ('3fa85f64-5717-4562-b3fc-2c963f66afa6'::uuid, 'track-1', 'Blinding Lights', 'The Weeknd', 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36', gen_random_uuid(), 'You', '', 0, now() - interval '2 days'),
  ('3fa85f64-5717-4562-b3fc-2c963f66afa6'::uuid, 'track-2', 'Levitating', 'Dua Lipa', 'https://i.scdn.co/image/ab67616d0000b273be841ba4bc24340152e3a79a', gen_random_uuid(), 'Sarah Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 1, now() - interval '1 day'),
  ('3fa85f64-5717-4562-b3fc-2c963f66afa6'::uuid, 'track-3', 'Good 4 U', 'Olivia Rodrigo', 'https://i.scdn.co/image/ab67616d0000b273a91c10fe9472d9bd89802e5a', gen_random_uuid(), 'Michael Chen', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 2, now() - interval '12 hours');
