from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from family.models import Family, FamilyMember
from reports.models import Report
from analytics.prediction_engine import AIHealthPredictionEngine
from analytics.insights_engine import AIInsightsEngine


class TestLocalAnalyticsEngine(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password123")
        self.family = Family.objects.create(user=self.user)
        self.member = FamilyMember.objects.create(family=self.family, name="Jane Doe", relation="Spouse", age=32)

        self.report1 = Report.objects.create(
            member=self.member,
            title="Complete Blood Count",
            date="2026-01-10",
            type="Blood",
            abnormality="Normal",
            summary="All values within normal bounds.",
            lab_values=[
                {"parameter": "Fasting Glucose", "value": "85.0", "unit": "mg/dL", "status": "Normal"},
                {"parameter": "Hemoglobin", "value": "14.0", "unit": "g/dL", "status": "Normal"}
            ]
        )

        self.report2 = Report.objects.create(
            member=self.member,
            title="Lipid & Glucose Panel",
            date="2026-06-15",
            type="Blood",
            abnormality="Borderline",
            summary="Slightly elevated glucose detected.",
            lab_values=[
                {"parameter": "Fasting Glucose", "value": "115.0", "unit": "mg/dL", "status": "Borderline"},
                {"parameter": "Total Cholesterol", "value": "210.0", "unit": "mg/dL", "status": "Borderline"}
            ]
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_prediction_engine(self):
        """Test AIHealthPredictionEngine analyzing member trend and risks."""
        engine = AIHealthPredictionEngine()
        result = engine.analyze_predictions(self.member.id)

        self.assertEqual(result["member"], "Jane Doe")
        self.assertIn(result["overallRisk"], ["Borderline", "Critical", "Normal"])
        self.assertGreaterEqual(len(result["predictions"]), 1)

    def test_chat_assistant_view_local(self):
        """Test ChatAssistantView responding locally without any external API keys."""
        response = self.client.post("/api/analytics/assistant/", {"message": "How is Jane's glucose level?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("response", response.data)
        self.assertIn("Glucose", response.data["response"])
        self.assertIn("100% locally", response.data["response"])

    def test_zero_report_handling(self):
        """Test zero-report guard for Sarah Jenkins with 0 reports."""
        sarah = FamilyMember.objects.create(family=self.family, name="Sarah Jenkins", relation="Dependent", age=28)
        response = self.client.post("/api/analytics/assistant/", {"message": "Do I have any reports for Sarah?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("currently has no medical reports stored", response.data["response"])
        self.assertNotIn("Vitamin D", response.data["response"])
        self.assertNotIn("Glucose", response.data["response"])
        self.assertFalse(response.data.get("has_reports"))

    def test_missing_parameter_grounding(self):
        """Test that asking about a parameter not present in stored reports returns no data notification."""
        sarah = FamilyMember.objects.create(family=self.family, name="Sarah Jenkins", relation="Dependent", age=28)
        Report.objects.create(
            member=sarah,
            title="Glucose Panel",
            date="2026-08-01",
            type="Blood",
            abnormality="Critical",
            lab_values=[{"parameter": "Fasting Glucose", "value": "145.0", "unit": "mg/dL", "status": "Critical", "range": "70-99"}]
        )
        response = self.client.post("/api/analytics/assistant/", {"message": "What is Sarah's Vitamin D?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("I don't have a current Vitamin D result for Sarah Jenkins in the stored reports", response.data["response"])
        self.assertNotIn("Vitamin D is essential for bone density", response.data["response"])

    def test_report_deletion_and_ai_update(self):
        """Test that deleting a report removes all alerts and updates AI response immediately."""
        from alerts.models import Alert
        sarah = FamilyMember.objects.create(family=self.family, name="Sarah Jenkins", relation="Dependent", age=28)
        report = Report.objects.create(
            member=sarah,
            title="Glucose Panel",
            date="2026-08-01",
            type="Blood",
            abnormality="Critical",
            lab_values=[{"parameter": "Fasting Glucose", "value": "145.0", "unit": "mg/dL", "status": "Critical", "range": "70-99"}]
        )
        alert = Alert.objects.create(member=sarah, report=report, title="Diabetes Alert", description="High glucose", date="2026-08-01", severity="Critical", type="Alert")

        # 1. Verify response when report exists
        res1 = self.client.post("/api/analytics/assistant/", {"message": "What is Sarah's glucose?"}, format="json")
        self.assertIn("145.0", res1.data["response"])

        # 2. Delete report
        report.delete()

        # 3. Verify associated alert was deleted via CASCADE
        self.assertEqual(Alert.objects.filter(id=alert.id).count(), 0)

        # 4. Verify AI response now returns zero-report status
        res2 = self.client.post("/api/analytics/assistant/", {"message": "Do I have any reports for Sarah?"}, format="json")
        self.assertIn("currently has no medical reports stored", res2.data["response"])

    def test_multi_user_isolation(self):
        """Test multi-user isolation: User B cannot access User A's family member reports."""
        user_b = User.objects.create_user(username="userb", password="password123")
        family_b = Family.objects.create(user=user_b)
        sarah_b = FamilyMember.objects.create(family=family_b, name="Sarah Jenkins", relation="Spouse", age=30)
        
        client_b = APIClient()
        client_b.force_authenticate(user=user_b)
        
        res = client_b.post("/api/analytics/assistant/", {"message": "Do I have any reports for Sarah?"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("currently has no medical reports stored", res.data["response"])

    def test_unregistered_family_member_query(self):
        """Test querying a family member name not belonging to current user account."""
        response = self.client.post("/api/analytics/assistant/", {"message": "Do I have any reports for Alex?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Alex currently has no medical reports stored", response.data["response"])
        self.assertFalse(response.data.get("has_reports"))

    def test_no_reports_for_entire_user_account(self):
        """Test response when a user account has family members but 0 total reports."""
        user_c = User.objects.create_user(username="userc", password="password123")
        family_c = Family.objects.create(user=user_c)
        FamilyMember.objects.create(family=family_c, name="Tom", relation="Primary", age=40)

        client_c = APIClient()
        client_c.force_authenticate(user=user_c)

        response = client_c.post("/api/analytics/assistant/", {"message": "What reports do I have?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("currently have no medical reports stored", response.data["response"])
        self.assertFalse(response.data.get("has_reports"))

    def test_parameter_query_exact_value(self):
        """Test exact value grounding for parameter query."""
        sarah = FamilyMember.objects.create(family=self.family, name="Sarah Jenkins", relation="Dependent", age=28)
        Report.objects.create(
            member=sarah,
            title="Glucose Test",
            date="2026-08-10",
            type="Blood",
            abnormality="Borderline",
            lab_values=[{"parameter": "Glucose", "value": "104", "unit": "mg/dL", "status": "Borderline", "range": "70-99"}]
        )
        response = self.client.post("/api/analytics/assistant/", {"message": "What is Sarah's glucose?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("104 mg/dL", response.data["response"])
        self.assertIn("Borderline", response.data["response"])
        self.assertIn("Glucose Test", response.data["response"])

    def test_greeting_response(self):
        """Test Test 1: 'hi' returns natural greeting regardless of reports."""
        response = self.client.post("/api/analytics/assistant/", {"message": "hi"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Hello! I am your Local AI Health Assistant", response.data["response"])

    def test_family_members_query(self):
        """Test Test 2: 'who are my family members?' returns user's registered family members."""
        response = self.client.post("/api/analytics/assistant/", {"message": "who are my family members?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Jane Doe", response.data["response"])

    def test_general_medical_question(self):
        """Test Test 6: 'How can I decrease glucose?' returns general educational guidance."""
        response = self.client.post("/api/analytics/assistant/", {"message": "How can I decrease glucose?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Understanding Blood Glucose", response.data["response"])
        self.assertIn("Dietary Adjustments", response.data["response"])

    def test_general_question_diabetes(self):
        """Test Test 7: 'What is diabetes?' returns educational explanation."""
        response = self.client.post("/api/analytics/assistant/", {"message": "What is diabetes?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Blood Glucose", response.data["response"])

    def test_patient_advice_without_report(self):
        """Test Test 8: 'How can Sarah decrease her glucose?' with 0 reports returns notice + educational advice."""
        response = self.client.post("/api/analytics/assistant/", {"message": "How can Sarah decrease her glucose?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("I don't have a current Fasting Glucose result for Sarah", response.data["response"])
        self.assertIn("Understanding Blood Glucose", response.data["response"])

    def test_trend_analysis_multiple_reports(self):
        """Test Test 9: 'Analyze Jane's glucose trend' with 2 reports calculates chronological trend."""
        response = self.client.post("/api/analytics/assistant/", {"message": "Analyze Jane's glucose trend"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Trend Analysis", response.data["response"])
        self.assertIn("upward trend", response.data["response"])

    def test_trend_analysis_zero_reports(self):
        """Test Test 10: 'Analyze Sarah's glucose trend' with 0 reports returns clear statement."""
        sarah = FamilyMember.objects.create(family=self.family, name="Sarah Jenkins", relation="Dependent", age=28)
        response = self.client.post("/api/analytics/assistant/", {"message": "Analyze Sarah's glucose trend"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("currently has no medical reports stored", response.data["response"])

    def test_report_values_query_variations(self):
        """Test natural language variations of 'what are the values in Sarah's report?'."""
        sarah = FamilyMember.objects.create(family=self.family, name="Sarah Jenkins", relation="Dependent", age=28)
        Report.objects.create(
            member=sarah,
            title="Blood Test",
            date="2026-01-12",
            type="Blood",
            abnormality="Normal",
            summary="All values within normal bounds.",
            lab_values=[
                {"parameter": "Hemoglobin", "value": "13.9", "unit": "g/dL", "range": "12-16", "status": "Normal"},
                {"parameter": "Glucose", "value": "92", "unit": "mg/dL", "range": "70-99", "status": "Normal"},
                {"parameter": "Cholesterol", "value": "180", "unit": "mg/dL", "range": "<200", "status": "Normal"},
                {"parameter": "Platelets", "value": "2.9", "unit": "Lakhs/µL", "range": "1.5-4.5", "status": "Normal"}
            ]
        )

        # Query variation 1
        res1 = self.client.post("/api/analytics/assistant/", {"message": "what are the values in Sarah's report?"}, format="json")
        self.assertEqual(res1.status_code, 200)
        self.assertIn("Sarah Jenkins", res1.data["response"])
        self.assertIn("2026-01-12", res1.data["response"])
        self.assertIn("13.9 g/dL", res1.data["response"])
        self.assertIn("Reference Range: 12-16", res1.data["response"])
        self.assertIn("92 mg/dL", res1.data["response"])
        self.assertIn("Reference Range: 70-99", res1.data["response"])

        # Query variation 2
        res2 = self.client.post("/api/analytics/assistant/", {"message": "can you mention the values in it sarah report"}, format="json")
        self.assertEqual(res2.status_code, 200)
        self.assertIn("92 mg/dL", res2.data["response"])

        # Query variation 3
        res3 = self.client.post("/api/analytics/assistant/", {"message": "list Sarah's report values"}, format="json")
        self.assertEqual(res3.status_code, 200)
        self.assertIn("2.9 Lakhs", res3.data["response"])
        self.assertIn("Reference Range: 1.5-4.5", res3.data["response"])


