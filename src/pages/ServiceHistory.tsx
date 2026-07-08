import { useState } from 'react';
import { servicesApi, unitsApi } from '@/services/api';
import {
  Search,
  ClipboardList,
  Calendar,
  User,
  Wrench,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Package
} from 'lucide-react';
import type { Unit } from '@/types';

const serviceTypeColors: Record<string, string> = {
  installation:            'bg-blue-50 text-blue-700 border-blue-200',
  preventive_maintenance:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  repair:                  'bg-red-50 text-red-700 border-red-200',
  firmware_upgrade:        'bg-purple-50 text-purple-700 border-purple-200',
  spare_part:              'bg-amber-50 text-amber-700 border-amber-200',
  relocation:              'bg-orange-50 text-orange-700 border-orange-200',
  other:                   'bg-gray-50 text-gray-600 border-gray-200',
  // legacy fallbacks
  routine:                 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warranty:                'bg-amber-50 text-amber-700 border-amber-200',
  calibration:             'bg-purple-50 text-purple-700 border-purple-200',
};

const serviceTypeLabels: Record<string, string> = {
  installation:           'Instalasi',
  preventive_maintenance: 'Preventive Maintenance',
  repair:                 'Perbaikan',
  firmware_upgrade:       'Upgrade Firmware',
  spare_part:             'Penggantian Sparepart',
  relocation:             'Relokasi',
  other:                  'Lainnya',
  // legacy fallbacks
  routine:                'Routine Maintenance',
  warranty:               'Warranty Claim',
  calibration:            'Kalibrasi',
};

const timelineColors: Record<string, string> = {
  installation:           'bg-blue-500',
  preventive_maintenance: 'bg-emerald-500',
  repair:                 'bg-red-500',
  firmware_upgrade:       'bg-purple-500',
  spare_part:             'bg-amber-500',
  relocation:             'bg-orange-500',
  other:                  'bg-gray-400',
  routine:                'bg-emerald-500',
  warranty:               'bg-amber-500',
  calibration:            'bg-purple-500',
};

