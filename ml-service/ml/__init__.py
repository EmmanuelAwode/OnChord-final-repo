# ml-service/ml/__init__.py
"""
OnChord Mood Classification ML Module

This module provides machine learning-based playlist mood classification,
replacing the original rule-based heuristic system with data-driven models.

Architecture:
    - preprocessing.py: Data loading and feature engineering
    - pseudo_labeler.py: Generate training labels from rule-based system
    - train_model.py: Train RandomForest and GradientBoosting classifiers
    - evaluate.py: Model evaluation and comparison metrics
    - model_loader.py: Production model loading for inference

Author: OnChord ML Team
Version: 1.0.0
"""

from .preprocessing import DataPreprocessor
from .pseudo_labeler import PseudoLabeler
from .model_loader import MoodModelLoader

__all__ = [
    "DataPreprocessor",
    "PseudoLabeler", 
    "MoodModelLoader",
]
