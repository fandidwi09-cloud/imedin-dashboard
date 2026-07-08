import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import {
  LayoutDashboard, Map, Package, QrCode, Activity,
  BarChart3, Settings, LogOut, Shield, Wrench, Eye,
  AlertTriangle, ChevronLeft, ChevronRight, Activity as Logo,
  Menu, X, User
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/',           label: 'Dashboard',       icon: LayoutDashboard, roles: ['admin','teknisi','viewer','guest'], section: null },
  { path: '/map',        label: 'Peta',             icon: Map,             roles: ['admin','teknisi','viewer','guest'], section: null },
  { path: '/assets',     label: 'Aset Terpasang',   icon: Package,         roles: ['admin','teknisi','viewer','guest'], section: null },
  { path: '/activities', label: 'Aktivitas',        icon: Activity,        roles: ['admin','teknisi','viewer'],        section: null },
  { path: '/qr-scanner', label: 'QR Scanner',       icon: QrCode,          roles: ['admin','teknisi'],                 section: null },
  { path: '/reports',    label: 'Laporan',          icon: BarChart3,       roles: ['admin','teknisi','viewer'],        section: 'bottom' },
  { path: '/admin',      label: 'Administrasi',     icon: Settings,        roles: ['admin'],                          section: 'bottom' },
];

// Bottom nav untuk mobile (max 5 item)
const bottomNavItems = [
  { path: '/',           label: 'Dashboard', icon: LayoutDashboard },
  { path: '/map',        label: 'Peta',      icon: Map },
  { path: '/assets',     label: 'Aset',      icon: Package },
  { path: '/activities', label: 'Aktivitas', icon: Activity },
  { path: '/qr-scanner', label: 'Scan',      icon: QrCode },
];

