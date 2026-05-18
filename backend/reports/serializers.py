from rest_framework import serializers
from .models import Report
from family.models import FamilyMember

class ReportSerializer(serializers.ModelSerializer):
    member_id = serializers.PrimaryKeyRelatedField(
        queryset=FamilyMember.objects.all(),
        source='member'
    )
    file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Report
        fields = [
            'id', 'member_id', 'title', 'date', 'type',
            'abnormality', 'summary', 'doctor_notes',
            'lab_values', 'file', 'ocr_text', 'created_at'
        ]
        read_only_fields = ['ocr_text', 'created_at']
