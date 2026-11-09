import React, { useState } from 'react';
import { Key, Eye, EyeOff, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useAuthStore } from '../../stores/authStore';

export function MandatoryPasswordChangeModal() {
  const { user, restoreSession } = useAuthStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check if password change is required
  const isRequired = Boolean(user?.mustChangePassword || user?.must_change_password);

  if (!isRequired) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        new_password: newPassword
      });

      // Update auth store to clear the flag
      const updatedUser = {
        ...user,
        mustChangePassword: false,
        must_change_password: false
      };
      restoreSession(localStorage.getItem('unikart_emp_token') || localStorage.getItem('unikart_token'), updatedUser);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fadeIn">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto mb-2">
            <Key className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Mandatory Password Change
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Welcome, <strong>{user?.name || user?.fullName || 'Staff Member'}</strong>! Your account was initialized with a temporary password. You must set a permanent password to access your workspace.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              New Personal Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters..."
                className="w-full pl-3 pr-9 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password..."
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#E8173D] hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Updating Password...' : 'Save Password & Enter Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MandatoryPasswordChangeModal;
