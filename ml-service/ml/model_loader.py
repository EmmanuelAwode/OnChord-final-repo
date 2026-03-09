# ml-service/ml/model_loader.py
"""
Model Loader Module for Production Inference

This module handles loading trained models and making predictions
in the production FastAPI service.

Features:
---------
- Lazy model loading
- Singleton pattern for efficiency
- Fallback to rule-based system if model unavailable
- Probability aggregation for playlists

Author: OnChord ML Team
"""

import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import joblib
import json
import warnings

warnings.filterwarnings('ignore')

from .preprocessing import AUDIO_FEATURES, MOOD_CATEGORIES
from .pseudo_labeler import compute_mood_scores, normalize_scores, MOOD_TO_INDEX, INDEX_TO_MOOD

# Color mapping for frontend
MOOD_COLORS = {
    "Aggressive": "#EF4444",
    "Chill": "#A78BFA",
    "Hype": "#F59E0B",
    "Melancholic": "#6B7280",
    "Happy": "#10B981",
    "Focus": "#3B82F6",
    "Party": "#EC4899",
}


class MoodModelLoader:
    """
    Loads and manages the trained mood classification model.
    
    Provides a clean interface for making predictions in production,
    with automatic fallback to rule-based system if model unavailable.
    
    Attributes:
        model: Trained classifier model
        scaler: Feature scaler
        metadata: Model metadata (features, metrics, etc.)
        use_ml: Whether ML model is available
    """
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        """Singleton pattern - only one instance."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, model_dir: Optional[str] = None):
        """
        Initialize the model loader.
        
        Args:
            model_dir: Directory containing model files
        """
        if self._initialized:
            return
            
        self.model = None
        self.scaler = None
        self.metadata = None
        self.use_ml = False
        self.feature_columns = AUDIO_FEATURES.copy()
        
        if model_dir:
            self.load_model(model_dir)
        
        self._initialized = True
    
    def load_model(self, model_dir: str) -> bool:
        """
        Load trained model from directory.
        
        Expected files:
        - mood_classifier_*.joblib: Trained model
        - scaler.joblib: Feature scaler
        - model_metadata.json: Metadata
        
        Args:
            model_dir: Directory with model files
            
        Returns:
            True if model loaded successfully
        """
        model_path = Path(model_dir)
        
        if not model_path.exists():
            print(f"[MoodModelLoader] Model directory not found: {model_dir}")
            return False
        
        try:
            # Find model file
            model_files = list(model_path.glob("mood_classifier_*.joblib"))
            if not model_files:
                print("[MoodModelLoader] No model file found")
                return False
            
            # Load model
            self.model = joblib.load(model_files[0])
            print(f"[MoodModelLoader] Loaded model: {model_files[0].name}")
            
            # Load scaler
            scaler_path = model_path / "scaler.joblib"
            if scaler_path.exists():
                self.scaler = joblib.load(scaler_path)
                print("[MoodModelLoader] Loaded scaler")
            
            # Load metadata
            metadata_path = model_path / "model_metadata.json"
            if metadata_path.exists():
                with open(metadata_path) as f:
                    self.metadata = json.load(f)
                self.feature_columns = self.metadata.get('features', AUDIO_FEATURES)
                # Handle both old format (nested in 'metrics') and new format (top level)
                accuracy = self.metadata.get('accuracy') or self.metadata.get('metrics', {}).get('accuracy', 'N/A')
                print(f"[MoodModelLoader] Model accuracy: {accuracy}")
            
            self.use_ml = True
            return True
            
        except Exception as e:
            print(f"[MoodModelLoader] Error loading model: {e}")
            self.use_ml = False
            return False
    
    def _prepare_features(self, features: Dict[str, float]) -> np.ndarray:
        """
        Prepare features for model input.
        
        Args:
            features: Audio feature dictionary
            
        Returns:
            Feature vector as numpy array
        """
        # Extract features in expected order
        X = np.array([
            features.get(col, 0.5) 
            for col in self.feature_columns
        ]).reshape(1, -1)
        
        # Apply scaling if available
        if self.scaler is not None:
            X = self.scaler.transform(X)
        
        return X
    
    def predict_single(
        self, 
        features: Dict[str, float]
    ) -> Tuple[str, Dict[str, float]]:
        """
        Predict mood for a single track.
        
        Args:
            features: Audio feature dictionary
            
        Returns:
            Tuple of (dominant_mood, probability_dict)
        """
        if self.use_ml and self.model is not None:
            # ML prediction
            X = self._prepare_features(features)
            proba = self.model.predict_proba(X)[0]
            
            # Create probability dictionary
            prob_dict = {
                mood: float(proba[idx])
                for idx, mood in INDEX_TO_MOOD.items()
            }
            
            dominant_mood = max(prob_dict, key=prob_dict.get)
            
        else:
            # Fallback to rule-based
            scores = compute_mood_scores(features)
            prob_dict = normalize_scores(scores)
            dominant_mood = max(prob_dict, key=prob_dict.get)
        
        return dominant_mood, prob_dict
    
    def predict_playlist(
        self, 
        tracks_features: List[Dict[str, float]]
    ) -> Dict:
        """
        Predict mood distribution for a playlist.
        
        Aggregates individual track predictions into a playlist-level
        mood distribution.
        
        Args:
            tracks_features: List of feature dictionaries
            
        Returns:
            Dictionary with mood breakdown and insights
        """
        if not tracks_features:
            return {
                "moods": [],
                "dominant_mood": None,
                "dominant_color": None,
                "insights": {"error": "No tracks provided"},
            }
        
        # Aggregate probabilities across all tracks
        aggregated_probs = {mood: 0.0 for mood in MOOD_CATEGORIES}
        
        for features in tracks_features:
            _, probs = self.predict_single(features)
            for mood, prob in probs.items():
                aggregated_probs[mood] += prob
        
        # Average probabilities
        n_tracks = len(tracks_features)
        averaged_probs = {
            mood: prob / n_tracks 
            for mood, prob in aggregated_probs.items()
        }
        
        # Normalize to sum to 100%
        total = sum(averaged_probs.values())
        mood_percentages = {
            mood: round((prob / total) * 100, 1)
            for mood, prob in averaged_probs.items()
        } if total > 0 else {mood: 0 for mood in MOOD_CATEGORIES}
        
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
        
        # Calculate average features for insights
        avg_features = self._compute_average_features(tracks_features)
        insights = self._generate_insights(avg_features, dominant_mood)
        
        return {
            "moods": moods,
            "dominant_mood": dominant_mood,
            "dominant_color": MOOD_COLORS.get(dominant_mood, "#888888"),
            "average_features": avg_features,
            "track_count": n_tracks,
            "insights": insights,
            "model_type": "ml" if self.use_ml else "rule_based",
        }
    
    def _compute_average_features(
        self, 
        tracks_features: List[Dict[str, float]]
    ) -> Dict[str, float]:
        """Compute average features across tracks."""
        if not tracks_features:
            return {}
        
        aggregated = {feat: [] for feat in AUDIO_FEATURES}
        
        for track in tracks_features:
            for feat in AUDIO_FEATURES:
                if feat in track:
                    aggregated[feat].append(track[feat])
        
        return {
            feat: round(np.mean(values), 3) if values else 0.5
            for feat, values in aggregated.items()
        }
    
    def _generate_insights(
        self, 
        features: Dict[str, float], 
        dominant_mood: str
    ) -> Dict[str, str]:
        """Generate human-readable insights."""
        insights = {}
        
        energy = features.get("energy", 0.5)
        if energy > 0.7:
            insights["energy"] = "High energy playlist - great for workouts!"
        elif energy < 0.3:
            insights["energy"] = "Low-energy playlist - perfect for relaxation."
        else:
            insights["energy"] = "Moderate energy levels throughout."
        
        valence = features.get("valence", 0.5)
        if valence > 0.7:
            insights["mood"] = "Positive vibes! This playlist has an uplifting feel."
        elif valence < 0.3:
            insights["mood"] = "A more introspective, emotional playlist."
        else:
            insights["mood"] = "A balanced mix of emotional tones."
        
        danceability = features.get("danceability", 0.5)
        if danceability > 0.7:
            insights["danceability"] = "Highly danceable - will get you moving!"
        elif danceability < 0.3:
            insights["danceability"] = "Not very danceable - better for listening."
        
        tempo = features.get("tempo", 120)
        if tempo > 140:
            insights["tempo"] = f"Fast tempo (avg {tempo:.0f} BPM) - high intensity!"
        elif tempo < 90:
            insights["tempo"] = f"Slow tempo (avg {tempo:.0f} BPM) - relaxed pace."
        else:
            insights["tempo"] = f"Moderate tempo (avg {tempo:.0f} BPM)."
        
        return insights


# Global instance for the application
_model_instance: Optional[MoodModelLoader] = None


def get_mood_model(model_dir: Optional[str] = None) -> MoodModelLoader:
    """
    Get or create the mood model singleton.
    
    Args:
        model_dir: Directory with model files
        
    Returns:
        MoodModelLoader instance
    """
    global _model_instance
    
    if _model_instance is None:
        _model_instance = MoodModelLoader(model_dir)
    elif model_dir and not _model_instance.use_ml:
        # Try loading again if not already loaded
        _model_instance.load_model(model_dir)
    
    return _model_instance


def reset_model_instance():
    """Reset the singleton (for testing)."""
    global _model_instance
    _model_instance = None
    MoodModelLoader._instance = None


if __name__ == "__main__":
    # Demo usage
    test_features = [
        {"energy": 0.9, "valence": 0.8, "danceability": 0.85, "tempo": 128,
         "acousticness": 0.1, "instrumentalness": 0.0, "speechiness": 0.1, "liveness": 0.2},
        {"energy": 0.3, "valence": 0.6, "danceability": 0.4, "tempo": 85,
         "acousticness": 0.7, "instrumentalness": 0.2, "speechiness": 0.05, "liveness": 0.1},
    ]
    
    loader = MoodModelLoader()
    result = loader.predict_playlist(test_features)
    
    print("Playlist Mood Classification:")
    print(f"  Dominant: {result['dominant_mood']}")
    print(f"  Model: {result['model_type']}")
    print(f"  Moods:")
    for m in result['moods'][:3]:
        print(f"    {m['mood']}: {m['percentage']}%")
