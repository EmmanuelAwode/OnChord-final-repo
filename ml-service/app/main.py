# app/main.py
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional

from pathlib import Path

logger = logging.getLogger(__name__)
import numpy as np
import os

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        logger.info(f"[ML] Loaded environment from {env_path}")
except ImportError:
    pass  # python-dotenv not installed, use system env vars

from app.spotify_taste_model import SpotifyTasteModel
from app.mood_classifier import MoodClassifier, MOOD_CATEGORIES, MOOD_COLORS

# Import genre-based mood classifier (fallback when audio features unavailable)
try:
    from ml.genre_mood_classifier import GenreMoodClassifier, get_hardcoded_prediction
    genre_mood_classifier = GenreMoodClassifier()
    genre_model_path = Path(__file__).parent.parent / "models" / "genre_mood_model.json"
    if genre_model_path.exists():
        genre_mood_classifier.load(str(genre_model_path))
        logger.info("[ML] Genre-mood fallback classifier loaded!")
    else:
        logger.info("[ML] Genre-mood model not found, using hardcoded mapping")
except Exception as e:
    logger.info(f"[ML] Genre-mood classifier not available: {e}")
    genre_mood_classifier = None

# -------------------------------------------------------------------
# 1. Create FastAPI app
# -------------------------------------------------------------------
app = FastAPI(title="OnChord ML Service")

# Add CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# Resolve CSV path - try multiple dataset files, use largest
# -------------------------------------------------------------------
DATA_DIR = Path(__file__).parent.parent / "data"

# Possible dataset files (in order of preference)
DATASET_FILES = [
    "tracks_features.csv",  # Spotify 1.2M dataset
    "spotify_tracks.csv",   # 600K dataset  
    "spotify_songs.csv",    # 30K popular songs
    "SpotifyFeatures.csv",  # Original dataset
]

def find_best_dataset():
    """Find the best available dataset file."""
    best_path = None
    best_size = 0
    
    for filename in DATASET_FILES:
        path = DATA_DIR / filename
        if path.exists():
            size = path.stat().st_size
            logger.info(f"[ML] Found dataset: {filename} ({size / 1024 / 1024:.1f} MB)")
            if size > best_size:
                best_size = size
                best_path = path
    
    if best_path:
        logger.info(f"[ML] Using largest dataset: {best_path.name}")
        return best_path
    
    # Fallback to default
    return DATA_DIR / "SpotifyFeatures.csv"

CSV_PATH = find_best_dataset()
logger.info(f"[ML] Loading dataset from: {CSV_PATH}")

# -------------------------------------------------------------------
# Load Artist-to-Genre mapping from SpotifyFeatures.csv
# -------------------------------------------------------------------
ARTIST_GENRE_MAP: Dict[str, List[str]] = {}
try:
    import pandas as pd
    features_path = DATA_DIR / "SpotifyFeatures.csv"
    if features_path.exists():
        df = pd.read_csv(features_path, usecols=['artist_name', 'genre'])
        # Group genres by artist (lowercase for matching)
        for artist, group in df.groupby('artist_name'):
            artist_lower = artist.lower().strip()
            genres = list(group['genre'].unique())
            ARTIST_GENRE_MAP[artist_lower] = genres
        logger.info(f"[ML] Loaded artist-genre map: {len(ARTIST_GENRE_MAP)} artists")
    else:
        logger.info(f"[ML] SpotifyFeatures.csv not found, artist-genre lookup disabled")
except Exception as e:
    logger.info(f"[ML] Could not load artist-genre map: {e}")

try:
    taste_model = SpotifyTasteModel(str(CSV_PATH))
    logger.info(f"[ML] Loaded {len(taste_model.track_features)} track vectors.")
except Exception as e:
    logger.error(f"[ML] ERROR loading CSV: {e}")
    taste_model = None

# Load ML-based taste model (uses TruncatedSVD for learned embeddings)
ml_taste_model = None
MODEL_DIR = Path(__file__).parent.parent / "models"
try:
    from app.ml_taste_model import MLTasteModel
    ml_taste_model = MLTasteModel(str(CSV_PATH), str(MODEL_DIR))
    logger.info(f"[ML] ML taste model ready - {ml_taste_model.training_stats.get('n_tracks', 0)} tracks, "
          f"{ml_taste_model.training_stats.get('explained_variance', 0):.1%} variance explained")
except Exception as e:
    logger.info(f"[ML] ML taste model not available: {e}")

# Load mood classifier (rule-based for backward compatibility)
try:
    mood_classifier = MoodClassifier(str(CSV_PATH))
    logger.info(f"[ML] Mood classifier ready with {len(mood_classifier.track_features)} tracks.")
