import { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '@/services/api';
import type { DashboardStats, AlertItem } from '@/types';

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResult, alertsResult] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getAlerts()
      ]);
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
      if (alertsResult.success && alertsResult.data) {
        setAlerts(alertsResult.data);
      }
    } catch {
      setError('Terjadi kesalahan saat memuat dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { stats, alerts, loading, error, refresh: fetchData };
}
