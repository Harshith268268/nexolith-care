from django.db import models
from family.models import FamilyMember

class Report(models.Model):
    ABNORMALITY_LEVELS = [
        ('Normal', 'Normal'),
        ('Borderline', 'Borderline'),
        ('Critical', 'Critical'),
    ]
    REPORT_TYPES = [
        ('Blood', 'Blood'),
        ('Imaging', 'Imaging'),
        ('Prescription', 'Prescription'),
        ('Discharge', 'Discharge'),
    ]

    member = models.ForeignKey(FamilyMember, on_delete=models.CASCADE, related_name='reports')
    title = models.CharField(max_length=200)
    date = models.DateField()
    type = models.CharField(max_length=50, choices=REPORT_TYPES)
    abnormality = models.CharField(max_length=50, choices=ABNORMALITY_LEVELS, default='Normal')
    summary = models.TextField(blank=True, null=True)
    doctor_notes = models.TextField(blank=True, null=True)
    lab_values = models.JSONField(blank=True, null=True, help_text="Stored as a list of dictionaries")
    # New fields for file upload and OCR
    file = models.FileField(upload_to='reports/', blank=True, null=True)
    ocr_text = models.TextField(blank=True, null=True, help_text="Raw text extracted by OCR")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.member.name}"
