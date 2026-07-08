// ============================================================
// IMEDIN After Sales Monitoring System (IASMS)
// Type Definitions
// ============================================================

export type UserRole = 'admin' | 'teknisi' | 'viewer' | 'guest';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  pin: string;
  avatar?: string;
  createdAt?: string;
}

// ============================================================
// Unit - Objek utama sistem
// ============================================================
export type UnitStatus = 'active' | 'maintenance' | 'repair' | 'inactive';
export type UnitCategory = 'dialysis' | 'laboratory' | 'imaging' | 'ventilator' | 'monitor' | 'other';
export type WarrantyStatus = 'active' | 'expiring_soon' | 'expired';

export interface Unit {
  id: string;
  serialNumber: string;
  productName: string;
  brand: string;
  category: UnitCategory;
  model: string;
  manufacturer: string;
  batch?: string;

  // Lokasi
  facilityName: string;
  room?: string;
  pic?: string;
  picContact?: string;
  province: string;
  city: string;
  district: string;
  village: string;
  postalCode: string;
  address: string;
  latitude: number;
  longitude: number;
  googleMapsUrl?: string;

  // Customer / Distributor
  customerName: string;
  customerPhone: string;
  distributorName?: string;

  // Tanggal
  installationDate: string;
  warrantyEndDate: string;
  nextMaintenanceDate: string;
  lastServiceDate: string;

  // Status
  status: UnitStatus;
  warrantyStatus?: WarrantyStatus;

  // Media
  photoUrl?: string;
  photoUrls?: string[];
  qrCodeUrl?: string;
  documentUrls?: string[];

  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Activity - Semua aktivitas unit dalam satu timeline
// ============================================================
export type ActivityType =
  | 'installation'
  | 'preventive_maintenance'
  | 'repair'
  | 'firmware_upgrade'
  | 'spare_part'
  | 'relocation'
  | 'other';

export interface Activity {
  id: string;
  unitId: string;
  serialNumber: string;
  type: ActivityType;
  date: string;
  technicianName: string;
  technicianId?: string;
  description: string;
  partsReplaced?: string;
  cost?: number;
  nextSchedule?: string;
  photoUrls?: string[];
  documentUrls?: string[];
  notes?: string;
  createdAt: string;
}

// Legacy alias untuk backward compatibility
export type ServiceType = 'installation' | 'routine' | 'repair' | 'warranty' | 'calibration';
export interface ServiceRecord {
  id: string;
  unitId: string;
  serialNumber: string;
  serviceType: ServiceType;
  serviceDate: string;
  technicianName: string;
  description: string;
  partsReplaced: string;
  cost: number;
  nextServiceDate: string;
  notes: string;
  createdAt: string;
}

// ============================================================
// Dashboard Stats
// ============================================================
export interface InstalledBaseStats {
  totalUnits: number;
  totalLocations: number;
  totalProvinces: number;
  totalCities: number;
}

export interface OperationalStats {
  normal: number;
  needsAttention: number;
  inRepair: number;
  inactive: number;
}

export interface WarrantyStats {
  active: number;
  expiringSoon: number; // < 90 hari
  expired: number;
}

export interface DashboardStats {
  // Legacy
  totalUnits: number;
  activeUnits: number;
  maintenanceOverdue: number;
  warrantyExpiring: number;

  // New
  installedBase: InstalledBaseStats;
  operational: OperationalStats;
  warranty: WarrantyStats;

  byProvince: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  byProduct: Record<string, number>;
  installationTrend: { month: string; count: number }[];

  recentServices: ServiceRecord[];
  recentActivities: Activity[];
  upcomingMaintenance: Unit[];
  warrantyExpiringUnits: Unit[];
  actionCenter: ActionCenterItem[];
}

// ============================================================
// Action Center
// ============================================================
export type ActionCenterType =
  | 'warranty_expiring'
  | 'pm_overdue'
  | 'pm_never'
  | 'in_repair'
  | 'incomplete_data'
  | 'no_photo';

export interface ActionCenterItem {
  id: string;
  type: ActionCenterType;
  unit: Unit;
  message: string;
  dueDate?: string;
  severity: 'critical' | 'warning' | 'info';
}

// ============================================================
// Alert (legacy)
// ============================================================
export interface AlertItem {
  id: string;
  type: 'warranty' | 'maintenance';
  unit: Unit;
  message: string;
  dueDate: string;
  severity: 'critical' | 'warning';
}

// ============================================================
// API
// ============================================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  pin: string;
}

export interface ImportPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

// ============================================================
// Global Filter
// ============================================================
export interface GlobalFilter {
  province?: string;
  city?: string;
  product?: string;
  model?: string;
  status?: UnitStatus | '';
  warrantyStatus?: WarrantyStatus | '';
  distributor?: string;
  installYear?: string;
  search?: string;
}
