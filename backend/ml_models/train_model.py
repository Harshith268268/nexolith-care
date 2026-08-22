"""
Medical ML Model Training Pipeline
Trains a Machine Learning model to classify medical lab parameter results into
Normal, Borderline, or Critical statuses based on clinical reference bounds
and engineered statistical features.
"""

import os
import sys
import json
import logging
import numpy as np
import pandas as pd
from pathlib import Path

# ML Imports
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support, f1_score
import joblib

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_model")

# Base directory setup
BASE_DIR = Path(__file__).resolve().parent.parent

# Clinical Reference Range Definition for Supported Lab Parameters
CLINICAL_REFERENCE_SPECS = [
    # parameter, lower_bound, upper_bound, unit, low_critical_mult, high_critical_mult
    {"parameter": "Hemoglobin", "lower": 13.0, "upper": 17.0, "unit": "g/dL", "lower_is_bad": True, "upper_is_bad": False},
    {"parameter": "Fasting Glucose", "lower": 70.0, "upper": 99.0, "unit": "mg/dL", "lower_is_bad": True, "upper_is_bad": True},
    {"parameter": "HbA1c", "lower": 4.0, "upper": 5.6, "unit": "%", "lower_is_bad": False, "upper_is_bad": True},
    {"parameter": "Total Cholesterol", "lower": 125.0, "upper": 199.0, "unit": "mg/dL", "lower_is_bad": False, "upper_is_bad": True},
    {"parameter": "LDL Cholesterol", "lower": 50.0, "upper": 99.0, "unit": "mg/dL", "lower_is_bad": False, "upper_is_bad": True},
    {"parameter": "HDL Cholesterol", "lower": 40.0, "upper": 75.0, "unit": "mg/dL", "lower_is_bad": True, "upper_is_bad": False},
    {"parameter": "Triglycerides", "lower": 50.0, "upper": 149.0, "unit": "mg/dL", "lower_is_bad": False, "upper_is_bad": True},
    {"parameter": "WBC Count", "lower": 4.5, "upper": 11.0, "unit": "10^3/uL", "lower_is_bad": True, "upper_is_bad": True},
    {"parameter": "Platelets", "lower": 150.0, "upper": 450.0, "unit": "10^3/uL", "lower_is_bad": True, "upper_is_bad": True},
    {"parameter": "RBC Count", "lower": 4.2, "upper": 5.8, "unit": "10^6/uL", "lower_is_bad": True, "upper_is_bad": False},
    {"parameter": "Creatinine", "lower": 0.6, "upper": 1.2, "unit": "mg/dL", "lower_is_bad": True, "upper_is_bad": True},
    {"parameter": "BUN", "lower": 7.0, "upper": 20.0, "unit": "mg/dL", "lower_is_bad": True, "upper_is_bad": True},
    {"parameter": "ALT (SGPT)", "lower": 7.0, "upper": 45.0, "unit": "U/L", "lower_is_bad": False, "upper_is_bad": True},
    {"parameter": "AST (SGOT)", "lower": 8.0, "upper": 40.0, "unit": "U/L", "lower_is_bad": False, "upper_is_bad": True},
    {"parameter": "TSH", "lower": 0.4, "upper": 4.0, "unit": "mIU/L", "lower_is_bad": True, "upper_is_bad": True},
    {"parameter": "Vitamin D", "lower": 30.0, "upper": 100.0, "unit": "ng/mL", "lower_is_bad": True, "upper_is_bad": False},
    {"parameter": "Vitamin B12", "lower": 200.0, "upper": 900.0, "unit": "pg/mL", "lower_is_bad": True, "upper_is_bad": False},
    {"parameter": "Systolic BP", "lower": 90.0, "upper": 119.0, "unit": "mmHg", "lower_is_bad": True, "upper_is_bad": True},
    {"parameter": "Diastolic BP", "lower": 60.0, "upper": 79.0, "unit": "mmHg", "lower_is_bad": True, "upper_is_bad": True},
    {"parameter": "Calcium", "lower": 8.5, "upper": 10.2, "unit": "mg/dL", "lower_is_bad": True, "upper_is_bad": True},
    {"parameter": "Potassium", "lower": 3.5, "upper": 5.1, "unit": "mEq/L", "lower_is_bad": True, "upper_is_bad": True},
    {"parameter": "Sodium", "lower": 135.0, "upper": 145.0, "unit": "mEq/L", "lower_is_bad": True, "upper_is_bad": True},
]