const roleConfig: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  admin:   { label: 'Admin',    color: 'bg-blue-500/20 text-blue-300',    icon: Shield },
  teknisi: { label: 'Teknisi',  color: 'bg-emerald-500/20 text-emerald-300', icon: Wrench },
  viewer:  { label: 'Viewer',   color: 'bg-gray-500/20 text-gray-300',    icon: Eye },
  guest:   { label: 'Guest',    color: 'bg-gray-500/20 text-gray-400',    icon: User },
};

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole, isAuthenticated } = useAuth();
  const { alerts } = useDashboard();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical').slice(0, 3);
  const role = user?.role ?? 'guest';
  const roleInfo = roleConfig[role] ?? roleConfig.guest;
  const RoleIcon = roleInfo.icon;

  const handleNavigate = (path: string) => { navigate(path); setMobileOpen(false); };
  const handleLogout = () => { logout(); setMobileOpen(false); };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const visibleItems = navItems.filter(item =>
    hasRole(item.roles as ('admin'|'teknisi'|'viewer'|'guest')[])
  );
  const mainItems   = visibleItems.filter(i => i.section !== 'bottom');
  const bottomItems = visibleItems.filter(i => i.section === 'bottom');

  const NavButton = ({ item, collapsed: col }: { item: typeof navItems[0]; collapsed: boolean }) => {
    const active = isActive(item.path);
    const Icon = item.icon;
    return (
      <button
        key={item.path}
        onClick={() => handleNavigate(item.path)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group
          ${active ? 'bg-[#2c2f33] text-white border-l-[3px] border-[#3b82f6]'
                   : 'text-[#a0a4a8] hover:text-white hover:bg-[#2c2f33]/60 border-l-[3px] border-transparent'}
          ${col ? 'justify-center' : ''}`}
        title={col ? item.label : undefined}
      >
        <Icon size={19} className={`flex-shrink-0 ${active ? 'text-[#3b82f6]' : 'group-hover:text-white'}`} />
        {!col && <span className="font-medium">{item.label}</span>}
      </button>
    );
  };

  const SidebarContent = ({ col }: { col: boolean }) => (
    <>
      {/* Logo */}
      <div className={`px-4 pt-5 pb-3 ${col ? 'text-center' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#3b82f6] flex items-center justify-center flex-shrink-0">
            <Logo size={20} className="text-white" />
          </div>
          {!col && (
            <div>
              <p className="text-base font-semibold tracking-tight leading-none" style={{ fontFamily:'Poppins,sans-serif' }}>IMEDIN</p>
              <p className="text-[9px] uppercase tracking-widest text-[#a0a4a8] mt-0.5">After Sales Monitoring</p>
            </div>
          )}
        </div>
      </div>

      {/* User info */}
      {isAuthenticated && user && (
        <div className={`mx-3 mb-3 p-2.5 rounded-lg bg-[#2c2f33] ${col ? 'text-center' : ''}`}>
          <div className={`flex items-center gap-2.5 ${col ? 'flex-col' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center flex-shrink-0 text-sm font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!col && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate leading-tight">{user.name}</p>
                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 ${roleInfo.color}`}>
                  <RoleIcon size={9} />{roleInfo.label}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guest banner */}
      {!isAuthenticated && !col && (
        <div className="mx-3 mb-3 p-2.5 rounded-lg bg-[#2c2f33] border border-[#3b82f6]/30">
          <p className="text-xs text-[#a0a4a8]">Mode Tamu</p>
          <button onClick={() => handleNavigate('/login')} className="text-xs text-[#3b82f6] hover:underline mt-0.5">Login untuk akses penuh →</button>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {mainItems.map(item => <NavButton key={item.path} item={item} collapsed={col} />)}
      </nav>

      {/* Critical alerts */}
      {criticalAlerts.length > 0 && !col && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle size={13} className="text-red-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400">Peringatan ({criticalAlerts.length})</span>
          </div>
          {criticalAlerts.map(a => (
            <button key={a.id} onClick={() => handleNavigate('/assets/'+a.unit.id)}
              className="w-full text-left flex items-start gap-1.5 mb-1 hover:opacity-80">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-300 truncate">{a.unit.productName}</p>
                <p className="text-[9px] text-red-400">{a.type === 'maintenance' ? 'PM Overdue' : 'Garansi habis'}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Bottom nav items */}
      {bottomItems.length > 0 && (
        <div className="px-2 space-y-0.5 pb-1">
          <div className={`text-[9px] uppercase tracking-widest text-[#a0a4a8] px-3 py-1 ${col ? 'text-center' : ''}`}>
            {!col && 'Lainnya'}
          </div>
          {bottomItems.map(item => <NavButton key={item.path} item={item} collapsed={col} />)}
        </div>
      )}

      {/* Logout/Login */}
      <div className="p-2 border-t border-[#33363a]">
        {isAuthenticated ? (
          <button onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a0a4a8] hover:text-white hover:bg-[#2c2f33] transition-all ${col ? 'justify-center' : ''}`}
            title={col ? 'Logout' : undefined}>
            <LogOut size={18} />
            {!col && <span>Logout</span>}
          </button>
        ) : (
          <button onClick={() => handleNavigate('/login')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm bg-[#3b82f6] text-white hover:bg-blue-600 transition-all ${col ? 'justify-center' : ''}`}
            title={col ? 'Login' : undefined}>
            <LogOut size={18} className="rotate-180" />
            {!col && <span>Login</span>}
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 bg-[#1e2022] text-white rounded-lg flex items-center justify-center shadow-lg">
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar drawer */}
      <aside className={`lg:hidden fixed left-0 top-0 h-full w-[260px] bg-[#1e2022] text-white z-50 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ boxShadow:'4px 0 16px rgba(0,0,0,0.25)' }}>
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center text-[#a0a4a8] hover:text-white">
          <X size={17} />
        </button>
        <SidebarContent col={false} />
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex fixed left-0 top-0 h-full bg-[#1e2022] text-white z-50 flex-col transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}
        style={{ boxShadow:'4px 0 12px rgba(0,0,0,0.12)' }}>
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-5 w-6 h-6 bg-[#3b82f6] rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors z-10">
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
        <SidebarContent col={collapsed} />
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1e2022] border-t border-[#33363a] flex">
        {bottomNavItems
          .filter(item => {
            if (item.path === '/qr-scanner') return hasRole(['admin','teknisi']);
            if (item.path === '/activities') return isAuthenticated;
            return true;
          })
          .map(item => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button key={item.path} onClick={() => handleNavigate(item.path)}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors ${active ? 'text-[#3b82f6]' : 'text-[#a0a4a8]'}`}>
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
      </nav>
    </>
  );
}
