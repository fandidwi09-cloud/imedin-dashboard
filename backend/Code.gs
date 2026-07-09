/**
 * IMEDIN After Sales Monitoring System (IASMS)
 * Google Apps Script Backend v2.0
 *
 * Sheet Structure:
 * - Units: ID, SerialNumber, ProductName, Brand, Category, Model, Manufacturer, Batch,
 *          FacilityName, Room, PIC, PICContact, Province, City, District, Village,
 *          PostalCode, Address, Latitude, Longitude, GoogleMapsUrl,
 *          CustomerName, CustomerPhone, DistributorName,
 *          InstallationDate, WarrantyEndDate, NextMaintenanceDate, LastServiceDate,
 *          Status, PhotoUrl, PhotoUrls, QRCodeUrl, DocumentUrls, Notes, CreatedAt, UpdatedAt
 * - Activities: ID, UnitID, SerialNumber, Type, Date, TechnicianName, TechnicianId,
 *               Description, PartsReplaced, Cost, NextSchedule,
 *               PhotoUrls, DocumentUrls, Notes, CreatedAt
 * - Users: ID, Email, Name, Role, PIN, CreatedAt
 */

const SPREADSHEET_ID = '15HDyEYD0u81EZU2v0X-_TcgRN5oJ7-7HFZrVwzNWwwk';

