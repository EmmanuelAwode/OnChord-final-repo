"""
Script to download larger Spotify datasets for mood classification.

Options:
1. Manually download from Kaggle (recommended for 1.2M dataset)
2. Use this script to fetch smaller datasets

Instructions for large dataset:
1. Go to: https://www.kaggle.com/datasets/rodolfofigueroa/spotify-12m-songs
2. Download 'tracks_features.csv' 
3. Place it in ml-service/data/tracks_features.csv
4. Restart the ML service

Alternative datasets:
- https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset
- https://www.kaggle.com/datasets/joebeachcapital/30000-spotify-songs
"""

import os
import sys
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

def check_datasets():
    """Check which datasets are available."""
    print("\n=== Checking Available Datasets ===\n")
    
    datasets = [
        ("SpotifyFeatures.csv", "Original dataset (~177K tracks)"),
        ("tracks_features.csv", "Spotify 1.2M dataset"),
        ("spotify_tracks.csv", "Spotify tracks dataset (~600K)"),
        ("spotify_songs.csv", "30K popular songs"),
    ]
    
    found = []
    for filename, description in datasets:
        path = DATA_DIR / filename
        if path.exists():
            # Count rows
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                line_count = sum(1 for _ in f) - 1  # Subtract header
            print(f"✓ {filename}: {line_count:,} tracks - {description}")
            found.append((filename, line_count))
        else:
            print(f"✗ {filename}: Not found - {description}")
    
    print("\n" + "="*50)
    
    if not found:
        print("\nNo datasets found!")
        print("\nTo get started:")
        print("1. Download a dataset from Kaggle")
        print("2. Place the CSV in:", DATA_DIR)
        print("3. Run this script again to verify")
    else:
        largest = max(found, key=lambda x: x[1])
        print(f"\nLargest dataset: {largest[0]} ({largest[1]:,} tracks)")
        print("\nTo use a different dataset, update ml-service/app/main.py")
    
    return found


def print_download_instructions():
    """Print instructions for downloading larger datasets."""
    print("""
╔══════════════════════════════════════════════════════════════════╗
║          DOWNLOAD LARGER SPOTIFY DATASET                         ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  OPTION 1: Spotify 1.2M Songs (Recommended)                      ║
║  ─────────────────────────────────────────                       ║
║  1. Go to: kaggle.com/datasets/rodolfofigueroa/spotify-12m-songs ║
║  2. Sign in to Kaggle (free account)                             ║
║  3. Click "Download" button                                      ║
║  4. Extract 'tracks_features.csv' (~400MB)                       ║
║  5. Place in: ml-service/data/tracks_features.csv                ║
║                                                                  ║
║  OPTION 2: 600K Tracks Dataset                                   ║
║  ─────────────────────────────────                               ║
║  kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset      ║
║                                                                  ║
║  OPTION 3: 30K Popular Songs (smallest, best match rate)         ║
║  ────────────────────────────────────────────────────            ║
║  kaggle.com/datasets/joebeachcapital/30000-spotify-songs         ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
""")


if __name__ == "__main__":
    print_download_instructions()
    check_datasets()
