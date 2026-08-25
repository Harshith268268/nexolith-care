from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from django.shortcuts import redirect

from core.views import HealthCheckView
from accounts.views import (
    CustomTokenObtainPairView,
    RegisterView,
    VerifyEmailOTPView,
    ResendVerificationOTPView,
    ForgotPasswordView,
    VerifyResetOTPView,
    ResetPasswordView
)

urlpatterns = [
    path('', lambda request: redirect('/api/health/')),
    path('admin/', admin.site.urls),
    path('api/health/', HealthCheckView.as_view(), name='health-check'),
    
    # Custom SimpleJWT Login checking email verification
    path('api/auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Explicit /api/auth/ aliases for convenience & spec compliance
    path('api/auth/register/', RegisterView.as_view(), name='auth-register'),
    path('api/auth/verify-email/', VerifyEmailOTPView.as_view(), name='auth-verify-email'),
    path('api/auth/resend-verification-otp/', ResendVerificationOTPView.as_view(), name='auth-resend-verification-otp'),
    path('api/auth/forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('api/auth/verify-reset-otp/', VerifyResetOTPView.as_view(), name='auth-verify-reset-otp'),
    path('api/auth/reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),
    
    path('api/accounts/', include('accounts.urls')),
    path('api/family/', include('family.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/alerts/', include('alerts.urls')),
    path('api/analytics/', include('analytics.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
