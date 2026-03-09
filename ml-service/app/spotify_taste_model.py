# app/spotify_taste_model.py
"""
Enhanced Spotify Taste Model

This module provides ML-based taste matching between users
based on their listening history and music preferences.

Features:
---------
1. Audio feature similarity (cosine similarity)
2. Mood profile matching (7-dimensional mood vectors)
3. Music personality traits derived from listening patterns
4. Weighted feature importance from trained model

Author: OnChord ML Team
"""

import logging
import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Optional, Tuple
import json
from pathlib import Path

logger = logging.getLogger(__name__)

FEATURE_COLUMNS = [
    "danceability",
    "energy",
    "valence",
    "acousticness",
    "instrumentalness",
    "liveness",
    "speechiness",
    "tempo",
]

# Mood categories from the classifier
MOOD_CATEGORIES = ["Aggressive", "Chill", "Hype", "Melancholic", "Happy", "Focus", "Party"]

# Learned feature weights from our trained model (higher = more important for mood)
# These come from the RandomForest feature importances
FEATURE_WEIGHTS = {
    "valence": 0.307,
    "energy": 0.249,
    "tempo": 0.128,
    "acousticness": 0.102,
    "danceability": 0.098,
    "instrumentalness": 0.075,
    "speechiness": 0.033,
    "liveness": 0.009,
}


