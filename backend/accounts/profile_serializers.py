from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, NotificationPreferences

class NotificationPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreferences
        fields = [
            'alert_notifications',
            'medication_reminders',
            'email_notifications',
            'ai_health_warnings',
            'report_upload_confirmations'
        ]

    def to_internal_value(self, data):
        # Support camelCase preferences and map them to standard snake_case
        mappings = {
            'alertNotifications': 'alert_notifications',
            'medicationReminders': 'medication_reminders',
            'emailNotifications': 'email_notifications',
            'aiHealthWarnings': 'ai_health_warnings',
            'reportUploadConfirmations': 'report_upload_confirmations'
        }
        for camel, snake in mappings.items():
            if camel in data and snake not in data:
                data[snake] = data[camel]
        return super().to_internal_value(data)

class UserProfileSerializer(serializers.ModelSerializer):
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['full_name', 'phone_number', 'profile_photo', 'profile_photo_url']
        extra_kwargs = {'profile_photo': {'write_only': True}}

    def to_internal_value(self, data):
        # Support camelCase profile details and map them to standard snake_case
        mappings = {
            'fullName': 'full_name',
            'phoneNumber': 'phone_number',
            'profilePhoto': 'profile_photo'
        }
        for camel, snake in mappings.items():
            if camel in data and snake not in data:
                data[snake] = data[camel]
        return super().to_internal_value(data)

    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            return obj.profile_photo.url
        return None

class UserAccountDetailSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    notification_preferences = NotificationPreferencesSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile', 'notification_preferences']
