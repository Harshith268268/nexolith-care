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
        
        # 1. Update Core User Details (Email editing handled securely if provided)
        if 'email' in data and data.get('email'):
            new_email = data.get('email').strip().lower()
            if new_email != user.email:
                # Validate uniqueness
                if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                    return Response({"email": ["An account with this email address already exists."]}, status=status.HTTP_400_BAD_REQUEST)
                user.email = new_email
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

        # Sync Primary FamilyMember if it exists for this user
        if profile.full_name:
            try:
                from family.models import FamilyMember
                primary_member = FamilyMember.objects.filter(family__user=user, relation='Primary').first()
                if primary_member:
                    primary_member.name = profile.full_name
                    primary_member.save()
            except Exception:
                pass

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

        # Validate file size (max 5 MB)
        if photo_file.size > 5 * 1024 * 1024:
            return Response({"error": "Profile photo must be 5 MB or smaller."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file format (PNG, JPG, JPEG)
        content_type = getattr(photo_file, 'content_type', '').lower()
        filename = getattr(photo_file, 'name', '').lower()
        valid_types = ['image/jpeg', 'image/jpg', 'image/png']
        valid_exts = ('.jpg', '.jpeg', '.png')
        if content_type not in valid_types and not filename.endswith(valid_exts):
            return Response({"error": "Unsupported image format. Please upload PNG or JPG/JPEG."}, status=status.HTTP_400_BAD_REQUEST)

        profile.profile_photo = photo_file
        profile.save()

        # Build absolute URL or standard media path
        photo_url = request.build_absolute_uri(profile.profile_photo.url) if profile.profile_photo else None

        # Sync Primary FamilyMember avatar_url if exists
        try:
            from family.models import FamilyMember
            primary_member = FamilyMember.objects.filter(family__user=user, relation='Primary').first()
            if primary_member:
                primary_member.avatar_url = photo_url
                primary_member.save()
        except Exception:
            pass

        return Response({
            "message": "Profile picture uploaded successfully!",
            "profile_photo_url": photo_url
        })

    def delete(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)

        if profile.profile_photo:
            try:
                profile.profile_photo.delete(save=False)
            except Exception:
                pass
            profile.profile_photo = None
            profile.save()

        # Sync Primary FamilyMember avatar_url to None
        try:
            from family.models import FamilyMember
            primary_member = FamilyMember.objects.filter(family__user=user, relation='Primary').first()
            if primary_member:
                primary_member.avatar_url = None
                primary_member.save()
        except Exception:
            pass

        return Response({
            "message": "Profile picture removed successfully.",
            "profile_photo_url": None
        })

