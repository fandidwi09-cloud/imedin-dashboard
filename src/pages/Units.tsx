import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useUnits } from '@/hooks/useUnits';
import { useAuth } from '@/hooks/useAuth';
import { useRegions, type Regency, type District, type Village } from '@/hooks/useRegions';
import { unitsApi } from '@/services/api';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  MapPin,
  Phone,
  Package,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Navigation,
  Loader2
} from 'lucide-react';
import type { Unit, UnitCategory, UnitStatus } from '@/types';

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

const categoryOptions: { value: UnitCategory; label: string }[] = [
  { value: 'dialysis', label: 'Dialysis' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'ventilator', label: 'Ventilator' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'other', label: 'Other' },
];

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

const emptyUnit: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'> = {
  serialNumber: '',
  productName: '',
  category: 'other',
  model: '',
  manufacturer: 'IMEDIN Medical',
  customerName: '',
  customerPhone: '',
  province: '',
  city: '',
  address: '',
  latitude: 0,
  longitude: 0,
  installationDate: new Date().toISOString().split('T')[0],
  warrantyEndDate: '',
  nextMaintenanceDate: '',
  lastServiceDate: '',
  status: 'active',
  notes: '',
  district: '',
  village: '',
  postalCode: ''
};

function LocationMarker({ position, onLocationSelect }: { position: [number, number] | null, onLocationSelect: (lat: number, lng: number) => void }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);

  return position ? <Marker position={position} /> : null;
}

