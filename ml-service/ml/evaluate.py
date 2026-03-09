# ml-service/ml/evaluate.py
"""
Model Evaluation and Comparison Module

This module provides comprehensive evaluation of the ML-based mood classifier
against the original rule-based system.

Evaluation Metrics:
------------------
- Accuracy: Overall correct predictions
- F1-Score (macro): Average F1 across all classes
- F1-Score (weighted): Class-weighted average F1
- Confusion Matrix: Per-class prediction breakdown
- Cohen's Kappa: Agreement beyond chance

Comparison Analysis:
-------------------
- ML vs Rule-Based agreement rate
- Per-mood accuracy comparison
- Confidence calibration analysis
- Edge case analysis

Author: OnChord ML Team
"""

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    confusion_matrix,
    classification_report,
    cohen_kappa_score,
)
from typing import Dict, List, Tuple, Optional
import json
from pathlib import Path
import joblib

from .preprocessing import MOOD_CATEGORIES, AUDIO_FEATURES
from .pseudo_labeler import PseudoLabeler, compute_mood_scores, normalize_scores, MOOD_TO_INDEX, INDEX_TO_MOOD


class MoodClassifierEvaluator:
    """
    Evaluates and compares ML model vs rule-based system.
    
    Provides comprehensive metrics and analysis to validate
    the ML approach against the original heuristics.
    """
    
    def __init__(self, model_path: str, scaler_path: Optional[str] = None):
        """
        Initialize evaluator with trained model.
        
        Args:
            model_path: Path to saved model (.joblib)
            scaler_path: Optional path to scaler
        """
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path) if scaler_path else None
        self.mood_categories = MOOD_CATEGORIES
        
    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Make predictions with the ML model.
        
        Args:
            X: Feature matrix
            
        Returns:
            Tuple of (predicted_labels, probability_matrix)
        """
        if self.scaler is not None:
            X = self.scaler.transform(X)
        
        y_pred = self.model.predict(X)
        y_proba = self.model.predict_proba(X)
        
        return y_pred, y_proba
    
    def get_rule_based_predictions(
        self, 
        features_list: List[Dict[str, float]]
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Get predictions from the rule-based system.
        
        Args:
            features_list: List of feature dictionaries
            
        Returns:
            Tuple of (predicted_labels, probability_matrix)
        """
        labeler = PseudoLabeler()
        y_labels, y_probs, _ = labeler.generate_labels(features_list, verbose=False)
        return y_labels, y_probs
    
    def compute_metrics(
        self, 
        y_true: np.ndarray, 
        y_pred: np.ndarray
    ) -> Dict[str, float]:
        """
        Compute comprehensive evaluation metrics.
        
        Args:
            y_true: Ground truth labels
            y_pred: Predicted labels
            
        Returns:
            Dictionary of metrics
        """
        return {
            'accuracy': accuracy_score(y_true, y_pred),
            'f1_macro': f1_score(y_true, y_pred, average='macro'),
            'f1_weighted': f1_score(y_true, y_pred, average='weighted'),
            'precision_macro': precision_score(y_true, y_pred, average='macro'),
            'recall_macro': recall_score(y_true, y_pred, average='macro'),
            'kappa': cohen_kappa_score(y_true, y_pred),
        }
    
    def compare_ml_vs_rules(
        self,
        X: np.ndarray,
        features_list: List[Dict[str, float]],
        y_true: Optional[np.ndarray] = None
    ) -> Dict:
        """
        Compare ML model predictions vs rule-based predictions.
        
        Args:
            X: Feature matrix for ML model
            features_list: Raw features for rule-based system
            y_true: Optional ground truth (if available)
            
        Returns:
            Comparison results dictionary
        """
        # Get predictions from both systems
        ml_pred, ml_proba = self.predict(X)
        rule_pred, rule_proba = self.get_rule_based_predictions(features_list)
        
        # Agreement analysis
        agreement = (ml_pred == rule_pred).mean()
        
        # Per-mood agreement
        per_mood_agreement = {}
        for mood in self.mood_categories:
            idx = MOOD_TO_INDEX[mood]
            mask = rule_pred == idx
            if mask.sum() > 0:
                per_mood_agreement[mood] = (ml_pred[mask] == rule_pred[mask]).mean()
        
        # Disagreement analysis
        disagreement_mask = ml_pred != rule_pred
        disagreement_pairs = []
        for i in np.where(disagreement_mask)[0][:100]:  # Sample 100
            disagreement_pairs.append({
                'ml': INDEX_TO_MOOD[ml_pred[i]],
                'rule': INDEX_TO_MOOD[rule_pred[i]],
                'ml_conf': float(ml_proba[i].max()),
                'rule_conf': float(rule_proba[i].max()),
            })
        
        # Probability calibration (how confident each system is)
        ml_confidence = ml_proba.max(axis=1).mean()
        rule_confidence = rule_proba.max(axis=1).mean()
        
        results = {
            'agreement_rate': float(agreement),
            'ml_mean_confidence': float(ml_confidence),
            'rule_mean_confidence': float(rule_confidence),
            'per_mood_agreement': per_mood_agreement,
            'sample_disagreements': disagreement_pairs[:20],
        }
        
        # If ground truth available, compare accuracy
        if y_true is not None:
            ml_metrics = self.compute_metrics(y_true, ml_pred)
            rule_metrics = self.compute_metrics(y_true, rule_pred)
            
            results['ml_vs_ground_truth'] = ml_metrics
            results['rule_vs_ground_truth'] = rule_metrics
            results['ml_improvement'] = {
                metric: ml_metrics[metric] - rule_metrics[metric]
                for metric in ml_metrics
            }
        
        return results
    
    def analyze_edge_cases(
        self,
        X: np.ndarray,
        features_list: List[Dict[str, float]]
    ) -> Dict:
        """
        Analyze model behavior on edge cases.
        
        Edge cases include:
        - Extreme feature values
        - Ambiguous mood boundaries
        - Low-confidence predictions
        
        Args:
            X: Feature matrix
            features_list: Raw features
            
        Returns:
            Edge case analysis results
        """
        ml_pred, ml_proba = self.predict(X)
        rule_pred, rule_proba = self.get_rule_based_predictions(features_list)
        
        # Find low-confidence ML predictions
        ml_conf = ml_proba.max(axis=1)
        low_conf_mask = ml_conf < 0.3
        
        # Find high-energy + low-valence cases (ambiguous aggressive vs hype)
        df = pd.DataFrame(features_list)
        ambiguous_mask = (df['energy'] > 0.7) & (df['valence'] < 0.4)
        
        # Find extreme values
        extreme_mask = np.zeros(len(X), dtype=bool)
        for i, feat in enumerate(['danceability', 'energy', 'valence']):
            if feat in df.columns:
                extreme_mask |= (df[feat] > 0.95) | (df[feat] < 0.05)
        
        results = {
            'low_confidence_rate': float(low_conf_mask.mean()),
            'ambiguous_cases_rate': float(ambiguous_mask.mean()),
            'extreme_cases_rate': float(extreme_mask.mean()),
            'low_conf_ml_rule_agreement': float(
                (ml_pred[low_conf_mask] == rule_pred[low_conf_mask]).mean()
            ) if low_conf_mask.sum() > 0 else None,
        }
        
        return results


