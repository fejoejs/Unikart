import { useState, useCallback } from 'react';
import inventoryService from '../services/inventoryService';

export function useInventory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStockLevels = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getInventoryLevels(params);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch inventory levels');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const adjustStock = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.adjustStock(payload);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to adjust stock');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchStockLevels,
    adjustStock,
  };
}

export default useInventory;
