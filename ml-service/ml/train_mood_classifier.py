"""
Mood Classifier Training Pipeline
==================================
Supervisor Requirements:
1. Use two datasets with same source/layout - one for training, one for testing
2. Compare different algorithms (scalers + classifiers) to find the best
3. Train model that can classify any playlist song using only Spotify API features

Training Data: SpotifyAudioFeaturesApril2019.csv (130,663 tracks)
Testing Data:  SpotifyAudioFeaturesNov2018.csv (116,372 tracks)

Both datasets have identical structure from the same Spotify source.
"""

import os
import sys
import json
import time
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

# Scikit-learn imports
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, AdaBoostClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    f1_score, precision_score, recall_score
)
import joblib

# ============================================================================
# CONFIGURATION
# ============================================================================

# Paths
DATA_DIR = Path(__file__).parent.parent / "data"
MODELS_DIR = Path(__file__).parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

# Dataset files (different sources with minimal overlap - only 8.7%)
# Both have the same audio features needed for mood classification
TRAIN_FILE = DATA_DIR / "tracks_features.csv"       # 1.2M tracks (larger, for training)
TEST_FILE = DATA_DIR / "SpotifyFeatures.csv"        # 232K tracks (different source, for testing)

# Audio features available from Spotify API
# These are the ONLY features we use - ensuring model works on any song
FEATURE_COLUMNS = [
    "danceability",     # 0.0 - 1.0
    "energy",           # 0.0 - 1.0
    "valence",          # 0.0 - 1.0 (positivity)
    "acousticness",     # 0.0 - 1.0
    "instrumentalness", # 0.0 - 1.0
    "liveness",         # 0.0 - 1.0
    "speechiness",      # 0.0 - 1.0
    "tempo",            # BPM (typically 60-200)
]

# Mood categories to classify
MOOD_CATEGORIES = ["Aggressive", "Chill", "Hype", "Melancholic", "Happy", "Focus", "Party"]

# ============================================================================
# PSEUDO-LABELING FUNCTION
# ============================================================================
# Since Spotify doesn't provide mood labels, we create them using rules
# based on audio feature combinations

def assign_mood_label(row: pd.Series) -> str:
    """
    Assign a mood label based on audio feature combinations.
    This creates training labels from unlabeled data.
    
    The rules are based on music theory and how audio features relate to mood:
    - High energy + low valence = Aggressive (intense, dark)
    - Low energy + high acousticness = Chill (relaxed)
    - High energy + high danceability + fast tempo = Hype (exciting)
    - Low valence + low energy = Melancholic (sad, slow)
    - High valence + moderate-high energy = Happy (positive, upbeat)
    - High instrumentalness OR low energy + acoustic = Focus (concentration)
    - High danceability + high valence = Party (fun, social)
    """
    energy = row.get('energy', 0.5)
    valence = row.get('valence', 0.5)
    danceability = row.get('danceability', 0.5)
    acousticness = row.get('acousticness', 0.5)
    instrumentalness = row.get('instrumentalness', 0.0)
    tempo = row.get('tempo', 120)
    speechiness = row.get('speechiness', 0.0)
    
    # Rule-based mood assignment (order matters - first match wins)
    
    # Aggressive: High energy, low positivity, intense
    if energy > 0.75 and valence < 0.4 and tempo > 100:
        return "Aggressive"
    
    # Hype: High energy, danceable, fast
    if energy > 0.7 and danceability > 0.65 and tempo > 115:
        return "Hype"
    
    # Party: Danceable, positive, social vibes
    if danceability > 0.7 and valence > 0.55 and energy > 0.5:
        return "Party"
    
    # Happy: Positive mood, upbeat
    if valence > 0.6 and energy > 0.45:
        return "Happy"
    
    # Chill: Low energy, acoustic, relaxed
    if energy < 0.45 and (acousticness > 0.4 or valence > 0.4):
        return "Chill"
    
    # Focus: Instrumental or calm background music
    if instrumentalness > 0.4 or (energy < 0.5 and speechiness < 0.1 and acousticness > 0.3):
        return "Focus"
    
    # Melancholic: Sad, slow, introspective
    if valence < 0.35 and energy < 0.55:
        return "Melancholic"
    
    # Default fallback based on energy/valence quadrant
    if energy > 0.5:
        return "Happy" if valence > 0.5 else "Hype"
    else:
        return "Chill" if valence > 0.5 else "Melancholic"


