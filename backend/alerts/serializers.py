from rest_framework import serializers
from .models import Alert
from family.models import FamilyMember

class AlertSerializer(serializers.ModelSerializer):
    member_id = serializers.PrimaryKeyRelatedField(queryset=FamilyMember.objects.all(), source='member')

    class Meta:
        model = Alert
        fields = ['id', 'member_id', 'title', 'description', 'date', 'severity', 'type', 'status', 'created_at']
