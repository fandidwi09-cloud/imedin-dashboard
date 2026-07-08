import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuth } from '@/hooks/useAuth';
import {
  Package, MapPin, Building2, Map, Shield, Wrench,
  AlertTriangle, XCircle, CheckCircle2, Clock, TrendingUp,
  ChevronRight, Zap, Activity, BarChart3, FileText
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { unitsApi } from '@/services/api';
import { useState, useEffect } from 'react';
import type { Unit, ActivityType } from '@/types';

// Activity type labels
const actLabels: Record<ActivityType, string> = {
  installation:'Instalasi', preventive_maintenance:'PM', repair:'Perbaikan',
  firmware_upgrade:'Firmware', spare_part:'Sparepart', relocation:'Relokasi', other:'Lainnya'
};
const actColors: Record<ActivityType, string> = {
  installation:'bg-blue-100 text-blue-700', preventive_maintenance:'bg-green-100 text-green-700',
  repair:'bg-red-100 text-red-700', firmware_upgrade:'bg-purple-100 text-purple-700',
  spare_part:'bg-amber-100 text-amber-700', relocation:'bg-orange-100 text-orange-700',
  other:'bg-gray-100 text-gray-600'
};

export default function Dashboard() {
  const { stats, loading } = useDashboard();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mapUnits, setMapUnits] = useState<Unit[]>([]);

  useEffect(() => {
    unitsApi.getAll().then(r => { if (r.success && r.data) setMapUnits(r.data.slice(0, 100)); });
  }, []);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[...Array(4)].map((_,i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
    </div>
  );

  const s = stats;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1d]" style={{fontFamily:'Poppins,sans-serif'}}>Overview Dashboard</h1>
          <p className="text-sm text-[#8b8f95] mt-0.5">Pantau status perangkat medis IMEDIN secara real-time</p>
        </div>
        <button onClick={()=>navigate('/qr-scanner')} className="hidden sm:flex items-center gap-2 px-3 py-2 bg-[#3b82f6] text-white rounded-lg text-sm hover:bg-blue-600 transition-all">
          <Zap size={16}/> Scan Unit
        </button>
      </div>

      {/* SECTION 1: Installed Base Overview */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {label:'Total Unit Terpasang', value:s?.installedBase?.totalUnits??s?.totalUnits??0, icon:Package, color:'bg-blue-50 text-blue-600', link:'/assets'},
            {label:'Total Lokasi Instalasi', value:s?.installedBase?.totalLocations??0, icon:Building2, color:'bg-purple-50 text-purple-600', link:'/assets'},
            {label:'Total Provinsi', value:s?.installedBase?.totalProvinces??0, icon:Map, color:'bg-emerald-50 text-emerald-600', link:'/map'},
            {label:'Total Kabupaten/Kota', value:s?.installedBase?.totalCities??0, icon:MapPin, color:'bg-amber-50 text-amber-600', link:'/map'},
          ].map(card=>(
            <button key={card.label} onClick={()=>navigate(card.link)}
              className="bg-white rounded-xl border border-[#e6e6e8] p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left">
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                <card.icon size={20}/>
              </div>
              <p className="text-2xl font-bold text-[#1d1d1d]">{card.value.toLocaleString()}</p>
              <p className="text-xs text-[#8b8f95] mt-0.5">{card.label}</p>
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 2+3: Operational Status & Warranty */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Operational */}
        <div className="bg-white rounded-xl border border-[#e6e6e8] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity size={15} className="text-[#3b82f6]"/> Status Operasional
          </h2>
          <div className="space-y-3">
            {[
              {label:'Beroperasi Normal', value:s?.operational?.normal??s?.activeUnits??0, icon:CheckCircle2, color:'text-emerald-500', bg:'bg-emerald-50', status:'active'},
              {label:'Perlu Perhatian', value:s?.operational?.needsAttention??0, icon:AlertTriangle, color:'text-amber-500', bg:'bg-amber-50', status:'maintenance'},
              {label:'Dalam Perbaikan', value:s?.operational?.inRepair??0, icon:Wrench, color:'text-red-500', bg:'bg-red-50', status:'repair'},
              {label:'Tidak Aktif', value:s?.operational?.inactive??0, icon:XCircle, color:'text-gray-400', bg:'bg-gray-50', status:'inactive'},
            ].map(item=>{
              const total = (s?.installedBase?.totalUnits||s?.totalUnits||1);
              const pct = total > 0 ? Math.round((item.value/total)*100) : 0;
              return (
                <button key={item.label} onClick={()=>navigate(`/assets?status=${item.status}`)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#f7f7f5] transition-colors">
                  <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                    <item.icon size={16} className={item.color}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#1d1d1d] font-medium">{item.label}</span>
                      <span className="text-[#8b8f95]">{item.value} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#f0f0f0] rounded-full">
                      <div className={`h-full rounded-full ${item.color.replace('text-','bg-')}`} style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Warranty */}
        <div className="bg-white rounded-xl border border-[#e6e6e8] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield size={15} className="text-[#3b82f6]"/> Status Garansi
          </h2>
          <div className="space-y-3">
            {[
              {label:'Garansi Aktif', value:s?.warranty?.active??0, color:'text-emerald-500', bg:'bg-emerald-50', pctColor:'bg-emerald-500'},
              {label:'Garansi Berakhir < 90 Hari', value:s?.warranty?.expiringSoon??s?.warrantyExpiring??0, color:'text-amber-500', bg:'bg-amber-50', pctColor:'bg-amber-500'},
              {label:'Garansi Berakhir', value:s?.warranty?.expired??0, color:'text-red-400', bg:'bg-red-50', pctColor:'bg-red-400'},
            ].map(item=>{
              const total=(s?.installedBase?.totalUnits||s?.totalUnits||1);
              const pct=total>0?Math.round((item.value/total)*100):0;
              return (
                <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-lg">
                  <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                    <Shield size={16} className={item.color}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#1d1d1d] font-medium">{item.label}</span>
                      <span className="text-[#8b8f95]">{item.value} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#f0f0f0] rounded-full">
                      <div className={`h-full rounded-full ${item.pctColor}`} style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {isAuthenticated && s?.warrantyExpiringUnits && s.warrantyExpiringUnits.length > 0 && (
            <button onClick={()=>navigate('/assets?warrantyStatus=expiring_soon')}
              className="mt-3 w-full text-center text-xs text-[#3b82f6] hover:underline">
              Lihat {s.warrantyExpiringUnits.length} unit garansi akan habis →
            </button>
          )}
        </div>
      </section>

      {/* SECTION 4: Action Center */}
      {isAuthenticated && s?.actionCenter && s.actionCenter.length > 0 && (
        <section className="bg-white rounded-xl border border-[#e6e6e8] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e6e6e8]">
            <h2 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider flex items-center gap-2">
              <Zap size={15} className="text-amber-500"/> Action Center
              <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">{s.actionCenter.length}</span>
            </h2>
          </div>
          <div className="divide-y divide-[#f0f0f0]">
            {s.actionCenter.slice(0,6).map(item=>(
              <button key={item.id} onClick={()=>navigate(`/assets/${item.unit.id}`)}
                className="w-full flex items-start gap-3 px-5 py-3 hover:bg-[#f7f7f5] transition-colors text-left">
                <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${item.severity==='critical'?'bg-red-500':item.severity==='warning'?'bg-amber-400':'bg-blue-400'}`}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1d1d1d]">{item.message}</p>
                  <p className="text-xs text-[#8b8f95] mt-0.5">{item.unit.facilityName||item.unit.customerName} — {item.unit.city}</p>
                </div>
                <ChevronRight size={16} className="text-[#8b8f95] flex-shrink-0 mt-0.5"/>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 5: Interactive Map */}
      <section className="bg-white rounded-xl border border-[#e6e6e8] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e6e6e8]">
          <h2 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider flex items-center gap-2">
            <Map size={15} className="text-[#3b82f6]"/> Persebaran Unit
          </h2>
          <button onClick={()=>navigate('/map')} className="text-xs text-[#3b82f6] hover:underline flex items-center gap-1">
            Lihat Peta Penuh <ChevronRight size={13}/>
          </button>
        </div>
        <div style={{height:320}}>
          <MapContainer center={[-2.5, 118]} zoom={5} style={{height:'100%',width:'100%'}}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap"/>
            {mapUnits.filter(u=>u.latitude&&u.longitude).map(u=>(
              <CircleMarker key={u.id} center={[u.latitude, u.longitude]} radius={6}
                pathOptions={{color: u.status==='active'?'#10b981':u.status==='repair'?'#ef4444':'#f59e0b', fillOpacity:0.8}}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold">{u.productName}</p>
                    <p>{u.facilityName||u.customerName}</p>
                    <p>{u.city}, {u.province}</p>
                    <button onClick={()=>navigate(`/assets/${u.id}`)} className="text-blue-600 hover:underline mt-1">Lihat Detail →</button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </section>

      {/* SECTION 6: Analytics */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Populasi per Produk */}
        <div className="bg-white rounded-xl border border-[#e6e6e8] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 size={15} className="text-[#3b82f6]"/> Populasi per Produk
          </h2>
          <div className="space-y-2.5">
            {Object.entries(s?.byProduct??s?.byCategory??{}).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,count])=>{
              const total = s?.totalUnits||1;
              const pct = Math.round((count/total)*100);
              return (
                <button key={name} onClick={()=>navigate(`/assets?product=${encodeURIComponent(name)}`)}
                  className="w-full flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <span className="text-xs text-[#8b8f95] w-28 truncate text-left">{name}</span>
                  <div className="flex-1 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div className="h-full bg-[#3b82f6] rounded-full" style={{width:`${pct}%`}}/>
                  </div>
                  <span className="text-xs font-medium text-[#1d1d1d] w-8 text-right">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Populasi per Provinsi */}
        <div className="bg-white rounded-xl border border-[#e6e6e8] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider mb-4 flex items-center gap-2">
            <MapPin size={15} className="text-[#3b82f6]"/> Populasi per Provinsi
          </h2>
          <div className="space-y-2.5">
            {Object.entries(s?.byProvince??{}).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([prov,count])=>{
              const total=s?.totalUnits||1;
              const pct=Math.round((count/total)*100);
              return (
                <button key={prov} onClick={()=>navigate(`/assets?province=${encodeURIComponent(prov)}`)}
                  className="w-full flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <span className="text-xs text-[#8b8f95] w-28 truncate text-left">{prov}</span>
                  <div className="flex-1 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width:`${pct}%`}}/>
                  </div>
                  <span className="text-xs font-medium text-[#1d1d1d] w-8 text-right">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tren Instalasi */}
        <div className="bg-white rounded-xl border border-[#e6e6e8] p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-[#3b82f6]"/> Tren Instalasi (12 Bulan Terakhir)
          </h2>
          {s?.installationTrend && s.installationTrend.length > 0 ? (
            <div className="flex items-end gap-1.5 h-28">
              {s.installationTrend.map(({month,count})=>{
                const max=Math.max(...s.installationTrend.map(t=>t.count),1);
                const pct=Math.round((count/max)*100);
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-[#8b8f95]">{count||''}</span>
                    <div className="w-full bg-[#3b82f6] rounded-t" style={{height:`${Math.max(pct,2)}%`, minHeight:count>0?4:1}}/>
                    <span className="text-[9px] text-[#8b8f95] rotate-45 origin-left">{month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-[#8b8f95]">Belum ada data instalasi</p>}
        </div>
      </section>

      {/* SECTION 7: Recent Activities */}
      {isAuthenticated && (
        <section className="bg-white rounded-xl border border-[#e6e6e8] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e6e6e8]">
            <h2 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider flex items-center gap-2">
              <Clock size={15} className="text-[#3b82f6]"/> Aktivitas Terbaru
            </h2>
            <button onClick={()=>navigate('/activities')} className="text-xs text-[#3b82f6] hover:underline flex items-center gap-1">
              Lihat Semua <ChevronRight size={13}/>
            </button>
          </div>
          {s?.recentActivities && s.recentActivities.length > 0 ? (
            <div className="divide-y divide-[#f0f0f0]">
              {s.recentActivities.slice(0,6).map(act=>(
                <button key={act.id} onClick={()=>navigate(`/assets/${act.unitId}`)}
                  className="w-full flex items-start gap-3 px-5 py-3 hover:bg-[#f7f7f5] transition-colors text-left">
                  <span className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${actColors[act.type]}`}>
                    {actLabels[act.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1d1d1d] truncate">{act.description}</p>
                    <p className="text-xs text-[#8b8f95] mt-0.5">{act.technicianName} · {act.date}</p>
                  </div>
                  <p className="text-xs text-[#8b8f95] flex-shrink-0">{act.serialNumber}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-[#8b8f95]">Belum ada aktivitas tercatat</div>
          )}
        </section>
      )}

      {/* SECTION 8: Executive Insight */}
      <section className="bg-gradient-to-r from-[#1e2022] to-[#2c2f33] rounded-xl p-5 text-white">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/20 flex items-center justify-center flex-shrink-0">
            <FileText size={20} className="text-[#3b82f6]"/>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-2">Executive Insight</h2>
            <p className="text-sm text-white/90 leading-relaxed">
              Saat ini terdapat <span className="text-[#3b82f6] font-semibold">{(s?.installedBase?.totalUnits??s?.totalUnits??0).toLocaleString()} unit IMEDIN</span> yang
              tersebar di <span className="font-semibold">{s?.installedBase?.totalLocations??0} fasilitas kesehatan</span> pada
              <span className="font-semibold"> {s?.installedBase?.totalProvinces??0} provinsi</span>.{' '}
              <span className="text-emerald-400 font-semibold">{s?.operational?.normal??0} unit ({s?.totalUnits?Math.round(((s?.operational?.normal??0)/s.totalUnits)*100):0}%)</span> beroperasi normal.{' '}
              {(s?.operational?.inRepair??0) > 0 && <span><span className="text-red-400 font-semibold">{s?.operational?.inRepair} unit</span> sedang dalam perbaikan. </span>}
              {(s?.warranty?.expiringSoon??s?.warrantyExpiring??0) > 0 && <span><span className="text-amber-400 font-semibold">{s?.warranty?.expiringSoon??s?.warrantyExpiring} unit</span> akan habis masa garansi dalam 90 hari.</span>}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
