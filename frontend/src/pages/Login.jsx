import { useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError('E-posta veya şifre hatalı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Panel — Animated Brand */}
      <div className="login-brand">
        <div className="login-particles">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="login-particle" style={{
              '--delay': `${Math.random() * 8}s`,
              '--duration': `${6 + Math.random() * 10}s`,
              '--x-start': `${Math.random() * 100}%`,
              '--y-start': `${Math.random() * 100}%`,
              '--size': `${4 + Math.random() * 12}px`,
              '--opacity': `${0.1 + Math.random() * 0.3}`,
            }} />
          ))}
        </div>

        <div className="login-brand-content">
          <div className="login-logo-ring">
            <div className="login-logo-ring-inner">
              <Shield className="login-logo-icon" />
            </div>
          </div>
          <h1 className="login-brand-title">Pratek</h1>
          <p className="login-brand-subtitle">Destek Ticket Yönetim Sistemi</p>
          <div className="login-brand-features">
            <div className="login-feature">
              <div className="login-feature-dot" />
              <span>Ticket takibi ve yönetimi</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-dot" />
              <span>Ekip bazlı iş dağılımı</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-dot" />
              <span>Gerçek zamanlı durum izleme</span>
            </div>
          </div>
        </div>

        <div className="login-brand-footer">
          &copy; 2026 Pratek. Tüm hakları saklıdır.
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="login-form-panel">
        <div className="login-form-container">
          {/* Mobile logo */}
          <div className="login-mobile-logo">
            <Shield className="w-8 h-8 text-primary-600" />
            <span className="text-xl font-bold text-surface-900">Pratek</span>
          </div>

          <div className="login-form-header">
            <h2 className="login-form-title">Hoş Geldiniz</h2>
            <p className="login-form-desc">Devam etmek için hesabınıza giriş yapın</p>
          </div>

          {error && (
            <div className="login-error">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label className="login-label">E-posta</label>
              <div className="login-input-wrap">
                <Mail className="login-input-icon" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@sirket.com"
                  className="login-input"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label">Şifre</label>
              <div className="login-input-wrap">
                <Lock className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="login-input login-input-password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-eye-btn"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="login-forgot-row">
              <button type="button" onClick={() => setShowForgot(true)} className="login-forgot-link">
                Şifremi Unuttum
              </button>
            </div>

            <button type="submit" disabled={loading} className="login-submit-btn">
              {loading ? (
                <div className="login-spinner" />
              ) : (
                <>
                  Giriş Yap
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForgot(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 login-modal-enter">
            <button onClick={() => setShowForgot(false)} className="absolute top-4 right-4 p-1 text-surface-400 hover:text-surface-600 rounded-lg transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
                <Lock className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">Şifre Sıfırlama</h3>
              <p className="text-sm text-surface-600 leading-relaxed">
                Şifrenizi sıfırlamak için lütfen sistem yöneticiniz ile iletişime geçin.
              </p>
              <button
                onClick={() => setShowForgot(false)}
                className="mt-5 w-full py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors cursor-pointer"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