class SpotifyTasteModel:
    """
    Enhanced taste matching model that combines:
    1. Audio feature similarity
    2. Mood profile matching
    3. Music personality traits
    
    Attributes:
        track_features: Dict mapping track_id -> scaled feature vector
        track_raw_features: Dict mapping track_id -> raw feature dict
        scaler: StandardScaler for normalizing features
        mood_model: Optional trained mood classifier
    """
    
    def __init__(self, csv_path: str, mood_model_dir: Optional[str] = None):
        self.csv_path = csv_path
        self.scaler = None
        self.track_features: Dict[str, np.ndarray] = {}
        self.track_raw_features: Dict[str, Dict[str, float]] = {}
        self.mood_model = None
        self.mood_scaler = None
        
        self._load_data()
        
        # Try to load mood model for enhanced matching
        if mood_model_dir:
            self._load_mood_model(mood_model_dir)

    def _load_data(self):
        if not os.path.exists(self.csv_path):
            raise FileNotFoundError(f"Dataset not found at {self.csv_path}")

        logger.info(f"[TasteModel] Loading data from: {self.csv_path}")
        df = pd.read_csv(self.csv_path, low_memory=False)

        # Normalize column names (different datasets use different names)
        column_mapping = {
            'id': 'track_id',
            'track_uri': 'track_id', 
            'uri': 'track_id',
        }
        df = df.rename(columns={k: v for k, v in column_mapping.items() if k in df.columns})
        
        # Handle track_id format (some have spotify:track: prefix)
        if 'track_id' in df.columns:
            df['track_id'] = df['track_id'].astype(str).str.replace('spotify:track:', '', regex=False)
        
        if 'track_id' not in df.columns:
            raise ValueError(f"Missing track_id column. Available: {list(df.columns)[:10]}")

        # Check which feature columns are available
        available_features = [col for col in FEATURE_COLUMNS if col in df.columns]
        if len(available_features) < 3:
            raise ValueError(f"Not enough features. Found: {available_features}")
        
        logger.info(f"[TasteModel] Using features: {available_features}")
        self.available_features = available_features

        # Drop rows with missing values in our feature cols
        df = df.dropna(subset=available_features)

        # Fit scaler
        X = df[available_features].astype(float).values
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Build lookups: track_id -> scaled vector AND raw features
        for i, (track_id, row) in enumerate(zip(df["track_id"], df[available_features].to_dict('records'))):
            tid = str(track_id)
            self.track_features[tid] = X_scaled[i]
            self.track_raw_features[tid] = row
        
        logger.info(f"[TasteModel] Loaded {len(self.track_features)} tracks")

    def _load_mood_model(self, model_dir: str):
        """Load the trained mood classifier for enhanced matching."""
        try:
            import joblib
            model_path = Path(model_dir)
            
            # Find model file
            model_files = list(model_path.glob("mood_classifier_*.joblib"))
            if model_files:
                self.mood_model = joblib.load(model_files[0])
                logger.info(f"[TasteModel] Loaded mood model: {model_files[0].name}")
                
            # Load scaler
            scaler_path = model_path / "scaler.joblib"
            if scaler_path.exists():
                self.mood_scaler = joblib.load(scaler_path)
                
        except Exception as e:
            logger.info(f"[TasteModel] Could not load mood model: {e}")

    def _build_user_vector(self, track_ids: List[str], weighted: bool = True) -> Optional[np.ndarray]:
        """
        Build a user's taste vector from their tracks.
        
        Args:
            track_ids: List of Spotify track IDs
            weighted: If True, use learned feature weights
            
        Returns:
            Averaged feature vector or None if no tracks found
        """
        vectors = []
        for tid in track_ids:
            vec = self.track_features.get(tid)
            if vec is not None:
                vectors.append(vec)

        if not vectors:
            return None

        # Average the vectors
        user_vec = np.mean(np.stack(vectors), axis=0)
        
        # Apply feature weights if requested
        if weighted and len(user_vec) == len(FEATURE_COLUMNS):
            weights = np.array([FEATURE_WEIGHTS.get(f, 0.1) for f in FEATURE_COLUMNS])
            user_vec = user_vec * weights
            
        return user_vec

    def _build_mood_profile(self, track_ids: List[str]) -> Optional[np.ndarray]:
        """
        Build a user's mood profile - a 7-dimensional vector representing
        their preference for each mood category.
        
        Uses rule-based mood assignment from audio features.
        
        Returns:
            7-dimensional mood distribution vector (sums to 1)
        """
        mood_counts = np.zeros(len(MOOD_CATEGORIES))
        
        for tid in track_ids:
            raw = self.track_raw_features.get(tid)
            if raw is None:
                continue
                
            # Simple rule-based mood assignment (same logic as pseudo_labeler)
            energy = raw.get('energy', 0.5)
            valence = raw.get('valence', 0.5)
            danceability = raw.get('danceability', 0.5)
            acousticness = raw.get('acousticness', 0.5)
            instrumentalness = raw.get('instrumentalness', 0.0)
            tempo = raw.get('tempo', 120)
            
            # Assign mood based on feature combinations
            if energy > 0.8 and valence < 0.4:
                mood_counts[0] += 1  # Aggressive
            elif energy < 0.4 and valence > 0.4 and acousticness > 0.5:
                mood_counts[1] += 1  # Chill
            elif energy > 0.7 and danceability > 0.7 and tempo > 120:
                mood_counts[2] += 1  # Hype
            elif valence < 0.3 and energy < 0.5:
                mood_counts[3] += 1  # Melancholic
            elif valence > 0.6 and energy > 0.5:
                mood_counts[4] += 1  # Happy
            elif instrumentalness > 0.5 or (energy < 0.5 and acousticness > 0.3):
                mood_counts[5] += 1  # Focus
            elif danceability > 0.7 and valence > 0.5:
                mood_counts[6] += 1  # Party
            else:
                # Distribute among closest moods based on energy/valence
                if energy > 0.5:
                    if valence > 0.5:
                        mood_counts[4] += 0.5  # Happy
                        mood_counts[6] += 0.5  # Party
                    else:
                        mood_counts[0] += 0.5  # Aggressive
                        mood_counts[2] += 0.5  # Hype
                else:
                    if valence > 0.5:
                        mood_counts[1] += 0.5  # Chill
                        mood_counts[5] += 0.5  # Focus
                    else:
                        mood_counts[3] += 0.5  # Melancholic
                        mood_counts[5] += 0.5  # Focus
        
        total = mood_counts.sum()
        if total == 0:
            return None
            
        return mood_counts / total

    def get_music_personality(self, track_ids: List[str]) -> Optional[Dict]:
        """
        Derive music personality traits from listening patterns.
        
        Returns traits like:
        - Energy Level: Low/Medium/High
        - Mood Preference: Upbeat/Balanced/Reflective
        - Production Style: Acoustic/Mixed/Electronic
        - Vocal Preference: Instrumental/Balanced/Vocal
        
        Returns:
            Dict with personality traits and scores
        """
        raw_features = []
        for tid in track_ids:
            raw = self.track_raw_features.get(tid)
            if raw is not None:
                raw_features.append(raw)
        
        if not raw_features:
            return None
        
        # Calculate average features
        avg = {}
        for feat in FEATURE_COLUMNS:
            values = [r.get(feat, 0) for r in raw_features if feat in r]
            avg[feat] = np.mean(values) if values else 0.5
        
        # Derive personality traits
        personality = {
            "energy_level": self._categorize(avg.get('energy', 0.5), 
                                              ["Low Energy", "Moderate Energy", "High Energy"]),
            "mood_preference": self._categorize(avg.get('valence', 0.5),
                                                 ["Reflective", "Balanced", "Upbeat"]),
            "production_style": self._categorize(1 - avg.get('acousticness', 0.5),
                                                  ["Acoustic", "Hybrid", "Electronic"]),
            "vocal_preference": self._categorize(1 - avg.get('instrumentalness', 0.0),
                                                  ["Instrumental", "Mixed", "Vocal-Heavy"]),
            "dance_factor": self._categorize(avg.get('danceability', 0.5),
                                              ["Laid-back", "Groovy", "Dance-Ready"]),
            "tempo_preference": self._categorize(min(avg.get('tempo', 120) / 180, 1.0),
                                                  ["Slow & Steady", "Moderate", "Fast-Paced"]),
            # Raw scores for visualization
            "scores": {
                "energy": round(avg.get('energy', 0.5) * 100),
                "positivity": round(avg.get('valence', 0.5) * 100),
                "danceability": round(avg.get('danceability', 0.5) * 100),
                "acousticness": round(avg.get('acousticness', 0.5) * 100),
                "instrumentalness": round(avg.get('instrumentalness', 0.0) * 100),
            }
        }
        
        return personality
    
    def _categorize(self, value: float, labels: List[str]) -> str:
        """Categorize a 0-1 value into low/medium/high labels."""
        if value < 0.35:
            return labels[0]
        elif value < 0.65:
            return labels[1]
        else:
            return labels[2]

    def similarity(self, user1_tracks: List[str], user2_tracks: List[str]) -> Optional[float]:
        """
        Compute basic cosine similarity between two users.
        
        Args:
            user1_tracks: First user's track IDs
            user2_tracks: Second user's track IDs
            
        Returns:
            Similarity score in [0, 1] or None if insufficient data
        """
        u1 = self._build_user_vector(user1_tracks, weighted=False)
        u2 = self._build_user_vector(user2_tracks, weighted=False)

        if u1 is None or u2 is None:
            return None

        # Cosine similarity
        dot = float(np.dot(u1, u2))
        norm1 = float(np.linalg.norm(u1))
        norm2 = float(np.linalg.norm(u2))

        if norm1 == 0 or norm2 == 0:
            return None

        return dot / (norm1 * norm2)

    def enhanced_similarity(
        self, 
        user1_tracks: List[str], 
        user2_tracks: List[str]
    ) -> Dict:
        """
        Compute enhanced similarity with multiple metrics.
        
        Returns:
            Dict containing:
            - audio_similarity: Weighted cosine similarity (0-100)
            - mood_similarity: Mood profile correlation (0-100)
            - personality_match: How well personalities align
            - overall: Combined score (0-100)
            - breakdown: Component scores
        """
        result = {
            "audio_similarity": None,
            "mood_similarity": None,
            "personality_match": None,
            "overall": 0,
            "breakdown": {},
            "user1_mood_profile": None,
            "user2_mood_profile": None,
        }
        
        components = []
        weights = []
        
        # 1. Weighted audio feature similarity
        u1_weighted = self._build_user_vector(user1_tracks, weighted=True)
        u2_weighted = self._build_user_vector(user2_tracks, weighted=True)
        
        if u1_weighted is not None and u2_weighted is not None:
            dot = float(np.dot(u1_weighted, u2_weighted))
            norm1 = float(np.linalg.norm(u1_weighted))
            norm2 = float(np.linalg.norm(u2_weighted))
            
            if norm1 > 0 and norm2 > 0:
                audio_sim = (dot / (norm1 * norm2) + 1) / 2 * 100  # Scale to 0-100
                result["audio_similarity"] = round(audio_sim, 1)
                components.append(audio_sim)
                weights.append(0.4)  # 40% weight
                result["breakdown"]["audio"] = round(audio_sim, 1)
        
        # 2. Mood profile similarity
        mood1 = self._build_mood_profile(user1_tracks)
        mood2 = self._build_mood_profile(user2_tracks)
        
        if mood1 is not None and mood2 is not None:
            # Cosine similarity of mood profiles
            dot = float(np.dot(mood1, mood2))
            norm1 = float(np.linalg.norm(mood1))
            norm2 = float(np.linalg.norm(mood2))
            
            if norm1 > 0 and norm2 > 0:
                mood_sim = (dot / (norm1 * norm2)) * 100
                result["mood_similarity"] = round(mood_sim, 1)
                components.append(mood_sim)
                weights.append(0.4)  # 40% weight
                result["breakdown"]["mood"] = round(mood_sim, 1)
            
            # Include mood profiles in response
            result["user1_mood_profile"] = {
                MOOD_CATEGORIES[i]: round(mood1[i] * 100, 1) 
                for i in range(len(MOOD_CATEGORIES))
            }
            result["user2_mood_profile"] = {
                MOOD_CATEGORIES[i]: round(mood2[i] * 100, 1) 
                for i in range(len(MOOD_CATEGORIES))
            }
        
        # 3. Personality trait matching
        pers1 = self.get_music_personality(user1_tracks)
        pers2 = self.get_music_personality(user2_tracks)
        
        if pers1 and pers2:
            # Count matching traits
            trait_keys = ["energy_level", "mood_preference", "production_style", 
                         "vocal_preference", "dance_factor", "tempo_preference"]
            matches = sum(1 for k in trait_keys if pers1.get(k) == pers2.get(k))
            personality_sim = (matches / len(trait_keys)) * 100
            result["personality_match"] = round(personality_sim, 1)
            components.append(personality_sim)
            weights.append(0.2)  # 20% weight
            result["breakdown"]["personality"] = round(personality_sim, 1)
        
        # Calculate weighted overall score
        if components:
            total_weight = sum(weights[:len(components)])
            result["overall"] = round(
                sum(c * w for c, w in zip(components, weights)) / total_weight, 
                1
            )
        
        return result