export default function ServiceHistory() {
  const [serialNumber, setSerialNumber] = useState('');
  const [unit, setUnit] = useState<Unit | null>(null);
  const [services, setServices] = useState<import('@/types').Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [error, setError] = useState('');

  const searchUnit = async () => {
    if (!serialNumber.trim()) return;
    setLoading(true);
    setError('');
    try {
      const unitResult = await unitsApi.getBySerial(serialNumber);
      if (unitResult.success && unitResult.data) {
        setUnit(unitResult.data);
        const servicesResult = await servicesApi.getBySerialNumber(serialNumber);
        if (servicesResult.success && servicesResult.data) {
          setServices(servicesResult.data);
        }
      } else {
        setError('Unit tidak ditemukan');
        setUnit(null);
        setServices([]);
      }
    } catch {
      setError('Terjadi kesalahan saat mencari unit');
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
    overdue: 'bg-red-50 text-red-700 border-red-200',
    inactive: 'bg-gray-50 text-gray-600 border-gray-200'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1d]" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Service History
        </h1>
        <p className="text-sm text-[#8b8f95] mt-0.5">
          Cari dan lihat riwayat servis per unit berdasarkan serial number
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]" />
            <input
              type="text"
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchUnit()}
              placeholder="Masukkan serial number unit..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] placeholder:text-[#8b8f95] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15"
            />
          </div>
          <button
            onClick={searchUnit}
            disabled={loading}
            className="px-6 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Mencari...' : 'Cari'}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
            <Package size={14} />
            {error}
          </p>
        )}
      </div>

      {unit && (
        <div className="space-y-6">
          {/* Unit Info */}
          <div className="bg-white rounded-xl border border-[#e6e6e8] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-[#1d1d1d]">{unit.productName}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[unit.status]}`}>
                    {unit.status}
                  </span>
                </div>
                <p className="text-sm font-mono text-[#3b82f6] mb-1">{unit.serialNumber}</p>
                <p className="text-sm text-[#8b8f95]">{unit.model} - {unit.manufacturer}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#8b8f95]">{unit.customerName}</p>
                <p className="text-xs text-[#8b8f95]">{unit.city}, {unit.province}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#e6e6e8] grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-[#8b8f95] uppercase tracking-wider">Install Date</p>
                <p className="text-sm font-medium text-[#1d1d1d]">{unit.installationDate}</p>
              </div>
              <div>
                <p className="text-xs text-[#8b8f95] uppercase tracking-wider">Warranty End</p>
                <p className="text-sm font-medium text-[#1d1d1d]">{unit.warrantyEndDate}</p>
              </div>
              <div>
                <p className="text-xs text-[#8b8f95] uppercase tracking-wider">Next Maintenance</p>
                <p className="text-sm font-medium text-[#1d1d1d]">{unit.nextMaintenanceDate}</p>
              </div>
              <div>
                <p className="text-xs text-[#8b8f95] uppercase tracking-wider">Total Services</p>
                <p className="text-sm font-medium text-[#1d1d1d]">{services.length}x</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-[#e6e6e8] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-6">
              <ClipboardList size={20} className="text-[#3b82f6]" />
              <h3 className="text-lg font-semibold text-[#1d1d1d]">Riwayat Service Timeline</h3>
            </div>

            {services.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList size={48} className="mx-auto mb-3 text-[#e6e6e8]" />
                <p className="text-sm text-[#8b8f95]">Belum ada riwayat service untuk unit ini</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-[#e6e6e8]" />

                <div className="space-y-6">
                  {services.map((service, index) => {
                    const isExpanded = expandedService === service.id;
                    const isLatest = index === 0;

                    return (
                      <div key={service.id} className="relative flex gap-4">
                        {/* Timeline node */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-4 border-white ${
                          isLatest ? timelineColors[service.type] : 'bg-[#e6e6e8]'
                        }`}>
                          <Wrench size={16} className="text-white" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="bg-[#f7f7f5] rounded-lg p-4 border border-[#e6e6e8]">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${serviceTypeColors[service.type]}`}>
                                    {serviceTypeLabels[service.type]}
                                  </span>
                                  {isLatest && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                      Latest
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-[#1d1d1d]">{service.description}</p>
                              </div>
                              <button
                                onClick={() => setExpandedService(isExpanded ? null : service.id)}
                                className="p-1 rounded-lg hover:bg-white transition-colors flex-shrink-0"
                              >
                                {isExpanded ? <ChevronUp size={16} className="text-[#8b8f95]" /> : <ChevronDown size={16} className="text-[#8b8f95]" />}
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-4 mt-2 text-xs text-[#8b8f95]">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {service.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <User size={12} />
                                {service.technicianName}
                              </span>
                              {(service.cost ?? 0) > 0 && (
                                <span className="flex items-center gap-1">
                                  <DollarSign size={12} />
                                  Rp {(service.cost ?? 0).toLocaleString('id-ID')}
                                </span>
                              )}
                            </div>

                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-[#e6e6e8] space-y-2">
                                {service.partsReplaced && service.partsReplaced !== '-' && (
                                  <div>
                                    <p className="text-xs text-[#8b8f95] uppercase tracking-wider mb-0.5">Parts Replaced</p>
                                    <p className="text-sm text-[#1d1d1d]">{service.partsReplaced}</p>
                                  </div>
                                )}
                                {service.nextSchedule && (
                                  <div>
                                    <p className="text-xs text-[#8b8f95] uppercase tracking-wider mb-0.5">Next Service</p>
                                    <p className="text-sm text-[#1d1d1d]">{service.nextSchedule}</p>
                                  </div>
                                )}
                                {service.notes && (
                                  <div>
                                    <p className="text-xs text-[#8b8f95] uppercase tracking-wider mb-0.5">Notes</p>
                                    <p className="text-sm text-[#1d1d1d]">{service.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
