from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=200, blank=True, null=True)
    phone_number = models.CharField(max_length=50, blank=True, null=True)
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

class NotificationPreferences(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    alert_notifications = models.BooleanField(default=True)
    medication_reminders = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    ai_health_warnings = models.BooleanField(default=True)
    report_upload_confirmations = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username}'s Notification Preferences"
