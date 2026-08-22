"""
Unit tests for Local Medical ML Model and Feature Engineering Pipeline
"""

import unittest
import numpy as np
import pandas as pd
from pathlib import Path
import joblib

from ml_models.train_model import CLINICAL_REFERENCE_SPECS, generate_synthetic_dataset, engineer_features


class TestMedicalMLModel(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.ml_dir = Path(__file__).resolve().parent
        cls.model_path = cls.ml_dir / "medical_status_model.joblib"
        cls.prep_path = cls.ml_dir / "preprocessing.joblib"

        # Load saved model artifacts
        cls.model = joblib.load(cls.model_path)
        cls.prep = joblib.load(cls.prep_path)
        cls.encoder = cls.prep["encoder"]
        cls.scaler = cls.prep["scaler"]
        cls.feature_cols = cls.prep["feature_cols"]

    def test_model_artifact_existence(self):
        """Verify saved joblib model files exist."""
        self.assertTrue(self.model_path.exists())
        self.assertTrue(self.prep_path.exists())

    def test_normal_parameter_prediction(self):
        """Verify model predicts 'Normal' for a parameter well within reference range."""
        df_sample = pd.DataFrame([{
            "parameter": "Fasting Glucose",
            "value": 85.0,
            "lower_bound": 70.0,
            "upper_bound": 99.0
        }])

        X_scaled, _, _, _ = engineer_features(
            df_sample, encoder=self.encoder, scaler=self.scaler, is_training=False
        )
        pred = self.model.predict(X_scaled)[0]
        self.assertEqual(pred, "Normal")

    def test_borderline_parameter_prediction(self):
        """Verify model predicts 'Borderline' for a parameter slightly outside reference range."""
        df_sample = pd.DataFrame([{
            "parameter": "Fasting Glucose",
            "value": 103.0,
            "lower_bound": 70.0,
            "upper_bound": 99.0
        }])

        X_scaled, _, _, _ = engineer_features(
            df_sample, encoder=self.encoder, scaler=self.scaler, is_training=False
        )
        pred = self.model.predict(X_scaled)[0]
        self.assertEqual(pred, "Borderline")

    def test_critical_parameter_prediction(self):
        """Verify model predicts 'Critical' for a parameter far outside reference range."""
        df_sample = pd.DataFrame([{
            "parameter": "Fasting Glucose",
            "value": 150.0,
            "lower_bound": 70.0,
            "upper_bound": 99.0
        }])

        X_scaled, _, _, _ = engineer_features(
            df_sample, encoder=self.encoder, scaler=self.scaler, is_training=False
        )
        pred = self.model.predict(X_scaled)[0]
        self.assertEqual(pred, "Critical")


if __name__ == "__main__":
    unittest.main()