except Exception as e:
    logger.error(f"[ML] ERROR loading mood classifier: {e}")
    mood_classifier = MoodClassifier()  # Empty classifier

# Load ML mood model (if trained)
ml_mood_model = None
try:
    from ml.model_loader import MoodModelLoader
    ml_mood_model = MoodModelLoader(str(MODEL_DIR))
    if ml_mood_model.use_ml:
        logger.info(f"[ML] ML mood model loaded successfully!")
    else:
        logger.info(f"[ML] ML model not found, using rule-based fallback")
except Exception as e:
    logger.info(f"[ML] Could not load ML model: {e}, using rule-based fallback")

# -------------------------------------------------------------------
# Request / Response Models
# -------------------------------------------------------------------
class TasteSimilarityRequest(BaseModel):
    user1_tracks: List[str]
    user2_tracks: List[str]

class TasteSimilarityResponse(BaseModel):
    similarity: float
    shared_tracks: int
    user1_known: int
    user2_known: int

# Enhanced Taste Matching Models
class EnhancedTasteRequest(BaseModel):
    """Request for enhanced taste matching with track IDs and artist names."""
    user1_track_ids: List[str] = []
    user2_track_ids: List[str] = []
    user1_album_ids: List[str] = []
    user2_album_ids: List[str] = []
    user1_artists: List[str] = []  # Artist names (for fallback matching)
    user2_artists: List[str] = []
    # NEW: Per-track artist names for ML fallback (same order as track_ids)
    user1_track_artists: List[str] = []  # Artist name for each track in user1_track_ids
    user2_track_artists: List[str] = []  # Artist name for each track in user2_track_ids
    # NEW: Per-track genres for ML fallback
    user1_track_genres: List[str] = []   # Genre for each track in user1_track_ids
    user2_track_genres: List[str] = []   # Genre for each track in user2_track_ids

class EnhancedTasteResponse(BaseModel):
    """Response with detailed similarity breakdown."""
    overall_similarity: float  # 0-100
    audio_similarity: Optional[float]  # ML-computed from audio features
    shared_tracks: List[str]
    shared_albums: List[str]
    shared_artists: List[str]
    breakdown: Dict[str, float]  # track_bonus, album_bonus, artist_bonus, audio_score
    ml_coverage: Optional[Dict[str, float]] = None  # Percentage of tracks matched via ML

# Mood Classification Models
class AudioFeatures(BaseModel):
    danceability: float
    energy: float
    valence: float
    acousticness: Optional[float] = 0.5
    instrumentalness: Optional[float] = 0.0
    liveness: Optional[float] = 0.1
    speechiness: Optional[float] = 0.0
    tempo: Optional[float] = 120.0

class MoodClassifyRequest(BaseModel):
    """Request to classify playlist mood from audio features."""
    tracks: List[AudioFeatures]

class MoodClassifyByIdsRequest(BaseModel):
    """Request to classify playlist mood from track IDs."""
    track_ids: List[str]

# Genre-based mood classification (fallback when audio features unavailable)
class GenreMoodRequest(BaseModel):
    """Request to classify mood from genres (when audio features unavailable)."""
    genres: List[str]  # List of genre strings (e.g., from artist.genres)

class GenreMoodResponse(BaseModel):
    """Response with mood probabilities based on genre."""
    dominant_mood: str
    confidence: float  # Confidence in dominant mood (0-1)
    mood_distribution: Dict[str, float]  # All mood probabilities
    method: str = "genre"  # Indicates this used genre-based fallback
    genres_analyzed: int
    warning: Optional[str] = None  # Warning if accuracy is low

class ArtistGenreRequest(BaseModel):
    """Request to look up genres for artist names."""
    artists: List[str]  # Artist names to look up

class ArtistGenreResponse(BaseModel):
    """Response with genres for each artist."""
    genres: List[str]  # All unique genres found
    artist_matches: Dict[str, List[str]]  # artist name -> genres
    artists_found: int
    artists_not_found: List[str]

class MoodItem(BaseModel):
    mood: str
    percentage: float
    color: str

class MoodClassifyResponse(BaseModel):
    moods: List[MoodItem]
    dominant_mood: Optional[str]
    dominant_color: Optional[str]
    track_count: int
    tracks_analyzed: Optional[int] = None
    insights: Dict[str, str]
    average_features: Optional[Dict[str, float]] = None

