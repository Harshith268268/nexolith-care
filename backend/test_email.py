import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings
from django.core.mail import send_mail

def test_smtp(recipient: str):
    print("=" * 60)
    print("      NEXOLITH CARE - SMTP EMAIL DIAGNOSTIC TEST")
    print("=" * 60)
    print(f"EMAIL_BACKEND:       {settings.EMAIL_BACKEND}")
    print(f"EMAIL_HOST:          {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT:          {settings.EMAIL_PORT}")
    print(f"EMAIL_USE_TLS:       {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_USE_SSL:       {getattr(settings, 'EMAIL_USE_SSL', False)}")
    print(f"EMAIL_HOST_USER:     {settings.EMAIL_HOST_USER or '(Not configured)'}")
    print(f"EMAIL_HOST_PASSWORD: {'*' * 8 if settings.EMAIL_HOST_PASSWORD else '(Not configured)'}")
    print(f"DEFAULT_FROM_EMAIL:  {settings.DEFAULT_FROM_EMAIL}")
    print("-" * 60)

    if not recipient:
        print("Error: Please provide a recipient email address.")
        print("Usage: python test_email.py <recipient_email>")
        return False

    print(f"Attempting to send test email to: {recipient} ...")
    
    subject = "Nexolith Care - Email Delivery Test"
    message = (
        "Hello!\n\n"
        "This is a test email from the Nexolith Care development server.\n"
        "If you received this message, your SMTP configuration is working correctly!\n\n"
        "Nexolith Care System"
    )
    html_message = (
        "<div style='font-family: Arial, sans-serif; padding: 20px; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 500px;'>"
        "<h2 style='color: #0284c7;'>Nexolith Care</h2>"
        "<p style='font-size: 16px;'>SMTP Email Delivery Test</p>"
        "<p style='font-size: 14px; color: #334155;'>If you received this message, your SMTP configuration is active and delivering emails successfully!</p>"
        "</div>"
    )

    try:
        sent_count = send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            html_message=html_message,
            fail_silently=False
        )
        print(f"\nSUCCESS! Email sent successfully. (Sent count: {sent_count})")
        print(f"Please check the inbox, spam, or promotions folder for: {recipient}")
        return True
    except Exception as exc:
        print(f"\nFAILURE! Failed to send email: {exc}")
        print("\nDiagnostic Checklist:")
        print(" 1. Is EMAIL_HOST_USER set to a valid Gmail address in .env?")
        print(" 2. Is EMAIL_HOST_PASSWORD set to a valid 16-character Gmail App Password?")
        print(" 3. Is 2-Step Verification enabled on the Google Account?")
        print(" 4. Is port 587 (TLS) or 465 (SSL) open and unblocked by firewall?")
        return False

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else settings.EMAIL_HOST_USER
    test_smtp(target)
