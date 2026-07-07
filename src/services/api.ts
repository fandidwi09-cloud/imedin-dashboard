// ============================================================
// IMEDIN - API Service (Google Apps Script Backend)
// ============================================================
// Ganti URL ini dengan URL Web App Google Apps Script Anda setelah deploy

const GAS_BASE_URL = 'https://script.google.com/macros/s/AKfycbxgvXQMaMWd8tgyb9tHdJIl5lqISgZpFvVTVTRTTuoehShMiz3yfm2kViCuVW7cZLJp/exec';

// Untuk development/demo, gunakan localStorage sebagai mock database
const USE_MOCK = false;

import type { Unit, ServiceRecord, User, LoginCredentials, DashboardStats, ApiResponse, AlertItem, UserRole } from '@/types';

// ============================================================
// Mock Data Generator (for demo purposes)
// ============================================================
const generateMockUnits = (): Unit[] => {
  const provinces = ['DKI Jakarta', 'Jawa Barat', 'Jawa Timur', 'Jawa Tengah', 'Sumatera Utara', 'Sulawesi Selatan', 'Bali', 'Kalimantan Timur'];
  const cities = ['Jakarta', 'Bandung', 'Surabaya', 'Semarang', 'Medan', 'Makassar', 'Denpasar', 'Samarinda'];
  const categories: Unit['category'][] = ['dialysis', 'laboratory', 'imaging', 'ventilator', 'monitor', 'other'];
  const products = [
    'Hemodialysis Machine HD-500',
    'Blood Analyzer BA-200',
    'X-Ray System XR-3000',
    'Ventilator V-800',
    'Patient Monitor PM-700',
    'Infusion Pump IP-100',
    'Defibrillator DF-400',
    'Ultrasound Machine US-600'
  ];

  const units: Unit[] = [];
  for (let i = 1; i <= 50; i++) {
    const provinceIndex = i % provinces.length;
    const installDate = new Date(2022 + (i % 3), (i % 12), 1 + (i % 28));
    const warrantyMonths = 12 + (i % 24);
    const warrantyEnd = new Date(installDate);
    warrantyEnd.setMonth(warrantyEnd.getMonth() + warrantyMonths);
    
    const nextMaint = new Date();
    nextMaint.setDate(nextMaint.getDate() + (i % 90) - 30);
    
    const lastService = new Date(nextMaint);
    lastService.setMonth(lastService.getMonth() - 3);

    let status: Unit['status'] = 'active';
    if (nextMaint < new Date() && i % 7 === 0) status = 'overdue';
    else if (nextMaint < new Date() && i % 5 === 0) status = 'maintenance';
    else if (i % 13 === 0) status = 'inactive';

    units.push({
      id: `UNIT-${String(i).padStart(4, '0')}`,
      serialNumber: `IMD-${String(20230000 + i)}`,
      productName: products[i % products.length],
      category: categories[i % categories.length],
      model: `MDL-${1000 + i}`,
      manufacturer: ['IMEDIN Medical', 'Global HealthTech', 'MedEquip Pro'][i % 3],
      customerName: [`RS ${cities[provinceIndex]}`, `Klinik Medika ${i}`, `Lab Sehat ${i}`, `Puskesmas ${cities[provinceIndex]}`][i % 4],
      customerPhone: `08${Math.floor(Math.random() * 10000000000)}`,
      province: provinces[provinceIndex],
      city: cities[provinceIndex],
      address: `Jl. Kesehatan No. ${i}, ${cities[provinceIndex]}`,
      latitude: -6.2 + (Math.random() - 0.5) * 10,
      longitude: 106.8 + (Math.random() - 0.5) * 15,
      installationDate: installDate.toISOString().split('T')[0],
      warrantyEndDate: warrantyEnd.toISOString().split('T')[0],
      nextMaintenanceDate: nextMaint.toISOString().split('T')[0],
      lastServiceDate: lastService.toISOString().split('T')[0],
      status,
      notes: `Unit terpasang di ${cities[provinceIndex]}`,
      createdAt: installDate.toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  return units;
};

const generateMockServices = (units: Unit[]): ServiceRecord[] => {
  const serviceTypes: ServiceRecord['serviceType'][] = ['installation', 'routine', 'repair', 'warranty', 'calibration'];
  const technicians = ['Ahmad Santoso', 'Budi Wijaya', 'Citra Dewi', 'Dedi Kurniawan', 'Eka Putri'];
  const services: ServiceRecord[] = [];

  units.forEach((unit, idx) => {
    const numServices = 1 + (idx % 5);
    for (let s = 0; s < numServices; s++) {
      const serviceDate = new Date(unit.installationDate);
      serviceDate.setMonth(serviceDate.getMonth() + s * 3);
      services.push({
        id: `SRV-${String(services.length + 1).padStart(5, '0')}`,
        unitId: unit.id,
        serialNumber: unit.serialNumber,
        serviceType: serviceTypes[s % serviceTypes.length],
        serviceDate: serviceDate.toISOString().split('T')[0],
        technicianName: technicians[s % technicians.length],
        description: `Service ${serviceTypes[s % serviceTypes.length]} untuk unit ${unit.serialNumber}`,
        partsReplaced: s % 3 === 0 ? 'Filter, Sensor' : '-',
        cost: 500000 + (s * 250000),
        nextServiceDate: '',
        notes: `Service berhasil diselesaikan`,
        createdAt: serviceDate.toISOString()
      });
    }
  });
  return services;
};

// Initialize mock data
const initializeMockData = () => {
  if (!localStorage.getItem('imedin_units')) {
    const units = generateMockUnits();
    localStorage.setItem('imedin_units', JSON.stringify(units));
    const services = generateMockServices(units);
    localStorage.setItem('imedin_services', JSON.stringify(services));
  }
  if (!localStorage.getItem('imedin_users')) {
    const users: User[] = [
      { id: '1', email: 'admin@imedin.co.id', name: 'Admin IMEDIN', role: 'admin', pin: '123456' },
      { id: '2', email: 'teknisi@imedin.co.id', name: 'Teknisi Field', role: 'teknisi', pin: '123456' },
      { id: '3', email: 'viewer@imedin.co.id', name: 'Viewer Dashboard', role: 'viewer', pin: '123456' }
    ];
    localStorage.setItem('imedin_users', JSON.stringify(users));
  }
};

initializeMockData();

// ============================================================
// Helper functions
// ============================================================
const getMockUnits = (): Unit[] => JSON.parse(localStorage.getItem('imedin_units') || '[]');
const getMockServices = (): ServiceRecord[] => JSON.parse(localStorage.getItem('imedin_services') || '[]');
const getMockUsers = (): User[] => JSON.parse(localStorage.getItem('imedin_users') || '[]');
const saveMockUnits = (units: Unit[]) => localStorage.setItem('imedin_units', JSON.stringify(units));
const saveMockServices = (services: ServiceRecord[]) => localStorage.setItem('imedin_services', JSON.stringify(services));

// ============================================================
// Auth API
// ============================================================
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<Omit<User, 'pin'>>> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      const users = getMockUsers();
      const user = users.find(u => u.email === credentials.email && u.pin === credentials.pin);
      if (user) {
        const { pin: _pin, ...userWithoutPin } = user;
        void _pin;
        const token = btoa(JSON.stringify({ id: user.id, email: user.email, role: user.role, exp: Date.now() + 86400000 }));
        localStorage.setItem('imedin_token', token);
        localStorage.setItem('imedin_user', JSON.stringify(userWithoutPin));
        return { success: true, data: userWithoutPin, message: 'Login berhasil' };
      }
      return { success: false, message: 'Email atau PIN salah' };
    }
    // GAS backend call - gunakan GET untuk hindari CORS preflight
    const params = new URLSearchParams({
      action: 'login',
      email: credentials.email,
      pin: credentials.pin
    });
    const response = await fetch(`${GAS_BASE_URL}?${params}`);
    const result = await response.json();
    
    // Simpan ke localStorage jika berhasil
    if (result.success && result.data) {
      const token = btoa(JSON.stringify({ id: result.data.id, email: result.data.email, role: result.data.role, exp: Date.now() + 86400000 }));
      localStorage.setItem('imedin_token', token);
      localStorage.setItem('imedin_user', JSON.stringify(result.data));
    }
    
    return result;
  },

  logout: (): void => {
    localStorage.removeItem('imedin_token');
    localStorage.removeItem('imedin_user');
  },

  getCurrentUser: (): Omit<User, 'pin'> | null => {
    const userStr = localStorage.getItem('imedin_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('imedin_token');
  },

  hasRole: (role: UserRole | UserRole[]): boolean => {
    const user = authApi.getCurrentUser();
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role as UserRole);
    return user.role === role;
  }
};

