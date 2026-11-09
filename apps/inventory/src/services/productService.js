import apiClient from './apiClient';

export const productService = {
  async getProducts(params = {}) {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },

  async getAdminProducts(params = {}) {
    const response = await apiClient.get('/admin/products', { params });
    return response.data;
  },

  async getCategories() {
    const response = await apiClient.get('/products/categories');
    return response.data;
  },

  async getBrands() {
    const response = await apiClient.get('/products/brands');
    return response.data;
  },
};

export default productService;
