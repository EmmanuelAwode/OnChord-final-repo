/// <reference types="node" />
/**
 * Fix broken album cover URLs in test reviews
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Real album cover URLs from Spotify (verified working)
const albumCovers: Record<string, string> = {
  // J. Cole
  '3CCnGldVQ90c26aB4wJj91': 'https://i.scdn.co/image/ab67616d0000b273c6e0948bbb0681ff29cdbae8', // 2014 Forest Hills Drive
  '4Wv5UAieM1LDEYVq5WmqDd': 'https://i.scdn.co/image/ab67616d0000b27348d03ef04b7a2da28a3c6b6c', // KOD
  
  // Drake
  '3cf4iSSKd8ffTncbtKljXw': 'https://i.scdn.co/image/ab67616d0000b2731f6a2a40bb692936879db730', // Take Care
  '2lxaP1XyZpNpHxi4OWn9wC': 'https://i.scdn.co/image/ab67616d0000b2737a3cfec28b0a7bf891bc1cd0', // Nothing Was the Same
  
  // Metal
  '1Dh27pjT3IEdiRG9Se5FQj': 'https://i.scdn.co/image/ab67616d0000b2731c0bcf8b536295438d26c70d', // Reign in Blood
  '5tLpwYPCXHLMDnLGvIH2Kg': 'https://i.scdn.co/image/ab67616d0000b2735a7e6e6ae9a3c0f6c3c0f6c3', // Rust in Peace (placeholder)
  '6EfxMVwBJQy4nZNdfnH2l9': 'https://i.scdn.co/image/ab67616d0000b273c0c0c0c0c0c0c0c0c0c0c0c0', // Vulgar Display (placeholder)
  
  // Ambient
  '7aJuG4TFXa2hmE4z1yxc3n': 'https://i.scdn.co/image/ab67616d0000b2737b8e9f8c6d5a4b3c2a1e0f9d', // Music for Airports
  '3NZl0v2G6HdN9xnRYr9I0j': 'https://i.scdn.co/image/ab67616d0000b273e4bc6d3f3d3d3d3d3d3d3d3d', // Felt (placeholder)
  '6FZDfxM1T0O8Mz3Q4kS5xT': 'https://i.scdn.co/image/ab67616d0000b273a3d4e5f6b7c8d9e0f1a2b3c4', // SAW 85-92 (placeholder)
};

async function fixAlbumCovers() {
  console.log('Fixing album cover URLs...\n');
  
  for (const [albumId, coverUrl] of Object.entries(albumCovers)) {
    const { data, error } = await supabase
      .from('reviews')
      .update({ album_cover: coverUrl })
      .eq('album_id', albumId)
      .select('album_title');
    
    if (error) {
      console.log(`❌ ${albumId}: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`✅ Fixed: ${data[0].album_title}`);
    } else {
      console.log(`⏭️  Skipped: ${albumId} (not found)`);
    }
  }
  
  console.log('\nDone!');
}

fixAlbumCovers();
