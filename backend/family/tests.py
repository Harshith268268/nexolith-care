from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from family.models import Family, FamilyMember


class TestFamilyMemberHealthProfile(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username="familyuser", password="password123")
        self.family = Family.objects.create(user=self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_family_member_with_health_metrics(self):
        """Test creating a family member with gender, age, height_cm, weight_kg and calculated BMI."""
        payload = {
            "name": "Sarah Jenkins",
            "gender": "Female",
            "age": 28,
            "height_cm": 165.0,
            "weight_kg": 60.0,
            "relation": "Dependent"
        }
        response = self.client.post("/api/family/members/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], "Sarah Jenkins")
        self.assertEqual(response.data["gender"], "Female")
        self.assertEqual(response.data["age"], 28)
        self.assertEqual(response.data["height_cm"], 165.0)
        self.assertEqual(response.data["weight_kg"], 60.0)
        self.assertEqual(response.data["bmi"], 22.0)  # 60 / (1.65 * 1.65) = 22.037 -> 22.0

    def test_bmi_calculation_property(self):
        """Test dynamic calculation of BMI property on FamilyMember model."""
        member = FamilyMember.objects.create(
            family=self.family,
            name="David Jenkins",
            gender="Male",
            age=45,
            height_cm=180.0,
            weight_kg=80.0,
            relation="Spouse"
        )
        self.assertEqual(member.bmi, 24.7)  # 80 / (1.8 * 1.8) = 24.69 -> 24.7

    def test_validation_invalid_metrics(self):
        """Test validation rules for non-positive height, weight, age, or invalid gender/relation."""
        # 1. Invalid Height <= 0
        p1 = {"name": "Test", "gender": "Male", "age": 30, "height_cm": -170, "weight_kg": 70, "relation": "Spouse"}
        res1 = self.client.post("/api/family/members/", p1, format="json")
        self.assertEqual(res1.status_code, 400)
        self.assertIn("height_cm", res1.data)

        # 2. Invalid Weight <= 0
        p2 = {"name": "Test", "gender": "Male", "age": 30, "height_cm": 170, "weight_kg": 0, "relation": "Spouse"}
        res2 = self.client.post("/api/family/members/", p2, format="json")
        self.assertEqual(res2.status_code, 400)
        self.assertIn("weight_kg", res2.data)

        # 3. Invalid Gender
        p3 = {"name": "Test", "gender": "OtherGender", "age": 30, "height_cm": 170, "weight_kg": 70, "relation": "Spouse"}
        res3 = self.client.post("/api/family/members/", p3, format="json")
        self.assertEqual(res3.status_code, 400)
        self.assertIn("gender", res3.data)

    def test_update_family_member_health_metrics(self):
        """Test updating family member metrics via PATCH."""
        member = FamilyMember.objects.create(
            family=self.family,
            name="Emma Jenkins",
            gender="Female",
            age=18,
            height_cm=160.0,
            weight_kg=50.0,
            relation="Dependent"
        )
        response = self.client.patch(f"/api/family/members/{member.id}/", {"weight_kg": 55.0}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["weight_kg"], 55.0)
        self.assertEqual(response.data["bmi"], 21.5)  # 55 / (1.6 * 1.6) = 21.48 -> 21.5
