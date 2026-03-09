# ml-service/run_training.py
"""
Run Training Pipeline

This script trains the mood classification ML model using the
pseudo-labeling approach.

Usage:
    python run_training.py                    # Train on full dataset
    python run_training.py --multi            # Combine ALL datasets
    python run_training.py --sample 100000    # Train on 100K sample
    python run_training.py --confidence 0.05  # Filter low-confidence labels

The trained model will be saved to ml-service/models/
"""

import sys
from pathlib import Path

# Add ml-service to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from ml.train_model import run_training_pipeline, run_training_pipeline_multi


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Train OnChord Mood Classification ML Model"
    )
    parser.add_argument(
        "--sample", 
        type=int,
        default=None,
        help="Sample size for faster training (default: use full dataset)"
    )
    parser.add_argument(
        "--confidence", 
        type=float,
        default=0.0,
        help="Minimum label confidence threshold (default: 0.0, use all)"
    )
    parser.add_argument(
        "--output", 
        type=str,
        default="models",
        help="Output directory for trained models"
    )
    parser.add_argument(
        "--multi",
        action="store_true",
        help="Combine ALL CSV datasets in data/ folder for training"
    )
    parser.add_argument(
        "--rf-only",
        action="store_true",
        help="Train only RandomForest (faster, skips GradientBoosting)"
    )
    
    args = parser.parse_args()
    
    # Resolve paths
    base_dir = Path(__file__).parent
    data_dir = base_dir / "data"
    output_dir = base_dir / args.output
    
    if args.multi:
        # Use multi-dataset training
        print("=" * 60)
        print("MULTI-DATASET TRAINING MODE")
        print("=" * 60)
        print(f"Data directory: {data_dir}")
        print(f"Output: {output_dir}")
        print()
        
        result = run_training_pipeline_multi(
            str(data_dir),
            str(output_dir),
            sample_size=args.sample,
            confidence_threshold=args.confidence,
            rf_only=args.rf_only
        )
    else:
        # Single dataset training (original behavior)
        csv_path = data_dir / "tracks_features.csv"
        
        if not csv_path.exists():
            csv_path = data_dir / "SpotifyFeatures.csv"
        
        if not csv_path.exists():
            print(f"ERROR: Dataset not found at {csv_path}")
            print("Please ensure tracks_features.csv or SpotifyFeatures.csv exists in data/")
            print("Or use --multi flag to combine all available datasets.")
            sys.exit(1)
        
        print(f"Dataset: {csv_path}")
        print(f"Output: {output_dir}")
        print()
        
        result = run_training_pipeline(
            str(csv_path),
            str(output_dir),
            sample_size=args.sample,
            confidence_threshold=args.confidence,
            rf_only=args.rf_only
        )
    
    print("\n" + "=" * 60)
    print("TRAINING SUMMARY")
    print("=" * 60)
    print(f"Best Model: {result['trainer'].best_model_name}")
    print(f"Accuracy: {result['results'][result['trainer'].best_model_name]['accuracy']:.4f}")
    print(f"F1-Macro: {result['results'][result['trainer'].best_model_name]['f1_macro']:.4f}")
    print(f"\nModel saved to: {result['saved_paths']['model']}")
    print("\nRestart the ML service to use the new model.")


if __name__ == "__main__":
    main()
