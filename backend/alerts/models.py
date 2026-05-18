from django.db import models
from family.models import FamilyMember

class Alert(models.Model):
    SEVERITY_LEVELS = [
        ('Normal', 'Normal'),
        ('Borderline', 'Borderline'),
        ('Critical', 'Critical'),
    ]
    ALERT_TYPES = [
        ('Reminder', 'Reminder'),
        ('Alert', 'Alert'),
    ]
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Upcoming', 'Upcoming'),
        ('History', 'History'),
    ]

    member = models.ForeignKey(FamilyMember, on_delete=models.CASCADE, related_name='alerts')
    title = models.CharField(max_length=200)
    description = models.TextField()
    date = models.DateField()
    severity = models.CharField(max_length=50, choices=SEVERITY_LEVELS, default='Normal')
    type = models.CharField(max_length=50, choices=ALERT_TYPES)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.status}] {self.title} for {self.member.name}"
