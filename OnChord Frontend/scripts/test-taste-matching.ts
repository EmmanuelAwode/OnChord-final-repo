type TestProfile = {
  label: string;
  name: string;
  userId: string;
  trackIds: string[];
  albumIds: string[];
  artistNames: string[];
  totalItems: number;
  favoriteGenres: string[];
  sampleAlbumsOrTracks: string[];
};

type ComparisonResult = {
  similarity: number;
  sharedTrackIds: string[];
  sharedAlbumIds: string[];
  sharedArtists: string[];
  breakdown: {
    trackBonus: number;
    albumBonus: number;
    artistBonus: number;
  };
};

function compareMusicTaste(user1Data: TestProfile, user2Data: TestProfile): ComparisonResult {
  const sharedTrackIds = user1Data.trackIds.filter((id) => user2Data.trackIds.includes(id));
  const sharedAlbumIds = user1Data.albumIds.filter((id) => user2Data.albumIds.includes(id));
  const sharedArtists = user1Data.artistNames.filter((artist) => user2Data.artistNames.includes(artist));

  const trackBonus = Math.min(sharedTrackIds.length * 5, 25);
  const albumBonus = Math.min(sharedAlbumIds.length * 3, 15);
  const artistBonus = Math.min(sharedArtists.length * 2, 20);

  let similarity = Math.min(100, trackBonus + albumBonus + artistBonus);

  if (user1Data.totalItems === 0 || user2Data.totalItems === 0) {
    similarity = 0;
  }

  return {
    similarity: Math.round(similarity),
    sharedTrackIds,
    sharedAlbumIds,
    sharedArtists,
    breakdown: {
      trackBonus,
      albumBonus,
      artistBonus,
    },
  };
}

const profiles: Record<string, TestProfile> = {
  A: {
    label: "A",
    name: "Ava",
    userId: "user-a",
    trackIds: [
      "trk-kendrick-maad-city",
      "trk-kendrick-damn",
      "trk-sza-kill-bill",
      "trk-jcole-middle-child",
      "trk-drake-energy",
      "trk-kendrick-humble",
    ],
    albumIds: [
      "alb-good-kid-m-a-a-d-city",
      "alb-damn",
      "alb-sos",
      "alb-off-season",
      "alb-to-pimp-a-butterfly",
    ],
    artistNames: [
      "kendrick lamar",
      "sza",
      "j. cole",
      "drake",
      "anderson .paak",
      "schoolboy q",
    ],
    totalItems: 0,
    favoriteGenres: ["Hip-Hop", "R&B", "Neo-Soul"],
    sampleAlbumsOrTracks: [
      "good kid, m.A.A.d city",
      "DAMN.",
      "SOS",
      "The Off-Season",
    ],
  },
  B: {
    label: "B",
    name: "Noah",
    userId: "user-b",
    trackIds: [
      "trk-kendrick-maad-city",
      "trk-kendrick-damn",
      "trk-sza-kill-bill",
      "trk-jcole-middle-child",
      "trk-jayz-psa",
      "trk-kendrick-humble",
    ],
    albumIds: [
      "alb-good-kid-m-a-a-d-city",
      "alb-damn",
      "alb-sos",
      "alb-4-your-eyez-only",
      "alb-to-pimp-a-butterfly",
    ],
    artistNames: [
      "kendrick lamar",
      "sza",
      "j. cole",
      "drake",
      "21 savage",
      "schoolboy q",
    ],
    totalItems: 0,
    favoriteGenres: ["Hip-Hop", "R&B", "Alternative R&B"],
    sampleAlbumsOrTracks: [
      "good kid, m.A.A.d city",
      "DAMN.",
      "SOS",
      "4 Your Eyez Only",
    ],
  },
  C: {
    label: "C",
    name: "Maya",
    userId: "user-c",
    trackIds: [
      "trk-coltrane-giant-steps",
      "trk-miles-so-what",
      "trk-eno-an-ending",
      "trk-richter-on-the-nature-of-daylight",
      "trk-frahm-says",
    ],
    albumIds: [
      "alb-giant-steps",
      "alb-kind-of-blue",
      "alb-music-for-airports",
      "alb-omnia",
    ],
    artistNames: [
      "john coltrane",
      "miles davis",
      "brian eno",
      "max richter",
      "nils frahm",
    ],
    totalItems: 0,
    favoriteGenres: ["Jazz", "Ambient", "Modern Classical"],
    sampleAlbumsOrTracks: [
      "Giant Steps",
      "Kind of Blue",
      "Music for Airports",
      "On the Nature of Daylight",
    ],
  },
  D: {
    label: "D",
    name: "Lena",
    userId: "user-d",
    trackIds: [
      "trk-sza-kill-bill",
      "trk-phoebe-motion-sickness",
      "trk-bon-iver-holocene",
      "trk-olivia-dean-ok-love",
      "trk-the-1975-robbers",
    ],
    albumIds: [
      "alb-sos",
      "alb-punisher",
      "alb-for-emma-forever-ago",
      "alb-being-funny-in-a-foreign-language",
    ],
    artistNames: [
      "sza",
      "phoebe bridgers",
      "bon iver",
      "olivia dean",
      "the 1975",
    ],
    totalItems: 0,
    favoriteGenres: ["Alternative R&B", "Indie Pop", "Indie Folk"],
    sampleAlbumsOrTracks: [
      "SOS",
      "Punisher",
      "For Emma, Forever Ago",
      "Being Funny in a Foreign Language",
    ],
  },
};