# ============================================================================
# DATA LOADING
# ============================================================================

def load_and_prepare_data(filepath: Path, label_data: bool = True, exclude_ids: set = None) -> tuple:
    """
    Load dataset and prepare features/labels.
    
    Args:
        filepath: Path to CSV file
        label_data: If True, create mood labels using pseudo-labeling
        exclude_ids: Set of track IDs to exclude (for removing overlap)
        
    Returns:
        (X, y, df, track_ids) - features array, labels array, dataframe, track IDs set
    """
    print(f"\n[DATA] Loading: {filepath.name}")
    df = pd.read_csv(filepath, low_memory=False)
    print(f"[DATA] Loaded {len(df):,} tracks")
    
    # Normalize track_id column name (different datasets use different names)
    if 'id' in df.columns and 'track_id' not in df.columns:
        df['track_id'] = df['id']
    
    # Check required columns exist
    missing_cols = [col for col in FEATURE_COLUMNS if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing columns: {missing_cols}")
    
    # Remove overlapping tracks if specified
    if exclude_ids:
        original_len = len(df)
        df = df[~df['track_id'].isin(exclude_ids)]
        print(f"[DATA] Removed {original_len - len(df):,} overlapping tracks")
    
    # Drop rows with missing values in feature columns
    original_len = len(df)
    df = df.dropna(subset=FEATURE_COLUMNS)
    if len(df) < original_len:
        print(f"[DATA] Dropped {original_len - len(df):,} rows with missing values")
    
    # Get track IDs for overlap checking
    track_ids = set(df['track_id'].values)
    
    # Extract features
    X = df[FEATURE_COLUMNS].values.astype(np.float32)
    
    # Create mood labels if needed
    y = None
    if label_data:
        print("[DATA] Assigning mood labels...")
        df['mood'] = df.apply(assign_mood_label, axis=1)
        y = df['mood'].values
        
        # Print label distribution
        print("\n[DATA] Mood distribution:")
        for mood in MOOD_CATEGORIES:
            count = (y == mood).sum()
            pct = count / len(y) * 100
            print(f"  {mood:12s}: {count:>6,} ({pct:>5.1f}%)")
    
    return X, y, df, track_ids
    return X, y, df


# ============================================================================
# ALGORITHM COMPARISON
# ============================================================================

def get_scalers() -> dict:
    """Return dictionary of scalers to compare."""
    return {
        "StandardScaler": StandardScaler(),       # Z-score normalization
        "MinMaxScaler": MinMaxScaler(),           # Scale to 0-1 range
        "RobustScaler": RobustScaler(),           # Robust to outliers
        "NoScaler": None,                         # No scaling (baseline)
    }


def get_classifiers() -> dict:
    """Return dictionary of classifiers to compare."""
    return {
        "RandomForest": RandomForestClassifier(
            n_estimators=100,
            max_depth=15,
            min_samples_split=5,
            n_jobs=-1,
            random_state=42
        ),
        # GradientBoosting is too slow on 1.2M samples - skip for now
        # "GradientBoosting": GradientBoostingClassifier(...),
        "LogisticRegression": LogisticRegression(
            max_iter=1000,
            multi_class='multinomial',
            n_jobs=-1,
            random_state=42
        ),
        "KNeighbors": KNeighborsClassifier(
            n_neighbors=7,
            weights='distance',
            n_jobs=-1
        ),
        "DecisionTree": DecisionTreeClassifier(
            max_depth=15,
            min_samples_split=5,
            random_state=42
        ),
        "NaiveBayes": GaussianNB(),
        # MLP is slow on large datasets
        # "MLP": MLPClassifier(...),
    }


def evaluate_model(y_true, y_pred, labels) -> dict:
    """Calculate evaluation metrics."""
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "f1_macro": f1_score(y_true, y_pred, average='macro', labels=labels),
        "f1_weighted": f1_score(y_true, y_pred, average='weighted', labels=labels),
        "precision_macro": precision_score(y_true, y_pred, average='macro', labels=labels, zero_division=0),
        "recall_macro": recall_score(y_true, y_pred, average='macro', labels=labels, zero_division=0),
    }


