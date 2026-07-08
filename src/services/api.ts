// ============================================================
// IMEDIN After Sales Monitoring System - API Service v2
// ============================================================

const GAS_BASE_URL = 'https://script.google.com/macros/s/AKfycbwe76mqVAfXAdzYR0kPxH17Fq1Mrimd_WwjhYH06vZMwT_Ui2EVxNTsEtMcrXFLPBvz/exec';
const USE_MOCK = false;

import type {
  Unit, Activity, User, LoginCredentials,
  DashboardStats, ApiResponse, AlertItem, UserRole, GlobalFilter
} from '@/types';

// ============================================================
// Mock Data
// ============================================================
const PROVINCES = ['DKI Jakarta','Jawa Barat','Jawa Timur','Jawa Tengah','Sumatera Utara','Sulawesi Selatan','Bali','Kalimantan Timur'];
const CITIES    = ['Jakarta','Bandung','Surabaya','Semarang','Medan','Makassar','Denpasar','Samarinda'];
const PRODUCTS  = ['Hemodialysis Machine HD-500','Blood Analyzer BA-200','X-Ray System XR-3000','Ventilator V-800','Patient Monitor PM-700','Infusion Pump IP-100','Defibrillator DF-400','Ultrasound Machine US-600'];
const FACILITIES= ['RSUD','RS Swasta','Klinik','Puskesmas'];
const CATS: Unit['category'][] = ['dialysis','laboratory','imaging','ventilator','monitor','other'];
const STATUSES: Unit['status'][] = ['active','active','active','maintenance','repair','inactive'];
const TECHNICIANS = ['Ahmad Santoso','Budi Wijaya','Citra Dewi','Dedi Kurniawan','Eka Putri'];
const ACT_TYPES: Activity['type'][] = ['installation','preventive_maintenance','repair','firmware_upgrade','spare_part','relocation','other'];

const generateMockUnits = (): Unit[] => {
  const units: Unit[] = [];
  for (let i = 1; i <= 60; i++) {
    const pi = i % PROVINCES.length;
    const install = new Date(2022 + (i % 3), i % 12, 1 + (i % 28));
    const warrantyEnd = new Date(install); warrantyEnd.setMonth(warrantyEnd.getMonth() + 12 + (i % 24));
    const nextMaint = new Date(); nextMaint.setDate(nextMaint.getDate() + (i % 90) - 30);
    const lastSvc = new Date(nextMaint); lastSvc.setMonth(lastSvc.getMonth() - 3);
    units.push({
      id: `UNIT-${String(i).padStart(4,'0')}`,
      serialNumber: `IMD-${String(20230000+i)}`,
      productName: PRODUCTS[i % PRODUCTS.length],
      brand: 'IMEDIN', category: CATS[i % CATS.length],
      model: `MDL-${1000+i}`, manufacturer: 'IMEDIN Medical', batch: `B${2023+i%3}`,
      facilityName: `${FACILITIES[i%4]} ${CITIES[pi]} ${i}`,
      room: `Ruang ${i%5+1}`, pic: `Dr. PIC ${i}`, picContact: `0812${i}`,
      province: PROVINCES[pi], city: CITIES[pi],
      district: `Kecamatan ${i%5+1}`, village: `Kelurahan ${i%8+1}`,
      postalCode: `${10000+i}`, address: `Jl. Kesehatan No.${i}, ${CITIES[pi]}`,
      latitude: -6.2+(Math.random()-0.5)*10, longitude: 106.8+(Math.random()-0.5)*15,
      googleMapsUrl: `https://maps.google.com/?q=-6.2,106.8`,
      customerName: `${FACILITIES[i%4]} ${CITIES[pi]}`, customerPhone: `0812${i}`,
      distributorName: `Distributor ${i%3+1}`,
      installationDate: install.toISOString().split('T')[0],
      warrantyEndDate: warrantyEnd.toISOString().split('T')[0],
      nextMaintenanceDate: nextMaint.toISOString().split('T')[0],
      lastServiceDate: lastSvc.toISOString().split('T')[0],
      status: STATUSES[i%6], warrantyStatus: warrantyEnd > new Date() ? 'active' : 'expired',
      photoUrl: '', photoUrls: [] as string[], qrCodeUrl: '', documentUrls: [] as string[],
      notes: `Unit ${i}`, createdAt: install.toISOString(), updatedAt: new Date().toISOString()
    });
  }
  return units;
};

