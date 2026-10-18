import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';

export function AdminRoute({ children }) {
  const { currentUser, loading: authLoading, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    async function verifyAdminStatus() {
      if (!currentUser) {
        if (isMounted) {
          setIsAdmin(false);
          setCheckingAdmin(false);
        }
        return;
      }

      setCheckingAdmin(true);
      try {
        const adminConfirmed = await authService.isCurrentUserAdmin(currentUser);
        if (isMounted) {
          setIsAdmin(adminConfirmed);
        }
      } catch (err) {
        console.error('Error verifying administrator claims:', err);
        if (isMounted) setIsAdmin(false);
      } finally {
        if (isMounted) setCheckingAdmin(false);
      }
    }

    if (!authLoading) {
      verifyAdminStatus();
    }

    return () => {
      isMounted = false;
    };
  }, [currentUser, authLoading]);

  // While authenticating or verifying token custom claims
  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Verifying Administrator Authorization...
        </p>
      </div>
    );
  }

  // Not signed in -> redirect to dedicated Admin Login
  if (!currentUser) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Signed in, but NOT an admin -> 403 Access Denied
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-rose-200/80 shadow-xl p-8 sm:p-10 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
              403 • Access Restricted
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Administrator Privileges Required
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              This area is restricted to verified campus staff and system administrators. Your account (<span className="font-semibold text-slate-800">{currentUser.email || currentUser.displayName}</span>) does not possess verified administrator credentials.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Student Portal</span>
            </Link>

            <button
              onClick={async () => {
                await logout();
                window.location.href = '/admin/login';
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign In as Administrator</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verified administrator
  return children;
}

export default AdminRoute;
