from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from family.models import Family
from .models import UserProfile
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed


from django.contrib.auth.hashers import make_password

class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(required=True, max_length=150)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate_username(self, value):
        val_clean = value.strip()
        if User.objects.filter(username__iexact=val_clean).exists():
            raise serializers.ValidationError("An account with this username already exists.")
        return val_clean

    def validate_email(self, value):
        val_clean = value.strip().lower()
        if User.objects.filter(email__iexact=val_clean).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return val_clean

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')

        if password != confirm_password:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        # Run Django password validation
        try:
            validate_password(password)
        except DjangoValidationError as err:
            raise serializers.ValidationError({"password": list(err.messages)})

        return attrs

    def create(self, validated_data):
        username = validated_data['username']
        email = validated_data['email']
        raw_password = validated_data['password']
        password_hash = make_password(raw_password)
        return {
            'username': username,
            'email': email,
            'password_hash': password_hash
        }


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Subclasses SimpleJWT TokenObtainPairSerializer to support login via Email or Username
    and reject unverified email users.
    """
    def validate(self, attrs):
        username_or_email = attrs.get(self.username_field, '')
        password = attrs.get('password', '')

        user = None
        if username_or_email:
            clean_id = username_or_email.strip()
            user = User.objects.filter(email__iexact=clean_id).first() or \
                   User.objects.filter(username__iexact=clean_id).first()

        if user:
            if user.check_password(password):
                profile, _ = UserProfile.objects.get_or_create(user=user)
                if not profile.is_email_verified:
                    raise AuthenticationFailed({
                        "detail": "Please verify your email before logging in.",
                        "email_unverified": True,
                        "username": user.username,
                        "email": user.email
                    }, code="email_unverified")
                attrs[self.username_field] = user.username

        data = super().validate(attrs)
        
        user = self.user
        data['username'] = user.username
        data['email'] = user.email
        data['family_id'] = getattr(user, 'family_account', None).id if hasattr(user, 'family_account') else None
        return data


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.CharField(required=True)
    otp = serializers.CharField(required=True, max_length=6, min_length=6)

    def validate_otp(self, value):
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError("OTP must be exactly 6 numeric digits.")
        return value


class ResendOTPSerializer(serializers.Serializer):
    email = serializers.CharField(required=True)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.CharField(required=True)


class VerifyResetOTPSerializer(serializers.Serializer):
    email = serializers.CharField(required=True)
    otp = serializers.CharField(required=True, max_length=6, min_length=6)

    def validate_otp(self, value):
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError("OTP must be exactly 6 numeric digits.")
        return value


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.CharField(required=True)
    otp = serializers.CharField(required=True, max_length=6, min_length=6)
    new_password = serializers.CharField(required=True, min_length=8, write_only=True)
    confirm_password = serializers.CharField(required=True, min_length=8, write_only=True)

    def validate(self, attrs):
        new_pw = attrs.get('new_password')
        confirm_pw = attrs.get('confirm_password')

        if new_pw != confirm_pw:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        try:
            validate_password(new_pw)
        except DjangoValidationError as err:
            raise serializers.ValidationError({"new_password": list(err.messages)})

        return attrs
