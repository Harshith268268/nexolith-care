"""
Unit tests for Local Medical Analyzer Service and Local Extractor
"""

from django.test import TestCase
from services.medical_analyzer import MedicalAnalyzer
from services.local_medical_extractor import LocalMedicalExtractor
from services.medical_knowledge import MedicalKnowledgeEngine


class TestLocalMedicalAnalyzer(TestCase):

    def setUp(self):
        self.analyzer = MedicalAnalyzer()
        self.extractor = LocalMedicalExtractor()
        self.kb_engine = MedicalKnowledgeEngine()

    def test_local_extractor_canonical_matching(self):
        """Test local NLP extraction of lab text lines."""
        text = """
        METABOLIC PANEL
        Fasting Glucose: 112.5 mg/dL (Reference: 70.0 - 99.0)
        Hemoglobin: 14.2 g/dL (Reference: 13.0 - 17.0)
        Total Cholesterol: 245.0 mg/dL (Reference: 125.0 - 199.0)
        """
        extracted = self.extractor.parse_document(text)
        self.assertGreaterEqual(len(extracted), 3)

        params = [item["parameter"] for item in extracted]
        self.assertIn("Fasting Glucose", params)
        self.assertIn("Hemoglobin", params)
        self.assertIn("Total Cholesterol", params)

    def test_analyzer_report_processing(self):
        """Test MedicalAnalyzer processing extracted text and returning expected JSON contract."""
        text = """
        LABORATORY RESULTS
        Fasting Glucose: 88.0 mg/dL (70.0 - 99.0)
        Hemoglobin: 14.5 g/dL (13.0 - 17.0)
        """
        result = self.analyzer.analyze_report(ocr_text=text)

        self.assertIn("title", result)
        self.assertIn("type", result)
        self.assertIn("abnormality", result)
        self.assertIn("summary", result)
        self.assertIn("lab_values", result)

        self.assertEqual(result["abnormality"], "Normal")
        self.assertEqual(len(result["lab_values"]), 2)

    def test_analyzer_critical_detection(self):
        """Test critical status detection for abnormal values."""
        text = """
        LABORATORY RESULTS
        Fasting Glucose: 165.0 mg/dL (70.0 - 99.0)
        """
        result = self.analyzer.analyze_report(ocr_text=text)
        self.assertEqual(result["abnormality"], "Critical")
        self.assertEqual(result["lab_values"][0]["status"], "Critical")
