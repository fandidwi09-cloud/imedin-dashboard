import { useState, useRef, useEffect, useCallback } from 'react';
import { unitsApi, servicesApi } from '@/services/api';
import {
  Camera,
  CameraOff,
  Search,
  CheckCircle2,
  ClipboardList,
  Package,
  MapPin,
  Calendar,
  AlertTriangle,
  X,
  RotateCcw
} from 'lucide-react';
import type { Unit } from '@/types';

export default function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [foundUnit, setFoundUnit] = useState<Unit | null>(null);
  const [scannedCode, setScannedCode] = useState('');
  const [serviceLogOpen, setServiceLogOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    serviceType: 'routine' as const,
    description: '',
    technicianName: '',
    partsReplaced: '',
    cost: '',
    nextServiceDate: '',
    notes: ''
  });
  const [savingService, setSavingService] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = async () => {
    setCameraError('');
    setScanning(true);
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    let active = true;

    const setupCamera = async () => {
      if (scanning && !streamRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
          });

          if (!active) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(console.error);
          }
        } catch (err) {
          console.error('Camera error:', err);
          setCameraError('Tidak dapat mengakses kamera. Pastikan Anda memberikan izin kamera.');
          setScanning(false);
        }
      }
    };

    setupCamera();

    return () => {
      active = false;
    };
  }, [scanning]);

  const scanQRCode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const jsQR = (await import('jsqr')).default;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        setScannedCode(code.data);
        stopCamera();
        const result = await unitsApi.getBySerialNumber(code.data);
        if (result.success && result.data) {
          setFoundUnit(result.data);
        } else {
          setFoundUnit(null);
        }
      }
    } catch {
      // QR scan failed silently, will retry
    }
  }, [scanning]);

  useEffect(() => {
    if (scanning) {
      scanIntervalRef.current = setInterval(scanQRCode, 500);
    }
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [scanning, scanQRCode]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleManualSearch = async () => {
    if (!manualInput.trim()) return;
    setScannedCode(manualInput);
    const result = await unitsApi.getBySerialNumber(manualInput);
    if (result.success && result.data) {
      setFoundUnit(result.data);
    } else {
      setFoundUnit(null);
    }
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundUnit) return;
    setSavingService(true);
    try {
      await servicesApi.create({
        unitId: foundUnit.id,
        serialNumber: foundUnit.serialNumber,
        serviceType: serviceForm.serviceType,
        serviceDate: new Date().toISOString().split('T')[0],
        technicianName: serviceForm.technicianName,
        description: serviceForm.description,
        partsReplaced: serviceForm.partsReplaced,
        cost: parseFloat(serviceForm.cost) || 0,
        nextServiceDate: serviceForm.nextServiceDate,
        notes: serviceForm.notes
      });
      setServiceLogOpen(false);
      setServiceForm({
        serviceType: 'routine',
        description: '',
        technicianName: '',
        partsReplaced: '',
        cost: '',
        nextServiceDate: '',
        notes: ''
      });
    } catch {
      // handle error
    } finally {
      setSavingService(false);
    }
  };

  const resetScan = () => {
    setFoundUnit(null);
    setScannedCode('');
    setManualInput('');
    setServiceLogOpen(false);
  };

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
    overdue: 'bg-red-50 text-red-700 border-red-200',
    inactive: 'bg-gray-50 text-gray-600 border-gray-200'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1d]" style={{ fontFamily: 'Poppins, sans-serif' }}>
          QR Scanner
        </h1>
        <p className="text-sm text-[#8b8f95] mt-0.5">
          Scan serial number unit untuk melihat detail dan mencatat servis
        </p>
      </div>

      {/* Scanner View */}
      {!foundUnit && (
        <div className="space-y-4">
          {/* Camera View */}
          <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '480px' }}>
            {scanning ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                {/* Viewfinder Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-64 h-64">
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg" />
                    {/* Scanning line */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#3b82f6] animate-pulse" 
                      style={{ animation: 'scanLine 2s linear infinite' }} 
                    />
                  </div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-white/80 text-sm">Arahkan kamera ke QR code serial number</p>
                </div>
                <button
                  onClick={stopCamera}
                  className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <CameraOff size={20} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white/60">
                <Camera size={64} className="mb-4" />
                <p className="text-lg font-medium mb-2">Kamera Tidak Aktif</p>
                <p className="text-sm mb-6">Aktifkan kamera untuk memindai QR code</p>
                <button
                  onClick={startCamera}
                  className="flex items-center gap-2 px-6 py-3 bg-[#3b82f6] text-white rounded-xl text-sm font-medium hover:bg-blue-600 active:scale-[0.98] transition-all"
                >
                  <Camera size={18} />
                  Aktifkan Kamera
                </button>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
              <AlertTriangle size={18} />
              {cameraError}
            </div>
          )}

          {/* Manual Input */}
          <div className="bg-white rounded-xl border border-[#e6e6e8] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-sm text-[#8b8f95] mb-3">Atau masukkan serial number secara manual:</p>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]" />
                <input
                  type="text"
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
                  placeholder="Masukkan serial number (contoh: IMD-20230001)"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] placeholder:text-[#8b8f95] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15"
                />
              </div>
              <button
                onClick={handleManualSearch}
                className="px-6 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 active:scale-[0.98] transition-all"
              >
                Cari
              </button>
            </div>
          </div>

          {scannedCode && !foundUnit && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center gap-2">
              <AlertTriangle size={18} />
              Unit dengan serial number <strong>{scannedCode}</strong> tidak ditemukan dalam database.
            </div>
          )}
        </div>
      )}

      {/* Found Unit Details */}
      {foundUnit && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-[#8b8f95]">Unit Ditemukan</p>
                <p className="text-lg font-semibold text-[#1d1d1d] font-mono">{foundUnit.serialNumber}</p>
              </div>
            </div>
            <button
              onClick={resetScan}
              className="flex items-center gap-2 px-4 py-2.5 border border-[#e6e6e8] rounded-lg text-sm text-[#8b8f95] hover:bg-[#f7f7f5] transition-colors"
            >
              <RotateCcw size={16} />
              Scan Lagi
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Unit Info Card */}
            <div className="bg-white rounded-xl border border-[#e6e6e8] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#1d1d1d]">{foundUnit.productName}</h3>
                  <p className="text-sm text-[#8b8f95]">{foundUnit.model} - {foundUnit.manufacturer}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[foundUnit.status]}`}>
                  {foundUnit.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Package size={16} className="text-[#3b82f6]" />
                  <div>
                    <p className="text-xs text-[#8b8f95]">Kategori</p>
                    <p className="text-sm text-[#1d1d1d] capitalize">{foundUnit.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-[#3b82f6]" />
                  <div>
                    <p className="text-xs text-[#8b8f95]">Lokasi</p>
                    <p className="text-sm text-[#1d1d1d]">{foundUnit.customerName}</p>
                    <p className="text-xs text-[#8b8f95]">{foundUnit.address}, {foundUnit.city}, {foundUnit.province}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-[#3b82f6]" />
                  <div>
                    <p className="text-xs text-[#8b8f95]">Tanggal Instalasi</p>
                    <p className="text-sm text-[#1d1d1d]">{foundUnit.installationDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-amber-500" />
                  <div>
                    <p className="text-xs text-[#8b8f95]">Garansi Hingga</p>
                    <p className="text-sm text-[#1d1d1d]">{foundUnit.warrantyEndDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={16} className={foundUnit.status === 'overdue' ? 'text-red-500' : 'text-emerald-500'} />
                  <div>
                    <p className="text-xs text-[#8b8f95]">Maintenance Berikutnya</p>
                    <p className={`text-sm font-medium ${foundUnit.status === 'overdue' ? 'text-red-600' : 'text-[#1d1d1d]'}`}>
                      {foundUnit.nextMaintenanceDate}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setServiceLogOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#3b82f6] text-white rounded-xl text-sm font-medium hover:bg-blue-600 active:scale-[0.98] transition-all"
                >
                  <ClipboardList size={18} />
                  Log Service Entry
                </button>
              </div>
            </div>

            {/* Service History Mini */}
            <ServiceHistoryMini unitId={foundUnit.id} serialNumber={foundUnit.serialNumber} />
          </div>
        </div>
      )}

      {/* Service Log Modal */}
      {serviceLogOpen && foundUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e6e8]">
              <h3 className="text-lg font-semibold text-[#1d1d1d]">Log Service Entry</h3>
              <button onClick={() => setServiceLogOpen(false)} className="p-1.5 rounded-lg hover:bg-[#f7f7f5]">
                <X size={20} className="text-[#8b8f95]" />
              </button>
            </div>
            <form onSubmit={handleServiceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8b8f95] mb-1">Serial Number</label>
                <input value={foundUnit.serialNumber} disabled className="w-full px-3 py-2 bg-gray-100 border border-[#e6e6e8] rounded-lg text-sm text-[#8b8f95]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8b8f95] mb-1">Service Type</label>
                <select
                  value={serviceForm.serviceType}
                  onChange={e => setServiceForm({ ...serviceForm, serviceType: e.target.value as typeof serviceForm.serviceType })}
                  className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
                >
                  <option value="routine">Routine Maintenance</option>
                  <option value="repair">Repair</option>
                  <option value="warranty">Warranty Claim</option>
                  <option value="calibration">Calibration</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8b8f95] mb-1">Technician Name</label>
                <input
                  value={serviceForm.technicianName}
                  onChange={e => setServiceForm({ ...serviceForm, technicianName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
                  placeholder="Nama teknisi"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8b8f95] mb-1">Description</label>
                <textarea
                  value={serviceForm.description}
                  onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6] resize-none"
                  placeholder="Deskripsi pekerjaan yang dilakukan"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#8b8f95] mb-1">Parts Replaced</label>
                  <input
                    value={serviceForm.partsReplaced}
                    onChange={e => setServiceForm({ ...serviceForm, partsReplaced: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d]"
                    placeholder="Filter, Sensor, dll"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8b8f95] mb-1">Cost (Rp)</label>
                  <input
                    type="number"
                    value={serviceForm.cost}
                    onChange={e => setServiceForm({ ...serviceForm, cost: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d]"
                    placeholder="500000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8b8f95] mb-1">Next Service Date</label>
                <input
                  type="date"
                  value={serviceForm.nextServiceDate}
                  onChange={e => setServiceForm({ ...serviceForm, nextServiceDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8b8f95] mb-1">Notes</label>
                <input
                  value={serviceForm.notes}
                  onChange={e => setServiceForm({ ...serviceForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d]"
                  placeholder="Catatan tambahan"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setServiceLogOpen(false)}
                  className="px-4 py-2.5 border border-[#e6e6e8] rounded-lg text-sm text-[#8b8f95] hover:bg-[#f7f7f5]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingService}
                  className="px-6 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
                >
                  {savingService ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
}

function ServiceHistoryMini({ unitId, serialNumber }: { unitId: string; serialNumber: string }) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    servicesApi.getBySerialNumber(serialNumber).then(result => {
      if (result.success && result.data) {
        setServices(result.data.slice(0, 5));
      }
      setLoading(false);
    });
  }, [unitId, serialNumber]);

  const serviceTypeColors: Record<string, string> = {
    installation: 'bg-blue-50 text-blue-700',
    routine: 'bg-emerald-50 text-emerald-700',
    repair: 'bg-red-50 text-red-700',
    warranty: 'bg-amber-50 text-amber-700',
    calibration: 'bg-purple-50 text-purple-700'
  };

  return (
    <div className="bg-white rounded-xl border border-[#e6e6e8] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <h3 className="text-sm font-semibold text-[#1d1d1d] uppercase tracking-wider mb-4">Riwayat Service</h3>
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-8 text-sm text-[#8b8f95]">
          <ClipboardList size={32} className="mx-auto mb-2 text-[#e6e6e8]" />
          Belum ada riwayat service
        </div>
      ) : (
        <div className="space-y-3">
          {services.map(service => (
            <div key={service.id} className="p-3 rounded-lg bg-[#f7f7f5] border border-[#e6e6e8]">
              <div className="flex items-center justify-between mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${serviceTypeColors[service.serviceType] || 'bg-gray-50 text-gray-600'}`}>
                  {service.serviceType}
                </span>
                <span className="text-xs text-[#8b8f95]">{service.serviceDate}</span>
              </div>
              <p className="text-sm text-[#1d1d1d] truncate">{service.description}</p>
              <p className="text-xs text-[#8b8f95]">{service.technicianName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
