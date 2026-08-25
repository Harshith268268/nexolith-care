import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldCheck, BrainCircuit, HeartPulse, Loader2, ArrowLeft, Mail, Lock, KeyRound } from 'lucide-react';
import { useFamily } from '../lib/FamilyContext';
import { toast } from 'sonner';

type AuthMode = 'login' | 'register' | 'verify-email' | 'forgot-password' | 'verify-reset-otp' | 'reset-password';

export function Auth() {
  const navigate = useNavigate();
  const {
    login,
    register,
    verifyEmail,
    resendVerificationOtp,
    requestForgotPassword,
    verifyResetOtp,
    resetPassword,
    authError,
    authLoading,
    isAuthenticated
  } = useFamily();

  const [mode, setMode] = useState<AuthMode>('login');

  // Form Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // UI state
  const [localError, setLocalError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const startCooldown = (seconds = 60) => {
    setCooldown(seconds);
  };

  // 1. Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!username || !password) {
      setLocalError('Please enter both username and password.');
      return;
    }
    try {
      await login(username, password);
      toast.success('Welcome back!');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      if (err.emailUnverified) {
        const targetEmail = err.email || (username.includes('@') ? username : '');
        if (targetEmail) setEmail(targetEmail);
        setMode('verify-email');
        startCooldown(60);
        toast.error('Please verify your email with OTP before logging in.');
      } else {
        toast.error(err.message || 'Login failed. Please check credentials.');
      }
    }
  };

  // 2. Handle Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setLocalError('All fields are required.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    try {
      const res = await register(username.trim(), email.trim(), password, confirmPassword);
      toast.success(res.message || `Check your email. We've sent a 6-digit verification code to: ${email}`);
      setMode('verify-email');
      startCooldown(res.cooldown_seconds || 60);
    } catch (err: any) {
      toast.error(err.message || 'Registration failed.');
    }
  };

  // 3. Handle Verify Registration Email OTP
  const handleVerifyEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
      setLocalError('OTP must be exactly 6 numeric digits.');
      return;
    }

    try {
      await verifyEmail(email || username, otp);
      toast.success('Email verified successfully! Your account has been created. Please sign in.');
      setMode('login');
      setOtp('');
    } catch (err: any) {
      toast.error(err.message || 'OTP verification failed.');
    }
  };

  // Resend Email OTP
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setLocalError(null);
    try {
      const res = await resendVerificationOtp(email || username);
      toast.success(res.message || 'A new verification OTP has been sent.');
      startCooldown(res.cooldown_seconds || 60);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend OTP.');
    }
  };

  // 4. Handle Forgot Password Request
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('Please enter your email or username.');
      return;
    }

    try {
      const res = await requestForgotPassword(email.trim());
      toast.success(res.message || 'OTP sent if account exists.');
      setMode('verify-reset-otp');
      startCooldown(60);
    } catch (err: any) {
      toast.error(err.message || 'Request failed.');
    }
  };

  // 5. Handle Verify Reset OTP
  const handleVerifyResetOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
      setLocalError('OTP must be exactly 6 numeric digits.');
      return;
    }

    try {
      await verifyResetOtp(email, otp);
      toast.success('OTP verified! Enter your new password.');
      setMode('reset-password');
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired OTP.');
    }
  };

  // 6. Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!newPassword || !confirmNewPassword) {
      setLocalError('Please enter both password fields.');
      return;
    }
    if (newPassword.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    try {
      const res = await resetPassword(email, otp, newPassword, confirmNewPassword);
      toast.success(res.message || 'Password changed successfully! Please log in.');
      setMode('login');
      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setOtp('');
    } catch (err: any) {
      toast.error(err.message || 'Password reset failed.');
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Brand / Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-50 flex-col justify-between p-12 border-r border-slate-200 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-slate-50/50 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center text-primary-600 mb-12">
            <Activity className="w-8 h-8 mr-3" />
            <span className="text-2xl font-bold text-slate-900">Nexolith Care</span>
          </div>

          <h1 className="text-4xl font-bold text-slate-900 mb-6 leading-tight">
            Your family's health intelligence,
            <br />
            all in one place.
          </h1>
          <p className="text-lg text-slate-600 mb-12 max-w-md">
            Store medical records securely, understand complex reports with AI,
            and track vital health trends for your entire family.
          </p>

          <div className="space-y-6">
            <div className="flex items-start">
              <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 mr-4">
                <BrainCircuit className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">AI Report Simplification</h3>
                <p className="text-slate-600 text-sm">Complex medical jargon translated into plain English.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 mr-4">
                <HeartPulse className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Health Trend Tracking</h3>
                <p className="text-slate-600 text-sm">Monitor vital parameters over time with smart graphs.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 mr-4">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Secure & Private</h3>
                <p className="text-slate-600 text-sm">Email OTP authentication and encrypted data security.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-slate-500">
          © 2026 Nexolith Care Systems. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Dynamic Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center text-primary-600 mb-8">
            <Activity className="w-8 h-8 mr-3" />
            <span className="text-2xl font-bold text-slate-900">Nexolith Care</span>
          </div>

          {/* Error Message Display */}
          {(localError || authError) && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
              <span>{localError || authError}</span>
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {mode === 'login' && (
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
              <p className="text-slate-600 mb-8">Enter your details to access your family records.</p>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                  <input
                    type="text"
                    required
                    data-testid="login-username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none"
                    placeholder="e.g. testfamily"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-slate-700">Password</label>
                    <button
                      type="button"
                      data-testid="forgot-password-link"
                      onClick={() => { setMode('forgot-password'); setLocalError(null); }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    data-testid="login-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  data-testid="login-submit"
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sign In
                </button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <p className="text-sm text-slate-600">
                  Don't have an account?{' '}
                  <button
                    onClick={() => { setMode('register'); setLocalError(null); }}
                    data-testid="toggle-auth-mode"
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Sign up
                  </button>
                </p>
                <p className="text-sm text-slate-500">
                  Need to verify your email?{' '}
                  <button
                    onClick={() => {
                      if (username.includes('@')) setEmail(username);
                      setMode('verify-email');
                      setLocalError(null);
                    }}
                    className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
                  >
                    Verify Email with OTP
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* MODE 2: REGISTER */}
          {mode === 'register' && (
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Create your account</h2>
              <p className="text-slate-600 mb-8">Start managing your family's health today.</p>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    data-testid="register-username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none"
                    placeholder="e.g. janesmith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    data-testid="register-email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none"
                    placeholder="jane@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    data-testid="register-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none"
                    placeholder="At least 8 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    data-testid="register-confirm-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none"
                    placeholder="Re-enter password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  data-testid="register-submit"
                  className="w-full mt-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Account
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-slate-600">
                  Already have an account?{' '}
                  <button
                    onClick={() => { setMode('login'); setLocalError(null); }}
                    data-testid="toggle-auth-mode"
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* MODE 3: EMAIL OTP VERIFICATION */}
          {mode === 'verify-email' && (
            <div>
              <div className="bg-primary-50 p-3 rounded-2xl w-fit text-primary-600 mb-4">
                <Mail className="w-8 h-8" />
              </div>

              <h2 className="text-3xl font-bold text-slate-900 mb-2">Check your email</h2>
              <p className="text-slate-600 mb-6">
                We've sent a 6-digit verification code to:{' '}
                <span className="font-semibold text-slate-800">{email || username}</span>
              </p>

              <form onSubmit={handleVerifyEmailSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">6-Digit Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    data-testid="otp-input"
                    value={otp}
                    onChange={e => setOtp(e.target.value.trim())}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none"
                    placeholder="123456"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  data-testid="otp-submit"
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verify Email
                </button>
              </form>

              <div className="mt-6 text-center space-y-3">
                <p className="text-sm text-slate-600">
                  Didn't receive the OTP?{' '}
                  {cooldown > 0 ? (
                    <span className="text-slate-400 font-medium">
                      Resend OTP available in {cooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-testid="resend-otp"
                      onClick={handleResendOtp}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Resend OTP
                    </button>
                  )}
                </p>

                <div>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setLocalError(null); }}
                    className="text-xs text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-3 h-3" /> Back to Sign In
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 4: FORGOT PASSWORD */}
          {mode === 'forgot-password' && (
            <div>
              <div className="bg-amber-50 p-3 rounded-2xl w-fit text-amber-600 mb-4">
                <KeyRound className="w-8 h-8" />
              </div>

              <h2 className="text-3xl font-bold text-slate-900 mb-2">Forgot your password?</h2>
              <p className="text-slate-600 mb-6">
                Enter your registered email or username.
              </p>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email / Username</label>
                  <input
                    type="text"
                    required
                    data-testid="forgot-email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none"
                    placeholder="email@example.com or username"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  data-testid="forgot-submit"
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send OTP
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setLocalError(null); }}
                  className="text-sm text-slate-600 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* MODE 5: VERIFY RESET OTP */}
          {mode === 'verify-reset-otp' && (
            <div>
              <div className="bg-indigo-50 p-3 rounded-2xl w-fit text-indigo-600 mb-4">
                <Lock className="w-8 h-8" />
              </div>

              <h2 className="text-3xl font-bold text-slate-900 mb-2">Enter Reset Code</h2>
              <p className="text-slate-600 mb-6">
                Enter the 6-digit OTP code sent to{' '}
                <span className="font-semibold text-slate-800">{email}</span>.
              </p>

              <form onSubmit={handleVerifyResetOtpSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">6-Digit OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    data-testid="reset-otp"
                    value={otp}
                    onChange={e => setOtp(e.target.value.trim())}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none"
                    placeholder="123456"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  data-testid="reset-otp-submit"
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verify OTP
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('forgot-password'); setLocalError(null); }}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" /> Change Email
                </button>
              </div>
            </div>
          )}

          {/* MODE 6: RESET PASSWORD */}
          {mode === 'reset-password' && (
            <div>
              <div className="bg-emerald-50 p-3 rounded-2xl w-fit text-emerald-600 mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <h2 className="text-3xl font-bold text-slate-900 mb-2">Set New Password</h2>
              <p className="text-slate-600 mb-6">Create a strong new password for your account.</p>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    data-testid="new-password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none"
                    placeholder="At least 8 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    data-testid="confirm-new-password"
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none"
                    placeholder="Re-enter new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  data-testid="reset-password-submit"
                  className="w-full mt-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Reset Password
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}