# -------------------------------------------------------------------
# Helper to compute similarity via the model
# -------------------------------------------------------------------
def compute_similarity(user1_tracks: List[str], user2_tracks: List[str]):
    if taste_model is None:
        raise HTTPException(
            status_code=500,
            detail="Track features not loaded. Check SpotifyFeatures.csv.",
        )

    sim = taste_model.similarity(user1_tracks, user2_tracks)
    if sim is None:
        raise HTTPException(
            status_code=400,
            detail="Not enough known tracks to compute similarity.",
        )

    # Count known & shared tracks (for extra info)
    user1_known = sum(1 for tid in user1_tracks if tid in taste_model.track_features)
    user2_known = sum(1 for tid in user2_tracks if tid in taste_model.track_features)
    shared = len(
        set(user1_tracks)
        .intersection(user2_tracks)
        .intersection(taste_model.track_features.keys())
    )

    # Clip similarity to [0, 1] and round
    sim = max(0.0, min(1.0, float(sim)))

    return sim, shared, user1_known, user2_known

# -------------------------------------------------------------------
# 5. API Endpoint
# -------------------------------------------------------------------
@app.post("/predict/taste_similarity", response_model=TasteSimilarityResponse)
def predict_taste_similarity(payload: TasteSimilarityRequest):
    sim, shared, user1_known, user2_known = compute_similarity(
        payload.user1_tracks, payload.user2_tracks
    )

    return TasteSimilarityResponse(
        similarity=round(sim, 3),
        shared_tracks=shared,
        user1_known=user1_known,
        user2_known=user2_known,
    )


@app.post("/predict/enhanced_taste", response_model=EnhancedTasteResponse)
def predict_enhanced_taste(payload: EnhancedTasteRequest):
    """
    Enhanced taste matching that combines:
    1. Shared exact tracks (highest weight)
    2. Shared exact albums
    3. Shared artists (same artist, different songs)
    4. ML audio feature similarity (if tracks found in database)
    """
    # Find shared items
    shared_tracks = list(set(payload.user1_track_ids) & set(payload.user2_track_ids))
    shared_albums = list(set(payload.user1_album_ids) & set(payload.user2_album_ids))
    
    # Case-insensitive artist matching
    user1_artists_lower = [a.lower().strip() for a in payload.user1_artists]
    user2_artists_lower = [a.lower().strip() for a in payload.user2_artists]
    shared_artists = list(set(user1_artists_lower) & set(user2_artists_lower))
    
    # Calculate bonuses
    # Shared tracks: 5% each, max 30%
    track_bonus = min(len(shared_tracks) * 5, 30)
    
    # Shared albums: 3% each, max 20%
    album_bonus = min(len(shared_albums) * 3, 20)
    
    # Shared artists: 2% each, max 25%
    artist_bonus = min(len(shared_artists) * 2, 25)
    
    # ML audio similarity using TruncatedSVD (if we have track data)
    audio_similarity = None
    audio_score = 0
    ml_coverage = None
    
    all_user1_tracks = payload.user1_track_ids + payload.user1_album_ids
    all_user2_tracks = payload.user2_track_ids + payload.user2_album_ids
    
    # Prefer ML model with fallback, then basic ML, then artist-based fallback
    if ml_taste_model and all_user1_tracks and all_user2_tracks:
        try:
            # Use fallback method if we have per-track artist/genre info
            if payload.user1_track_artists or payload.user1_track_genres:
                result = ml_taste_model.similarity_with_fallback(
                    all_user1_tracks,
                    all_user2_tracks,
                    user1_artists=payload.user1_track_artists,
                    user2_artists=payload.user2_track_artists,
                    user1_genres=payload.user1_track_genres,
                    user2_genres=payload.user2_track_genres
                )
                if result:
                    audio_similarity = round(result["similarity"], 1)
                    audio_score = result["similarity"] * 0.25
                    ml_coverage = result["ml_coverage"]
            else:
                # Fall back to basic similarity (track IDs only)
                sim = ml_taste_model.similarity(all_user1_tracks, all_user2_tracks)
                if sim is not None:
                    audio_similarity = round(float(sim), 1)
                    audio_score = float(sim) * 0.25
        except (ValueError, KeyError, TypeError) as e:
            # Log error but continue with other similarity measures
            logger.warning(f"[ML] Error computing similarity: {e}")
    elif taste_model and all_user1_tracks and all_user2_tracks:
        try:
            sim = taste_model.similarity(all_user1_tracks, all_user2_tracks)
            if sim is not None:
                audio_similarity = round(float(sim) * 100, 1)
                audio_score = float(sim) * 25
        except (ValueError, KeyError, TypeError) as e:
            # Log error but continue with other similarity measures
            pass
    
    # ARTIST-BASED FALLBACK: If track-based ML failed, try using artist centroids
    # This uses the flat artist lists that the frontend already sends
    if audio_similarity is None and ml_taste_model and payload.user1_artists and payload.user2_artists:
        try:
            result = ml_taste_model.similarity_from_artists(
                payload.user1_artists,
                payload.user2_artists,
                artist_genre_map=ARTIST_GENRE_MAP
            )
            if result:
                audio_similarity = round(result["similarity"], 1)
                audio_score = result["similarity"] * 0.25
                ml_coverage = result.get("ml_coverage")
                logger.info(f"[ML] Artist-based fallback: {result['user1_stats']['matched']}/{len(payload.user1_artists)} and {result['user2_stats']['matched']}/{len(payload.user2_artists)} artists matched")
        except Exception as e:
            logger.warning(f"[ML] Artist-based fallback error: {e}")
    
    # Calculate overall similarity
    # Base: average of shared item ratios
    total_user1 = len(payload.user1_track_ids) + len(payload.user1_album_ids) + len(payload.user1_artists)
    total_user2 = len(payload.user2_track_ids) + len(payload.user2_album_ids) + len(payload.user2_artists)
    total_shared = len(shared_tracks) + len(shared_albums) + len(shared_artists)
    
    if total_user1 > 0 and total_user2 > 0:
        # Jaccard-like similarity as base
        union = total_user1 + total_user2 - total_shared
        base_similarity = (total_shared / union) * 25 if union > 0 else 0
    else:
        base_similarity = 0
    
    # Combine all components
    overall = base_similarity + track_bonus + album_bonus + artist_bonus + audio_score
    overall = min(100, max(0, overall))
    
    return EnhancedTasteResponse(
        overall_similarity=round(overall, 1),
        audio_similarity=audio_similarity,
        shared_tracks=shared_tracks[:10],  # Limit response size
        shared_albums=shared_albums[:10],
        shared_artists=shared_artists[:10],
        breakdown={
            "base_similarity": round(base_similarity, 1),
            "track_bonus": track_bonus,
            "album_bonus": album_bonus,
            "artist_bonus": artist_bonus,
            "audio_score": round(audio_score, 1),
        },
        ml_coverage=ml_coverage
    )


