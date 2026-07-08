import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import MapView from '@/pages/MapView';
import Assets from '@/pages/Assets';
import UnitDetail from '@/pages/UnitDetail';
import Activities from '@/pages/Activities';
import QRScanner from '@/pages/QRScanner';
import Reports from '@/pages/Reports';
import Administration from '@/pages/Administration';
import './App.css';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <Login />
      } />

      {/* Publik — guest bisa akses */}
      <Route path="/" element={
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/map" element={
        <ProtectedRoute><Layout><MapView /></Layout></ProtectedRoute>
      } />

      {/* Aset — semua role bisa lihat, tapi konten dibatasi untuk guest */}
      <Route path="/assets" element={
        <ProtectedRoute><Layout><Assets /></Layout></ProtectedRoute>
      } />
      <Route path="/assets/:id" element={
        <ProtectedRoute><Layout><UnitDetail /></Layout></ProtectedRoute>
      } />
      <Route path="/assets/:id/edit" element={
        <ProtectedRoute allowedRoles={['admin','teknisi']}>
          <Layout><Assets editMode /></Layout>
        </ProtectedRoute>
      } />

      {/* Aktivitas — semua role */}
      <Route path="/activities" element={
        <ProtectedRoute><Layout><Activities /></Layout></ProtectedRoute>
      } />
      <Route path="/service-history" element={<Navigate to="/activities" replace />} />

      {/* QR Scanner — teknisi + admin */}
      <Route path="/qr-scanner" element={
        <ProtectedRoute allowedRoles={['admin', 'teknisi']}>
          <Layout><QRScanner /></Layout>
        </ProtectedRoute>
      } />

      {/* Laporan — semua role */}
      <Route path="/reports" element={
        <ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>
      } />

      {/* Administrasi — admin only */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout><Administration /></Layout>
        </ProtectedRoute>
      } />

      {/* Legacy redirects */}
      <Route path="/units" element={<Navigate to="/assets" replace />} />
      <Route path="/service-history" element={<Navigate to="/activities" replace />} />
      <Route path="/import-export" element={<Navigate to="/admin" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