// ============================================================
// Utility
// ============================================================
function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function generateId(prefix) {
  return prefix + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function hashPin(pin) {
  const sig = Utilities.computeHmacSha256Signature(pin, 'IMEDIN_SECRET_KEY');
  return sig.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// ============================================================
// Router
// ============================================================
function doGet(e) {
  const action = e.parameter.action;
  try {
    switch (action) {
      case 'getUnits':         return handleGetUnits(e);
      case 'getUnit':          return handleGetUnit(e);
      case 'getUnitBySerial':  return handleGetUnitBySerial(e);
      case 'getActivities':    return handleGetActivities(e);
      case 'getDashboardStats':return handleGetDashboardStats();
      case 'getAlerts':        return handleGetAlerts();
      case 'login':            return handleLogin(e);
      case 'checkEmail':       return handleCheckEmail(e);
      case 'getUsers':         return handleGetUsers();
      case 'resetPin':         return handleResetPinGet(e);
      case 'createActivity':   return handleCreateActivityGet(e);
      case 'createUnit':       return handleCreateUnitGet(e);
      case 'updateUnit':       return handleUpdateUnitGet(e);
      case 'deleteUnit':       return handleDeleteUnit(e);
      default: return jsonResponse({ success: false, message: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

function doPost(e) {
  const action = e.parameter.action;
  const data = JSON.parse(e.postData.contents);
  try {
    switch (action) {
      case 'login':          return handleLoginPost(data);
      case 'resetPin':       return handleResetPin(data);
      case 'createUnit':     return handleCreateUnit(data);
      case 'updateUnit':     return handleUpdateUnit(e, data);
      case 'deleteUnit':     return handleDeleteUnit(e);
      case 'createActivity': return handleCreateActivity(data);
      case 'importUnits':    return handleImportUnits(data);
      case 'createUser':     return handleCreateUser(data);
      case 'updateUser':     return handleUpdateUser(e, data);
      case 'deleteUser':     return handleDeleteUser(e);
      default: return jsonResponse({ success: false, message: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

function doOptions() {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

// GET-based handlers (untuk hindari CORS preflight)
function handleResetPinGet(e) {
  const email = e.parameter.email;
  const newPin = e.parameter.newPin;
  if (!email || !newPin) return jsonResponse({ success: false, message: 'Email dan PIN baru diperlukan' });
  const sheet = getSheet('Users');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === email) {
      sheet.getRange(i + 1, 5).setValue(hashPin(newPin));
      return jsonResponse({ success: true, message: 'PIN berhasil direset' });
    }
  }
  return jsonResponse({ success: false, message: 'Email tidak ditemukan' });
}

function handleCreateActivityGet(e) {
  const p = e.parameter;
  const data = {
    unitId: p.unitId, serialNumber: p.serialNumber, type: p.type,
    date: p.date, technicianName: p.technicianName, description: p.description,
    partsReplaced: p.partsReplaced || '', cost: parseFloat(p.cost) || 0,
    nextSchedule: p.nextSchedule || '', notes: p.notes || ''
  };
  return handleCreateActivity(data);
}

function handleCreateUnitGet(e) {
  const p = e.parameter;
  return handleCreateUnit(p);
}

function handleUpdateUnitGet(e) {
  const p = e.parameter;
  // Parse numeric fields yang datang sebagai string via GET params
  const data = { ...p };
  if (data.latitude !== undefined) data.latitude = parseFloat(data.latitude) || 0;
  if (data.longitude !== undefined) data.longitude = parseFloat(data.longitude) || 0;
  return handleUpdateUnit(e, data);
}

// ============================================================
// Auth
// ============================================================
function handleLogin(e) {
  const { email, pin } = e.parameter;
  if (!email || !pin) return jsonResponse({ success: false, message: 'Email dan PIN diperlukan' });
  const sheet = getSheet('Users');
  const rows = sheetToObjects(sheet);
  const hashed = hashPin(pin);
  const user = rows.find(r => r.Email === email && r.PIN === hashed);
  if (!user) return jsonResponse({ success: false, message: 'Email atau PIN salah' });
  return jsonResponse({ success: true, data: { id: user.ID, email: user.Email, name: user.Name, role: user.Role }, message: 'Login berhasil' });
}

function handleLoginPost(data) {
  return handleLogin({ parameter: data });
}

function handleCheckEmail(e) {
  const email = e.parameter.email;
  const rows = sheetToObjects(getSheet('Users'));
  const user = rows.find(r => r.Email === email);
  if (!user) return jsonResponse({ success: false, message: 'Email tidak terdaftar' });
  return jsonResponse({ success: true, data: { name: user.Name }, message: 'Email ditemukan' });
}

function handleResetPin(data) {
  if (!data.email || !data.newPin) return jsonResponse({ success: false, message: 'Email dan PIN baru diperlukan' });
  const sheet = getSheet('Users');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === data.email) {
      sheet.getRange(i + 1, 5).setValue(hashPin(data.newPin));
      return jsonResponse({ success: true, message: 'PIN berhasil direset' });
    }
  }
  return jsonResponse({ success: false, message: 'Email tidak ditemukan' });
}

// ============================================================
// Units
// ============================================================
function handleGetUnits(e) {
  const rows = sheetToObjects(getSheet('Units'));
  const { search, province, city, category, status, distributor, installYear } = e.parameter;
  let units = rows;
  if (search) {
    const s = search.toLowerCase();
    units = units.filter(u =>
      String(u.SerialNumber).toLowerCase().includes(s) ||
      String(u.ProductName).toLowerCase().includes(s) ||
      String(u.FacilityName).toLowerCase().includes(s) ||
      String(u.CustomerName).toLowerCase().includes(s) ||
      String(u.City).toLowerCase().includes(s)
    );
  }
  if (province)    units = units.filter(u => u.Province === province);
  if (city)        units = units.filter(u => u.City === city);
  if (category)    units = units.filter(u => u.Category === category);
  if (status)      units = units.filter(u => u.Status === status);
  if (distributor) units = units.filter(u => u.DistributorName === distributor);
  if (installYear) units = units.filter(u => String(u.InstallationDate).startsWith(installYear));
  return jsonResponse({ success: true, data: units.map(mapUnit) });
}

function handleGetUnit(e) {
  const rows = sheetToObjects(getSheet('Units'));
  const unit = rows.find(u => u.ID === e.parameter.id);
  if (!unit) return jsonResponse({ success: false, message: 'Unit tidak ditemukan' });
  return jsonResponse({ success: true, data: mapUnit(unit) });
}

function handleGetUnitBySerial(e) {
  const rows = sheetToObjects(getSheet('Units'));
  const unit = rows.find(u => String(u.SerialNumber).toLowerCase() === String(e.parameter.serial).toLowerCase());
  if (!unit) return jsonResponse({ success: false, message: 'Unit tidak ditemukan' });
  return jsonResponse({ success: true, data: mapUnit(unit) });
}

function mapUnit(u) {
  return {
    id: u.ID || '', serialNumber: u.SerialNumber || '',
    productName: u.ProductName || '', brand: u.Brand || '',
    category: u.Category || 'other', model: u.Model || '',
    manufacturer: u.Manufacturer || '', batch: u.Batch || '',
    facilityName: u.FacilityName || '', room: u.Room || '',
    pic: u.PIC || '', picContact: u.PICContact || '',
    province: u.Province || '', city: u.City || '',
    district: u.District || '', village: u.Village || '',
    postalCode: u.PostalCode || '', address: u.Address || '',
    latitude: parseFloat(u.Latitude) || 0, longitude: parseFloat(u.Longitude) || 0,
    googleMapsUrl: u.GoogleMapsUrl || '',
    customerName: u.CustomerName || '', customerPhone: u.CustomerPhone || '',
    distributorName: u.DistributorName || '',
    installationDate: String(u.InstallationDate || '').split('T')[0],
    warrantyEndDate: String(u.WarrantyEndDate || '').split('T')[0],
    nextMaintenanceDate: String(u.NextMaintenanceDate || '').split('T')[0],
    lastServiceDate: String(u.LastServiceDate || '').split('T')[0],
    status: u.Status || 'active',
    photoUrl: u.PhotoUrl || '', photoUrls: u.PhotoUrls || '',
    qrCodeUrl: u.QRCodeUrl || '', documentUrls: u.DocumentUrls || '',
    notes: u.Notes || '', createdAt: u.CreatedAt || '', updatedAt: u.UpdatedAt || ''
  };
}

function handleCreateUnit(data) {
  const sheet = getSheet('Units');
  const id = generateId('UNIT');
  const now = new Date().toISOString();
  sheet.appendRow([
    id, data.serialNumber, data.productName, data.brand || '', data.category, data.model, data.manufacturer, data.batch || '',
    data.facilityName || '', data.room || '', data.pic || '', data.picContact || '',
    data.province, data.city, data.district || '', data.village || '', data.postalCode || '', data.address,
    data.latitude || 0, data.longitude || 0, data.googleMapsUrl || '',
    data.customerName, data.customerPhone || '', data.distributorName || '',
    data.installationDate, data.warrantyEndDate || '', data.nextMaintenanceDate || '', data.lastServiceDate || '',
    data.status || 'active', data.photoUrl || '', data.photoUrls || '', '', data.documentUrls || '',
    data.notes || '', now, now
  ]);
  return jsonResponse({ success: true, data: { id }, message: 'Unit berhasil ditambahkan' });
}

function handleUpdateUnit(e, data) {
  const sheet = getSheet('Units');
  const values = sheet.getDataRange().getValues();
  const now = new Date().toISOString();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === e.parameter.id) {
      const r = i + 1;
      const fields = [
        data.serialNumber, data.productName, data.brand || '', data.category, data.model, data.manufacturer, data.batch || '',
        data.facilityName || '', data.room || '', data.pic || '', data.picContact || '',
        data.province, data.city, data.district || '', data.village || '', data.postalCode || '', data.address,
        data.latitude || 0, data.longitude || 0, data.googleMapsUrl || '',
        data.customerName, data.customerPhone || '', data.distributorName || '',
        data.installationDate, data.warrantyEndDate || '', data.nextMaintenanceDate || '', data.lastServiceDate || '',
        data.status || 'active', data.photoUrl || '', data.photoUrls || '', values[i][30], data.documentUrls || '',
        data.notes || '', values[i][33], now
      ];
      sheet.getRange(r, 2, 1, fields.length).setValues([fields]);
      return jsonResponse({ success: true, message: 'Unit berhasil diperbarui' });
    }
  }
  return jsonResponse({ success: false, message: 'Unit tidak ditemukan' });
}

function handleDeleteUnit(e) {
  const sheet = getSheet('Units');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === e.parameter.id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: 'Unit berhasil dihapus' });
    }
  }
  return jsonResponse({ success: false, message: 'Unit tidak ditemukan' });
}

// ============================================================
// Activities
// ============================================================
function handleGetActivities(e) {
  const rows = sheetToObjects(getSheet('Activities'));
  const { unitId, serial, type } = e.parameter;
  let acts = rows;
  if (unitId) acts = acts.filter(a => a.UnitID === unitId);
  if (serial)  acts = acts.filter(a => String(a.SerialNumber).toLowerCase() === String(serial).toLowerCase());
  if (type)    acts = acts.filter(a => a.Type === type);
  acts.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  return jsonResponse({ success: true, data: acts.map(mapActivity) });
}

function mapActivity(a) {
  return {
    id: a.ID || '', unitId: a.UnitID || '', serialNumber: a.SerialNumber || '',
    type: a.Type || 'other', date: String(a.Date || '').split('T')[0],
    technicianName: a.TechnicianName || '', technicianId: a.TechnicianId || '',
    description: a.Description || '', partsReplaced: a.PartsReplaced || '',
    cost: parseFloat(a.Cost) || 0, nextSchedule: String(a.NextSchedule || '').split('T')[0],
    photoUrls: a.PhotoUrls || '', documentUrls: a.DocumentUrls || '',
    notes: a.Notes || '', createdAt: a.CreatedAt || ''
  };
}

function handleCreateActivity(data) {
  const sheet = getSheet('Activities');
  const id = generateId('ACT');
  const now = new Date().toISOString();
  sheet.appendRow([
    id, data.unitId, data.serialNumber, data.type, data.date,
    data.technicianName, data.technicianId || '', data.description,
    data.partsReplaced || '', data.cost || 0, data.nextSchedule || '',
    data.photoUrls || '', data.documentUrls || '', data.notes || '', now
  ]);
  // Update Unit LastServiceDate & NextMaintenanceDate
  const unitSheet = getSheet('Units');
  const uv = unitSheet.getDataRange().getValues();
  for (let i = 1; i < uv.length; i++) {
    if (uv[i][0] === data.unitId) {
      unitSheet.getRange(i + 1, 28).setValue(data.date); // LastServiceDate col 28
      if (data.nextSchedule) unitSheet.getRange(i + 1, 27).setValue(data.nextSchedule); // NextMaintenanceDate col 27
      unitSheet.getRange(i + 1, 36).setValue(now); // UpdatedAt col 36
      break;
    }
  }
  return jsonResponse({ success: true, data: { id }, message: 'Aktivitas berhasil ditambahkan' });
}

// ============================================================
// Dashboard Stats
// ============================================================
function handleGetDashboardStats() {
  const units = sheetToObjects(getSheet('Units')).map(mapUnit);
  const activities = sheetToObjects(getSheet('Activities')).map(mapActivity);
  const now = new Date();
  const d90 = new Date(); d90.setDate(now.getDate() + 90);

  // Installed Base
  const provinces = new Set(units.map(u => u.province).filter(Boolean));
  const cities    = new Set(units.map(u => u.city).filter(Boolean));
  const facilities= new Set(units.map(u => u.facilityName).filter(Boolean));

  // Operational
  const normal  = units.filter(u => u.status === 'active').length;
  const attn    = units.filter(u => u.status === 'maintenance').length;
  const repair  = units.filter(u => u.status === 'repair').length;
  const inactive= units.filter(u => u.status === 'inactive').length;

  // Warranty
  const wActive  = units.filter(u => u.warrantyEndDate && new Date(u.warrantyEndDate) >= d90).length;
  const wSoon    = units.filter(u => u.warrantyEndDate && new Date(u.warrantyEndDate) >= now && new Date(u.warrantyEndDate) < d90).length;
  const wExpired = units.filter(u => u.warrantyEndDate && new Date(u.warrantyEndDate) < now).length;

  // By dimension
  const byProvince = {}, byCategory = {}, byStatus = {}, byProduct = {};
  units.forEach(u => {
    byProvince[u.province] = (byProvince[u.province] || 0) + 1;
    byCategory[u.category] = (byCategory[u.category] || 0) + 1;
    byStatus[u.status]     = (byStatus[u.status] || 0) + 1;
    byProduct[u.productName]=(byProduct[u.productName] || 0) + 1;
  });

  // Installation trend (last 12 months)
  const trend = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    trend[key] = 0;
  }
  units.forEach(u => {
    if (u.installationDate) {
      const key = u.installationDate.substring(0, 7);
      if (trend[key] !== undefined) trend[key]++;
    }
  });
  const installationTrend = Object.entries(trend).map(([month, count]) => ({ month, count }));

  // Upcoming maintenance (next 30 days)
  const d30 = new Date(); d30.setDate(now.getDate() + 30);
  const upcomingMaintenance = units.filter(u => {
    const d = new Date(u.nextMaintenanceDate);
    return d >= now && d <= d30;
  }).slice(0, 10);

  const warrantyExpiringUnits = units.filter(u => {
    const d = new Date(u.warrantyEndDate);
    return d >= now && d < d90;
  }).slice(0, 10);

  // Action Center
  const actionCenter = [];
  units.forEach(u => {
    if (u.warrantyEndDate && new Date(u.warrantyEndDate) >= now && new Date(u.warrantyEndDate) < d90)
      actionCenter.push({ id:'ac-w-'+u.id, type:'warranty_expiring', unit: u, message:'Garansi habis dalam 90 hari: '+u.productName, dueDate: u.warrantyEndDate, severity: new Date(u.warrantyEndDate) < new Date(now.getTime()+30*86400000) ? 'critical':'warning' });
    if (u.nextMaintenanceDate && new Date(u.nextMaintenanceDate) < now)
      actionCenter.push({ id:'ac-pm-'+u.id, type:'pm_overdue', unit: u, message:'PM jatuh tempo: '+u.productName, dueDate: u.nextMaintenanceDate, severity:'critical' });
    if (u.status === 'repair')
      actionCenter.push({ id:'ac-r-'+u.id, type:'in_repair', unit: u, message:'Dalam perbaikan: '+u.productName, severity:'warning' });
    if (!u.facilityName)
      actionCenter.push({ id:'ac-d-'+u.id, type:'incomplete_data', unit: u, message:'Data belum lengkap: '+u.serialNumber, severity:'info' });
    if (!u.photoUrl)
      actionCenter.push({ id:'ac-p-'+u.id, type:'no_photo', unit: u, message:'Belum ada foto: '+u.productName, severity:'info' });
  });

  const recentActivities = activities.slice(0, 10);

  return jsonResponse({
    success: true,
    data: {
      totalUnits: units.length, activeUnits: normal, maintenanceOverdue: attn, warrantyExpiring: wSoon,
      installedBase: { totalUnits: units.length, totalLocations: facilities.size, totalProvinces: provinces.size, totalCities: cities.size },
      operational: { normal, needsAttention: attn, inRepair: repair, inactive },
      warranty: { active: wActive, expiringSoon: wSoon, expired: wExpired },
      byProvince, byCategory, byStatus, byProduct, installationTrend,
      recentActivities, recentServices: [],
      upcomingMaintenance, warrantyExpiringUnits, actionCenter
    }
  });
}

// ============================================================
// Alerts (legacy)
// ============================================================
function handleGetAlerts() {
  const units = sheetToObjects(getSheet('Units')).map(mapUnit);
  const now = new Date();
  const d30 = new Date(); d30.setDate(now.getDate() + 30);
  const alerts = [];
  units.forEach(u => {
    const maint = new Date(u.nextMaintenanceDate);
    const warr  = new Date(u.warrantyEndDate);
    if (maint < now)  alerts.push({ id:'a-m-'+u.id, type:'maintenance', unit:u, message:'PM overdue: '+u.productName, dueDate:u.nextMaintenanceDate, severity:'critical' });
    else if (maint <= d30) alerts.push({ id:'a-m-'+u.id, type:'maintenance', unit:u, message:'PM mendatang: '+u.productName, dueDate:u.nextMaintenanceDate, severity:'warning' });
    if (warr >= now && warr <= d30) alerts.push({ id:'a-w-'+u.id, type:'warranty', unit:u, message:'Garansi habis: '+u.productName, dueDate:u.warrantyEndDate, severity:'warning' });
  });
  alerts.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (a.severity !== 'critical' && b.severity === 'critical') return 1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  return jsonResponse({ success: true, data: alerts });
}

// ============================================================
// Users
// ============================================================
function handleGetUsers() {
  const rows = sheetToObjects(getSheet('Users'));
  return jsonResponse({ success: true, data: rows.map(u => ({ id:u.ID, email:u.Email, name:u.Name, role:u.Role, createdAt:u.CreatedAt })) });
}

function handleCreateUser(data) {
  const sheet = getSheet('Users');
  const id = generateId('USR');
  const now = new Date().toISOString();
  sheet.appendRow([id, data.email, data.name, data.role, hashPin(data.pin || '123456'), now]);
  return jsonResponse({ success: true, data: { id }, message: 'User berhasil dibuat' });
}

function handleUpdateUser(e, data) {
  const sheet = getSheet('Users');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === e.parameter.id) {
      if (data.name)  sheet.getRange(i+1, 3).setValue(data.name);
      if (data.role)  sheet.getRange(i+1, 4).setValue(data.role);
      if (data.pin)   sheet.getRange(i+1, 5).setValue(hashPin(data.pin));
      return jsonResponse({ success: true, message: 'User berhasil diperbarui' });
    }
  }
  return jsonResponse({ success: false, message: 'User tidak ditemukan' });
}