# -------------------------------------------------------------------
# ML-Based Taste Matching (Learned Embeddings via TruncatedSVD)
# -------------------------------------------------------------------
class MLTasteRequest(BaseModel):
    """Request for ML-based taste matching."""
    user1_tracks: List[str]
    user2_tracks: List[str]

class MLTasteResponse(BaseModel):
    """Response from ML taste matching."""
    similarity: float  # 0-100 scale
    algorithm: str
    user1_latent_profile: Optional[Dict[str, float]] = None
    user2_latent_profile: Optional[Dict[str, float]] = None
    model_info: Dict

@app.post("/predict/ml_taste_similarity", response_model=MLTasteResponse)
def predict_ml_taste_similarity(payload: MLTasteRequest):
    """
    ML-based taste matching using TruncatedSVD learned embeddings.
    
    This is ACTUAL machine learning:
    - TruncatedSVD learns latent factors from 1.2M tracks
    - Users are projected into this learned space
    - Similarity computed in learned latent representation
    
    Algorithm: Truncated SVD (Latent Semantic Analysis)
    - Same technique used by Netflix/Spotify recommendations
    - Learns underlying patterns in music preferences
    """
    if ml_taste_model is None:
        raise HTTPException(status_code=503, detail="ML taste model not loaded")
    
    sim = ml_taste_model.similarity(payload.user1_tracks, payload.user2_tracks)
    
    if sim is None:
        raise HTTPException(status_code=400, detail="Not enough track data for comparison")
    
    # Get taste profiles in latent space
    user1_profile = ml_taste_model.get_taste_profile(payload.user1_tracks)
    user2_profile = ml_taste_model.get_taste_profile(payload.user2_tracks)
    
    return MLTasteResponse(
        similarity=round(sim, 1),
        algorithm="TruncatedSVD (Latent Semantic Analysis)",
        user1_latent_profile=user1_profile,
        user2_latent_profile=user2_profile,
        model_info=ml_taste_model.get_model_info()
    )

@app.get("/ml/taste_model_info")
def get_taste_model_info():
    """Get information about the ML taste model."""
    if ml_taste_model is None:
        return {"status": "not_loaded", "error": "ML taste model not available"}
    
    return {
        "status": "loaded",
        **ml_taste_model.get_model_info()
    }


# -------------------------------------------------------------------
# Debug Endpoint: Artist Match Breakdown
# -------------------------------------------------------------------
class ArtistMatchDebugRequest(BaseModel):
    """Request for debugging artist matching."""
    user1_artists: List[str]
    user2_artists: List[str]