const generateMockActivities = (units: Unit[]): Activity[] => {
  const acts: Activity[] = [];
  units.forEach((u, ui) => {
    const n = 1 + (ui % 4);
    for (let s = 0; s < n; s++) {
      const d = new Date(u.installationDate); d.setMonth(d.getMonth() + s*3);
      acts.push({
        id: `ACT-${String(acts.length+1).padStart(5,'0')}`,
        unitId: u.id, serialNumber: u.serialNumber,
        type: ACT_TYPES[s%ACT_TYPES.length], date: d.toISOString().split('T')[0],
        technicianName: TECHNICIANS[s%TECHNICIANS.length],
        description: `${ACT_TYPES[s%ACT_TYPES.length]} untuk ${u.productName}`,
        partsReplaced: s%3===0?'Filter, Sensor':'',
        cost: 500000+(s*250000), nextSchedule: '', notes: 'Selesai', createdAt: d.toISOString()
      });
    }
  });
  return acts;
};

const initMock = () => {
  if (!localStorage.getItem('imedin_units')) {
    const u = generateMockUnits();
    localStorage.setItem('imedin_units', JSON.stringify(u));
    localStorage.setItem('imedin_activities', JSON.stringify(generateMockActivities(u)));
  }
  if (!localStorage.getItem('imedin_users')) {
    localStorage.setItem('imedin_users', JSON.stringify([
      { id:'1', email:'admin@imedin.co.id',   name:'Admin IMEDIN',   role:'admin',   pin:'123456' },
      { id:'2', email:'teknisi@imedin.co.id', name:'Teknisi IMEDIN', role:'teknisi', pin:'123456' },
      { id:'3', email:'viewer@imedin.co.id',  name:'Viewer IMEDIN',  role:'viewer',  pin:'123456' },
    ]));
  }
};
if (USE_MOCK) initMock();

const getMockUnits = (): Unit[] => JSON.parse(localStorage.getItem('imedin_units') || '[]');
const getMockActivities = (): Activity[] => JSON.parse(localStorage.getItem('imedin_activities') || '[]');
const getMockUsers = (): User[] => JSON.parse(localStorage.getItem('imedin_users') || '[]');
const saveMockUnits = (u: Unit[]) => localStorage.setItem('imedin_units', JSON.stringify(u));
const saveMockActivities = (a: Activity[]) => localStorage.setItem('imedin_activities', JSON.stringify(a));

