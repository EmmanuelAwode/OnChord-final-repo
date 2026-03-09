-- Seed data for testing: Multiple dummy profiles with diverse music tastes
-- Run this after running all other migrations

-- ============================================
-- IMPORTANT: For testing with foreign key constraints
-- ============================================
-- Since profiles reference auth.users, we need to work around this
-- Option 1: Temporarily disable RLS for insertion (for local dev only)
-- Option 2: Create auth.users entries first (requires Supabase dashboard)
--
-- For local development, we'll insert directly into profiles
-- and the reviews will use these profile IDs

-- First, let's ensure we can insert test profiles
-- We'll use the service role to bypass RLS

-- ============================================
-- Test User Profiles (use fixed UUIDs for consistency)
-- ============================================

-- Note: These profiles use fixed UUIDs that can be referenced in reviews
-- In production Supabase, you'd create real auth users first

-- Profile 1: Sarah - Hip-Hop & R&B lover
INSERT INTO profiles (id, display_name, username, email, avatar_url, bio, accent_color, onboarding_completed)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Sarah Johnson',
  'sarah_hiphop',
  'sarah@test.onchord.app',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  'Hip-Hop head since day one. Kendrick is the GOAT. Always looking for new underground artists.',
  '#FF6B6B',
  true
) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- Profile 2: Marcus - Jazz & Soul enthusiast
INSERT INTO profiles (id, display_name, username, email, avatar_url, bio, accent_color, onboarding_completed)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Marcus Williams',
  'jazz_marcus',
  'marcus@test.onchord.app',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  'Jazz is life. From Coltrane to Kamasi Washington. Vinyl collector. Music theory nerd.',
  '#4ECDC4',
  true
) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- Profile 3: Emma - Indie & Alternative
INSERT INTO profiles (id, display_name, username, email, avatar_url, bio, accent_color, onboarding_completed)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Emma Davis',
  'indie_emma',
  'emma@test.onchord.app',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
  'Living for indie rock and dreamy shoegaze. Radiohead changed my life. Concert addict.',
  '#A78BFA',
  true
) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- Profile 4: Jamal - Electronic & Dance
INSERT INTO profiles (id, display_name, username, email, avatar_url, bio, accent_color, onboarding_completed)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Jamal Carter',
  'beats_jamal',
  'jamal@test.onchord.app',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
  'Electronic music producer. From house to techno to dubstep. If it has bass, Im in.',
  '#F472B6',
  true
) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- Profile 5: Mia - Pop & Latin
INSERT INTO profiles (id, display_name, username, email, avatar_url, bio, accent_color, onboarding_completed)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  'Mia Rodriguez',
  'mia_pop',
  'mia@test.onchord.app',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
  'Pop princess & reggaeton queen! Bad Bunny, Doja Cat, Rosalia... love it all!',
  '#FBBF24',
  true
) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- Profile 6: David - Rock & Metal
INSERT INTO profiles (id, display_name, username, email, avatar_url, bio, accent_color, onboarding_completed)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  'David Chen',
  'metal_david',
  'david@test.onchord.app',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400',
  'Rock is not dead! From classic Sabbath to modern prog metal. Drummer in a local band.',
  '#EF4444',
  true
) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- Profile 7: Chloe - Classical & Ambient
INSERT INTO profiles (id, display_name, username, email, avatar_url, bio, accent_color, onboarding_completed)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  'Chloe Park',
  'classical_chloe',
  'chloe@test.onchord.app',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
  'Classically trained pianist exploring ambient and neo-classical. Nils Frahm is everything.',
  '#6366F1',
  true
) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- Profile 8: Tyler - R&B & Chill
INSERT INTO profiles (id, display_name, username, email, avatar_url, bio, accent_color, onboarding_completed)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  'Tyler Brooks',
  'chill_tyler',
  'tyler@test.onchord.app',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
  'Smooth R&B and lo-fi beats. Late night vibes only. Frank Ocean appreciator.',
  '#10B981',
  true
) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;


-- ============================================
-- Sample Reviews for Each Profile
-- ============================================