function handleDeleteUser(e) {
  const sheet = getSheet('Users');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === e.parameter.id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: 'User berhasil dihapus' });
    }
  }
  return jsonResponse({ success: false, message: 'User tidak ditemukan' });
}

// ============================================================
// Import
// ============================================================
function handleImportUnits(data) {
  const sheet = getSheet('Units');
  const now = new Date().toISOString();
  let imported = 0;
  const errors = [];
  data.forEach((row, idx) => {
    try {
      const id = generateId('UNIT');
      sheet.appendRow([
        id,
        row.serialNumber || row['Serial Number'] || 'AUTO-'+Date.now()+'-'+idx,
        row.productName  || row['Product Name']  || 'Unknown',
        row.brand        || row['Brand']          || '',
        row.category     || row['Category']       || 'other',
        row.model        || row['Model']          || '',
        row.manufacturer || row['Manufacturer']   || 'IMEDIN Medical',
        row.batch        || row['Batch']          || '',
        row.facilityName || row['Facility Name']  || '',
        row.room         || row['Room']           || '',
        row.pic          || row['PIC']            || '',
        row.picContact   || row['PIC Contact']    || '',
        row.province     || row['Province']       || '',
        row.city         || row['City']           || '',
        row.district     || row['District']       || '',
        row.village      || row['Village']        || '',
        row.postalCode   || row['Postal Code']    || '',
        row.address      || row['Address']        || '',
        parseFloat(row.latitude  || row['Latitude']  || '0'),
        parseFloat(row.longitude || row['Longitude'] || '0'),
        '', // GoogleMapsUrl
        row.customerName  || row['Customer Name']  || '',
        row.customerPhone || row['Customer Phone'] || '',
        row.distributorName || row['Distributor'] || '',
        row.installationDate   || row['Installation Date']    || now.split('T')[0],
        row.warrantyEndDate    || row['Warranty End Date']    || '',
        row.nextMaintenanceDate|| row['Next Maintenance Date']|| '',
        row.lastServiceDate    || row['Last Service Date']    || '',
        row.status || row['Status'] || 'active',
        '', '', '', '', // PhotoUrl, PhotoUrls, QRCodeUrl, DocumentUrls
        row.notes || row['Notes'] || '',
        now, now
      ]);
      imported++;
    } catch (err) { errors.push('Row ' + (idx+1) + ': ' + err.toString()); }
  });
  return jsonResponse({ success: true, data: { imported, errors }, message: imported + ' unit berhasil diimpor' });
}

