import { useState, useMemo } from 'react';
import { useUnits } from '@/hooks/useUnits';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Filter, Navigation } from 'lucide-react';

// Fix Leaflet default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const createStatusIcon = (status: string) => {
  const colors: Record<string, string> = {
    active: '#22c55e',
    maintenance: '#f59e0b',
    overdue: '#ef4444',
    inactive: '#9ca3af'
  };
  const color = colors[status] || '#3b82f6';

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background-color: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  overdue: 'Overdue',
  inactive: 'Inactive'
};

export default function MapView() {
  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { units, loading } = useUnits({ search, province: provinceFilter, status: statusFilter });

  const availableProvinces = useMemo(() => {
    const set = new Set(units.map(u => u.province));
    return Array.from(set).filter(Boolean).sort();
  }, [units]);

  const validUnits = useMemo(() => {
    return units.filter(u => u.latitude && u.longitude && !isNaN(u.latitude) && !isNaN(u.longitude));
  }, [units]);

  const indonesiaCenter: [number, number] = [-2.5489, 118.0149];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#8b8f95]">Memuat peta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1d]" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Map View
        </h1>
        <p className="text-sm text-[#8b8f95] mt-0.5">
          Peta lokasi instalasi perangkat medis IMEDIN di seluruh Indonesia
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari serial number, produk, customer..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] placeholder:text-[#8b8f95] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15 transition-all"
            />
          </div>
          <div className="relative min-w-[160px]">
            <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]" />
            <select
              value={provinceFilter}
              onChange={e => setProvinceFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15 transition-all appearance-none"
            >
              <option value="">Semua Provinsi</option>
              {availableProvinces.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="relative min-w-[140px]">
            <Navigation size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15 transition-all appearance-none"
            >
              <option value="">Semua Status</option>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="overdue">Overdue</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-[#8b8f95]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
            <span>Active ({validUnits.filter(u => u.status === 'active').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow" />
            <span>Maintenance ({validUnits.filter(u => u.status === 'maintenance').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
            <span>Overdue ({validUnits.filter(u => u.status === 'overdue').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-white shadow" />
            <span>Inactive ({validUnits.filter(u => u.status === 'inactive').length})</span>
          </div>
          <span className="ml-auto font-medium">{validUnits.length} unit di peta</span>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="h-[calc(100vh-280px)] min-h-[400px]">
          <MapContainer
            center={indonesiaCenter}
            zoom={5}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {validUnits.map(unit => (
              <Marker
                key={unit.id}
                position={[unit.latitude, unit.longitude]}
                icon={createStatusIcon(unit.status)}
              >
                <Popup>
                  <div className="min-w-[200px] p-1">
                    <p className="text-sm font-semibold text-[#1d1d1d] mb-1">{unit.productName}</p>
                    <p className="text-xs font-mono text-[#3b82f6] mb-2">{unit.serialNumber}</p>
                    <div className="space-y-1 text-xs text-[#8b8f95]">
                      <p><span className="text-[#1d1d1d]">Customer:</span> {unit.customerName}</p>
                      <p><span className="text-[#1d1d1d]">Lokasi:</span> {unit.district ? `${unit.district}, ` : ''}{unit.city}, {unit.province}</p>
                      <p><span className="text-[#1d1d1d]">Install:</span> {unit.installationDate}</p>
                      <p><span className="text-[#1d1d1d]">Next Maint:</span> {unit.nextMaintenanceDate}</p>
                    </div>
                    <div className="mt-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        unit.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                        unit.status === 'maintenance' ? 'bg-amber-50 text-amber-700' :
                        unit.status === 'overdue' ? 'bg-red-50 text-red-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {statusLabels[unit.status]}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
