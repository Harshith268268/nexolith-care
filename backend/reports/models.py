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

    def sync_parameters(self):
        """Sync ReportParameter database records from lab_values JSON list."""
        if not self.id:
            return
        
        # Clear existing parameters for this report
        self.parameters.all().delete()
        
        if not self.lab_values or not isinstance(self.lab_values, list):
            return

        METADATA_BLACK_LIST = {
            "date", "report date", "patient", "patient name", "patient id", "name",
            "age", "gender", "sex", "doctor", "dr", "ref by", "hospital", "lab",
            "laboratory", "sample", "sample id", "collected date", "result date"
        }

        for item in self.lab_values:
            if not isinstance(item, dict):
                continue
            param_name = str(item.get('parameter', '')).strip()
            if not param_name or param_name.lower() in METADATA_BLACK_LIST:
                continue
            
            val_str = str(item.get('value', '')).strip()
            unit_str = str(item.get('unit', '')).strip()
            range_str = str(item.get('range', '')).strip()
            status_str = str(item.get('status', 'Normal')).strip()
            explanation_str = str(item.get('explanation', '')).strip()

            num_val = item.get('numeric_value')
            if num_val is None and val_str:
                import re
                m = re.search(r'[-+]?\d*\.\d+|\d+', val_str)
                if m:
                    try:
                        num_val = float(m.group(0))
                    except ValueError:
                        pass
            
            ref_low = item.get('lower_bound')
            ref_high = item.get('upper_bound')

            ReportParameter.objects.create(
                report=self,
                parameter=param_name,
                value=val_str,
                numeric_value=num_val,
                unit=unit_str,
                range=range_str,
                reference_low=ref_low,
                reference_high=ref_high,
                status=status_str,
                explanation=explanation_str
            )


class ReportParameter(models.Model):
    """
    Individual medical lab parameter record linked to a Report in PostgreSQL.
    Preserves exact document values, units, reference ranges, and clinical classification.
    """
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='parameters')
    parameter = models.CharField(max_length=150)
    value = models.CharField(max_length=100)
    numeric_value = models.FloatField(blank=True, null=True)
    unit = models.CharField(max_length=50, blank=True, null=True)
    range = models.CharField(max_length=100, blank=True, null=True)
    reference_low = models.FloatField(blank=True, null=True)
    reference_high = models.FloatField(blank=True, null=True)
    status = models.CharField(max_length=50, default='Normal')
    explanation = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.parameter}: {self.value} {self.unit or ''} (Ref: {self.range or 'N/A'}) [{self.status}]"

