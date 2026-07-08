import { useState, useRef } from 'react';
import { importExportApi } from '@/services/api';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Filter,
  FileUp
} from 'lucide-react';

export default function ImportExport() {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [importData, setImportData] = useState<Record<string, string>[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exportFilters, setExportFilters] = useState({ province: '', category: '', status: '' });
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file: File) => {
    setImportFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        let jsonData: Record<string, string>[] = [];

        if (file.name.endsWith('.csv')) {
          const text = data as string;
          const lines = text.split('\n').filter(l => l.trim());
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          const rows = lines.slice(1, 6).map(line => {
            const values: string[] = [];
            let current = '';
            let inQuotes = false;
            for (const char of line) {
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim());
            return values;
          });
          setImportPreview({ headers, rows });
          jsonData = lines.slice(1).map(line => {
            const values: string[] = [];
            let current = '';
            let inQuotes = false;
            for (const char of line) {
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim());
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = values[i] || ''; });
            return obj;
          });
        } else {
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, string>[];
          const headers = Object.keys(jsonData[0] || {});
          const rows = jsonData.slice(0, 5).map(row => headers.map(h => String(row[h] || '')));
          setImportPreview({ headers, rows });
        }

        setImportData(jsonData);
      } catch {
        setImportPreview(null);
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleImport = async () => {
    if (!importData || importData.length === 0) return;

    setImporting(true);
    try {
      const result = await importExportApi.importUnits(importData);
      if (result.success && result.data) {
        setImportResult(result.data);
      }
    } catch {
      // handle error
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await importExportApi.exportUnits(exportFormat, exportFilters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imedin_units_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // handle error
    } finally {
      setExporting(false);
    }
  };

  const clearImport = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setImportData([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1d]" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Import / Export
        </h1>
        <p className="text-sm text-[#8b8f95] mt-0.5">
          Import data unit dari file Excel/CSV atau export data ke file
        </p>
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-4">
          <FileUp size={20} className="text-[#3b82f6]" />
          <h2 className="text-lg font-semibold text-[#1d1d1d]">Import Data</h2>
        </div>

        {!importPreview ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-[#3b82f6] bg-blue-50/50'
                : 'border-[#e6e6e8] hover:border-[#8b8f95] hover:bg-[#fafafa]'
            }`}
          >
            <Upload size={48} className="mx-auto mb-4 text-[#e6e6e8]" />
            <p className="text-sm font-medium text-[#1d1d1d] mb-1">
              Drag & drop file Excel atau CSV di sini
            </p>
            <p className="text-xs text-[#8b8f95] mb-4">
              atau klik untuk memilih file
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-[#8b8f95]">
              <span className="flex items-center gap-1">
                <FileSpreadsheet size={14} className="text-emerald-600" />
                .xlsx
              </span>
              <span className="flex items-center gap-1">
                <FileText size={14} className="text-blue-600" />
                .csv
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={24} className="text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-[#1d1d1d]">{importFile?.name}</p>
                  <p className="text-xs text-[#8b8f95]">{importPreview.rows.length} baris preview (total: lebih banyak)</p>
                </div>
              </div>
              <button onClick={clearImport} className="p-1.5 rounded-lg hover:bg-red-50 text-[#8b8f95] hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#e6e6e8]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f7f7f5]">
                    {importPreview.headers.map((h, i) => (
                      <th key={i} className="text-left text-xs font-medium uppercase tracking-wider text-[#8b8f95] px-3 py-2 border-b border-[#e6e6e8]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.map((row, i) => (
                    <tr key={i} className={`border-b border-[#e6e6e8] ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 text-[#1d1d1d] truncate max-w-[200px]">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importResult ? (
              <div className={`p-4 rounded-lg border ${importResult.errors.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {importResult.errors.length > 0 ? <AlertCircle size={18} className="text-amber-600" /> : <CheckCircle2 size={18} className="text-emerald-600" />}
                  <p className={`text-sm font-medium ${importResult.errors.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {importResult.imported} data berhasil diimpor
                  </p>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-amber-600 font-medium">Errors:</p>
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <p key={i} className="text-xs text-amber-600">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-end gap-3">
                <button
                  onClick={clearImport}
                  className="px-4 py-2.5 border border-[#e6e6e8] rounded-lg text-sm text-[#8b8f95] hover:bg-[#f7f7f5]"
                >
                  Batal
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="px-6 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
                >
                  {importing ? 'Mengimpor...' : 'Konfirmasi Import'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-xl border border-[#e6e6e8] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-4">
          <Download size={20} className="text-[#3b82f6]" />
          <h2 className="text-lg font-semibold text-[#1d1d1d]">Export Data</h2>
        </div>

        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8b8f95] mb-1">Format</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setExportFormat('xlsx')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-all ${
                    exportFormat === 'xlsx'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'border-[#e6e6e8] text-[#8b8f95] hover:bg-[#f7f7f5]'
                  }`}
                >
                  <FileSpreadsheet size={16} />
                  XLSX
                </button>
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-all ${
                    exportFormat === 'csv'
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-[#e6e6e8] text-[#8b8f95] hover:bg-[#f7f7f5]'
                  }`}
                >
                  <FileText size={16} />
                  CSV
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8b8f95] mb-1">
                <Filter size={12} className="inline mr-1" />
                Filter Status
              </label>
              <select
                value={exportFilters.status}
                onChange={e => setExportFilters({ ...exportFilters, status: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="">Semua Status</option>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="overdue">Overdue</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8b8f95] mb-1">
                <Filter size={12} className="inline mr-1" />
                Filter Category
              </label>
              <select
                value={exportFilters.category}
                onChange={e => setExportFilters({ ...exportFilters, category: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="">Semua Kategori</option>
                <option value="dialysis">Dialysis</option>
                <option value="laboratory">Laboratory</option>
                <option value="imaging">Imaging</option>
                <option value="ventilator">Ventilator</option>
                <option value="monitor">Monitor</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1e2022] text-white rounded-lg text-sm font-medium hover:bg-[#2c2f33] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Download size={18} />
              {exporting ? 'Mengekspor...' : `Export ${exportFormat.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>

      {/* Template Download */}
      <div className="bg-[#f7f7f5] rounded-xl border border-[#e6e6e8] p-6">
        <h3 className="text-sm font-semibold text-[#1d1d1d] mb-3">Template Import</h3>
        <p className="text-xs text-[#8b8f95] mb-4">
          Download template Excel untuk memastikan format data Anda sesuai dengan sistem.
        </p>
        <button
          onClick={() => {
            const headers = ['Serial Number', 'Product Name', 'Category', 'Model', 'Manufacturer', 'Customer Name', 'Customer Phone', 'Province', 'City', 'Address', 'Latitude', 'Longitude', 'Installation Date', 'Warranty End Date', 'Next Maintenance Date', 'Status', 'Notes'];
            const sample = ['IMD-20230001', 'Hemodialysis Machine HD-500', 'dialysis', 'HD-500', 'IMEDIN Medical', 'RS Jakarta', '08123456789', 'DKI Jakarta', 'Jakarta', 'Jl. Kesehatan No. 1', '-6.2088', '106.8456', '2024-01-15', '2026-01-15', '2025-07-15', 'active', 'Unit baru terpasang'];
            const csv = [headers, sample].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'imedin_import_template.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-2.5 border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] hover:bg-white transition-colors"
        >
          <FileSpreadsheet size={16} />
          Download Template CSV
        </button>
      </div>
    </div>
  );
}
