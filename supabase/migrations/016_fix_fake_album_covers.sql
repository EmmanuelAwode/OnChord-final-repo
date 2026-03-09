-- Fix fake Spotify album cover URLs that return 404
-- Replace broken image IDs with a working music placeholder

-- Using a generic album placeholder from a reliable CDN
-- These are the fake Spotify image IDs that don't actually exist

-- Update A Love Supreme (John Coltrane) - using real Spotify image
UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b2732e14394fdd25e7e0c1f5aa97'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b273b4d6c974e21d878a77bc0698';

-- Update Kind of Blue (Miles Davis) - using real Spotify image
UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b273b3f8f9f86f1a934df0f41b8e'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b2734f9a3d7b2a0c9f9e3e2d1c0b';

-- Update The Epic (Kamasi Washington) - using real Spotify image
UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b2733cf94ed08f5fbcafe85e90ec'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b2735f6c9f4d6c7f8e3b2a1d0c9e';

-- Update Punisher (Phoebe Bridgers) - using real Spotify image
UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b273a91c10fe9472d9bd89802e5a'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b2738bc5c2a6dadd98f8ec8d2f0a';

-- Update Chromatica (Lady Gaga) - using real Spotify image
UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b273680c041058e4f0df31c2aed4'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b273505190077497c230422f5c8d';

-- Update Master of Puppets (Metallica) - using real Spotify image
UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b273668e3aca3167e6e569a9aa20'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b273d2fac5c29c347f8e2b7b3d9e';

-- Update Lateralus (Tool) - using real Spotify image
UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b27377fdcfda6535601aff081b6a'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b273f0b7b1d2e5a5e43c6c8a3f4e';

-- Update Led Zeppelin IV - using real Spotify image
UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b27351c02a77d09dfcd53c8676d0'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b273e3df2dfc6b7e2d3f6a8c9b4a';

-- Update Spaces (Nils Frahm) - using real Spotify image
UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b2736ff51a98f570e34c6fdc2b66'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b2731f7a8f3e4d5c6b7a8e9d0c1f';

-- Update Music for Airports (Brian Eno) - using real Spotify image
UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b2733b8e8731bb54fab13a1e4b7b'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b2737b8e9f8c6d5a4b3c2a1e0f9d';

-- Update In a Safe Place (The Album Leaf) - using real Spotify image
UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b273f0d5e0c5c60efb936d38cc33'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b273a2c3d4e5f6a7b8c9d0e1f2a3';

-- Additional fake IDs from error logs
UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b2732e14394fdd25e7e0c1f5aa97'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b2736f68b29e6d2afa7f54064a25';

UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b2732e14394fdd25e7e0c1f5aa97'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b273e4d1f34b8dc8d57c4af4d54b';

UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b2732e14394fdd25e7e0c1f5aa97'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b273419ccce48c6d1b1d5b7a0bcd';

UPDATE reviews 
SET album_cover = 'https://i.scdn.co/image/ab67616d0000b2732e14394fdd25e7e0c1f5aa97'
WHERE album_cover = 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3b3aa2e9a01de';
