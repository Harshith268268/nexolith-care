import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldCheck, BrainCircuit, HeartPulse, Loader2 } from 'lucide-react';
import { useFamily } from '../lib/FamilyContext';
import { toast } from 'sonner';

export function Auth() {
  const navigate = useNavigate();
  const { login, register, authError, authLoading, isAuthenticated } = useFamily();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(username, password);
        toast.success('Welcome back!');
      } else {
        await register(username, password);
        toast.success('Account created! Welcome to Nexolith Care.');
      }
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Brand/Illustration */}
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
                <p className="text-slate-600 text-sm">Your data is stored locally and securely.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-slate-500">
          © 2026 Nexolith Care Systems. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center text-primary-600 mb-8">
            <Activity className="w-8 h-8 mr-3" />
            <span className="text-2xl font-bold text-slate-900">Nexolith Care</span>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-slate-600 mb-8">
            {isLogin
              ? 'Enter your details to access your family records.'
              : "Start managing your family's health today."}
          </p>

          {authError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none"
                placeholder="e.g. testfamily"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setIsLogin(!isLogin); setUsername(''); setPassword(''); }}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}