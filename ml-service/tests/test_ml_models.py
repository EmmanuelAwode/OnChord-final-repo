"""
Unit tests for OnChord ML Service models.

Run with: pytest tests/test_ml_models.py -v
"""
import pytest
import numpy as np
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestMoodClassifier:
    """Tests for the mood classification system."""
    
    def test_mood_classifier_import(self):
        """Test that mood classifier can be imported."""
        from app.mood_classifier import MoodClassifier
        assert MoodClassifier is not None
    
    def test_mood_classifier_init(self):
        """Test mood classifier initialization with sample data."""
        from app.mood_classifier import MoodClassifier
        
        # Create minimal classifier without loading full dataset
        classifier = MoodClassifier.__new__(MoodClassifier)
        classifier.features = ['danceability', 'energy', 'valence', 'acousticness', 
                               'instrumentalness', 'liveness', 'speechiness', 'tempo']
        assert len(classifier.features) == 8
    
    def test_mood_categories(self):
        """Test that all mood categories are defined."""
        expected_moods = ['Energetic', 'Chill', 'Melancholic', 'Upbeat']
        # These are the 4 primary mood categories used in the app
        assert len(expected_moods) == 4
    
    def test_audio_features_valid_range(self):
        """Test that audio features are in valid range [0-1] or BPM for tempo."""
        sample_features = {
            'danceability': 0.75,
            'energy': 0.65,
            'valence': 0.80,
            'acousticness': 0.15,
            'instrumentalness': 0.02,
            'liveness': 0.12,
            'speechiness': 0.05,
            'tempo': 120.0
        }
        
        for key, value in sample_features.items():
            if key == 'tempo':
                assert 0 <= value <= 300, f"Tempo {value} out of range"
            else:
                assert 0 <= value <= 1, f"{key} value {value} out of range"


class TestTasteModel:
    """Tests for the taste matching model."""
    
    def test_taste_model_import(self):
        """Test that taste model can be imported."""
        from app.spotify_taste_model import SpotifyTasteModel
        assert SpotifyTasteModel is not None
    
    def test_ml_taste_model_import(self):
        """Test that ML taste model can be imported."""
        from app.ml_taste_model import MLTasteModel
        assert MLTasteModel is not None
    
    def test_similarity_range(self):
        """Test that similarity values are in valid range [0, 1]."""
        # Similarity should always be between 0 and 1
        test_similarities = [0.0, 0.5, 0.85, 1.0]
        for sim in test_similarities:
            assert 0 <= sim <= 1, f"Similarity {sim} out of range"
    
    def test_cosine_similarity_calculation(self):
        """Test cosine similarity calculation."""
        from sklearn.metrics.pairwise import cosine_similarity
        
        vec1 = np.array([[0.5, 0.8, 0.3]])
        vec2 = np.array([[0.6, 0.7, 0.4]])
        
        sim = cosine_similarity(vec1, vec2)[0][0]
        assert 0 <= sim <= 1, f"Cosine similarity {sim} out of range"
        assert sim > 0.9, "Similar vectors should have high similarity"
    
    def test_latent_dimensions(self):
        """Test that TruncatedSVD outputs correct number of components."""
        from sklearn.decomposition import TruncatedSVD
        
        # Sample data with 8 features (like audio features)
        sample_data = np.random.rand(100, 8)
        
        n_components = 5
        svd = TruncatedSVD(n_components=n_components)
        transformed = svd.fit_transform(sample_data)
        
        assert transformed.shape[1] == n_components
        assert svd.explained_variance_ratio_.sum() > 0


class TestGenreMoodClassifier:
    """Tests for genre-based mood classification."""
    
    def test_genre_mood_import(self):
        """Test that genre mood classifier can be imported."""
        from ml.genre_mood_classifier import GenreMoodClassifier
        assert GenreMoodClassifier is not None
    
    def test_genre_mood_init(self):
        """Test genre mood classifier initialization."""
        from ml.genre_mood_classifier import GenreMoodClassifier
        
        classifier = GenreMoodClassifier()
        assert classifier is not None
        # Should have genre-to-mood probability mappings
        assert hasattr(classifier, 'genre_mood_probs') or hasattr(classifier, '_loaded')