def generate_synthetic_dataset(samples_per_param: int = 150) -> pd.DataFrame:
    """
    Generates a medically grounded dataset based on standard clinical reference specifications.
    Distributes values across Normal (60%), Borderline (25%), and Critical (15%) states.
    """
    np.random.seed(42)
    data = []

    for spec in CLINICAL_REFERENCE_SPECS:
        param = spec["parameter"]
        low = spec["lower"]
        high = spec["upper"]
        unit = spec["unit"]
        span = high - low

        # 1. Normal values (within range [low, high])
        n_normal = int(samples_per_param * 0.60)
        normal_vals = np.random.uniform(low + 0.05 * span, high - 0.05 * span, n_normal)
        for v in normal_vals:
            data.append({
                "parameter": param,
                "value": round(float(v), 2),
                "lower_bound": low,
                "upper_bound": high,
                "unit": unit,
                "status": "Normal"
            })

        # 2. Borderline values (slightly outside range: [low - 0.15*span, low] or [high, high + 0.15*span])
        n_borderline = int(samples_per_param * 0.25)
        for _ in range(n_borderline):
            if np.random.rand() > 0.5 and spec["upper_is_bad"]:
                val = np.random.uniform(high, high + 0.20 * span)
            else:
                val = np.random.uniform(max(0.0, low - 0.20 * span), low)
            data.append({
                "parameter": param,
                "value": round(float(val), 2),
                "lower_bound": low,
                "upper_bound": high,
                "unit": unit,
                "status": "Borderline"
            })

        # 3. Critical values (significantly outside range: > high + 0.20*span or < low - 0.20*span)
        n_critical = samples_per_param - n_normal - n_borderline
        for _ in range(n_critical):
            if np.random.rand() > 0.5 and spec["upper_is_bad"]:
                val = np.random.uniform(high + 0.21 * span, high + 0.80 * span)
            else:
                val = np.random.uniform(max(0.0, low - 0.70 * span), max(0.0, low - 0.21 * span))
            data.append({
                "parameter": param,
                "value": round(float(val), 2),
                "lower_bound": low,
                "upper_bound": high,
                "unit": unit,
                "status": "Critical"
            })

    df = pd.DataFrame(data)
    logger.info(f"Generated synthetic dataset with {len(df)} total samples across {len(CLINICAL_REFERENCE_SPECS)} parameters.")
    return df


def engineer_features(df: pd.DataFrame, encoder: LabelEncoder = None, scaler: StandardScaler = None, is_training: bool = True):
    """
    Engineers normalized, scale-invariant medical parameters for machine learning classification.
    """
    df = df.copy()

    # Numerical feature calculations
    span = np.maximum(df["upper_bound"] - df["lower_bound"], 1e-5)
    mid = (df["lower_bound"] + df["upper_bound"]) / 2.0

    # 1. Position inside reference span (0.0 at lower bound, 1.0 at upper bound)
    df["normalized_pos"] = (df["value"] - df["lower_bound"]) / span

    # 2. Lower bound deviation ratio (0 if value >= lower_bound)
    df["deviation_lower"] = np.maximum(0.0, df["lower_bound"] - df["value"]) / np.maximum(df["lower_bound"], 1e-5)

    # 3. Upper bound deviation ratio (0 if value <= upper_bound)
    df["deviation_upper"] = np.maximum(0.0, df["value"] - df["upper_bound"]) / np.maximum(df["upper_bound"], 1e-5)

    # 4. Relative distance from midpoint
    df["relative_mid_delta"] = np.abs(df["value"] - mid) / np.maximum(mid, 1e-5)

    # 5. Binary range boundary flags
    df["is_below_lower"] = (df["value"] < df["lower_bound"]).astype(float)
    df["is_above_upper"] = (df["value"] > df["upper_bound"]).astype(float)

    # 6. Parameter identity encoding
    if is_training:
        encoder = LabelEncoder()
        df["param_code"] = encoder.fit_transform(df["parameter"])
    else:
        # Handle unseen parameters during inference gracefully
        known_classes = list(encoder.classes_)
        df["param_code"] = df["parameter"].apply(lambda p: encoder.transform([p])[0] if p in known_classes else 0)

    feature_cols = [
        "normalized_pos",
        "deviation_lower",
        "deviation_upper",
        "relative_mid_delta",
        "is_below_lower",
        "is_above_upper",
        "param_code"
    ]

    X = df[feature_cols]

    if is_training:
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
    else:
        X_scaled = scaler.transform(X)

    return X_scaled, encoder, scaler, feature_cols