// ============================================================
// Setup (jalankan sekali)
// ============================================================
function setupDefaultUsers() {
  const sheet = getSheet('Users');
  if (!sheet) { Logger.log('Sheet Users tidak ditemukan'); return; }
  const now = new Date().toISOString();
  [
    ['USR-001', 'admin@imedin.co.id',    'Admin IMEDIN',    'admin',   hashPin('123456'), now],
    ['USR-002', 'teknisi@imedin.co.id',  'Teknisi IMEDIN',  'teknisi', hashPin('123456'), now],
    ['USR-003', 'viewer@imedin.co.id',   'Viewer IMEDIN',   'viewer',  hashPin('123456'), now],
  ].forEach(r => sheet.appendRow(r));
  Logger.log('Users berhasil ditambahkan');
}

function setupSheetHeaders() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Units — update/tambah header baru di baris 1 tanpa hapus data
  const unitsHeaders = ['ID','SerialNumber','ProductName','Brand','Category','Model','Manufacturer','Batch',
    'FacilityName','Room','PIC','PICContact','Province','City','District','Village','PostalCode','Address',
    'Latitude','Longitude','GoogleMapsUrl','CustomerName','CustomerPhone','DistributorName',
    'InstallationDate','WarrantyEndDate','NextMaintenanceDate','LastServiceDate',
    'Status','PhotoUrl','PhotoUrls','QRCodeUrl','DocumentUrls','Notes','CreatedAt','UpdatedAt'];

  let s = ss.getSheetByName('Units');
  if (!s) {
    s = ss.insertSheet('Units');
  }
  // Selalu update header baris 1
  s.getRange(1, 1, 1, unitsHeaders.length).setValues([unitsHeaders]);
  Logger.log('Units headers: ' + unitsHeaders.length + ' kolom diset');

  // Activities — buat sheet baru kalau belum ada
  let a = ss.getSheetByName('Activities');
  if (!a) {
    a = ss.insertSheet('Activities');
    Logger.log('Sheet Activities dibuat');
  }
  const actHeaders = ['ID','UnitID','SerialNumber','Type','Date','TechnicianName','TechnicianId',
    'Description','PartsReplaced','Cost','NextSchedule','PhotoUrls','DocumentUrls','Notes','CreatedAt'];
  // Update header baris 1
  a.getRange(1, 1, 1, actHeaders.length).setValues([actHeaders]);
  Logger.log('Activities headers: ' + actHeaders.length + ' kolom diset');

  // Users — pastikan header benar
  let u = ss.getSheetByName('Users');
  if (!u) {
    u = ss.insertSheet('Users');
  }
  const userHeaders = ['ID','Email','Name','Role','PIN','CreatedAt'];
  u.getRange(1, 1, 1, userHeaders.length).setValues([userHeaders]);
  Logger.log('Users headers diset');

  Logger.log('✅ Setup selesai! Buka spreadsheet untuk cek hasilnya.');
}