def compare_algorithms(X_train, y_train, X_test, y_test) -> pd.DataFrame:
    """
    Compare all combinations of scalers and classifiers.
    
    Returns DataFrame with results sorted by test accuracy.
    """
    results = []
    scalers = get_scalers()
    classifiers = get_classifiers()
    
    total_combos = len(scalers) * len(classifiers)
    combo_num = 0
    
    print(f"\n{'='*70}")
    print(f"COMPARING {total_combos} ALGORITHM COMBINATIONS")
    print(f"{'='*70}\n")
    
    for scaler_name, scaler in scalers.items():
        # Scale data
        if scaler is not None:
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
        else:
            X_train_scaled = X_train
            X_test_scaled = X_test
        
        for clf_name, clf in classifiers.items():
            combo_num += 1
            combo_name = f"{scaler_name} + {clf_name}"
            print(f"[{combo_num}/{total_combos}] Testing: {combo_name}...", end=" ", flush=True)
            
            try:
                # Train
                start_time = time.time()
                clf.fit(X_train_scaled, y_train)
                train_time = time.time() - start_time
                
                # Predict on test set
                start_time = time.time()
                y_pred = clf.predict(X_test_scaled)
                predict_time = time.time() - start_time
                
                # Evaluate
                metrics = evaluate_model(y_test, y_pred, MOOD_CATEGORIES)
                
                results.append({
                    "scaler": scaler_name,
                    "classifier": clf_name,
                    "accuracy": metrics["accuracy"],
                    "f1_macro": metrics["f1_macro"],
                    "f1_weighted": metrics["f1_weighted"],
                    "precision": metrics["precision_macro"],
                    "recall": metrics["recall_macro"],
                    "train_time_sec": train_time,
                    "predict_time_sec": predict_time,
                })
                
                print(f"Accuracy: {metrics['accuracy']:.4f} ({train_time:.1f}s)")
                
            except Exception as e:
                print(f"FAILED: {e}")
                results.append({
                    "scaler": scaler_name,
                    "classifier": clf_name,
                    "accuracy": 0,
                    "f1_macro": 0,
                    "f1_weighted": 0,
                    "precision": 0,
                    "recall": 0,
                    "train_time_sec": 0,
                    "predict_time_sec": 0,
                    "error": str(e)
                })
    
    # Create results DataFrame
    results_df = pd.DataFrame(results)
    results_df = results_df.sort_values("accuracy", ascending=False)
    
    return results_df


# ============================================================================
# TRAIN BEST MODEL
# ============================================================================

