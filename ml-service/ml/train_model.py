# ml-service/ml/train_model.py
"""
Model Training Script for Mood Classification

This script trains machine learning classifiers for the mood classification task
using pseudo-labels generated from the rule-based system.

Models Implemented:
------------------
1. RandomForestClassifier (Baseline)
   - Ensemble of decision trees
   - Robust to overfitting
   - Provides feature importance

2. GradientBoostingClassifier (Comparison)
   - Sequential ensemble method
   - Often better accuracy
   - Slower training

Training Pipeline:
-----------------
1. Load and preprocess dataset
2. Generate pseudo-labels using rule-based system
3. Split into train/test sets (80/20)
4. Train both classifiers
5. Evaluate and compare
6. Save best model

Why ML Improves Over Heuristics:
-------------------------------
- Learns non-linear feature interactions
- Adapts to data distribution
- Can capture complex mood boundaries
- More robust to edge cases
- Provides probability calibration

Author: Emmanuel Awode
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, 
    f1_score, 
    classification_report,
    confusion_matrix
)
from pathlib import Path
import joblib
import json
import time
from typing import Dict, Tuple, Optional, Any
from datetime import datetime

from .preprocessing import DataPreprocessor, MOOD_CATEGORIES, AUDIO_FEATURES
from .pseudo_labeler import PseudoLabeler, INDEX_TO_MOOD


class MoodClassifierTrainer:
    """
    Trains and evaluates mood classification models.
    
    This class implements a complete training pipeline from data loading
    through model evaluation and saving.
    
    Attributes:
        preprocessor: DataPreprocessor instance
        labeler: PseudoLabeler instance
        models: Dictionary of trained models
        best_model: The best performing model
    """
    
    def __init__(
        self, 
        confidence_threshold: float = 0.0,
        random_state: int = 42
    ):
        """
        Initialize the trainer.
        
        Args:
            confidence_threshold: Minimum label confidence to include
            random_state: Random seed for reproducibility
        """
        self.preprocessor = DataPreprocessor(scale_features=True)
        self.labeler = PseudoLabeler(confidence_threshold=confidence_threshold)
        self.random_state = random_state
        self.models = {}
        self.best_model = None
        self.best_model_name = None
        self.training_history = {}
        self.feature_importances = {}
        
    def prepare_data(
        self, 
        csv_path: str, 
        sample_size: Optional[int] = None,
        test_size: float = 0.2
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Load data, preprocess, and generate pseudo-labels.
        
        Args:
            csv_path: Path to dataset CSV
            sample_size: Optional sample size for faster training
            test_size: Fraction for test set
            
        Returns:
            Tuple of (X_train, X_test, y_train, y_test)
        """
        print("=" * 60)
        print("STEP 1: Data Preparation")
        print("=" * 60)
        
        # Load and preprocess
        result = self.preprocessor.preprocess_pipeline(csv_path, sample_size)
        X_raw = result['X']
        raw_features = result['raw_features']
        
        print(f"\nDataset size: {len(X_raw):,} tracks")
        
        # Generate pseudo-labels
        print("\nGenerating pseudo-labels from rule-based system...")
        y_labels, y_probs, confidences = self.labeler.generate_labels(raw_features)
        
        print(f"\n{self.labeler.get_distribution_report()}")
        
        # Filter by confidence if threshold set
        if self.labeler.confidence_threshold > 0:
            X_raw, y_labels, mask = self.labeler.filter_by_confidence(
                X_raw, y_labels, confidences
            )
        
        # Scale features
        X_scaled = self.preprocessor.fit_transform(X_raw)
        
        # Train/test split with stratification
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, 
            y_labels,
            test_size=test_size,
            random_state=self.random_state,
            stratify=y_labels
        )
        
        print(f"\nTrain set: {len(X_train):,} samples")
        print(f"Test set:  {len(X_test):,} samples")
        
        return X_train, X_test, y_train, y_test
    
    def prepare_data_multi(
        self, 
        data_dir: str, 
        sample_size: Optional[int] = None,
        test_size: float = 0.2
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Load data from MULTIPLE datasets, preprocess, and generate pseudo-labels.
        
        This method combines all available CSV datasets in the data directory,
        deduplicates by track_id, and prepares for training.
        
        Args:
            data_dir: Path to data directory containing CSV files
            sample_size: Optional sample size for faster training
            test_size: Fraction for test set
            
        Returns:
            Tuple of (X_train, X_test, y_train, y_test)
        """
        print("=" * 60)
        print("STEP 1: Multi-Dataset Preparation")
        print("=" * 60)
        
        # Load and combine all datasets
        combined_df = self.preprocessor.load_multiple_datasets(data_dir, sample_size=None)
        
        # Run preprocessing pipeline from the combined DataFrame
        result = self.preprocessor.preprocess_pipeline_from_df(combined_df, sample_size)
        X_raw = result['X']
        raw_features = result['raw_features']
        
        print(f"\nCombined dataset size: {len(X_raw):,} tracks")
        
        # Generate pseudo-labels
        print("\nGenerating pseudo-labels from rule-based system...")
        y_labels, y_probs, confidences = self.labeler.generate_labels(raw_features)
        
        print(f"\n{self.labeler.get_distribution_report()}")
        
        # Filter by confidence if threshold set
        if self.labeler.confidence_threshold > 0:
            X_raw, y_labels, mask = self.labeler.filter_by_confidence(
                X_raw, y_labels, confidences
            )
        
        # Scale features
        X_scaled = self.preprocessor.fit_transform(X_raw)
        
        # Train/test split with stratification
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, 
            y_labels,
            test_size=test_size,
            random_state=self.random_state,
            stratify=y_labels
        )
        
        print(f"\nTrain set: {len(X_train):,} samples")
        print(f"Test set:  {len(X_test):,} samples")
        
        return X_train, X_test, y_train, y_test
    
    def build_models(self, rf_only: bool = False) -> Dict[str, Any]:
        """
        Build classifier models with tuned hyperparameters.
        
        Args:
            rf_only: If True, only build RandomForest (faster)
        
        Returns:
            Dictionary of model instances
        """
        models = {
            "RandomForest": RandomForestClassifier(
                n_estimators=200,
                max_depth=20,
                min_samples_split=10,
                min_samples_leaf=5,
                max_features='sqrt',
                class_weight='balanced',
                random_state=self.random_state,
                n_jobs=-1,
                verbose=0
            ),
        }
        
        if not rf_only:
            models["GradientBoosting"] = GradientBoostingClassifier(
                n_estimators=150,
                max_depth=8,
                learning_rate=0.1,
                min_samples_split=10,
                min_samples_leaf=5,
                subsample=0.8,
                random_state=self.random_state,
                verbose=0
            )
        
        return models
    
    def train(
        self, 
        X_train: np.ndarray, 
        y_train: np.ndarray,
        X_test: np.ndarray,
        y_test: np.ndarray,
        rf_only: bool = False
    ) -> Dict[str, Dict]:
        """
        Train all models and evaluate.
        
        Args:
            X_train: Training features
            y_train: Training labels
            X_test: Test features
            y_test: Test labels
            rf_only: If True, only train RandomForest
            
        Returns:
            Dictionary with results for each model
        """
        print("\n" + "=" * 60)
        print("STEP 2: Model Training")
        print("=" * 60)
        
        self.models = self.build_models(rf_only=rf_only)
        results = {}
        
        for name, model in self.models.items():
            print(f"\nTraining {name}...")
            start_time = time.time()
            
            # Train
            model.fit(X_train, y_train)
            train_time = time.time() - start_time
            
            # Predict
            y_pred = model.predict(X_test)
            y_proba = model.predict_proba(X_test)
            
            # Metrics
            accuracy = accuracy_score(y_test, y_pred)
            f1_macro = f1_score(y_test, y_pred, average='macro')
            f1_weighted = f1_score(y_test, y_pred, average='weighted')
            
            # Cross-validation
            cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=self.random_state)
            cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='accuracy')
            
            results[name] = {
                'accuracy': accuracy,
                'f1_macro': f1_macro,
                'f1_weighted': f1_weighted,
                'cv_mean': cv_scores.mean(),
                'cv_std': cv_scores.std(),
                'train_time': train_time,
                'y_pred': y_pred,
                'y_proba': y_proba,
            }
            
            # Feature importance
            if hasattr(model, 'feature_importances_'):
                self.feature_importances[name] = dict(zip(
                    self.preprocessor.feature_columns,
                    model.feature_importances_
                ))
            
            print(f"  Accuracy: {accuracy:.4f}")
            print(f"  F1 (macro): {f1_macro:.4f}")
            print(f"  CV Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")
            print(f"  Training time: {train_time:.2f}s")
        
        # Select best model
        best_name = max(results, key=lambda k: results[k]['f1_macro'])
        self.best_model = self.models[best_name]
        self.best_model_name = best_name
        
        print(f"\n✓ Best model: {best_name}")
        
        self.training_history = results
        return results
    
    def get_classification_report(
        self, 
        y_test: np.ndarray, 
        model_name: Optional[str] = None
    ) -> str:
        """
        Generate detailed classification report.
        
        Args:
            y_test: True labels
            model_name: Model to report (default: best model)
            
        Returns:
            Classification report string
        """
        name = model_name or self.best_model_name
        y_pred = self.training_history[name]['y_pred']
        
        return classification_report(
            y_test, 
            y_pred, 
            target_names=MOOD_CATEGORIES,
            digits=4
        )
    
    def get_confusion_matrix(
        self, 
        y_test: np.ndarray,
        model_name: Optional[str] = None
    ) -> np.ndarray:
        """
        Get confusion matrix for a model.
        
        Args:
            y_test: True labels
            model_name: Model to evaluate
            
        Returns:
            Confusion matrix array
        """
        name = model_name or self.best_model_name
        y_pred = self.training_history[name]['y_pred']
        
        return confusion_matrix(y_test, y_pred)
    
    def get_feature_importance_report(self, model_name: Optional[str] = None) -> str:
        """
        Generate feature importance report.
        
        Args:
            model_name: Model to report
            
        Returns:
            Formatted report string
        """
        name = model_name or self.best_model_name
        
        if name not in self.feature_importances:
            return "Feature importance not available for this model."
        
        importances = self.feature_importances[name]
        sorted_features = sorted(importances.items(), key=lambda x: x[1], reverse=True)
        
        lines = [
            f"Feature Importance ({name})",
            "-" * 40
        ]
        
        for feat, imp in sorted_features:
            bar = "█" * int(imp * 50)
            lines.append(f"{feat:18} {imp:.4f} {bar}")
        
        return "\n".join(lines)
    
    def save_model(
        self, 
        output_dir: str,
        model_name: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Save trained model and artifacts.
        
        Args:
            output_dir: Directory to save to
            model_name: Model to save (default: best model)
            
        Returns:
            Dictionary of saved file paths
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        name = model_name or self.best_model_name
        model = self.models[name]
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save model
        model_path = output_path / f"mood_classifier_{name.lower()}.joblib"
        joblib.dump(model, model_path)
        
        # Save scaler
        scaler_path = output_path / "scaler.joblib"
        self.preprocessor.save_scaler(str(scaler_path))
        
        # Save metadata
        metadata = {
            'model_name': name,
            'timestamp': timestamp,
            'features': self.preprocessor.feature_columns,
            'mood_categories': MOOD_CATEGORIES,
            'metrics': {
                'accuracy': self.training_history[name]['accuracy'],
                'f1_macro': self.training_history[name]['f1_macro'],
                'f1_weighted': self.training_history[name]['f1_weighted'],
            },
            'feature_importances': self.feature_importances.get(name, {}),
        }
        
        metadata_path = output_path / "model_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"\n✓ Model saved to: {model_path}")
        print(f"✓ Scaler saved to: {scaler_path}")
        print(f"✓ Metadata saved to: {metadata_path}")
        
        return {
            'model': str(model_path),
            'scaler': str(scaler_path),
            'metadata': str(metadata_path),
        }


def run_training_pipeline(
    csv_path: str,
    output_dir: str,
    sample_size: Optional[int] = None,
    confidence_threshold: float = 0.0,
    rf_only: bool = False
) -> Dict:
    """
    Run the complete training pipeline.
    
    Args:
        csv_path: Path to dataset CSV
        output_dir: Directory to save outputs
        sample_size: Optional sample size
        confidence_threshold: Minimum label confidence
        rf_only: If True, only train RandomForest (faster)
        
    Returns:
        Dictionary with training results
    """
    print("=" * 60)
    print("OnChord Mood Classification - ML Training Pipeline")
    print("=" * 60)
    print(f"Dataset: {csv_path}")
    print(f"Output: {output_dir}")
    if sample_size:
        print(f"Sample size: {sample_size:,}")
    if rf_only:
        print("Mode: RandomForest only (fast)")
    print()
    
    # Initialize trainer
    trainer = MoodClassifierTrainer(
        confidence_threshold=confidence_threshold
    )
    
    # Prepare data
    X_train, X_test, y_train, y_test = trainer.prepare_data(
        csv_path, 
        sample_size=sample_size
    )
    
    # Train models
    results = trainer.train(X_train, y_train, X_test, y_test, rf_only=rf_only)
    
    # Print reports
    print("\n" + "=" * 60)
    print("STEP 3: Evaluation")
    print("=" * 60)
    
    print(f"\nClassification Report ({trainer.best_model_name}):")
    print(trainer.get_classification_report(y_test))
    
    print(f"\n{trainer.get_feature_importance_report()}")
    
    print("\nConfusion Matrix:")
    cm = trainer.get_confusion_matrix(y_test)
    print(pd.DataFrame(
        cm,
        index=MOOD_CATEGORIES,
        columns=MOOD_CATEGORIES
    ))
    
    # Save model
    print("\n" + "=" * 60)
    print("STEP 4: Save Model")
    print("=" * 60)
    
    saved_paths = trainer.save_model(output_dir)
    
    print("\n" + "=" * 60)
    print("Training Complete!")
    print("=" * 60)
    
    return {
        'trainer': trainer,
        'results': results,
        'saved_paths': saved_paths,
    }


def run_training_pipeline_multi(
    data_dir: str,
    output_dir: str,
    sample_size: Optional[int] = None,
    confidence_threshold: float = 0.0,
    rf_only: bool = False
) -> Dict:
    """
    Run the complete training pipeline using multiple combined datasets.
    
    This loads ALL CSV files in data_dir, combines them (deduplicates by track_id),
    and trains the mood classifier on the combined dataset.
    
    Args:
        data_dir: Path to directory containing CSV datasets
        output_dir: Directory to save outputs
        sample_size: Optional sample size
        confidence_threshold: Minimum label confidence
        rf_only: If True, only train RandomForest (faster)
        
    Returns:
        Dictionary with training results
    """
    print("=" * 60)
    print("OnChord Mood Classification - MULTI-DATASET Training")
    print("=" * 60)
    print(f"Data Directory: {data_dir}")
    print(f"Output: {output_dir}")
    if sample_size:
        print(f"Sample size: {sample_size:,}")
    if rf_only:
        print("Mode: RandomForest only (fast)")
    print()
    
    # Initialize trainer
    trainer = MoodClassifierTrainer(
        confidence_threshold=confidence_threshold
    )
    
    # Prepare data from multiple datasets
    X_train, X_test, y_train, y_test = trainer.prepare_data_multi(
        data_dir, 
        sample_size=sample_size
    )
    
    # Train models
    results = trainer.train(X_train, y_train, X_test, y_test, rf_only=rf_only)
    
    # Print reports
    print("\n" + "=" * 60)
    print("STEP 3: Evaluation")
    print("=" * 60)
    
    print(f"\nClassification Report ({trainer.best_model_name}):")
    print(trainer.get_classification_report(y_test))
    
    print(f"\n{trainer.get_feature_importance_report()}")
    
    print("\nConfusion Matrix:")
    cm = trainer.get_confusion_matrix(y_test)
    print(pd.DataFrame(
        cm,
        index=MOOD_CATEGORIES,
        columns=MOOD_CATEGORIES
    ))
    
    # Save model
    print("\n" + "=" * 60)
    print("STEP 4: Save Model")
    print("=" * 60)
    
    saved_paths = trainer.save_model(output_dir)
    
    print("\n" + "=" * 60)
    print("Multi-Dataset Training Complete!")
    print("=" * 60)
    
    return {
        'trainer': trainer,
        'results': results,
        'saved_paths': saved_paths,
    }


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Train mood classification model")
    parser.add_argument(
        "--csv", 
        type=str,
        default="data/tracks_features.csv",
        help="Path to dataset CSV"
    )
    parser.add_argument(
        "--output", 
        type=str,
        default="models",
        help="Output directory for models"
    )
    parser.add_argument(
        "--sample", 
        type=int,
        default=None,
        help="Sample size for faster training"
    )
    parser.add_argument(
        "--confidence", 
        type=float,
        default=0.0,
        help="Minimum label confidence threshold"
    )
    
    args = parser.parse_args()
    
    # Resolve paths relative to ml-service directory
    base_dir = Path(__file__).parent.parent
    csv_path = base_dir / args.csv
    output_dir = base_dir / args.output
    
    run_training_pipeline(
        str(csv_path),
        str(output_dir),
        sample_size=args.sample,
        confidence_threshold=args.confidence
    )
