import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import {
  LayoutDashboard,
  Map,
  Package,
  QrCode,
  ClipboardList,
  Upload,
  LogOut,
  Shield,
  Wrench,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Activity,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'teknisi', 'viewer'] },
  { path: '/map', label: 'Map View', icon: Map, roles: ['admin', 'teknisi', 'viewer'] },
  { path: '/units', label: 'Units', icon: Package, roles: ['admin', 'teknisi'] },
  { path: '/qr-scanner', label: 'QR Scanner', icon: QrCode, roles: ['admin', 'teknisi'] },
  { path: '/service-history', label: 'Service History', icon: ClipboardList, roles: ['admin', 'teknisi', 'viewer'] },
  { path: '/import-export', label: 'Import / Export', icon: Upload, roles: ['admin', 'teknisi'] },
];

const roleConfig = {
  admin: { label: 'Admin', color: 'bg-blue-500/20 text-blue-300', icon: Shield },
  teknisi: { label: 'Teknisi', color: 'bg-emerald-500/20 text-emerald-300', icon: Wrench },
  viewer: { label: 'Viewer', color: 'bg-gray-500/20 text-gray-300', icon: Eye },
};

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();
  const { alerts } = useDashboard();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical').slice(0, 3);
  const RoleIcon = user ? roleConfig[user.role].icon : Shield;
  const roleInfo = user ? roleConfig[user.role] : roleConfig.viewer;

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
  };

  const SidebarContent = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <>
      {/* Header */}
      <div className={`px-4 pt-6 pb-4 ${isCollapsed ? 'text-center' : ''}`}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[#3b82f6] flex items-center justify-center flex-shrink-0">
            <Activity size={20} className="text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>IMEDIN</h1>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#a0a4a8] ml-12 -mt-1">After-Sales & Service</p>
        )}
      </div>

      {/* User Profile */}
      {user && (
        <div className={`mx-3 mb-4 p-3 rounded-lg bg-[#2c2f33] ${isCollapsed ? 'text-center' : ''}`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? 'flex-col' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-[#3b82f6] flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium">{user.name.charAt(0)}</span>
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${roleInfo.color}`}>
                  <RoleIcon size={10} />
                  {roleInfo.label}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {navItems
          .filter(item => hasRole(item.roles as ('admin' | 'teknisi' | 'viewer')[]))
          .map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#2c2f33] text-white border-l-[3px] border-[#3b82f6]'
                    : 'text-[#a0a4a8] hover:text-white hover:bg-[#2c2f33]/50 border-l-[3px] border-transparent'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={20} className={`flex-shrink-0 ${isActive ? 'text-[#3b82f6]' : 'group-hover:text-white'}`} />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
      </nav>

      {/* Alerts Section */}
      {criticalAlerts.length > 0 && !isCollapsed && (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Peringatan</span>
          </div>
          <div className="space-y-2">
            {criticalAlerts.map(alert => (
              <div key={alert.id} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-300 truncate">{alert.unit.serialNumber}</p>
                  <p className="text-[10px] text-red-400">{alert.type === 'maintenance' ? 'Overdue' : 'Garansi habis'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="p-2 border-t border-[#33363a]">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a0a4a8] hover:text-white hover:bg-[#2c2f33] transition-all ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button — tampil di layar kecil */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-[#1e2022] text-white rounded-lg flex items-center justify-center shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar — slide in dari kiri */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-[260px] bg-[#1e2022] text-white z-50 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ boxShadow: '4px 0 12px rgba(0,0,0,0.2)' }}
      >
        {/* Close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[#a0a4a8] hover:text-white"
        >
          <X size={18} />
        </button>
        <SidebarContent isCollapsed={false} />
      </aside>

      {/* Desktop sidebar — selalu tampil di layar besar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-full bg-[#1e2022] text-white z-50 transition-all duration-300 flex-col ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
        style={{ boxShadow: '4px 0 12px rgba(0,0,0,0.1)' }}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-[#3b82f6] rounded-full flex items-center justify-center text-white text-xs hover:bg-blue-600 transition-colors z-10"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <SidebarContent isCollapsed={collapsed} />
      </aside>
    </>
  );
}
