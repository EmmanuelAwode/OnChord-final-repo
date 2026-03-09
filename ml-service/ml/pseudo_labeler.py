# ml-service/ml/pseudo_labeler.py
"""
Pseudo-Label Generation Module

This module generates training labels for the mood classification task
using the existing rule-based heuristic system.

Methodology:
-----------
Since the Spotify dataset does not contain ground-truth mood labels,
we use a "pseudo-labeling" or "knowledge distillation" approach:

1. Apply the rule-based mood scoring system to each track
2. Assign the dominant mood as the pseudo-label
3. Use these labels to train a supervised ML classifier

Justification for Pseudo-Labeling:
---------------------------------
- The rule-based system encodes expert domain knowledge about how
  audio features relate to perceived mood
- This transfers human musical intuition into training data
- The ML model can learn complex feature interactions that
  the linear rule-based system cannot capture
- Once trained, the ML model generalizes better than fixed rules

Bias Considerations:
-------------------
- Pseudo-labels inherit biases from the rule-based system
- The ML model may amplify these biases
- Mitigation: Use confidence thresholding to filter uncertain labels
- Future work: Collect human-annotated validation set

Author: OnChord ML Team
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from tqdm import tqdm
import warnings

warnings.filterwarnings('ignore')

# Mood categories and colors
MOOD_CATEGORIES = [
    "Aggressive",
    "Chill",
    "Hype",
    "Melancholic",
    "Happy",
    "Focus",
    "Party",
]

MOOD_TO_INDEX = {mood: idx for idx, mood in enumerate(MOOD_CATEGORIES)}
INDEX_TO_MOOD = {idx: mood for mood, idx in MOOD_TO_INDEX.items()}


def compute_mood_scores(features: Dict[str, float]) -> Dict[str, float]:
    """
    Compute mood scores using the rule-based formula system.
    
    This function implements the original heuristic scoring that will
    be used to generate pseudo-labels for ML training.
    
    Args:
        features: Dictionary with audio feature values
        
    Returns:
        Dictionary mapping mood categories to raw scores
    """
    # Extract features with defaults
    energy = features.get("energy", 0.5)
    valence = features.get("valence", 0.5)
    danceability = features.get("danceability", 0.5)
    tempo = features.get("tempo", 120)
    acousticness = features.get("acousticness", 0.5)
    instrumentalness = features.get("instrumentalness", 0.5)
    speechiness = features.get("speechiness", 0.5)
    
    # Normalize tempo to 0-1 range (typical range: 60-200 BPM)
    tempo_norm = min(max((tempo - 60) / 140, 0), 1)
    
    # Calculate mood scores using weighted formulas
    scores = {}
    
    # Aggressive: High energy + low valence + high tempo
    scores["Aggressive"] = (
        energy * 0.4 + 
        (1 - valence) * 0.3 + 
        tempo_norm * 0.3
    )
    
    # Chill: Low energy + moderate/high valence + low tempo + high acousticness
    scores["Chill"] = (
        (1 - energy) * 0.3 + 
        valence * 0.2 + 
        (1 - tempo_norm) * 0.25 + 
        acousticness * 0.25
    )
    
    # Hype: High energy + high tempo + high danceability
    scores["Hype"] = (
        energy * 0.35 + 
        tempo_norm * 0.3 + 
        danceability * 0.35
    )
    
    # Melancholic: Low valence + low energy + high acousticness
    scores["Melancholic"] = (
        (1 - valence) * 0.4 + 
        (1 - energy) * 0.3 + 
        acousticness * 0.3
    )
    
    # Happy: High valence + moderate-high energy + high danceability
    scores["Happy"] = (
        valence * 0.4 + 
        energy * 0.25 + 
        danceability * 0.35
    )
    
    # Focus: High instrumentalness + low speechiness + moderate energy
    focus_energy = 1 - abs(energy - 0.5) * 2  # Peak at 0.5
    scores["Focus"] = (
        instrumentalness * 0.35 + 
        (1 - speechiness) * 0.35 + 
        focus_energy * 0.3
    )
    
    # Party: High danceability + high energy + high valence
    scores["Party"] = (
        danceability * 0.35 + 
        energy * 0.35 + 
        valence * 0.3
    )
    
    return scores


def normalize_scores(scores: Dict[str, float]) -> Dict[str, float]:
    """
    Normalize mood scores to sum to 1 (probability distribution).
    
    Args:
        scores: Raw mood scores
        
    Returns:
        Normalized scores (probabilities)
    """
    total = sum(scores.values())
    if total > 0:
        return {mood: score / total for mood, score in scores.items()}
    return {mood: 1/len(scores) for mood in scores}


class PseudoLabeler:
    """
    Generates pseudo-labels for mood classification using rule-based system.
    
    This class implements the pseudo-labeling strategy that enables
    supervised learning without human-annotated ground truth.
    
    Attributes:
        confidence_threshold: Minimum confidence for reliable labels
        mood_categories: List of mood category names
    """
    
    def __init__(self, confidence_threshold: float = 0.0):
        """
        Initialize the pseudo-labeler.
        
        Args:
            confidence_threshold: Minimum probability difference between
                top-1 and top-2 moods for a label to be considered confident.
                Set to 0 to use all labels.
        """
        self.confidence_threshold = confidence_threshold
        self.mood_categories = MOOD_CATEGORIES.copy()
        self.label_distribution = None
        
    def label_single_track(self, features: Dict[str, float]) -> Tuple[str, float, Dict[str, float]]:
        """
        Generate pseudo-label for a single track.
        
        Args:
            features: Audio feature dictionary
            
        Returns:
            Tuple of (dominant_mood, confidence, all_probabilities)
        """
        # Get raw scores
        scores = compute_mood_scores(features)
        
        # Normalize to probabilities
        probs = normalize_scores(scores)
        
        # Find dominant mood
        sorted_moods = sorted(probs.items(), key=lambda x: x[1], reverse=True)
        dominant_mood = sorted_moods[0][0]
        dominant_prob = sorted_moods[0][1]
        
        # Calculate confidence as difference from second place
        second_prob = sorted_moods[1][1] if len(sorted_moods) > 1 else 0
        confidence = dominant_prob - second_prob
        
        return dominant_mood, confidence, probs
    
    def generate_labels(
        self, 
        features_list: List[Dict[str, float]],
        verbose: bool = True
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Generate pseudo-labels for a batch of tracks.
        
        Args:
            features_list: List of feature dictionaries
            verbose: Whether to show progress bar
            
        Returns:
            Tuple of:
                - y_labels: Integer labels (n_samples,)
                - y_probs: Probability distributions (n_samples, n_classes)
                - confidences: Confidence scores (n_samples,)
        """
        n_samples = len(features_list)
        n_classes = len(self.mood_categories)
        
        y_labels = np.zeros(n_samples, dtype=int)
        y_probs = np.zeros((n_samples, n_classes), dtype=float)
        confidences = np.zeros(n_samples, dtype=float)
        
        iterator = tqdm(features_list, desc="Generating pseudo-labels") if verbose else features_list
        
        for i, features in enumerate(iterator):
            mood, conf, probs = self.label_single_track(features)
            
            y_labels[i] = MOOD_TO_INDEX[mood]
            y_probs[i] = [probs.get(m, 0) for m in self.mood_categories]
            confidences[i] = conf
        
        # Store label distribution for analysis
        self.label_distribution = self._compute_distribution(y_labels)
        
        return y_labels, y_probs, confidences
    
    def filter_by_confidence(
        self, 
        X: np.ndarray, 
        y: np.ndarray, 
        confidences: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Filter samples by confidence threshold.
        
        This helps reduce label noise by excluding ambiguous samples.
        
        Args:
            X: Feature matrix
            y: Label array
            confidences: Confidence scores
            
        Returns:
            Filtered X, y, and mask of kept samples
        """
        mask = confidences >= self.confidence_threshold
        kept = mask.sum()
        total = len(mask)
        
        print(f"[PseudoLabeler] Keeping {kept}/{total} samples "
              f"({kept/total*100:.1f}%) with confidence >= {self.confidence_threshold}")
        
        return X[mask], y[mask], mask
    
    def _compute_distribution(self, y: np.ndarray) -> Dict[str, int]:
        """Compute label distribution."""
        unique, counts = np.unique(y, return_counts=True)
        return {
            INDEX_TO_MOOD[idx]: count 
            for idx, count in zip(unique, counts)
        }
    
    def get_distribution_report(self) -> str:
        """Generate a report of label distribution."""
        if self.label_distribution is None:
            return "No labels generated yet."
        
        total = sum(self.label_distribution.values())
        lines = ["Pseudo-Label Distribution:", "-" * 30]
        
        for mood in self.mood_categories:
            count = self.label_distribution.get(mood, 0)
            pct = count / total * 100 if total > 0 else 0
            bar = "█" * int(pct / 2)
            lines.append(f"{mood:12} {count:6,} ({pct:5.1f}%) {bar}")
        
        lines.append("-" * 30)
        lines.append(f"Total: {total:,}")
        
        return "\n".join(lines)


def analyze_label_quality(
    y_probs: np.ndarray, 
    confidences: np.ndarray
) -> Dict:
    """
    Analyze the quality of pseudo-labels.
    
    Args:
        y_probs: Probability distributions
        confidences: Confidence scores
        
    Returns:
        Dictionary with quality metrics
    """
    metrics = {
        "mean_confidence": float(np.mean(confidences)),
        "std_confidence": float(np.std(confidences)),
        "min_confidence": float(np.min(confidences)),
        "max_confidence": float(np.max(confidences)),
        "high_confidence_pct": float((confidences > 0.1).mean() * 100),
        "mean_entropy": float(-np.sum(y_probs * np.log(y_probs + 1e-10), axis=1).mean()),
    }
    
    return metrics


if __name__ == "__main__":
    # Demo usage
    test_features = [
        {"energy": 0.9, "valence": 0.3, "danceability": 0.7, "tempo": 140,
         "acousticness": 0.1, "instrumentalness": 0.0, "speechiness": 0.2, "liveness": 0.3},
        {"energy": 0.2, "valence": 0.7, "danceability": 0.3, "tempo": 80,
         "acousticness": 0.8, "instrumentalness": 0.1, "speechiness": 0.1, "liveness": 0.1},
        {"energy": 0.8, "valence": 0.8, "danceability": 0.9, "tempo": 125,
         "acousticness": 0.2, "instrumentalness": 0.0, "speechiness": 0.1, "liveness": 0.2},
    ]
    
    labeler = PseudoLabeler()
    y_labels, y_probs, confidences = labeler.generate_labels(test_features, verbose=False)
    
    print("Test tracks labeled:")
    for i, (label, conf) in enumerate(zip(y_labels, confidences)):
        print(f"  Track {i+1}: {INDEX_TO_MOOD[label]} (confidence: {conf:.3f})")
    
    print(f"\n{labeler.get_distribution_report()}")
