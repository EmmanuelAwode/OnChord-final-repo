"""
Genre-Based Mood Classifier (Fallback)
======================================
This classifier predicts mood from genre when Spotify Audio Features
are not available (deprecated for new developers since late 2024).

Approach:
---------
1. Train a probabilistic mapping from genre → mood distribution
2. Can be used as fallback when audio features unavailable
3. Returns probability distribution, not just single mood

Limitations:
- Less accurate than audio-feature model (genre is a weak signal)
- Some genres are ambiguous (e.g., "Indie" could be many moods)
- Best for aggregate playlist analysis, less reliable for single tracks

Training Data: SpotifyFeatures.csv (232K tracks with genre labels)
"""

import logging
import json
import numpy as np
import pandas as pd
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Mood categories (same as audio-based classifier)
MOOD_CATEGORIES = ["Aggressive", "Chill", "Hype", "Melancholic", "Happy", "Focus", "Party"]

# Feature columns for mood assignment (used to create training labels)
FEATURE_COLUMNS = [
    "danceability", "energy", "valence", "acousticness",
    "instrumentalness", "liveness", "speechiness", "tempo"
]


def assign_mood_label(row: pd.Series) -> str:
    """Assign mood based on audio features (for creating training labels)."""
    energy = row.get('energy', 0.5)
    valence = row.get('valence', 0.5)
    danceability = row.get('danceability', 0.5)
    acousticness = row.get('acousticness', 0.5)
    instrumentalness = row.get('instrumentalness', 0.0)
    tempo = row.get('tempo', 120)
    
    if energy > 0.75 and valence < 0.4 and tempo > 100:
        return "Aggressive"
    if energy > 0.7 and danceability > 0.65 and tempo > 115:
        return "Hype"
    if danceability > 0.7 and valence > 0.55 and energy > 0.5:
        return "Party"
    if valence > 0.6 and energy > 0.45:
        return "Happy"
    if energy < 0.45 and (acousticness > 0.4 or valence > 0.4):
        return "Chill"
    if instrumentalness > 0.4 or (energy < 0.5 and acousticness > 0.3):
        return "Focus"
    if valence < 0.35 and energy < 0.55:
        return "Melancholic"
    if energy > 0.5:
        return "Happy" if valence > 0.5 else "Hype"
    return "Chill" if valence > 0.5 else "Melancholic"


