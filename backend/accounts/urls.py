from django.urls import path
from .views import (
    RegisterView,
    VerifyEmailOTPView,
    ResendVerificationOTPView,
    ForgotPasswordView,
    VerifyResetOTPView,
    ResetPasswordView
)
from .profile_views import ProfileDetailView, ProfilePhotoUploadView
from .security_views import ChangePasswordView, LogoutAllView, ExportUserDataView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-email/', VerifyEmailOTPView.as_view(), name='verify-email'),
    path('resend-verification-otp/', ResendVerificationOTPView.as_view(), name='resend-verification-otp'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('verify-reset-otp/', VerifyResetOTPView.as_view(), name='verify-reset-otp'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    
    path('profile/', ProfileDetailView.as_view(), name='profile-detail'),
    path('profile/photo/', ProfilePhotoUploadView.as_view(), name='profile-photo-upload'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('logout-all/', LogoutAllView.as_view(), name='logout-all'),
    path('export-data/', ExportUserDataView.as_view(), name='export-data'),
]
