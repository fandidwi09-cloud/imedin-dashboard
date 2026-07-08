import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import { Search, Filter, ChevronRight, CheckCircle2, Calendar, User, Package } from 'lucide-react';
import type { ActivityType } from '@/types';

const typeLabels: Record<ActivityType, string> = {
  installation:'Instalasi', preventive_maintenance:'Preventive Maintenance', repair:'Perbaikan',
  firmware_upgrade:'Upgrade Firmware', spare_part:'Penggantian Sparepart', relocation:'Relokasi', other:'Lainnya'
};
const typeColors: Record<ActivityType, string> = {
  installation:'bg-blue-500', preventive_maintenance:'bg-green-500', repair:'bg-red-500',
  firmware_upgrade:'bg-purple-500', spare_part:'bg-amber-500', relocation:'bg-orange-500', other:'bg-gray-400'
};
const typeBadge: Record<ActivityType, string> = {
  installation:'bg-blue-100 text-blue-700', preventive_maintenance:'bg-green-100 text-green-700',
  repair:'bg-red-100 text-red-700', firmware_upgrade:'bg-purple-100 text-purple-700',
  spare_part:'bg-amber-100 text-amber-700', relocation:'bg-orange-100 text-orange-700', other:'bg-gray-100 text-gray-600'
};

export default function Activities() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { activities, loading } = useActivities();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filtered = useMemo(() => {
    let a = activities;
    if (search) { const s = search.toLowerCase(); a = a.filter(x => x.description.toLowerCase().includes(s) || x.serialNumber.toLowerCase().includes(s) || x.technicianName.toLowerCase().includes(s)); }
    if (typeFilter) a = a.filter(x => x.type === typeFilter);
    return a;
  }, [activities, search, typeFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page-1)*pageSize, page*pageSize);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1d]" style={{fontFamily:'Poppins,sans-serif'}}>Aktivitas</h1>
        <p className="text-sm text-[#8b8f95] mt-0.5">Timeline seluruh aktivitas perangkat medis</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] p-4 shadow-sm flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]"/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Cari deskripsi, serial, teknisi..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]"/>
        </div>
        <select value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setPage(1);}} className="min-w-[180px] px-3 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]">
          <option value="">Semua Jenis</option>
          {Object.entries(typeLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] shadow-sm p-5">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_,i)=><div key={i} className="flex gap-4"><div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"/><div className="flex-1 h-16 bg-gray-200 rounded-xl animate-pulse"/></div>)}
          </div>
        ) : paged.length === 0 ? (
          <div className="text-center py-12 text-[#8b8f95] text-sm">
            <Filter size={32} className="mx-auto mb-2 text-[#e6e6e8]"/>
            <p>Tidak ada aktivitas ditemukan</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#e6e6e8]"/>
            <div className="space-y-4">
              {paged.map(act => (
                <div key={act.id} className="relative flex gap-4">
                  <div className={`relative z-10 w-8 h-8 rounded-full ${typeColors[act.type]} flex items-center justify-center flex-shrink-0`}>
                    <CheckCircle2 size={14} className="text-white"/>
                  </div>
                  <button onClick={()=>navigate(`/assets/${act.unitId}`)}
                    className="flex-1 bg-[#f7f7f5] rounded-xl p-3.5 border border-[#e6e6e8] hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${typeBadge[act.type]}`}>{typeLabels[act.type]}</span>
                        {isAuthenticated && <span className="text-xs font-mono text-[#8b8f95]">{act.serialNumber}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#8b8f95]">
                        <span className="flex items-center gap-1"><Calendar size={11}/>{act.date}</span>
                        <span className="flex items-center gap-1"><User size={11}/>{act.technicianName}</span>
                        {(act.cost ?? 0) > 0 && <span>Rp {(act.cost ?? 0).toLocaleString()}</span>}
                        <ChevronRight size={13}/>
                      </div>
                    </div>
                    <p className="text-sm text-[#1d1d1d] mt-1.5">{act.description}</p>
                    {act.partsReplaced && <p className="text-xs text-[#8b8f95] mt-1 flex items-center gap-1"><Package size={10}/>Sparepart: {act.partsReplaced}</p>}
                    {act.nextSchedule && <p className="text-xs text-amber-600 mt-1">Jadwal berikutnya: {act.nextSchedule}</p>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#e6e6e8]">
            <p className="text-xs text-[#8b8f95]">{((page-1)*pageSize)+1}–{Math.min(page*pageSize,filtered.length)} dari {filtered.length}</p>
            <div className="flex items-center gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-3 py-1.5 rounded-lg border border-[#e6e6e8] text-xs disabled:opacity-30 hover:bg-[#f7f7f5]">← Prev</button>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-3 py-1.5 rounded-lg border border-[#e6e6e8] text-xs disabled:opacity-30 hover:bg-[#f7f7f5]">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
