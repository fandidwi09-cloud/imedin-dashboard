import { useState, useEffect, useCallback } from 'react';
import { activitiesApi } from '@/services/api';
import type { Activity } from '@/types';

export function useActivities(unitId?: string, serial?: string) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await activitiesApi.getAll(unitId, serial);
      if (result.success && result.data) setActivities(result.data);
      else setError(result.message || 'Gagal memuat aktivitas');
    } catch {
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [unitId, serial]);

  useEffect(() => { fetch(); }, [fetch]);

  return { activities, loading, error, refresh: fetch };
}
