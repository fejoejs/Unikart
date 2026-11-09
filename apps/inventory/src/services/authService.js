import apiClient from './apiClient';

export const authService = {
  async login(email, password) {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  async verifyPassword(password) {
    const response = await apiClient.post('/superadmin/auth/verify-password', { password });
    return response.data;
  },

  async changePassword(oldPassword, newPassword) {
    const response = await apiClient.post('/superadmin/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  async setup2FA() {
    const response = await apiClient.post('/superadmin/auth/2fa/setup');
    return response.data;
  },

  async verify2FA(code) {
    const response = await apiClient.post('/superadmin/auth/2fa/verify', { code });
    return response.data;
  },

  async getSessions() {
    const response = await apiClient.get('/superadmin/security/sessions');
    return response.data;
  },

  async terminateSession(sessionId) {
    const response = await apiClient.delete(`/superadmin/security/sessions/${sessionId}`);
    return response.data;
  },
};

export default authService;
