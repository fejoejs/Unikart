import apiClient from './apiClient';

export const inventoryService = {
  async getInventoryLevels(params = {}) {
    const response = await apiClient.get('/admin/inventory/levels', { params });
    return response.data;
  },

  async adjustStock(payload) {
    const response = await apiClient.post('/admin/inventory/adjust', payload);
    return response.data;
  },

  async receiveStock(payload) {
    const response = await apiClient.post('/admin/inventory/adjust', {
      ...payload,
      movement_type: 'PURCHASE_RECEIPT',
    });
    return response.data;
  },

  async reportDamagedGoods(payload) {
    const response = await apiClient.post('/admin/inventory/adjust', {
      ...payload,
      movement_type: 'DAMAGE',
    });
    return response.data;
  },

  async getMovements(params = {}) {
    const response = await apiClient.get('/admin/inventory/movements', { params });
    return response.data;
  },

  async getIntelligence(params = {}) {
    const response = await apiClient.get('/inventory/intelligence', { params });
    return response.data;
  },

  async getStores() {
    const response = await apiClient.get('/admin/stores');
    return response.data;
  },

  async getTerminals() {
    const response = await apiClient.get('/admin/terminals');
    return response.data;
  },
};

export default inventoryService;
