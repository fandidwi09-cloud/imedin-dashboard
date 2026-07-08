import { useState, useEffect, useCallback } from 'react';
import { unitsApi } from '@/services/api';
import type { Unit } from '@/types';

export function useUnits(filters?: { search?: string; province?: string; category?: string; status?: string }) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await unitsApi.getAll(filters as import('@/types').GlobalFilter | undefined);
      if (result.success && result.data) {
        setUnits(result.data);
      } else {
        setError(result.message || 'Gagal memuat data unit');
      }
    } catch {
      setError('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  }, [filters?.search, filters?.province, filters?.category, filters?.status]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const refresh = () => fetchUnits();

  return { units, loading, error, refresh };
}