def generate_evaluation_report(
    evaluator: MoodClassifierEvaluator,
    X_test: np.ndarray,
    y_test: np.ndarray,
    features_list: List[Dict[str, float]],
    output_path: Optional[str] = None
) -> str:
    """
    Generate a comprehensive evaluation report.
    
    Args:
        evaluator: MoodClassifierEvaluator instance
        X_test: Test feature matrix
        y_test: Test labels
        features_list: Raw feature dictionaries
        output_path: Optional path to save report
        
    Returns:
        Report as formatted string
    """
    # Get predictions
    ml_pred, ml_proba = evaluator.predict(X_test)
    
    # Basic metrics
    metrics = evaluator.compute_metrics(y_test, ml_pred)
    
    # Compare with rules
    comparison = evaluator.compare_ml_vs_rules(X_test, features_list, y_test)
    
    # Edge case analysis
    edge_cases = evaluator.analyze_edge_cases(X_test, features_list)
    
    # Build report
    lines = [
        "=" * 70,
        "MOOD CLASSIFICATION - ML MODEL EVALUATION REPORT",
        "=" * 70,
        "",
        "1. MODEL PERFORMANCE METRICS",
        "-" * 40,
        f"Accuracy:           {metrics['accuracy']:.4f}",
        f"F1-Score (macro):   {metrics['f1_macro']:.4f}",
        f"F1-Score (weighted): {metrics['f1_weighted']:.4f}",
        f"Precision (macro):  {metrics['precision_macro']:.4f}",
        f"Recall (macro):     {metrics['recall_macro']:.4f}",
        f"Cohen's Kappa:      {metrics['kappa']:.4f}",
        "",
        "2. CLASSIFICATION REPORT",
        "-" * 40,
        classification_report(y_test, ml_pred, target_names=MOOD_CATEGORIES, digits=4),
        "",
        "3. ML vs RULE-BASED COMPARISON",
        "-" * 40,
        f"Agreement Rate:     {comparison['agreement_rate']:.4f}",
        f"ML Confidence:      {comparison['ml_mean_confidence']:.4f}",
        f"Rule Confidence:    {comparison['rule_mean_confidence']:.4f}",
        "",
        "Per-Mood Agreement:",
    ]
    
    for mood, agreement in comparison['per_mood_agreement'].items():
        lines.append(f"  {mood:12}: {agreement:.4f}")
    
    if 'ml_improvement' in comparison:
        lines.extend([
            "",
            "ML Improvement over Rules:",
        ])
        for metric, improvement in comparison['ml_improvement'].items():
            sign = "+" if improvement >= 0 else ""
            lines.append(f"  {metric:18}: {sign}{improvement:.4f}")
    
    lines.extend([
        "",
        "4. EDGE CASE ANALYSIS",
        "-" * 40,
        f"Low Confidence Rate:    {edge_cases['low_confidence_rate']:.4f}",
        f"Ambiguous Cases Rate:   {edge_cases['ambiguous_cases_rate']:.4f}",
        f"Extreme Values Rate:    {edge_cases['extreme_cases_rate']:.4f}",
    ])
    
    if edge_cases['low_conf_ml_rule_agreement'] is not None:
        lines.append(
            f"Low-Conf ML-Rule Agreement: {edge_cases['low_conf_ml_rule_agreement']:.4f}"
        )
    
    lines.extend([
        "",
        "5. CONFUSION MATRIX",
        "-" * 40,
    ])
    
    cm = confusion_matrix(y_test, ml_pred)
    cm_df = pd.DataFrame(cm, index=MOOD_CATEGORIES, columns=MOOD_CATEGORIES)
    lines.append(cm_df.to_string())
    
    lines.extend([
        "",
        "=" * 70,
        "END OF REPORT",
        "=" * 70,
    ])
    
    report = "\n".join(lines)
    
    if output_path:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            f.write(report)
        print(f"Report saved to: {output_path}")
    
    return report


if __name__ == "__main__":
    # Demo evaluation
    print("Run training first to generate model, then use this for evaluation.")
