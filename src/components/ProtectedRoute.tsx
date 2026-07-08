import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // Jika allowedRoles tidak diset → semua boleh akses (termasuk guest)
  // Jika allowedRoles diset → hanya role tersebut yang bisa akses
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f7f7f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#8b8f95]">Memuat...</p>
        </div>
      </div>
    );
  }

  // Kalau ada allowedRoles → cek
  if (allowedRoles) {
    // Belum login dan role tidak termasuk guest → redirect ke login
    if (!isAuthenticated && !allowedRoles.includes('guest')) {
      return <Navigate to="/login" replace />;
    }
    // Sudah login tapi role tidak sesuai → redirect ke home
    if (isAuthenticated && !hasRole(allowedRoles)) {
      return <Navigate to="/" replace />;
    }
  }

  // Tidak ada allowedRoles → semua boleh (public page)
  return <>{children}</>;
}
