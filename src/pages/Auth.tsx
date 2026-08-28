import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HeartPulse, 
  Loader2, 
  ArrowLeft, 
  Mail, 
  Lock, 
  KeyRound, 
  User, 
  Eye, 
  EyeOff, 
  FileText, 
  TrendingUp, 
  Users, 
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { useFamily } from '../lib/FamilyContext';
import { toast } from 'sonner';
import { NexolithHealthLogo } from '../components/NexolithHealthLogo';

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

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F5F8F8] text-[#18313A] font-sans selection:bg-[#55BFC2] selection:text-white relative overflow-hidden">
      
      {/* LEFT PANEL — ELEGANT HEALTHCARE STORYTELLING & VISUALS */}
      <div className="hidden lg:flex lg:w-7/12 bg-[#F5F8F8] flex-col justify-between p-10 xl:p-14 border-r border-[#E3EEEE] relative select-none">
        
        {/* TOP BRANDING AREA */}
        <div className="relative z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center p-2.5 rounded-2xl bg-[#DDF2F1] text-[#3AAFA9] shadow-2xs">
              <HeartPulse className="w-6 h-6 text-[#55BFC2]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#18313A] flex items-center gap-2">
                Nexolith <span className="text-[#55BFC2]">Care</span>
              </span>
              <p className="text-xs text-[#64777C]">Family Health & Vital Insights</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#1C696D] bg-[#DDF2F1]/80 px-3.5 py-1.5 rounded-full border border-[#B8DEDE]/60">
            <ShieldCheck className="w-4 h-4 text-[#3AAFA9]" />
            <span>Encrypted Health Record Vault</span>
          </div>
        </div>

        {/* CENTER HEALTHCARE VISUAL STORYTELLING & SUBTLE FLOATING CARDS */}
        <div className="relative z-10 my-auto py-6 max-w-2xl mx-auto w-full">
          
          {/* Main Headline */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl xl:text-4xl font-extrabold text-[#18313A] tracking-tight leading-tight mb-3">
              Your family's health, <br />
              <span className="text-[#55BFC2]">understood better.</span>
            </h1>
            <p className="text-[#64777C] text-sm xl:text-base leading-relaxed max-w-lg mx-auto">
              AI-assisted health reports, family monitoring and personalized health insights in one calm, secure space.
            </p>
          </div>

          {/* HEALTHCARE ILLUSTRATION WITH CONNECTED FEATURE CARDS */}
          <div className="relative h-[340px] sm:h-[360px] w-full flex items-center justify-center my-4">
            
            {/* SVG Connector Lines Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 600 360" fill="none">
              <defs>
                <linearGradient id="connectorGradTeal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#55BFC2" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#B8DEDE" stopOpacity="0.3" />
                </linearGradient>
                <linearGradient id="connectorGradMint" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3AAFA9" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#55BFC2" stopOpacity="0.3" />
                </linearGradient>
                <linearGradient id="connectorGradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E8B86A" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#B8DEDE" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Connector 1: Health Overview Card -> Central Logo */}
              <path
                d="M 160 75 C 205 75, 235 110, 248 142"
                stroke="url(#connectorGradMint)"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="160" cy="75" r="3.5" fill="#3AAFA9" className="animate-pulse" />
              <circle cx="248" cy="142" r="3" fill="#55BFC2" />

              {/* Connector 2: Family Sync Card -> Central Logo */}
              <path
                d="M 440 75 C 395 75, 365 110, 352 142"
                stroke="url(#connectorGradTeal)"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="440" cy="75" r="3.5" fill="#55BFC2" className="animate-pulse" />
              <circle cx="352" cy="142" r="3" fill="#3AAFA9" />

              {/* Connector 3: Lab Reports Card -> Central Logo */}
              <path
                d="M 430 280 C 390 280, 365 245, 352 218"
                stroke="url(#connectorGradAmber)"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="430" cy="280" r="3.5" fill="#E8B86A" className="animate-pulse" />
              <circle cx="352" cy="218" r="3" fill="#55BFC2" />
            </svg>

            {/* Central Nexolith Healthcare Emblem */}
            <div className="z-20">
              <NexolithHealthLogo size="xl" className="shadow-md transition-transform duration-700 hover:scale-105" />
            </div>

            {/* CONNECTED UI CARD 1: Health Overview (Upper-Left) */}
            <div className="absolute top-2 left-1 sm:left-4 xl:left-6 z-20 bg-white p-3.5 rounded-2xl shadow-sm border border-[#E3EEEE] flex items-center gap-3 animate-soft-float-1 hover:shadow-md transition-all">
              <div className="p-2.5 rounded-xl bg-[#EBF8F4] text-[#48A383]">
                <HeartPulse className="w-5 h-5 text-[#5DBB9A]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#18313A]">Health Overview</h4>
                <p className="text-[11px] text-[#48A383] font-bold">82% Healthy</p>
                <p className="text-[10px] text-[#64777C]">Overall family wellness</p>
              </div>
            </div>

            {/* CONNECTED UI CARD 2: Family Sync (Upper-Right) */}
            <div className="absolute top-4 right-1 sm:right-4 xl:right-6 z-20 bg-white p-3.5 rounded-2xl shadow-sm border border-[#E3EEEE] flex items-center gap-3 animate-soft-float-2 hover:shadow-md transition-all">
              <div className="p-2.5 rounded-xl bg-[#DDF2F1] text-[#3AAFA9]">
                <Users className="w-5 h-5 text-[#55BFC2]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#18313A]">Family Sync</h4>
                <p className="text-[11px] text-[#1C696D] font-bold">Active monitoring</p>
                <p className="text-[10px] text-[#64777C]">All members connected</p>
              </div>
            </div>

            {/* CONNECTED UI CARD 3: Lab Reports (Lower-Right) */}
            <div className="absolute bottom-4 right-3 sm:right-8 xl:right-12 z-20 bg-white p-3.5 rounded-2xl shadow-sm border border-[#E3EEEE] flex items-center gap-3 animate-soft-float-1 hover:shadow-md transition-all">
              <div className="p-2.5 rounded-xl bg-[#FDF8ED] text-[#D4A050]">
                <FileText className="w-5 h-5 text-[#E8B86A]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#18313A]">Lab Reports</h4>
                <p className="text-[11px] text-[#D4A050] font-bold">12 reports stored</p>
                <p className="text-[10px] text-[#64777C]">Secure record archive</p>
              </div>
            </div>

          </div>

          {/* BENEFIT CARDS */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-2xl bg-white border border-[#E3EEEE] shadow-2xs hover:shadow-sm transition-all">
              <div className="p-2 rounded-xl bg-[#DDF2F1] text-[#3AAFA9] w-fit mb-2.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#18313A] mb-1">AI Health Assistant</h3>
              <p className="text-[11px] text-[#64777C] leading-relaxed">
                Clear, simple explanations for lab results.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E3EEEE] shadow-2xs hover:shadow-sm transition-all">
              <div className="p-2 rounded-xl bg-[#EBF8F4] text-[#48A383] w-fit mb-2.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#18313A] mb-1">Vitals & Trends</h3>
              <p className="text-[11px] text-[#64777C] leading-relaxed">
                Track blood pressure, glucose & vitals.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E3EEEE] shadow-2xs hover:shadow-sm transition-all">
              <div className="p-2 rounded-xl bg-[#DDF2F1] text-[#3AAFA9] w-fit mb-2.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#18313A] mb-1">Family Vault</h3>
              <p className="text-[11px] text-[#64777C] leading-relaxed">
                Centralized medical profiles for everyone.
              </p>
            </div>
          </div>

        </div>

        {/* BOTTOM FOOTER */}
        <div className="relative z-20 flex items-center justify-between text-xs text-[#64777C] border-t border-[#E3EEEE] pt-4">
          <span>© 2026 Nexolith Care</span>
          <div className="flex items-center gap-4 font-medium">
            <span>HIPAA Compliant</span>
            <span>•</span>
            <span>Private & Encrypted</span>
          </div>
        </div>

      </div>

      {/* RIGHT PANEL — CLEAN LOGIN & AUTH CARD */}
      <div className="w-full lg:w-5/12 bg-[#F5F8F8] flex items-center justify-center p-6 sm:p-10 xl:p-14 relative z-10 overflow-y-auto">
        
        <div className="w-full max-w-md my-auto">
          
          {/* MOBILE LOGO DISPLAY */}
          <div className="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-[#E3EEEE]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#DDF2F1] text-[#3AAFA9]">
                <HeartPulse className="w-6 h-6 text-[#55BFC2]" />
              </div>
              <span className="text-xl font-bold text-[#18313A]">Nexolith Care</span>
            </div>
          </div>

          {/* MAIN CARD SURFACE */}
          <div className="bg-white rounded-3xl p-8 border border-[#E3EEEE] shadow-sm relative">
            
            {/* LOCAL ERROR ALERT */}
            {localError && (
              <div className="mb-6 p-4 rounded-2xl bg-[#FDF2F2] border border-[#FCE4E4] text-[#C25252] text-xs font-medium flex items-start space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D96C6C] mt-1 shrink-0" />
                <span>{localError}</span>
              </div>
            )}

            {/* 1. LOGIN MODE */}
            {mode === 'login' && (
              <div>
                <div className="mb-6 text-left">
                  <h2 className="text-2xl font-bold text-[#18313A] tracking-tight">Welcome back</h2>
                  <p className="text-xs text-[#64777C] mt-1">Sign in to your family health account.</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#18313A] mb-1.5">Username or Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64777C]">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="testfamily"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E3EEEE] bg-[#F5F8F8]/50 text-sm text-[#18313A] placeholder-[#64777C]/60 focus:outline-none focus:border-[#55BFC2] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#18313A]">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setLocalError(null);
                          setMode('forgot-password');
                        }}
                        className="text-xs text-[#3AAFA9] hover:underline font-semibold"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64777C]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="•••••••••"
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#E3EEEE] bg-[#F5F8F8]/50 text-sm text-[#18313A] placeholder-[#64777C]/60 focus:outline-none focus:border-[#55BFC2] focus:bg-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64777C] hover:text-[#18313A]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#55BFC2] hover:bg-[#3AAFA9] text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-[#E3EEEE] text-center">
                  <p className="text-xs text-[#64777C]">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setLocalError(null);
                        setMode('register');
                      }}
                      className="font-bold text-[#3AAFA9] hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* 2. REGISTER MODE */}
            {mode === 'register' && (
              <div>
                <div className="mb-6 text-left">
                  <h2 className="text-2xl font-bold text-[#18313A] tracking-tight">Create account</h2>
                  <p className="text-xs text-[#64777C] mt-1">Start tracking your family's health.</p>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#18313A] mb-1">Username</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64777C]">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose username"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3EEEE] bg-[#F5F8F8]/50 text-sm text-[#18313A] placeholder-[#64777C]/60 focus:outline-none focus:border-[#55BFC2] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#18313A] mb-1">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64777C]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3EEEE] bg-[#F5F8F8]/50 text-sm text-[#18313A] placeholder-[#64777C]/60 focus:outline-none focus:border-[#55BFC2] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#18313A] mb-1">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64777C]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E3EEEE] bg-[#F5F8F8]/50 text-sm text-[#18313A] placeholder-[#64777C]/60 focus:outline-none focus:border-[#55BFC2] focus:bg-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64777C]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#18313A] mb-1">Confirm Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64777C]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E3EEEE] bg-[#F5F8F8]/50 text-sm text-[#18313A] placeholder-[#64777C]/60 focus:outline-none focus:border-[#55BFC2] focus:bg-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64777C]"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full mt-3 py-3.5 px-4 rounded-xl bg-[#55BFC2] hover:bg-[#3AAFA9] text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-[#E3EEEE] text-center">
                  <p className="text-xs text-[#64777C]">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setLocalError(null);
                        setMode('login');
                      }}
                      className="font-bold text-[#3AAFA9] hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* 3. VERIFY EMAIL OTP MODE */}
            {mode === 'verify-email' && (
              <div>
                <button
                  onClick={() => setMode('login')}
                  className="flex items-center text-xs text-[#64777C] hover:text-[#18313A] mb-4 font-semibold"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sign in
                </button>

                <div className="mb-6 text-left">
                  <h2 className="text-2xl font-bold text-[#18313A] tracking-tight">Verify Email</h2>
                  <p className="text-xs text-[#64777C] mt-1">
                    Enter the 6-digit OTP code sent to <span className="font-semibold text-[#18313A]">{email || username}</span>.
                  </p>
                </div>

                <form onSubmit={handleVerifyEmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#18313A] mb-1.5">6-Digit Verification Code</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64777C]">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E3EEEE] bg-[#F5F8F8]/50 text-base font-mono tracking-widest text-[#18313A] placeholder-[#64777C]/50 focus:outline-none focus:border-[#55BFC2] focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#55BFC2] hover:bg-[#3AAFA9] text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code & Activate'}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-[#E3EEEE] text-center">
                  <button
                    type="button"
                    disabled={cooldown > 0}
                    onClick={handleResendOtp}
                    className="text-xs font-semibold text-[#3AAFA9] hover:underline disabled:opacity-50"
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend verification code'}
                  </button>
                </div>
              </div>
            )}

            {/* 4. FORGOT PASSWORD MODE */}
            {mode === 'forgot-password' && (
              <div>
                <button
                  onClick={() => setMode('login')}
                  className="flex items-center text-xs text-[#64777C] hover:text-[#18313A] mb-4 font-semibold"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sign in
                </button>

                <div className="mb-6 text-left">
                  <h2 className="text-2xl font-bold text-[#18313A] tracking-tight">Forgot Password</h2>
                  <p className="text-xs text-[#64777C] mt-1">
                    Enter your account email to receive a password reset OTP.
                  </p>
                </div>

                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#18313A] mb-1.5">Email Address or Username</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64777C]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E3EEEE] bg-[#F5F8F8]/50 text-sm text-[#18313A] placeholder-[#64777C]/60 focus:outline-none focus:border-[#55BFC2] focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#55BFC2] hover:bg-[#3AAFA9] text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Code'}
                  </button>
                </form>
              </div>
            )}

            {/* 5. VERIFY RESET OTP MODE */}
            {mode === 'verify-reset-otp' && (
              <div>
                <button
                  onClick={() => setMode('forgot-password')}
                  className="flex items-center text-xs text-[#64777C] hover:text-[#18313A] mb-4 font-semibold"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>

                <div className="mb-6 text-left">
                  <h2 className="text-2xl font-bold text-[#18313A] tracking-tight">Enter Reset OTP</h2>
                  <p className="text-xs text-[#64777C] mt-1">
                    Enter the 6-digit code sent to your email.
                  </p>
                </div>

                <form onSubmit={handleVerifyResetOtpSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#18313A] mb-1.5">6-Digit Reset Code</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64777C]">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E3EEEE] bg-[#F5F8F8]/50 text-base font-mono tracking-widest text-[#18313A] focus:outline-none focus:border-[#55BFC2] focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#55BFC2] hover:bg-[#3AAFA9] text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
                  </button>
                </form>
              </div>
            )}

            {/* 6. RESET PASSWORD MODE */}
            {mode === 'reset-password' && (
              <div>
                <div className="mb-6 text-left">
                  <h2 className="text-2xl font-bold text-[#18313A] tracking-tight">Set New Password</h2>
                  <p className="text-xs text-[#64777C] mt-1">Enter your new account password.</p>
                </div>

                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#18313A] mb-1.5">New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64777C]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#E3EEEE] bg-[#F5F8F8]/50 text-sm text-[#18313A] focus:outline-none focus:border-[#55BFC2] focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64777C]"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#18313A] mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64777C]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#E3EEEE] bg-[#F5F8F8]/50 text-sm text-[#18313A] focus:outline-none focus:border-[#55BFC2] focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64777C]"
                      >
                        {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#55BFC2] hover:bg-[#3AAFA9] text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password & Log In'}
                  </button>
                </form>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}