-- Sarah's Reviews (Hip-Hop)
INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r1111111-0001-0001-0001-111111111111', '11111111-1111-1111-1111-111111111111', 'Sarah Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
   '0sNOF9WDwhWunNAHPD3Baj', 'good kid, m.A.A.d city', 'Kendrick Lamar', 'https://i.scdn.co/image/ab67616d0000b273d28d2ebdedb220e479743797',
   5, 'album', 'This album changed my life. The storytelling, the production, the way Kendrick takes you through Compton... absolute masterpiece. Swimming Pools still hits different.', 
   '["hip-hop", "classic", "storytelling", "west-coast"]', true, 'Nostalgic', NOW() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r1111111-0002-0002-0002-111111111111', '11111111-1111-1111-1111-111111111111', 'Sarah Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
   '6s84u2TUpR3wdUv4NgKA2j', 'DAMN.', 'Kendrick Lamar', 'https://i.scdn.co/image/ab67616d0000b2738b52c6b9bc4e43d873869699',
   5, 'album', 'Pulitzer Prize winner for a reason. DNA and HUMBLE had everyone on lock. The way he plays with duality throughout... genius.', 
   '["hip-hop", "rap", "award-winning"]', true, 'Energetic', NOW() - interval '1 week')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r1111111-0003-0003-0003-111111111111', '11111111-1111-1111-1111-111111111111', 'Sarah Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
   '4yP0xhwLykW7N4I1V7NuYX', 'SOS', 'SZA', 'https://i.scdn.co/image/ab67616d0000b2730c471c36970b9406233842a5',
   4, 'album', 'SZA delivered on this one! Kill Bill is addictive. The vulnerability in her voice on tracks like Ghost in the Machine is incredible. Perfect late night album.', 
   '["r&b", "emotional", "female-artist"]', true, 'Melancholic', NOW() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- Marcus's Reviews (Jazz)
INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r2222222-0001-0001-0001-222222222222', '22222222-2222-2222-2222-222222222222', 'Marcus Williams', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
   '1A2GTWGtFfWp7KSQTwWOyo', 'A Love Supreme', 'John Coltrane', 'https://i.scdn.co/image/ab67616d0000b273b4d6c974e21d878a77bc0698',
   5, 'album', 'The spiritual jazz masterpiece. Coltrane reached transcendence on this record. Every single note feels intentional, every phrase a prayer. Essential listening.',
   '["jazz", "spiritual", "classic", "essential"]', true, 'Peaceful', NOW() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r2222222-0002-0002-0002-222222222222', '22222222-2222-2222-2222-222222222222', 'Marcus Williams', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
   '2r3lT4aL0e3lVTQlWZWgBW', 'Kind of Blue', 'Miles Davis', 'https://i.scdn.co/image/ab67616d0000b2734f9a3d7b2a0c9f9e3e2d1c0b',
   5, 'album', 'If you want to understand jazz, start here. So What is the perfect introduction. Modal jazz at its finest. This album basically invented cool.',
   '["jazz", "modal", "classic", "essential"]', true, 'Chill', NOW() - interval '10 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r2222222-0003-0003-0003-222222222222', '22222222-2222-2222-2222-222222222222', 'Marcus Williams', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
   '0FZK97MXMm5mUQ8mtudjuK', 'The Epic', 'Kamasi Washington', 'https://i.scdn.co/image/ab67616d0000b2735f6c9f4d6c7f8e3b2a1d0c9e',
   5, 'album', 'Modern jazz that respects tradition while pushing forward. Nearly 3 hours of pure musical brilliance. Change of the Guard shows why Kamasi is leading the new jazz movement.',
   '["jazz", "modern", "spiritual", "epic"]', true, 'Inspired', NOW() - interval '4 days')
ON CONFLICT (id) DO NOTHING;

-- Emma's Reviews (Indie)
INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r3333333-0001-0001-0001-333333333333', '33333333-3333-3333-3333-333333333333', 'Emma Davis', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
   '6dVIqQ8qmQ5GBnJ9shOYGE', 'OK Computer', 'Radiohead', 'https://i.scdn.co/image/ab67616d0000b273c8b444df094279e70d0ed856',
   5, 'album', 'Prophetic. Thom Yorke saw the future in 1997. Paranoid Android is a journey, Karma Police is haunting, and No Surprises breaks me every time. Still relevant today.',
   '["rock", "alternative", "experimental", "essential"]', true, 'Melancholic', NOW() - interval '6 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r3333333-0002-0002-0002-333333333333', '33333333-3333-3333-3333-333333333333', 'Emma Davis', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
   '20r762YmB5HeofjMCiPMLv', 'My Beautiful Dark Twisted Fantasy', 'Kanye West', 'https://i.scdn.co/image/ab67616d0000b273d9194aa18fa4c9362b47464f',
   5, 'album', 'His magnum opus. Runaway is 9 minutes of pure emotion. The production on this is insane - every single track has something special. Dark Fantasy as an opener? Perfect.',
   '["hip-hop", "experimental", "maximalist"]', true, 'Inspired', NOW() - interval '2 weeks')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r3333333-0003-0003-0003-333333333333', '33333333-3333-3333-3333-333333333333', 'Emma Davis', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
   '2fenSS68JI1h4Fo296JfGr', 'Punisher', 'Phoebe Bridgers', 'https://i.scdn.co/image/ab67616d0000b2738bc5c2a6dadd98f8ec8d2f0a',
   5, 'album', 'Phoebe captures melancholy like no one else. I Know The End builds into this apocalyptic crescendo thats just... wow. Her songwriting is devastating in the best way.',
   '["indie", "folk", "emotional", "female-artist"]', true, 'Sad', NOW() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

