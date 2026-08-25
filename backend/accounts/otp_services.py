import secrets
import logging
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from django.conf import settings
from .models import EmailOTP, PendingRegistration

logger = logging.getLogger(__name__)

# Constants
OTP_EXPIRATION_MINUTES = 10
RESEND_COOLDOWN_SECONDS = 60
MAX_ATTEMPTS_PER_OTP = 5


def generate_6digit_otp() -> str:
    """Generate a cryptographically secure 6-digit numeric OTP."""
    return f"{secrets.randbelow(900000) + 100000}"


def _send_otp_email(recipient_email: str, title: str, raw_otp: str) -> tuple[bool, str]:
    """Helper to construct and send the 6-digit OTP email."""
    subject = f"Nexolith Care - {title} OTP"
    message = (
        f"Nexolith Care\n"
        f"{title}\n\n"
        f"Your verification OTP is: {raw_otp}\n\n"
        f"This OTP expires in {OTP_EXPIRATION_MINUTES} minutes.\n"
        f"If you did not request this, please ignore this email.\n"
    )

    html_message = (
        f"<div style='font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px;'>"
        f"<h2 style='color: #0284c7; margin-bottom: 8px;'>Nexolith Care</h2>"
        f"<h3 style='color: #334155; margin-top: 0;'>{title}</h3>"
        f"<p style='font-size: 15px;'>Your verification OTP code is:</p>"
        f"<div style='background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f172a; margin: 16px 0;'>"
        f"{raw_otp}"
        f"</div>"
        f"<p style='font-size: 13px; color: #64748b;'>This OTP expires in {OTP_EXPIRATION_MINUTES} minutes. Single-use only.</p>"
        f"<p style='font-size: 13px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;'>If you did not initiate this request, please ignore this message.</p>"
        f"</div>"
    )

    try:
        if getattr(settings, 'EMAIL_HOST_USER', None):
            from_email = f"Nexolith Care <{settings.EMAIL_HOST_USER}>"
        else:
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Nexolith Care <noreply@nexolithcare.com>')
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False
        )
        logger.info(f"Successfully sent {title} OTP email to {recipient_email}")
        return True, "OTP sent successfully."
    except Exception as exc:
        logger.error(f"Failed to send email to {recipient_email}: {exc}")
        err_detail = f"Failed to send verification email. {str(exc)}" if getattr(settings, 'DEBUG', False) else "Failed to send verification email. Please try again."
        return False, err_detail


def create_and_send_pending_otp(username: str, email: str, password_hash: str) -> tuple[bool, str, int]:
    """
    Creates/replaces a PendingRegistration record and sends the OTP verification email.
    """
    email_clean = email.lower().strip()
    username_clean = username.strip()

    # Remove any existing pending registration for this username or email
    PendingRegistration.objects.filter(
        email__iexact=email_clean
    ).delete()
    PendingRegistration.objects.filter(
        username__iexact=username_clean
    ).delete()

    raw_otp = generate_6digit_otp()
    otp_hash = make_password(raw_otp)
    expires_at = timezone.now() + timedelta(minutes=OTP_EXPIRATION_MINUTES)

    pending = PendingRegistration.objects.create(
        username=username_clean,
        email=email_clean,
        password_hash=password_hash,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempt_count=0
    )

    success, msg = _send_otp_email(email_clean, "Email Verification", raw_otp)
    return success, msg, 0


def resend_pending_otp(identifier: str) -> tuple[bool, str, int]:
    """Resends a new OTP for an existing PendingRegistration record with 60s cooldown."""
    clean_id = identifier.strip()
    pending = PendingRegistration.objects.filter(
        email__iexact=clean_id
    ).first() or PendingRegistration.objects.filter(
        username__iexact=clean_id
    ).first()

    if not pending:
        return False, "No pending registration found with this email or username. Please sign up.", 0

    # Cooldown check
    elapsed = (timezone.now() - pending.created_at).total_seconds()
    if elapsed < RESEND_COOLDOWN_SECONDS:
        seconds_remaining = int(RESEND_COOLDOWN_SECONDS - elapsed)
        return False, f"Please wait {seconds_remaining} seconds before requesting another OTP.", seconds_remaining

    raw_otp = generate_6digit_otp()
    pending.otp_hash = make_password(raw_otp)
    pending.expires_at = timezone.now() + timedelta(minutes=OTP_EXPIRATION_MINUTES)
    pending.attempt_count = 0
    pending.save()

    success, msg = _send_otp_email(pending.email, "Email Verification", raw_otp)
    return success, msg, 60


