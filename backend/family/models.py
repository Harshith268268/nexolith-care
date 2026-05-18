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
    
    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name='members')
    name = models.CharField(max_length=100)
    age = models.IntegerField()
    relation = models.CharField(max_length=50, choices=MEMBER_ROLES)
    avatar_url = models.CharField(max_length=2000, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.relation})"
