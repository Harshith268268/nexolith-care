import os
import tempfile
from datetime import date
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from family.models import Family, FamilyMember
from reports.models import Report, ReportParameter
from services.pdf_table_extractor import PDFTableExtractor
from services.local_medical_extractor import LocalMedicalExtractor
from services.medical_analyzer import MedicalAnalyzer
from services.question_router import QuestionRouter, INTENT_REPORT_VALUES, INTENT_PARAMETER_VALUE


class MedicalExtractionAndAssistantTestCase(TestCase):
    """
    Automated test suite verifying exact medical report parameter extraction,
    reference range preservation, metadata exclusion, and Local AI Assistant QA.
    """

    def setUp(self):
        self.user = User.objects.create_user(username="testuser_qa", password="password123")
        self.family = Family.objects.create(user=self.user)
        self.sarah = FamilyMember.objects.create(
            family=self.family,
            name="Sarah Jenkins",
            relation="Self",
            age=32,
            gender="Female"
        )
        self.david = FamilyMember.objects.create(
            family=self.family,
            name="David Jenkins",
            relation="Spouse",
            age=35,
            gender="Male"
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.sarah_pdf_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "media", "reports", "Sarah_Jenkins_Blood_Test.pdf"
        )

    def test_01_report_date_extraction(self):
        """1. Correct report date extraction (2026-01-12)."""
        extractor = LocalMedicalExtractor()
        if os.path.exists(self.sarah_pdf_path):
            table_extractor = PDFTableExtractor()
            text = table_extractor.extract_structured_data(self.sarah_pdf_path)
            meta = extractor.extract_metadata(text)
            self.assertEqual(meta.get("report_date"), "2026-01-12")
        else:
            sample_text = "Blood Test\nPatient Name: Sarah Jenkins\nDate: 2026-01-12\nHemoglobin 13.9 g/dL 12-16"
            meta = extractor.extract_metadata(sample_text)
            self.assertEqual(meta.get("report_date"), "2026-01-12")

    def test_02_date_not_created_as_medical_parameter(self):
        """2. Date MUST NEVER be created as a medical parameter."""
        extractor = LocalMedicalExtractor()
        sample_text = "Blood Test\nPatient Name: Sarah Jenkins\nDate: 2026-01-12\nHemoglobin 13.9 g/dL 12-16\nGlucose 92 mg/dL 70-99"
        parsed = extractor.parse_document(sample_text)
        param_names = [p["parameter"].lower() for p in parsed]
        self.assertNotIn("date", param_names)
        self.assertNotIn("report date", param_names)
        self.assertNotIn("patient name", param_names)

    def test_03_exact_glucose_value_extraction(self):
        """3. Exact glucose value extraction (92 mg/dL)."""
        extractor = LocalMedicalExtractor()
        sample_text = "Glucose | 92 mg/dL | 70-99"
        parsed = extractor.parse_document(sample_text)
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["value"], "92")
        self.assertEqual(parsed[0]["numeric_value"], 92.0)
        self.assertEqual(parsed[0]["unit"], "mg/dL")

    def test_04_exact_glucose_reference_range_extraction(self):
        """4. Exact glucose reference range extraction (70-99, NOT 73.6-110.4)."""
        extractor = LocalMedicalExtractor()
        sample_text = "Glucose | 92 mg/dL | 70-99"
        parsed = extractor.parse_document(sample_text)
        self.assertEqual(parsed[0]["range"], "70-99")
        self.assertEqual(parsed[0]["lower_bound"], 70.0)
        self.assertEqual(parsed[0]["upper_bound"], 99.0)
        self.assertNotEqual(parsed[0]["range"], "73.6-110.4")

    def test_05_exact_cholesterol_range_extraction(self):
        """5. Exact cholesterol reference range extraction (<200)."""
        extractor = LocalMedicalExtractor()
        sample_text = "Cholesterol | 180 mg/dL | <200"
        parsed = extractor.parse_document(sample_text)
        self.assertEqual(parsed[0]["range"], "<200")
        self.assertEqual(parsed[0]["upper_bound"], 200.0)

    def test_06_exact_hemoglobin_range_extraction(self):
        """6. Exact hemoglobin reference range extraction (12-16)."""
        extractor = LocalMedicalExtractor()
        sample_text = "Hemoglobin | 13.9 g/dL | 12-16"
        parsed = extractor.parse_document(sample_text)
        self.assertEqual(parsed[0]["value"], "13.9")
        self.assertEqual(parsed[0]["unit"], "g/dL")
        self.assertEqual(parsed[0]["range"], "12-16")
        self.assertEqual(parsed[0]["lower_bound"], 12.0)
        self.assertEqual(parsed[0]["upper_bound"], 16.0)

    def test_07_exact_platelet_range_extraction(self):
        """7. Exact platelet reference range and original unit extraction (2.9 Lakhs/µL, 1.5-4.5)."""
        extractor = LocalMedicalExtractor()
        sample_text = "Platelets | 2.9 Lakhs/µL | 1.5-4.5"
        parsed = extractor.parse_document(sample_text)
        self.assertEqual(parsed[0]["value"], "2.9")
        self.assertEqual(parsed[0]["unit"], "Lakhs/µL")
        self.assertEqual(parsed[0]["range"], "1.5-4.5")
        self.assertEqual(parsed[0]["lower_bound"], 1.5)
        self.assertEqual(parsed[0]["upper_bound"], 4.5)

    def test_08_report_values_query(self):
        """8. Report values assistant query returning stored database parameters."""
        rep = Report.objects.create(
            member=self.sarah,
            title="Blood Test",
            date=date(2026, 1, 12),
            type="Blood",
            abnormality="Normal",
            summary="All normal.",
            lab_values=[
                {"parameter": "Hemoglobin", "value": "13.9", "unit": "g/dL", "range": "12-16", "status": "Normal"},
                {"parameter": "Glucose", "value": "92", "unit": "mg/dL", "range": "70-99", "status": "Normal"},
                {"parameter": "Cholesterol", "value": "180", "unit": "mg/dL", "range": "<200", "status": "Normal"},
                {"parameter": "Platelets", "value": "2.9", "unit": "Lakhs/µL", "range": "1.5-4.5", "status": "Normal"}
            ]
        )
        rep.sync_parameters()

        response = self.client.post("/api/analytics/assistant/", {"message": "What are the values in Sarah's report?"}, format="json")
        self.assertEqual(response.status_code, 200)
        content = response.data.get("response", "")
        self.assertIn("Sarah Jenkins — Blood Test", content)
        self.assertIn("Report Date: 2026-01-12", content)
        self.assertIn("Hemoglobin", content)
        self.assertIn("13.9 g/dL", content)
        self.assertIn("12-16", content)
        self.assertIn("Glucose", content)
        self.assertIn("92 mg/dL", content)
        self.assertIn("70-99", content)

    def test_09_parameter_specific_query(self):
        """9. Parameter-specific query ("What is Sarah's glucose?")."""
        rep = Report.objects.create(
            member=self.sarah,
            title="Blood Test",
            date=date(2026, 1, 12),
            type="Blood",
            lab_values=[{"parameter": "Glucose", "value": "92", "unit": "mg/dL", "range": "70-99", "status": "Normal"}]
        )
        rep.sync_parameters()

        response = self.client.post("/api/analytics/assistant/", {"message": "What is Sarah's glucose?"}, format="json")
        self.assertEqual(response.status_code, 200)
        content = response.data.get("response", "")
        self.assertIn("92 mg/dL", content)
        self.assertIn("70-99", content)

    def test_10_latest_report_query(self):
        """10. Latest report query."""
        Report.objects.create(member=self.sarah, title="Old Report", date=date(2025, 1, 1), type="Blood")
        Report.objects.create(member=self.sarah, title="Latest Blood Test", date=date(2026, 1, 12), type="Blood")

        response = self.client.post("/api/analytics/assistant/", {"message": "Show Sarah's reports"}, format="json")
        self.assertEqual(response.status_code, 200)
        content = response.data.get("response", "")
        self.assertIn("Latest Blood Test", content)
        self.assertIn("2026-01-12", content)

    def test_11_no_report_query(self):
        """11. Query for a member with no reports stored."""
        response = self.client.post("/api/analytics/assistant/", {"message": "What are the values in David's report?"}, format="json")
        self.assertEqual(response.status_code, 200)
        content = response.data.get("response", "")
        self.assertIn("David Jenkins currently has no medical reports stored", content)

    def test_12_deleted_report_query(self):
        """12. Ensure deleted reports cannot be retrieved by Local AI Assistant."""
        rep = Report.objects.create(
            member=self.sarah,
            title="Temp Report",
            date=date(2026, 1, 12),
            type="Blood",
            lab_values=[{"parameter": "Glucose", "value": "92", "unit": "mg/dL"}]
        )
        rep.sync_parameters()
        self.assertEqual(ReportParameter.objects.filter(report=rep).count(), 1)

        rep.parameters.all().delete()
        rep.delete()

        response = self.client.post("/api/analytics/assistant/", {"message": "What are the values in Sarah's report?"}, format="json")
        self.assertEqual(response.status_code, 200)
        content = response.data.get("response", "")
        self.assertIn("currently has no medical reports stored", content)

    def test_13_natural_language_variations(self):
        """13. Support natural language variations of "what are the values?"."""
        rep = Report.objects.create(
            member=self.sarah,
            title="Blood Test",
            date=date(2026, 1, 12),
            type="Blood",
            lab_values=[
                {"parameter": "Glucose", "value": "92", "unit": "mg/dL", "range": "70-99", "status": "Normal"},
                {"parameter": "Hemoglobin", "value": "13.9", "unit": "g/dL", "range": "12-16", "status": "Normal"}
            ]
        )
        rep.sync_parameters()

        queries = [
            "what are values in it",
            "can you mention the values in it sarah report",
            "List Sarah's report values",
            "What were Sarah's blood test results?",
            "Show me all values in Sarah's latest report",
            "What parameters are in Sarah's report?"
        ]

        for q in queries:
            response = self.client.post("/api/analytics/assistant/", {"message": q}, format="json")
            self.assertEqual(response.status_code, 200, f"Failed for query: {q}")
            content = response.data.get("response", "")
            self.assertIn("Glucose", content, f"Glucose missing for query: {q}")
            self.assertIn("Hemoglobin", content, f"Hemoglobin missing for query: {q}")

    def test_14_general_glucose_health_question(self):
        """14. General glucose health question ("How can I reduce glucose?")."""
        response = self.client.post("/api/analytics/assistant/", {"message": "How can I reduce glucose?"}, format="json")
        self.assertEqual(response.status_code, 200)
        content = response.data.get("response", "")
        self.assertIn("Glucose", content)
        self.assertNotIn("I'm not sure I understood", content)

    def test_15_end_to_end_sarah_pdf_extraction(self):
        """15. End-to-end Sarah Jenkins PDF report processing test."""
        if not os.path.exists(self.sarah_pdf_path):
            self.skipTest("Sarah PDF file not present at path.")

        table_extractor = PDFTableExtractor()
        raw_tables = table_extractor.extract_tables(self.sarah_pdf_path)
        pdf_text = table_extractor.extract_structured_data(self.sarah_pdf_path)

        analyzer = MedicalAnalyzer()
        extracted = analyzer.analyze_report(ocr_text=pdf_text, file_path=self.sarah_pdf_path)

        self.assertEqual(extracted["report_date"], "2026-01-12")
        lab_vals = extracted["lab_values"]

        param_dict = {item["parameter"]: item for item in lab_vals}

        self.assertIn("Glucose", param_dict)
        self.assertEqual(param_dict["Glucose"]["value"], "92")
        self.assertEqual(param_dict["Glucose"]["unit"], "mg/dL")
        self.assertEqual(param_dict["Glucose"]["range"], "70-99")

        self.assertIn("Hemoglobin", param_dict)
        self.assertEqual(param_dict["Hemoglobin"]["value"], "13.9")
        self.assertEqual(param_dict["Hemoglobin"]["unit"], "g/dL")
        self.assertEqual(param_dict["Hemoglobin"]["range"], "12-16")

        self.assertIn("Cholesterol", param_dict)
        self.assertEqual(param_dict["Cholesterol"]["value"], "180")
        self.assertEqual(param_dict["Cholesterol"]["unit"], "mg/dL")
        self.assertEqual(param_dict["Cholesterol"]["range"], "<200")

        self.assertIn("Platelets", param_dict)
        self.assertEqual(param_dict["Platelets"]["value"], "2.9")
        self.assertEqual(param_dict["Platelets"]["unit"], "Lakhs/µL")
        self.assertEqual(param_dict["Platelets"]["range"], "1.5-4.5")

        self.assertNotIn("Date", param_dict)
        self.assertNotIn("Report Date", param_dict)