def verify_pending_otp(identifier: str, raw_otp: str) -> tuple[bool, str, PendingRegistration | None]:
    """Verifies submitted OTP against PendingRegistration record."""
    clean_id = identifier.strip()
    pending = PendingRegistration.objects.filter(
        email__iexact=clean_id
    ).first() or PendingRegistration.objects.filter(
        username__iexact=clean_id
    ).first()

    if not pending:
        return False, "No pending registration found. Please sign up.", None

    if timezone.now() > pending.expires_at:
        pending.delete()
        return False, "This OTP has expired. Please sign up again.", None

    if pending.attempt_count >= MAX_ATTEMPTS_PER_OTP:
        pending.delete()
        return False, "Too many failed attempts. This registration request has been invalidated.", None

    if not check_password(raw_otp, pending.otp_hash):
        pending.attempt_count += 1
        pending.save()
        remaining = MAX_ATTEMPTS_PER_OTP - pending.attempt_count
        return False, f"Incorrect OTP. {remaining} attempt(s) remaining.", None

    return True, "OTP verified successfully.", pending


def can_resend_otp(email: str, purpose: str) -> tuple[bool, int]:
    """Check if a resend cooldown is active for EmailOTP."""
    last_otp = EmailOTP.objects.filter(
        email__iexact=email,
        purpose=purpose
    ).order_by('-created_at').first()

    if not last_otp:
        return True, 0

    elapsed = (timezone.now() - last_otp.created_at).total_seconds()
    if elapsed < RESEND_COOLDOWN_SECONDS:
        seconds_remaining = int(RESEND_COOLDOWN_SECONDS - elapsed)
        return False, max(1, seconds_remaining)

    return True, 0


def create_and_send_otp(email: str, purpose: str, user=None) -> tuple[bool, str, int]:
    """Creates & emails a password reset OTP for existing User."""
    can_send, seconds_remaining = can_resend_otp(email, purpose)
    if not can_send:
        return False, f"Please wait {seconds_remaining} seconds before requesting another OTP.", seconds_remaining

    EmailOTP.objects.filter(
        email__iexact=email,
        purpose=purpose,
        is_verified=False
    ).update(is_verified=True)

    raw_otp = generate_6digit_otp()
    hashed_otp = make_password(raw_otp)
    expires_at = timezone.now() + timedelta(minutes=OTP_EXPIRATION_MINUTES)

    EmailOTP.objects.create(
        user=user,
        email=email.lower().strip(),
        otp_hash=hashed_otp,
        purpose=purpose,
        expires_at=expires_at,
        is_verified=False,
        attempt_count=0
    )

    title = "Password Reset" if purpose == "PASSWORD_RESET" else "Email Verification"
    success, msg = _send_otp_email(email, title, raw_otp)
    return success, msg, 0


def verify_otp(email: str, raw_otp: str, purpose: str) -> tuple[bool, str, EmailOTP | None]:
    """Verifies EmailOTP for existing User (e.g. Password Reset)."""
    email_clean = email.lower().strip()
    otp_obj = EmailOTP.objects.filter(
        email__iexact=email_clean,
        purpose=purpose,
        is_verified=False
    ).order_by('-created_at').first()

    if not otp_obj:
        return False, "Invalid or expired OTP. Please request a new code.", None

    if timezone.now() > otp_obj.expires_at:
        otp_obj.is_verified = True
        otp_obj.save()
        return False, "This OTP has expired. Please request a new code.", None

    if otp_obj.attempt_count >= MAX_ATTEMPTS_PER_OTP:
        otp_obj.is_verified = True
        otp_obj.save()
        return False, "Too many failed attempts. This OTP has been invalidated.", None

    if not check_password(raw_otp, otp_obj.otp_hash):
        otp_obj.attempt_count += 1
        otp_obj.save()
        remaining = MAX_ATTEMPTS_PER_OTP - otp_obj.attempt_count
        return False, f"Incorrect OTP. {remaining} attempt(s) remaining.", None

    otp_obj.is_verified = True
    otp_obj.save()
    return True, "OTP verified successfully.", otp_obj
