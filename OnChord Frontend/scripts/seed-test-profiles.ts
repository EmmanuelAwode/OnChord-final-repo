/// <reference types="node" />
/**
 * Seed Test Profiles Script
 * 
 * This script creates test users with diverse music tastes for testing
 * features like taste matching, friend reviews, etc.
 * 
 * Run with: npx ts-node scripts/seed-test-profiles.ts
 * Or: node scripts/seed-test-profiles.js (after building)
 */

import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.error('Please set VITE_SUPABASE_URL environment variable');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY') {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('You can find this in your Supabase dashboard under Settings > API');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test profiles with unique music tastes
const testProfiles = [
  {
    email: 'sarah@test.onchord.app',
    password: 'TestPassword123!',
    displayName: 'Sarah Johnson',
    username: 'sarah_hiphop',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    bio: 'Hip-Hop head since day one. Kendrick is the GOAT. Always looking for new underground artists.',
    accentColor: '#FF6B6B',
    genre: 'Hip-Hop/R&B',
    reviews: [
      {
        albumId: '0sNOF9WDwhWunNAHPD3Baj',
        albumTitle: 'good kid, m.A.A.d city',
        albumArtist: 'Kendrick Lamar',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b273d28d2ebdedb220e479743797',
        rating: 5,
        content: 'This album changed my life. The storytelling, the production, the way Kendrick takes you through Compton... absolute masterpiece.',
        mood: 'Nostalgic',
        tags: ['hip-hop', 'classic', 'storytelling'],
      },
      {
        albumId: '6s84u2TUpR3wdUv4NgKA2j',
        albumTitle: 'DAMN.',
        albumArtist: 'Kendrick Lamar',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b2738b52c6b9bc4e43d873869699',
        rating: 5,
        content: 'Pulitzer Prize winner for a reason. DNA and HUMBLE had everyone on lock.',
        mood: 'Energetic',
        tags: ['hip-hop', 'rap', 'award-winning'],
      },
      {
        albumId: '4yP0xhwLykW7N4I1V7NuYX',
        albumTitle: 'SOS',
        albumArtist: 'SZA',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b2730c471c36970b9406233842a5',
        rating: 4,
        content: 'SZA delivered on this one! Kill Bill is addictive. Perfect late night album.',
        mood: 'Melancholic',
        tags: ['r&b', 'emotional', 'female-artist'],
      },
    ],
  },
  {
    email: 'marcus@test.onchord.app',
    password: 'TestPassword123!',
    displayName: 'Marcus Williams',
    username: 'jazz_marcus',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    bio: 'Jazz is life. From Coltrane to Kamasi Washington. Vinyl collector. Music theory nerd.',
    accentColor: '#4ECDC4',
    genre: 'Jazz/Soul',
    reviews: [
      {
        albumId: '1A2GTWGtFfWp7KSQTwWOyo',
        albumTitle: 'A Love Supreme',
        albumArtist: 'John Coltrane',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b273b4d6c974e21d878a77bc0698',
        rating: 5,
        content: 'The spiritual jazz masterpiece. Coltrane reached transcendence on this record. Essential listening.',
        mood: 'Peaceful',
        tags: ['jazz', 'spiritual', 'classic'],
      },
      {
        albumId: '2r3lT4aL0e3lVTQlWZWgBW',
        albumTitle: 'Kind of Blue',
        albumArtist: 'Miles Davis',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b2734f9a3d7b2a0c9f9e3e2d1c0b',
        rating: 5,
        content: 'If you want to understand jazz, start here. Modal jazz at its finest.',
        mood: 'Chill',
        tags: ['jazz', 'modal', 'essential'],
      },
      {
        albumId: '0FZK97MXMm5mUQ8mtudjuK',
        albumTitle: 'The Epic',
        albumArtist: 'Kamasi Washington',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b2735f6c9f4d6c7f8e3b2a1d0c9e',
        rating: 5,
        content: 'Modern jazz that respects tradition while pushing forward. Nearly 3 hours of pure brilliance.',
        mood: 'Inspired',
        tags: ['jazz', 'modern', 'spiritual'],
      },
    ],
  },
  {
    email: 'emma@test.onchord.app',
    password: 'TestPassword123!',
    displayName: 'Emma Davis',
    username: 'indie_emma',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    bio: 'Living for indie rock and dreamy shoegaze. Radiohead changed my life. Concert addict.',
    accentColor: '#A78BFA',
    genre: 'Indie/Alternative',
    reviews: [
      {
        albumId: '6dVIqQ8qmQ5GBnJ9shOYGE',
        albumTitle: 'OK Computer',
        albumArtist: 'Radiohead',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b273c8b444df094279e70d0ed856',
        rating: 5,
        content: 'Prophetic. Thom Yorke saw the future in 1997. Paranoid Android is a journey.',
        mood: 'Melancholic',
        tags: ['rock', 'alternative', 'experimental'],
      },
      {
        albumId: '20r762YmB5HeofjMCiPMLv',
        albumTitle: 'My Beautiful Dark Twisted Fantasy',
        albumArtist: 'Kanye West',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b273d9194aa18fa4c9362b47464f',
        rating: 5,
        content: 'His magnum opus. Runaway is 9 minutes of pure emotion.',
        mood: 'Inspired',
        tags: ['hip-hop', 'experimental', 'maximalist'],
      },
      {
        albumId: '2fenSS68JI1h4Fo296JfGr',
        albumTitle: 'Punisher',
        albumArtist: 'Phoebe Bridgers',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b2738bc5c2a6dadd98f8ec8d2f0a',
        rating: 5,
        content: 'Phoebe captures melancholy like no one else. I Know The End builds into this apocalyptic crescendo.',
        mood: 'Sad',
        tags: ['indie', 'folk', 'emotional'],
      },
    ],
  },
  {
    email: 'jamal@test.onchord.app',
    password: 'TestPassword123!',
    displayName: 'Jamal Carter',
    username: 'beats_jamal',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    bio: 'Electronic music producer. From house to techno to dubstep. If it has bass, Im in.',
    accentColor: '#F472B6',
    genre: 'Electronic/Dance',
    reviews: [
      {
        albumId: '2noRn2Aes5aoNVsU6iWThc',
        albumTitle: 'Random Access Memories',
        albumArtist: 'Daft Punk',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b2739b9b36b0e22870b9f542d937',
        rating: 5,
        content: 'The production on this is INSANE. They literally made a perfect album.',
        mood: 'Happy',
        tags: ['electronic', 'disco', 'funk'],
      },
      {
        albumId: '3mH6qwIy9crq0I9YQbOuDf',
        albumTitle: 'Blonde',
        albumArtist: 'Frank Ocean',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526',
        rating: 5,
        content: 'Blonde changed me. The production choices, the vocal layering... Frank is an artist.',
        mood: 'Melancholic',
        tags: ['r&b', 'experimental', 'emotional'],
      },
      {
        albumId: '4G2KPZqEi0UM4Cr8BqIy41',
        albumTitle: 'RENAISSANCE',
        albumArtist: 'Beyoncé',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b2730e58a0f8308c1ad403d105e7',
        rating: 5,
        content: 'Beyoncé understood the assignment! Pure house and disco energy. Club classic.',
        mood: 'Energetic',
        tags: ['electronic', 'house', 'dance'],
      },
    ],
  },
  {
    email: 'mia@test.onchord.app',
    password: 'TestPassword123!',
    displayName: 'Mia Rodriguez',
    username: 'mia_pop',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    bio: 'Pop princess & reggaeton queen! Bad Bunny, Doja Cat, Rosalia... love it all!',
    accentColor: '#FBBF24',
    genre: 'Pop/Latin',
    reviews: [
      {
        albumId: '3RQQmkQEvNCY4prGKE6oc5',
        albumTitle: 'Un Verano Sin Ti',
        albumArtist: 'Bad Bunny',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b273ab5c9cd818ad6ed3e9b79cd1',
        rating: 5,
        content: 'ALBUM OF THE YEAR! Bad Bunny literally saved summer. Beach music perfection.',
        mood: 'Happy',
        tags: ['reggaeton', 'latin', 'summer'],
      },
      {
        albumId: '2ODvWsOgouMbaA5xf0RkJe',
        albumTitle: 'Chromatica',
        albumArtist: 'Lady Gaga',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b273505190077497c230422f5c8d',
        rating: 4,
        content: 'Mother Monster delivered the dance album we needed! Pure serotonin.',
        mood: 'Energetic',
        tags: ['pop', 'dance', 'electronic'],
      },
      {
        albumId: '4iKlP9cDYN9BNJibPLAlq5',
        albumTitle: 'Planet Her',
        albumArtist: 'Doja Cat',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b2734df3245f26298a1579ecc321',
        rating: 4,
        content: 'Doja ate this up! Kiss Me More is pop perfection. Production is top tier.',
        mood: 'Happy',
        tags: ['pop', 'r&b', 'fun'],
      },
    ],
  },
  {
    email: 'david@test.onchord.app',
    password: 'TestPassword123!',
    displayName: 'David Chen',
    username: 'metal_david',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400',
    bio: 'Rock is not dead! From classic Sabbath to modern prog metal. Drummer in a local band.',
    accentColor: '#EF4444',
    genre: 'Rock/Metal',
    reviews: [
      {
        albumId: '2guirTSEqLizK7j9i1MTTZ',
        albumTitle: 'Master of Puppets',
        albumArtist: 'Metallica',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b273d2fac5c29c347f8e2b7b3d9e',
        rating: 5,
        content: 'Thrash metal perfection. The title track is an 8-minute journey through pure aggression.',
        mood: 'Aggressive',
        tags: ['metal', 'thrash', 'classic'],
      },
      {
        albumId: '6vuykQgDLUCiZ7YggIpLM9',
        albumTitle: 'Lateralus',
        albumArtist: 'Tool',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b273f0b7b1d2e5a5e43c6c8a3f4e',
        rating: 5,
        content: 'Prog metal at its absolute peak. Lateralus uses the Fibonacci sequence! Geniuses.',
        mood: 'Focused',
        tags: ['metal', 'progressive', 'experimental'],
      },
      {
        albumId: '2Aq4GJWOkAWvj7X7F5C3d1',
        albumTitle: 'Led Zeppelin IV',
        albumArtist: 'Led Zeppelin',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b273e3df2dfc6b7e2d3f6a8c9b4a',
        rating: 5,
        content: 'Stairway! Black Dog! This album invented hard rock as we know it.',
        mood: 'Nostalgic',
        tags: ['rock', 'classic', '70s'],
      },
    ],
  },
  {
    email: 'chloe@test.onchord.app',
    password: 'TestPassword123!',
    displayName: 'Chloe Park',
    username: 'classical_chloe',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    bio: 'Classically trained pianist exploring ambient and neo-classical. Nils Frahm is everything.',
    accentColor: '#6366F1',
    genre: 'Classical/Ambient',
    reviews: [
      {
        albumId: '4VZ7jhV0wHpoNPCB5k5lXs',
        albumTitle: 'Spaces',
        albumArtist: 'Nils Frahm',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b2731f7a8f3e4d5c6b7a8e9d0c1f',
        rating: 5,
        content: 'Nils is a genius. This live album captures the magic of his performances. Perfect focus music.',
        mood: 'Peaceful',
        tags: ['neo-classical', 'ambient', 'piano'],
      },
      {
        albumId: '3I6YdKf91LUqSNdRn0Y3bm',
        albumTitle: 'Music for Airports',
        albumArtist: 'Brian Eno',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b2737b8e9f8c6d5a4b3c2a1e0f9d',
        rating: 5,
        content: 'The album that defined ambient music. Eno created soundscapes that transform spaces.',
        mood: 'Calm',
        tags: ['ambient', 'experimental', 'electronic'],
      },
      {
        albumId: '1L7QfPl2WbTJTqn1TSUFIL',
        albumTitle: 'In a Safe Place',
        albumArtist: 'The Album Leaf',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b273a2c3d4e5f6a7b8c9d0e1f2a3',
        rating: 4,
        content: 'Beautiful post-rock/ambient blend. Window is one of the most beautiful instrumentals ever.',
        mood: 'Melancholic',
        tags: ['post-rock', 'ambient', 'instrumental'],
      },
    ],
  },
  {
    email: 'tyler@test.onchord.app',
    password: 'TestPassword123!',
    displayName: 'Tyler Brooks',
    username: 'chill_tyler',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
    bio: 'Smooth R&B and lo-fi beats. Late night vibes only. Frank Ocean appreciator.',
    accentColor: '#10B981',
    genre: 'R&B/Chill',
    reviews: [
      {
        albumId: '3mH6qwIy9crq0I9YQbOuDf',
        albumTitle: 'Blonde',
        albumArtist: 'Frank Ocean',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526',
        rating: 5,
        content: 'Frank Ocean is a once-in-a-generation artist. White Ferrari at 3am hits different.',
        mood: 'Melancholic',
        tags: ['r&b', 'experimental', 'emotional'],
      },
      {
        albumId: '6kf46HbnYCZzP6rjvQT40z',
        albumTitle: 'CTRL',
        albumArtist: 'SZA',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b273e4d1f34b8dc8d57c4af4d54b',
        rating: 5,
        content: 'SZA redefined R&B with this. Her vulnerability is so refreshing. This album raised the bar.',
        mood: 'Chill',
        tags: ['r&b', 'neo-soul', 'female-artist'],
      },
      {
        albumId: '6XCBR1G1sCH3UvX7UvunoO',
        albumTitle: 'Channel Orange',
        albumArtist: 'Frank Ocean',
        albumCover: 'https://i.scdn.co/image/ab67616d0000b2739269954e4ab7ed6b13a79e69',
        rating: 5,
        content: 'Before Blonde there was this masterpiece. The transition on Pyramids is legendary.',
        mood: 'Nostalgic',
        tags: ['r&b', 'soul', 'classic'],
      },
    ],
  },
];

