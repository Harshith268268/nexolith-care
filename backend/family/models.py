from django.db import models
from django.contrib.auth.models import User

class Family(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='family_account')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}'s Family"

class FamilyMember(models.Model):
    MEMBER_ROLES = [
        ('Primary', 'Primary'),
        ('Dependent', 'Dependent'),
        ('Spouse', 'Spouse'),
        ('Parent', 'Parent'),
        ('Other', 'Other'),
    ]

    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
    ]
    
    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name='members')
    name = models.CharField(max_length=100)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='Male', blank=True, null=True)
    age = models.IntegerField()
    height_cm = models.FloatField(blank=True, null=True, help_text="Height in centimeters")
    weight_kg = models.FloatField(blank=True, null=True, help_text="Weight in kilograms")
    relation = models.CharField(max_length=50, choices=MEMBER_ROLES)
    avatar_url = models.CharField(max_length=2000, blank=True, null=True)
    profile_image = models.ImageField(upload_to="family_members/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def bmi(self):
        """
        Calculates body mass index dynamically:
        BMI = weight_kg / (height_m * height_m)
        """
        if self.height_cm and self.weight_kg and self.height_cm > 0 and self.weight_kg > 0:
            height_m = self.height_cm / 100.0
            return round(self.weight_kg / (height_m * height_m), 1)
        return None

    def __str__(self):
        return f"{self.name} ({self.relation})"