// ============================================================
// Field mapper GAS PascalCase → camelCase
// ============================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapUnit = (r: any): Unit => ({
  id: r.ID||r.id||'', serialNumber: r.SerialNumber||r.serialNumber||'',
  productName: r.ProductName||r.productName||'', brand: r.Brand||r.brand||'IMEDIN',
  category: (r.Category||r.category||'other') as Unit['category'],
  model: r.Model||r.model||'', manufacturer: r.Manufacturer||r.manufacturer||'',
  batch: r.Batch||r.batch||'',
  facilityName: r.FacilityName||r.facilityName||r.CustomerName||r.customerName||'',
  room: r.Room||r.room||'', pic: r.PIC||r.pic||'', picContact: r.PICContact||r.picContact||'',
  province: r.Province||r.province||'', city: r.City||r.city||'',
  district: r.District||r.district||'', village: r.Village||r.village||'',
  postalCode: r.PostalCode||r.postalCode||'',
  address: r.Address||r.address||'',
  latitude: parseFloat(r.Latitude??r.latitude??0), longitude: parseFloat(r.Longitude??r.longitude??0),
  googleMapsUrl: r.GoogleMapsUrl||r.googleMapsUrl||'',
  customerName: r.CustomerName||r.customerName||'',
  customerPhone: r.CustomerPhone||r.customerPhone||'',
  distributorName: r.DistributorName||r.distributorName||'',
  installationDate: String(r.InstallationDate||r.installationDate||'').split('T')[0],
  warrantyEndDate:  String(r.WarrantyEndDate||r.warrantyEndDate||'').split('T')[0],
  nextMaintenanceDate: String(r.NextMaintenanceDate||r.nextMaintenanceDate||'').split('T')[0],
  lastServiceDate: String(r.LastServiceDate||r.lastServiceDate||'').split('T')[0],
  status: (r.Status||r.status||'active') as Unit['status'],
  warrantyStatus: (() => {
    const w = new Date(r.WarrantyEndDate||r.warrantyEndDate||'');
    const now = new Date(); const d90 = new Date(); d90.setDate(now.getDate()+90);
    if (!r.WarrantyEndDate && !r.warrantyEndDate) return undefined;
    if (w < now) return 'expired';
    if (w < d90) return 'expiring_soon';
    return 'active';
  })(),
  photoUrl: r.PhotoUrl||r.photoUrl||'',
  photoUrls: (r.PhotoUrls||r.photoUrls||'') as unknown as string[],
  qrCodeUrl: r.QRCodeUrl||r.qrCodeUrl||'',
  documentUrls: (r.DocumentUrls||r.documentUrls||'') as unknown as string[],
  notes: r.Notes||r.notes||'', createdAt: r.CreatedAt||r.createdAt||'', updatedAt: r.UpdatedAt||r.updatedAt||''
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapActivity = (r: any): Activity => ({
  id: r.ID||r.id||'', unitId: r.UnitID||r.unitId||'', serialNumber: r.SerialNumber||r.serialNumber||'',
  type: (r.Type||r.type||'other') as Activity['type'],
  date: String(r.Date||r.date||'').split('T')[0],
  technicianName: r.TechnicianName||r.technicianName||'',
  description: r.Description||r.description||'',
  partsReplaced: r.PartsReplaced||r.partsReplaced||'',
  cost: parseFloat(r.Cost??r.cost??0),
  nextSchedule: String(r.NextSchedule||r.nextSchedule||'').split('T')[0],
  notes: r.Notes||r.notes||'', createdAt: r.CreatedAt||r.createdAt||''
});

// ============================================================
// Auth API
// ============================================================
export const authApi = {
  login: async (creds: LoginCredentials): Promise<ApiResponse<Omit<User,'pin'>>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,400));
      const u = getMockUsers().find(u=>u.email===creds.email && u.pin===creds.pin);
      if (u) {
        const {pin:_,...rest} = u; void _;
        const tok = btoa(JSON.stringify({...rest, exp:Date.now()+86400000}));
        localStorage.setItem('imedin_token', tok);
        localStorage.setItem('imedin_user', JSON.stringify(rest));
        return { success:true, data:rest, message:'Login berhasil' };
      }
      return { success:false, message:'Email atau PIN salah' };
    }
    const p = new URLSearchParams({ action:'login', email:creds.email, pin:creds.pin });
    const res = await fetch(`${GAS_BASE_URL}?${p}`);
    const result = await res.json();
    if (result.success && result.data) {
      const tok = btoa(JSON.stringify({...result.data, exp:Date.now()+86400000}));
      localStorage.setItem('imedin_token', tok);
      localStorage.setItem('imedin_user', JSON.stringify(result.data));
    }
    return result;
  },
  logout: () => { localStorage.removeItem('imedin_token'); localStorage.removeItem('imedin_user'); },
  getCurrentUser: (): Omit<User,'pin'>|null => { const s=localStorage.getItem('imedin_user'); return s?JSON.parse(s):null; },
  isAuthenticated: () => !!localStorage.getItem('imedin_token'),
  hasRole: (role: UserRole|UserRole[]): boolean => {
    const u = authApi.getCurrentUser(); if (!u) return false;
    return Array.isArray(role) ? role.includes(u.role as UserRole) : u.role===role;
  },
  checkEmail: async (email: string): Promise<ApiResponse<{name:string}>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,300));
      const u = getMockUsers().find(u=>u.email===email);
      return u ? {success:true, data:{name:u.name}} : {success:false, message:'Email tidak terdaftar'};
    }
    const res = await fetch(`${GAS_BASE_URL}?action=checkEmail&email=${encodeURIComponent(email)}`);
    return res.json();
  },
  resetPin: async (email: string, newPin: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,400));
      const users = getMockUsers(); const idx = users.findIndex(u=>u.email===email);
      if (idx===-1) return {success:false, message:'Email tidak ditemukan'};
      users[idx].pin = newPin; localStorage.setItem('imedin_users', JSON.stringify(users));
      return {success:true, message:'PIN berhasil direset'};
    }
    // Gunakan GET dengan params untuk hindari CORS preflight
    const p = new URLSearchParams({ action:'resetPin', email, newPin });
    const res = await fetch(`${GAS_BASE_URL}?${p}`);
    return res.json();
  }
};

