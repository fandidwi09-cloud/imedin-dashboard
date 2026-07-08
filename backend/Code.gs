/**
 * ============================================================
 * IMEDIN - Google Apps Script Backend (FIXED)
 * ============================================================
 * 
 * INSTRUKSI DEPLOYMENT:
 * 1. Buka https://script.google.com dan buat project baru
 * 2. Copy seluruh kode ini ke editor
 * 3. Buat Google Sheet dengan nama "IMEDIN_Database"
 * 4. Buat sheets berikut: "Units", "ServiceHistory", "Users"
 * 5. Sesuaikan SPREADSHEET_ID di bawah
 * 6. Deploy sebagai Web App (Publish > Deploy as web app)
 * 7. Set access to "Anyone" (untuk API publik) atau sesuai kebutuhan
 * 8. Copy URL web app dan paste di frontend (api.ts -> GAS_BASE_URL)
 * 
 * Sheet Structure:
 * - Units: ID, SerialNumber, ProductName, Category, Model, Manufacturer,
 *          CustomerName, CustomerPhone, Province, City, Address,
 *          Latitude, Longitude, InstallationDate, WarrantyEndDate,
 *          NextMaintenanceDate, LastServiceDate, Status, Notes, CreatedAt, UpdatedAt
 * - ServiceHistory: ID, UnitID, SerialNumber, ServiceType, ServiceDate,
 *                   TechnicianName, Description, PartsReplaced, Cost,
 *                   NextServiceDate, Notes, CreatedAt
 * - Users: ID, Email, Name, Role, PIN (hashed), CreatedAt
 * 
 * FIXES APPLIED:
 * - Moved deleteUnit to doGet (frontend sends GET)
 * - Added exportUnits handler to doGet
 * - Fixed recentServices to return actual data from ServiceHistory sheet
 * - Fixed handleUpdateUnit to preserve existing fields on partial update
 * - Fixed UpdatedAt column index (20 instead of 21)
 * - Removed duplicate doOptions function
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

// ============================================================
// Utility Functions
// ============================================================
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(sheetName);
}

function generateId(prefix) {
  return prefix + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function hashPin(pin) {
  const signature = Utilities.computeHmacSha256Signature(pin, 'IMEDIN_SECRET_KEY');
  return signature.map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0')).join('');
}

function jsonResponse(data, statusCode) {
  statusCode = statusCode || 200;
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    switch (action) {
      case 'getUnits':
        return handleGetUnits(e);
      case 'getUnit':
        return handleGetUnit(e);
      case 'getUnitBySerial':
        return handleGetUnitBySerial(e);
      case 'getServices':
        return handleGetServices(e);
      case 'getServicesBySerial':
        return handleGetServicesBySerial(e);
      case 'getDashboardStats':
        return handleGetDashboardStats();
      case 'getAlerts':
        return handleGetAlerts();
      case 'login':
        return handleLogin(e);
      case 'checkEmail':
        return handleCheckEmail(e);
      // [FIX] deleteUnit moved here — frontend sends GET request
      case 'deleteUnit':
        return handleDeleteUnit(e);
      // [FIX] exportUnits handler added — was completely missing
      case 'exportUnits':
        return handleExportUnits(e);
      default:
        return jsonResponse({ success: false, message: 'Unknown action' }, 400);
    }
  } catch (error) {
    return jsonResponse({ success: false, message: error.toString() }, 500);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  const action = e.parameter.action;
  const data = JSON.parse(e.postData.contents);
  
  try {
    switch (action) {
      case 'login':
        return handleLoginPost(data);
      case 'resetPin':
        return handleResetPin(data);
      case 'createUnit':
        return handleCreateUnit(data);
      case 'updateUnit':
        return handleUpdateUnit(e, data);
      // [FIX] deleteUnit removed from doPost — frontend uses GET
      case 'createService':
        return handleCreateService(data);
      case 'importUnits':
        return handleImportUnits(data);
      default:
        return jsonResponse({ success: false, message: 'Unknown action' }, 400);
    }
  } catch (error) {
    return jsonResponse({ success: false, message: error.toString() }, 500);
  }
}

// ============================================================
// Auth Handlers
// ============================================================
function handleLogin(e) {
  const email = e.parameter.email;
  const pin = e.parameter.pin;
  
  if (!email || !pin) {
    return jsonResponse({ success: false, message: 'Email dan PIN diperlukan' }, 400);
  }
  
  const sheet = getSheet('Users');
  const values = sheet.getDataRange().getValues();
  const hashedPin = hashPin(pin);
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === email && values[i][4] === hashedPin) {
      return jsonResponse({
        success: true,
        data: {
          id: values[i][0],
          email: values[i][1],
          name: values[i][2],
          role: values[i][3]
        },
        message: 'Login berhasil'
      });
    }
  }
  
  return jsonResponse({ success: false, message: 'Email atau PIN salah' }, 401);
}

function handleLoginPost(data) {
  const sheet = getSheet('Users');
  const values = sheet.getDataRange().getValues();
  const hashedPin = hashPin(data.pin);
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === data.email && values[i][4] === hashedPin) {
      return jsonResponse({
        success: true,
        data: {
          id: values[i][0],
          email: values[i][1],
          name: values[i][2],
          role: values[i][3]
        },
        message: 'Login berhasil'
      });
    }
  }
  
  return jsonResponse({ success: false, message: 'Email atau PIN salah' }, 401);
}

function handleResetPin(data) {
  if (!data.email || !data.newPin) {
    return jsonResponse({ success: false, message: 'Email dan PIN baru diperlukan' }, 400);
  }
  const sheet = getSheet('Users');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === data.email) {
      const hashedPin = hashPin(data.newPin);
      sheet.getRange(i + 1, 5).setValue(hashedPin);
      return jsonResponse({ success: true, message: 'PIN berhasil direset' });
    }
  }
  return jsonResponse({ success: false, message: 'Email tidak ditemukan' }, 404);
}

function handleCheckEmail(e) {
  const email = e.parameter.email;
  if (!email) {
    return jsonResponse({ success: false, message: 'Email diperlukan' }, 400);
  }
  const sheet = getSheet('Users');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === email) {
      return jsonResponse({ success: true, data: { name: values[i][2] }, message: 'Email ditemukan' });
    }
  }
  return jsonResponse({ success: false, message: 'Email tidak terdaftar' }, 404);
}

// ============================================================
// Unit Handlers
// ============================================================
function handleGetUnits(e) {
  const sheet = getSheet('Units');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  let units = [];
  
  for (let i = 1; i < values.length; i++) {
    const unit = {};
    headers.forEach((h, idx) => {
      unit[h] = values[i][idx];
    });
    units.push(unit);
  }
  
  // Apply filters
  const search = e.parameter.search;
  const province = e.parameter.province;
  const category = e.parameter.category;
  const status = e.parameter.status;
  
  if (search) {
    const s = search.toLowerCase();
    units = units.filter(u => 
      (u.SerialNumber && u.SerialNumber.toLowerCase().includes(s)) ||
      (u.ProductName && u.ProductName.toLowerCase().includes(s)) ||
      (u.CustomerName && u.CustomerName.toLowerCase().includes(s)) ||
      (u.City && u.City.toLowerCase().includes(s))
    );
  }
  if (province) units = units.filter(u => u.Province === province);
  if (category) units = units.filter(u => u.Category === category);
  if (status) units = units.filter(u => u.Status === status);
  
  return jsonResponse({ success: true, data: units });
}

function handleGetUnit(e) {
  const id = e.parameter.id;
  const sheet = getSheet('Units');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      const unit = {};
      headers.forEach((h, idx) => { unit[h] = values[i][idx]; });
      return jsonResponse({ success: true, data: unit });
    }
  }
  
  return jsonResponse({ success: false, message: 'Unit tidak ditemukan' }, 404);
}

function handleGetUnitBySerial(e) {
  const serial = e.parameter.serial;
  const sheet = getSheet('Units');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][1].toString().toLowerCase() === serial.toLowerCase()) {
      const unit = {};
      headers.forEach((h, idx) => { unit[h] = values[i][idx]; });
      return jsonResponse({ success: true, data: unit });
    }
  }
  
  return jsonResponse({ success: false, message: 'Unit tidak ditemukan' }, 404);
}

function handleCreateUnit(data) {
  const sheet = getSheet('Units');
  const id = generateId('UNIT');
  const now = new Date().toISOString();
  
  sheet.appendRow([
    id, data.serialNumber, data.productName, data.category, data.model,
    data.manufacturer, data.customerName, data.customerPhone, data.province,
    data.city, data.address, data.latitude, data.longitude,
    data.installationDate, data.warrantyEndDate, data.nextMaintenanceDate,
    data.lastServiceDate || '', data.status, data.notes || '', now, now
  ]);
  
  return jsonResponse({ success: true, data: { id, ...data }, message: 'Unit berhasil ditambahkan' });
}

// [FIX] handleUpdateUnit — reads existing values first to preserve fields not in partial update.
// [FIX] UpdatedAt column corrected from 21 to 20 (column T, matching the 20th field).
function handleUpdateUnit(e, data) {
  const id = e.parameter.id;
  const sheet = getSheet('Units');
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      const now = new Date().toISOString();
      const row = i + 1;
      // Read existing row values to preserve fields not included in partial update
      const existing = values[i];
      const updates = [
        data.serialNumber !== undefined ? data.serialNumber : existing[1],
        data.productName !== undefined ? data.productName : existing[2],
        data.category !== undefined ? data.category : existing[3],
        data.model !== undefined ? data.model : existing[4],
        data.manufacturer !== undefined ? data.manufacturer : existing[5],
        data.customerName !== undefined ? data.customerName : existing[6],
        data.customerPhone !== undefined ? data.customerPhone : existing[7],
        data.province !== undefined ? data.province : existing[8],
        data.city !== undefined ? data.city : existing[9],
        data.address !== undefined ? data.address : existing[10],
        data.latitude !== undefined ? data.latitude : existing[11],
        data.longitude !== undefined ? data.longitude : existing[12],
        data.installationDate !== undefined ? data.installationDate : existing[13],
        data.warrantyEndDate !== undefined ? data.warrantyEndDate : existing[14],
        data.nextMaintenanceDate !== undefined ? data.nextMaintenanceDate : existing[15],
        data.lastServiceDate !== undefined ? data.lastServiceDate : existing[16],
        data.status !== undefined ? data.status : existing[17],
        data.notes !== undefined ? data.notes : existing[18]
      ];
      updates.forEach((val, idx) => {
        sheet.getRange(row, idx + 2).setValue(val);
      });
      sheet.getRange(row, 20).setValue(now); // UpdatedAt = column 20 (T)
      return jsonResponse({ success: true, message: 'Unit berhasil diperbarui' });
    }
  }
  
  return jsonResponse({ success: false, message: 'Unit tidak ditemukan' }, 404);
}

function handleDeleteUnit(e) {
  const id = e.parameter.id;
  const sheet = getSheet('Units');
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: 'Unit berhasil dihapus' });
    }
  }
  
  return jsonResponse({ success: false, message: 'Unit tidak ditemukan' }, 404);
}

// ============================================================
// Service History Handlers
// ============================================================
function handleGetServices(e) {
  const unitId = e.parameter.unitId;
  const sheet = getSheet('ServiceHistory');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  let services = [];
  
  for (let i = 1; i < values.length; i++) {
    if (!unitId || values[i][1] === unitId) {
      const service = {};
      headers.forEach((h, idx) => { service[h] = values[i][idx]; });
      services.push(service);
    }
  }
  
  return jsonResponse({ success: true, data: services });
}

function handleGetServicesBySerial(e) {
  const serial = e.parameter.serial;
  const sheet = getSheet('ServiceHistory');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  let services = [];
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][2].toString().toLowerCase() === serial.toLowerCase()) {
      const service = {};
      headers.forEach((h, idx) => { service[h] = values[i][idx]; });
      services.push(service);
    }
  }
  
  return jsonResponse({ success: true, data: services });
}

function handleCreateService(data) {
  const sheet = getSheet('ServiceHistory');
  const id = generateId('SRV');
  const now = new Date().toISOString();
  
  sheet.appendRow([
    id, data.unitId, data.serialNumber, data.serviceType, data.serviceDate,
    data.technicianName, data.description, data.partsReplaced || '',
    data.cost || 0, data.nextServiceDate || '', data.notes || '', now
  ]);
  
  // Update unit LastServiceDate and NextMaintenanceDate
  const unitSheet = getSheet('Units');
  const unitValues = unitSheet.getDataRange().getValues();
  for (let i = 1; i < unitValues.length; i++) {
    if (unitValues[i][0] === data.unitId) {
      unitSheet.getRange(i + 1, 17).setValue(data.serviceDate); // LastServiceDate (col Q)
      if (data.nextServiceDate) {
        unitSheet.getRange(i + 1, 16).setValue(data.nextServiceDate); // NextMaintenanceDate (col P)
      }
      break;
    }
  }
  
  return jsonResponse({ success: true, data: { id, ...data }, message: 'Service record berhasil ditambahkan' });
}

// ============================================================
// Dashboard & Alerts
// ============================================================
function handleGetDashboardStats() {
  const unitSheet = getSheet('Units');
  const unitValues = unitSheet.getDataRange().getValues();
  const headers = unitValues[0];
  
  let units = [];
  for (let i = 1; i < unitValues.length; i++) {
    const unit = {};
    headers.forEach((h, idx) => { unit[h] = unitValues[i][idx]; });
    units.push(unit);
  }
  
  const now = new Date();
  const thirtyDays = new Date();
  thirtyDays.setDate(now.getDate() + 30);
  
  const byProvince = {};
  const byCategory = {};
  const byStatus = {};
  
  units.forEach(u => {
    byProvince[u.Province] = (byProvince[u.Province] || 0) + 1;
    byCategory[u.Category] = (byCategory[u.Category] || 0) + 1;
    byStatus[u.Status] = (byStatus[u.Status] || 0) + 1;
  });
  
  const upcomingMaintenance = units
    .filter(u => {
      const d = new Date(u.NextMaintenanceDate);
      return d >= now && d <= thirtyDays;
    })
    .sort((a, b) => new Date(a.NextMaintenanceDate) - new Date(b.NextMaintenanceDate))
    .slice(0, 10);
  
  const warrantyExpiringUnits = units
    .filter(u => {
      const d = new Date(u.WarrantyEndDate);
      return d >= now && d <= thirtyDays;
    })
    .sort((a, b) => new Date(a.WarrantyEndDate) - new Date(b.WarrantyEndDate))
    .slice(0, 10);
  
  // [FIX] recentServices now fetches actual data from ServiceHistory sheet
  let recentServices = [];
  try {
    const serviceSheet = getSheet('ServiceHistory');
    const serviceValues = serviceSheet.getDataRange().getValues();
    const serviceHeaders = serviceValues[0];
    for (let i = 1; i < serviceValues.length; i++) {
      const service = {};
      serviceHeaders.forEach((h, idx) => { service[h] = serviceValues[i][idx]; });
      recentServices.push(service);
    }
    recentServices.sort((a, b) => new Date(b.ServiceDate) - new Date(a.ServiceDate));
    recentServices = recentServices.slice(0, 10);
  } catch (err) {
    recentServices = [];
  }
  
  return jsonResponse({
    success: true,
    data: {
      totalUnits: units.length,
      activeUnits: units.filter(u => u.Status === 'active').length,
      maintenanceOverdue: units.filter(u => u.Status === 'overdue').length,
      warrantyExpiring: warrantyExpiringUnits.length,
      byProvince,
      byCategory,
      byStatus,
      recentServices: recentServices,
      upcomingMaintenance,
      warrantyExpiringUnits
    }
  });
}

function handleGetAlerts() {
  const sheet = getSheet('Units');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  
  let units = [];
  for (let i = 1; i < values.length; i++) {
    const unit = {};
    headers.forEach((h, idx) => { unit[h] = values[i][idx]; });
    units.push(unit);
  }
  
  const now = new Date();
  const thirtyDays = new Date();
  thirtyDays.setDate(now.getDate() + 30);
  
  const alerts = [];
  
  units.forEach(u => {
    const maintDate = new Date(u.NextMaintenanceDate);
    const warrantyDate = new Date(u.WarrantyEndDate);
    
    if (maintDate < now) {
      alerts.push({
        id: 'alert-maint-' + u.ID,
        type: 'maintenance',
        unit: u,
        message: 'Maintenance overdue untuk ' + u.ProductName,
        dueDate: u.NextMaintenanceDate,
        severity: 'critical'
      });
    } else if (maintDate <= thirtyDays) {
      alerts.push({
        id: 'alert-maint-' + u.ID,
        type: 'maintenance',
        unit: u,
        message: 'Maintenance mendatang untuk ' + u.ProductName,
        dueDate: u.NextMaintenanceDate,
        severity: 'warning'
      });
    }
    
    if (warrantyDate >= now && warrantyDate <= thirtyDays) {
      alerts.push({
        id: 'alert-warranty-' + u.ID,
        type: 'warranty',
        unit: u,
        message: 'Garansi akan habis untuk ' + u.ProductName,
        dueDate: u.WarrantyEndDate,
        severity: 'warning'
      });
    }
  });
  
  alerts.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (a.severity !== 'critical' && b.severity === 'critical') return 1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  
  return jsonResponse({ success: true, data: alerts });
}

// ============================================================
// Import Handlers
// ============================================================
function handleImportUnits(data) {
  const sheet = getSheet('Units');
  let imported = 0;
  const errors = [];
  const now = new Date().toISOString();
  
  data.forEach((row, idx) => {
    try {
      const id = generateId('UNIT');
      sheet.appendRow([
        id,
        row.serialNumber || row['Serial Number'] || 'AUTO-' + Date.now(),
        row.productName || row['Product Name'] || 'Unknown',
        row.category || row['Category'] || 'other',
        row.model || row['Model'] || '',
        row.manufacturer || row['Manufacturer'] || 'IMEDIN Medical',
        row.customerName || row['Customer Name'] || '',
        row.customerPhone || row['Customer Phone'] || '',
        row.province || row['Province'] || '',
        row.city || row['City'] || '',
        row.address || row['Address'] || '',
        parseFloat(row.latitude || row['Latitude'] || '0'),
        parseFloat(row.longitude || row['Longitude'] || '0'),
        row.installationDate || row['Installation Date'] || now.split('T')[0],
        row.warrantyEndDate || row['Warranty End Date'] || now.split('T')[0],
        row.nextMaintenanceDate || row['Next Maintenance Date'] || now.split('T')[0],
        row.lastServiceDate || row['Last Service Date'] || '',
        row.status || row['Status'] || 'active',
        row.notes || row['Notes'] || '',
        now, now
      ]);
      imported++;
    } catch (err) {
      errors.push('Row ' + (idx + 1) + ': ' + err.toString());
    }
  });
  
  return jsonResponse({ success: true, data: { imported, errors }, message: imported + ' unit berhasil diimpor' });
}

// ============================================================
// Export Handler [NEW — was completely missing in original]
// ============================================================
function handleExportUnits(e) {
  const sheet = getSheet('Units');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  let units = [];
  
  for (let i = 1; i < values.length; i++) {
    const unit = {};
    headers.forEach((h, idx) => { unit[h] = values[i][idx]; });
    units.push(unit);
  }
  
  // Apply filters
  const province = e.parameter.province;
  const category = e.parameter.category;
  const status = e.parameter.status;
  
  if (province) units = units.filter(u => u.Province === province);
  if (category) units = units.filter(u => u.Category === category);
  if (status) units = units.filter(u => u.Status === status);
  
  // Build CSV content (GAS cannot generate .xlsx natively, so always CSV)
  const csvHeaders = ['ID', 'SerialNumber', 'ProductName', 'Category', 'Model', 'Manufacturer', 'CustomerName', 'CustomerPhone', 'Province', 'City', 'Address', 'Latitude', 'Longitude', 'InstallationDate', 'WarrantyEndDate', 'NextMaintenanceDate', 'LastServiceDate', 'Status', 'Notes'];
  const rows = units.map(u => csvHeaders.map(h => '"' + String(u[h] || '').replace(/"/g, '""') + '"').join(','));
  const csv = [csvHeaders.join(','), ...rows].join('\n');
  
  return ContentService.createTextOutput(csv)
    .setMimeType(ContentService.MimeType.CSV);
}

// ============================================================
// CORS Headers
// ============================================================
// Note: Google Apps Script handles CORS automatically for Web Apps.
// The doOptions function above is kept for reference but GAS does not invoke it.
