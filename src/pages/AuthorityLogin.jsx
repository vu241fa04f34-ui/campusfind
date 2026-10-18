import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';

export function AuthorityLogin() {
  const { currentUser, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in as a verified authority, redirect to dashboard
  useEffect(() => {
    let isMounted = true;
    async function checkExistingAuthority() {
      if (currentUser) {
        const isAuth = await authService.isCurrentUserAuthority(currentUser);
        if (isMounted && isAuth) {
          const destination = location.state?.from?.pathname || '/authority/dashboard';
          navigate(destination, { replace: true });
        }
      }
    }
    checkExistingAuthority();
    return () => {
      isMounted = false;
    };
  }, [currentUser, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both your staff email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.authorityLogin(email.trim(), password);
      const destination = location.state?.from?.pathname || '/authority/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('Authority login error:', err);
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
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-8">
        {/* Top Back Link */}
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Student Sign In</span>
          </Link>
          <Link
            to="/admin/login"
            className="text-xs font-medium text-slate-400 hover:text-slate-700 transition"
          >
            Admin Portal →
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-10 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-950 border border-indigo-900 flex items-center justify-center mx-auto text-indigo-400 shadow-lg">
              <Shield className="w-7 h-7" />
            </div>
            <div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800">
              Campus Security &amp; Staff Operations
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Staff / Authority Portal
            </h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Designated campus authorities, block security in-charges, and library personnel login.
            </p>
          </div>

          {!isFirebaseConfigured && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
              <p className="font-bold">Configuration Notice:</p>
              <p>Firebase environment variables not detected in .env.local. Demo mode active.</p>
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
              <label htmlFor="staff-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Staff / Authority Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="staff-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="security.staff@vignan.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="staff-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-900 hover:bg-indigo-800 active:bg-indigo-950 transition shadow-lg shadow-indigo-900/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying Staff Credentials...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>Sign In as Campus Authority</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400 leading-relaxed">
            CampusFind security enforcement. Staff actions, status changes, and case resolutions are recorded and audited.
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthorityLogin;
