import { useState, useEffect } from 'react';
import { usersApi, importExportApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import {
  Users, Plus, Pencil, Trash2, X, AlertCircle, Loader2,
  Upload, Download, Shield, Wrench, Eye, CheckCircle2
} from 'lucide-react';
import type { User, UserRole } from '@/types';

const roleConfig: Record<UserRole, { label: string; color: string; icon: React.ElementType }> = {
  admin:   { label: 'Admin',   color: 'bg-blue-100 text-blue-700 border-blue-200',    icon: Shield },
  teknisi: { label: 'Teknisi', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Wrench },
  viewer:  { label: 'Viewer',  color: 'bg-gray-100 text-gray-600 border-gray-200',    icon: Eye },
  guest:   { label: 'Guest',   color: 'bg-gray-100 text-gray-400 border-gray-200',    icon: Eye },
};

type TabKey = 'users' | 'import' | 'export';

export default function Administration() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<TabKey>('users');
  const [users, setUsers] = useState<Omit<User, 'pin'>[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Omit<User, 'pin'> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: '', name: '', role: 'viewer' as UserRole, pin: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    const r = await usersApi.getAll();
    if (r.success && r.data) setUsers(r.data);
    setLoadingUsers(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleNewUser = () => {
    setEditingUser(null);
    setFormData({ email: '', name: '', role: 'viewer', pin: '' });
    setFormError('');
    setShowForm(true);
  };

  const handleEditUser = (u: Omit<User, 'pin'>) => {
    setEditingUser(u);
    setFormData({ email: u.email, name: u.name, role: u.role as UserRole, pin: '' });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.email || !formData.name) { setFormError('Email dan nama wajib diisi'); return; }
    if (!editingUser && !formData.pin) { setFormError('PIN wajib diisi untuk user baru'); return; }
    setSaving(true);
    try {
      const r = editingUser
        ? await usersApi.update(editingUser.id, { name: formData.name, role: formData.role, ...(formData.pin && { pin: formData.pin }) })
        : await usersApi.create(formData);
      if (r.success) { setShowForm(false); loadUsers(); }
      else setFormError(r.message || 'Gagal menyimpan');
    } catch { setFormError('Terjadi kesalahan'); }
    finally { setSaving(false); }
  };

  const handleDeleteUser = async (id: string) => {
    await usersApi.delete(id);
    setDeleteConfirm(null);
    loadUsers();
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await importFile.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.replace(/"/g, '').trim());
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
      });
      const r = await importExportApi.importUnits(rows);
      if (r.success && r.data) setImportResult(r.data);
    } catch { setImportResult({ imported: 0, errors: ['Gagal memproses file'] }); }
    finally { setImporting(false); }
  };

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setExporting(true);
    try {
      const blob = await importExportApi.exportUnits(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `IMEDIN_Export_${new Date().toISOString().split('T')[0]}.${format}`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  const downloadTemplate = () => {
    const headers = 'serialNumber,productName,brand,category,model,manufacturer,facilityName,province,city,address,installationDate,warrantyEndDate,status';
    const example = 'IMD-20230001,Patient Monitor PM-700,IMEDIN,monitor,PM-700,IMEDIN Medical,RSUD Jakarta,DKI Jakarta,Jakarta,Jl. Kesehatan No.1,2023-01-01,2025-01-01,active';
    const blob = new Blob([headers + '\n' + example], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Template_Import_IMEDIN.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1d]" style={{ fontFamily: 'Poppins,sans-serif' }}>Administrasi</h1>
        <p className="text-sm text-[#8b8f95] mt-0.5">Manajemen user dan data</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f0f0f0] p-1 rounded-xl w-fit">
        {[
          { key: 'users', label: 'User Management', icon: Users },
          { key: 'import', label: 'Import Data', icon: Upload },
          { key: 'export', label: 'Export Data', icon: Download },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as TabKey)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-[#1d1d1d] shadow-sm' : 'text-[#8b8f95] hover:text-[#1d1d1d]'}`}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>

      {/* Tab: Users */}
      {tab === 'users' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[#8b8f95]">{users.length} user terdaftar</p>
            <button onClick={handleNewUser} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all">
              <Plus size={15} /> Tambah User
            </button>
          </div>
          <div className="bg-white rounded-xl border border-[#e6e6e8] shadow-sm overflow-hidden">
            {loadingUsers ? (
              <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />)}</div>
            ) : (
              <div className="divide-y divide-[#f0f0f0]">
                {users.map(u => {
                  const rc = roleConfig[u.role as UserRole] ?? roleConfig.viewer;
                  const RIcon = rc.icon;
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-10 h-10 rounded-full bg-[#3b82f6] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-[#1d1d1d]">{u.name}</p>
                          {isSelf && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">Anda</span>}
                        </div>
                        <p className="text-xs text-[#8b8f95]">{u.email}</p>
                      </div>
                      <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${rc.color}`}>
                        <RIcon size={11} />{rc.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditUser(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#8b8f95] hover:text-[#3b82f6] transition-colors">
                          <Pencil size={15} />
                        </button>
                        {!isSelf && (
                          <button onClick={() => setDeleteConfirm(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#8b8f95] hover:text-red-500 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Import */}
      {tab === 'import' && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white rounded-xl border border-[#e6e6e8] p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <AlertCircle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Format Import</p>
                <p className="text-xs">File harus berformat CSV. Download template untuk melihat format yang benar.</p>
              </div>
            </div>
            <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 border border-[#e6e6e8] rounded-lg text-sm hover:bg-[#f7f7f5] transition-colors">
              <Download size={15} /> Download Template CSV
            </button>
            <div>
              <label className="block text-xs font-medium text-[#8b8f95] mb-2">Pilih File CSV</label>
              <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-[#8b8f95] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-[#3b82f6] file:text-white hover:file:bg-blue-600 file:cursor-pointer" />
            </div>
            {importFile && (
              <div className="p-3 bg-[#f7f7f5] rounded-lg text-sm">
                <p className="font-medium text-[#1d1d1d]">{importFile.name}</p>
                <p className="text-xs text-[#8b8f95] mt-0.5">{(importFile.size / 1024).toFixed(1)} KB</p>
              </div>
            )}
            <button onClick={handleImport} disabled={!importFile || importing}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-all">
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {importing ? 'Mengimpor...' : 'Import Sekarang'}
            </button>
            {importResult && (
              <div className={`p-4 rounded-lg border ${importResult.errors.length === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} className={importResult.errors.length === 0 ? 'text-emerald-500' : 'text-amber-500'} />
                  <span className="text-sm font-medium">{importResult.imported} unit berhasil diimpor</span>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="text-xs text-amber-700 space-y-1">
                    {importResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Export */}
      {tab === 'export' && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white rounded-xl border border-[#e6e6e8] p-5 shadow-sm">
            <h3 className="font-medium text-[#1d1d1d] mb-4">Export Data Aset</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => handleExport('xlsx')} disabled={exporting}
                className="flex items-center justify-center gap-3 p-5 border-2 border-[#e6e6e8] rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all group disabled:opacity-50">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Download size={20} className="text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-[#1d1d1d] text-sm">Export Excel</p>
                  <p className="text-xs text-[#8b8f95]">Format .xlsx</p>
                </div>
              </button>
              <button onClick={() => handleExport('csv')} disabled={exporting}
                className="flex items-center justify-center gap-3 p-5 border-2 border-[#e6e6e8] rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group disabled:opacity-50">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Download size={20} className="text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-[#1d1d1d] text-sm">Export CSV</p>
                  <p className="text-xs text-[#8b8f95]">Format .csv</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e6e6e8]">
              <h3 className="font-semibold text-[#1d1d1d]">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[#f7f7f5]"><X size={18} className="text-[#8b8f95]" /></button>
            </div>
            {formError && <div className="mx-5 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2"><AlertCircle size={14} />{formError}</div>}
            <form onSubmit={handleSubmitUser} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#8b8f95] mb-1">Email *</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingUser} className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6] disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8b8f95] mb-1">Nama *</label>
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8b8f95] mb-1">Role</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]">
                  <option value="admin">Admin</option>
                  <option value="teknisi">Teknisi</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8b8f95] mb-1">{editingUser ? 'PIN Baru (kosongkan jika tidak diubah)' : 'PIN *'}</label>
                <input type="password" value={formData.pin} onChange={e => setFormData({ ...formData, pin: e.target.value })}
                  maxLength={6} placeholder={editingUser ? '••••••' : 'Min. 4 digit'}
                  className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-[#e6e6e8] rounded-lg text-sm text-[#8b8f95] hover:bg-[#f7f7f5]">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50">
                  {saving ? <Loader2 size={15} className="animate-spin mx-auto" /> : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3"><Trash2 size={22} className="text-red-500" /></div>
            <h3 className="font-semibold text-[#1d1d1d] mb-1">Hapus User?</h3>
            <p className="text-sm text-[#8b8f95] mb-5">User ini akan dihapus permanen.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-[#e6e6e8] rounded-lg text-sm text-[#8b8f95] hover:bg-[#f7f7f5]">Batal</button>
              <button onClick={() => handleDeleteUser(deleteConfirm!)} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