function fixExistingData() {
  // Fungsi untuk migrasi 1 baris data lama ke format header baru
  // Struktur lama: ID,SerialNumber,ProductName,Category,Model,Manufacturer,
  //   CustomerName,CustomerPhone,Province,City,Address,Latitude,Longitude,
  //   InstallationDate,WarrantyEndDate,NextMaintenanceDate,LastServiceDate,
  //   Status,Notes,CreatedAt,UpdatedAt (21 kolom)
  // Struktur baru: 36 kolom sesuai header

  const sheet = getSheet('Units');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  Logger.log('Header saat ini: ' + headers.join(' | '));
  Logger.log('Jumlah baris data: ' + (values.length - 1));

  // Cek apakah data sudah dalam format baru (kolom Brand di index 3)
  if (headers[3] === 'Brand' && values.length > 1) {
    // Data di baris 2 masih format lama - field-nya geser karena header sudah baru
    // Format lama kolom: ID(0), SerialNumber(1), ProductName(2), Category(3), Model(4),
    //   Manufacturer(5), CustomerName(6), CustomerPhone(7), Province(8), City(9),
    //   Address(10), Latitude(11), Longitude(12), InstallationDate(13),
    //   WarrantyEndDate(14), NextMaintenanceDate(15), LastServiceDate(16),
    //   Status(17), Notes(18), CreatedAt(19), UpdatedAt(20)

    for (let i = 1; i < values.length; i++) {
      const old = values[i];

      // Kalau data sudah punya nilai di kolom Brand (index 3) yang valid, skip
      // Tanda data sudah migrasi: FacilityName (index 8) berisi nilai yang masuk akal
      // Tanda data belum migrasi: Brand (index 3) berisi nilai Category lama
      if (old[3] === 'monitor' || old[3] === 'dialysis' || old[3] === 'laboratory' ||
          old[3] === 'imaging' || old[3] === 'ventilator' || old[3] === 'other') {
        // Data masih format lama, fix sekarang
        const id             = old[0];
        const serialNumber   = old[1];
        const productName    = old[2];
        const category       = old[3]; // ini sebenarnya category
        const model          = old[4];
        const manufacturer   = old[5];
        const customerName   = old[6];
        const customerPhone  = old[7];
        const province       = old[8];
        const city           = old[9];
        const address        = old[10];
        const latitude       = old[11];
        const longitude      = old[12];
        const installDate    = old[13];
        const warrantyEnd    = old[14];
        const nextMaint      = old[15];
        const lastService    = old[16];
        const status         = old[17];
        const notes          = old[18];
        const createdAt      = old[19];
        const updatedAt      = old[20];

        // Tulis ulang baris dengan format baru
        const newRow = [
          id, serialNumber, productName,
          'IMEDIN',       // Brand (default)
          category,       // Category (benar)
          model,          // Model
          manufacturer,   // Manufacturer
          '',             // Batch
          customerName,   // FacilityName (pakai customerName sebagai fallback)
          '',             // Room
          '',             // PIC
          '',             // PICContact
          province,       // Province
          city,           // City
          '',             // District
          '',             // Village
          '',             // PostalCode
          address,        // Address
          latitude,       // Latitude
          longitude,      // Longitude
          '',             // GoogleMapsUrl
          customerName,   // CustomerName
          customerPhone,  // CustomerPhone
          '',             // DistributorName
          installDate,    // InstallationDate
          warrantyEnd,    // WarrantyEndDate
          nextMaint,      // NextMaintenanceDate
          lastService,    // LastServiceDate
          status,         // Status
          '',             // PhotoUrl
          '',             // PhotoUrls
          '',             // QRCodeUrl
          '',             // DocumentUrls
          notes,          // Notes
          createdAt,      // CreatedAt
          updatedAt       // UpdatedAt
        ];

        sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
        Logger.log('Baris ' + (i+1) + ' berhasil dimigrasi: ' + serialNumber);
      } else {
        Logger.log('Baris ' + (i+1) + ' sudah format baru, skip.');
      }
    }
  }

  Logger.log('✅ Migrasi selesai!');
}
