import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';

export function AdminLogin() {
  const { currentUser, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in as a verified admin, redirect to dashboard
  useEffect(() => {
    let isMounted = true;
    async function checkExistingAdmin() {
      if (currentUser) {
        const isAdmin = await authService.isCurrentUserAdmin(currentUser);
        if (isMounted && isAdmin) {
          const destination = location.state?.from?.pathname || '/admin/dashboard';
          navigate(destination, { replace: true });
        }
      }
    }
    checkExistingAdmin();
    return () => {
      isMounted = false;
    };
  }, [currentUser, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both your administrator email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.adminLogin(email.trim(), password);
      const destination = location.state?.from?.pathname || '/admin/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('Admin login error:', err);
      if (err.message && err.message.includes('Access Denied')) {
        setError(err.message);
      } else {
        setError(authService.formatAuthError(err, 'email'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-[#F8F7F4]">
      <div className="max-w-md w-full space-y-8">
        {/* Top Back Link */}
        <div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#737B89] hover:text-[#202B3C] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Student Sign In</span>
          </Link>
        </div>

        {/* Card */}
        <div className="clay-card bg-white rounded-3xl border border-[#E8EAF0] shadow-xl p-6 sm:p-10 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#4776E6] to-[#385ec7] flex items-center justify-center mx-auto text-white shadow-lg shadow-[#4776E6]/30">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#DDF4EE] text-[#202B3C] border border-[#bfebe0]">
              Campus Security &amp; Records
            </div>
            <h1 className="text-2xl font-black text-[#202B3C] tracking-tight">
              Administrator Portal
            </h1>
            <p className="text-xs text-[#737B89] max-w-xs mx-auto">
              Authorized university administrative staff login. Access requires verified administrative privileges.
            </p>
          </div>

          {!isFirebaseConfigured && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
              <p className="font-bold">Configuration Notice:</p>
              <p>Firebase environment variables not detected in .env.local. Please ensure your project keys are configured.</p>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-bold uppercase tracking-wider text-[#202B3C] mb-1.5">
                Staff / Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#737B89] absolute left-3.5 top-3.5" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@vignan.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8EAF0] rounded-xl text-xs sm:text-sm text-[#202B3C] placeholder-[#737B89] focus:outline-none focus:ring-2 focus:ring-[#4776E6]/40 focus:border-[#4776E6] transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-bold uppercase tracking-wider text-[#202B3C] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#737B89] absolute left-3.5 top-3.5" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#E8EAF0] rounded-xl text-xs sm:text-sm text-[#202B3C] placeholder-[#737B89] focus:outline-none focus:ring-2 focus:ring-[#4776E6]/40 focus:border-[#4776E6] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#737B89] hover:text-[#202B3C] transition cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#4776E6] hover:bg-[#385ec7] active:bg-[#2b47a8] transition shadow-lg shadow-[#4776E6]/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>Sign In to Admin Console</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="pt-4 border-t border-[#E8EAF0] text-center text-[11px] text-[#737B89] leading-relaxed">
            CampusFind security enforcement. All administrative sessions are cryptographically logged and audited.
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
