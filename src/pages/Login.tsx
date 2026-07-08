import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Activity, Eye, EyeOff, Mail, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import heroVideo from '@/assets/hero-logistics.mp4';
import { authApi } from '@/services/api';

type ForgotStep = 'email' | 'newpin' | 'done';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // State untuk modal Lupa PIN
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotName, setForgotName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      const result = await authApi.checkEmail(forgotEmail);
      if (result.success && result.data) {
        setForgotName(result.data.name);
        setForgotStep('newpin');
      } else {
        setForgotError(result.message || 'Email tidak ditemukan');
      }
    } catch {
      setForgotError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (newPin.length < 4) { setForgotError('PIN minimal 4 digit'); return; }
    if (newPin !== newPinConfirm) { setForgotError('PIN tidak cocok'); return; }
    setForgotLoading(true);
    try {
      const result = await authApi.resetPin(forgotEmail, newPin);
      if (result.success) {
        setForgotStep('done');
      } else {
        setForgotError(result.message || 'Gagal reset PIN');
      }
    } catch {
      setForgotError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotStep('email');
    setForgotEmail('');
    setNewPin('');
    setNewPinConfirm('');
    setForgotError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !pin) {
      setError('Email dan PIN harus diisi');
      setLoading(false);
      return;
    }

    try {
      const result = await login(email, pin);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || 'Login gagal');
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="relative flex min-h-screen bg-[#1e2022]">

      {/* Video background — tampil di semua ukuran layar */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-25"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e2022]/70 via-[#1e2022]/50 to-[#1e2022]/80" />
      </div>

      {/* Desktop: dua kolom — kiri teks, kanan form */}
      <div className="relative z-10 flex w-full">

        {/* Left Panel — hanya di desktop */}
        <div className="hidden lg:flex lg:w-[45%] flex-col p-12 justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#3b82f6] flex items-center justify-center">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>IMEDIN</h1>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#a0a4a8]">After-Sales & Service</p>
            </div>
          </div>

          {/* Tagline */}
          <div>
            <h2 className="text-4xl font-semibold text-white mb-4 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Platform Monitoring<br />
              <span className="text-[#3b82f6]">Medical Devices</span>
            </h2>
            <p className="text-[#a0a4a8] text-sm leading-relaxed max-w-sm">
              Sistem manajemen after-sales untuk memantau instalasi, perawatan, dan garansi perangkat medis IMEDIN di seluruh Indonesia.
            </p>
            <div className="mt-8 flex gap-6">
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                Real-time Tracking
              </div>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                QR Scanner
              </div>
            </div>
          </div>

          <p className="text-[#a0a4a8] text-xs">&copy; 2026 IMEDIN Medical Devices</p>
        </div>

        {/* Right Panel — form login */}
        <div className="flex-1 flex items-center justify-center p-6 min-h-screen">
          <div className="w-full max-w-md">

            {/* Mobile Logo — hanya di mobile */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-[#3b82f6] flex items-center justify-center">
                <Activity size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>IMEDIN</h1>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#a0a4a8]">After-Sales & Service</p>
              </div>
            </div>

            {/* Form card — semi transparan di mobile supaya video keliatan */}
            <div className="bg-white/95 lg:bg-white backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
              <h2 className="text-xl font-semibold text-[#1d1d1d] mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Selamat Datang
              </h2>
              <p className="text-sm text-[#8b8f95] mb-6">
                Masuk dengan email dan PIN Anda
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#8b8f95] mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@imedin.co.id"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] placeholder:text-[#8b8f95] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#8b8f95] mb-1.5">
                    PIN
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]" />
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={e => setPin(e.target.value)}
                      placeholder="Masukkan PIN"
                      maxLength={6}
                      className="w-full pl-10 pr-10 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm text-[#1d1d1d] placeholder:text-[#8b8f95] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8f95] hover:text-[#1d1d1d]"
                    >
                      {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Memuat...' : 'Log In'}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#e6e6e8]"/>
                  <span className="text-xs text-[#8b8f95]">atau</span>
                  <div className="flex-1 h-px bg-[#e6e6e8]"/>
                </div>

                {/* Guest button */}
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full py-2.5 bg-white border border-[#e6e6e8] text-[#8b8f95] rounded-lg text-sm font-medium hover:bg-[#f7f7f5] hover:text-[#1d1d1d] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  Lanjutkan sebagai Tamu
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-sm text-[#8b8f95] hover:text-[#3b82f6] transition-colors"
                >
                  Lupa PIN?
                </button>
              </div>
            </div>

            {/* Demo credentials */}
            <div className="mt-4 p-4 bg-black/30 backdrop-blur-sm rounded-xl border border-white/10">
              <p className="text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Demo Credentials</p>
              <div className="grid grid-cols-1 gap-1.5 text-xs text-white/60">
                <div className="flex justify-between">
                  <span>Admin:</span>
                  <span className="font-mono text-white/90">admin@imedin.co.id / 123456</span>
                </div>
                <div className="flex justify-between">
                  <span>Teknisi:</span>
                  <span className="font-mono text-white/90">teknisi@imedin.co.id / 123456</span>
                </div>
                <div className="flex justify-between">
                  <span>Viewer:</span>
                  <span className="font-mono text-white/90">viewer@imedin.co.id / 123456</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

      {/* Modal Lupa PIN */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">

            {forgotStep === 'email' && (
              <>
                <button onClick={closeForgot} className="flex items-center gap-1 text-xs text-[#8b8f95] hover:text-[#1d1d1d] mb-4 transition-colors">
                  <ArrowLeft size={14} /> Kembali ke Login
                </button>
                <h3 className="text-lg font-semibold text-[#1d1d1d] mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>Reset PIN</h3>
                <p className="text-sm text-[#8b8f95] mb-5">Masukkan email yang terdaftar di sistem.</p>
                {forgotError && <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{forgotError}</div>}
                <form onSubmit={handleForgotEmail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-[#8b8f95] mb-1.5">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]" />
                      <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                        placeholder="email@imedin.co.id" required
                        className="w-full pl-9 pr-4 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15 transition-all" />
                    </div>
                  </div>
                  <button type="submit" disabled={forgotLoading}
                    className="w-full py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all disabled:opacity-50">
                    {forgotLoading ? 'Memeriksa...' : 'Lanjutkan'}
                  </button>
                </form>
              </>
            )}

            {forgotStep === 'newpin' && (
              <>
                <button onClick={() => setForgotStep('email')} className="flex items-center gap-1 text-xs text-[#8b8f95] hover:text-[#1d1d1d] mb-4 transition-colors">
                  <ArrowLeft size={14} /> Kembali
                </button>
                <h3 className="text-lg font-semibold text-[#1d1d1d] mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>PIN Baru</h3>
                <p className="text-sm text-[#8b8f95] mb-1">Halo, <span className="font-medium text-[#1d1d1d]">{forgotName}</span>.</p>
                <p className="text-sm text-[#8b8f95] mb-5">Masukkan PIN baru kamu.</p>
                {forgotError && <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{forgotError}</div>}
                <form onSubmit={handleForgotReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-[#8b8f95] mb-1.5">PIN Baru</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]" />
                      <input type={showNewPin ? 'text' : 'password'} value={newPin} onChange={e => setNewPin(e.target.value)}
                        placeholder="Min. 4 digit" maxLength={6} required
                        className="w-full pl-9 pr-10 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15 transition-all" />
                      <button type="button" onClick={() => setShowNewPin(!showNewPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8f95]">
                        {showNewPin ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-[#8b8f95] mb-1.5">Konfirmasi PIN</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8f95]" />
                      <input type={showNewPin ? 'text' : 'password'} value={newPinConfirm} onChange={e => setNewPinConfirm(e.target.value)}
                        placeholder="Ulangi PIN baru" maxLength={6} required
                        className="w-full pl-9 pr-4 py-2.5 bg-[#f7f7f5] border border-[#e6e6e8] rounded-lg text-sm focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15 transition-all" />
                    </div>
                  </div>
                  <button type="submit" disabled={forgotLoading}
                    className="w-full py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all disabled:opacity-50">
                    {forgotLoading ? 'Menyimpan...' : 'Reset PIN'}
                  </button>
                </form>
              </>
            )}

            {forgotStep === 'done' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={36} className="text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-[#1d1d1d] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>PIN Berhasil Direset!</h3>
                <p className="text-sm text-[#8b8f95] mb-6">Silakan login dengan PIN baru kamu.</p>
                <button onClick={closeForgot}
                  className="w-full py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all">
                  Login Sekarang
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