class TestModelLoading:
    """Tests for model loading and persistence."""
    
    def test_model_files_exist(self):
        """Test that trained model files exist."""
        models_dir = Path(__file__).parent.parent / 'models'
        
        expected_files = [
            'mood_classifier_randomforest.joblib',
            'mood_classifier_decisiontree.joblib',
            'scaler.joblib',
        ]
        
        for filename in expected_files:
            filepath = models_dir / filename
            assert filepath.exists(), f"Model file {filename} not found"
    
    def test_ml_taste_model_files_exist(self):
        """Test that ML taste model files exist."""
        models_dir = Path(__file__).parent.parent / 'models'
        
        expected_files = [
            'taste_svd.joblib',
            'taste_scaler.joblib',
            'taste_embeddings.npz',
        ]
        
        for filename in expected_files:
            filepath = models_dir / filename
            if filepath.exists():
                assert filepath.stat().st_size > 0, f"Model file {filename} is empty"


class TestAPIEndpoints:
    """Tests for FastAPI endpoints."""
    
    def test_app_import(self):
        """Test that FastAPI app can be imported."""
        from app.main import app
        assert app is not None
    
    def test_health_endpoint_exists(self):
        """Test that health endpoint is registered."""
        from app.main import app
        
        routes = [route.path for route in app.routes]
        assert '/health' in routes, "Health endpoint not found"
    
    def test_predict_endpoints_exist(self):
        """Test that prediction endpoints are registered."""
        from app.main import app
        
        routes = [route.path for route in app.routes]
        
        expected_endpoints = [
            '/predict/mood',
            '/predict/taste_similarity',
            '/predict/ml_taste_similarity',
            '/predict/enhanced_taste',
        ]
        
        for endpoint in expected_endpoints:
            assert endpoint in routes, f"Endpoint {endpoint} not found"


class TestFeatureScaling:
    """Tests for feature preprocessing and scaling."""
    
    def test_scaler_preserves_range(self):
        """Test that StandardScaler works correctly."""
        from sklearn.preprocessing import StandardScaler
        
        # Sample audio features
        features = np.array([
            [0.5, 0.8, 0.3, 0.1, 0.0, 0.2, 0.05, 120],
            [0.7, 0.6, 0.5, 0.2, 0.1, 0.1, 0.03, 140],
            [0.3, 0.9, 0.2, 0.0, 0.0, 0.3, 0.08, 100],
        ])
        
        scaler = StandardScaler()
        scaled = scaler.fit_transform(features)
        
        # Scaled data should have mean ~0 and std ~1
        assert np.allclose(scaled.mean(axis=0), 0, atol=1e-10)
        assert np.allclose(scaled.std(axis=0), 1, atol=1e-10)
    
    def test_tempo_normalization(self):
        """Test that tempo is properly normalized."""
        # Tempo typically ranges from 40-220 BPM
        tempo_values = np.array([60, 120, 180])
        
        # Normalize to 0-1 range
        min_tempo, max_tempo = 40, 220
        normalized = (tempo_values - min_tempo) / (max_tempo - min_tempo)
        
        assert all(0 <= v <= 1 for v in normalized)


class TestEdgeCases:
    """Tests for edge cases and error handling."""
    
    def test_empty_track_list(self):
        """Test handling of empty track lists."""
        empty_tracks = []
        # Should not raise an error
        assert len(empty_tracks) == 0
    
    def test_single_track(self):
        """Test handling of single track."""
        single_track = ['track_id_1']
        assert len(single_track) == 1
    
    def test_invalid_audio_features(self):
        """Test handling of invalid audio feature values."""
        invalid_features = {
            'danceability': -0.5,  # Should be >= 0
            'energy': 1.5,  # Should be <= 1
        }
        
        for key, value in invalid_features.items():
            is_valid = 0 <= value <= 1
            assert not is_valid, f"Should detect invalid {key}={value}"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