class GenreMoodClassifier:
    """
    Fallback classifier that uses genre to predict mood.
    
    Uses learned probability distributions from historical data
    where we had both genre and audio features.
    
    Attributes:
        genre_mood_probs: Dict mapping genre -> mood probability distribution
        default_probs: Default distribution for unknown genres
    """
    
    def __init__(self):
        self.genre_mood_probs: Dict[str, Dict[str, float]] = {}
        self.default_probs: Dict[str, float] = {}
        self._loaded = False
    
    def train(self, csv_path: str) -> Dict:
        """
        Train the genre-mood probability mapping.
        
        Args:
            csv_path: Path to CSV with genre and audio features
            
        Returns:
            Training statistics
        """
        logger.info(f"[GenreMood] Loading training data: {csv_path}")
        df = pd.read_csv(csv_path, low_memory=False)
        
        # Check required columns
        if 'genre' not in df.columns:
            raise ValueError("Dataset must have 'genre' column")
        
        # Assign mood labels using audio features
        logger.info("[GenreMood] Assigning mood labels from audio features...")
        df['mood'] = df.apply(assign_mood_label, axis=1)
        
        # Calculate P(mood|genre) for each genre
        logger.info("[GenreMood] Computing genre-mood probability distributions...")
        
        genre_mood_counts = defaultdict(lambda: defaultdict(int))
        for _, row in df.iterrows():
            genre = row['genre']
            mood = row['mood']
            genre_mood_counts[genre][mood] += 1
        
        # Convert counts to probabilities with Laplace smoothing
        alpha = 1  # Smoothing parameter
        
        for genre, mood_counts in genre_mood_counts.items():
            total = sum(mood_counts.values()) + alpha * len(MOOD_CATEGORIES)
            self.genre_mood_probs[genre] = {
                mood: (mood_counts.get(mood, 0) + alpha) / total
                for mood in MOOD_CATEGORIES
            }
        
        # Calculate overall mood distribution as default
        overall_counts = defaultdict(int)
        for mood in df['mood']:
            overall_counts[mood] += 1
        total = sum(overall_counts.values()) + alpha * len(MOOD_CATEGORIES)
        self.default_probs = {
            mood: (overall_counts.get(mood, 0) + alpha) / total
            for mood in MOOD_CATEGORIES
        }
        
        self._loaded = True
        
        # Calculate statistics
        stats = {
            "genres": len(self.genre_mood_probs),
            "total_tracks": len(df),
            "genre_list": list(self.genre_mood_probs.keys()),
        }
        
        logger.info(f"[GenreMood] Trained on {stats['genres']} genres, {stats['total_tracks']:,} tracks")
        
        return stats
    
    def save(self, filepath: str):
        """Save the trained model to JSON."""
        data = {
            "genre_mood_probs": self.genre_mood_probs,
            "default_probs": self.default_probs,
            "mood_categories": MOOD_CATEGORIES,
        }
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"[GenreMood] Saved to: {filepath}")
    
    def load(self, filepath: str) -> bool:
        """Load trained model from JSON."""
        try:
            with open(filepath) as f:
                data = json.load(f)
            self.genre_mood_probs = data["genre_mood_probs"]
            self.default_probs = data["default_probs"]
            self._loaded = True
            logger.info(f"[GenreMood] Loaded model with {len(self.genre_mood_probs)} genres")
            return True
        except Exception as e:
            logger.info(f"[GenreMood] Failed to load: {e}")
            return False
    
    def predict(self, genre: str) -> Tuple[str, Dict[str, float]]:
        """
        Predict mood from genre.
        
        Args:
            genre: Spotify genre string (case-insensitive)
            
        Returns:
            Tuple of (dominant_mood, probability_dict)
        """
        if not self._loaded:
            raise RuntimeError("Model not trained/loaded")
        
        # Normalize genre name
        genre_lower = genre.lower().strip()
        
        # Find matching genre (fuzzy match)
        probs = None
        for known_genre, known_probs in self.genre_mood_probs.items():
            if known_genre.lower() == genre_lower:
                probs = known_probs
                break
            # Partial match (e.g., "hip hop" matches "Hip-Hop")
            if genre_lower in known_genre.lower() or known_genre.lower() in genre_lower:
                probs = known_probs
                break
        
        if probs is None:
            probs = self.default_probs
        
        dominant_mood = max(probs, key=probs.get)
        return dominant_mood, probs
    
    def predict_from_genres(self, genres: List[str]) -> Tuple[str, Dict[str, float]]:
        """
        Predict mood from multiple genres (e.g., artist genres).
        
        Averages the probability distributions across all genres.
        
        Args:
            genres: List of genre strings
            
        Returns:
            Tuple of (dominant_mood, averaged_probability_dict)
        """
        if not genres:
            return max(self.default_probs, key=self.default_probs.get), self.default_probs
        
        # Collect all probability distributions
        all_probs = []
        for genre in genres:
            _, probs = self.predict(genre)
            all_probs.append(probs)
        
        # Average the probabilities
        avg_probs = {}
        for mood in MOOD_CATEGORIES:
            avg_probs[mood] = sum(p[mood] for p in all_probs) / len(all_probs)
        
        dominant_mood = max(avg_probs, key=avg_probs.get)
        return dominant_mood, avg_probs
    
    def get_genre_mood_profile(self, genre: str) -> Dict:
        """Get detailed mood profile for a genre."""
        dominant, probs = self.predict(genre)
        
        # Sort moods by probability
        sorted_moods = sorted(probs.items(), key=lambda x: -x[1])
        
        return {
            "genre": genre,
            "dominant_mood": dominant,
            "confidence": probs[dominant],
            "mood_distribution": probs,
            "mood_ranking": [{"mood": m, "probability": p} for m, p in sorted_moods],
        }


