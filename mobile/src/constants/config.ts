import { Platform } from 'react-native';

/**
 * Centralized API Base URL configuration for Nexolith Care Mobile App.
 * Automatically resolves localhost for Android Emulator (10.0.2.2) vs Physical Device / Cloud fallback.
 */

const getDevApiUrl = (): string => {
  if (Platform.OS === 'android') {
    // 10.0.2.2 is special alias in Android Studio Emulator to host machine's 127.0.0.1
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
};

// Toggle to false for production cloud API testing
export const USE_LOCAL_BACKEND = true;

export const API_BASE_URL = USE_LOCAL_BACKEND
  ? getDevApiUrl()
  : 'https://nexolith-care-api.onrender.com';

export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/api/health/`,
  LOGIN: `${API_BASE_URL}/api/auth/login/`,
  REGISTER: `${API_BASE_URL}/api/auth/register/`,
  VERIFY_EMAIL: `${API_BASE_URL}/api/auth/verify-email/`,
  RESEND_OTP: `${API_BASE_URL}/api/auth/resend-verification-otp/`,
  FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password/`,
  RESET_PASSWORD: `${API_BASE_URL}/api/auth/reset-password/`,
  FAMILY_MEMBERS: `${API_BASE_URL}/api/family/members/`,
  REPORTS: `${API_BASE_URL}/api/reports/`,
  ALERTS: `${API_BASE_URL}/api/alerts/`,
  ANALYTICS: `${API_BASE_URL}/api/analytics/`,
};