// ============================================================
// Units API
// ============================================================
export const unitsApi = {
  getAll: async (filters?: { search?: string; province?: string; category?: string; status?: string }): Promise<ApiResponse<Unit[]>> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 300));
      let units = getMockUnits();
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        units = units.filter(u =>
          u.serialNumber.toLowerCase().includes(s) ||
          u.productName.toLowerCase().includes(s) ||
          u.customerName.toLowerCase().includes(s) ||
          u.city.toLowerCase().includes(s)
        );
      }
      if (filters?.province) units = units.filter(u => u.province === filters.province);
      if (filters?.category) units = units.filter(u => u.category === filters.category);
      if (filters?.status) units = units.filter(u => u.status === filters.status);
      return { success: true, data: units };
    }
    const params = new URLSearchParams({ action: 'getUnits', ...filters });
    const response = await fetch(`${GAS_BASE_URL}?${params}`);
    return response.json();
  },

  getById: async (id: string): Promise<ApiResponse<Unit>> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 200));
      const units = getMockUnits();
      const unit = units.find(u => u.id === id);
      return unit ? { success: true, data: unit } : { success: false, message: 'Unit tidak ditemukan' };
    }
    const response = await fetch(`${GAS_BASE_URL}?action=getUnit&id=${id}`);
    return response.json();
  },

  getBySerialNumber: async (serialNumber: string): Promise<ApiResponse<Unit>> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 200));
      const units = getMockUnits();
      const unit = units.find(u => u.serialNumber.toLowerCase() === serialNumber.toLowerCase());
      return unit ? { success: true, data: unit } : { success: false, message: 'Unit tidak ditemukan' };
    }
    const response = await fetch(`${GAS_BASE_URL}?action=getUnitBySerial&serial=${serialNumber}`);
    return response.json();
  },

  create: async (unit: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Unit>> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      const units = getMockUnits();
      const newUnit: Unit = {
        ...unit,
        id: `UNIT-${String(units.length + 1).padStart(4, '0')}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      units.push(newUnit);
      saveMockUnits(units);
      return { success: true, data: newUnit, message: 'Unit berhasil ditambahkan' };
    }
    const response = await fetch(`${GAS_BASE_URL}?action=createUnit`, {
      method: 'POST',
      body: JSON.stringify(unit)
    });
    return response.json();
  },

  update: async (id: string, unit: Partial<Unit>): Promise<ApiResponse<Unit>> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 400));
      const units = getMockUnits();
      const index = units.findIndex(u => u.id === id);
      if (index === -1) return { success: false, message: 'Unit tidak ditemukan' };
      units[index] = { ...units[index], ...unit, updatedAt: new Date().toISOString() };
      saveMockUnits(units);
      return { success: true, data: units[index], message: 'Unit berhasil diperbarui' };
    }
    const response = await fetch(`${GAS_BASE_URL}?action=updateUnit&id=${id}`, {
      method: 'POST',
      body: JSON.stringify(unit)
    });
    return response.json();
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 300));
      const units = getMockUnits();
      const filtered = units.filter(u => u.id !== id);
      saveMockUnits(filtered);
      return { success: true, message: 'Unit berhasil dihapus' };
    }
    const response = await fetch(`${GAS_BASE_URL}?action=deleteUnit&id=${id}`);
    return response.json();
  }
};

// ============================================================
// Services API
// ============================================================
export const servicesApi = {
  getAll: async (unitId?: string): Promise<ApiResponse<ServiceRecord[]>> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 300));
      let services = getMockServices();
      if (unitId) services = services.filter(s => s.unitId === unitId);
      return { success: true, data: services.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()) };
    }
    const params = unitId ? `?action=getServices&unitId=${unitId}` : '?action=getServices';
    const response = await fetch(`${GAS_BASE_URL}${params}`);
    return response.json();
  },

  getBySerialNumber: async (serialNumber: string): Promise<ApiResponse<ServiceRecord[]>> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 300));
      const services = getMockServices().filter(s => s.serialNumber.toLowerCase() === serialNumber.toLowerCase());
      return { success: true, data: services.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()) };
    }
    const response = await fetch(`${GAS_BASE_URL}?action=getServicesBySerial&serial=${serialNumber}`);
    return response.json();
  },

  create: async (service: Omit<ServiceRecord, 'id' | 'createdAt'>): Promise<ApiResponse<ServiceRecord>> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 400));
      const services = getMockServices();
      const newService: ServiceRecord = {
        ...service,
        id: `SRV-${String(services.length + 1).padStart(5, '0')}`,
        createdAt: new Date().toISOString()
      };
      services.push(newService);
      saveMockServices(services);
      // Update unit lastServiceDate
      const units = getMockUnits();
      const unitIndex = units.findIndex(u => u.id === service.unitId);
      if (unitIndex !== -1) {
        units[unitIndex].lastServiceDate = service.serviceDate;
        if (service.nextServiceDate) {
          units[unitIndex].nextMaintenanceDate = service.nextServiceDate;
        }
        saveMockUnits(units);
      }
      return { success: true, data: newService, message: 'Service record berhasil ditambahkan' };
    }
    const response = await fetch(`${GAS_BASE_URL}?action=createService`, {
      method: 'POST',
      body: JSON.stringify(service)
    });
    return response.json();
  }
};

// ============================================================
// Dashboard API
// ============================================================
export const dashboardApi = {
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      const units = getMockUnits();
      const services = getMockServices();
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      const byProvince: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      const byStatus: Record<string, number> = {};

      units.forEach(u => {
        byProvince[u.province] = (byProvince[u.province] || 0) + 1;
        byCategory[u.category] = (byCategory[u.category] || 0) + 1;
        byStatus[u.status] = (byStatus[u.status] || 0) + 1;
      });

      const upcomingMaintenance = units
        .filter(u => {
          const maintDate = new Date(u.nextMaintenanceDate);
          return maintDate >= now && maintDate <= thirtyDaysFromNow;
        })
        .sort((a, b) => new Date(a.nextMaintenanceDate).getTime() - new Date(b.nextMaintenanceDate).getTime())
        .slice(0, 10);

      const warrantyExpiringUnits = units
        .filter(u => {
          const warrantyDate = new Date(u.warrantyEndDate);
          return warrantyDate >= now && warrantyDate <= thirtyDaysFromNow;
        })
        .sort((a, b) => new Date(a.warrantyEndDate).getTime() - new Date(b.warrantyEndDate).getTime())
        .slice(0, 10);

      return {
        success: true,
        data: {
          totalUnits: units.length,
          activeUnits: units.filter(u => u.status === 'active').length,
          maintenanceOverdue: units.filter(u => u.status === 'overdue').length,
          warrantyExpiring: warrantyExpiringUnits.length,
          byProvince,
          byCategory,
          byStatus,
          recentServices: services.slice(0, 10),
          upcomingMaintenance,
          warrantyExpiringUnits
        }
      };
    }
    const response = await fetch(`${GAS_BASE_URL}?action=getDashboardStats`);
    return response.json();
  },

  getAlerts: async (): Promise<ApiResponse<AlertItem[]>> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 300));
      const units = getMockUnits();
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      const alerts: AlertItem[] = [];

      units.forEach(u => {
        const maintDate = new Date(u.nextMaintenanceDate);
        const warrantyDate = new Date(u.warrantyEndDate);

        if (maintDate < now) {
          alerts.push({
            id: `alert-maint-${u.id}`,
            type: 'maintenance',
            unit: u,
            message: `Maintenance overdue untuk ${u.productName}`,
            dueDate: u.nextMaintenanceDate,
            severity: 'critical'
          });
        } else if (maintDate <= thirtyDaysFromNow) {
          alerts.push({
            id: `alert-maint-${u.id}`,
            type: 'maintenance',
            unit: u,
            message: `Maintenance mendatang untuk ${u.productName}`,
            dueDate: u.nextMaintenanceDate,
            severity: 'warning'
          });
        }

        if (warrantyDate >= now && warrantyDate <= thirtyDaysFromNow) {
          alerts.push({
            id: `alert-warranty-${u.id}`,
            type: 'warranty',
            unit: u,
            message: `Garansi akan habis untuk ${u.productName}`,
            dueDate: u.warrantyEndDate,
            severity: 'warning'
          });
        }
      });

      return { success: true, data: alerts.sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (a.severity !== 'critical' && b.severity === 'critical') return 1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }) };
    }
    const response = await fetch(`${GAS_BASE_URL}?action=getAlerts`);
    return response.json();
  }
};

// ============================================================
// Import/Export API
// ============================================================
export const importExportApi = {
  importUnits: async (data: Record<string, string>[]): Promise<ApiResponse<{ imported: number; errors: string[] }>> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 800));
      const units = getMockUnits();
      const errors: string[] = [];
      let imported = 0;

      data.forEach((row, idx) => {
        try {
          const newUnit: Unit = {
            id: `UNIT-${String(units.length + imported + 1).padStart(4, '0')}`,
            serialNumber: row.serialNumber || row['Serial Number'] || `AUTO-${Date.now()}-${idx}`,
            productName: row.productName || row['Product Name'] || 'Unknown',
            category: (row.category || row['Category'] || 'other') as Unit['category'],
            model: row.model || row['Model'] || '',
            manufacturer: row.manufacturer || row['Manufacturer'] || '',
            customerName: row.customerName || row['Customer Name'] || '',
            customerPhone: row.customerPhone || row['Customer Phone'] || '',
            province: row.province || row['Province'] || '',
            city: row.city || row['City'] || '',
            address: row.address || row['Address'] || '',
            latitude: parseFloat(row.latitude || row['Latitude'] || '0'),
            longitude: parseFloat(row.longitude || row['Longitude'] || '0'),
            installationDate: row.installationDate || row['Installation Date'] || new Date().toISOString().split('T')[0],
            warrantyEndDate: row.warrantyEndDate || row['Warranty End Date'] || new Date().toISOString().split('T')[0],
            nextMaintenanceDate: row.nextMaintenanceDate || row['Next Maintenance Date'] || new Date().toISOString().split('T')[0],
            lastServiceDate: row.lastServiceDate || row['Last Service Date'] || '',
            status: (row.status || row['Status'] || 'active') as Unit['status'],
            notes: row.notes || row['Notes'] || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          units.push(newUnit);
          imported++;
        } catch (err) {
          errors.push(`Row ${idx + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      });

      saveMockUnits(units);
      return { success: true, data: { imported, errors }, message: `${imported} unit berhasil diimpor` };
    }
    const response = await fetch(`${GAS_BASE_URL}?action=importUnits`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  exportUnits: async (format: 'xlsx' | 'csv', filters?: Record<string, string>): Promise<Blob> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      let units = getMockUnits();
      if (filters?.province) units = units.filter(u => u.province === filters.province);
      if (filters?.category) units = units.filter(u => u.category === filters.category);
      if (filters?.status) units = units.filter(u => u.status === filters.status);

      if (format === 'csv') {
        const headers = ['ID', 'Serial Number', 'Product Name', 'Category', 'Model', 'Manufacturer', 'Customer Name', 'Customer Phone', 'Province', 'City', 'Address', 'Latitude', 'Longitude', 'Installation Date', 'Warranty End Date', 'Next Maintenance Date', 'Last Service Date', 'Status', 'Notes'];
        const rows = units.map(u => [
          u.id, u.serialNumber, u.productName, u.category, u.model, u.manufacturer,
          u.customerName, u.customerPhone, u.province, u.city, u.address,
          u.latitude, u.longitude, u.installationDate, u.warrantyEndDate,
          u.nextMaintenanceDate, u.lastServiceDate, u.status, u.notes
        ]);
        const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      }

      // XLSX format using xlsx library
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(units);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Units');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    const params = new URLSearchParams({ action: 'exportUnits', format, ...filters });
    const response = await fetch(`${GAS_BASE_URL}?${params}`);
    return response.blob();
  }
};

export { GAS_BASE_URL, USE_MOCK };
