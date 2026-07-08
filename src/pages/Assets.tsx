import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useUnits } from '@/hooks/useUnits';
import { useAuth } from '@/hooks/useAuth';
import { unitsApi } from '@/services/api';
import { PROVINCES, getCities } from '@/data/wilayah';
import {
  Search, Plus, Pencil, Trash2, X, MapPin, Package,
  ChevronLeft, ChevronRight, AlertCircle, Navigation, Loader2,
  Eye, Calendar, Shield
} from 'lucide-react';
import type { Unit, UnitCategory, UnitStatus } from '@/types';

// Fix Leaflet icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as unknown as Record<string,unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl:markerIcon2x, iconUrl:markerIcon, shadowUrl:markerShadow });

const catOptions: {value:UnitCategory;label:string}[] = [
  {value:'dialysis',label:'Dialysis'},{value:'laboratory',label:'Laboratory'},
  {value:'imaging',label:'Imaging'},{value:'ventilator',label:'Ventilator'},
  {value:'monitor',label:'Monitor'},{value:'other',label:'Other'},
];
const statusColors: Record<string,string> = {
  active:'bg-emerald-50 text-emerald-700 border-emerald-200',
  maintenance:'bg-amber-50 text-amber-700 border-amber-200',
  repair:'bg-red-50 text-red-700 border-red-200',
  inactive:'bg-gray-50 text-gray-600 border-gray-200',
};
const statusLabels: Record<string,string> = { active:'Aktif', maintenance:'Perlu Perhatian', repair:'Dalam Perbaikan', inactive:'Tidak Aktif' };

const emptyUnit: Omit<Unit,'id'|'createdAt'|'updatedAt'> = {
  serialNumber:'', productName:'', brand:'IMEDIN', category:'other', model:'',
  manufacturer:'IMEDIN Medical', batch:'', facilityName:'', room:'', pic:'', picContact:'',
  province:'', city:'', district:'', village:'', postalCode:'', address:'',
  latitude:-2.5, longitude:118, googleMapsUrl:'',
  customerName:'', customerPhone:'', distributorName:'',
  installationDate:new Date().toISOString().split('T')[0],
  warrantyEndDate:'', nextMaintenanceDate:'', lastServiceDate:'',
  status:'active', notes:''
};

function MapClickHandler({onMove}:{onMove:(lat:number,lng:number)=>void}) {
  useMapEvents({click(e){onMove(e.latlng.lat,e.latlng.lng);}});
  return null;
}

