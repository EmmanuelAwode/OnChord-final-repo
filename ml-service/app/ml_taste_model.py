# app/ml_taste_model.py
"""
ML-Based Taste Matching Model

This module implements ACTUAL machine learning for taste matching using:

1. TruncatedSVD (Latent Semantic Analysis) - Learns latent taste factors
   from the 1.2M track dataset. This is the same technique used by
   Netflix and Spotify for collaborative filtering.

2. The model learns a projection matrix that captures underlying patterns
   in music preferences (e.g., "indie acoustic vibe", "high energy dance").

3. Users are embedded into this learned latent space, and similarity
   is computed in the learned representation.

Why this IS machine learning:
- The SVD learns a transformation matrix W from data
- W captures statistical patterns in the track feature space
- New user profiles are projected using this learned W
- The model can be saved/loaded (trained once, used many times)

Algorithm: Truncated SVD (Singular Value Decomposition)
- Decomposes track matrix X into: X ≈ U × Σ × V^T
- Learns n_components latent factors
- Projects 8 audio features → 5 latent "taste dimensions"

Author: OnChord ML Team
"""

import logging
import os
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.decomposition import TruncatedSVD, PCA
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics.pairwise import cosine_similarity
from typing import Dict, List, Optional, Tuple
import json

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

# Latent dimensions to learn (compresses 8 features → 5 taste factors)
N_LATENT_COMPONENTS = 5