// ============================================================
// Units API
// ============================================================
export const unitsApi = {
  getAll: async (f?: GlobalFilter): Promise<ApiResponse<Unit[]>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,300));
      let u = getMockUnits();
      if (f?.search) { const s=f.search.toLowerCase(); u=u.filter(x=>x.serialNumber.toLowerCase().includes(s)||x.productName.toLowerCase().includes(s)||x.facilityName.toLowerCase().includes(s)||x.city.toLowerCase().includes(s)); }
      if (f?.province) u=u.filter(x=>x.province===f.province);
      if (f?.city) u=u.filter(x=>x.city===f.city);
      if (f?.status) u=u.filter(x=>x.status===f.status);
      if (f?.product) u=u.filter(x=>x.productName===f.product);
      return { success:true, data:u };
    }
    const p = new URLSearchParams({ action:'getUnits', ...Object.fromEntries(Object.entries(f||{}).filter(([,v])=>v)) });
    const res = await fetch(`${GAS_BASE_URL}?${p}`);
    const result = await res.json();
    return result.success ? {...result, data: result.data.map(mapUnit)} : result;
  },
  getById: async (id: string): Promise<ApiResponse<Unit>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,200));
      const u = getMockUnits().find(x=>x.id===id);
      return u ? {success:true,data:u} : {success:false,message:'Unit tidak ditemukan'};
    }
    const res = await fetch(`${GAS_BASE_URL}?action=getUnit&id=${id}`);
    const result = await res.json();
    return result.success ? {...result, data:mapUnit(result.data)} : result;
  },
  getBySerial: async (serial: string): Promise<ApiResponse<Unit>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,200));
      const u = getMockUnits().find(x=>x.serialNumber.toLowerCase()===serial.toLowerCase());
      return u ? {success:true,data:u} : {success:false,message:'Unit tidak ditemukan'};
    }
    const res = await fetch(`${GAS_BASE_URL}?action=getUnitBySerial&serial=${encodeURIComponent(serial)}`);
    const result = await res.json();
    return result.success ? {...result, data:mapUnit(result.data)} : result;
  },
  create: async (data: Omit<Unit,'id'|'createdAt'|'updatedAt'>): Promise<ApiResponse<Unit>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,500));
      const units = getMockUnits();
      const newUnit: Unit = {...data, id:`UNIT-${String(units.length+1).padStart(4,'0')}`, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()};
      units.push(newUnit); saveMockUnits(units);
      return {success:true, data:newUnit, message:'Unit berhasil ditambahkan'};
    }
    const p = new URLSearchParams({ action:'createUnit', ...Object.fromEntries(Object.entries(data).map(([k,v])=>[k, String(v??'')])) });
    const res = await fetch(`${GAS_BASE_URL}?${p}`);
    return res.json();
  },
  update: async (id: string, data: Partial<Unit>): Promise<ApiResponse<Unit>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,400));
      const units = getMockUnits(); const idx = units.findIndex(u=>u.id===id);
      if (idx===-1) return {success:false,message:'Unit tidak ditemukan'};
      units[idx] = {...units[idx], ...data, updatedAt:new Date().toISOString()};
      saveMockUnits(units);
      return {success:true, data:units[idx], message:'Unit berhasil diperbarui'};
    }
    const p = new URLSearchParams({ action:'updateUnit', id, ...Object.fromEntries(Object.entries(data).map(([k,v])=>[k, String(v??'')])) });
    const res = await fetch(`${GAS_BASE_URL}?${p}`);
    return res.json();
  },
  delete: async (id: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,300));
      saveMockUnits(getMockUnits().filter(u=>u.id!==id));
      return {success:true, message:'Unit berhasil dihapus'};
    }
    const res = await fetch(`${GAS_BASE_URL}?action=deleteUnit&id=${id}`);
    return res.json();
  }
};

