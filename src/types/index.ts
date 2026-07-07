// ============================================================
// IMEDIN - Type Definitions
// ============================================================

export type UserRole = 'admin' | 'teknisi' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  pin: string;
  avatar?: string;
}

export type UnitStatus = 'active' | 'maintenance' | 'overdue' | 'inactive';
export type UnitCategory = 'dialysis' | 'laboratory' | 'imaging' | 'ventilator' | 'monitor' | 'other';
export type ServiceType = 'installation' | 'routine' | 'repair' | 'warranty' | 'calibration';

export interface Unit {
  id: string;
  serialNumber: string;
  productName: string;
  category: UnitCategory;
  model: string;
  manufacturer: string;
  customerName: string;
  customerPhone: string;
  province: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  installationDate: string;
  warrantyEndDate: string;
  nextMaintenanceDate: string;
  lastServiceDate: string;
  status: UnitStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface DashboardStats {
  totalUnits: number;
  activeUnits: number;
  maintenanceOverdue: number;
  warrantyExpiring: number;
  byProvince: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  recentServices: ServiceRecord[];
  upcomingMaintenance: Unit[];
  warrantyExpiringUnits: Unit[];
}

export interface AlertItem {
  id: string;
  type: 'warranty' | 'maintenance';
  unit: Unit;
  message: string;
  dueDate: string;
  severity: 'critical' | 'warning';
}

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
