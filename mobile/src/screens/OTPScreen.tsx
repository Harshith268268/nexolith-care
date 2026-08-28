import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';

export const OTPScreen = ({ navigation }: any) => {
  const [otp, setOtp] = useState('');
  const [isResending, setIsResending] = useState(false);
  const { verifyOtp, pendingEmail, isLoading } = useAuth();

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length < 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit numeric verification OTP.');
      return;
    }

    try {
      await verifyOtp(otp.trim());
      Alert.alert(
        'Email Verified',
        'Your email verification is complete! Please sign in with your credentials.',
        [
          {
            text: 'Sign In',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Invalid or expired OTP code.');
    }
  };

  const handleResendOtp = async () => {
    if (!pendingEmail) {
      Alert.alert('Error', 'No pending email address found.');
      return;
    }
    setIsResending(true);
    try {
      await ApiService.resendOtp(pendingEmail);
      Alert.alert('OTP Resent', `A new verification code was sent to ${pendingEmail}.`);
    } catch (err: any) {
      Alert.alert('Resend Failed', err.message || 'Could not resend verification OTP.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Verify Email OTP</Text>
        <Text style={styles.cardSubtitle}>
          Enter the 6-digit numeric code sent to:
        </Text>
        <Text style={styles.emailBadge}>{pendingEmail || 'your email'}</Text>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.otpInput}
            placeholder="0 0 0 0 0 0"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleVerifyOtp}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Verify & Complete Registration</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResendOtp}
          disabled={isResending}
        >
          {isResending ? (
            <ActivityIndicator color="#0D9488" size="small" />
          ) : (
            <Text style={styles.resendText}>Resend Verification OTP</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.backText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  emailBadge: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D9488',
    marginBottom: 24,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  otpInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#0D9488',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 8,
  },
  submitButton: {
    backgroundColor: '#0D9488',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D9488',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  backText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
