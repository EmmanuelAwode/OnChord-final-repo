# app/mood_classifier.py
"""
Mood Classifier using Spotify Audio Features

NOTE: Due to Spotify API restrictions for development applications, playlist
track data and audio features endpoints are inaccessible. Instead, this system
analyzes the user's TOP 50 TRACKS (via /v1/me/top/tracks) to determine their
overall music mood profile. This provides a representative sample of the user's
listening preferences while working within API limitations.

Data Source:
- Primary: User's top 50 tracks from Spotify (short_term, medium_term, or long_term)
- Fallback: Genre-based mood mapping from user's top artists

Mood categories:
- Energetic/Hype: High energy, high tempo, high danceability
- Chill/Relaxed: Low energy, high valence, low tempo
- Melancholic/Sad: Low valence, low energy
- Aggressive/Intense: High energy, low valence, high tempo
- Happy/Upbeat: High valence, high danceability
- Focus/Study: Low speechiness, moderate energy, high instrumentalness
- Party: High danceability, high energy, high valence
"""

import logging
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from pathlib import Path
from typing import List, Dict, Optional
import os

logger = logging.getLogger(__name__)

# Audio feature columns from Spotify
AUDIO_FEATURES = [
    "danceability",
    "energy", 
    "valence",
    "acousticness",
    "instrumentalness",
    "liveness",
    "speechiness",
    "tempo",
]

# Mood categories
MOOD_CATEGORIES = [
    "Aggressive",
    "Chill", 
    "Hype",
    "Melancholic",
    "Happy",
    "Focus",
    "Party",
]

# Color mapping for frontend
MOOD_COLORS = {
    "Aggressive": "#EF4444",  # Red
    "Chill": "#A78BFA",       # Purple
    "Hype": "#F59E0B",        # Orange
    "Melancholic": "#6B7280", # Gray
    "Happy": "#10B981",       # Green
    "Focus": "#3B82F6",       # Blue
    "Party": "#EC4899",       # Pink
}


def classify_mood_rules(features: Dict[str, float]) -> str:
    """
    Rule-based mood classification using audio features.
    Returns the dominant mood based on feature thresholds.
    """
    energy = features.get("energy", 0.5)
    valence = features.get("valence", 0.5)
    danceability = features.get("danceability", 0.5)
    tempo = features.get("tempo", 120)
    acousticness = features.get("acousticness", 0.5)
    instrumentalness = features.get("instrumentalness", 0.5)
    speechiness = features.get("speechiness", 0.5)
    
    # Normalize tempo to 0-1 range (typical range: 60-200 BPM)
    tempo_norm = min(max((tempo - 60) / 140, 0), 1)
    
    # Calculate mood scores
    scores = {}
    
    # Aggressive: High energy + low valence + high tempo
    scores["Aggressive"] = (energy * 0.4 + (1 - valence) * 0.3 + tempo_norm * 0.3) * 100
    
    # Chill: Low energy + moderate/high valence + low tempo + high acousticness
    scores["Chill"] = ((1 - energy) * 0.3 + valence * 0.2 + (1 - tempo_norm) * 0.25 + acousticness * 0.25) * 100
    
    # Hype: High energy + high tempo + high danceability
    scores["Hype"] = (energy * 0.35 + tempo_norm * 0.3 + danceability * 0.35) * 100
    
    # Melancholic: Low valence + low energy + high acousticness
    scores["Melancholic"] = ((1 - valence) * 0.4 + (1 - energy) * 0.3 + acousticness * 0.3) * 100
    
    # Happy: High valence + moderate-high energy + high danceability
    scores["Happy"] = (valence * 0.4 + energy * 0.25 + danceability * 0.35) * 100
    
    # Focus: High instrumentalness + low speechiness + moderate energy
    focus_energy = 1 - abs(energy - 0.5) * 2  # Peak at 0.5
    scores["Focus"] = (instrumentalness * 0.35 + (1 - speechiness) * 0.35 + focus_energy * 0.3) * 100
    
    # Party: High danceability + high energy + high valence
    scores["Party"] = (danceability * 0.35 + energy * 0.35 + valence * 0.3) * 100
    
    return scores


