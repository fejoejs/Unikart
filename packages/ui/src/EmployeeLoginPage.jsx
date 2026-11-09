// packages/ui/src/EmployeeLoginPage.jsx - Single Centered UNIKART Internal Application Login Card
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '@unikart/api-client';
import {
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Boxes,
  Check,
  X
} from 'lucide-react';

const APP_CONFIG = {
  admin: {
    title: 'Admin Governance Login',
    desc: 'Sign in to full company-level administrative workspace.',
    Icon: ShieldCheck,
    defaultRedirect: '/admin/overview',
  },
  inventory: {
    title: 'Inventory & Business Management Login',
    desc: 'Sign in to Admin Governance or Authorized Inventory Workspace.',
    Icon: Boxes,
    defaultRedirect: '/',
  },
};

export default function EmployeeLoginPage({
  appId = 'admin',
  appName: customAppName,
  appSubtitle: customAppSubtitle,
  appIcon: customAppIcon,
  onLoginSuccess,
  supabaseClient,
  onGoogleLogin,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const config = APP_CONFIG[appId] || APP_CONFIG.admin;
  const appTitle = customAppName || config.title;
  const appDesc = customAppSubtitle || config.desc;
  const IconComponent = customAppIcon || config.Icon;

  // The login form must load with EMPTY fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Handle Google OAuth Redirect Callback if Supabase credentials exist
  useEffect(() => {
    if (!supabaseClient) return;

    const hasOAuthHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');
    const hasOAuthCode = typeof window !== 'undefined' && window.location.search.includes('code=');
    if (!hasOAuthHash && !hasOAuthCode) return;

    setLoading(true);
    setSuccessMsg('Verifying Google credentials with UNIKART Security...');

    const processOAuth = async (sessionParam) => {
      try {
        let session = sessionParam;
        if (!session) {
          const { data } = await supabaseClient.auth.getSession();
          session = data?.session;
        }

        if (!session?.user) return;

        const u = session.user;
        const userEmail = u.email;
        if (!userEmail) return;

        const userName = u.user_metadata?.full_name || u.user_metadata?.name || userEmail.split('@')[0];

        // Call authoritative backend /auth/oauth to verify Google identity and fetch roles
        const res = await apiClient.post('/auth/oauth', {
          provider: 'google',
          email: userEmail,
          token: session.access_token,
          full_name: userName,
          phone: u.phone || null
        });

        // Clean up hash/code in URL
        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
        }

        if (res.data?.access_token) {
          const token = res.data.access_token;
          const rawUser = res.data.user || {};
          const roles = rawUser.roles || res.data.roles || [];

          const isAdmin =
            roles.includes('admin') ||
            roles.includes('owner') ||
            (rawUser.roleLevel >= 8) ||
            (res.data.role_level >= 8) ||
            (userEmail.toLowerCase() === 'admin@unikart.in');

          const isStaff =
            roles.includes('inventory_staff') ||
            roles.includes('inventory') ||
            roles.includes('manager') ||
            (rawUser.roleLevel >= 5) ||
            (res.data.role_level >= 5) ||
            isAdmin;

          // Check if promoted/authorized for internal workspace
          if (!isAdmin && !isStaff) {
            setErrorMsg(`Access Denied: Your Google account (${userEmail}) does not have Admin or Inventory Staff privileges. Please ask Super Admin to promote your account.`);
            setLoading(false);
            setSuccessMsg('');
            await supabaseClient.auth.signOut().catch(() => {});
            return;
          }

          const user = {
            ...rawUser,
            id: rawUser.id || res.data.user_id,
            name: rawUser.name || rawUser.fullName || res.data.full_name || userName,
            email: userEmail,
            roleLevel: rawUser.roleLevel ?? res.data.role_level ?? (isAdmin ? 9 : 5),
            roles: roles.length > 0 ? roles : (isAdmin ? ['admin'] : ['inventory_staff']),
            roleId: isAdmin ? 'role-admin' : 'role-inventory-staff',
            permissions: rawUser.permissions || res.data.permissions || ['*'],
            permittedApps: ['storefront', 'inventory'],
            apps: ['storefront', 'inventory']
          };

          // Save tokens across tab and shared storage
          sessionStorage.setItem('unikart_tab_token', token);
          sessionStorage.setItem('unikart_tab_user', JSON.stringify({ ...user, token }));
          sessionStorage.setItem('unikart_tab_login_time', Date.now().toString());

          localStorage.setItem('unikart_token', token);
          localStorage.setItem('unikart_emp_token', token);
          if (isAdmin) {
            localStorage.setItem('unikart_admin_token', token);
            localStorage.setItem('unikart_admin_user', JSON.stringify(user));
          }
          localStorage.setItem('unikart_user', JSON.stringify({ ...user, token }));

          if (typeof onLoginSuccess === 'function') {
            onLoginSuccess({ token, user });
            return;
          }

          const targetDestination = isAdmin ? '/admin/overview' : '/inventory/dashboard';
          setSuccessMsg(`Welcome, ${user.name}! Redirecting to workspace...`);
          setTimeout(() => {
            navigate(targetDestination, { replace: true });
          }, 300);
        }
      } catch (err) {
        const detail = err.response?.data?.detail || err.message || 'Google authentication failed.';
        setErrorMsg(detail);
        setLoading(false);
        setSuccessMsg('');
      }
    };

    processOAuth();

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && (hasOAuthHash || hasOAuthCode)) {
        processOAuth(session);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, [supabaseClient]);

  // Read saved remembered email from localStorage if user previously checked Remember Me
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`unikart_remember_email_${appId}`);
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {}
  }, [appId]);

  // Destination after successful login
  const from = location.state?.from?.pathname || config.defaultRedirect || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      setErrorMsg('Please enter your work email or employee ID.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (rememberMe) {
        localStorage.setItem(`unikart_remember_email_${appId}`, email.trim());
      } else {
        localStorage.removeItem(`unikart_remember_email_${appId}`);
      }

      // 1. Attempt API authentication
      let loginRes;
      try {
        loginRes = await apiClient.post('/auth/login', {
          email: email.trim(),
          password
        });
      } catch (apiErr) {
        const detail = apiErr.response?.data?.detail || apiErr.message;
        setErrorMsg(detail || 'Invalid work email or password. Please verify your credentials with your administrator.');
        setLoading(false);
        return;
      }

      if (loginRes?.data?.access_token) {
        const token = loginRes.data.access_token;
        const rawUser = loginRes.data.user || {};
        const permittedApps = rawUser.permittedApps || rawUser.apps || loginRes.data.apps || ['storefront', appId];
        const user = {
          ...rawUser,
          id: rawUser.id || loginRes.data.user_id,
          name: rawUser.name || rawUser.fullName || loginRes.data.full_name,
          email: rawUser.email || loginRes.data.email,
          roleLevel: rawUser.roleLevel ?? loginRes.data.role_level ?? (appId === 'admin' ? 9 : 5),
          roles: rawUser.roles || loginRes.data.roles || ['staff'],
          permissions: rawUser.permissions || loginRes.data.permissions || ['*'],
          permittedApps,
          apps: permittedApps
        };

        // Check if account is disabled or deactivated
        if (user && user.is_active === false) {
          setErrorMsg('Account disabled: Your account has been suspended or deactivated. Contact Admin.');
          setLoading(false);
          return;
        }

        // Verify application authorization (Owner and Admin have universal access)
        const isAdmin = user.roleLevel >= 8 || user.roles?.includes('admin') || user.roles?.includes('owner');
        const hasAccess = isAdmin || permittedApps.includes(appId) || permittedApps.includes('*');

        if (!hasAccess) {
          setErrorMsg(`Unauthorized: Your employee account (${user.email}) does not have permission to access ${appTitle}. Contact Admin for app provisioning.`);
          setLoading(false);
          return;
        }

        // Save session tokens across tab and shared storage
        sessionStorage.setItem('unikart_tab_token', token);
        sessionStorage.setItem('unikart_tab_user', JSON.stringify({ ...user, token }));
        sessionStorage.setItem('unikart_tab_login_time', Date.now().toString());

        localStorage.setItem('unikart_token', token);
        localStorage.setItem('unikart_emp_token', token);
        if (appId === 'admin') {
          localStorage.setItem('unikart_admin_token', token);
          localStorage.setItem('unikart_admin_user', JSON.stringify(user));
        }
        localStorage.setItem('unikart_user', JSON.stringify({ ...user, token }));

        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess({ token, user });
          return;
        }

        let targetDestination;
        if (isAdmin) {
          targetDestination = (from && from.startsWith('/admin')) ? from : '/admin/overview';
        } else {
          targetDestination = (from && from.startsWith('/inventory')) ? from : '/inventory/dashboard';
        }

        setSuccessMsg('Session authorized. Redirecting to workspace...');
        setTimeout(() => {
          navigate(targetDestination, { replace: true });
        }, 200);
        return;
      }

      setErrorMsg('Invalid work email or password. Please verify your credentials with your administrator.');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Authentication error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.trim()) {
      setForgotError('Please enter your work email address.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotMsg('');

    try {
      const res = await apiClient.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotMsg(res.data?.message || 'Password reset request generated. Please contact your Admin for verification.');
    } catch (err) {
      setForgotMsg('Password reset request sent. Please contact your administrator for assistance.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-[#E8173D] selection:text-white">
      
      {/* ================= ONE CENTERED LOGIN CARD ================= */}
      <div className="w-full max-w-[420px] bg-white border border-[#E8E8E8] rounded-2xl shadow-xl p-5 sm:p-8 space-y-5">
        
        {/* Card Header: Application Title + Welcome Back + Description */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 text-[#E8173D] border border-red-100 mb-2 shadow-xs">
            {IconComponent ? <IconComponent className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <h1 className="text-xl font-bold text-[#222222] tracking-tight">
            {appTitle}
          </h1>
          <h2 className="text-sm font-semibold text-[#222222]/90">
            Welcome Back
          </h2>
          <p className="text-xs text-[#777777]">
            {appDesc}
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-[#E8173D] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="font-medium leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Standard Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="employee-email-input" className="block text-xs font-bold text-[#222222] mb-1.5">
              Work Email / Employee ID
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777777]" />
              <input
                id="employee-email-input"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter work email or employee ID"
                autoComplete="username"
                className="w-full h-11 pl-10 pr-3.5 text-sm sm:text-xs bg-white border border-[#E8E8E8] rounded-xl focus:border-[#E8173D] focus:ring-2 focus:ring-[#E8173D]/15 outline-none transition-all text-[#222222] placeholder:text-[#999999] font-medium"
              />
            </div>
          </div>

          <div>
            <label htmlFor="employee-password-input" className="block text-xs font-bold text-[#222222] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777777]" />
              <input
                id="employee-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full h-11 pl-10 pr-10 text-sm sm:text-xs bg-white border border-[#E8E8E8] rounded-xl focus:border-[#E8173D] focus:ring-2 focus:ring-[#E8173D]/15 outline-none transition-all text-[#222222] placeholder:text-[#999999] font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777777] hover:text-[#222222] cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[#777777] hover:text-[#222222] font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[#E8E8E8] text-[#E8173D] focus:ring-[#E8173D] accent-[#E8173D]"
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setForgotError('');
                setForgotMsg('');
                setShowForgotModal(true);
              }}
              className="text-xs font-semibold text-[#E8173D] hover:text-[#C7122E] hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#E8173D] hover:bg-[#C7122E] active:scale-[0.99] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Google Workspace SSO */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E8E8E8]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-2 text-[#777777] font-bold">Enterprise SSO</span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setErrorMsg('');

              if (typeof onGoogleLogin === 'function') {
                try {
                  await onGoogleLogin();
                } catch (err) {
                  setErrorMsg(err.message || 'Google Sign-In failed.');
                  setLoading(false);
                }
                return;
              }

              if (supabaseClient) {
                try {
                  const { error } = await supabaseClient.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/login`
                    }
                  });
                  if (error) throw error;
                } catch (err) {
                  setErrorMsg(err.message || 'Failed to initialize Google Sign-In.');
                  setLoading(false);
                }
                return;
              }

              // Fallback for standalone deployments using Google GIS
              const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
              if (window.google?.accounts?.id && clientId) {
                window.google.accounts.id.initialize({
                  client_id: clientId,
                  callback: async (response) => {
                    try {
                      const base64Url = response.credential.split('.')[1];
                      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                      const jsonPayload = decodeURIComponent(
                        atob(base64)
                          .split('')
                          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                          .join('')
                      );
                      const payload = JSON.parse(jsonPayload);
                      const googleEmail = payload.email;

                      const res = await apiClient.post('/auth/oauth', {
                        provider: 'google',
                        email: googleEmail,
                        token: response.credential,
                        full_name: payload.name || googleEmail.split('@')[0]
                      });

                      if (res.data?.access_token) {
                        const token = res.data.access_token;
                        const rawUser = res.data.user || {};
                        const roles = rawUser.roles || res.data.roles || [];
                        const isAdmin = roles.includes('admin') || roles.includes('owner') || (rawUser.roleLevel >= 8) || (res.data.role_level >= 8);
                        const isStaff = roles.includes('inventory_staff') || roles.includes('inventory') || (rawUser.roleLevel >= 5) || (res.data.role_level >= 5) || isAdmin;

                        if (!isAdmin && !isStaff) {
                          setErrorMsg(`Access Denied: Your Google account (${googleEmail}) has not been granted Admin or Inventory privileges.`);
                          setLoading(false);
                          return;
                        }

                        const user = {
                          ...rawUser,
                          id: rawUser.id || res.data.user_id,
                          name: rawUser.name || rawUser.fullName || res.data.full_name || payload.name,
                          email: googleEmail,
                          roleLevel: rawUser.roleLevel ?? res.data.role_level ?? (isAdmin ? 9 : 5),
                          roles: roles.length > 0 ? roles : (isAdmin ? ['admin'] : ['inventory_staff']),
                          roleId: isAdmin ? 'role-admin' : 'role-inventory-staff',
                          permissions: rawUser.permissions || res.data.permissions || ['*'],
                          permittedApps: ['storefront', 'inventory'],
                          apps: ['storefront', 'inventory']
                        };

                        sessionStorage.setItem('unikart_tab_token', token);
                        sessionStorage.setItem('unikart_tab_user', JSON.stringify({ ...user, token }));
                        sessionStorage.setItem('unikart_tab_login_time', Date.now().toString());

                        localStorage.setItem('unikart_token', token);
                        localStorage.setItem('unikart_emp_token', token);
                        if (isAdmin) {
                          localStorage.setItem('unikart_admin_token', token);
                          localStorage.setItem('unikart_admin_user', JSON.stringify(user));
                        }
                        localStorage.setItem('unikart_user', JSON.stringify({ ...user, token }));

                        if (typeof onLoginSuccess === 'function') {
                          onLoginSuccess({ token, user });
                          return;
                        }

                        const targetDestination = isAdmin ? '/admin/overview' : '/inventory/dashboard';
                        setSuccessMsg(`Welcome, ${user.name}! Redirecting to workspace...`);
                        setTimeout(() => {
                          navigate(targetDestination, { replace: true });
                        }, 300);
                      }
                    } catch (err) {
                      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to authenticate via Google.');
                    } finally {
                      setLoading(false);
                    }
                  }
                });
                window.google.accounts.id.prompt();
              } else {
                setErrorMsg('Google Workspace client is not configured.');
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full h-11 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-2.5 text-xs cursor-pointer shadow-2xs"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign in with Google Workspace</span>
          </button>
        </form>
      </div>

      {/* ================= FORGOT PASSWORD MODAL ================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-[#E8E8E8] relative space-y-4">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute right-4 top-4 text-[#777777] hover:text-[#222222] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E8173D] flex items-center justify-center mb-2.5">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#222222]">
                Reset Password
              </h3>
              <p className="text-xs text-[#777777] mt-0.5">
                Enter your registered work email to receive password reset instructions.
              </p>
            </div>

            {forgotError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-[#E8173D] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="leading-relaxed">{forgotMsg}</span>
              </div>
            )}

            {!forgotMsg ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#222222] mb-1">
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your work email"
                    className="w-full h-10 px-3.5 text-xs bg-white border border-[#E8E8E8] rounded-xl focus:border-[#E8173D] focus:ring-2 focus:ring-[#E8173D]/15 outline-none font-medium text-[#222222]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-[#777777] hover:bg-gray-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 text-xs font-bold bg-[#E8173D] text-white hover:bg-[#C7122E] rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {forgotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Send Reset Request</span>
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotMsg('');
                }}
                className="w-full py-2.5 bg-[#242424] text-white text-xs font-bold rounded-xl hover:bg-black transition-all cursor-pointer mt-2"
              >
                Back to Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { EmployeeLoginPage };
