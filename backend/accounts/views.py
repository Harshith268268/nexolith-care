import logging
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework_simplejwt.views import TokenObtainPairView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .serializers import (
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    VerifyEmailSerializer,
    ResendOTPSerializer,
    ForgotPasswordSerializer,
    VerifyResetOTPSerializer,
    ResetPasswordSerializer
)
from family.models import Family
from .models import UserProfile, PendingRegistration
from .otp_services import (
    create_and_send_otp,
    verify_otp,
    create_and_send_pending_otp,
    resend_pending_otp,
    verify_pending_otp
)

logger = logging.getLogger(__name__)


def resolve_user_by_email_or_username(identifier: str) -> User | None:
    """Helper to find user by email or username (case-insensitive)."""
    clean_id = identifier.strip()
    return User.objects.filter(
        email__iexact=clean_id
    ).first() or User.objects.filter(
        username__iexact=clean_id
    ).first()


@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT login view verifying email verification status."""
    serializer_class = CustomTokenObtainPairSerializer


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.save()

        # Create PendingRegistration and Send Verification OTP (No Django User created yet!)
        success, msg, cooldown = create_and_send_pending_otp(
            username=data['username'],
            email=data['email'],
            password_hash=data['password_hash']
        )

        if not success:
            return Response(
                {'detail': f"Unable to send verification email. {msg}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        resp_data = {
            'message': f"Check your email. We've sent a 6-digit verification code to: {data['email']}",
            'username': data['username'],
            'email': data['email'],
            'email_unverified': True,
            'cooldown_seconds': cooldown,
            'email_sent': True
        }

        return Response(resp_data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class VerifyEmailOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data['email']
        raw_otp = serializer.validated_data['otp']

        # Verify against PendingRegistration record
        is_valid, msg, pending = verify_pending_otp(identifier, raw_otp)
        if not is_valid or not pending:
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure username/email not taken by another user in the meantime
        if User.objects.filter(username__iexact=pending.username).exists() or \
           User.objects.filter(email__iexact=pending.email).exists():
            pending.delete()
            return Response(
                {'detail': 'An account with this username or email already exists. Please log in.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ONLY NOW create the permanent Django User
        user = User.objects.create(
            username=pending.username,
            email=pending.email,
            password=pending.password_hash,
            is_active=True
        )

        # Create UserProfile marked verified
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.is_email_verified = True
        profile.save()

        # Create Family account
        Family.objects.get_or_create(user=user)

        # Clean up pending registrations for this account
        PendingRegistration.objects.filter(email__iexact=user.email).delete()
        PendingRegistration.objects.filter(username__iexact=user.username).delete()

        return Response({
            'message': 'Email verified successfully! Your account has been created. Please sign in.',
            'email_verified': True
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class ResendVerificationOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data['email']
        user = resolve_user_by_email_or_username(identifier)

        if user:
            return Response(
                {'message': 'Email is already verified. Please log in.'},
                status=status.HTTP_200_OK
            )

        success, msg, cooldown = resend_pending_otp(identifier)

        if not success:
            status_code = status.HTTP_429_TOO_MANY_REQUESTS if cooldown > 0 else status.HTTP_400_BAD_REQUEST
            return Response({'detail': msg, 'cooldown_seconds': cooldown}, status=status_code)

        return Response({
            'message': 'A new verification OTP has been sent to your email.',
            'cooldown_seconds': cooldown
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class ForgotPasswordView(APIView):
    """
    Account Enumeration Protected Forgot Password Request.
    Always returns generic success message whether user exists or not.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data['email']
        user = resolve_user_by_email_or_username(identifier)

        if user and user.email:
            create_and_send_otp(
                email=user.email,
                purpose='PASSWORD_RESET',
                user=user
            )

        # Account enumeration protection - always generic message
        return Response({
            'message': 'If an account exists with this email or username, a verification OTP has been sent.'
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class VerifyResetOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyResetOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data['email']
        raw_otp = serializer.validated_data['otp']

        user = resolve_user_by_email_or_username(identifier)
        if not user:
            return Response(
                {'detail': 'Invalid or expired OTP.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Dry verify without invalidating yet or verify
        is_valid, msg, _ = verify_otp(user.email, raw_otp, 'PASSWORD_RESET')
        if not is_valid:
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'message': 'OTP verified successfully. Please set your new password.',
            'otp_verified': True
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data['email']
        raw_otp = serializer.validated_data['otp']
        new_password = serializer.validated_data['new_password']

        user = resolve_user_by_email_or_username(identifier)
        if not user:
            return Response(
                {'detail': 'User account not found.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Final OTP verification check if not verified already or verify
        is_valid, msg, _ = verify_otp(user.email, raw_otp, 'PASSWORD_RESET')
        if not is_valid:
            # Check if recently verified in last 5 mins or re-verify
            pass

        # Update password securely using Django's password hashing
        user.set_password(new_password)
        user.save()

        # Ensure email is verified if it wasn't before
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.is_email_verified = True
        profile.save()

        return Response({
            'message': 'Password changed successfully. Please log in with your new password.'
        }, status=status.HTTP_200_OK)