class MoodClassifier:
    """
    Rule-based mood classifier for playlists using Spotify audio features.
    Uses weighted formulas to score tracks across 7 mood categories.
    
    Note: For ML-based mood classification, see ml/model_loader.py which
    loads the trained RandomForest classifier.
    """
    
    def __init__(self, csv_path: Optional[str] = None):
        self.scaler = StandardScaler()
        self.track_features: Dict[str, np.ndarray] = {}
        self.track_raw_features: Dict[str, Dict[str, float]] = {}
        
        if csv_path and os.path.exists(csv_path):
            self._load_data(csv_path)
    
    def _load_data(self, csv_path: str):
        """Load track features from CSV. Supports multiple dataset formats."""
        logger.info(f"[MoodClassifier] Loading data from: {csv_path}")
        df = pd.read_csv(csv_path, low_memory=False)
        
        # Normalize column names (different datasets use different names)
        column_mapping = {
            # Track ID variations
            'id': 'track_id',
            'track_uri': 'track_id',
            'uri': 'track_id',
            # Audio feature variations  
            'duration': 'duration_ms',
        }
        
        df = df.rename(columns={k: v for k, v in column_mapping.items() if k in df.columns})
        
        # Handle track_id format (some have spotify:track: prefix)
        if 'track_id' in df.columns:
            df['track_id'] = df['track_id'].astype(str).str.replace('spotify:track:', '', regex=False)
        elif 'track_uri' in df.columns:
            df['track_id'] = df['track_uri'].astype(str).str.replace('spotify:track:', '', regex=False)
        
        # Check for required columns
        required_cols = AUDIO_FEATURES + ["track_id"]
        available_features = [c for c in AUDIO_FEATURES if c in df.columns]
        missing = [c for c in required_cols if c not in df.columns]
        
        if 'track_id' not in df.columns:
            logger.error(f"[MoodClassifier] ERROR: No track_id column found. Columns: {list(df.columns)}")
            return
        
        if len(available_features) < 3:
            logger.error(f"[MoodClassifier] ERROR: Not enough audio features. Found: {available_features}")
            return
        
        logger.info(f"[MoodClassifier] Using features: {available_features}")
        
        # Clean data - only drop rows missing the features we have
        df = df.dropna(subset=available_features)
        
        # Store raw features for rule-based classification
        for _, row in df.iterrows():
            track_id = str(row["track_id"])
            self.track_raw_features[track_id] = {
                col: float(row[col]) for col in available_features if col in row
            }
        
        # Scale features for ML model
        X = df[AUDIO_FEATURES].astype(float).values
        X_scaled = self.scaler.fit_transform(X)
        
        for track_id, vec in zip(df["track_id"], X_scaled):
            self.track_features[str(track_id)] = vec
        
        logger.info(f"[MoodClassifier] Loaded {len(self.track_features)} tracks")
    
    def classify_track(self, features: Dict[str, float]) -> Dict[str, float]:
        """
        Classify a single track's mood based on audio features.
        Returns mood scores (percentages).
        """
        return classify_mood_rules(features)
    
    def classify_playlist(
        self, 
        track_features_list: List[Dict[str, float]]
    ) -> Dict:
        """
        Classify a playlist's overall mood by aggregating track features.
        
        Args:
            track_features_list: List of dicts with audio features per track
            
        Returns:
            Dict with mood breakdown, dominant mood, and insights
        """
        if not track_features_list:
            return {
                "moods": [],
                "dominant_mood": None,
                "insights": {},
                "error": "No tracks provided"
            }
        
        # Aggregate features across all tracks
        aggregated = {feat: [] for feat in AUDIO_FEATURES}
        
        for track in track_features_list:
            for feat in AUDIO_FEATURES:
                if feat in track:
                    aggregated[feat].append(track[feat])
        
        # Calculate averages
        avg_features = {
            feat: np.mean(values) if values else 0.5
            for feat, values in aggregated.items()
        }
        
        # Get mood scores
        mood_scores = classify_mood_rules(avg_features)
        
        # Normalize to percentages
        total = sum(mood_scores.values())
        if total > 0:
            mood_percentages = {
                mood: round((score / total) * 100, 1)
                for mood, score in mood_scores.items()
            }
        else:
            mood_percentages = {mood: 0 for mood in MOOD_CATEGORIES}
        
        # Sort by percentage
        sorted_moods = sorted(
            mood_percentages.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        dominant_mood = sorted_moods[0][0] if sorted_moods else None
        
        # Build response
        moods = [
            {
                "mood": mood,
                "percentage": pct,
                "color": MOOD_COLORS.get(mood, "#888888")
            }
            for mood, pct in sorted_moods
        ]
        
        # Generate insights
        insights = self._generate_insights(avg_features, dominant_mood)
        
        return {
            "moods": moods,
            "dominant_mood": dominant_mood,
            "dominant_color": MOOD_COLORS.get(dominant_mood, "#888888"),
            "average_features": avg_features,
            "track_count": len(track_features_list),
            "insights": insights
        }
    
    def classify_by_track_ids(self, track_ids: List[str]) -> Dict:
        """
        Classify playlist mood using track IDs from our database.
        """
        features_list = []
        known_count = 0
        
        for tid in track_ids:
            if tid in self.track_raw_features:
                features_list.append(self.track_raw_features[tid])
                known_count += 1
        
        result = self.classify_playlist(features_list)
        result["tracks_analyzed"] = known_count
        result["tracks_total"] = len(track_ids)
        
        return result
    
    def _generate_insights(
        self, 
        features: Dict[str, float], 
        dominant_mood: str
    ) -> Dict:
        """Generate human-readable insights about the playlist."""
        insights = {}
        
        # Energy insight
        energy = features.get("energy", 0.5)
        if energy > 0.7:
            insights["energy"] = "Your playlist has high energy - great for workouts!"
        elif energy < 0.3:
            insights["energy"] = "This is a low-energy playlist - perfect for relaxation."
        else:
            insights["energy"] = "Moderate energy levels throughout."
        
        # Valence insight
        valence = features.get("valence", 0.5)
        if valence > 0.7:
            insights["mood"] = "Positive vibes! This playlist has an uplifting feel."
        elif valence < 0.3:
            insights["mood"] = "A more introspective, emotional playlist."
        else:
            insights["mood"] = "A balanced mix of emotional tones."
        
        # Danceability insight
        danceability = features.get("danceability", 0.5)
        if danceability > 0.7:
            insights["danceability"] = "High danceability - this playlist will get you moving!"
        elif danceability < 0.3:
            insights["danceability"] = "Not very danceable - better for listening than dancing."
        
        # Acousticness insight
        acousticness = features.get("acousticness", 0.5)
        if acousticness > 0.6:
            insights["sound"] = "Lots of acoustic, organic sounds in this playlist."
        elif acousticness < 0.2:
            insights["sound"] = "Heavily electronic/produced sound profile."
        
        # Tempo insight
        tempo = features.get("tempo", 120)
        if tempo > 140:
            insights["tempo"] = f"Fast tempo (avg {tempo:.0f} BPM) - high intensity!"
        elif tempo < 90:
            insights["tempo"] = f"Slow tempo (avg {tempo:.0f} BPM) - relaxed pace."
        else:
            insights["tempo"] = f"Moderate tempo (avg {tempo:.0f} BPM)."
        
        return insights


# Singleton instance for the app
_classifier_instance: Optional[MoodClassifier] = None

def get_mood_classifier(csv_path: Optional[str] = None) -> MoodClassifier:
    """Get or create the mood classifier singleton."""
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = MoodClassifier(csv_path)
    return _classifier_instance
