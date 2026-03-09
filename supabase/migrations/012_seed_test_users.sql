-- ============================================
-- OnChord Test Profiles - Simple Direct Insert
-- ============================================
-- Run this in Supabase SQL Editor
-- Creates test profiles for taste matching, following, and discovery testing

-- First, temporarily drop the FK constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Insert test profiles with fixed UUIDs
INSERT INTO public.profiles (id, display_name, username, email, avatar_url, bio, accent_color, onboarding_completed)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Sarah Johnson', 'sarah_hiphop', 'sarah@test.onchord.app',
   'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
   'Hip-Hop head since day one. Kendrick is the GOAT. Always looking for new underground artists.', '#FF6B6B', true),
  
  ('22222222-2222-2222-2222-222222222222', 'Marcus Williams', 'jazz_marcus', 'marcus@test.onchord.app',
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
   'Jazz is life. From Coltrane to Kamasi Washington. Vinyl collector. Music theory nerd.', '#4ECDC4', true),
  
  ('33333333-3333-3333-3333-333333333333', 'Emma Davis', 'indie_emma', 'emma@test.onchord.app',
   'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
   'Living for indie rock and dreamy shoegaze. Radiohead changed my life. Concert addict.', '#A78BFA', true),
  
  ('44444444-4444-4444-4444-444444444444', 'Jamal Carter', 'beats_jamal', 'jamal@test.onchord.app',
   'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
   'Electronic music producer. From house to techno to dubstep. If it has bass, Im in.', '#F472B6', true),
  
  ('55555555-5555-5555-5555-555555555555', 'Mia Rodriguez', 'mia_pop', 'mia@test.onchord.app',
   'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
   'Pop princess & reggaeton queen! Bad Bunny, Doja Cat, Rosalia... love it all!', '#FBBF24', true),
  
  ('66666666-6666-6666-6666-666666666666', 'David Chen', 'metal_david', 'david@test.onchord.app',
   'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400',
   'Rock is not dead! From classic Sabbath to modern prog metal. Drummer in a local band.', '#EF4444', true),
  
  ('77777777-7777-7777-7777-777777777777', 'Chloe Park', 'classical_chloe', 'chloe@test.onchord.app',
   'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
   'Classically trained pianist exploring ambient and neo-classical. Nils Frahm is everything.', '#6366F1', true),
  
  ('88888888-8888-8888-8888-888888888888', 'Tyler Brooks', 'chill_tyler', 'tyler@test.onchord.app',
   'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
   'Smooth R&B and lo-fi beats. Late night vibes only. Frank Ocean appreciator.', '#10B981', true)