@app.post("/debug/artist_match_breakdown")
def debug_artist_match_breakdown(payload: ArtistMatchDebugRequest):
    """
    Debug endpoint to see exactly which artists matched and why.
    Shows per-artist centroid lookup results and similarity computation.
    """
    if ml_taste_model is None:
        raise HTTPException(status_code=503, detail="ML taste model not loaded")
    
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
    
    results = {
        "user1_artists": [],
        "user2_artists": [],
        "similarity": None,
        "explanation": ""
    }
    
    # Check each user1 artist
    u1_embeddings = []
    for artist in payload.user1_artists:
        artist_lower = artist.lower().strip()
        artist_info = {
            "name": artist,
            "found_in_dataset": artist_lower in ml_taste_model.artist_centroids,
            "genre_fallback": None,
            "embedding_source": None
        }
        
        if artist_lower in ml_taste_model.artist_centroids:
            artist_info["embedding_source"] = "artist_centroid"
            u1_embeddings.append(ml_taste_model.artist_centroids[artist_lower])
        elif artist_lower in ARTIST_GENRE_MAP:
            genres = ARTIST_GENRE_MAP[artist_lower]
            artist_info["genre_fallback"] = genres
            for genre in genres:
                genre_lower = genre.lower()
                if genre_lower in ml_taste_model.genre_centroids:
                    artist_info["embedding_source"] = f"genre_centroid:{genre}"
                    u1_embeddings.append(ml_taste_model.genre_centroids[genre_lower])
                    break
        
        if artist_info["embedding_source"] is None:
            artist_info["embedding_source"] = "not_found"
        
        results["user1_artists"].append(artist_info)
    
    # Check each user2 artist
    u2_embeddings = []
    for artist in payload.user2_artists:
        artist_lower = artist.lower().strip()
        artist_info = {
            "name": artist,
            "found_in_dataset": artist_lower in ml_taste_model.artist_centroids,
            "genre_fallback": None,
            "embedding_source": None
        }
        
        if artist_lower in ml_taste_model.artist_centroids:
            artist_info["embedding_source"] = "artist_centroid"
            u2_embeddings.append(ml_taste_model.artist_centroids[artist_lower])
        elif artist_lower in ARTIST_GENRE_MAP:
            genres = ARTIST_GENRE_MAP[artist_lower]
            artist_info["genre_fallback"] = genres
            for genre in genres:
                genre_lower = genre.lower()
                if genre_lower in ml_taste_model.genre_centroids:
                    artist_info["embedding_source"] = f"genre_centroid:{genre}"
                    u2_embeddings.append(ml_taste_model.genre_centroids[genre_lower])
                    break
        
        if artist_info["embedding_source"] is None:
            artist_info["embedding_source"] = "not_found"
        
        results["user2_artists"].append(artist_info)
    
    # Compute similarity if we have embeddings
    if u1_embeddings and u2_embeddings:
        u1_avg = np.mean(u1_embeddings, axis=0)
        u2_avg = np.mean(u2_embeddings, axis=0)
        sim = cosine_similarity([u1_avg], [u2_avg])[0][0]
        results["similarity"] = round(float((sim + 1) / 2 * 100), 1)
        
        u1_matched = sum(1 for a in results["user1_artists"] if a["embedding_source"] != "not_found")
        u2_matched = sum(1 for a in results["user2_artists"] if a["embedding_source"] != "not_found")
        results["explanation"] = (
            f"User1: {u1_matched}/{len(payload.user1_artists)} artists matched. "
            f"User2: {u2_matched}/{len(payload.user2_artists)} artists matched. "
            f"Cosine similarity in latent space: {results['similarity']}%"
        )
    else:
        results["explanation"] = "Could not compute similarity - no artists found in dataset"
    
    return results


# -------------------------------------------------------------------
# Enhanced Taste Matching V2 - With Mood Profiles
# -------------------------------------------------------------------
class MusicPersonalityRequest(BaseModel):
    """Request for music personality analysis."""
    track_ids: List[str]

class MusicPersonalityResponse(BaseModel):
    """Response with music personality traits."""
    energy_level: str
    mood_preference: str
    production_style: str
    vocal_preference: str
    dance_factor: str
    tempo_preference: str
    scores: Dict[str, int]
    mood_profile: Optional[Dict[str, float]] = None

class EnhancedTasteV2Request(BaseModel):
    """Request for enhanced taste matching with mood profiles."""
    user1_track_ids: List[str]
    user2_track_ids: List[str]

class EnhancedTasteV2Response(BaseModel):
    """Response with detailed similarity including mood profiles."""
    overall_similarity: float
    audio_similarity: Optional[float] = None
    mood_similarity: Optional[float] = None
    personality_match: Optional[float] = None
    breakdown: Dict[str, float]
    user1_mood_profile: Optional[Dict[str, float]] = None
    user2_mood_profile: Optional[Dict[str, float]] = None
    compatibility_insights: List[str] = []