-- Jamal's Reviews (Electronic)
INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r4444444-0001-0001-0001-444444444444', '44444444-4444-4444-4444-444444444444', 'Jamal Carter', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
   '2noRn2Aes5aoNVsU6iWThc', 'Random Access Memories', 'Daft Punk', 'https://i.scdn.co/image/ab67616d0000b2739b9b36b0e22870b9f542d937',
   5, 'album', 'The production on this is INSANE. Get Lucky was everywhere but the deep cuts like Touch and Beyond are where the magic really is. They literally made a perfect album.',
   '["electronic", "disco", "funk", "production"]', true, 'Happy', NOW() - interval '4 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r4444444-0002-0002-0002-444444444444', '44444444-4444-4444-4444-444444444444', 'Jamal Carter', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
   '3mH6qwIy9crq0I9YQbOuDf', 'Blonde', 'Frank Ocean', 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526',
   5, 'album', 'Blonde changed me. The production choices, the vocal layering, Nights switching halfway through... Frank is an artist in the truest sense. Self Control hits every single time.',
   '["r&b", "experimental", "emotional"]', true, 'Melancholic', NOW() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r4444444-0003-0003-0003-444444444444', '44444444-4444-4444-4444-444444444444', 'Jamal Carter', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
   '4G2KPZqEi0UM4Cr8BqIy41', 'RENAISSANCE', 'Beyoncé', 'https://i.scdn.co/image/ab67616d0000b2730e58a0f8308c1ad403d105e7',
   5, 'album', 'Beyoncé understood the assignment! Pure house and disco energy. BREAK MY SOUL got me through tough times. The sample choices are impeccable. Club classic.',
   '["electronic", "house", "dance", "disco"]', true, 'Energetic', NOW() - interval '1 week')
ON CONFLICT (id) DO NOTHING;

-- Mia's Reviews (Pop/Latin)
INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r5555555-0001-0001-0001-555555555555', '55555555-5555-5555-5555-555555555555', 'Mia Rodriguez', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
   '3RQQmkQEvNCY4prGKE6oc5', 'Un Verano Sin Ti', 'Bad Bunny', 'https://i.scdn.co/image/ab67616d0000b273ab5c9cd818ad6ed3e9b79cd1',
   5, 'album', 'ALBUM OF THE YEAR! Bad Bunny literally saved summer. Me Porto Bonito, Titi Me Pregunto, Ojitos Lindos... every track is a vibe. Beach music perfection.',
   '["reggaeton", "latin", "summer", "party"]', true, 'Happy', NOW() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r5555555-0002-0002-0002-555555555555', '55555555-5555-5555-5555-555555555555', 'Mia Rodriguez', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
   '2ODvWsOgouMbaA5xf0RkJe', 'Chromatica', 'Lady Gaga', 'https://i.scdn.co/image/ab67616d0000b273505190077497c230422f5c8d',
   4, 'album', 'Mother Monster delivered the dance album we needed! Stupid Love and Rain On Me are pure serotonin. This album got me through quarantine dancing in my room.',
   '["pop", "dance", "electronic"]', true, 'Energetic', NOW() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r5555555-0003-0003-0003-555555555555', '55555555-5555-5555-5555-555555555555', 'Mia Rodriguez', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
   '4iKlP9cDYN9BNJibPLAlq5', 'Planet Her', 'Doja Cat', 'https://i.scdn.co/image/ab67616d0000b2734df3245f26298a1579ecc321',
   4, 'album', 'Doja ate this up! Kiss Me More is pop perfection, Need to Know is sultry excellence. She can do ANYTHING genre-wise and it works. Production is top tier.',
   '["pop", "r&b", "fun"]', true, 'Happy', NOW() - interval '1 week')
ON CONFLICT (id) DO NOTHING;

