from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient
from rest_framework import status
from django.core import mail

from accounts.models import UserProfile, EmailOTP, PendingRegistration


class PendingRegistrationAndOTPTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create an existing verified user for login tests
        self.verified_user = User.objects.create_user(
            username='verifieduser',
            email='verified@example.com',
            password='Password123!'
        )
        UserProfile.objects.create(user=self.verified_user, is_email_verified=True)

    def test_registration_does_not_create_django_user_before_otp(self):
        """CRITICAL: Registration must NOT create a permanent Django User before OTP verification."""
        url = '/api/auth/register/'
        payload = {
            'username': 'newuser1',
            'email': 'newuser1@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data.get('email_unverified'))
        
        # Verify permanent Django User does NOT exist
        self.assertFalse(User.objects.filter(username='newuser1').exists())
        self.assertFalse(User.objects.filter(email='newuser1@example.com').exists())

        # Verify PendingRegistration record created
        self.assertTrue(PendingRegistration.objects.filter(username='newuser1').exists())

        # Verify verification OTP email sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Email Verification OTP', mail.outbox[0].subject)

    def test_registration_duplicate_username_fails(self):
        url = '/api/auth/register/'
        payload = {
            'username': 'verifieduser',
            'email': 'different@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', res.data)

    def test_registration_duplicate_email_fails(self):
        url = '/api/auth/register/'
        payload = {
            'username': 'uniqueusername',
            'email': 'verified@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', res.data)

    def test_registration_password_mismatch_fails(self):
        url = '/api/auth/register/'
        payload = {
            'username': 'mismatchuser',
            'email': 'mismatch@example.com',
            'password': 'Password123!',
            'confirm_password': 'DifferentPassword123!'
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('confirm_password', res.data)

    def test_unverified_user_cannot_login(self):
        """Unverified registration cannot login because permanent account does not exist."""
        # Initiate pending registration
        self.client.post('/api/auth/register/', {
            'username': 'pendinguser',
            'email': 'pending@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        }, format='json')

        url = '/api/auth/login/'
        payload = {
            'username': 'pendinguser',
            'password': 'Password123!'
        }
        res = self.client.post(url, payload, format='json')
        self.assertNotEqual(res.status_code, status.HTTP_200_OK)

    def test_wrong_otp_does_not_create_user(self):
        raw_otp = '123456'
        PendingRegistration.objects.create(
            username='pendinguser2',
            email='pending2@example.com',
            password_hash=make_password('Password123!'),
            otp_hash=make_password(raw_otp),
            expires_at=timezone.now() + timedelta(minutes=10)
        )

        url = '/api/auth/verify-email/'
        payload = {
            'email': 'pending2@example.com',
            'otp': '999999' # Wrong OTP
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Permanent user must NOT be created
        self.assertFalse(User.objects.filter(username='pendinguser2').exists())

    def test_correct_otp_creates_permanent_user_and_profile(self):
        raw_otp = '123456'
        PendingRegistration.objects.create(
            username='pendinguser3',
            email='pending3@example.com',
            password_hash=make_password('Password123!'),
            otp_hash=make_password(raw_otp),
            expires_at=timezone.now() + timedelta(minutes=10)
        )

        url = '/api/auth/verify-email/'
        payload = {
            'email': 'pending3@example.com',
            'otp': raw_otp
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Permanent user MUST now exist
        user = User.objects.get(username='pendinguser3')
        self.assertTrue(user.profile.is_email_verified)

        # PendingRegistration MUST be deleted
        self.assertFalse(PendingRegistration.objects.filter(username='pendinguser3').exists())

    def test_can_login_after_otp_verification(self):
        raw_otp = '654321'
        PendingRegistration.objects.create(
            username='pendinguser4',
            email='pending4@example.com',
            password_hash=make_password('Password123!'),
            otp_hash=make_password(raw_otp),
            expires_at=timezone.now() + timedelta(minutes=10)
        )

        # Verify OTP
        self.client.post('/api/auth/verify-email/', {
            'email': 'pending4@example.com',
            'otp': raw_otp
        }, format='json')

        # Attempt Login
        login_res = self.client.post('/api/auth/login/', {
            'username': 'pendinguser4',
            'password': 'Password123!'
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_res.data)

    def test_expired_otp_verification_fails(self):
        raw_otp = '654321'
        PendingRegistration.objects.create(
            username='pendinguser5',
            email='pending5@example.com',
            password_hash=make_password('Password123!'),
            otp_hash=make_password(raw_otp),
            expires_at=timezone.now() - timedelta(minutes=1)
        )

        url = '/api/auth/verify-email/'
        payload = {
            'email': 'pending5@example.com',
            'otp': raw_otp
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('expired', res.data.get('detail', '').lower())
        self.assertFalse(User.objects.filter(username='pendinguser5').exists())

    def test_forgot_password_generic_response(self):
        url = '/api/auth/forgot-password/'
        
        # Test registered email
        res1 = self.client.post(url, {'email': 'verified@example.com'}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        
        # Test unregistered email
        res2 = self.client.post(url, {'email': 'nonexistent@example.com'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data['message'], res2.data['message'])

    def test_reset_password_success(self):
        raw_otp = '999888'
        EmailOTP.objects.create(
            user=self.verified_user,
            email=self.verified_user.email,
            otp_hash=make_password(raw_otp),
            purpose='PASSWORD_RESET',
            expires_at=timezone.now() + timedelta(minutes=10),
            is_verified=False
        )

        url = '/api/auth/reset-password/'
        payload = {
            'email': self.verified_user.email,
            'otp': raw_otp,
            'new_password': 'BrandNewPassword123!',
            'confirm_password': 'BrandNewPassword123!'
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Verify new password works
        login_res = self.client.post('/api/auth/login/', {'username': 'verifieduser', 'password': 'BrandNewPassword123!'}, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
