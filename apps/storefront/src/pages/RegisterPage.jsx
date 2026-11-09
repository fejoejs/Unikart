import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore, useUIStore } from '../store/useStore';
import UnikartLogo from '../components/UnikartLogo';
import {
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  UserPlus
} from 'lucide-react';
import { supabase } from '../services/supabase';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  // Default to initial ecommerce page (/) after account creation, not profile page
  const redirectPath = (rawRedirect && rawRedirect !== '/account') ? rawRedirect : '/';

  const { register } = useAuthStore();
  const { addToast } = useUIStore();

  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleGoogleRegister = async () => {
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
      console.error('Google register error:', err);
      setError(err.message || 'Google registration failed.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-[calc(100vh-140px)] bg-[#F8FAFC] flex flex-col justify-center items-center p-3 py-4">
      {/* ================= COMPACT CREATE ACCOUNT CARD ================= */}
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
                type={showPassword ? 'text' : 'password'}
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
            onClick={handleGoogleRegister}
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
            <Link
              to={`/login${redirectPath !== '/' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
              className="text-[11px] text-gray-600 hover:text-[#E31837] font-semibold"
            >
              Already have an account? <span className="text-[#E31837] font-bold underline">Sign In</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
