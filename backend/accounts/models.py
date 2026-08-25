from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=200, blank=True, null=True)
    phone_number = models.CharField(max_length=50, blank=True, null=True)
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    is_email_verified = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"


class EmailOTP(models.Model):
    PURPOSE_CHOICES = [
        ('EMAIL_VERIFICATION', 'Email Verification'),
        ('PASSWORD_RESET', 'Password Reset'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='otps')
    email = models.EmailField(db_index=True)
    otp_hash = models.CharField(max_length=255)
    purpose = models.CharField(max_length=50, choices=PURPOSE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    is_verified = models.BooleanField(default=False)
    attempt_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.email} ({self.purpose})"


class NotificationPreferences(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    alert_notifications = models.BooleanField(default=True)
    medication_reminders = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    ai_health_warnings = models.BooleanField(default=True)
    report_upload_confirmations = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username}'s Notification Preferences"


class PendingRegistration(models.Model):
    username = models.CharField(max_length=150, db_index=True)
    email = models.EmailField(db_index=True)
    password_hash = models.CharField(max_length=255)
    otp_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    attempt_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Pending registration for {self.username} ({self.email})"


