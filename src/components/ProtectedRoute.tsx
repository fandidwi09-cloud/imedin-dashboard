import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean; // kalau true, wajib login. kalau false, visitor boleh akses
}

export default function ProtectedRoute({ children, allowedRoles, requireAuth = false }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f7f7f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#8b8f95]">Memuat...</p>
        </div>
      </div>
    );
  }

  // Kalau halaman butuh login dan belum login → redirect ke login
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Kalau halaman butuh role tertentu dan tidak punya role → redirect ke home
  if (allowedRoles && isAuthenticated && !hasRole(allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  // Kalau halaman butuh role tertentu dan belum login → redirect ke login
  if (allowedRoles && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
