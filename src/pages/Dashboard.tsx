import { useDashboard } from '@/hooks/useDashboard';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  MapPin,
  Calendar,
  ArrowRight,
  Activity,
  TrendingUp,
  PieChart,
  QrCode
} from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  inactive: 'bg-gray-50 text-gray-600 border-gray-200'
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  overdue: 'Overdue',
  inactive: 'Inactive'
};

const categoryIcons: Record<string, string> = {
  dialysis: '💧',
  laboratory: '🔬',
  imaging: '📷',
  ventilator: '🌬️',
  monitor: '📊',
  other: '🔧'
};

const categoryLabels: Record<string, string> = {
  dialysis: 'Dialysis',
  laboratory: 'Laboratory',
  imaging: 'Imaging',
  ventilator: 'Ventilator',
  monitor: 'Monitor',
  other: 'Other'
};

export default function Dashboard() {
  const { stats, alerts, loading } = useDashboard();
  const navigate = useNavigate();

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-96 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-96 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1d]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Overview Dashboard
          </h1>
          <p className="text-sm text-[#8b8f95] mt-0.5">
            Pantau status perangkat medis IMEDIN secara real-time
          </p>
        </div>
        <button
          onClick={() => navigate('/qr-scanner')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#f97316] text-white rounded-xl text-sm font-medium hover:bg-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-500/25"
        >
          <QrCode size={18} />
          Scan Unit
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-[#e6e6e8] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package size={20} className="text-[#3b82f6]" />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp size={12} />
              {stats.totalUnits > 0 ? '+100%' : '0%'}
            </span>
          </div>
          <p className="text-2xl font-semibold text-[#1d1d1d]">{stats.totalUnits}</p>
          <p className="text-xs text-[#8b8f95] mt-0.5 uppercase tracking-wider">Total Units</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#e6e6e8] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-[#1d1d1d]">{stats.activeUnits}</p>
          <p className="text-xs text-[#8b8f95] mt-0.5 uppercase tracking-wider">Active Units</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#e6e6e8] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            {stats.maintenanceOverdue > 0 && (
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {stats.maintenanceOverdue}
              </span>
            )}
          </div>
          <p className="text-2xl font-semibold text-[#1d1d1d]">{stats.maintenanceOverdue}</p>
          <p className="text-xs text-[#8b8f95] mt-0.5 uppercase tracking-wider">Maintenance Overdue</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#e6e6e8] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <ShieldAlert size={20} className="text-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-[#1d1d1d]">{stats.warrantyExpiring}</p>
          <p className="text-xs text-[#8b8f95] mt-0.5 uppercase tracking-wider">Warranty Expiring (30d)</p>
        </div>
      </div>

      {/* Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-500" />
            <h3 className="text-sm font-semibold text-red-700">Peringatan Kritis</h3>
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
              {criticalAlerts.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {criticalAlerts.slice(0, 6).map(alert => (
              <div key={alert.id} className="bg-white rounded-lg p-3 border border-red-100 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1d1d1d] truncate">{alert.unit.serialNumber}</p>
                  <p className="text-xs text-[#8b8f95]">{alert.unit.productName}</p>
                  <p className="text-xs text-red-600 mt-0.5">{alert.unit.customerName} - {alert.unit.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution by Province */}
        <div className="bg-white rounded-xl border border-[#e6e6e8] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="px-5 py-4 border-b border-[#e6e6e8] flex items-center gap-2">
            <MapPin size={18} className="text-[#3b82f6]" />
            <h2 className="text-sm font-semibold text-[#1d1d1d]">Distribusi per Provinsi</h2>
          </div>
          <div className="p-4 space-y-2 max-h-[360px] overflow-y-auto">
            {Object.entries(stats.byProvince)
              .sort(([, a], [, b]) => b - a)
              .map(([province, count]) => {
                const percentage = (count / stats.totalUnits) * 100;
                return (
                  <div key={province} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#1d1d1d] font-medium">{province}</span>
                      <span className="text-[#8b8f95]">{count} unit</span>
                    </div>
                    <div className="w-full bg-[#f7f7f5] rounded-full h-2">
                      <div
                        className="bg-[#3b82f6] h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Distribution by Category */}
        <div className="bg-white rounded-xl border border-[#e6e6e8] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="px-5 py-4 border-b border-[#e6e6e8] flex items-center gap-2">
            <PieChart size={18} className="text-[#3b82f6]" />
            <h2 className="text-sm font-semibold text-[#1d1d1d]">Distribusi per Kategori</h2>
          </div>
          <div className="p-4 space-y-2">
            {Object.entries(stats.byCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => {
                const percentage = (count / stats.totalUnits) * 100;
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];
                const colorIndex = Object.keys(stats.byCategory).indexOf(category) % colors.length;
                return (
                  <div key={category} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                      {categoryIcons[category] || '🔧'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-[#1d1d1d] font-medium">{categoryLabels[category] || category}</span>
                        <span className="text-[#8b8f95] text-xs">{count}</span>
                      </div>
                      <div className="w-full bg-[#f7f7f5] rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${percentage}%`, backgroundColor: colors[colorIndex] }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#8b8f95] w-10 text-right">{percentage.toFixed(0)}%</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Status Overview */}
        <div className="bg-white rounded-xl border border-[#e6e6e8] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="px-5 py-4 border-b border-[#e6e6e8] flex items-center gap-2">
            <Activity size={18} className="text-[#3b82f6]" />
            <h2 className="text-sm font-semibold text-[#1d1d1d]">Status Overview</h2>
          </div>
          <div className="p-4 space-y-3">
            {Object.entries(stats.byStatus)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      status === 'active' ? 'bg-emerald-500' :
                      status === 'maintenance' ? 'bg-amber-500' :
                      status === 'overdue' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-sm font-medium text-[#1d1d1d]">{statusLabels[status] || status}</span>
                  </div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${statusColors[status] || ''}`}>
                    {count}
                  </span>
                </div>
              ))}
            <div className="pt-3 border-t border-[#e6e6e8]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#8b8f95]">Total</span>
                <span className="font-semibold text-[#1d1d1d]">{stats.totalUnits}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Maintenance Table */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="px-5 py-4 border-b border-[#e6e6e8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#3b82f6]" />
            <h2 className="text-sm font-semibold text-[#1d1d1d]">Maintenance Mendatang</h2>
          </div>
          <button
            onClick={() => navigate('/units')}
            className="text-sm text-[#3b82f6] hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            Lihat Semua
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e6e6e8] bg-[#f7f7f5]">
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Serial Number</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Product</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Customer</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Location</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Next Maintenance</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.upcomingMaintenance.slice(0, 8).map((unit, idx) => (
                <tr
                  key={unit.id}
                  className={`border-b border-[#e6e6e8] hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-[#1d1d1d] font-mono">{unit.serialNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#1d1d1d]">{unit.productName}</td>
                  <td className="px-4 py-3 text-sm text-[#8b8f95]">{unit.customerName}</td>
                  <td className="px-4 py-3 text-sm text-[#8b8f95]">
                    <span className="truncate block max-w-[120px]" title={`${unit.city}, ${unit.province}`}>
                      {unit.city}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[#1d1d1d]">{unit.nextMaintenanceDate}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[unit.status]}`}>
                      {statusLabels[unit.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {stats.upcomingMaintenance.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#8b8f95]">
                    Tidak ada maintenance mendatang dalam 30 hari
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warranty Expiring */}
      {stats.warrantyExpiringUnits.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200">
          <div className="px-5 py-4 border-b border-amber-200 flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800">Garansi Akan Habis (30 Hari)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-amber-200">
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-amber-700 px-4 py-3">Serial Number</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-amber-700 px-4 py-3">Product</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-amber-700 px-4 py-3">Customer</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-amber-700 px-4 py-3">Warranty End</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-amber-700 px-4 py-3">Days Left</th>
                </tr>
              </thead>
              <tbody>
                {stats.warrantyExpiringUnits.slice(0, 5).map((unit) => {
                  const daysLeft = Math.ceil((new Date(unit.warrantyEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={unit.id} className="border-b border-amber-100 hover:bg-amber-100/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#1d1d1d] font-mono">{unit.serialNumber}</td>
                      <td className="px-4 py-3 text-sm text-[#1d1d1d]">{unit.productName}</td>
                      <td className="px-4 py-3 text-sm text-amber-700">{unit.customerName}</td>
                      <td className="px-4 py-3 text-sm font-medium text-[#1d1d1d]">{unit.warrantyEndDate}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                          daysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {daysLeft} hari
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