# Pre-computed genre-mood mapping (can be used without training)
# Based on analysis of SpotifyFeatures.csv dataset
HARDCODED_GENRE_MOODS = {
    # High confidence (>60% agreement)
    "Opera": {"Chill": 0.975, "Focus": 0.015, "Melancholic": 0.01},
    "Classical": {"Chill": 0.905, "Focus": 0.05, "Melancholic": 0.045},
    "A Capella": {"Chill": 0.824, "Happy": 0.10, "Focus": 0.076},
    "Soundtrack": {"Chill": 0.772, "Focus": 0.12, "Melancholic": 0.108},
    "Movie": {"Chill": 0.653, "Focus": 0.18, "Melancholic": 0.167},
    "Children's Music": {"Chill": 0.628, "Happy": 0.20, "Focus": 0.172},
    "Ska": {"Happy": 0.560, "Hype": 0.25, "Party": 0.190},
    
    # Medium confidence (40-60%)
    "Jazz": {"Chill": 0.443, "Focus": 0.22, "Happy": 0.187, "Melancholic": 0.15},
    "Comedy": {"Hype": 0.430, "Chill": 0.24, "Happy": 0.180, "Focus": 0.15},
    "Blues": {"Happy": 0.422, "Chill": 0.32, "Melancholic": 0.158, "Focus": 0.10},
    "Folk": {"Chill": 0.415, "Happy": 0.30, "Melancholic": 0.185, "Focus": 0.10},
    "Hip-Hop": {"Hype": 0.411, "Party": 0.22, "Happy": 0.169, "Aggressive": 0.20},
    "Rap": {"Hype": 0.422, "Party": 0.22, "Aggressive": 0.20, "Happy": 0.158},
    "Dance": {"Hype": 0.391, "Party": 0.28, "Happy": 0.179, "Aggressive": 0.15},
    "Country": {"Happy": 0.392, "Chill": 0.28, "Hype": 0.178, "Melancholic": 0.15},
    "Rock": {"Happy": 0.382, "Hype": 0.27, "Aggressive": 0.148, "Chill": 0.20},
    "Pop": {"Hype": 0.363, "Happy": 0.28, "Party": 0.177, "Chill": 0.18},
    "Reggaeton": {"Party": 0.367, "Hype": 0.29, "Happy": 0.193, "Aggressive": 0.15},
    "Reggae": {"Happy": 0.333, "Chill": 0.28, "Party": 0.237, "Hype": 0.15},
    "Anime": {"Happy": 0.332, "Chill": 0.28, "Hype": 0.188, "Focus": 0.20},
    "World": {"Chill": 0.329, "Happy": 0.27, "Focus": 0.201, "Hype": 0.20},
    
    # Low confidence (<35% - ambiguous genres)
    "Alternative": {"Hype": 0.306, "Happy": 0.22, "Chill": 0.174, "Aggressive": 0.15, "Melancholic": 0.15},
    "R&B": {"Hype": 0.303, "Happy": 0.25, "Chill": 0.197, "Party": 0.15, "Melancholic": 0.10},
    "Electronic": {"Hype": 0.292, "Party": 0.22, "Chill": 0.188, "Happy": 0.15, "Aggressive": 0.15},
    "Soul": {"Chill": 0.281, "Happy": 0.26, "Hype": 0.209, "Melancholic": 0.15, "Focus": 0.10},
    "Indie": {"Hype": 0.258, "Chill": 0.23, "Happy": 0.212, "Melancholic": 0.15, "Aggressive": 0.15},
}


def get_hardcoded_prediction(genre: str) -> Tuple[str, Dict[str, float]]:
    """
    Quick prediction using hardcoded genre-mood mapping.
    
    Use this when you don't want to load the full model.
    """
    genre_title = genre.title().strip()
    
    # Direct match
    if genre_title in HARDCODED_GENRE_MOODS:
        probs = HARDCODED_GENRE_MOODS[genre_title]
        # Fill missing moods with small probability
        full_probs = {mood: probs.get(mood, 0.01) for mood in MOOD_CATEGORIES}
        # Normalize
        total = sum(full_probs.values())
        full_probs = {k: v/total for k, v in full_probs.items()}
        return max(full_probs, key=full_probs.get), full_probs
    
    # Fuzzy match
    genre_lower = genre.lower()
    for known_genre, probs in HARDCODED_GENRE_MOODS.items():
        if genre_lower in known_genre.lower() or known_genre.lower() in genre_lower:
            full_probs = {mood: probs.get(mood, 0.01) for mood in MOOD_CATEGORIES}
            total = sum(full_probs.values())
            full_probs = {k: v/total for k, v in full_probs.items()}
            return max(full_probs, key=full_probs.get), full_probs
    
    # Default: balanced distribution with slight preference for Happy
    default = {
        "Happy": 0.20, "Chill": 0.18, "Hype": 0.18,
        "Party": 0.14, "Focus": 0.12, "Melancholic": 0.10, "Aggressive": 0.08
    }
    return "Happy", default


# ============================================================================
# TRAINING SCRIPT
# ============================================================================

if __name__ == "__main__":
    import sys
    
    # Configure logging for CLI output
    logging.basicConfig(level=logging.INFO, format='%(message)s')
    
    # Default paths
    DATA_DIR = Path(__file__).parent.parent / "data"
    MODELS_DIR = Path(__file__).parent.parent / "models"
    
    csv_path = DATA_DIR / "SpotifyFeatures.csv"
    output_path = MODELS_DIR / "genre_mood_model.json"
    
    logger.info("="*60)
    logger.info("GENRE-MOOD CLASSIFIER TRAINING")
    logger.info("="*60)
    logger.info(f"\nInput:  {csv_path}")
    logger.info(f"Output: {output_path}")
    
    # Train
    classifier = GenreMoodClassifier()
    stats = classifier.train(str(csv_path))
    
    # Save
    classifier.save(str(output_path))
    
    # Test
    logger.info("\n" + "="*60)
    logger.info("TESTING")
    logger.info("="*60)
    
    test_genres = ["Hip-Hop", "Classical", "Rock", "Electronic", "Reggaeton", "Unknown Genre"]
    for genre in test_genres:
        mood, probs = classifier.predict(genre)
        conf = probs[mood] * 100
        logger.info(f"  {genre:16s} → {mood:12s} ({conf:5.1f}% confidence)")
    
    logger.info("\n[DONE] Genre-mood classifier trained and saved!")