@app.post("/predict/music_personality", response_model=MusicPersonalityResponse)
def get_music_personality(payload: MusicPersonalityRequest):
    """
    Analyze a user's music personality based on their listening history.
    Returns personality traits derived from audio feature patterns.
    """
    if taste_model is None:
        raise HTTPException(status_code=500, detail="Taste model not loaded")
    
    if not payload.track_ids:
        raise HTTPException(status_code=400, detail="No track IDs provided")
    
    # Get personality traits
    personality = taste_model.get_music_personality(payload.track_ids)
    if personality is None:
        raise HTTPException(status_code=400, detail="Could not analyze tracks - none found in database")
    
    # Get mood profile
    mood_profile = taste_model._build_mood_profile(payload.track_ids)
    mood_dict = None
    if mood_profile is not None:
        from app.spotify_taste_model import MOOD_CATEGORIES
        mood_dict = {
            MOOD_CATEGORIES[i]: round(mood_profile[i] * 100, 1)
            for i in range(len(MOOD_CATEGORIES))
        }
    
    return MusicPersonalityResponse(
        energy_level=personality["energy_level"],
        mood_preference=personality["mood_preference"],
        production_style=personality["production_style"],
        vocal_preference=personality["vocal_preference"],
        dance_factor=personality["dance_factor"],
        tempo_preference=personality["tempo_preference"],
        scores=personality["scores"],
        mood_profile=mood_dict,
    )


@app.post("/predict/enhanced_taste_v2", response_model=EnhancedTasteV2Response)
def predict_enhanced_taste_v2(payload: EnhancedTasteV2Request):
    """
    Enhanced taste matching V2 with mood profiles and personality matching.
    
    This version combines:
    1. Weighted audio feature similarity (using learned feature importances)
    2. Mood profile correlation (7-dimensional mood vectors)
    3. Music personality trait matching
    
    Returns detailed breakdown and compatibility insights.
    """
    if taste_model is None:
        raise HTTPException(status_code=500, detail="Taste model not loaded")
    
    if not payload.user1_track_ids or not payload.user2_track_ids:
        raise HTTPException(status_code=400, detail="Both users must have track IDs")
    
    # Get enhanced similarity with all components
    result = taste_model.enhanced_similarity(
        payload.user1_track_ids,
        payload.user2_track_ids
    )
    
    # Generate compatibility insights
    insights = []
    
    if result["mood_similarity"] is not None:
        if result["mood_similarity"] >= 80:
            insights.append("You both gravitate toward similar moods in music!")
        elif result["mood_similarity"] >= 60:
            insights.append("Your mood preferences overlap in several areas.")
        elif result["mood_similarity"] < 40:
            insights.append("You explore different emotional territories in music.")
    
    if result["personality_match"] is not None:
        if result["personality_match"] >= 70:
            insights.append("Your music personalities are highly compatible!")
        elif result["personality_match"] >= 50:
            insights.append("You share some listening style preferences.")
    
    if result["audio_similarity"] is not None:
        if result["audio_similarity"] >= 75:
            insights.append("The sonic qualities you enjoy are very similar.")
        elif result["audio_similarity"] >= 50:
            insights.append("You have overlapping taste in sound and production.")
    
    # Check for complementary profiles (different but compatible)
    if result["user1_mood_profile"] and result["user2_mood_profile"]:
        profile1 = result["user1_mood_profile"]
        profile2 = result["user2_mood_profile"]
        
        # Find each user's top moods
        top1 = max(profile1.items(), key=lambda x: x[1])[0] if profile1 else None
        top2 = max(profile2.items(), key=lambda x: x[1])[0] if profile2 else None
        
        if top1 and top2:
            if top1 == top2:
                insights.append(f"You both lean heavily toward {top1} music!")
            else:
                insights.append(f"You could introduce each other to new vibes - {top1} meets {top2}.")
    
    return EnhancedTasteV2Response(
        overall_similarity=result["overall"],
        audio_similarity=result["audio_similarity"],
        mood_similarity=result["mood_similarity"],
        personality_match=result["personality_match"],
        breakdown=result["breakdown"],
        user1_mood_profile=result["user1_mood_profile"],
        user2_mood_profile=result["user2_mood_profile"],
        compatibility_insights=insights,
    )


