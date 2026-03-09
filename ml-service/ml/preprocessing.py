# ml-service/ml/preprocessing.py
"""
Data Preprocessing Module for Mood Classification

This module handles:
1. Loading the Spotify tracks dataset (1.2M tracks)
2. Feature extraction and normalization
3. Handling missing values and outliers
4. Train/test splitting with stratification

Audio Features Used:
    - danceability (0-1): How suitable for dancing
    - energy (0-1): Perceptual intensity
    - valence (0-1): Musical positiveness
    - acousticness (0-1): Acoustic vs electronic
    - instrumentalness (0-1): Vocal vs instrumental
    - liveness (0-1): Audience presence
    - speechiness (0-1): Spoken word presence
    - tempo (BPM): Beats per minute

Author: OnChord ML Team
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from pathlib import Path
from typing import Tuple, Optional, List, Dict
import joblib
import warnings

warnings.filterwarnings('ignore')

# Feature columns from Spotify API
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


class DataPreprocessor:
    """
    Handles data loading, cleaning, and preprocessing for mood classification.
    
    This class implements a complete preprocessing pipeline suitable for
    training machine learning models on Spotify audio features.
    
    Attributes:
        scaler: StandardScaler for feature normalization
        feature_columns: List of audio feature column names
        mood_categories: List of mood category labels
    """
    
    def __init__(self, scale_features: bool = True, scaler_type: str = "standard"):
        """
        Initialize the preprocessor.
        
        Args:
            scale_features: Whether to apply feature scaling
            scaler_type: "standard" for StandardScaler, "minmax" for MinMaxScaler
        """
        self.scale_features = scale_features
        self.scaler_type = scaler_type
        self.scaler = None
        self.feature_columns = AUDIO_FEATURES.copy()
        self.mood_categories = MOOD_CATEGORIES.copy()
        self._is_fitted = False
        
    def load_dataset(self, csv_path: str, sample_size: Optional[int] = None) -> pd.DataFrame:
        """
        Load the Spotify tracks dataset from CSV.
        
        Handles multiple dataset formats by normalizing column names.
        
        Args:
            csv_path: Path to the CSV file
            sample_size: If provided, randomly sample this many rows
            
        Returns:
            DataFrame with normalized column names
        """
        print(f"[Preprocessing] Loading dataset from: {csv_path}")
        
        # Load with low_memory=False to handle mixed types
        df = pd.read_csv(csv_path, low_memory=False)
        print(f"[Preprocessing] Raw dataset shape: {df.shape}")
        
        # Normalize column names for different dataset formats
        column_mapping = {
            'id': 'track_id',
            'track_uri': 'track_id',
            'uri': 'track_id',
            'duration': 'duration_ms',
        }
        df = df.rename(columns={k: v for k, v in column_mapping.items() if k in df.columns})
        
        # Handle track_id format (remove spotify:track: prefix if present)
        if 'track_id' in df.columns:
            df['track_id'] = df['track_id'].astype(str).str.replace(
                'spotify:track:', '', regex=False
            )
        
        # Optional sampling for faster development
        if sample_size and sample_size < len(df):
            df = df.sample(n=sample_size, random_state=42)
            print(f"[Preprocessing] Sampled {sample_size} rows")
        
        return df
    
    def load_multiple_datasets(self, data_dir: str, sample_size: Optional[int] = None) -> pd.DataFrame:
        """
        Load and combine multiple Spotify datasets from a directory.
        
        Handles different column formats and deduplicates by track_id.
        
        Args:
            data_dir: Path to the data directory
            sample_size: If provided, sample this many rows from combined data
            
        Returns:
            Combined DataFrame with deduplicated tracks
        """
        data_path = Path(data_dir)
        
        # Dataset files to look for (in order of preference)
        dataset_files = [
            "tracks_features.csv",           # 1.2M tracks
            "SpotifyFeatures.csv",           # 232K tracks (has genre!)
            "SpotifyAudioFeaturesApril2019.csv",  # 130K tracks
            "SpotifyAudioFeaturesNov2018.csv",    # ~115K tracks
        ]
        
        all_dfs = []
        total_tracks = 0
        
        for filename in dataset_files:
            filepath = data_path / filename
            if filepath.exists():
                try:
                    df = self.load_dataset(str(filepath))
                    
                    # Ensure track_id exists
                    if 'track_id' in df.columns:
                        # Select only the columns we need
                        cols_to_keep = ['track_id'] + [c for c in self.feature_columns if c in df.columns]
                        if 'genre' in df.columns:
                            cols_to_keep.append('genre')  # Keep genre if available
                        
                        df_subset = df[cols_to_keep].copy()
                        all_dfs.append(df_subset)
                        total_tracks += len(df_subset)
                        print(f"[Preprocessing] Loaded {filename}: {len(df_subset):,} tracks")
                    else:
                        print(f"[Preprocessing] Skipping {filename}: no track_id column")
                except Exception as e:
                    print(f"[Preprocessing] Error loading {filename}: {e}")
        
        if not all_dfs:
            raise ValueError(f"No valid datasets found in {data_dir}")
        
        # Combine all datasets
        print(f"\n[Preprocessing] Combining {len(all_dfs)} datasets ({total_tracks:,} total tracks)...")
        combined = pd.concat(all_dfs, ignore_index=True)
        
        # Deduplicate by track_id (keep first occurrence)
        before_dedup = len(combined)
        combined = combined.drop_duplicates(subset=['track_id'], keep='first')
        after_dedup = len(combined)
        
        if before_dedup != after_dedup:
            print(f"[Preprocessing] Removed {before_dedup - after_dedup:,} duplicate tracks")
        
        print(f"[Preprocessing] Combined dataset: {len(combined):,} unique tracks")
        
        # Optional sampling
        if sample_size and sample_size < len(combined):
            combined = combined.sample(n=sample_size, random_state=42)
            print(f"[Preprocessing] Sampled {sample_size:,} rows")
        
        return combined
    
    def validate_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """
        Validate that required audio features are present.
        
        Args:
            df: Input DataFrame
            
        Returns:
            Tuple of (validated DataFrame, list of available features)
        """
        available_features = [col for col in self.feature_columns if col in df.columns]
        missing_features = [col for col in self.feature_columns if col not in df.columns]
        
        if missing_features:
            print(f"[Preprocessing] Warning: Missing features: {missing_features}")
        
        if len(available_features) < 3:
            raise ValueError(f"Insufficient features. Found only: {available_features}")
        
        print(f"[Preprocessing] Using features: {available_features}")
        self.feature_columns = available_features
        
        return df, available_features
    
    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean the dataset by handling missing values and outliers.
        
        Processing steps:
        1. Drop rows with missing feature values
        2. Clip outliers in tempo (60-220 BPM)
        3. Ensure all features are in valid ranges
        
        Args:
            df: Input DataFrame
            
        Returns:
            Cleaned DataFrame
        """
        initial_size = len(df)
        
        # Drop rows with missing feature values
        df = df.dropna(subset=self.feature_columns)
        
        # Clip tempo to reasonable range
        if 'tempo' in df.columns:
            df['tempo'] = df['tempo'].clip(lower=40, upper=220)
        
        # Ensure 0-1 features are in range
        bounded_features = [f for f in self.feature_columns if f != 'tempo']
        for feat in bounded_features:
            if feat in df.columns:
                df[feat] = df[feat].clip(lower=0, upper=1)
        
        final_size = len(df)
        dropped = initial_size - final_size
        if dropped > 0:
            print(f"[Preprocessing] Dropped {dropped} rows with missing/invalid data")
        
        return df
    
    def extract_features(self, df: pd.DataFrame) -> np.ndarray:
        """
        Extract feature matrix from DataFrame.
        
        Args:
            df: DataFrame with audio feature columns
            
        Returns:
            NumPy array of shape (n_samples, n_features)
        """
        X = df[self.feature_columns].astype(float).values
        print(f"[Preprocessing] Extracted feature matrix: {X.shape}")
        return X
    
    def fit_scaler(self, X: np.ndarray) -> None:
        """
        Fit the feature scaler on training data.
        
        Args:
            X: Feature matrix (n_samples, n_features)
        """
        if not self.scale_features:
            return
            
        if self.scaler_type == "standard":
            self.scaler = StandardScaler()
        else:
            self.scaler = MinMaxScaler()
        
        self.scaler.fit(X)
        self._is_fitted = True
        print(f"[Preprocessing] Fitted {self.scaler_type} scaler")
    
    def transform(self, X: np.ndarray) -> np.ndarray:
        """
        Apply feature scaling.
        
        Args:
            X: Feature matrix
            
        Returns:
            Scaled feature matrix
        """
        if not self.scale_features or self.scaler is None:
            return X
        return self.scaler.transform(X)
    
    def fit_transform(self, X: np.ndarray) -> np.ndarray:
        """
        Fit scaler and transform in one step.
        
        Args:
            X: Feature matrix
            
        Returns:
            Scaled feature matrix
        """
        self.fit_scaler(X)
        return self.transform(X)
    
    def preprocess_pipeline(
        self, 
        csv_path: str,
        sample_size: Optional[int] = None,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Dict:
        """
        Complete preprocessing pipeline.
        
        Args:
            csv_path: Path to dataset CSV
            sample_size: Optional sample size
            test_size: Fraction for test set
            random_state: Random seed
            
        Returns:
            Dictionary with preprocessed data and metadata
        """
        # Load and clean
        df = self.load_dataset(csv_path, sample_size)
        df, features = self.validate_features(df)
        df = self.clean_data(df)
        
        # Extract features
        X = self.extract_features(df)
        
        # Get track IDs for later reference
        track_ids = df['track_id'].values if 'track_id' in df.columns else None
        
        # Store raw features for rule-based labeling
        raw_features = df[self.feature_columns].to_dict('records')
        
        return {
            'X': X,
            'df': df,
            'track_ids': track_ids,
            'raw_features': raw_features,
            'feature_columns': self.feature_columns,
            'n_samples': len(df),
        }
    
    def preprocess_pipeline_from_df(
        self, 
        df: pd.DataFrame,
        sample_size: Optional[int] = None,
    ) -> Dict:
        """
        Complete preprocessing pipeline from an already-loaded DataFrame.
        
        Args:
            df: Pre-loaded DataFrame (e.g., from load_multiple_datasets)
            sample_size: Optional sample size
            
        Returns:
            Dictionary with preprocessed data and metadata
        """
        # Optional sampling
        if sample_size and sample_size < len(df):
            df = df.sample(n=sample_size, random_state=42)
            print(f"[Preprocessing] Sampled {sample_size:,} rows")
        
        # Validate and clean
        df, features = self.validate_features(df)
        df = self.clean_data(df)
        
        # Extract features
        X = self.extract_features(df)
        
        # Get track IDs for later reference
        track_ids = df['track_id'].values if 'track_id' in df.columns else None
        
        # Store raw features for rule-based labeling
        raw_features = df[self.feature_columns].to_dict('records')
        
        return {
            'X': X,
            'df': df,
            'track_ids': track_ids,
            'raw_features': raw_features,
            'feature_columns': self.feature_columns,
            'n_samples': len(df),
        }
    
    def save_scaler(self, path: str) -> None:
        """Save fitted scaler to disk."""
        if self.scaler is not None:
            joblib.dump(self.scaler, path)
            print(f"[Preprocessing] Saved scaler to: {path}")
    
    def load_scaler(self, path: str) -> None:
        """Load scaler from disk."""
        self.scaler = joblib.load(path)
        self._is_fitted = True
        print(f"[Preprocessing] Loaded scaler from: {path}")


def get_feature_statistics(X: np.ndarray, feature_names: List[str]) -> pd.DataFrame:
    """
    Compute descriptive statistics for features.
    
    Args:
        X: Feature matrix
        feature_names: List of feature names
        
    Returns:
        DataFrame with statistics (mean, std, min, max, etc.)
    """
    df = pd.DataFrame(X, columns=feature_names)
    return df.describe()


if __name__ == "__main__":
    # Demo usage
    from pathlib import Path
    
    data_dir = Path(__file__).parent.parent / "data"
    csv_path = data_dir / "tracks_features.csv"
    
    if csv_path.exists():
        preprocessor = DataPreprocessor()
        result = preprocessor.preprocess_pipeline(str(csv_path), sample_size=10000)
        print(f"\nPreprocessed {result['n_samples']} samples")
        print(f"Feature shape: {result['X'].shape}")
        print(f"\nStatistics:\n{get_feature_statistics(result['X'], result['feature_columns'])}")
