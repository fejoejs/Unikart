import apiClient from './apiClient';

export const reportService = {
  async getOverviewMetrics(params = {}) {
    const response = await apiClient.get('/superadmin/overview', { params });
    return response.data;
  },

  async getBusinessIntelligence() {
    const response = await apiClient.get('/superadmin/business/intelligence');
    return response.data;
  },

  async getAuditLogs(params = {}) {
    const response = await apiClient.get('/superadmin/audit-logs', { params });
    return response.data;
  },

  async getGstr1(month, year) {
    const response = await apiClient.get(`/admin/compliance/gstr1?month=${month}&year=${year}`);
    return response.data;
  },

  async getGstr3b(month, year) {
    const response = await apiClient.get(`/admin/compliance/gstr3b?month=${month}&year=${year}`);
    return response.data;
  },

  async getSystemHealth() {
    const response = await apiClient.get('/superadmin/health');
    return response.data;
  },
};

export default reportService;
