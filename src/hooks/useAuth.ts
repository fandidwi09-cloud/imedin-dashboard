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
    if (result.success && result.data) setUser(result.data);
    return result;
  }, []);

  // BUG FIX: logout pakai hash routing yang benar (app pakai HashRouter)
  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    window.location.hash = '#/login';
  }, []);

  // hasRole: guest (tidak login) hanya bisa akses role 'guest'.
  // Kalau role yang dicek adalah ['admin','teknisi','viewer','guest'] maka semua bisa akses.
  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    const roles = Array.isArray(role) ? role : [role];
    if (!user) {
      // Belum login = guest
      return roles.includes('guest');
    }
    return roles.includes(user.role as UserRole);
  }, [user]);

  // isGuest: true kalau belum login
  const isGuest = !user;

  return {
    user,
    loading,
    login,
    logout,
    hasRole,
    isAuthenticated: !!user,
    isGuest,
    role: user?.role ?? 'guest' as UserRole,
  };
}