// ============================================================
// Activities API
// ============================================================
export const activitiesApi = {
  getAll: async (unitId?: string, serial?: string): Promise<ApiResponse<Activity[]>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,300));
      let a = getMockActivities();
      if (unitId) a = a.filter(x=>x.unitId===unitId);
      if (serial)  a = a.filter(x=>x.serialNumber.toLowerCase()===serial.toLowerCase());
      return {success:true, data:a.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime())};
    }
    const p = new URLSearchParams({action:'getActivities'});
    if (unitId) p.set('unitId', unitId);
    if (serial)  p.set('serial', serial);
    const res = await fetch(`${GAS_BASE_URL}?${p}`);
    const result = await res.json();
    return result.success ? {...result, data:result.data.map(mapActivity)} : result;
  },
  create: async (data: Omit<Activity,'id'|'createdAt'>): Promise<ApiResponse<Activity>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,400));
      const acts = getMockActivities();
      const newAct: Activity = {...data, id:`ACT-${String(acts.length+1).padStart(5,'0')}`, createdAt:new Date().toISOString()};
      acts.push(newAct); saveMockActivities(acts);
      const units = getMockUnits(); const idx = units.findIndex(u=>u.id===data.unitId);
      if (idx!==-1) { units[idx].lastServiceDate=data.date; if(data.nextSchedule) units[idx].nextMaintenanceDate=data.nextSchedule; saveMockUnits(units); }
      return {success:true, data:newAct, message:'Aktivitas berhasil ditambahkan'};
    }
    // Kirim sebagai GET params untuk hindari CORS preflight
    const p = new URLSearchParams({
      action: 'createActivity',
      unitId: data.unitId,
      serialNumber: data.serialNumber,
      type: data.type,
      date: data.date,
      technicianName: data.technicianName,
      description: data.description,
      partsReplaced: data.partsReplaced || '',
      cost: String(data.cost || 0),
      nextSchedule: data.nextSchedule || '',
      notes: data.notes || ''
    });
    const res = await fetch(`${GAS_BASE_URL}?${p}`);
    return res.json();
  }
};

