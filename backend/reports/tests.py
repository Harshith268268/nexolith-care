from django.test import TestCase
from django.contrib.auth.models import User
from family.models import Family, FamilyMember
from reports.models import Report
from services.local_medical_extractor import LocalMedicalExtractor
from services.medical_analyzer import MedicalAnalyzer


class TestMedicalReportExtractionAccuracy(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password123")
        self.family = Family.objects.create(user=self.user)
        self.member = FamilyMember.objects.create(
            family=self.family,
            name="Sarah Jenkins",
            gender="Female",
            age=28,
            height_cm=165.0,
            weight_kg=60.0,
            relation="Dependent"
        )
        self.extractor = LocalMedicalExtractor()
        self.analyzer = MedicalAnalyzer()

        self.sample_sarah_report_text = """
Patient Name: Sarah Jenkins
Date: 2026-01-12

Parameter | Result | Normal Range
Hemoglobin | 13.9 g/dL | 12-16
Glucose | 92 mg/dL | 70-99
Cholesterol | 180 mg/dL | <200
Platelets | 2.9 Lakhs/µL | 1.5-4.5
        """.strip()

    def test_extract_report_date_metadata(self):
        """Verify report date metadata is extracted as 2026-01-12."""
        meta = self.extractor.extract_metadata(self.sample_sarah_report_text)
        self.assertEqual(meta["report_date"], "2026-01-12")
        self.assertEqual(meta["patient_name"], "Sarah Jenkins")

    def test_date_is_never_a_medical_parameter(self):
        """Verify Date is excluded from extracted medical parameters."""
        extracted = self.extractor.parse_document(self.sample_sarah_report_text)
        param_names = [item["parameter"].lower() for item in extracted]
        self.assertNotIn("date", param_names)
        self.assertNotIn("report date", param_names)
        self.assertNotIn("patient name", param_names)

    def test_exact_extracted_values_and_reference_ranges(self):
        """Verify exact parameter values, units, and ranges without artificial calculations."""
        extracted = self.extractor.parse_document(self.sample_sarah_report_text)
        self.assertEqual(len(extracted), 4)

        # 1. Hemoglobin
        hemo = next(item for item in extracted if "hemoglobin" in item["parameter"].lower())
        self.assertEqual(hemo["value"], "13.9")
        self.assertEqual(hemo["unit"], "g/dL")
        self.assertEqual(hemo["range"], "12-16")

        # 2. Glucose
        gluc = next(item for item in extracted if "glucose" in item["parameter"].lower())
        self.assertEqual(gluc["value"], "92")
        self.assertEqual(gluc["unit"], "mg/dL")
        self.assertEqual(gluc["range"], "70-99")
        # Ensure range is NOT calculated 73.6-110.4
        self.assertNotEqual(gluc["range"], "73.6-110.4")

        # 3. Cholesterol
        chol = next(item for item in extracted if "cholesterol" in item["parameter"].lower())
        self.assertEqual(chol["value"], "180")
        self.assertEqual(chol["unit"], "mg/dL")
        self.assertEqual(chol["range"], "<200")

        # 4. Platelets
        plat = next(item for item in extracted if "platelet" in item["parameter"].lower())
        self.assertEqual(plat["value"], "2.9")
        self.assertIn("Lakhs", plat["unit"])
        self.assertEqual(plat["range"], "1.5-4.5")

    def test_medical_analyzer_returns_exact_report_date(self):
        """Verify MedicalAnalyzer returns extracted report date."""
        result = self.analyzer.analyze_report(ocr_text=self.sample_sarah_report_text)
        self.assertEqual(result["report_date"], "2026-01-12")
        self.assertEqual(len(result["lab_values"]), 4)

    def test_report_database_save_with_extracted_date(self):
        """Verify Report instance saves extracted date 2026-01-12 to database."""
        result = self.analyzer.analyze_report(ocr_text=self.sample_sarah_report_text)
        report = Report.objects.create(
            member=self.member,
            title=result["title"],
            date=result["report_date"],
            type=result["type"],
            abnormality=result["abnormality"],
            summary=result["summary"],
            lab_values=result["lab_values"]
        )
        self.assertEqual(str(report.date), "2026-01-12")
        self.assertEqual(len(report.lab_values), 4)