-- David's Reviews (Rock/Metal)
INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r6666666-0001-0001-0001-666666666666', '66666666-6666-6666-6666-666666666666', 'David Chen', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400',
   '2guirTSEqLizK7j9i1MTTZ', 'Master of Puppets', 'Metallica', 'https://i.scdn.co/image/ab67616d0000b273d2fac5c29c347f8e2b7b3d9e',
   5, 'album', 'Thrash metal perfection. The title track is an 8-minute journey through pure aggression. Battery, Orion, Disposable Heroes - every track absolutely rips. Essential metal.',
   '["metal", "thrash", "classic", "essential"]', true, 'Aggressive', NOW() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r6666666-0002-0002-0002-666666666666', '66666666-6666-6666-6666-666666666666', 'David Chen', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400',
   '6vuykQgDLUCiZ7YggIpLM9', 'Lateralus', 'Tool', 'https://i.scdn.co/image/ab67616d0000b273f0b7b1d2e5a5e43c6c8a3f4e',
   5, 'album', 'Prog metal at its absolute peak. The rhythms, the philosophy, the artwork - everything is intentional. Lateralus uses the Fibonacci sequence! These guys are geniuses.',
   '["metal", "progressive", "experimental"]', true, 'Focused', NOW() - interval '1 week')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r6666666-0003-0003-0003-666666666666', '66666666-6666-6666-6666-666666666666', 'David Chen', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400',
   '2Aq4GJWOkAWvj7X7F5C3d1', 'Led Zeppelin IV', 'Led Zeppelin', 'https://i.scdn.co/image/ab67616d0000b273e3df2dfc6b7e2d3f6a8c9b4a',
   5, 'album', 'Stairway! Black Dog! When the Levee Breaks! This album single-handedly invented hard rock as we know it. Jimmy Page is a wizard. Timeless classics.',
   '["rock", "classic", "essential", "70s"]', true, 'Nostalgic', NOW() - interval '4 days')
ON CONFLICT (id) DO NOTHING;

-- Chloe's Reviews (Classical/Ambient)
INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r7777777-0001-0001-0001-777777777777', '77777777-7777-7777-7777-777777777777', 'Chloe Park', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
   '4VZ7jhV0wHpoNPCB5k5lXs', 'Spaces', 'Nils Frahm', 'https://i.scdn.co/image/ab67616d0000b2731f7a8f3e4d5c6b7a8e9d0c1f',
   5, 'album', 'Nils is a genius. This live album captures the magic of his performances - the piano, the synthesizers, the improvisation. Says is absolutely mesmerizing. Perfect focus music.',
   '["neo-classical", "ambient", "piano", "experimental"]', true, 'Peaceful', NOW() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r7777777-0002-0002-0002-777777777777', '77777777-7777-7777-7777-777777777777', 'Chloe Park', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
   '3I6YdKf91LUqSNdRn0Y3bm', 'Music for Airports', 'Brian Eno', 'https://i.scdn.co/image/ab67616d0000b2737b8e9f8c6d5a4b3c2a1e0f9d',
   5, 'album', 'The album that defined ambient music. Eno created soundscapes that transform physical spaces. Still incredibly innovative decades later. Essential listening for any musician.',
   '["ambient", "experimental", "classic", "electronic"]', true, 'Calm', NOW() - interval '6 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r7777777-0003-0003-0003-777777777777', '77777777-7777-7777-7777-777777777777', 'Chloe Park', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
   '1L7QfPl2WbTJTqn1TSUFIL', 'In a Safe Place', 'The Album Leaf', 'https://i.scdn.co/image/ab67616d0000b273a2c3d4e5f6a7b8c9d0e1f2a3',
   4, 'album', 'Beautiful post-rock/ambient blend. Window is one of the most beautiful instrumentals ever created. Perfect for rainy days and deep reflection. Jimmy LaValle is underrated.',
   '["post-rock", "ambient", "instrumental"]', true, 'Melancholic', NOW() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- Tyler's Reviews (R&B/Chill)
INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r8888888-0001-0001-0001-888888888888', '88888888-8888-8888-8888-888888888888', 'Tyler Brooks', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
   '3mH6qwIy9crq0I9YQbOuDf', 'Blonde', 'Frank Ocean', 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526',
   5, 'album', 'Frank Ocean is a once-in-a-generation artist. The production on this is so experimental yet so smooth. White Ferrari at 3am hits different. Changed how I think about R&B.',
   '["r&b", "experimental", "emotional", "essential"]', true, 'Melancholic', NOW() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r8888888-0002-0002-0002-888888888888', '88888888-8888-8888-8888-888888888888', 'Tyler Brooks', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
   '6kf46HbnYCZzP6rjvQT40z', 'CTRL', 'SZA', 'https://i.scdn.co/image/ab67616d0000b273e4d1f34b8dc8d57c4af4d54b',
   5, 'album', 'SZA redefined R&B with this. Love Galore, The Weekend, Drew Barrymore - every track is a vibe. Her vulnerability is so refreshing. This album raised the bar.',
   '["r&b", "neo-soul", "female-artist"]', true, 'Chill', NOW() - interval '4 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('r8888888-0003-0003-0003-888888888888', '88888888-8888-8888-8888-888888888888', 'Tyler Brooks', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
   '6XCBR1G1sCH3UvX7UvunoO', 'Channel Orange', 'Frank Ocean', 'https://i.scdn.co/image/ab67616d0000b2739269954e4ab7ed6b13a79e69',
   5, 'album', 'Before Blonde there was this masterpiece. Thinkin Bout You, Pyramids, Pink Matter - Frank was already showing he was special. The transition on Pyramids is legendary.',
   '["r&b", "soul", "classic"]', true, 'Nostalgic', NOW() - interval '1 week')
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- Sample Follows (connections between profiles)
-- ============================================
-- Note: These won't work without auth.users entries, but provide the structure
-- You can create follows manually in the app for testing

-- ============================================
-- Sample Favorites for profiles
-- ============================================
INSERT INTO favorites (id, user_id, item_id, item_type, item_title, item_artist, item_cover, added_at)
VALUES
  -- Sarah's favorites
  ('f1111111-0001-0001-0001-111111111111', '11111111-1111-1111-1111-111111111111', '0sNOF9WDwhWunNAHPD3Baj', 'album', 'good kid, m.A.A.d city', 'Kendrick Lamar', 'https://i.scdn.co/image/ab67616d0000b273d28d2ebdedb220e479743797', NOW() - interval '30 days'),
  ('f1111111-0002-0002-0002-111111111111', '11111111-1111-1111-1111-111111111111', '6s84u2TUpR3wdUv4NgKA2j', 'album', 'DAMN.', 'Kendrick Lamar', 'https://i.scdn.co/image/ab67616d0000b2738b52c6b9bc4e43d873869699', NOW() - interval '25 days'),
  -- Marcus's favorites
  ('f2222222-0001-0001-0001-222222222222', '22222222-2222-2222-2222-222222222222', '1A2GTWGtFfWp7KSQTwWOyo', 'album', 'A Love Supreme', 'John Coltrane', 'https://i.scdn.co/image/ab67616d0000b273b4d6c974e21d878a77bc0698', NOW() - interval '60 days'),
  -- Emma's favorites
  ('f3333333-0001-0001-0001-333333333333', '33333333-3333-3333-3333-333333333333', '6dVIqQ8qmQ5GBnJ9shOYGE', 'album', 'OK Computer', 'Radiohead', 'https://i.scdn.co/image/ab67616d0000b273c8b444df094279e70d0ed856', NOW() - interval '45 days'),
  -- Jamal's favorites
  ('f4444444-0001-0001-0001-444444444444', '44444444-4444-4444-4444-444444444444', '2noRn2Aes5aoNVsU6iWThc', 'album', 'Random Access Memories', 'Daft Punk', 'https://i.scdn.co/image/ab67616d0000b2739b9b36b0e22870b9f542d937', NOW() - interval '20 days'),
  -- Tyler's favorites  
  ('f8888888-0001-0001-0001-888888888888', '88888888-8888-8888-8888-888888888888', '3mH6qwIy9crq0I9YQbOuDf', 'album', 'Blonde', 'Frank Ocean', 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526', NOW() - interval '15 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Summary: 8 Test Profiles Created
-- ============================================
-- 1. Sarah Johnson (@sarah_hiphop) - Hip-Hop/R&B
-- 2. Marcus Williams (@jazz_marcus) - Jazz/Soul
-- 3. Emma Davis (@indie_emma) - Indie/Alternative
-- 4. Jamal Carter (@beats_jamal) - Electronic/Dance
-- 5. Mia Rodriguez (@mia_pop) - Pop/Latin
-- 6. David Chen (@metal_david) - Rock/Metal
-- 7. Chloe Park (@classical_chloe) - Classical/Ambient
-- 8. Tyler Brooks (@chill_tyler) - R&B/Chill
--
-- Each profile has 3 reviews with different moods and albums.
-- This allows testing taste matching between very different music preferences!
