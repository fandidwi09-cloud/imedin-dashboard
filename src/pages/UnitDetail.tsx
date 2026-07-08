import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { unitsApi, activitiesApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import type { Unit, Activity, ActivityType } from '@/types';
import {
  ArrowLeft, MapPin, Phone, User, Building2, Calendar, Shield,
  Wrench, QrCode, ExternalLink, Plus, X,
  Package, Loader2, AlertCircle, CheckCircle2, Clock, FileText
} from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
  repair: 'bg-red-100 text-red-700 border-red-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
};
const statusLabels: Record<string, string> = { active:'Aktif', maintenance:'Perlu Perhatian', repair:'Dalam Perbaikan', inactive:'Tidak Aktif' };

const actTypeLabels: Record<ActivityType, string> = {
  installation:'Instalasi', preventive_maintenance:'Preventive Maintenance', repair:'Perbaikan',
  firmware_upgrade:'Upgrade Firmware', spare_part:'Penggantian Sparepart', relocation:'Relokasi', other:'Lainnya'
};
const actTypeColors: Record<ActivityType, string> = {
  installation:'bg-blue-500', preventive_maintenance:'bg-green-500', repair:'bg-red-500',
  firmware_upgrade:'bg-purple-500', spare_part:'bg-amber-500', relocation:'bg-orange-500', other:'bg-gray-400'
};

const warrantyColors: Record<string, string> = {
  active:'bg-emerald-100 text-emerald-700', expiring_soon:'bg-amber-100 text-amber-700', expired:'bg-red-100 text-red-700'
};
const warrantyLabels: Record<string, string> = { active:'Garansi Aktif', expiring_soon:'Garansi Segera Habis', expired:'Garansi Berakhir' };

