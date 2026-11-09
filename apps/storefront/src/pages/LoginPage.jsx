import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore, useUIStore } from '../store/useStore';
import api from '../lib/api';
import UnikartLogo from '../components/UnikartLogo';
import {
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  UserPlus,
  RotateCcw,
  X
} from 'lucide-react';
import { supabase } from '../services/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  const redirectPath = (rawRedirect && rawRedirect !== '/account') ? rawRedirect : '/';

  const { login, register } = useAuthStore();
  const { addToast } = useUIStore();

  // Mode: 'login' or 'register'
  const isRegisterMode = searchParams.get('mode') === 'register';
  const [showForgotModal, setShowForgotModal] = useState(
    searchParams.get('mode') === 'forgot'
  );

  useEffect(() => {
    if (searchParams.get('mode') === 'forgot') {
      setShowForgotModal(true);
    }
  }, [searchParams]);

  const switchMode = (newMode) => {
    setError('');
    const newParams = new URLSearchParams(searchParams);
    if (newMode === 'login') {
      newParams.delete('mode');
    } else {
      newParams.set('mode', newMode);
    }
    setSearchParams(newParams, { replace: true });
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setError('');
    setResetStep(1);
    setResetToken('');
    setNewPassword('');
    setResetSuccessMsg('');
    setResendCooldown(0);
    if (searchParams.get('mode') === 'forgot') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('mode');
      setSearchParams(newParams, { replace: true });
    }
  };

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Feedback & Loading
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password flow state
  const [resetStep, setResetStep] = useState(1);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // ---------------- LOGIN HANDLER ----------------
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email.trim(), password, 'customer');
      if (res.success) {
        addToast(`Signed in successfully! Welcome back, ${(res.user.name || res.user.email || 'Customer').split(' ')[0]}.`, 'success');
        navigate(redirectPath);
      } else {
        setError(res.message || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------- REGISTER HANDLER ----------------
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!registerName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    const cleanPhone = registerPhone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!registerEmail.trim() || !/^\S+@\S+\.\S+$/.test(registerEmail.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!registerPassword || registerPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: registerName.trim(),
        email: registerEmail.trim(),
        phone: cleanPhone,
        password: registerPassword
      });

      if (res.success) {
        addToast(`Account created successfully! Welcome to UNIKART, ${registerName.trim().split(' ')[0]}!`, 'success');
        navigate(redirectPath);
      } else {
        setError(res.message || 'Registration failed. Email or phone may already be registered.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration encountered an error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------- FORGOT PASSWORD HANDLERS ----------------
  const handleRequestResetToken = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address to receive an OTP.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setResetSuccessMsg(res.data?.message || 'Password reset OTP sent to your registered email. Please check your inbox.');
      setResetStep(2);
      setResendCooldown(30);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to request password reset OTP. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email.trim() || resendCooldown > 0 || isResending) return;
    setError('');
    setIsResending(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setResetSuccessMsg(res.data?.message || 'A fresh 6-digit OTP has been sent to your email. Please check your inbox.');
      setResendCooldown(30);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend OTP. Please wait a few seconds and try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetToken.trim() || !newPassword) {
      setError('Please enter both the 6-digit OTP and your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: email.trim(),
        otp: resetToken.trim(),
        token: resetToken.trim(),
        new_password: newPassword
      });
      addToast(res.data?.message || 'Password reset successfully! You can now log in.', 'success');
      setPassword(newPassword);
      closeForgotModal();
      setResetStep(1);
      setResetToken('');
      setNewPassword('');
      setResetSuccessMsg('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------- GOOGLE OAUTH ----------------
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized.');
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectPath || '/'}`
        }
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err) {
      console.error('Supabase Google OAuth error:', err);
      setError(err.message || 'Google Sign-In failed via Supabase.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-[calc(100vh-140px)] bg-[#F8FAFC] flex flex-col justify-center items-center p-3 py-4">
      
      {/* ================= CREATE ACCOUNT CARD (REDUCED HEIGHT) ================= */}
      {isRegisterMode ? (
        <div className="w-full max-w-[360px] bg-white rounded-2xl shadow-card border border-[#E8E8E8] p-4 sm:p-5 space-y-2.5 animate-fadeIn">
          
          {/* Brand Header */}
          <div className="text-center space-y-1">
            <Link to="/" className="inline-block" title="Back to UNIKART Marketplace">
              <UnikartLogo variant="light" iconSize={28} showTagline={true} />
            </Link>
            <h2 className="text-sm sm:text-base font-black text-[#222222] tracking-tight">
              Create Your UNIKART Account
            </h2>
            <p className="text-[10.5px] text-[#777777] leading-tight">
              Join UNIKART for lightning-fast deliveries and exclusive deals
            </p>
          </div>

          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-[#E31837] flex items-center gap-1.5">
              <span>&bull;</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-2">
            <div>
              <label className="block text-[11px] font-bold text-[#222222] mb-0.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  required
                  value={registerName}
                  onChange={(e) => {
                    setRegisterName(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-[#E31837] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#222222] mb-0.5">
                Mobile Number (+91)
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                <input
                  type="tel"
                  maxLength={10}
                  required
                  value={registerPhone}
                  onChange={(e) => {
                    setRegisterPhone(e.target.value.replace(/\D/g, ''));
                    setError('');
                  }}
                  placeholder="10-digit mobile number"
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#E31837] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#222222] mb-0.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                <input
                  type="email"
                  required
                  value={registerEmail}
                  onChange={(e) => {
                    setRegisterEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="name@example.com"
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-[#E31837] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#222222] mb-0.5">
                Create Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  required
                  value={registerPassword}
                  onChange={(e) => {
                    setRegisterPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-gray-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#E31837] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  title={showRegisterPassword ? 'Hide password' : 'Show password'}
                >
                  {showRegisterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-3 mt-1 rounded-xl bg-[#E31837] hover:bg-[#C7122E] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              <UserPlus className="w-3.5 h-3.5" />
            </button>

            {/* Google Sign In Divider */}
            <div className="relative my-1.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-[9px] uppercase">
                <span className="bg-white px-2 text-gray-400 font-bold">Or sign up with</span>
              </div>
            </div>

            {/* Google Sign Up Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-1.5 px-3 rounded-xl border border-gray-300 hover:bg-gray-50 active:bg-gray-100 text-xs font-bold text-gray-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-[11px] text-gray-600 hover:text-[#E31837] font-semibold cursor-pointer"
              >
                Already have an account? <span className="text-[#E31837] font-bold underline">Sign In</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ================= SIGN IN CARD ================= */
        <div className="w-full max-w-[360px] bg-white rounded-2xl shadow-card border border-[#E8E8E8] p-4 sm:p-5 space-y-3 animate-fadeIn">
          
          {/* Brand Header */}
          <div className="text-center space-y-1">
            <Link to="/" className="inline-block" title="Back to UNIKART Marketplace">
              <UnikartLogo variant="light" iconSize={28} showTagline={true} />
            </Link>
            <h2 className="text-sm sm:text-base font-black text-[#222222] tracking-tight">
              Sign In to Your Account
            </h2>
            <p className="text-[10.5px] text-[#777777] leading-tight">
              Track orders, manage saved wishlists, and checkout securely
            </p>
          </div>

          {error && !showForgotModal && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-[#E31837] flex items-center gap-1.5">
              <span>&bull;</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-[#222222] mb-0.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="name@example.com"
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-[#E31837] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[11px] font-bold text-[#222222]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setShowForgotModal(true);
                  }}
                  className="text-[10.5px] font-bold text-[#E31837] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="••••••••"
                  className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-gray-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#E31837] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-3 rounded-xl bg-[#E31837] hover:bg-[#C7122E] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Google Sign In Divider */}
            <div className="relative my-1.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-[9px] uppercase">
                <span className="bg-white px-2 text-gray-400 font-bold">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-1.5 px-3 rounded-xl border border-gray-300 hover:bg-gray-50 active:bg-gray-100 text-xs font-bold text-gray-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Switch to Create Account */}
            <div className="pt-2">
              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-gray-200 w-full" />
                <span className="bg-white px-2 text-[9.5px] text-gray-400 font-bold uppercase tracking-wider absolute">
                  New to UNIKART?
                </span>
              </div>

              <button
                type="button"
                onClick={() => switchMode('register')}
                className="w-full mt-2 py-1.5 px-3 rounded-xl border border-gray-300 hover:border-black bg-white hover:bg-gray-50 text-[#222222] font-bold text-xs text-center transition-all block cursor-pointer shadow-2xs"
              >
                Create Your UNIKART Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= FORGOT PASSWORD MODAL ================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-[360px] bg-white rounded-2xl shadow-2xl p-4 sm:p-5 border border-gray-100 relative animate-scaleUp">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={closeForgotModal}
              className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center space-y-1 mb-3 pr-4">
              <h3 className="text-sm font-black text-[#222222] tracking-tight flex items-center justify-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#E31837]" />
                <span>Reset Password</span>
              </h3>
              <p className="text-[10.5px] text-[#777777] leading-tight">
                {resetStep === 1
                  ? 'Enter your registered email to receive a 6-digit OTP'
                  : 'Enter the 6-digit OTP from your email and new password'}
              </p>
            </div>

            {error && (
              <div className="p-2 mb-2 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-[#E31837] flex items-center gap-1.5">
                <span>&bull;</span>
                <span>{error}</span>
              </div>
            )}

            {resetSuccessMsg && (
              <div className="p-2 mb-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            {resetStep === 1 ? (
              <form onSubmit={handleRequestResetToken} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#222222] mb-0.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      placeholder="name@example.com"
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-[#E31837]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-3 rounded-xl bg-[#E31837] hover:bg-[#C7122E] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Sending OTP...' : 'Send Reset OTP'}</span>
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#222222] mb-0.5">
                    6-Digit Verification OTP
                  </label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    maxLength={10}
                    onChange={(e) => {
                      setResetToken(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter 6-digit OTP (e.g. 123456)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#E31837]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#222222] mb-0.5">
                    New Secure Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="At least 6 characters"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#E31837]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-3 rounded-xl bg-[#E31837] hover:bg-[#C7122E] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>

                {/* Resend OTP & Change Email Actions */}
                <div className="flex items-center justify-between text-[11px] pt-1 px-0.5 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isResending}
                    onClick={handleResendOtp}
                    className="text-[#E31837] hover:underline font-bold disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <RotateCcw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                    <span>
                      {isResending ? 'Resending...' : resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep(1);
                      setError('');
                      setResetSuccessMsg('');
                      setResetToken('');
                    }}
                    className="text-gray-500 hover:text-black font-semibold cursor-pointer"
                  >
                    Change Email
                  </button>
                </div>
              </form>
            )}

            <div className="pt-2 text-center border-t border-gray-100 mt-2">
              <button
                type="button"
                onClick={closeForgotModal}
                className="text-[11px] text-gray-500 hover:text-black font-semibold cursor-pointer"
              >
                &larr; Back to Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
