import apiClient from './apiClient';

export const employeeService = {
  async getEmployees(params = {}) {
    const response = await apiClient.get('/superadmin/hr/employees', { params });
    return response.data;
  },

  async getEmployeeById(id) {
    const response = await apiClient.get(`/superadmin/hr/employees/${id}`);
    return response.data;
  },

  async createEmployee(payload) {
    const response = await apiClient.post('/superadmin/hr/employees', payload);
    return response.data;
  },

  async updateRoles(id, roles) {
    const response = await apiClient.patch(`/superadmin/hr/employees/${id}/roles`, { roles });
    return response.data;
  },

  async updateStatus(id, status, reason) {
    const response = await apiClient.patch(`/superadmin/hr/employees/${id}/status`, { status, reason });
    return response.data;
  },

  async resetPassword(id, tempPassword) {
    const response = await apiClient.post(`/superadmin/hr/employees/${id}/reset-password`, {
      temporary_password: tempPassword,
    });
    return response.data;
  },

  async getAttendance(params = {}) {
    const response = await apiClient.get('/superadmin/hr/attendance', { params });
    return response.data;
  },

  async correctAttendance(id, payload) {
    const response = await apiClient.patch(`/superadmin/hr/attendance/${id}/correct`, payload);
    return response.data;
  },

  async getLeaveRequests(params = {}) {
    const response = await apiClient.get('/superadmin/hr/leave', { params });
    return response.data;
  },

  async reviewLeave(id, action, comments) {
    const response = await apiClient.patch(`/superadmin/hr/leave/${id}/review`, { action, comments });
    return response.data;
  },

  async getStats() {
    const response = await apiClient.get('/superadmin/hr/stats');
    return response.data;
  },

  async getHierarchy() {
    const response = await apiClient.get('/superadmin/hr/hierarchy');
    return response.data;
  },
};

export default employeeService;