export default function Units() {
  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState(emptyUnit);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Region state
  const { provinces, getRegencies, getDistricts, getVillages } = useRegions();
  const [regencies, setRegencies] = useState<Regency[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedRegencyId, setSelectedRegencyId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');

  // Geocoding state
  const [addressSearch, setAddressSearch] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<{ display_name: string; lat: string; lon: string; address: { state?: string; city?: string; town?: string; county?: string } }[]>([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const addressDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchAddress = (query: string) => {
    setAddressSearch(query);
    if (addressDebounce.current) clearTimeout(addressDebounce.current);
    if (!query || query.length < 3) { setAddressSuggestions([]); return; }
    addressDebounce.current = setTimeout(async () => {
      setGeocodeLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&countrycodes=id&limit=5`);
        const data = await res.json();
        setAddressSuggestions(data);
      } catch { setAddressSuggestions([]); }
      finally { setGeocodeLoading(false); }
    }, 500);
  };

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`);
      const data = await res.json();
      const city = data.address?.city || data.address?.town || data.address?.county || '';
      const province = data.address?.state || '';
      const district = data.address?.suburb || data.address?.district || '';
      const village = data.address?.village || data.address?.neighbourhood || '';
      const postalCode = data.address?.postcode || '';

      setFormData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lon,
        address: data.display_name || prev.address,
        city: city || prev.city,
        province: province || prev.province,
        district: district || prev.district,
        village: village || prev.village,
        postalCode: postalCode || prev.postalCode,
      }));
      setAddressSearch(data.display_name || '');

      // Try to sync with dropdowns
      if (province) {
        const prov = provinces.find(p => province.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(province.toLowerCase()));
        if (prov) {
          setSelectedProvinceId(prov.id);
          const regs = await getRegencies(prov.id);
          setRegencies(regs);
          if (city) {
            const reg = regs.find(r => city.toLowerCase().includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(city.toLowerCase()));
            if (reg) {
              setSelectedRegencyId(reg.id);
              const dists = await getDistricts(reg.id);
              setDistricts(dists);
              if (district) {
                const dist = dists.find(d => district.toLowerCase().includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(district.toLowerCase()));
                if (dist) {
                  setSelectedDistrictId(dist.id);
                  const vills = await getVillages(dist.id);
                  setVillages(vills);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }
  }, [provinces, getRegencies, getDistricts, getVillages]);

  const selectAddress = async (item: typeof addressSuggestions[0]) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    // Use reverseGeocode logic to ensure all fields (district, village, etc.) are synced
    // and dropdowns are updated
    await reverseGeocode(lat, lon);

    // Overwrite the address with the display_name from search if preferred
    setFormData(prev => ({
      ...prev,
      address: item.display_name
    }));

    setAddressSearch(item.display_name);
    setAddressSuggestions([]);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { alert('Browser tidak mendukung GPS'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await reverseGeocode(latitude, longitude);
        } catch {
          setFormData(prev => ({ ...prev, latitude, longitude }));
        }
        setGpsLoading(false);
      },
      () => { alert('Gagal mendapatkan lokasi. Pastikan izin GPS diaktifkan.'); setGpsLoading(false); }
    );
  };

  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const { units, loading, refresh } = useUnits({ search, province: provinceFilter, category: categoryFilter, status: statusFilter });

  const availableProvinces = useMemo(() => {
    const set = new Set(units.map(u => u.province));
    return Array.from(set).filter(Boolean).sort();
  }, [units]);

  const pageSize = 10;
  const totalPages = Math.ceil(units.length / pageSize);
  const paginatedUnits = units.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleNew = () => {
    setEditingUnit(null);
    setFormData({ ...emptyUnit });
    setFormError('');
    setAddressSearch('');
    setAddressSuggestions([]);
    setSelectedProvinceId('');
    setSelectedRegencyId('');
    setSelectedDistrictId('');
    setRegencies([]);
    setDistricts([]);
    setVillages([]);
    setShowForm(true);
  };

  const handleEdit = async (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({ ...unit });
    setFormError('');
    setAddressSearch(unit.address || '');
    setAddressSuggestions([]);
    setShowForm(true);

    // Try to pre-load dropdowns based on text names (heuristic)
    const prov = provinces.find(p => p.name.toLowerCase() === unit.province.toLowerCase());
    if (prov) {
      setSelectedProvinceId(prov.id);
      const regs = await getRegencies(prov.id);
      setRegencies(regs);
      const reg = regs.find(r => r.name.toLowerCase().includes(unit.city.toLowerCase()));
      if (reg) {
        setSelectedRegencyId(reg.id);
        const dists = await getDistricts(reg.id);
        setDistricts(dists);
        const dist = dists.find(d => d.name.toLowerCase().includes(unit.district.toLowerCase()));
        if (dist) {
          setSelectedDistrictId(dist.id);
          const vills = await getVillages(dist.id);
          setVillages(vills);
        }
      }
    }
  };

  const handleDelete = async (id: string) => {
    const result = await unitsApi.delete(id);
    if (result.success) {
      setDeleteConfirm(null);
      refresh();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.serialNumber || !formData.productName || !formData.customerName) {
      setFormError('Serial Number, Product Name, dan Customer Name wajib diisi');
      return;
    }

    setSaving(true);
    try {
      if (editingUnit) {
        const result = await unitsApi.update(editingUnit.id, formData);
        if (result.success) {
          setShowForm(false);
          refresh();
        } else {
          setFormError(result.message || 'Gagal memperbarui unit');
        }
      } else {
        const result = await unitsApi.create(formData);
        if (result.success) {
          setShowForm(false);
          refresh();
        } else {
          setFormError(result.message || 'Gagal menambahkan unit');
        }
      }
    } catch {
      setFormError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1d]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Units Management
          </h1>
          <p className="text-sm text-[#8b8f95] mt-0.5">
            Kelola semua unit perangkat medis yang terpasang
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 active:scale-[0.98] transition-all"
          >
            <Plus size={18} />
            Tambah Unit
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Cari serial number, produk, customer..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] placeholder:text-[#8b8f95] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15 transition-all"
            />
          </div>
          <select
            value={provinceFilter}
            onChange={e => { setProvinceFilter(e.target.value); setCurrentPage(1); }}
            className="min-w-[140px] px-3 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
          >
            <option value="">Semua Provinsi</option>
            {availableProvinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="min-w-[130px] px-3 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
          >
            <option value="">Semua Kategori</option>
            {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="min-w-[120px] px-3 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
          >
            <option value="">Semua Status</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="overdue">Overdue</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e6e6e8] bg-[#f7f7f5]">
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Serial Number</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Product</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Category</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Customer</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Location</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Install Date</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Next Maint</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Status</th>
                {isAdmin && <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-[#e6e6e8]">
                    {[...Array(isAdmin ? 9 : 8)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : paginatedUnits.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="px-4 py-12 text-center text-sm text-[#8b8f95]">
                    <Package size={40} className="mx-auto mb-3 text-[#e6e6e8]" />
                    <p>Tidak ada unit yang ditemukan</p>
                    <p className="text-xs mt-1">Coba ubah filter atau tambah unit baru</p>
                  </td>
                </tr>
              ) : (
                paginatedUnits.map((unit, idx) => (
                  <tr
                    key={unit.id}
                    className={`border-b border-[#e6e6e8] hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-medium text-[#1d1d1d]">{unit.serialNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1d1d1d]">{unit.productName}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-[#f7f7f5] rounded-md text-[#8b8f95] capitalize">{unit.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-[#1d1d1d]">{unit.customerName}</div>
                      {unit.customerPhone && <div className="text-xs text-[#8b8f95] flex items-center gap-1"><Phone size={10} />{unit.customerPhone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-[#8b8f95]">
                        <MapPin size={14} className="text-[#3b82f6]" />
                        <span className="truncate max-w-[150px]" title={`${unit.village ? unit.village + ', ' : ''}${unit.district ? unit.district + ', ' : ''}${unit.city}, ${unit.province}`}>
                          {unit.district ? `${unit.district}, ` : ''}{unit.city}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#8b8f95]">{unit.installationDate}</td>
                    <td className="px-4 py-3 text-sm text-[#1d1d1d]">{unit.nextMaintenanceDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[unit.status]}`}>
                        {statusLabels[unit.status]}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(unit)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-[#8b8f95] hover:text-[#3b82f6] transition-colors"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(unit.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-[#8b8f95] hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e6e6e8]">
            <p className="text-xs text-[#8b8f95]">
              Menampilkan {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, units.length)} dari {units.length} unit
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-[#f7f7f5] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    currentPage === i + 1 ? 'bg-[#3b82f6] text-white' : 'hover:bg-[#f7f7f5] text-[#8b8f95]'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-[#f7f7f5] disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e6e8]">
              <h2 className="text-lg font-semibold text-[#1d1d1d]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {editingUnit ? 'Edit Unit' : 'Tambah Unit Baru'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[#f7f7f5] transition-colors">
                <X size={20} className="text-[#8b8f95]" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider">Informasi Unit</h3>

                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Serial Number *</label>
                    <input
                      value={formData.serialNumber}
                      onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15"
                      placeholder="IMD-20230001"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Product Name *</label>
                    <input
                      value={formData.productName}
                      onChange={e => setFormData({ ...formData, productName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15"
                      placeholder="Hemodialysis Machine HD-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value as UnitCategory })}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
                    >
                      {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Model</label>
                    <input
                      value={formData.model}
                      onChange={e => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Manufacturer</label>
                    <input
                      value={formData.manufacturer}
                      onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider">Informasi Customer</h3>

                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Customer Name *</label>
                    <input
                      value={formData.customerName}
                      onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15"
                      placeholder="RS Jakarta"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Phone</label>
                    <input
                      value={formData.customerPhone}
                      onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15"
                      placeholder="08123456789"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Province</label>
                    <select
                      value={selectedProvinceId}
                      onChange={async (e) => {
                        const id = e.target.value;
                        const name = provinces.find(p => p.id === id)?.name || '';
                        setSelectedProvinceId(id);
                        setFormData(prev => ({ ...prev, province: name, city: '', district: '', village: '', postalCode: '' }));
                        setSelectedRegencyId('');
                        setSelectedDistrictId('');
                        setDistricts([]);
                        setVillages([]);
                        if (id) {
                          const data = await getRegencies(id);
                          setRegencies(data);
                        } else {
                          setRegencies([]);
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
                    >
                      <option value="">Pilih Provinsi</option>
                      {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Kabupaten / Kota</label>
                    <select
                      value={selectedRegencyId}
                      disabled={!selectedProvinceId}
                      onChange={async (e) => {
                        const id = e.target.value;
                        const name = regencies.find(r => r.id === id)?.name || '';
                        setSelectedRegencyId(id);
                        setFormData(prev => ({ ...prev, city: name, district: '', village: '', postalCode: '' }));
                        setSelectedDistrictId('');
                        setVillages([]);
                        if (id) {
                          const data = await getDistricts(id);
                          setDistricts(data);
                        } else {
                          setDistricts([]);
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] disabled:opacity-50"
                    >
                      <option value="">Pilih Kabupaten/Kota</option>
                      {regencies.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Kecamatan</label>
                    <select
                      value={selectedDistrictId}
                      disabled={!selectedRegencyId}
                      onChange={async (e) => {
                        const id = e.target.value;
                        const name = districts.find(d => d.id === id)?.name || '';
                        setSelectedDistrictId(id);
                        setFormData(prev => ({ ...prev, district: name, village: '', postalCode: '' }));
                        if (id) {
                          const data = await getVillages(id);
                          setVillages(data);
                        } else {
                          setVillages([]);
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] disabled:opacity-50"
                    >
                      <option value="">Pilih Kecamatan</option>
                      {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#8b8f95] mb-1">Desa / Kelurahan</label>
                      <select
                        value={formData.village}
                        disabled={!selectedDistrictId}
                        onChange={(e) => setFormData(prev => ({ ...prev, village: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] disabled:opacity-50"
                      >
                        <option value="">Pilih Desa/Kelurahan</option>
                        {villages.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#8b8f95] mb-1">Kode Pos</label>
                      <input
                        value={formData.postalCode}
                        onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                        className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15"
                        placeholder="12345"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Address</label>
                    <textarea
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#e6e6e8] pt-4">
                <h3 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider mb-3">Lokasi & Status</h3>

                {/* Geocoding input */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-[#8b8f95] mb-1">Cari Alamat atau Gunakan GPS</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]" />
                    <input
                      type="text"
                      value={addressSearch}
                      onChange={e => searchAddress(e.target.value)}
                      placeholder="Ketik alamat... (min. 3 karakter)"
                      className="w-full pl-9 pr-28 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15"
                    />
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      disabled={gpsLoading}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 bg-[#3b82f6] text-white rounded text-xs hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {gpsLoading ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                      GPS
                    </button>
                  </div>

                  {/* Suggestions dropdown */}
                  {(geocodeLoading || addressSuggestions.length > 0) && (
                    <div className="absolute z-10 mt-1 w-full max-w-[calc(100%-3rem)] bg-white border border-[#e6e6e8] rounded-lg shadow-lg overflow-hidden">
                      {geocodeLoading ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-[#8b8f95]">
                          <Loader2 size={14} className="animate-spin" /> Mencari...
                        </div>
                      ) : (
                        addressSuggestions.map((item, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => selectAddress(item)}
                            className="w-full text-left px-3 py-2 text-sm text-[#1d1d1d] hover:bg-blue-50 border-b border-[#f7f7f5] last:border-0 transition-colors"
                          >
                            <span className="line-clamp-1">{item.display_name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Interactive Map */}
                <div className="mb-4 bg-[#f7f7f5] rounded-lg border border-[#e6e6e8] overflow-hidden">
                  <div className="h-64 w-full relative">
                    <MapContainer
                      center={[formData.latitude || -2.5489, formData.longitude || 118.0149]}
                      zoom={formData.latitude ? 15 : 5}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationMarker
                        position={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
                        onLocationSelect={reverseGeocode}
                      />
                    </MapContainer>
                    <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm px-2 py-1 rounded border border-[#e6e6e8] shadow-sm pointer-events-none">
                      <p className="text-[10px] text-[#8b8f95] font-medium">Klik pada peta untuk set lokasi</p>
                    </div>
                  </div>
                  {(formData.latitude !== 0 || formData.longitude !== 0) && (
                    <div className="px-3 py-2 bg-emerald-50 border-t border-emerald-100 text-[11px] text-emerald-700 flex justify-between items-center">
                      <span className="flex items-center gap-1.5 font-medium">
                        <MapPin size={12} />
                        {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, latitude: 0, longitude: 0 }))}
                        className="text-emerald-600 hover:text-emerald-800 font-semibold"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Installation Date</label>
                    <input
                      type="date"
                      value={formData.installationDate}
                      onChange={e => setFormData({ ...formData, installationDate: e.target.value })}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as UnitStatus })}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="overdue">Overdue</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#e6e6e8] pt-4">
                <h3 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider mb-3">Garansi & Maintenance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Warranty End</label>
                    <input
                      type="date"
                      value={formData.warrantyEndDate}
                      onChange={e => setFormData({ ...formData, warrantyEndDate: e.target.value })}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Next Maintenance</label>
                    <input
                      type="date"
                      value={formData.nextMaintenanceDate}
                      onChange={e => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Notes</label>
                    <input
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
                      placeholder="Catatan tambahan"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#e6e6e8]">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-[#e6e6e8] rounded-lg text-sm text-[#8b8f95] hover:bg-[#f7f7f5] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : editingUnit ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-[#1d1d1d] text-center mb-2">Hapus Unit?</h3>
            <p className="text-sm text-[#8b8f95] text-center mb-6">
              Unit ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-[#e6e6e8] rounded-lg text-sm text-[#8b8f95] hover:bg-[#f7f7f5] transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 active:scale-[0.98] transition-all"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
