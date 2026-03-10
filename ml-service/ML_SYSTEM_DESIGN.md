# OnChord ML Service: System Design

## Table of Contents
1. [System Overview](#system-overview)
2. [Taste Matching (Machine Learning)](#taste-matching-machine-learning)
3. [Mood Classification (Rule-Based)](#mood-classification-rule-based)
4. [API Endpoints](#api-endpoints)
5. [Technical Details](#technical-details)

---

## System Overview

This ML service provides two core features for the OnChord music social app:

| Feature | Type | Algorithm | Purpose |
|---------|------|-----------|---------|
| **Taste Matching** | ✅ Machine Learning | TruncatedSVD | Compare music taste between users |
| **Mood Classification** | ⚠️ Rule-Based Heuristics | Weighted formulas | Classify tracks into mood categories |

### Important: Spotify API Limitation

> **Dev Mode Restriction**: Spotify restricts access to playlist data and audio features for development apps. This system uses the user's **Top 50 Tracks** (`/v1/me/top/tracks`) instead, which provides a representative sample of listening preferences.

### Dataset
- **Source**: Spotify audio features dataset
- **Size**: 1,204,025 tracks
- **Features**: 8 audio characteristics per track

| Feature | Range | Description |
|---------|-------|-------------|
| `danceability` | 0-1 | How suitable for dancing based on tempo, rhythm, beat strength |
| `energy` | 0-1 | Perceptual measure of intensity and activity |
| `valence` | 0-1 | Musical positiveness (high = happy, low = sad) |
| `acousticness` | 0-1 | Confidence that the track is acoustic |
| `instrumentalness` | 0-1 | Predicts whether a track contains no vocals |
| `liveness` | 0-1 | Detects presence of audience in recording |
| `speechiness` | 0-1 | Presence of spoken words |
| `tempo` | BPM | Overall estimated tempo (40-220 BPM) |

---

## Taste Matching (Machine Learning)

### What Makes This ML

The taste matching system uses **TruncatedSVD (Singular Value Decomposition)** - a real machine learning algorithm. This is the same technique used by Netflix and Spotify for collaborative filtering.

**Why this IS machine learning:**
- Learns a projection matrix W from 1.2M tracks (training)
- W captures statistical patterns not explicitly programmed
- Model is saved/loaded - trained once, used many times
- Projects user profiles into learned latent space

### Algorithm: TruncatedSVD

TruncatedSVD (Truncated Singular Value Decomposition) is an unsupervised machine learning algorithm that finds hidden patterns in data by compressing high-dimensional features into a smaller "latent space."

#### How It Works (Simple Explanation)

Imagine each song as a point in 8-dimensional space (one axis per audio feature). TruncatedSVD finds the **5 most important directions** that capture how songs vary:

```
Audio Features (8D)  →  Learned Transformation  →  Latent Space (5D)

[danceability ]                                    [taste_dim_1] ← e.g., "electronic vs acoustic"
[energy       ]         ╔════════════════╗         [taste_dim_2] ← e.g., "aggressive vs mellow"
[valence      ]    ──── ║ Learned Matrix ║ ────▶   [taste_dim_3] ← e.g., "party vs introspective"
[acousticness ]         ║    W (8×5)     ║         [taste_dim_4]
[instrumentalness]      ╚════════════════╝         [taste_dim_5]
[liveness     ]
[speechiness  ]
[tempo        ]
```

#### What Gets Learned

The algorithm analyzes 1.2 million songs and learns:
- **Which features matter together** (e.g., high energy often comes with high danceability)
- **Hidden "taste dimensions"** that compress the 8 features into 5 meaningful factors
- **A transformation matrix W** that converts any song's features into this latent space

#### The Math (Simplified)

```
Training:
  1. Stack all 1.2M songs into matrix X (1.2M × 8)
  2. SVD decomposes X ≈ U × Σ × Vᵀ
  3. Keep only top 5 components → transformation matrix W

Inference:
  song_embedding = song_features × W  →  5-dimensional vector
```

#### Why 5 Components?

| Components | Variance Captured | Trade-off |
|------------|------------------|-----------|
| 3 | 62.9% | Too much information lost |
| **5** | **83.3%** | **Good balance** |
| 8 | 100% | No compression (defeats purpose) |

5 components capture 83.3% of the information in 8 features - a good compression ratio that removes noise while preserving signal.

### Training Statistics

| Metric | Value |
|--------|-------|
| Training tracks | 1,204,025 |
| Input features | 8 |
| Latent components | 5 |
| Variance explained | **83.3%** |

Component variance breakdown:
- Component 1: 33.5% (dominant taste factor)
- Component 2: 15.0%
- Component 3: 14.4%
- Component 4: 10.7%
- Component 5: 9.8%

### How Similarity is Computed

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER A (from Spotify)              USER B (from Spotify)          │
│  ───────────────────               ───────────────────             │
│  Top Artists:                       Top Artists:                   │
│  - Kendrick Lamar                   - J. Cole                      │
│  - Drake                            - Drake                        │
│  - J. Cole                          - Tyler, The Creator           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: Look Up Artist Centroids (Pre-Computed from 1.2M Tracks)  │
│  ─────────────────────────────────────────────────────────────────  │
│  "Kendrick Lamar" → [0.72, -0.13, 0.45, -0.28, 0.19] (5D vector)   │
│  "Drake"          → [0.68, -0.08, 0.51, -0.21, 0.24]               │
│  "J. Cole"        → [0.65, -0.11, 0.42, -0.25, 0.17]               │
│  (average of all their songs in the dataset)                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: Average Vectors → User Taste Profile                      │
│  ──────────────────────────────────────────                        │
│  User A: mean([Kendrick, Drake, J.Cole]) = [0.68, -0.11, 0.46...]  │
│  User B: mean([J.Cole, Drake, Tyler])    = [0.64, -0.09, 0.48...]  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: Compare Using Cosine Similarity                           │
│  ───────────────────────────────────────                           │
│                                                                     │
│              A · B                                                  │
│  cosine = ─────────── = 0.94  →  94% audio similarity              │
│           |A| × |B|                                                 │
│                                                                     │
│  (Measures angle between vectors: 1.0 = identical, 0 = unrelated)  │
└─────────────────────────────────────────────────────────────────────┘
```

```python
def compute_similarity(user1_tracks, user2_tracks):
    # 1. Get track embeddings from learned model
    user1_vectors = [svd.transform(track) for track in user1_tracks]
    user2_vectors = [svd.transform(track) for track in user2_tracks]
    
    # 2. Average to get user taste vector
    user1_taste = mean(user1_vectors)
    user2_taste = mean(user2_vectors)
    
    # 3. Cosine similarity in latent space
    similarity = cosine_similarity(user1_taste, user2_taste)
    return similarity * 100  # 0-100 scale
```

### Overall Score Formula

The frontend displays an "overall" match percentage that combines multiple signals:

```
Overall = Base + Track Bonus + Album Bonus + Artist Bonus + (Audio × 0.25)

Where:
- Base Score         = 5  (everyone starts with 5%)
- Shared Track Bonus = 15 per shared track (max 30)
- Shared Album Bonus = 10 per shared album (max 20)  
- Shared Artist Bonus = 5 per shared artist (max 20)
- Audio Similarity   = ML cosine similarity × 0.25 (contributes up to 25%)

Maximum possible: 5 + 30 + 20 + 20 + 25 = 100%
```

**Why only 25% for ML audio?**  
Shared favorites are explicit signals ("we both love this exact thing"), while audio similarity is implicit ("our tastes feel similar"). The formula prioritizes concrete matches.

### Fallback System (For Artists Not in Dataset)

Not all artists appear in our 1.2M track dataset. The system uses a **3-tier fallback**:

```
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 1: Artist Centroids (137,043 artists)                        │
│  ──────────────────────────────────────────                        │
│  Look up pre-computed average embedding for each artist            │
│  Example: "Drake" → [0.68, -0.08, 0.51, -0.21, 0.24]              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    Artist NOT found?
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 2: Genre Centroids (26 genres)                               │
│  ───────────────────────────────────                               │
│  Use ARTIST_GENRE_MAP to find genre, then use genre's average      │
│  Example: "Obscure Rapper" → Hip-Hop → [0.65, -0.05, 0.48...]     │
│                                                                     │
│  ARTIST_GENRE_MAP includes 500+ artist → genre mappings:           │
│  - "kendrick lamar" → "hip-hop"                                    │
│  - "metallica" → "metal"                                           │
│  - "brian eno" → "ambient"                                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    Genre mapping NOT found?
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 3: Skip Artist                                               │
│  ───────────────────                                               │
│  If artist has no centroid and no genre mapping, skip them.        │
│  Compare using remaining artists only.                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Saved Model Files

```
models/
├── taste_svd.joblib           # Learned SVD transformation matrix (5 components)
├── taste_scaler.joblib        # Feature scaler (means & stds for 8 features)
├── taste_embeddings.npz       # Pre-computed track embeddings (1.2M × 5)
├── artist_centroids.npz       # Pre-computed artist embeddings (137K artists)
├── genre_centroids.npz        # Pre-computed genre embeddings (26 genres)
└── taste_model_metadata.json  # Training statistics
```

---

## Mood Classification (Rule-Based)

### Important Clarification

> **This is NOT machine learning.** The mood classifier uses manually-crafted weighted formulas to score tracks. While there is a trained DecisionTree model, it was trained on pseudo-labels generated by these same rules - meaning it's just learning to replicate the heuristics.

### Why Rule-Based?

- No ground truth mood labels exist in the Spotify dataset
- Collecting 1.2M human mood annotations would be prohibitively expensive
- Rule-based approach encodes music theory and psychoacoustic principles

### The 7 Mood Categories

| Mood | Description | Key Features |
|------|-------------|--------------|
| **Aggressive** | Intense, angry, hard-hitting | High energy, low valence, high tempo |
| **Chill** | Relaxed, calm, ambient | Low energy, high acousticness |
| **Hype** | Exciting, pump-up, energetic | High energy, high danceability |
| **Melancholic** | Sad, introspective, emotional | Low valence, low energy |
| **Happy** | Uplifting, positive, joyful | High valence, moderate energy |
| **Focus** | Concentration, study-friendly | High instrumentalness, low speechiness |
| **Party** | Dance, celebration, social | High danceability, high energy, high valence |

### Scoring Formulas

```python
# Normalize tempo to 0-1 (range: 60-200 BPM)
tempo_norm = (tempo - 60) / 140

# Focus energy peaks at 0.5 (moderate energy is best for concentration)
# Formula: 1.0 when energy=0.5, 0.0 when energy=0 or energy=1
focus_energy = 1 - abs(energy - 0.5) * 2

# Each mood gets a weighted score (0-100)
scores = {
    "Aggressive": (energy × 0.4 + (1 - valence) × 0.3 + tempo_norm × 0.3) × 100,
    "Chill":      ((1 - energy) × 0.3 + valence × 0.2 + (1 - tempo_norm) × 0.25 + acousticness × 0.25) × 100,
    "Hype":       (energy × 0.35 + tempo_norm × 0.3 + danceability × 0.35) × 100,
    "Melancholic":((1 - valence) × 0.4 + (1 - energy) × 0.3 + acousticness × 0.3) × 100,
    "Happy":      (valence × 0.4 + energy × 0.25 + danceability × 0.35) × 100,
    "Focus":      (instrumentalness × 0.35 + (1 - speechiness) × 0.35 + focus_energy × 0.3) × 100,
    "Party":      (danceability × 0.35 + energy × 0.35 + valence × 0.3) × 100,
}

# Dominant mood = highest score
dominant_mood = max(scores, key=scores.get)
```

### Where Do These Weights Come From?

The formulas are based on **music psychology research** and **Spotify's feature definitions** - NOT learned from data.

#### Music Psychology Mapping

Each mood has well-documented musical characteristics from research:

| Mood | Musical Traits (from research) | Key Features |
|------|-------------------------------|--------------|
| **Aggressive** | Loud, fast, minor key, distorted | High energy, low valence, fast tempo |
| **Chill** | Soft, slow, acoustic, relaxed | Low energy, slow tempo, high acousticness |
| **Hype** | Fast, loud, rhythmic | High energy, fast tempo, high danceability |
| **Melancholic** | Sad, quiet, slow | Low valence, low energy |
| **Happy** | Upbeat, major key, bouncy | High valence, high danceability |
| **Focus** | No vocals, moderate intensity | High instrumentalness, low speechiness |
| **Party** | Danceable, energetic, positive | High danceability, energy, valence |

#### Weight Justification

**Why 0.3, 0.35, 0.4?**

- **Most important feature** for that mood → 0.4 (40%)
- **Secondary features** → 0.3-0.35
- All weights sum to ~1.0 for comparable scores

**Example: Aggressive formula**
```
Aggressive = (energy × 0.4) + ((1-valence) × 0.3) + (tempo × 0.3)
             └─────────────┘   └──────────────────┘   └──────────┘
                  40%                   30%               30%
             Loudness/intensity    Unhappy sound      Fast pace
```

High energy is the strongest signal for aggression (40%), while negative emotion and fast tempo are secondary indicators (30% each).

**Validation:** Metallica's "Master of Puppets" has energy=0.98, valence=0.19, tempo=212 → correctly classifies as **Aggressive** ✓

### How Classification Works (Step by Step)

```
┌─────────────────────────────────────────────────────────────────────┐
│  INPUT: User's Playlist (20 tracks with audio features)            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: Get Audio Features for Each Track                         │
│  ───────────────────────────────────────────                        │
│  Track 1: energy=0.9, valence=0.7, danceability=0.8, tempo=150...  │
│  Track 2: energy=0.85, valence=0.6, danceability=0.75, tempo=140.. │
│  ... (20 tracks)                                                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: Calculate Averages Across All Tracks                      │
│  ─────────────────────────────────────────────                      │
│  Average Energy: 0.88                                               │
│  Average Valence: 0.62                                              │
│  Average Danceability: 0.79                                         │
│  Average Tempo: 148 BPM                                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: Run ALL 7 Formulas                                         │
│  ──────────────────────────                                         │
│  Aggressive = (0.88×0.4) + ((1-0.62)×0.3) + (0.63×0.3) = 58.6%     │
│  Chill      = ((1-0.88)×0.3) + (0.62×0.2) + ...        = 28.1%     │
│  Hype       = (0.88×0.35) + (0.63×0.3) + (0.79×0.35)   = 77.3%  ←  │
│  Happy      = (0.62×0.4) + (0.88×0.25) + (0.79×0.35)   = 74.5%     │
│  Party      = (0.79×0.35) + (0.88×0.35) + (0.62×0.3)   = 77.1%     │
│  ...                                                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: Normalize to Percentages (sum = 100%)                      │
│  ─────────────────────────────────────────────                      │
│  Hype: 20.8% (DOMINANT), Party: 20.7%, Happy: 20.0%...             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  RESULT: 🟠 "Hype" playlist                                         │
│  Insight: "High energy - great for workouts!"                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Genre-Based Fallback

When Spotify audio features are unavailable (API restrictions), the system uses **pre-computed genre-to-mood mappings** learned from 232,000 songs:

```python
HARDCODED_GENRE_MOODS = {
    # High confidence (>60% agreement in training data)
    "Opera":       {"Chill": 97.5%},
    "Classical":   {"Chill": 90.5%},
    "Soundtrack":  {"Chill": 77.2%},
    "Ska":         {"Happy": 56.0%},
    
    # Medium confidence (40-60%)
    "Hip-Hop":     {"Hype": 41.1%, "Party": 22%, "Aggressive": 20%},
    "Rock":        {"Happy": 38.2%, "Hype": 27%, "Aggressive": 15%},
    "Pop":         {"Hype": 36.3%, "Happy": 28%, "Party": 18%},
    "Reggaeton":   {"Party": 36.7%, "Hype": 29%},
    
    # Low confidence (<35% - ambiguous genres)
    "Indie":       {"Hype": 25.8%, "Chill": 23%, "Happy": 21%},
    "Electronic":  {"Hype": 29.2%, "Party": 22%, "Chill": 19%},
}
```

These percentages were derived by:
1. Taking songs with both genre labels AND audio features
2. Classifying each song using the rule-based system
3. Counting "What % of Hip-Hop songs are classified as Hype?"
}

# Dominant mood = highest score
dominant_mood = max(scores, key=scores.get)
```

### Why Not Train a "Real" ML Mood Classifier?

The limitation is **circular training**:

```
┌─────────────────────────────────────────────────────────────┐
│  The Problem with Pseudo-Labeling                          │
│                                                             │
│  Rules generate labels  ──▶  ML learns rules               │
│         ↑                            │                      │
│         └────────────────────────────┘                      │
│                                                             │
│  Result: ML just replicates the rules (99.99% accuracy)    │
│  This provides NO improvement over using rules directly    │
└─────────────────────────────────────────────────────────────┘
```

The DecisionTree achieves 99.99% accuracy because it's learning to copy the rule-based system - not learning genuine mood patterns from data.

---

## API Endpoints

The ML service runs as a FastAPI application on port 8000.

### Health Check
```bash
GET /health

# Response:
{
  "status": "ok",
  "taste_model_loaded": true,
  "ml_taste_model_loaded": true,
  "mood_classifier_loaded": true,
  "ml_mood_model_loaded": true,
  "inference_mode": "ml"
}
```

### Taste Similarity (ML-Based)
```bash
POST /taste/similarity

# Request:
{
  "user1_tracks": ["track_id_1", "track_id_2", ...],
  "user2_tracks": ["track_id_3", "track_id_4", ...]
}

# Response:
{
  "similarity": 78.5,  # 0-100 scale
  "shared_tracks": 3,
  "user1_known": 45,
  "user2_known": 38
}
```

### Enhanced Taste Matching
```bash
POST /taste/enhanced-similarity

# Request (includes tracks, albums, and artists):
{
  "user1_track_ids": ["track1", "track2"],
  "user2_track_ids": ["track3", "track4"],
  "user1_artists": ["artist1", "artist2"],
  "user2_artists": ["artist3"]
}

# Response:
{
  "overall_similarity": 72.3,
  "audio_similarity": 65.4,
  "shared_tracks": [],
  "shared_artists": ["artist2"],
  "breakdown": {
    "audio_score": 65.4,
    "track_bonus": 0,
    "artist_bonus": 5
  }
}
```

### Mood Classification (Rule-Based)
```bash
POST /predict/mood

# Request (single track):
{
  "features": {
    "energy": 0.82,
    "valence": 0.34,
    "danceability": 0.65,
    "tempo": 145,
    "acousticness": 0.12,
    "instrumentalness": 0.0,
    "speechiness": 0.08,
    "liveness": 0.15
  }
}

# Response:
{
  "dominant_mood": "Aggressive",
  "mood_scores": {
    "Aggressive": 68.2,
    "Hype": 61.4,
    "Party": 52.1,
    "Happy": 41.3,
    "Chill": 28.5,
    "Focus": 35.2,
    "Melancholic": 38.9
  }
}
```

---

## Technical Details

### Module Structure

```
ml-service/
├── app/
│   ├── main.py               # FastAPI service
│   ├── ml_taste_model.py     # TruncatedSVD taste matching (ML)
│   ├── mood_classifier.py    # Rule-based mood scoring
│   └── spotify_taste_model.py# Baseline cosine similarity
├── ml/
│   ├── preprocessing.py      # Data loading and cleaning
│   ├── pseudo_labeler.py     # Rule-based label generation
│   ├── train_model.py        # Model training pipeline
│   ├── model_loader.py       # Production inference
│   └── genre_mood_classifier.py  # Artist-genre fallback
├── models/
│   ├── taste_svd.joblib      # Learned SVD matrix (ML)
│   ├── taste_scaler.joblib   # Feature normalizer
│   ├── taste_embeddings.npz  # Pre-computed embeddings
│   ├── scaler.joblib         # Mood classifier scaler
│   └── genre_mood_model.json # Artist-genre mappings
├── data/
│   └── tracks_features.csv   # 1.2M track dataset
└── run_training.py           # Training entry point
```

### Running the Service

```bash
cd ml-service

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Music Personality Traits

The system also derives personality traits from listening patterns:

```python
# Derived from average audio features
{
  "energy_level": "High Energy",      # Based on energy
  "mood_preference": "Upbeat",        # Based on valence
  "production_style": "Electronic",   # Based on acousticness
  "vocal_preference": "Vocal-Heavy",  # Based on instrumentalness
  "dance_factor": "Dance-Ready",      # Based on danceability
  "tempo_preference": "Fast-Paced",   # Based on tempo
  "scores": {
    "energy": 78,
    "positivity": 62,
    "danceability": 71,
    "acousticness": 23,
    "instrumentalness": 8
  }
}
```

---

## Summary

### System Comparison

| Component | Technology | Learning Type | Data Source |
|-----------|------------|---------------|-------------|
| **Taste Matching** | TruncatedSVD | ✅ Unsupervised ML | 1.2M track embeddings |
| **Artist Fallback** | Pre-computed centroids | ✅ ML-derived | 137K artist averages |
| **Genre Fallback** | Pre-computed centroids | ✅ ML-derived | 26 genre averages |
| **Mood Classification** | Weighted formulas | ❌ Rule-based heuristics | Music psychology |
| **Genre-Mood Fallback** | Lookup table | ❌ Statistical mapping | 232K labeled songs |
| **Music Personality** | Feature averaging | ❌ Statistical aggregation | User's top tracks |

### Key Technical Decisions

1. **Why TruncatedSVD for taste matching?**
   - Efficient dimensionality reduction (8D → 5D)
   - Captures 83.3% of variance with 5 components
   - Same algorithm family used by Netflix/Spotify recommendations

2. **Why rule-based for mood classification?**
   - No ground truth mood labels exist
   - Manual labeling of 1.2M tracks is infeasible
   - Music psychology provides well-studied feature-mood mappings

3. **Why the multi-tier fallback system?**
   - Not all artists appear in the 1.2M track dataset
   - Artist centroids cover 137K artists
   - Genre fallback catches remaining artists via ARTIST_GENRE_MAP
   - Ensures the system always returns a result

### Validation

The taste matching system was validated with test users:
- Same artists (User A: Kendrick, Drake, J.Cole vs User B: same) → **100% similarity** ✓
- Same genre, different artists (Hip-Hop vs Hip-Hop) → **~99% similarity** ✓
- Opposite genres (Metal vs Ambient) → **~32% similarity** ✓

---

*Document Version: 3.0*  
*Last Updated: March 2026*
