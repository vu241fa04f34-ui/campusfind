import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';

export function AuthorityRoute({ children }) {
  const { currentUser, loading: authLoading, logout } = useAuth();
  const [isAuthority, setIsAuthority] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    async function verifyStaffStatus() {
      if (!currentUser) {
        if (isMounted) {
          setIsAuthority(false);
          setCheckingAuth(false);
        }
        return;
      }

      setCheckingAuth(true);
      try {
        const confirmed = await authService.isCurrentUserAuthority(currentUser);
        if (isMounted) {
          setIsAuthority(confirmed);
        }
      } catch (err) {
        console.error('Error verifying staff authority claims:', err);
        if (isMounted) setIsAuthority(false);
      } finally {
        if (isMounted) setCheckingAuth(false);
      }
    }

    if (!authLoading) {
      verifyStaffStatus();
    }

    return () => {
      isMounted = false;
    };
  }, [currentUser, authLoading]);

  // While authenticating or checking custom claims
  if (authLoading || checkingAuth) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Verifying Campus Staff &amp; Authority Authorization...
        </p>
      </div>
    );
  }

  // Not signed in -> redirect to dedicated Authority Login
  if (!currentUser) {
    return <Navigate to="/authority/login" state={{ from: location }} replace />;
  }

  // Signed in, but NOT an authority or admin -> 403 Access Denied
  if (!isAuthority) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-amber-200/90 shadow-xl p-8 sm:p-10 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
              403 • Staff Access Only
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Staff / Campus Authority Privileges Required
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              This portal is restricted to authorized campus security officers, block in-charges, and designated university staff. Your account (<span className="font-semibold text-slate-800">{currentUser.email || currentUser.displayName}</span>) does not possess verified staff authorization.
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
                window.location.href = '/authority/login';
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-900 hover:bg-indigo-800 transition shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign In with Staff Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verified staff authority or admin
  return children;
}

export default AuthorityRoute;