function withTotals(profile: TestProfile): TestProfile {
  return {
    ...profile,
    totalItems: new Set([...profile.trackIds, ...profile.albumIds, ...profile.artistNames]).size,
  };
}

function printProfile(profile: TestProfile) {
  console.log(`\n${profile.label}. ${profile.name}`);
  console.log(`   Genres: ${profile.favoriteGenres.join(", ")}`);
  console.log(`   Sample releases: ${profile.sampleAlbumsOrTracks.join(", ")}`);
  console.log(`   Tracks: ${profile.trackIds.join(", ")}`);
  console.log(`   Albums: ${profile.albumIds.join(", ")}`);
  console.log(`   Artists: ${profile.artistNames.join(", ")}`);
  console.log(`   Total items: ${profile.totalItems}`);
}

function printLocalComparison(label: string, user1: TestProfile, user2: TestProfile) {
  const result = compareMusicTaste(user1, user2);

  console.log(`\n=== ${label} ===`);
  console.log(`Similarity: ${result.similarity}%`);
  console.log(`Shared tracks: ${result.sharedTrackIds.length} -> ${result.sharedTrackIds.join(", ") || "none"}`);
  console.log(`Shared albums: ${result.sharedAlbumIds.length} -> ${result.sharedAlbumIds.join(", ") || "none"}`);
  console.log(`Shared artists: ${result.sharedArtists.length} -> ${result.sharedArtists.join(", ") || "none"}`);
  console.log(
    `Breakdown: track bonus ${result.breakdown.trackBonus}, album bonus ${result.breakdown.albumBonus}, artist bonus ${result.breakdown.artistBonus}`
  );

  return result;
}

async function printMlComparison(label: string, user1: TestProfile, user2: TestProfile) {
  const mlUrl = process.env.VITE_ML_SERVICE_URL || "http://localhost:8000";

  try {
    const response = await fetch(`${mlUrl}/predict/enhanced_taste`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user1_track_ids: user1.trackIds,
        user2_track_ids: user2.trackIds,
        user1_album_ids: user1.albumIds,
        user2_album_ids: user2.albumIds,
        user1_artists: user1.artistNames,
        user2_artists: user2.artistNames,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${body}`);
    }

    const data = await response.json();
    console.log(`\n=== ${label} (ML endpoint) ===`);
    console.log(`Overall similarity: ${data.overall_similarity}%`);
    console.log(`Audio similarity: ${data.audio_similarity ?? "n/a"}`);
    console.log(`Shared tracks: ${(data.shared_tracks || []).length}`);
    console.log(`Shared albums: ${(data.shared_albums || []).length}`);
    console.log(`Shared artists: ${(data.shared_artists || []).length}`);
    console.log(`Breakdown: ${JSON.stringify(data.breakdown)}`);
    if (data.ml_coverage) {
      console.log(`ML coverage: ${JSON.stringify(data.ml_coverage)}`);
    }
  } catch (error) {
    console.log(`\n=== ${label} (ML endpoint) ===`);
    console.log(`Skipped: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const profilesWithTotals = Object.fromEntries(
    Object.entries(profiles).map(([key, profile]) => [key, withTotals(profile)])
  ) as Record<string, TestProfile>;

  console.log("ONCHORD TASTE MATCHING VALIDATION");
  console.log("Local scoring mirrors src/lib/api/tasteMatching.ts");
  console.log("Optional ML endpoint mirrors /predict/enhanced_taste");

  for (const profile of Object.values(profilesWithTotals)) {
    printProfile(profile);
  }

  const localAB = printLocalComparison("A vs B: strongly similar", profilesWithTotals.A, profilesWithTotals.B);
  const localAC = printLocalComparison("A vs C: strongly different", profilesWithTotals.A, profilesWithTotals.C);
  const localAD = printLocalComparison("A vs D: medium similarity", profilesWithTotals.A, profilesWithTotals.D);

  await printMlComparison("A vs B: strongly similar", profilesWithTotals.A, profilesWithTotals.B);
  await printMlComparison("A vs C: strongly different", profilesWithTotals.A, profilesWithTotals.C);
  await printMlComparison("A vs D: medium similarity", profilesWithTotals.A, profilesWithTotals.D);

  console.log("\n=== Summary Table ===");
  console.table([
    { pair: "A vs B", similarity: localAB.similarity, verdict: "high" },
    { pair: "A vs C", similarity: localAC.similarity, verdict: "low" },
    { pair: "A vs D", similarity: localAD.similarity, verdict: "medium" },
  ]);
}

main().catch((error) => {
  console.error("Validation script failed:", error);
  process.exitCode = 1;
});