# -------------------------------------------------------------------
# Mood Classification Endpoints
# -------------------------------------------------------------------
@app.post("/predict/mood", response_model=MoodClassifyResponse)
def classify_playlist_mood(payload: MoodClassifyRequest):
    """
    Classify playlist mood from audio features.
    Send a list of tracks with their Spotify audio features.
    
    Uses ML model if trained, otherwise falls back to rule-based system.
    """
    if not payload.tracks:
        raise HTTPException(status_code=400, detail="No tracks provided")
    
    # Convert to dict format
    tracks_features = [
        {
            "danceability": t.danceability,
            "energy": t.energy,
            "valence": t.valence,
            "acousticness": t.acousticness or 0.5,
            "instrumentalness": t.instrumentalness or 0.0,
            "liveness": t.liveness or 0.1,
            "speechiness": t.speechiness or 0.0,
            "tempo": t.tempo or 120.0,
        }
        for t in payload.tracks
    ]
    
    # Use ML model if available, otherwise rule-based
    if ml_mood_model and ml_mood_model.use_ml:
        result = ml_mood_model.predict_playlist(tracks_features)
    else:
        result = mood_classifier.classify_playlist(tracks_features)
    
    return MoodClassifyResponse(
        moods=[MoodItem(**m) for m in result["moods"]],
        dominant_mood=result["dominant_mood"],
        dominant_color=result.get("dominant_color"),
        track_count=result["track_count"],
        insights=result["insights"],
        average_features=result.get("average_features"),
    )


@app.post("/predict/mood/by-ids", response_model=MoodClassifyResponse)
def classify_playlist_mood_by_ids(payload: MoodClassifyByIdsRequest):
    """
    Classify playlist mood from track IDs (uses our SpotifyFeatures.csv database).
    """
    if not payload.track_ids:
        raise HTTPException(status_code=400, detail="No track IDs provided")
    
    result = mood_classifier.classify_by_track_ids(payload.track_ids)
    
    # If no tracks found, return default values instead of error
    if result.get("tracks_analyzed", 0) == 0:
        return MoodClassifyResponse(
            moods=[MoodItem(mood="Energetic", percentage=30, color="#FF6B6B"),
                   MoodItem(mood="Happy", percentage=30, color="#FFD93D"),
                   MoodItem(mood="Chill", percentage=40, color="#6BCB77")],
            dominant_mood="Chill",
            dominant_color="#6BCB77",
            track_count=len(payload.track_ids),
            tracks_analyzed=0,
            insights={"note": "Track IDs not found in database, showing default values"},
            average_features={"energy": 0.5, "danceability": 0.5, "valence": 0.5, "acousticness": 0.5, "instrumentalness": 0.1}
        )
    
    return MoodClassifyResponse(
        moods=[MoodItem(**m) for m in result["moods"]],
        dominant_mood=result["dominant_mood"],
        dominant_color=result["dominant_color"],
        track_count=result["track_count"],
        tracks_analyzed=result.get("tracks_analyzed"),
        insights=result["insights"],
        average_features=result.get("average_features"),
    )


@app.post("/predict/mood/by-genres", response_model=GenreMoodResponse)
def classify_mood_by_genres(payload: GenreMoodRequest):
    """
    Classify playlist/track mood from genre names.
    
    Use this endpoint when Spotify Audio Features API is unavailable.
    This is a FALLBACK method - less accurate than audio-based classification.
    
    Accuracy varies by genre:
    - High (80-97%): Classical, Opera, Soundtrack, A Capella
    - Medium (40-60%): Jazz, Folk, Hip-Hop, Rap, Country
    - Low (25-35%): Alternative, Indie, Electronic, R&B
    
    Input: List of genres (e.g., from artist.genres or track metadata)
    """
    if not payload.genres:
        raise HTTPException(status_code=400, detail="No genres provided")
    
    # Use genre-based classifier
    if genre_mood_classifier and genre_mood_classifier._loaded:
        dominant, probs = genre_mood_classifier.predict_from_genres(payload.genres)
    else:
        # Fallback to hardcoded mapping
        from ml.genre_mood_classifier import get_hardcoded_prediction
        # Average predictions across all genres
        all_probs = []
        for genre in payload.genres:
            _, probs = get_hardcoded_prediction(genre)
            all_probs.append(probs)
        
        # Average
        avg_probs = {}
        for mood in MOOD_CATEGORIES:
            avg_probs[mood] = sum(p.get(mood, 0.1) for p in all_probs) / len(all_probs)
        probs = avg_probs
        dominant = max(probs, key=probs.get)
    
    confidence = probs[dominant]
    
    # Add warning for low-confidence predictions
    warning = None
    if confidence < 0.35:
        warning = f"Low confidence prediction ({confidence:.1%}). Genre '{payload.genres[0]}' has ambiguous mood mapping."
    
    return GenreMoodResponse(
        dominant_mood=dominant,
        confidence=round(confidence, 3),
        mood_distribution={k: round(v, 3) for k, v in probs.items()},
        method="genre",
        genres_analyzed=len(payload.genres),
        warning=warning,
    )


