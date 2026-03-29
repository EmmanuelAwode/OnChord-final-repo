# Taste Match Model Evaluation and Method Rationale

Date: 2026-03-23

## 1) Evaluation using test data

### Test data used
- Source file: models/evaluation/taste_eval_sample_tracks.csv
- Tracks in evaluation sample: 20,000
- Track features used: danceability, energy, valence, acousticness, instrumentalness, liveness, speechiness, tempo

### Pair prediction test set
- Source file: models/evaluation/taste_pair_predictions.csv
- User pairs evaluated: 2,000
- Each pair has:
  - baseline similarity (raw feature space, 0-100)
  - model similarity (latent SVD space, 0-100)
  - absolute error

### Verified metrics (recomputed on 2026-03-23)
- MAE: 5.8907
- RMSE: 8.3708
- Median absolute error: 3.9236
- P90 absolute error: 13.7938
- Pearson correlation (baseline vs model): 0.9304
- Spearman correlation (baseline vs model): 0.9303

Interpretation:
- Correlations around 0.93 mean the latent model preserves similarity ordering well.
- MAE around 5.9 points on a 0-100 scale indicates reasonably close agreement with the baseline geometry.
- P90 error around 13.8 means most pairs are still reasonably aligned, with some harder edge cases.

### Existing larger-run reference (already saved in repository)
- Source: models/evaluation/taste_matching_evaluation.json
- Pairwise agreement (larger run):
  - Pearson: 0.9466
  - Spearman: 0.9472
  - MAE: 5.5132
  - RMSE: 7.9340
  - User pairs: 51,040
- Neighbor preservation:
  - Recall@10: 0.4590
  - Anchors: 200

Interpretation:
- The larger run confirms stable behavior and slightly better agreement than the smaller 2,000-pair slice.

## 2) Saved items

- models/evaluation/taste_eval_sample_tracks.csv
- models/evaluation/taste_pair_predictions.csv
- models/evaluation/taste_matching_evaluation.json
- models/evaluation/taste_model_method_notes.txt
- models/taste_model_metadata.json
- models/evaluation/taste_model_report_ready_2026-03-23.md (this file)

## 3) Simple explanation of algorithm and unsupervised choices

### Why TruncatedSVD for taste matching
- Goal: turn 8 noisy audio features into a smaller set of hidden "taste factors".
- TruncatedSVD finds structure automatically from large unlabeled track data.
- This helps capture broad patterns like energy profile, mood tendency, acoustic-vs-electronic preference, etc.

Why it was chosen over simpler alternatives:
- Raw-feature cosine only: easy, but keeps noise and feature redundancy.
- PCA (Principal Component Analysis): good compression, but SVD works very well for large sparse/structured matrices and is common in recommender systems.
- K-means clustering only: gives hard clusters, but taste is continuous; embeddings are better for nuanced similarity.

### Why unsupervised training
- We do not have a large trusted label set of "these two users are compatible" vs "not compatible".
- Supervised models need those labels and can overfit if labels are small/noisy.
- Unsupervised learning uses the full catalog immediately and learns from data distribution itself.

### Why cosine similarity in latent space
- Cosine compares direction, not magnitude, so it focuses on taste pattern shape.
- In latent space, this is more robust than using raw features directly.

### Why we still keep hybrid/fallback behavior
- Some Spotify track IDs may be missing in the local embedding store.
- The enhanced route can fall back to artist/genre centroids and overlap signals.
- This improves coverage in real user traffic where IDs are imperfect.

## Recommended sentence for your report

"We selected an unsupervised TruncatedSVD latent-factor model for taste matching because the project lacked reliable compatibility labels at scale. This method learned compact taste embeddings from 1.2M+ tracks and achieved strong agreement with baseline similarity geometry (Pearson ~0.93 to ~0.95, MAE ~5.5 to ~5.9 on a 0-100 scale), while preserving nearest-neighbor structure (Recall@10 ~0.46)."
