import { useState, useEffect, useCallback } from 'react';
import { authApi } from '@/services/api';
import type { UserRole } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<Omit<import('@/types').User, 'pin'> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authApi.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, pin: string) => {
    const result = await authApi.login({ email, pin });
    if (result.success && result.data) {
      setUser(result.data);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    window.location.href = window.location.pathname + '#/login';
  }, []);

  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role);
    return user.role === role;
  }, [user]);

  return { user, loading, login, logout, hasRole, isAuthenticated: !!user };
}