export default function Assets({ editMode }: { editMode?: boolean }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: editId } = useParams<{ id?: string }>();
  const { hasRole, isAuthenticated } = useAuth();
  const isAdmin = hasRole('admin');
  const canEdit = hasRole(['admin','teknisi']);

  const [search, setSearch] = useState(searchParams.get('search')||'');
  const [province, setProvince] = useState(searchParams.get('province')||'');
  const [category, setCategory] = useState(searchParams.get('category')||'');
  const [status, setStatus] = useState(searchParams.get('status')||'');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit|null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null);
  const [formData, setFormData] = useState(emptyUnit);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [addrSearch, setAddrSearch] = useState('');
  const [suggestions, setSuggestions] = useState<{display_name:string;lat:string;lon:string;address:{state?:string;city?:string;town?:string;county?:string}}[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [gps, setGps] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>|null>(null);

  const { units, loading, refresh } = useUnits({ search, province, category, status });

  // Auto-buka form edit kalau dari route /assets/:id/edit
  useEffect(() => {
    if (editMode && editId) {
      unitsApi.getById(editId).then(r => {
        if (r.success && r.data) {
          setEditingUnit(r.data);
          setFormData({...r.data});
          setAddrSearch(r.data.address || '');
          setSuggestions([]);
          setShowForm(true);
        }
      });
    }
  }, [editMode, editId]);
  const pageSize = 15;
  const totalPages = Math.ceil(units.length/pageSize);
  const paged = units.slice((page-1)*pageSize, page*pageSize);

  const searchAddr = (q:string) => {
    setAddrSearch(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (!q||q.length<3){setSuggestions([]);return;}
    debounce.current = setTimeout(async()=>{
      setGeocoding(true);
      try{ const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&countrycodes=id&limit=5`); setSuggestions(await r.json()); }
      catch{setSuggestions([]);}
      finally{setGeocoding(false);}
    },500);
  };

  const selectAddr = (item:typeof suggestions[0]) => {
    const city=item.address.city||item.address.town||item.address.county||'';
    const prov=item.address.state||'';
    setFormData(p=>({...p,address:item.display_name,latitude:parseFloat(item.lat),longitude:parseFloat(item.lon),city:p.city||city,province:p.province||prov}));
    setAddrSearch(item.display_name); setSuggestions([]);
  };

  const useGPS = () => {
    if(!navigator.geolocation){alert('GPS tidak didukung');return;}
    setGps(true);
    navigator.geolocation.getCurrentPosition(async pos=>{
      const{latitude,longitude}=pos.coords;
      try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`);
        const d=await r.json();
        setFormData(p=>({...p,latitude,longitude,address:p.address||d.display_name||'',city:p.city||d.address?.city||d.address?.town||'',province:p.province||d.address?.state||''}));
        setAddrSearch(d.display_name||'');
      }catch{setFormData(p=>({...p,latitude,longitude}));}
      setGps(false);
    },()=>{alert('Gagal GPS');setGps(false);});
  };

  const handleNew = ()=>{setEditingUnit(null);setFormData({...emptyUnit});setFormError('');setAddrSearch('');setSuggestions([]);setShowForm(true);};
  const handleEdit = (u:Unit)=>{setEditingUnit(u);setFormData({...u});setFormError('');setAddrSearch(u.address||'');setSuggestions([]);setShowForm(true);};

  const handleSubmit = async(e:React.FormEvent)=>{
    e.preventDefault(); setFormError('');
    if(!formData.serialNumber||!formData.productName){setFormError('Serial Number dan Product Name wajib');return;}
    setSaving(true);
    try{
      const r=editingUnit?await unitsApi.update(editingUnit.id,formData):await unitsApi.create(formData);
      if(r.success){setShowForm(false);refresh();}
      else setFormError(r.message||'Gagal menyimpan');
    }catch{setFormError('Terjadi kesalahan');}
    finally{setSaving(false);}
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1d]" style={{fontFamily:'Poppins,sans-serif'}}>Aset Terpasang</h1>
          <p className="text-sm text-[#8b8f95] mt-0.5">{units.length} unit ditemukan</p>
        </div>
        {canEdit && (
          <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all">
            <Plus size={16}/> Tambah Unit
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Cari serial, produk, fasilitas..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]"/>
          </div>
          <select value={province} onChange={e=>{setProvince(e.target.value);setPage(1);}} className="min-w-[130px] px-3 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]">
            <option value="">Semua Provinsi</option>
            {PROVINCES.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          <select value={category} onChange={e=>{setCategory(e.target.value);setPage(1);}} className="min-w-[120px] px-3 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]">
            <option value="">Semua Kategori</option>
            {catOptions.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} className="min-w-[130px] px-3 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]">
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="maintenance">Perlu Perhatian</option>
            <option value="repair">Dalam Perbaikan</option>
            <option value="inactive">Tidak Aktif</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e6e6e8] bg-[#f7f7f5]">
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Foto/Produk</th>
                {isAuthenticated && <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Serial Number</th>}
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Model</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Fasilitas & Lokasi</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3 hidden md:table-cell">Instalasi</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3 hidden lg:table-cell">Garansi</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_,i)=>(
                  <tr key={i} className="border-b border-[#e6e6e8]">
                    {[...Array(7)].map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse"/></td>)}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-[#8b8f95]">
                  <Package size={36} className="mx-auto mb-2 text-[#e6e6e8]"/>
                  <p>Tidak ada unit ditemukan</p>
                </td></tr>
              ) : paged.map((u,idx)=>(
                <tr key={u.id} onClick={()=>navigate(`/assets/${u.id}`)}
                  className={`border-b border-[#e6e6e8] hover:bg-blue-50/40 cursor-pointer transition-colors ${idx%2===0?'bg-white':'bg-[#fafafa]'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#f0f0f0] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {u.photoUrl ? <img src={u.photoUrl} alt="" className="w-full h-full object-cover"/> : <Package size={18} className="text-[#8b8f95]"/>}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1d1d1d] leading-tight">{u.productName}</p>
                        <p className="text-xs text-[#8b8f95]">{u.brand} · {u.category}</p>
                      </div>
                    </div>
                  </td>
                  {isAuthenticated && <td className="px-4 py-3"><span className="text-xs font-mono text-[#1d1d1d]">{u.serialNumber}</span></td>}
                  <td className="px-4 py-3 text-xs text-[#8b8f95]">{u.model}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-[#1d1d1d] truncate max-w-[160px]">{isAuthenticated ? (u.facilityName||u.customerName) : `Fasilitas di ${u.city}`}</p>
                    <div className="flex items-center gap-1 text-xs text-[#8b8f95] mt-0.5"><MapPin size={11}/>{u.city}, {u.province}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1 text-xs text-[#8b8f95]"><Calendar size={11}/>{u.installationDate}</div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {isAuthenticated ? (
                      <div className="flex items-center gap-1 text-xs text-[#8b8f95]"><Shield size={11}/>{u.warrantyEndDate||'—'}</div>
                    ) : <span className="text-xs text-[#8b8f95]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[u.status]||statusColors.inactive}`}>
                      {statusLabels[u.status]||u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={()=>navigate(`/assets/${u.id}`)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#8b8f95] hover:text-[#3b82f6] transition-colors" title="Lihat Detail"><Eye size={15}/></button>
                      {canEdit && <button onClick={()=>handleEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#8b8f95] hover:text-[#3b82f6] transition-colors" title="Edit"><Pencil size={15}/></button>}
                      {isAdmin && <button onClick={()=>setDeleteConfirm(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#8b8f95] hover:text-red-500 transition-colors" title="Hapus"><Trash2 size={15}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e6e6e8]">
            <p className="text-xs text-[#8b8f95]">{((page-1)*pageSize)+1}–{Math.min(page*pageSize,units.length)} dari {units.length}</p>
            <div className="flex items-center gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded-lg hover:bg-[#f7f7f5] disabled:opacity-30"><ChevronLeft size={16}/></button>
              {[...Array(Math.min(totalPages,5))].map((_,i)=>{
                const p=totalPages<=5?i+1:page<=3?i+1:page>=totalPages-2?totalPages-4+i:page-2+i;
                return <button key={p} onClick={()=>setPage(p)} className={`w-7 h-7 rounded text-xs ${page===p?'bg-[#3b82f6] text-white':'hover:bg-[#f7f7f5] text-[#8b8f95]'}`}>{p}</button>;
              })}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-1.5 rounded-lg hover:bg-[#f7f7f5] disabled:opacity-30"><ChevronRight size={16}/></button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-[#e6e6e8] z-10">
              <h2 className="font-semibold text-[#1d1d1d]">{editingUnit?'Edit Unit':'Tambah Unit Baru'}</h2>
              <button onClick={()=>setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[#f7f7f5]"><X size={18} className="text-[#8b8f95]"/></button>
            </div>
            {formError && <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2"><AlertCircle size={15}/>{formError}</div>}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormSection title="Informasi Unit">
                  <FInput label="Serial Number *" value={formData.serialNumber} onChange={v=>setFormData({...formData,serialNumber:v})} placeholder="IMD-20230001"/>
                  <FInput label="Product Name *" value={formData.productName} onChange={v=>setFormData({...formData,productName:v})} placeholder="Patient Monitor PM-700"/>
                  <FInput label="Brand" value={formData.brand} onChange={v=>setFormData({...formData,brand:v})}/>
                  <FSelect label="Category" value={formData.category} onChange={v=>setFormData({...formData,category:v as UnitCategory})} options={catOptions}/>
                  <FInput label="Model" value={formData.model} onChange={v=>setFormData({...formData,model:v})}/>
                  <FInput label="Manufacturer" value={formData.manufacturer} onChange={v=>setFormData({...formData,manufacturer:v})}/>
                </FormSection>
                <FormSection title="Informasi Fasilitas">
                  <FInput label="Nama Fasilitas *" value={formData.facilityName} onChange={v=>setFormData({...formData,facilityName:v})} placeholder="RSUD Jakarta"/>
                  <FInput label="Ruangan" value={formData.room||''} onChange={v=>setFormData({...formData,room:v})}/>
                  <FInput label="PIC" value={formData.pic||''} onChange={v=>setFormData({...formData,pic:v})}/>
                  <FInput label="Kontak PIC" value={formData.picContact||''} onChange={v=>setFormData({...formData,picContact:v})}/>
                  {/* Provinsi dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Provinsi</label>
                    <select value={formData.province} onChange={e=>{
                      setFormData({...formData, province:e.target.value, city:''});
                    }} className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]">
                      <option value="">-- Pilih Provinsi --</option>
                      {PROVINCES.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  {/* Kab/Kota dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-[#8b8f95] mb-1">Kab/Kota</label>
                    <select value={formData.city} onChange={e=>setFormData({...formData,city:e.target.value})}
                      disabled={!formData.province}
                      className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6] disabled:opacity-50">
                      <option value="">-- Pilih Kab/Kota --</option>
                      {getCities(formData.province).map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </FormSection>
              </div>

              {/* Lokasi */}
              <div className="border-t border-[#e6e6e8] pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b8f95] mb-3">Lokasi (Geocoding)</h3>
                <div className="relative mb-2">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]"/>
                  <input value={addrSearch} onChange={e=>searchAddr(e.target.value)} placeholder="Ketik alamat untuk cari koordinat..."
                    className="w-full pl-9 pr-20 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]"/>
                  <button type="button" onClick={useGPS} disabled={gps}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 bg-[#3b82f6] text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50">
                    {gps?<Loader2 size={11} className="animate-spin"/>:<Navigation size={11}/>} GPS
                  </button>
                  {/* Dropdown suggestions — di dalam relative parent supaya tidak terpotong */}
                  {(geocoding||suggestions.length>0) && (
                    <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white border border-[#e6e6e8] rounded-lg shadow-xl overflow-hidden">
                      {geocoding
                        ? <div className="flex items-center gap-2 px-3 py-2 text-sm text-[#8b8f95]"><Loader2 size={13} className="animate-spin"/>Mencari...</div>
                        : suggestions.map((s,i)=>(
                            <button key={i} type="button" onClick={()=>selectAddr(s)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-[#f7f7f5] last:border-0">
                              <span className="line-clamp-2 text-xs">{s.display_name}</span>
                            </button>
                          ))
                      }
                    </div>
                  )}
                </div>
                {(formData.latitude!==0||formData.longitude!==0) && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                    <MapPin size={12}/> {Number(formData.latitude).toFixed(6)}, {Number(formData.longitude).toFixed(6)}
                  </div>
                )}
                <div className="rounded-lg overflow-hidden border border-[#e6e6e8]" style={{height:180}}>
                  <MapContainer center={[formData.latitude||(-2.5), formData.longitude||118]} zoom={formData.latitude?12:5} style={{height:'100%',width:'100%'}} key={`${formData.latitude}-${formData.longitude}`}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap"/>
                    <MapClickHandler onMove={(lat,lng)=>setFormData(p=>({...p,latitude:lat,longitude:lng}))}/>
                    {formData.latitude!==0&&<Marker position={[formData.latitude,formData.longitude]}/>}
                  </MapContainer>
                </div>
                <p className="text-[10px] text-[#8b8f95] mt-1">Klik peta untuk pindahkan pin lokasi</p>
              </div>

              {/* Tanggal & Status */}
              <div className="border-t border-[#e6e6e8] pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <FDate label="Instalasi" value={formData.installationDate} onChange={v=>setFormData({...formData,installationDate:v})}/>
                <FDate label="Garansi Habis" value={formData.warrantyEndDate} onChange={v=>setFormData({...formData,warrantyEndDate:v})}/>
                <FDate label="PM Berikutnya" value={formData.nextMaintenanceDate} onChange={v=>setFormData({...formData,nextMaintenanceDate:v})}/>
                <FSelect label="Status" value={formData.status} onChange={v=>setFormData({...formData,status:v as UnitStatus})} options={[{value:'active',label:'Aktif'},{value:'maintenance',label:'Perlu Perhatian'},{value:'repair',label:'Dalam Perbaikan'},{value:'inactive',label:'Tidak Aktif'}]}/>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#e6e6e8]">
                <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2.5 border border-[#e6e6e8] rounded-lg text-sm text-[#8b8f95] hover:bg-[#f7f7f5]">Batal</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50">
                  {saving?<Loader2 size={16} className="animate-spin mx-auto"/>:(editingUnit?'Update':'Simpan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3"><Trash2 size={22} className="text-red-500"/></div>
            <h3 className="font-semibold text-[#1d1d1d] mb-1">Hapus Unit?</h3>
            <p className="text-sm text-[#8b8f95] mb-5">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-[#e6e6e8] rounded-lg text-sm text-[#8b8f95] hover:bg-[#f7f7f5]">Batal</button>
              <button onClick={async()=>{await unitsApi.delete(deleteConfirm!);setDeleteConfirm(null);refresh();}} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Small form helpers
function FormSection({title,children}:{title:string;children:React.ReactNode}){
  return <div className="space-y-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b8f95]">{title}</h3>{children}</div>;
}
function FInput({label,value,onChange,placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string}){
  return <div><label className="block text-xs font-medium text-[#8b8f95] mb-1">{label}</label>
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]"/></div>;
}
function FSelect({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:{value:string;label:string}[]}){
  return <div><label className="block text-xs font-medium text-[#8b8f95] mb-1">{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)} className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]">
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select></div>;
}
function FDate({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
  return <div><label className="block text-xs font-medium text-[#8b8f95] mb-1">{label}</label>
    <input type="date" value={value} onChange={e=>onChange(e.target.value)} className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]"/></div>;
}
