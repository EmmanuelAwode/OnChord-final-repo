from pathlib import Path
import pandas as pd


def main() -> None:
    eval_path = Path("models/evaluation/taste_pair_predictions.csv")
    if not eval_path.exists():
        raise FileNotFoundError(f"Evaluation file not found: {eval_path}")

    df = pd.read_csv(eval_path)
    cols = [
        "user_a",
        "user_b",
        "model_similarity_0_100",
        "baseline_similarity_0_100",
        "abs_error",
    ]

    top2 = df.nlargest(2, "model_similarity_0_100")[cols].copy()
    bottom2 = df.nsmallest(2, "model_similarity_0_100")[cols].copy()

    # Round for cleaner presentation
    for c in ["model_similarity_0_100", "baseline_similarity_0_100", "abs_error"]:
        top2[c] = top2[c].round(2)
        bottom2[c] = bottom2[c].round(2)

    print("\nTWO SIMILAR PROFILE PAIRS")
    print(top2.to_string(index=False))

    print("\nTWO DISSIMILAR PROFILE PAIRS")
    print(bottom2.to_string(index=False))

    out_path = Path("models/evaluation/taste_profile_examples_2x2.csv")
    out_df = pd.concat(
        [
            top2.assign(category="similar"),
            bottom2.assign(category="dissimilar"),
        ],
        ignore_index=True,
    )
    out_df.to_csv(out_path, index=False)
    print(f"\nSaved report file: {out_path}")


if __name__ == "__main__":
    main()
