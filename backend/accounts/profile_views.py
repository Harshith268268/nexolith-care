import logging
from rest_framework import views, permissions, status
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import UserProfile, NotificationPreferences
from .profile_serializers import (
    UserAccountDetailSerializer,
    UserProfileSerializer,
    NotificationPreferencesSerializer
)

logger = logging.getLogger(__name__)

class ProfileDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        # Self-healing check: ensure profile and preferences exist
        UserProfile.objects.get_or_create(user=user)
        NotificationPreferences.objects.get_or_create(user=user)
        
        serializer = UserAccountDetailSerializer(user)
        return Response(serializer.data)

    def patch(self, request):
        user = request.user
        # Self-healing check
        profile, _ = UserProfile.objects.get_or_create(user=user)
        prefs, _ = NotificationPreferences.objects.get_or_create(user=user)

        data = request.data
        
        # 1. Update Core User Details
        if 'email' in data:
            user.email = data.get('email')
            user.save()

        # 2. Update Profile details
        profile_data = data.get('profile', {})
        if profile_data:
            profile_serializer = UserProfileSerializer(profile, data=profile_data, partial=True)
            if profile_serializer.is_valid():
                profile_serializer.save()
            else:
                return Response(profile_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # 3. Update Preferences details
        prefs_data = data.get('notification_preferences') or data.get('notificationPreferences') or {}
        if prefs_data:
            prefs_serializer = NotificationPreferencesSerializer(prefs, data=prefs_data, partial=True)
            if prefs_serializer.is_valid():
                prefs_serializer.save()
            else:
                return Response(prefs_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Return full updated details
        full_serializer = UserAccountDetailSerializer(user)
        return Response(full_serializer.data)

class ProfilePhotoUploadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)

        # Check if file is provided in request
        if 'profile_photo' not in request.FILES:
            return Response({"error": "No profile_photo file provided"}, status=status.HTTP_400_BAD_REQUEST)

        photo_file = request.FILES['profile_photo']
        profile.profile_photo = photo_file
        profile.save()

        # Build absolute URL or standard media path
        photo_url = request.build_absolute_uri(profile.profile_photo.url) if profile.profile_photo else None

        return Response({
            "message": "Profile picture uploaded successfully!",
            "profile_photo_url": photo_url
        })
