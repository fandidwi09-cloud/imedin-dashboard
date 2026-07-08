import { useState } from 'react';
import { useUnits } from '@/hooks/useUnits';
import { importExportApi } from '@/services/api';
import { BarChart3, Download, FileText, Filter, Loader2 } from 'lucide-react';

export default function Reports() {
  const [province, setProvince] = useState('');
  const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState(false);
  const { units, loading } = useUnits({ province, status });

  const summary = {
    total: units.length,
    active: units.filter(u=>u.status==='active').length,
    maintenance: units.filter(u=>u.status==='maintenance').length,
    repair: units.filter(u=>u.status==='repair').length,
    inactive: units.filter(u=>u.status==='inactive').length,
    warrantyExpiring: units.filter(u=>{ const d=new Date(u.warrantyEndDate); const now=new Date(); const d90=new Date(); d90.setDate(now.getDate()+90); return d>=now&&d<d90; }).length,
    warrantyExpired: units.filter(u=>u.warrantyEndDate&&new Date(u.warrantyEndDate)<new Date()).length,
  };

  const handleExport = async (format: 'xlsx'|'csv') => {
    setExporting(true);
    try {
      const blob = await importExportApi.exportUnits(format, { ...(province && {province}), ...(status && {status}) });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=`IMEDIN_Aset_${new Date().toISOString().split('T')[0]}.${format}`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  const provinces = [...new Set(units.map(u=>u.province).filter(Boolean))].sort();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1d]" style={{fontFamily:'Poppins,sans-serif'}}>Laporan</h1>
        <p className="text-sm text-[#8b8f95] mt-0.5">Export data dan ringkasan populasi aset</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <Filter size={15} className="text-[#8b8f95]"/>
        <select value={province} onChange={e=>setProvince(e.target.value)} className="px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]">
          <option value="">Semua Provinsi</option>
          {provinces.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]">
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="maintenance">Perlu Perhatian</option>
          <option value="repair">Dalam Perbaikan</option>
          <option value="inactive">Tidak Aktif</option>
        </select>
        <div className="flex-1"/>
        <button onClick={()=>handleExport('xlsx')} disabled={exporting||loading} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 transition-all">
          {exporting?<Loader2 size={14} className="animate-spin"/>:<Download size={14}/>} Export Excel
        </button>
        <button onClick={()=>handleExport('csv')} disabled={exporting||loading} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 transition-all">
          {exporting?<Loader2 size={14} className="animate-spin"/>:<Download size={14}/>} Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {label:'Total Unit',value:summary.total,color:'bg-blue-50 text-blue-600'},
          {label:'Aktif',value:summary.active,color:'bg-emerald-50 text-emerald-600'},
          {label:'Dalam Perbaikan',value:summary.repair,color:'bg-red-50 text-red-600'},
          {label:'Garansi Habis',value:summary.warrantyExpired,color:'bg-amber-50 text-amber-600'},
        ].map(c=>(
          <div key={c.label} className="bg-white rounded-xl border border-[#e6e6e8] p-4 shadow-sm">
            <p className="text-2xl font-bold text-[#1d1d1d]">{c.value.toLocaleString()}</p>
            <p className="text-xs text-[#8b8f95] mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Per Provinsi */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider mb-4 flex items-center gap-2">
          <BarChart3 size={15} className="text-[#3b82f6]"/> Distribusi per Provinsi
        </h2>
        {loading ? <div className="space-y-2">{[...Array(6)].map((_,i)=><div key={i} className="h-8 bg-gray-200 rounded animate-pulse"/>)}</div> : (
          <div className="space-y-2.5">
            {Object.entries(units.reduce((acc,u)=>{acc[u.province]=(acc[u.province]||0)+1;return acc;},{} as Record<string,number>))
              .sort((a,b)=>b[1]-a[1]).map(([prov,count])=>{
              const pct=Math.round((count/Math.max(summary.total,1))*100);
              return (
                <div key={prov} className="flex items-center gap-3">
                  <span className="text-sm text-[#8b8f95] w-36 truncate">{prov||'—'}</span>
                  <div className="flex-1 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div className="h-full bg-[#3b82f6] rounded-full transition-all" style={{width:`${pct}%`}}/>
                  </div>
                  <span className="text-sm font-medium text-[#1d1d1d] w-10 text-right">{count}</span>
                  <span className="text-xs text-[#8b8f95] w-8">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per Produk */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText size={15} className="text-[#3b82f6]"/> Distribusi per Produk
        </h2>
        {loading ? <div className="space-y-2">{[...Array(4)].map((_,i)=><div key={i} className="h-8 bg-gray-200 rounded animate-pulse"/>)}</div> : (
          <div className="space-y-2.5">
            {Object.entries(units.reduce((acc,u)=>{acc[u.productName]=(acc[u.productName]||0)+1;return acc;},{} as Record<string,number>))
              .sort((a,b)=>b[1]-a[1]).map(([prod,count])=>{
              const pct=Math.round((count/Math.max(summary.total,1))*100);
              return (
                <div key={prod} className="flex items-center gap-3">
                  <span className="text-sm text-[#8b8f95] w-44 truncate">{prod}</span>
                  <div className="flex-1 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width:`${pct}%`}}/>
                  </div>
                  <span className="text-sm font-medium text-[#1d1d1d] w-10 text-right">{count}</span>
                  <span className="text-xs text-[#8b8f95] w-8">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
