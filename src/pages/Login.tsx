import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Activity, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import heroVideo from '/videos/hero-logistics.mp4';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="flex min-h-screen bg-[#f7f7f5]">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[40%] bg-[#1e2022] flex-col relative overflow-hidden">
        {/* Background video */}
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-30"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#1e2022]/60 via-[#1e2022]/40 to-[#1e2022]/80" />
        </div>
        <div className="relative z-10 flex flex-col h-full p-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#3b82f6] flex items-center justify-center">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>IMEDIN</h1>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#a0a4a8]">After-Sales & Service</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-3xl font-semibold text-white mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Platform Monitoring<br />
              <span className="text-[#3b82f6]">Medical Devices</span>
            </h2>
            <p className="text-[#a0a4a8] text-sm leading-relaxed max-w-sm">
              Sistem manajemen after-sales untuk memantau instalasi, perawatan, dan garansi perangkat medis IMEDIN di seluruh Indonesia.
            </p>
            <div className="mt-8 flex gap-4">
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
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#3b82f6] flex items-center justify-center">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#1d1d1d]" style={{ fontFamily: 'Poppins, sans-serif' }}>IMEDIN</h1>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8b8f95]">After-Sales & Service</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
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
            </form>

            <div className="mt-4 text-center">
              <button className="text-sm text-[#8b8f95] hover:text-[#1d1d1d] transition-colors">
                Lupa PIN?
              </button>
            </div>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-white/50 rounded-lg border border-[#e6e6e8]">
            <p className="text-xs font-medium text-[#8b8f95] mb-2 uppercase tracking-wider">Demo Credentials</p>
            <div className="grid grid-cols-1 gap-1.5 text-xs text-[#8b8f95]">
              <div className="flex justify-between">
                <span>Admin:</span>
                <span className="font-mono text-[#1d1d1d]">admin@imedin.co.id / 123456</span>
              </div>
              <div className="flex justify-between">
                <span>Teknisi:</span>
                <span className="font-mono text-[#1d1d1d]">teknisi@imedin.co.id / 123456</span>
              </div>
              <div className="flex justify-between">
                <span>Viewer:</span>
                <span className="font-mono text-[#1d1d1d]">viewer@imedin.co.id / 123456</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
