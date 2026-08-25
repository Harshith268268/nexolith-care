"""
Local Medical Analyzer Service
Replaces external Gemini LLM with a 100% offline local AI pipeline:
PDF Table / OCR extraction → Local Medical Extractor → Trained ML Model → Medical Knowledge Engine.
Requires ZERO API keys and ZERO external internet connections.
"""

import os
import sys
import logging
import traceback
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, List

# Django / Local imports
from django.conf import settings
from services.pdf_table_extractor import PDFTableExtractor
from services.local_medical_extractor import LocalMedicalExtractor
from services.medical_knowledge import MedicalKnowledgeEngine

logger = logging.getLogger(__name__)


class MedicalAnalyzer:
    """
    Local Medical Analyzer. Loads pre-trained scikit-learn model and preprocessing pipeline
    from backend/ml_models/ to classify medical lab parameter statuses and generate
    patient-friendly health insights.
    """

    def __init__(self):
        self.model = None
        self.encoder = None
        self.scaler = None
        self.feature_cols = None
        self.is_ml_loaded = False
        self.init_error = None

        self.kb_engine = MedicalKnowledgeEngine()
        self.extractor = LocalMedicalExtractor()

        self._load_local_ml_model()

    def _load_local_ml_model(self):
        """Loads pre-trained joblib model and scaler from disk."""
        try:
            import joblib
            ml_dir = Path(settings.BASE_DIR) / "ml_models"
            model_path = ml_dir / "medical_status_model.joblib"
            prep_path = ml_dir / "preprocessing.joblib"

            if not model_path.exists() or not prep_path.exists():
                # Trigger quick training if model artifacts are missing
                logger.warning(f"ML Model files missing at {model_path}. Auto-triggering training script...")
                try:
                    from ml_models.train_model import run_training_pipeline
                    run_training_pipeline()
                except Exception as te:
                    logger.error(f"Auto-training failed: {te}")

            if model_path.exists() and prep_path.exists():
                self.model = joblib.load(model_path)
                prep_data = joblib.load(prep_path)
                self.encoder = prep_data["encoder"]
                self.scaler = prep_data["scaler"]
                self.feature_cols = prep_data["feature_cols"]
                self.is_ml_loaded = True
                logger.info("Locally trained ML medical status model successfully loaded.")
            else:
                self.init_error = "Trained ML model joblib files could not be loaded."
                logger.error(self.init_error)

        except Exception as e:
            self.init_error = f"Error loading local ML model: {e}"
            logger.error(f"{self.init_error}\n{traceback.format_exc()}")

    def analyze_report(self, ocr_text: str = "", file_path: str = None) -> Dict[str, Any]:
        """
        Main analysis entry point. Accepts OCR text and optional PDF/image file path,
        extracts lab parameters, uses local ML model for status prediction, and generates
        patient explanations.
        """
        logger.info(f"Local MedicalAnalyzer analyzing report. ML Model Loaded: {self.is_ml_loaded}. File: {file_path}")

        combined_text = ""
        raw_tables = []

        # Step 1: Structured PDF Extraction
        if file_path and file_path.lower().endswith('.pdf'):
            try:
                table_extractor = PDFTableExtractor()
                raw_tables = table_extractor.extract_tables(file_path)
                pdf_text = table_extractor.extract_structured_data(file_path)
                if pdf_text:
                    combined_text += f"\n{pdf_text}"
            except Exception as pe:
                logger.error(f"PDF Table Extractor error: {pe}")

        # Step 2: Append OCR Text
        if ocr_text:
            combined_text += f"\n{ocr_text}"

        # Step 3: Local Parameter & Metadata Extraction
        metadata = self.extractor.extract_metadata(combined_text)
        report_date = metadata.get("report_date")

        extracted_items = self.extractor.parse_document(combined_text, raw_tables=raw_tables)

        if not extracted_items:
            logger.warning("LocalMedicalExtractor found no parameters. Returning fallback structure.")
            return {
                "title": "Medical Report",
                "report_date": report_date,
                "type": "Blood",
                "abnormality": "Normal",
                "summary": "No lab parameters could be extracted. Please check document scan quality.",
                "lab_values": []
            }

        # Step 4: Machine Learning Classification for each extracted parameter
        processed_lab_values = []
        for item in extracted_items:
            param_name = item["parameter"]
            val_num = item["numeric_value"]
            val_str = item["value"]
            unit = item["unit"]
            range_str = item["range"]
            lower_b = item["lower_bound"]
            upper_b = item["upper_bound"]

            status = self._predict_status_with_ml(param_name, val_num, lower_b, upper_b)
            explanation = self.kb_engine.get_explanation(param_name, status)

            processed_lab_values.append({
                "parameter": param_name,
                "value": val_str,
                "numeric_value": val_num,
                "unit": unit,
                "range": range_str,
                "lower_bound": lower_b,
                "upper_bound": upper_b,
                "status": status,
                "explanation": explanation
            })

        # Step 5: Overall Summary & Abnormality determination
        summary_info = self.kb_engine.generate_overall_summary(processed_lab_values)
        report_title = self._determine_report_title(processed_lab_values)

        return {
            "title": report_title,
            "report_date": report_date,
            "type": "Blood",
            "abnormality": summary_info["abnormality"],
            "summary": summary_info["summary"],
            "lab_values": processed_lab_values
        }

    def _predict_status_with_ml(self, param_name: str, val: float, lower: float, upper: float) -> str:
        """
        Uses the loaded scikit-learn model to predict Normal / Borderline / Critical status.
        Falls back gracefully to clinical bounds rule if ML model is unavailable.
        """
        if not self.is_ml_loaded or self.model is None:
            return self._heuristic_status(val, lower, upper)

        try:
            span = max(upper - lower, 1e-5)
            mid = (lower + upper) / 2.0

            normalized_pos = (val - lower) / span
            dev_lower = max(0.0, lower - val) / max(lower, 1e-5)
            dev_upper = max(0.0, val - upper) / max(upper, 1e-5)
            rel_mid_delta = abs(val - mid) / max(mid, 1e-5)
            is_below_lower = 1.0 if val < lower else 0.0
            is_above_upper = 1.0 if val > upper else 0.0

            # Encode parameter name
            known_classes = list(self.encoder.classes_)
            param_code = self.encoder.transform([param_name])[0] if param_name in known_classes else 0

            feature_dict = {
                "normalized_pos": [normalized_pos],
                "deviation_lower": [dev_lower],
                "deviation_upper": [dev_upper],
                "relative_mid_delta": [rel_mid_delta],
                "is_below_lower": [is_below_lower],
                "is_above_upper": [is_above_upper],
                "param_code": [param_code]
            }

            df_feat = pd.DataFrame(feature_dict)[self.feature_cols]
            X_scaled = self.scaler.transform(df_feat)

            pred_status = self.model.predict(X_scaled)[0]
            return str(pred_status)

        except Exception as me:
            logger.error(f"ML inference error for {param_name}: {me}. Using heuristic fallback.")
            return self._heuristic_status(val, lower, upper)

    def _heuristic_status(self, val: float, lower: float, upper: float) -> str:
        """Deterministic clinical reference range fallback."""
        span = upper - lower
        if lower <= val <= upper:
            return "Normal"
        elif (lower - 0.20 * span) <= val < lower or upper < val <= (upper + 0.20 * span):
            return "Borderline"
        else:
            return "Critical"

    def _determine_report_title(self, lab_values: List[Dict[str, Any]]) -> str:
        """Determines report title based on parameter contents."""
        params = [item.get("parameter", "").lower() for item in lab_values]
        if any("glucose" in p or "hba1c" in p for p in params):
            return "Metabolic & Blood Glucose Panel"
        elif any("cholesterol" in p or "triglyceride" in p for p in params):
            return "Lipid Panel & Cardiovascular Report"
        elif any("hemoglobin" in p or "wbc" in p or "platelet" in p for p in params):
            return "Complete Blood Count (CBC)"
        elif any("creatinine" in p or "bun" in p for p in params):
            return "Renal Function Panel"
        elif any("alt" in p or "ast" in p for p in params):
            return "Liver Function Panel"
        return "Comprehensive Lab Report"