ON CONFLICT (id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  username = EXCLUDED.username,
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url,
  accent_color = EXCLUDED.accent_color,
  onboarding_completed = true;

-- ============================================
-- Insert Reviews for each profile
-- ============================================

-- Drop FK constraint on reviews.uid if it exists
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_uid_fkey;

-- Sarah's Reviews (Hip-Hop/R&B)
INSERT INTO reviews (uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Sarah Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
   '0sNOF9WDwhWunNAHPD3Baj', 'good kid, m.A.A.d city', 'Kendrick Lamar', 'https://i.scdn.co/image/ab67616d0000b273d28d2ebdedb220e479743797',
   5, 'album', 'This album changed my life. The storytelling, the production, the way Kendrick takes you through Compton... absolute masterpiece. Swimming Pools still hits different.', 
   '["hip-hop", "classic", "storytelling", "west-coast"]', true, 'Nostalgic', NOW() - interval '3 days'),
  ('11111111-1111-1111-1111-111111111111', 'Sarah Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
   '6s84u2TUpR3wdUv4NgKA2j', 'DAMN.', 'Kendrick Lamar', 'https://i.scdn.co/image/ab67616d0000b2738b52c6b9bc4e43d873869699',
   5, 'album', 'Pulitzer Prize winner for a reason. DNA and HUMBLE had everyone on lock. The way he plays with duality throughout... genius.', 
   '["hip-hop", "rap", "award-winning"]', true, 'Energetic', NOW() - interval '1 week'),
  ('11111111-1111-1111-1111-111111111111', 'Sarah Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
   '4yP0xhwLykW7N4I1V7NuYX', 'SOS', 'SZA', 'https://i.scdn.co/image/ab67616d0000b2730c471c36970b9406233842a5',
   4, 'album', 'SZA delivered on this one! Kill Bill is addictive. The vulnerability in her voice on tracks like Ghost in the Machine is incredible. Perfect late night album.', 
   '["r&b", "emotional", "female-artist"]', true, 'Melancholic', NOW() - interval '5 days')
ON CONFLICT DO NOTHING;

-- Marcus's Reviews (Jazz)
INSERT INTO reviews (uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'Marcus Williams', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
   '1A2GTWGtFfWp7KSQTwWOyo', 'A Love Supreme', 'John Coltrane', 'https://i.scdn.co/image/ab67616d0000b273b4d6c974e21d878a77bc0698',
   5, 'album', 'The spiritual jazz masterpiece. Coltrane reached transcendence on this record. Every single note feels intentional, every phrase a prayer. Essential listening.',
   '["jazz", "spiritual", "classic", "essential"]', true, 'Peaceful', NOW() - interval '2 days'),
  ('22222222-2222-2222-2222-222222222222', 'Marcus Williams', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
   '1weenld61qoidwYuZ1GESA', 'Kind of Blue', 'Miles Davis', 'https://i.scdn.co/image/ab67616d0000b2734f9a3d7b2a0c9f9e3e2d1c0b',
   5, 'album', 'If you want to understand jazz, start here. So What is the perfect introduction. Modal jazz at its finest. This album basically invented cool.',
   '["jazz", "modal", "classic", "essential"]', true, 'Chill', NOW() - interval '10 days'),
  ('22222222-2222-2222-2222-222222222222', 'Marcus Williams', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
   '0FZK97MXMm5mUQ8mtudjuK', 'The Epic', 'Kamasi Washington', 'https://i.scdn.co/image/ab67616d0000b2735f6c9f4d6c7f8e3b2a1d0c9e',
   5, 'album', 'Modern jazz that respects tradition while pushing forward. Nearly 3 hours of pure musical brilliance. Change of the Guard shows why Kamasi is leading the new jazz movement.',
   '["jazz", "modern", "spiritual", "epic"]', true, 'Inspired', NOW() - interval '4 days')
ON CONFLICT DO NOTHING;

-- Emma's Reviews (Indie/Alternative)
INSERT INTO reviews (uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'Emma Davis', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
   '6dVIqQ8qmQ5GBnJ9shOYGE', 'OK Computer', 'Radiohead', 'https://i.scdn.co/image/ab67616d0000b273c8b444df094279e70d0ed856',
   5, 'album', 'Prophetic. Thom Yorke saw the future in 1997. Paranoid Android is a journey, Karma Police is haunting, and No Surprises breaks me every time. Still relevant today.',
   '["rock", "alternative", "experimental", "essential"]', true, 'Melancholic', NOW() - interval '6 days'),
  ('33333333-3333-3333-3333-333333333333', 'Emma Davis', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
   '20r762YmB5HeofjMCiPMLv', 'My Beautiful Dark Twisted Fantasy', 'Kanye West', 'https://i.scdn.co/image/ab67616d0000b273d9194aa18fa4c9362b47464f',
   5, 'album', 'His magnum opus. Runaway is 9 minutes of pure emotion. The production on this is insane - every single track has something special. Dark Fantasy as an opener? Perfect.',
   '["hip-hop", "experimental", "maximalist"]', true, 'Inspired', NOW() - interval '2 weeks'),
  ('33333333-3333-3333-3333-333333333333', 'Emma Davis', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
   '2fenSS68JI1h4Fo296JfGr', 'Punisher', 'Phoebe Bridgers', 'https://i.scdn.co/image/ab67616d0000b2738bc5c2a6dadd98f8ec8d2f0a',
   5, 'album', 'Phoebe captures melancholy like no one else. I Know The End builds into this apocalyptic crescendo thats just... wow. Her songwriting is devastating in the best way.',
   '["indie", "folk", "emotional", "female-artist"]', true, 'Sad', NOW() - interval '3 days')
ON CONFLICT DO NOTHING;

-- Jamal's Reviews (Electronic/Dance)
INSERT INTO reviews (uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('44444444-4444-4444-4444-444444444444', 'Jamal Carter', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
   '2noRn2Aes5aoNVsU6iWThc', 'Random Access Memories', 'Daft Punk', 'https://i.scdn.co/image/ab67616d0000b2739b9b36b0e22870b9f542d937',
   5, 'album', 'The production on this is INSANE. Get Lucky was everywhere but the deep cuts like Touch and Beyond are where the magic really is. They literally made a perfect album.',
   '["electronic", "disco", "funk", "production"]', true, 'Happy', NOW() - interval '4 days'),
  ('44444444-4444-4444-4444-444444444444', 'Jamal Carter', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
   '3mH6qwIy9crq0I9YQbOuDf', 'Blonde', 'Frank Ocean', 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526',
   5, 'album', 'Blonde changed me. The production choices, the vocal layering, Nights switching halfway through... Frank is an artist in the truest sense. Self Control hits every single time.',
   '["r&b", "experimental", "emotional"]', true, 'Melancholic', NOW() - interval '1 day'),
  ('44444444-4444-4444-4444-444444444444', 'Jamal Carter', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
   '4G2KPZqEi0UM4Cr8BqIy41', 'RENAISSANCE', 'Beyoncé', 'https://i.scdn.co/image/ab67616d0000b2730e58a0f8308c1ad403d105e7',
   5, 'album', 'Beyoncé understood the assignment! Pure house and disco energy. BREAK MY SOUL got me through tough times. The sample choices are impeccable. Club classic.',
   '["electronic", "house", "dance", "disco"]', true, 'Energetic', NOW() - interval '1 week')
ON CONFLICT DO NOTHING;

-- Mia's Reviews (Pop/Latin)
INSERT INTO reviews (uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('55555555-5555-5555-5555-555555555555', 'Mia Rodriguez', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
   '3RQQmkQEvNCY4prGKE6oc5', 'Un Verano Sin Ti', 'Bad Bunny', 'https://i.scdn.co/image/ab67616d0000b273ab5c9cd818ad6ed3e9b79cd1',
   5, 'album', 'ALBUM OF THE YEAR! Bad Bunny literally saved summer. Me Porto Bonito, Titi Me Pregunto, Ojitos Lindos... every track is a vibe. Beach music perfection.',
   '["reggaeton", "latin", "summer", "party"]', true, 'Happy', NOW() - interval '2 days'),
  ('55555555-5555-5555-5555-555555555555', 'Mia Rodriguez', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
   '2ODvWsOgouMbaA5xf0RkJe', 'Chromatica', 'Lady Gaga', 'https://i.scdn.co/image/ab67616d0000b273505190077497c230422f5c8d',
   4, 'album', 'Mother Monster delivered the dance album we needed! Stupid Love and Rain On Me are pure serotonin. This album got me through quarantine dancing in my room.',
   '["pop", "dance", "electronic"]', true, 'Energetic', NOW() - interval '5 days'),
  ('55555555-5555-5555-5555-555555555555', 'Mia Rodriguez', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
   '4iKlP9cDYN9BNJibPLAlq5', 'Planet Her', 'Doja Cat', 'https://i.scdn.co/image/ab67616d0000b2734df3245f26298a1579ecc321',
   4, 'album', 'Doja ate this up! Kiss Me More is pop perfection, Need to Know is sultry excellence. She can do ANYTHING genre-wise and it works. Production is top tier.',
   '["pop", "r&b", "fun"]', true, 'Happy', NOW() - interval '1 week')
ON CONFLICT DO NOTHING;

-- David's Reviews (Rock/Metal)
INSERT INTO reviews (uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('66666666-6666-6666-6666-666666666666', 'David Chen', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400',
   '2guirTSEqLizK7j9i1MTTZ', 'Master of Puppets', 'Metallica', 'https://i.scdn.co/image/ab67616d0000b273668e3aca3167e6e569a9aa20',
   5, 'album', 'Thrash metal perfection. The title track is an 8-minute journey through pure aggression. Battery, Orion, Disposable Heroes - every track absolutely rips. Essential metal.',
   '["metal", "thrash", "classic", "essential"]', true, 'Aggressive', NOW() - interval '3 days'),
  ('66666666-6666-6666-6666-666666666666', 'David Chen', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400',
   '6vuykQgDLUCiZ7YggIpLM9', 'Lateralus', 'Tool', 'https://i.scdn.co/image/ab67616d0000b273f0b7b1d2e5a5e43c6c8a3f4e',
   5, 'album', 'Prog metal at its absolute peak. The rhythms, the philosophy, the artwork - everything is intentional. Lateralus uses the Fibonacci sequence! These guys are geniuses.',
   '["metal", "progressive", "experimental"]', true, 'Focused', NOW() - interval '1 week'),
  ('66666666-6666-6666-6666-666666666666', 'David Chen', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400',
   '5EyIDBAqhnlkAHqvPRwdbH', 'Led Zeppelin IV', 'Led Zeppelin', 'https://i.scdn.co/image/ab67616d0000b2736f68b29e6d2afa7f54064a25',
   5, 'album', 'Stairway! Black Dog! When the Levee Breaks! This album single-handedly invented hard rock as we know it. Jimmy Page is a wizard. Timeless classics.',
   '["rock", "classic", "essential", "70s"]', true, 'Nostalgic', NOW() - interval '4 days')
ON CONFLICT DO NOTHING;

-- Chloe's Reviews (Classical/Ambient)
INSERT INTO reviews (uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('77777777-7777-7777-7777-777777777777', 'Chloe Park', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
   '1DFixLWuPkv3KT3TnV35m3', 'Spaces', 'Nils Frahm', 'https://i.scdn.co/image/ab67616d0000b2731f7a8f3e4d5c6b7a8e9d0c1f',
   5, 'album', 'Nils is a genius. This live album captures the magic of his performances - the piano, the synthesizers, the improvisation. Says is absolutely mesmerizing. Perfect focus music.',
   '["neo-classical", "ambient", "piano", "experimental"]', true, 'Peaceful', NOW() - interval '2 days'),
  ('77777777-7777-7777-7777-777777777777', 'Chloe Park', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
   '063f8Ej8rLVTz9KkjQKEMa', 'Ambient 1: Music for Airports', 'Brian Eno', 'https://i.scdn.co/image/ab67616d0000b273419ccce48c6d1b1d5b7a0bcd',
   5, 'album', 'The album that defined ambient music. Eno created soundscapes that transform physical spaces. Still incredibly innovative decades later. Essential listening for any musician.',
   '["ambient", "experimental", "classic", "electronic"]', true, 'Calm', NOW() - interval '6 days'),
  ('77777777-7777-7777-7777-777777777777', 'Chloe Park', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
   '7Ks4VCY1wFebnOdJrM13t6', 'All', 'Yann Tiersen', 'https://i.scdn.co/image/ab67616d0000b273a2c3d4e5f6a7b8c9d0e1f2a3',
   4, 'album', 'Beautiful minimalist piano compositions. Yann Tiersen creates emotional landscapes with such simplicity. Perfect for rainy days and deep reflection.',
   '["neo-classical", "piano", "minimalist"]', true, 'Melancholic', NOW() - interval '5 days')
ON CONFLICT DO NOTHING;

-- Tyler's Reviews (R&B/Chill)
INSERT INTO reviews (uid, user_name, user_avatar, album_id, album_title, album_artist, album_cover, rating, review_type, content, tags, is_public, mood, created_at)
VALUES
  ('88888888-8888-8888-8888-888888888888', 'Tyler Brooks', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
   '3mH6qwIy9crq0I9YQbOuDf', 'Blonde', 'Frank Ocean', 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526',
   5, 'album', 'Frank Ocean is a once-in-a-generation artist. The production on this is so experimental yet so smooth. White Ferrari at 3am hits different. Changed how I think about R&B.',
   '["r&b", "experimental", "emotional", "essential"]', true, 'Melancholic', NOW() - interval '1 day'),
  ('88888888-8888-8888-8888-888888888888', 'Tyler Brooks', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
   '6kf46HbnYCZzP6rjvQT40z', 'CTRL', 'SZA', 'https://i.scdn.co/image/ab67616d0000b273e4d1f34b8dc8d57c4af4d54b',
   5, 'album', 'SZA redefined R&B with this. Love Galore, The Weekend, Drew Barrymore - every track is a vibe. Her vulnerability is so refreshing. This album raised the bar.',
   '["r&b", "neo-soul", "female-artist"]', true, 'Chill', NOW() - interval '4 days'),
  ('88888888-8888-8888-8888-888888888888', 'Tyler Brooks', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
   '392p3shh2jkxUxY2VHvlH8', 'Channel Orange', 'Frank Ocean', 'https://i.scdn.co/image/ab67616d0000b2739269954e4ab7ed6b13a79e69',
   5, 'album', 'Before Blonde there was this masterpiece. Thinkin Bout You, Pyramids, Pink Matter - Frank was already showing he was special. The transition on Pyramids is legendary.',
   '["r&b", "soul", "classic"]', true, 'Nostalgic', NOW() - interval '1 week')
ON CONFLICT DO NOTHING;

-- ============================================
-- Verification Query (run after the inserts)
-- ============================================
SELECT 
  p.username,
  p.display_name,
  p.bio,
  (SELECT COUNT(*) FROM reviews r WHERE r.uid = p.id) as review_count
FROM profiles p
WHERE p.username IN ('sarah_hiphop', 'jazz_marcus', 'indie_emma', 'beats_jamal', 'mia_pop', 'metal_david', 'classical_chloe', 'chill_tyler');