async function createTestProfile(profile: typeof testProfiles[0]) {
  console.log(`\nCreating user: ${profile.displayName} (@${profile.username})...`);

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === profile.email);

  let userId: string;

  if (existingUser) {
    console.log(`  User already exists, using existing ID: ${existingUser.id}`);
    userId = existingUser.id;
  } else {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: profile.email,
      password: profile.password,
      email_confirm: true,
      user_metadata: {
        display_name: profile.displayName,
        username: profile.username,
        avatar_url: profile.avatar,
        accent_color: profile.accentColor,
      },
    });

    if (authError) {
      console.error(`  Failed to create auth user: ${authError.message}`);
      return null;
    }

    userId = authData.user!.id;
    console.log(`  Created auth user: ${userId}`);
  }

  // Update profile with bio (the trigger creates the basic profile)
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      display_name: profile.displayName,
      username: profile.username,
      email: profile.email,
      avatar_url: profile.avatar,
      bio: profile.bio,
      accent_color: profile.accentColor,
      onboarding_completed: true,
    });

  if (profileError) {
    console.error(`  Failed to update profile: ${profileError.message}`);
  } else {
    console.log(`  Updated profile with bio`);
  }

  // Create reviews
  for (const review of profile.reviews) {
    const { error: reviewError } = await supabase.from('reviews').upsert({
      uid: userId,
      user_name: profile.displayName,
      user_avatar: profile.avatar,
      album_id: review.albumId,
      album_title: review.albumTitle,
      album_artist: review.albumArtist,
      album_cover: review.albumCover,
      rating: review.rating,
      review_type: 'album',
      content: review.content,
      mood: review.mood,
      tags: review.tags,
      is_public: true,
    }, {
      onConflict: 'uid,album_id',
      ignoreDuplicates: false,
    });

    if (reviewError) {
      // Try insert if upsert fails
      const { error: insertError } = await supabase.from('reviews').insert({
        uid: userId,
        user_name: profile.displayName,
        user_avatar: profile.avatar,
        album_id: review.albumId,
        album_title: review.albumTitle,
        album_artist: review.albumArtist,
        album_cover: review.albumCover,
        rating: review.rating,
        review_type: 'album',
        content: review.content,
        mood: review.mood,
        tags: review.tags,
        is_public: true,
      });
      
      if (insertError && !insertError.message.includes('duplicate')) {
        console.error(`  Failed to create review for ${review.albumTitle}: ${insertError.message}`);
      } else {
        console.log(`  Created review: ${review.albumTitle}`);
      }
    } else {
      console.log(`  Created review: ${review.albumTitle}`);
    }
  }

  return userId;
}

async function main() {
  console.log('='.repeat(60));
  console.log('OnChord Test Profile Seeder');
  console.log('='.repeat(60));
  console.log(`\nCreating ${testProfiles.length} test profiles with diverse music tastes...`);

  const createdUsers: string[] = [];

  for (const profile of testProfiles) {
    const userId = await createTestProfile(profile);
    if (userId) {
      createdUsers.push(userId);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Seeding Complete!');
  console.log('='.repeat(60));
  console.log(`\nCreated ${createdUsers.length}/${testProfiles.length} test profiles`);
  console.log('\nTest accounts (all use password: TestPassword123!):');
  testProfiles.forEach(p => {
    console.log(`  - ${p.email} (${p.genre})`);
  });
  console.log('\nYou can now log in as any of these users to test features!');
}

main().catch(console.error);
