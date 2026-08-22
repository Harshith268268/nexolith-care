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