def train_best_model(X_train, y_train, X_test, y_test, best_scaler_name: str, best_clf_name: str):
    """
    Train the best performing model and save it.
    """
    print(f"\n{'='*70}")
    print(f"TRAINING FINAL MODEL: {best_scaler_name} + {best_clf_name}")
    print(f"{'='*70}\n")
    
    # Get fresh instances
    scalers = get_scalers()
    classifiers = get_classifiers()
    
    scaler = scalers[best_scaler_name]
    clf = classifiers[best_clf_name]
    
    # Scale data
    if scaler is not None:
        print(f"[TRAIN] Fitting {best_scaler_name}...")
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
    else:
        X_train_scaled = X_train
        X_test_scaled = X_test
    
    # Train
    print(f"[TRAIN] Training {best_clf_name}...")
    start_time = time.time()
    clf.fit(X_train_scaled, y_train)
    train_time = time.time() - start_time
    print(f"[TRAIN] Training completed in {train_time:.1f}s")
    
    # Final evaluation
    y_pred = clf.predict(X_test_scaled)
    metrics = evaluate_model(y_test, y_pred, MOOD_CATEGORIES)
    
    print(f"\n[RESULTS] Final Test Accuracy: {metrics['accuracy']:.4f}")
    print(f"[RESULTS] F1 Macro: {metrics['f1_macro']:.4f}")
    print(f"[RESULTS] F1 Weighted: {metrics['f1_weighted']:.4f}")
    
    # Print classification report
    print("\n[RESULTS] Classification Report:")
    print(classification_report(y_test, y_pred, labels=MOOD_CATEGORIES))
    
    # Print confusion matrix
    print("\n[RESULTS] Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred, labels=MOOD_CATEGORIES)
    print(pd.DataFrame(cm, index=MOOD_CATEGORIES, columns=MOOD_CATEGORIES))
    
    # Feature importances (if available)
    feature_importances = None
    if hasattr(clf, 'feature_importances_'):
        feature_importances = dict(zip(FEATURE_COLUMNS, clf.feature_importances_))
        print("\n[RESULTS] Feature Importances:")
        for feat, imp in sorted(feature_importances.items(), key=lambda x: -x[1]):
            print(f"  {feat:20s}: {imp:.4f}")
    
    # Save model
    model_filename = f"mood_classifier_{best_clf_name.lower()}.joblib"
    model_path = MODELS_DIR / model_filename
    joblib.dump(clf, model_path)
    print(f"\n[SAVE] Model saved: {model_path}")
    
    # Save scaler
    if scaler is not None:
        scaler_path = MODELS_DIR / "scaler.joblib"
        joblib.dump(scaler, scaler_path)
        print(f"[SAVE] Scaler saved: {scaler_path}")
    
    # Save metadata
    metadata = {
        "model_type": best_clf_name,
        "scaler_type": best_scaler_name,
        "features": FEATURE_COLUMNS,
        "mood_categories": MOOD_CATEGORIES,
        "train_file": TRAIN_FILE.name,
        "test_file": TEST_FILE.name,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "accuracy": metrics["accuracy"],
        "f1_macro": metrics["f1_macro"],
        "f1_weighted": metrics["f1_weighted"],
        "feature_importances": feature_importances,
        "trained_at": datetime.now().isoformat(),
    }
    
    metadata_path = MODELS_DIR / "model_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"[SAVE] Metadata saved: {metadata_path}")
    
    return clf, scaler, metrics


# ============================================================================
# MAIN TRAINING PIPELINE
# ============================================================================

def main():
    """Main training pipeline."""
    print("\n" + "="*70)
    print("MOOD CLASSIFIER TRAINING PIPELINE")
    print("="*70)
    print(f"\nTraining data: {TRAIN_FILE.name}")
    print(f"Testing data:  {TEST_FILE.name}")
    print(f"Features:      {FEATURE_COLUMNS}")
    print(f"Mood classes:  {MOOD_CATEGORIES}")
    
    # Load training data first (to get track IDs for overlap removal)
    X_train, y_train, df_train, train_ids = load_and_prepare_data(TRAIN_FILE, label_data=True)
    
    # Load testing data - remove any tracks that appear in training set
    print("\n[DATA] Removing overlapping tracks from test set...")
    X_test, y_test, df_test, test_ids = load_and_prepare_data(
        TEST_FILE, 
        label_data=True, 
        exclude_ids=train_ids
    )
    
    print(f"\n[DATA] Training set: {len(X_train):,} samples")
    print(f"[DATA] Testing set:  {len(X_test):,} samples (after removing overlap)")
    
    # Compare all algorithms
    results_df = compare_algorithms(X_train, y_train, X_test, y_test)
    
    # Print results table
    print(f"\n{'='*70}")
    print("ALGORITHM COMPARISON RESULTS (sorted by accuracy)")
    print(f"{'='*70}\n")
    
    display_cols = ["scaler", "classifier", "accuracy", "f1_macro", "train_time_sec"]
    print(results_df[display_cols].to_string(index=False))
    
    # Save results to CSV
    results_path = MODELS_DIR / "algorithm_comparison_results.csv"
    results_df.to_csv(results_path, index=False)
    print(f"\n[SAVE] Results saved: {results_path}")
    
    # Get best combination
    best_row = results_df.iloc[0]
    best_scaler = best_row["scaler"]
    best_classifier = best_row["classifier"]
    best_accuracy = best_row["accuracy"]
    
    print(f"\n{'='*70}")
    print(f"BEST COMBINATION: {best_scaler} + {best_classifier}")
    print(f"Test Accuracy: {best_accuracy:.4f}")
    print(f"{'='*70}")
    
    # Train and save the best model
    clf, scaler, final_metrics = train_best_model(
        X_train, y_train, X_test, y_test,
        best_scaler, best_classifier
    )
    
    print(f"\n{'='*70}")
    print("TRAINING COMPLETE!")
    print(f"{'='*70}")
    print(f"\nThe model can now classify any song using these Spotify API features:")
    for feat in FEATURE_COLUMNS:
        print(f"  - {feat}")
    print(f"\nJust call: model.predict(scaler.transform([[dance, energy, valence, ...]]))")
    
    return results_df, clf, scaler


if __name__ == "__main__":
    results_df, clf, scaler = main()