// ============================================================
// Users API
// ============================================================
export const usersApi = {
  getAll: async (): Promise<ApiResponse<Omit<User,'pin'>[]>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,300));
      return {success:true, data:getMockUsers().map(({pin:_,...rest})=>(void _, rest))};
    }
    const res = await fetch(`${GAS_BASE_URL}?action=getUsers`);
    return res.json();
  },
  create: async (data:{email:string;name:string;role:UserRole;pin:string}): Promise<ApiResponse<User>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,400));
      const users = getMockUsers();
      const newUser: User = {...data, id:`USR-${String(users.length+1).padStart(3,'0')}`, createdAt:new Date().toISOString()};
      users.push(newUser); localStorage.setItem('imedin_users', JSON.stringify(users));
      return {success:true, data:newUser, message:'User berhasil dibuat'};
    }
    const res = await fetch(`${GAS_BASE_URL}?action=createUser`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    return res.json();
  },
  update: async (id:string, data:{name?:string;role?:UserRole;pin?:string}): Promise<ApiResponse<void>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,300));
      const users = getMockUsers(); const idx=users.findIndex(u=>u.id===id);
      if (idx===-1) return {success:false,message:'User tidak ditemukan'};
      users[idx]={...users[idx],...data}; localStorage.setItem('imedin_users',JSON.stringify(users));
      return {success:true,message:'User berhasil diperbarui'};
    }
    const res = await fetch(`${GAS_BASE_URL}?action=updateUser&id=${id}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    return res.json();
  },
  delete: async (id:string): Promise<ApiResponse<void>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,300));
      localStorage.setItem('imedin_users', JSON.stringify(getMockUsers().filter(u=>u.id!==id)));
      return {success:true,message:'User berhasil dihapus'};
    }
    const res = await fetch(`${GAS_BASE_URL}?action=deleteUser&id=${id}`);
    return res.json();
  }
};

// ============================================================
// Dashboard API
// ============================================================
export const dashboardApi = {
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,500));
      const units = getMockUnits();
      const activities = getMockActivities();
      const now = new Date(); const d30=new Date(); d30.setDate(now.getDate()+30);
      const d90=new Date(); d90.setDate(now.getDate()+90);
      const byProvince:Record<string,number>={}, byCategory:Record<string,number>={}, byStatus:Record<string,number>={}, byProduct:Record<string,number>={};
      units.forEach(u=>{
        byProvince[u.province]=(byProvince[u.province]||0)+1;
        byCategory[u.category]=(byCategory[u.category]||0)+1;
        byStatus[u.status]=(byStatus[u.status]||0)+1;
        byProduct[u.productName]=(byProduct[u.productName]||0)+1;
      });
      const trend:Record<string,number>={};
      for(let i=11;i>=0;i--){const d=new Date();d.setMonth(d.getMonth()-i);const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');trend[k]=0;}
      units.forEach(u=>{if(u.installationDate){const k=u.installationDate.substring(0,7);if(trend[k]!==undefined)trend[k]++;}});
      const wSoon=units.filter(u=>{const d=new Date(u.warrantyEndDate);return d>=now&&d<d90;});
      const normal=units.filter(u=>u.status==='active').length;
      const facilities=new Set(units.map(u=>u.facilityName).filter(Boolean));
      const provinces=new Set(units.map(u=>u.province).filter(Boolean));
      const cities=new Set(units.map(u=>u.city).filter(Boolean));
      return {
        success:true, data:{
          totalUnits:units.length, activeUnits:normal, maintenanceOverdue:units.filter(u=>u.status==='maintenance').length, warrantyExpiring:wSoon.length,
          installedBase:{totalUnits:units.length,totalLocations:facilities.size,totalProvinces:provinces.size,totalCities:cities.size},
          operational:{normal,needsAttention:units.filter(u=>u.status==='maintenance').length,inRepair:units.filter(u=>u.status==='repair').length,inactive:units.filter(u=>u.status==='inactive').length},
          warranty:{active:units.filter(u=>new Date(u.warrantyEndDate)>=d90).length,expiringSoon:wSoon.length,expired:units.filter(u=>u.warrantyEndDate&&new Date(u.warrantyEndDate)<now).length},
          byProvince,byCategory,byStatus,byProduct,
          installationTrend:Object.entries(trend).map(([month,count])=>({month,count})),
          recentServices:[],recentActivities:activities.slice(0,10),
          upcomingMaintenance:units.filter(u=>{const d=new Date(u.nextMaintenanceDate);return d>=now&&d<=d30;}).slice(0,10),
          warrantyExpiringUnits:wSoon.slice(0,10),
          actionCenter:units.slice(0,5).map(u=>({id:'ac-'+u.id,type:'warranty_expiring' as const,unit:u,message:'Garansi segera habis: '+u.productName,severity:'warning' as const}))
        }
      };
    }
    const res = await fetch(`${GAS_BASE_URL}?action=getDashboardStats`);
    const result = await res.json();
    if (result.success && result.data) {
      const d = result.data;
      return {...result, data:{...d,
        upcomingMaintenance:(d.upcomingMaintenance||[]).map(mapUnit),
        warrantyExpiringUnits:(d.warrantyExpiringUnits||[]).map(mapUnit),
        recentActivities:(d.recentActivities||[]).map(mapActivity),
        actionCenter:(d.actionCenter||[]).map((a: {unit: unknown}) => ({...a, unit:mapUnit(a.unit)}))
      }};
    }
    return result;
  },
  getAlerts: async (): Promise<ApiResponse<AlertItem[]>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,300));
      const units=getMockUnits(); const now=new Date(); const d30=new Date(); d30.setDate(now.getDate()+30);
      const alerts:AlertItem[]=[];
      units.forEach(u=>{
        const m=new Date(u.nextMaintenanceDate); const w=new Date(u.warrantyEndDate);
        if(m<now) alerts.push({id:'a-m-'+u.id,type:'maintenance',unit:u,message:'PM overdue: '+u.productName,dueDate:u.nextMaintenanceDate,severity:'critical'});
        else if(m<=d30) alerts.push({id:'a-m-'+u.id,type:'maintenance',unit:u,message:'PM mendatang: '+u.productName,dueDate:u.nextMaintenanceDate,severity:'warning'});
        if(w>=now&&w<=d30) alerts.push({id:'a-w-'+u.id,type:'warranty',unit:u,message:'Garansi habis: '+u.productName,dueDate:u.warrantyEndDate,severity:'warning'});
      });
      return {success:true,data:alerts.sort((a,b)=>a.severity==='critical'&&b.severity!=='critical'?-1:1)};
    }
    const res=await fetch(`${GAS_BASE_URL}?action=getAlerts`);
    const result=await res.json();
    if(result.success&&result.data) return {...result,data:result.data.map((a:{unit:unknown})=>({...a,unit:mapUnit(a.unit)}))};
    return result;
  }
};

// ============================================================
// Import/Export API
// ============================================================
export const importExportApi = {
  importUnits: async (data:Record<string,string>[]): Promise<ApiResponse<{imported:number;errors:string[]}>> => {
    if (USE_MOCK) {
      await new Promise(r=>setTimeout(r,800));
      const units=getMockUnits(); let imported=0; const errors:string[]=[];
      data.forEach((row,idx)=>{
        try {
          units.push({id:`UNIT-${String(units.length+1).padStart(4,'0')}`,serialNumber:row.serialNumber||`AUTO-${idx}`,productName:row.productName||'Unknown',brand:row.brand||'IMEDIN',category:(row.category||'other') as Unit['category'],model:row.model||'',manufacturer:row.manufacturer||'IMEDIN Medical',batch:'',facilityName:row.facilityName||row.customerName||'',room:'',pic:'',picContact:'',province:row.province||'',city:row.city||'',district:'',village:'',postalCode:'',address:row.address||'',latitude:parseFloat(row.latitude||'0'),longitude:parseFloat(row.longitude||'0'),googleMapsUrl:'',customerName:row.customerName||'',customerPhone:row.customerPhone||'',distributorName:'',installationDate:row.installationDate||new Date().toISOString().split('T')[0],warrantyEndDate:row.warrantyEndDate||'',nextMaintenanceDate:row.nextMaintenanceDate||'',lastServiceDate:'',status:(row.status||'active') as Unit['status'],notes:row.notes||'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
          imported++;
        } catch(e){errors.push('Row '+(idx+1)+': '+e);}
      });
      saveMockUnits(units);
      return {success:true,data:{imported,errors},message:imported+' unit diimpor'};
    }
    const res=await fetch(`${GAS_BASE_URL}?action=importUnits`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    return res.json();
  },
  exportUnits: async (format:'xlsx'|'csv', filters?:Record<string,string>): Promise<Blob> => {
    // Ambil data real kalau tidak mock
    let units: Unit[] = [];
    if (USE_MOCK) {
      units = getMockUnits();
    } else {
      const result = await unitsApi.getAll(filters as import('@/types').GlobalFilter);
      units = result.success && result.data ? result.data : [];
    }
    if (filters?.province) units = units.filter(u => u.province === filters.province);
    if (filters?.status)   units = units.filter(u => u.status   === filters.status);

    if (format === 'csv') {
      const headers = ['ID','Serial Number','Product','Brand','Category','Model','Facility','Province','City','Status','Installation Date','Warranty End','Notes'];
      const rows = units.map(u => [u.id,u.serialNumber,u.productName,u.brand,u.category,u.model,u.facilityName,u.province,u.city,u.status,u.installationDate,u.warrantyEndDate,u.notes]);
      const csv = [headers,...rows].map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n');
      return new Blob([csv], {type:'text/csv;charset=utf-8;'});
    }
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(units);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Units');
    const buf = XLSX.write(wb, {bookType:'xlsx', type:'array'});
    return new Blob([buf], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
};

export { GAS_BASE_URL, USE_MOCK };

// Legacy aliases untuk backward compatibility
export const servicesApi = {
  getAll: activitiesApi.getAll,
  getBySerialNumber: (serial: string) => activitiesApi.getAll(undefined, serial),
  create: activitiesApi.create,
};
