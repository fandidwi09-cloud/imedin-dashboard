import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import MapView from '@/pages/MapView';
import Units from '@/pages/Units';
import QRScanner from '@/pages/QRScanner';
import ServiceHistory from '@/pages/ServiceHistory';
import ImportExport from '@/pages/ImportExport';
import './App.css';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <Login />
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/map" element={
        <ProtectedRoute>
          <Layout><MapView /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/units" element={
        <ProtectedRoute allowedRoles={['admin', 'teknisi']}>
          <Layout><Units /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/qr-scanner" element={
        <ProtectedRoute allowedRoles={['admin', 'teknisi']}>
          <Layout><QRScanner /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/service-history" element={
        <ProtectedRoute>
          <Layout><ServiceHistory /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/import-export" element={
        <ProtectedRoute allowedRoles={['admin', 'teknisi']}>
          <Layout><ImportExport /></Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