def run_training_pipeline():
    """
    Main training pipeline: dataset creation, feature engineering, train/test split,
    model comparison, metric calculation, and joblib serialization.
    """
    logger.info("--- Starting Medical ML Model Training ---")

    # Step 1: Dataset Creation
    df = generate_synthetic_dataset(samples_per_param=200)

    # Save dataset CSV for documentation and auditability
    data_dir = BASE_DIR / "ml_models"
    data_dir.mkdir(parents=True, exist_ok=True)
    csv_path = data_dir / "medical_training_data.csv"
    df.to_csv(csv_path, index=False)
    logger.info(f"Saved dataset to {csv_path}")

    # Step 2: Feature Engineering & Preprocessing
    X, encoder, scaler, feature_cols = engineer_features(df, is_training=True)
    y = df["status"].values

    # Step 3: Stratified Train/Test Split (80/20 split)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    logger.info(f"Train set size: {len(X_train)} samples | Test set size: {len(X_test)} samples")

    # Step 4: Candidate Models
    models = {
        "RandomForest": RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42),
        "GradientBoosting": GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42),
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42)
    }

    results = {}
    best_model = None
    best_model_name = ""
    best_macro_f1 = -1.0

    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        acc = accuracy_score(y_test, y_pred)
        prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="macro")

        results[name] = {
            "accuracy": round(float(acc), 4),
            "precision_macro": round(float(prec), 4),
            "recall_macro": round(float(rec), 4),
            "f1_macro": round(float(f1), 4),
        }
        logger.info(f"Model [{name}] -> Acc: {acc:.4f} | Macro F1: {f1:.4f}")

        if f1 > best_macro_f1:
            best_macro_f1 = f1
            best_model = model
            best_model_name = name

    logger.info(f"Selected Best Model: [{best_model_name}] with Macro F1: {best_macro_f1:.4f}")

    # Step 5: Full Evaluation on Test Set for Selected Best Model
    y_test_pred = best_model.predict(X_test)
    class_report = classification_report(y_test, y_test_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_test_pred, labels=["Normal", "Borderline", "Critical"])

    metrics = {
        "best_model": best_model_name,
        "test_accuracy": round(float(accuracy_score(y_test, y_test_pred)), 4),
        "macro_f1": round(float(f1_score(y_test, y_test_pred, average="macro")), 4),
        "weighted_f1": round(float(f1_score(y_test, y_test_pred, average="weighted")), 4),
        "candidate_comparison": results,
        "classification_report": class_report,
        "confusion_matrix": {
            "labels": ["Normal", "Borderline", "Critical"],
            "matrix": cm.tolist()
        }
    }

    # Save metrics JSON
    metrics_path = data_dir / "evaluation_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    logger.info(f"Saved evaluation metrics to {metrics_path}")

    # Step 6: Save Trained Model and Preprocessing Pipeline
    model_path = data_dir / "medical_status_model.joblib"
    prep_path = data_dir / "preprocessing.joblib"

    joblib.dump(best_model, model_path)
    joblib.dump({
        "encoder": encoder,
        "scaler": scaler,
        "feature_cols": feature_cols,
        "reference_specs": CLINICAL_REFERENCE_SPECS
    }, prep_path)

    logger.info(f"Saved ML Model to: {model_path}")
    logger.info(f"Saved Preprocessing Pipeline to: {prep_path}")
    logger.info("--- ML Training Pipeline Complete ---")

    return metrics


if __name__ == "__main__":
    run_training_pipeline()