export default function UnitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, hasRole } = useAuth();
  const canEdit = hasRole(['admin', 'teknisi']);

  const [unit, setUnit] = useState<Unit | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'timeline' | 'docs'>('info');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([unitsApi.getById(id), activitiesApi.getAll(id)])
      .then(([uRes, aRes]) => {
        if (uRes.success && uRes.data) setUnit(uRes.data);
        else setError('Unit tidak ditemukan');
        if (aRes.success && aRes.data) setActivities(aRes.data);
      })
      .catch(() => setError('Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-[#3b82f6]"/>
    </div>
  );
  if (error || !unit) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle size={36} className="text-red-400"/>
      <p className="text-[#8b8f95]">{error || 'Unit tidak ditemukan'}</p>
      <button onClick={()=>navigate('/assets')} className="text-[#3b82f6] hover:underline text-sm">← Kembali ke Aset</button>
    </div>
  );

  const wStatus = unit.warrantyStatus ?? (unit.warrantyEndDate && new Date(unit.warrantyEndDate) < new Date() ? 'expired' : 'active');

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Back + header */}
      <div className="flex items-start gap-3">
        <button onClick={()=>navigate('/assets')} className="mt-0.5 p-1.5 rounded-lg hover:bg-[#e6e6e8] transition-colors">
          <ArrowLeft size={18} className="text-[#8b8f95]"/>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-[#1d1d1d]" style={{fontFamily:'Poppins,sans-serif'}}>{unit.productName}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[unit.status]}`}>
              {statusLabels[unit.status]}
            </span>
            {unit.warrantyStatus && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${warrantyColors[wStatus]}`}>
                {warrantyLabels[wStatus]}
              </span>
            )}
          </div>
          <p className="text-sm text-[#8b8f95] mt-0.5">{unit.facilityName || unit.customerName} · {unit.city}, {unit.province}</p>
        </div>
        {canEdit && (
          <button onClick={()=>navigate(`/assets/${unit.id}/edit`)} className="hidden sm:flex items-center gap-2 px-3 py-2 border border-[#e6e6e8] rounded-lg text-sm text-[#8b8f95] hover:bg-[#f7f7f5] transition-colors">
            <Wrench size={15}/> Edit
          </button>
        )}
      </div>

      {/* Digital Passport Card */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] shadow-sm overflow-hidden">
        {/* Photo + QR header */}
        <div className="bg-gradient-to-r from-[#1e2022] to-[#2c2f33] p-5 flex items-start gap-4">
          <div className="w-20 h-20 rounded-xl bg-[#3b82f6]/20 flex items-center justify-center flex-shrink-0 border border-[#3b82f6]/30">
            {unit.photoUrl ? (
              <img src={unit.photoUrl} alt={unit.productName} className="w-full h-full object-cover rounded-xl"/>
            ) : (
              <Package size={32} className="text-[#3b82f6]"/>
            )}
          </div>
          <div className="flex-1 min-w-0 text-white">
            <p className="text-lg font-semibold truncate">{unit.productName}</p>
            <p className="text-sm text-white/60 mt-0.5">{unit.brand} · {unit.model}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {isAuthenticated && (
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs font-mono text-white/80">{unit.serialNumber}</span>
              )}
              <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/80 capitalize">{unit.category}</span>
              {unit.batch && <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/80">Batch: {unit.batch}</span>}
            </div>
          </div>
          {unit.qrCodeUrl ? (
            <img src={unit.qrCodeUrl} alt="QR Code" className="w-16 h-16 bg-white p-1 rounded-lg flex-shrink-0"/>
          ) : (
            <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/20">
              <QrCode size={28} className="text-white/40"/>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#e6e6e8]">
          {[{key:'info',label:'Informasi'},{key:'timeline',label:`Timeline (${activities.length})`},{key:'docs',label:'Dokumen'}].map(tab=>(
            <button key={tab.key} onClick={()=>setActiveTab(tab.key as typeof activeTab)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${activeTab===tab.key ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]' : 'text-[#8b8f95] hover:text-[#1d1d1d]'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Info */}
        {activeTab === 'info' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lokasi */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b8f95] mb-3">Lokasi Instalasi</h3>
              <div className="space-y-2.5">
                <InfoRow icon={Building2} label="Fasilitas" value={unit.facilityName||unit.customerName} hide={!isAuthenticated}/>
                <InfoRow icon={MapPin} label="Ruangan" value={unit.room}/>
                <InfoRow icon={MapPin} label="Alamat" value={unit.address}/>
                <InfoRow icon={MapPin} label="Kecamatan" value={unit.district}/>
                <InfoRow icon={MapPin} label="Kota" value={`${unit.city}, ${unit.province}`}/>
                {unit.googleMapsUrl && (
                  <a href={unit.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#3b82f6] hover:underline mt-1">
                    <ExternalLink size={14}/> Buka Google Maps
                  </a>
                )}
              </div>
            </div>

            {/* PIC */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b8f95] mb-3">PIC & Kontak</h3>
              <div className="space-y-2.5">
                <InfoRow icon={User} label="PIC" value={unit.pic} hide={!isAuthenticated}/>
                <InfoRow icon={Phone} label="Kontak" value={unit.picContact} hide={!isAuthenticated}/>
                <InfoRow icon={User} label="Customer" value={unit.customerName} hide={!isAuthenticated}/>
                <InfoRow icon={Phone} label="Telepon" value={unit.customerPhone} hide={!isAuthenticated}/>
                <InfoRow icon={Building2} label="Distributor" value={unit.distributorName}/>
              </div>
            </div>

            {/* Tanggal & Garansi */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b8f95] mb-3">Tanggal & Garansi</h3>
              <div className="space-y-2.5">
                <InfoRow icon={Calendar} label="Tanggal Instalasi" value={unit.installationDate}/>
                <InfoRow icon={Shield} label="Garansi Berakhir" value={unit.warrantyEndDate} highlight={wStatus==='expiring_soon'||wStatus==='expired'}/>
                <InfoRow icon={Clock} label="PM Berikutnya" value={unit.nextMaintenanceDate}/>
                <InfoRow icon={Clock} label="Servis Terakhir" value={unit.lastServiceDate}/>
              </div>
            </div>

            {/* Spesifikasi */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b8f95] mb-3">Spesifikasi</h3>
              <div className="space-y-2.5">
                <InfoRow icon={Package} label="Produk" value={unit.productName}/>
                <InfoRow icon={Package} label="Brand" value={unit.brand}/>
                <InfoRow icon={Package} label="Model" value={unit.model}/>
                <InfoRow icon={Package} label="Manufacturer" value={unit.manufacturer}/>
                <InfoRow icon={Package} label="Batch" value={unit.batch}/>
              </div>
            </div>

            {unit.notes && (
              <div className="md:col-span-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b8f95] mb-2">Catatan</h3>
                <p className="text-sm text-[#1d1d1d] bg-[#f7f7f5] rounded-lg p-3">{unit.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Timeline */}
        {activeTab === 'timeline' && (
          <div className="p-5">
            {canEdit && (
              <button onClick={()=>setShowAddActivity(true)}
                className="flex items-center gap-2 mb-4 px-3 py-2 bg-[#3b82f6] text-white rounded-lg text-sm hover:bg-blue-600 transition-all">
                <Plus size={15}/> Tambah Aktivitas
              </button>
            )}
            {activities.length === 0 ? (
              <div className="text-center py-10 text-[#8b8f95] text-sm">
                <Clock size={36} className="mx-auto mb-2 text-[#e6e6e8]"/>
                <p>Belum ada aktivitas tercatat</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#e6e6e8]"/>
                <div className="space-y-4">
                  {activities.map(act=>(
                    <div key={act.id} className="relative flex gap-4">
                      <div className={`relative z-10 w-8 h-8 rounded-full ${actTypeColors[act.type]} flex items-center justify-center flex-shrink-0`}>
                        <CheckCircle2 size={14} className="text-white"/>
                      </div>
                      <div className="flex-1 bg-[#f7f7f5] rounded-xl p-3.5 border border-[#e6e6e8]">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-sm font-medium text-[#1d1d1d]">{actTypeLabels[act.type]}</span>
                            <p className="text-xs text-[#8b8f95] mt-0.5">{act.date} · {act.technicianName}</p>
                          </div>
                          {(act.cost ?? 0) > 0 && (
                            <span className="text-xs text-[#8b8f95] flex-shrink-0">Rp {(act.cost ?? 0).toLocaleString()}</span>
                          )}
                        </div>
                        <p className="text-sm text-[#1d1d1d] mt-2">{act.description}</p>
                        {act.partsReplaced && <p className="text-xs text-[#8b8f95] mt-1">Sparepart: {act.partsReplaced}</p>}
                        {act.nextSchedule && <p className="text-xs text-amber-600 mt-1">Jadwal berikutnya: {act.nextSchedule}</p>}
                        {act.notes && <p className="text-xs text-[#8b8f95] mt-1 italic">{act.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Dokumen */}
        {activeTab === 'docs' && (
          <div className="p-5">
            {!isAuthenticated ? (
              <div className="text-center py-8 text-[#8b8f95] text-sm">
                <FileText size={32} className="mx-auto mb-2 text-[#e6e6e8]"/>
                <p>Login untuk melihat dokumen</p>
              </div>
            ) : (
              <div className="text-center py-8 text-[#8b8f95] text-sm">
                <FileText size={32} className="mx-auto mb-2 text-[#e6e6e8]"/>
                <p>Belum ada dokumen terlampir</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Activity Modal */}
      {showAddActivity && <AddActivityModal unit={unit} onClose={()=>setShowAddActivity(false)} onSaved={(act)=>{setActivities(p=>[act,...p]); setShowAddActivity(false); setActiveTab('timeline');}}/>}
    </div>
  );
}

// Helper component
function InfoRow({ icon: Icon, label, value, hide, highlight }: { icon: React.ElementType; label: string; value?: string; hide?: boolean; highlight?: boolean }) {
  if (!value && value !== '0') return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="text-[#8b8f95] mt-0.5 flex-shrink-0"/>
      <div className="min-w-0">
        <p className="text-[10px] text-[#8b8f95] uppercase tracking-wider">{label}</p>
        {hide ? (
          <p className="text-sm text-[#8b8f95] italic">— login untuk melihat —</p>
        ) : (
          <p className={`text-sm ${highlight ? 'text-amber-600 font-medium' : 'text-[#1d1d1d]'}`}>{value}</p>
        )}
      </div>
    </div>
  );
}

// Add Activity Modal
function AddActivityModal({ unit, onClose, onSaved }: { unit: Unit; onClose: ()=>void; onSaved: (a: Activity)=>void }) {
  const [form, setForm] = useState({
    type: 'preventive_maintenance' as ActivityType,
    date: new Date().toISOString().split('T')[0],
    technicianName: '', description: '', partsReplaced: '',
    cost: '', nextSchedule: '', notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.technicianName || !form.description) { setError('Nama teknisi dan deskripsi wajib diisi'); return; }
    setSaving(true);
    try {
      const result = await activitiesApi.create({
        unitId: unit.id, serialNumber: unit.serialNumber,
        type: form.type, date: form.date,
        technicianName: form.technicianName, description: form.description,
        partsReplaced: form.partsReplaced, cost: parseFloat(form.cost)||0,
        nextSchedule: form.nextSchedule, notes: form.notes
      });
      if (result.success && result.data) onSaved(result.data);
      else setError(result.message || 'Gagal menyimpan');
    } catch { setError('Terjadi kesalahan'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e6e6e8]">
          <h3 className="font-semibold text-[#1d1d1d]">Tambah Aktivitas</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f7f7f5]"><X size={18} className="text-[#8b8f95]"/></button>
        </div>
        {error && <div className="mx-5 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2"><AlertCircle size={15}/>{error}</div>}
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div><label className="block text-xs font-medium text-[#8b8f95] mb-1">Jenis Aktivitas</label>
            <select value={form.type} onChange={e=>setForm({...form,type:e.target.value as ActivityType})} className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]">
              {Object.entries(actTypeLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select></div>
          <div><label className="block text-xs font-medium text-[#8b8f95] mb-1">Tanggal</label>
            <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]"/></div>
          <div><label className="block text-xs font-medium text-[#8b8f95] mb-1">Nama Teknisi *</label>
            <input value={form.technicianName} onChange={e=>setForm({...form,technicianName:e.target.value})} className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]" placeholder="Nama teknisi"/></div>
          <div><label className="block text-xs font-medium text-[#8b8f95] mb-1">Deskripsi *</label>
            <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6] resize-none" placeholder="Deskripsi aktivitas"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-[#8b8f95] mb-1">Sparepart</label>
              <input value={form.partsReplaced} onChange={e=>setForm({...form,partsReplaced:e.target.value})} className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]" placeholder="Opsional"/></div>
            <div><label className="block text-xs font-medium text-[#8b8f95] mb-1">Biaya (Rp)</label>
              <input type="number" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})} className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]" placeholder="0"/></div>
          </div>
          <div><label className="block text-xs font-medium text-[#8b8f95] mb-1">Jadwal Berikutnya</label>
            <input type="date" value={form.nextSchedule} onChange={e=>setForm({...form,nextSchedule:e.target.value})} className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]"/></div>
          <div><label className="block text-xs font-medium text-[#8b8f95] mb-1">Catatan</label>
            <input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]" placeholder="Opsional"/></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-[#e6e6e8] rounded-lg text-sm text-[#8b8f95] hover:bg-[#f7f7f5]">Batal</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin mx-auto"/> : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