@app.get("/moods/categories")
def get_mood_categories():
    """Get available mood categories and their colors."""
    return {
        "categories": MOOD_CATEGORIES,
        "colors": MOOD_COLORS,
    }


@app.post("/lookup/artist-genres", response_model=ArtistGenreResponse)
async def lookup_artist_genres(request: ArtistGenreRequest):
    """
    Look up genres for given artist names.
    Uses a database of 14,000+ artists from Spotify data.
    Falls back to Last.fm API for unknown artists.
    """
    if not ARTIST_GENRE_MAP:
        raise HTTPException(
            status_code=503,
            detail="Artist-genre database not loaded"
        )
    
    all_genres = []
    artist_matches = {}
    not_found = []
    
    for artist in request.artists:
        artist_lower = artist.lower().strip()
        
        # Try exact match first
        if artist_lower in ARTIST_GENRE_MAP:
            genres = ARTIST_GENRE_MAP[artist_lower]
            artist_matches[artist] = genres
            all_genres.extend(genres)
        else:
            # Try partial match (for "Tyler, The Creator" vs "Tyler the Creator" etc)
            found = False
            for db_artist, genres in ARTIST_GENRE_MAP.items():
                # Check if one contains the other (handles variations)
                if artist_lower in db_artist or db_artist in artist_lower:
                    artist_matches[artist] = genres
                    all_genres.extend(genres)
                    found = True
                    break
            
            if not found:
                not_found.append(artist)
    
    # Try Last.fm for unknown artists
    if not_found:
        try:
            from app.lastfm_client import get_multiple_artist_tags
            lastfm_results = await get_multiple_artist_tags(not_found)
            
            for artist, genres in lastfm_results.items():
                if genres:
                    artist_matches[artist] = genres
                    all_genres.extend(genres)
                    not_found.remove(artist)
                    logger.info(f"[LastFM] Found genres for '{artist}': {genres}")
        except Exception as e:
            logger.info(f"[LastFM] Fallback failed: {e}")
    
    # Remove duplicates while preserving order
    unique_genres = list(dict.fromkeys(all_genres))
    
    return ArtistGenreResponse(
        genres=unique_genres,
        artist_matches=artist_matches,
        artists_found=len(artist_matches),
        artists_not_found=not_found
    )


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "taste_model_loaded": taste_model is not None,
        "mood_classifier_loaded": mood_classifier is not None,
        "ml_mood_model_loaded": ml_mood_model is not None and ml_mood_model.use_ml,
        "genre_mood_fallback": genre_mood_classifier is not None and genre_mood_classifier._loaded,
        "tracks_loaded": len(mood_classifier.track_features) if mood_classifier else 0,
        "inference_mode": "ml" if (ml_mood_model and ml_mood_model.use_ml) else "rule_based",
        "audio_features_required": True,  # Primary method needs audio features
        "genre_fallback_available": genre_mood_classifier is not None,  # Genre fallback for Spotify API deprecation
    }


@app.get("/demo/sample-profiles")
def get_sample_profiles():
    """
    Get sample user profiles with real track IDs for demo taste matching.
    Returns profiles with diverse music tastes.
    """
    if taste_model is None:
        raise HTTPException(status_code=500, detail="Taste model not loaded")
    
    # Get sample track IDs that exist in our database
    all_track_ids = list(taste_model.track_features.keys())
    
    # Create diverse sample profiles by selecting tracks from different parts of dataset
    # (The dataset is sorted roughly by popularity/date)
    chunk_size = len(all_track_ids) // 10
    
    profiles = {
        "hip_hop_fan": {
            "name": "Hip-Hop Head",
            "description": "Loves rap, hip-hop, and R&B",
            "track_ids": all_track_ids[0:15],  # First chunk
        },
        "indie_lover": {
            "name": "Indie Explorer", 
            "description": "Into indie rock and alternative",
            "track_ids": all_track_ids[chunk_size:chunk_size+15],
        },
        "edm_enthusiast": {
            "name": "EDM Fan",
            "description": "High energy electronic and dance",
            "track_ids": all_track_ids[chunk_size*2:chunk_size*2+15],
        },
        "chill_vibes": {
            "name": "Chill Listener",
            "description": "Lo-fi, ambient, and relaxing tunes",
            "track_ids": all_track_ids[chunk_size*3:chunk_size*3+15],
        },
        "rock_classic": {
            "name": "Rock Enthusiast",
            "description": "Classic and modern rock",
            "track_ids": all_track_ids[chunk_size*5:chunk_size*5+15],
        },
        "pop_mainstream": {
            "name": "Pop Lover",
            "description": "Top hits and mainstream pop",
            "track_ids": all_track_ids[chunk_size*7:chunk_size*7+15],
        },
    }
    
    return {"profiles": profiles}