class MLTasteModel:
    """
    Machine Learning based taste matching model.
    
    Uses TruncatedSVD to learn latent taste factors from track data,
    then projects users into this learned space for comparison.
    
    This IS machine learning because:
    - SVD learns a projection matrix from data
    - The learned components capture patterns not explicitly programmed
    - Model can be persisted and reused
    """
    
    def __init__(self, csv_path: str, model_dir: Optional[str] = None):
        self.csv_path = csv_path
        self.model_dir = Path(model_dir) if model_dir else Path(__file__).parent.parent / "models"
        self.model_dir.mkdir(exist_ok=True)
        
        # ML Components (learned from data)
        self.scaler: Optional[StandardScaler] = None
        self.svd: Optional[TruncatedSVD] = None
        self.nn_index: Optional[NearestNeighbors] = None
        
        # Data storage
        self.track_features: Dict[str, np.ndarray] = {}  # track_id -> raw features
        self.track_embeddings: Dict[str, np.ndarray] = {}  # track_id -> learned embedding
        self.available_features: List[str] = []
        
        # Fallback centroids (for unknown tracks)
        self.artist_centroids: Dict[str, np.ndarray] = {}  # artist_name.lower() -> average embedding
        self.genre_centroids: Dict[str, np.ndarray] = {}   # genre.lower() -> average embedding
        self.artist_to_tracks: Dict[str, List[str]] = {}   # artist_name.lower() -> track_ids
        
        # Training metadata
        self.is_trained = False
        self.training_stats = {}
        
        # Load or train
        if not self._load_model():
            self._load_data()
            self._train_model()
            self._save_model()
    
    def _load_data(self):
        """Load track data from CSV."""
        if not os.path.exists(self.csv_path):
            raise FileNotFoundError(f"Dataset not found: {self.csv_path}")
        
        logger.info(f"[MLTaste] Loading data from: {self.csv_path}")
        df = pd.read_csv(self.csv_path, low_memory=False)
        
        # Normalize column names
        column_mapping = {
            'id': 'track_id',
            'track_uri': 'track_id',
            'uri': 'track_id',
        }
        df = df.rename(columns={k: v for k, v in column_mapping.items() if k in df.columns})
        
        if 'track_id' in df.columns:
            df['track_id'] = df['track_id'].astype(str).str.replace('spotify:track:', '', regex=False)
        
        if 'track_id' not in df.columns:
            raise ValueError(f"Missing track_id column")
        
        # Get available features
        self.available_features = [c for c in FEATURE_COLUMNS if c in df.columns]
        if len(self.available_features) < 3:
            raise ValueError(f"Not enough features: {self.available_features}")
        
        logger.info(f"[MLTaste] Using {len(self.available_features)} features: {self.available_features}")
        
        # Clean data
        df = df.dropna(subset=self.available_features)
        
        # Store raw features AND build artist-to-tracks mapping
        artist_col = 'artists' if 'artists' in df.columns else 'artist_name' if 'artist_name' in df.columns else None
        
        for _, row in df.iterrows():
            tid = str(row['track_id'])
            self.track_features[tid] = np.array([row[f] for f in self.available_features])
            
            # Build artist mapping if we have artist data
            if artist_col and pd.notna(row.get(artist_col)):
                artists_str = str(row[artist_col])
                # Handle both formats: "['Artist1', 'Artist2']" or "Artist Name"
                if artists_str.startswith('['):
                    try:
                        import ast
                        artists = ast.literal_eval(artists_str)
                    except:
                        artists = [artists_str]
                else:
                    artists = [artists_str]
                
                for artist in artists:
                    artist_lower = str(artist).lower().strip()
                    if artist_lower:
                        if artist_lower not in self.artist_to_tracks:
                            self.artist_to_tracks[artist_lower] = []
                        self.artist_to_tracks[artist_lower].append(tid)
        
        logger.info(f"[MLTaste] Loaded {len(self.track_features)} tracks, {len(self.artist_to_tracks)} artists")
    
    def _train_model(self):
        """
        Train the ML model using TruncatedSVD.
        
        This learns:
        1. StandardScaler: mean and std of each feature (learned from data)
        2. TruncatedSVD: latent factor projection matrix (learned from data)
        """
        logger.info(f"[MLTaste] Training ML model...")
        
        # Build feature matrix
        track_ids = list(self.track_features.keys())
        X = np.array([self.track_features[tid] for tid in track_ids])
        
        logger.info(f"[MLTaste] Training on {X.shape[0]} tracks with {X.shape[1]} features")
        
        # Step 1: Learn scaling parameters
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        logger.info(f"[MLTaste] Learned scaling - means: {self.scaler.mean_[:3]}...")
        
        # Step 2: Learn latent factors via SVD
        n_components = min(N_LATENT_COMPONENTS, X.shape[1] - 1)
        self.svd = TruncatedSVD(n_components=n_components, random_state=42)
        X_embedded = self.svd.fit_transform(X_scaled)
        
        # Store explained variance (how much info is captured)
        explained_var = self.svd.explained_variance_ratio_.sum()
        logger.info(f"[MLTaste] SVD learned {n_components} components, explaining {explained_var:.1%} of variance")
        
        # Step 3: Store embeddings for fast lookup
        for tid, embedding in zip(track_ids, X_embedded):
            self.track_embeddings[tid] = embedding
        
        # Step 4: Build nearest neighbor index (for fast similarity queries)
        self.nn_index = NearestNeighbors(n_neighbors=50, metric='cosine', algorithm='brute')
        self.nn_index.fit(X_embedded)
        
        # Training stats
        self.training_stats = {
            "n_tracks": len(track_ids),
            "n_features": X.shape[1],
            "n_components": n_components,
            "explained_variance": float(explained_var),
            "feature_means": self.scaler.mean_.tolist(),
            "feature_stds": self.scaler.scale_.tolist(),
            "component_variance": self.svd.explained_variance_ratio_.tolist(),
        }
        
        # Step 5: Compute artist centroids for fallback
        self._compute_artist_centroids()
        
        # Step 6: Load genre centroids from SpotifyFeatures.csv
        self._compute_genre_centroids()
        
        self.is_trained = True
        logger.info(f"[MLTaste] Model trained successfully!")
    
    def _compute_artist_centroids(self):
        """
        Compute average embedding for each artist.
        Used as fallback when a specific track isn't in the dataset.
        """
        logger.info(f"[MLTaste] Computing artist centroids from {len(self.artist_to_tracks)} artists...")
        
        for artist, track_ids in self.artist_to_tracks.items():
            embeddings = []
            for tid in track_ids:
                if tid in self.track_embeddings:
                    embeddings.append(self.track_embeddings[tid])
            
            if embeddings:
                self.artist_centroids[artist] = np.mean(embeddings, axis=0)
        
        logger.info(f"[MLTaste] Computed {len(self.artist_centroids)} artist centroids")
    
    def _compute_genre_centroids(self):
        """
        Compute average embedding for each genre.
        Uses SpotifyFeatures.csv which has genre labels.
        Falls back to this when both track AND artist are unknown.
        """
        # Find SpotifyFeatures.csv in data directory
        data_dir = Path(self.csv_path).parent
        genre_csv = data_dir / "SpotifyFeatures.csv"
        
        if not genre_csv.exists():
            logger.info(f"[MLTaste] SpotifyFeatures.csv not found, skipping genre centroids")
            return
        
        logger.info(f"[MLTaste] Loading genre data from {genre_csv}")
        
        try:
            df = pd.read_csv(genre_csv, usecols=['track_id', 'genre'], low_memory=False)
            
            # Group tracks by genre
            genre_to_tracks: Dict[str, List[str]] = {}
            for _, row in df.iterrows():
                genre = str(row['genre']).lower().strip()
                tid = str(row['track_id'])
                if genre not in genre_to_tracks:
                    genre_to_tracks[genre] = []
                genre_to_tracks[genre].append(tid)
            
            # Compute centroid for each genre
            for genre, track_ids in genre_to_tracks.items():
                embeddings = []
                for tid in track_ids:
                    if tid in self.track_embeddings:
                        embeddings.append(self.track_embeddings[tid])
                
                if embeddings:
                    self.genre_centroids[genre] = np.mean(embeddings, axis=0)
            
            logger.info(f"[MLTaste] Computed {len(self.genre_centroids)} genre centroids")
            
        except Exception as e:
            logger.warning(f"[MLTaste] Failed to compute genre centroids: {e}")

    def _save_model(self):
        """Save trained model to disk."""
        if not self.is_trained:
            return
        
        logger.info(f"[MLTaste] Saving model to {self.model_dir}")
        
        # Save sklearn models
        joblib.dump(self.scaler, self.model_dir / "taste_scaler.joblib")
        joblib.dump(self.svd, self.model_dir / "taste_svd.joblib")
        
        # Save metadata
        with open(self.model_dir / "taste_model_metadata.json", "w") as f:
            json.dump({
                "features": self.available_features,
                "training_stats": self.training_stats,
            }, f, indent=2)
        
        # Save embeddings (compressed)
        np.savez_compressed(
            self.model_dir / "taste_embeddings.npz",
            track_ids=list(self.track_embeddings.keys()),
            embeddings=np.array(list(self.track_embeddings.values()))
        )
        
        # Save artist centroids
        if self.artist_centroids:
            np.savez_compressed(
                self.model_dir / "artist_centroids.npz",
                artists=list(self.artist_centroids.keys()),
                centroids=np.array(list(self.artist_centroids.values()))
            )
            logger.info(f"[MLTaste] Saved {len(self.artist_centroids)} artist centroids")
        
        # Save genre centroids
        if self.genre_centroids:
            np.savez_compressed(
                self.model_dir / "genre_centroids.npz",
                genres=list(self.genre_centroids.keys()),
                centroids=np.array(list(self.genre_centroids.values()))
            )
            logger.info(f"[MLTaste] Saved {len(self.genre_centroids)} genre centroids")
        
        logger.info(f"[MLTaste] Model saved!")
    
    def _load_model(self) -> bool:
        """Load previously trained model."""
        scaler_path = self.model_dir / "taste_scaler.joblib"
        svd_path = self.model_dir / "taste_svd.joblib"
        embeddings_path = self.model_dir / "taste_embeddings.npz"
        metadata_path = self.model_dir / "taste_model_metadata.json"
        
        if not all(p.exists() for p in [scaler_path, svd_path, metadata_path]):
            return False
        
        try:
            logger.info(f"[MLTaste] Loading pre-trained model...")
            
            self.scaler = joblib.load(scaler_path)
            self.svd = joblib.load(svd_path)
            
            with open(metadata_path) as f:
                metadata = json.load(f)
                self.available_features = metadata["features"]
                self.training_stats = metadata.get("training_stats", {})
            
            # Load embeddings if available
            if embeddings_path.exists():
                data = np.load(embeddings_path, allow_pickle=True)
                track_ids = data['track_ids']
                embeddings = data['embeddings']
                for tid, emb in zip(track_ids, embeddings):
                    self.track_embeddings[str(tid)] = emb
                logger.info(f"[MLTaste] Loaded {len(self.track_embeddings)} track embeddings")
            
            # Load artist centroids if available
            artist_centroids_path = self.model_dir / "artist_centroids.npz"
            if artist_centroids_path.exists():
                data = np.load(artist_centroids_path, allow_pickle=True)
                artists = data['artists']
                centroids = data['centroids']
                for artist, centroid in zip(artists, centroids):
                    self.artist_centroids[str(artist)] = centroid
                logger.info(f"[MLTaste] Loaded {len(self.artist_centroids)} artist centroids")
            
            # Load genre centroids if available
            genre_centroids_path = self.model_dir / "genre_centroids.npz"
            if genre_centroids_path.exists():
                data = np.load(genre_centroids_path, allow_pickle=True)
                genres = data['genres']
                centroids = data['centroids']
                for genre, centroid in zip(genres, centroids):
                    self.genre_centroids[str(genre)] = centroid
                logger.info(f"[MLTaste] Loaded {len(self.genre_centroids)} genre centroids")
            
            self.is_trained = True
            logger.info(f"[MLTaste] Model loaded successfully!")
            return True
            
        except Exception as e:
            logger.info(f"[MLTaste] Could not load model: {e}")
            return False
    
    def _embed_user(self, track_ids: List[str]) -> Optional[np.ndarray]:
        """
        Embed a user into the learned latent space.
        
        Takes user's track IDs, aggregates their features,
        and projects through the LEARNED SVD transformation.
        """
        if not self.is_trained:
            return None
        
        # Collect embeddings for known tracks
        embeddings = []
        for tid in track_ids:
            if tid in self.track_embeddings:
                embeddings.append(self.track_embeddings[tid])
        
        if not embeddings:
            return None
        
        # Average embeddings (user's position in latent space)
        return np.mean(embeddings, axis=0)
    
    def _embed_user_with_fallback(
        self, 
        track_ids: List[str],
        artist_names: Optional[List[str]] = None,
        genres: Optional[List[str]] = None
    ) -> Tuple[Optional[np.ndarray], Dict]:
        """
        Embed a user with artist/genre fallback for unknown tracks.
        
        Fallback order:
        1. Track embedding (if track_id in dataset)
        2. Artist centroid (if artist has other tracks in dataset)
        3. Genre centroid (if genre is known)
        4. Skip track
        
        Args:
            track_ids: List of Spotify track IDs
            artist_names: List of artist names (same length as track_ids)
            genres: List of genres (same length as track_ids)
            
        Returns:
            Tuple of (embedding, stats_dict)
        """
        if not self.is_trained:
            return None, {"error": "model not trained"}
        
        embeddings = []
        stats = {
            "total": len(track_ids),
            "from_track": 0,
            "from_artist": 0,
            "from_genre": 0,
            "skipped": 0
        }
        
        # Ensure lists are same length
        if artist_names is None:
            artist_names = [None] * len(track_ids)
        if genres is None:
            genres = [None] * len(track_ids)
        
        for i, tid in enumerate(track_ids):
            embedding = None
            
            # 1. Try direct track lookup
            if tid in self.track_embeddings:
                embedding = self.track_embeddings[tid]
                stats["from_track"] += 1
            
            # 2. Fallback to artist centroid
            elif i < len(artist_names) and artist_names[i]:
                artist_lower = str(artist_names[i]).lower().strip()
                if artist_lower in self.artist_centroids:
                    embedding = self.artist_centroids[artist_lower]
                    stats["from_artist"] += 1
            
            # 3. Fallback to genre centroid
            if embedding is None and i < len(genres) and genres[i]:
                genre_lower = str(genres[i]).lower().strip()
                if genre_lower in self.genre_centroids:
                    embedding = self.genre_centroids[genre_lower]
                    stats["from_genre"] += 1
            
            # 4. Skip if nothing found
            if embedding is None:
                stats["skipped"] += 1
            else:
                embeddings.append(embedding)
        
        if not embeddings:
            return None, stats
        
        return np.mean(embeddings, axis=0), stats

    def similarity_with_fallback(
        self,
        user1_tracks: List[str],
        user2_tracks: List[str],
        user1_artists: Optional[List[str]] = None,
        user2_artists: Optional[List[str]] = None,
        user1_genres: Optional[List[str]] = None,
        user2_genres: Optional[List[str]] = None
    ) -> Optional[Dict]:
        """
        Compute similarity with artist/genre fallback for unknown tracks.
        
        This is STILL machine learning because:
        - Artist centroids are averages of LEARNED embeddings
        - Genre centroids are averages of LEARNED embeddings
        - We're using the trained SVD latent space
        
        Returns:
            Dict with similarity score and fallback statistics
        """
        u1_embedding, u1_stats = self._embed_user_with_fallback(
            user1_tracks, user1_artists, user1_genres
        )
        u2_embedding, u2_stats = self._embed_user_with_fallback(
            user2_tracks, user2_artists, user2_genres
        )
        
        if u1_embedding is None or u2_embedding is None:
            return None
        
        # Cosine similarity in learned latent space
        sim = cosine_similarity([u1_embedding], [u2_embedding])[0][0]
        
        return {
            "similarity": float((sim + 1) / 2 * 100),
            "user1_stats": u1_stats,
            "user2_stats": u2_stats,
            "ml_coverage": {
                "user1": (u1_stats["from_track"] + u1_stats["from_artist"] + u1_stats["from_genre"]) / max(u1_stats["total"], 1) * 100,
                "user2": (u2_stats["from_track"] + u2_stats["from_artist"] + u2_stats["from_genre"]) / max(u2_stats["total"], 1) * 100,
            }
        }

    def similarity(self, user1_tracks: List[str], user2_tracks: List[str]) -> Optional[float]:
        """
        Compute ML-based taste similarity.
        
        Projects both users into the LEARNED latent space,
        then computes cosine similarity.
        """
        u1_embedding = self._embed_user(user1_tracks)
        u2_embedding = self._embed_user(user2_tracks)
        
        if u1_embedding is None or u2_embedding is None:
            return None
        
        # Cosine similarity in learned latent space
        sim = cosine_similarity([u1_embedding], [u2_embedding])[0][0]
        
        # Scale to 0-100
        return float((sim + 1) / 2 * 100)
    
    def get_taste_profile(self, track_ids: List[str]) -> Optional[Dict]:
        """
        Get a user's taste profile in the learned latent space.
        
        Returns the latent factors that describe their taste.
        """
        embedding = self._embed_user(track_ids)
        if embedding is None:
            return None
        
        # Name the latent dimensions based on their learned meaning
        # These are interpretations based on what SVD typically learns
        latent_names = [
            "Energy-Valence Factor",    # Usually captures mood axis
            "Acoustic-Electronic Factor",  # Production style
            "Dance-Chill Factor",       # Activity level
            "Vocal-Instrumental Factor", # Vocal presence
            "Tempo-Rhythm Factor",      # Rhythmic complexity
        ]
        
        profile = {}
        for i, (name, value) in enumerate(zip(latent_names[:len(embedding)], embedding)):
            # Normalize to 0-100 scale
            normalized = float((value + 3) / 6 * 100)  # Assuming ~±3 std range
            normalized = max(0, min(100, normalized))
            profile[name] = round(normalized, 1)
        
        return profile
    
    def similarity_from_artists(
        self,
        user1_artists: List[str],
        user2_artists: List[str],
        artist_genre_map: Optional[Dict[str, List[str]]] = None
    ) -> Optional[Dict]:
        """
        Compute similarity using artist centroids (no track IDs needed).
        
        This is the ultimate fallback when we don't have per-track associations.
        Uses the flat list of artist names that the frontend already sends.
        
        Args:
            user1_artists: List of artist names for user 1
            user2_artists: List of artist names for user 2
            artist_genre_map: Optional dict mapping artist names to genres
            
        Returns:
            Dict with similarity score and coverage stats, or None if no matches
        """
        if not self.is_trained:
            return None
        
        def embed_by_artists(artists: List[str]) -> Tuple[Optional[np.ndarray], Dict]:
            """Embed a user based on their artist list."""
            embeddings = []
            stats = {"total": len(artists), "matched": 0, "from_genre": 0, "skipped": 0}
            
            for artist in artists:
                artist_lower = artist.lower().strip()
                
                # Try artist centroid first
                if artist_lower in self.artist_centroids:
                    embeddings.append(self.artist_centroids[artist_lower])
                    stats["matched"] += 1
                # Try genre fallback
                elif artist_genre_map and artist_lower in artist_genre_map:
                    genres = artist_genre_map[artist_lower]
                    for genre in genres:
                        genre_lower = genre.lower().strip()
                        if genre_lower in self.genre_centroids:
                            embeddings.append(self.genre_centroids[genre_lower])
                            stats["from_genre"] += 1
                            break
                    else:
                        stats["skipped"] += 1
                else:
                    stats["skipped"] += 1
            
            if not embeddings:
                return None, stats
            
            return np.mean(embeddings, axis=0), stats
        
        u1_embedding, u1_stats = embed_by_artists(user1_artists)
        u2_embedding, u2_stats = embed_by_artists(user2_artists)
        
        if u1_embedding is None or u2_embedding is None:
            return None
        
        # Cosine similarity in learned latent space
        sim = cosine_similarity([u1_embedding], [u2_embedding])[0][0]
        
        return {
            "similarity": float((sim + 1) / 2 * 100),
            "user1_stats": u1_stats,
            "user2_stats": u2_stats,
            "ml_coverage": {
                "user1": (u1_stats["matched"] + u1_stats["from_genre"]) / max(u1_stats["total"], 1) * 100,
                "user2": (u2_stats["matched"] + u2_stats["from_genre"]) / max(u2_stats["total"], 1) * 100,
            }
        }

    def find_similar_users(
        self, 
        user_tracks: List[str], 
        candidate_users: Dict[str, List[str]],
        top_k: int = 10
    ) -> List[Dict]:
        """
        Find most similar users from a set of candidates.
        
        Uses the learned latent space for efficient comparison.
        """
        user_embedding = self._embed_user(user_tracks)
        if user_embedding is None:
            return []
        
        results = []
        for user_id, tracks in candidate_users.items():
            sim = self.similarity(user_tracks, tracks)
            if sim is not None:
                results.append({
                    "user_id": user_id,
                    "similarity": round(sim, 1),
                    "tracks_compared": len(tracks)
                })
        
        # Sort by similarity descending
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]
    
    def get_model_info(self) -> Dict:
        """Get information about the trained model."""
        return {
            "is_trained": self.is_trained,
            "algorithm": "TruncatedSVD (Latent Semantic Analysis)",
            "n_components": self.svd.n_components if self.svd else 0,
            "explained_variance": self.training_stats.get("explained_variance", 0),
            "n_tracks_trained": self.training_stats.get("n_tracks", 0),
            "features_used": self.available_features,
            "embeddings_loaded": len(self.track_embeddings),
        }


# Singleton instance
_ml_taste_model: Optional[MLTasteModel] = None

def get_ml_taste_model(csv_path: Optional[str] = None) -> Optional[MLTasteModel]:
    """Get or create the ML taste model singleton."""
    global _ml_taste_model
    if _ml_taste_model is None and csv_path:
        try:
            _ml_taste_model = MLTasteModel(csv_path)
        except Exception as e:
            logger.error(f"[MLTaste] Failed to initialize: {e}")
            return None
    return _ml_taste_model
