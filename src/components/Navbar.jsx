import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  PlusCircle,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  MapPin,
  Sparkles,
  User,
  Shield
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { NotificationCenter } from './NotificationCenter';
import { authService } from '../services/authService';

export function Navbar() {
  const { currentUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userRole, setUserRole] = useState('student');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    async function checkRole() {
      if (currentUser) {
        try {
          const role = await authService.getUserRole(currentUser);
          if (isMounted) setUserRole(role);
        } catch {
          if (isMounted) setUserRole('student');
        }
      } else {
        if (isMounted) setUserRole('student');
      }
    }
    checkRole();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      setUserDropdownOpen(false);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const closeMenu = () => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <Link
            to="/"
            onClick={closeMenu}
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 transition">
                Campus<span className="text-emerald-600">Find</span>
              </span>
              <p className="text-[10px] tracking-wide text-slate-500 font-medium hidden sm:block -mt-1">
                Lost something? Let's find it.
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              to={currentUser ? "/" : "/browse"}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                (isActive('/') && currentUser) || isActive('/browse')
                  ? 'text-emerald-700 bg-emerald-50/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Browse Items
            </Link>

            <Link
              to="/campus-map"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                isActive('/campus-map')
                  ? 'text-emerald-700 bg-emerald-50/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Campus Map</span>
            </Link>

            {currentUser && (
              <Link
                to="/matches"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  isActive('/matches')
                    ? 'text-emerald-700 bg-emerald-50/80 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Matches</span>
              </Link>
            )}

            <a
              href="#how-it-works"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              How It Works
            </a>
          </nav>

          {/* Action Buttons & Auth */}
          <div className="hidden md:flex items-center gap-2.5">
            {currentUser && <NotificationCenter />}

            <Link
              to="/report"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-600/30 hover:shadow-md transition-all duration-200"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Item</span>
            </Link>

            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-7 h-7 rounded-full object-cover border border-emerald-300"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                      {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="text-sm font-medium max-w-[120px] truncate">
                    {currentUser.displayName || 'My Account'}
                  </span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-500">Signed in as</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {currentUser.displayName || currentUser.email}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                    >
                      <User className="w-4 h-4 text-emerald-600" />
                      <span>Student Profile</span>
                    </Link>

                    <Link
                      to="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                    >
                      <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                      <span>My Dashboard</span>
                    </Link>

                    <Link
                      to="/matches"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Item Matches</span>
                    </Link>

                    {userRole === 'admin' && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 font-semibold"
                      >
                        <Shield className="w-4 h-4 text-purple-600" />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}

                    {userRole === 'authority' && (
                      <Link
                        to="/authority/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50 font-semibold"
                      >
                        <Shield className="w-4 h-4 text-indigo-600" />
                        <span>Staff Dashboard</span>
                      </Link>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-emerald-700 hover:bg-slate-100 transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-2 rounded-xl text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            {currentUser && <NotificationCenter />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-3 shadow-lg">
          <div className="space-y-1">
            <Link
              to={currentUser ? "/" : "/browse"}
              onClick={closeMenu}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Browse All Items
            </Link>

            <Link
              to="/campus-map"
              onClick={closeMenu}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Campus Map</span>
            </Link>

            {currentUser && (
              <Link
                to="/matches"
                onClick={closeMenu}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Item Matches</span>
              </Link>
            )}

            <a
              href="#how-it-works"
              onClick={closeMenu}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              How It Works
            </a>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <Link
              to="/report"
              onClick={closeMenu}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-center text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
            >
              <PlusCircle className="w-4 h-4" />
              Report Lost or Found Item
            </Link>

            {currentUser ? (
              <div className="space-y-1 pt-2">
                <Link
                  to="/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-2 px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  <User className="w-5 h-5 text-emerald-600" />
                  Student Profile
                </Link>

                <Link
                  to="/dashboard"
                  onClick={closeMenu}
                  className="flex items-center gap-2 px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                  My Dashboard
                </Link>

                {userRole === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    onClick={closeMenu}
                    className="flex items-center gap-2 px-3 py-2 text-base font-medium text-purple-700 hover:bg-purple-50 rounded-lg"
                  >
                    <Shield className="w-5 h-5 text-purple-600" />
                    Admin Dashboard
                  </Link>
                )}

                {userRole === 'authority' && (
                  <Link
                    to="/authority/dashboard"
                    onClick={closeMenu}
                    className="flex items-center gap-2 px-3 py-2 text-base font-medium text-indigo-700 hover:bg-indigo-50 rounded-lg"
                  >
                    <Shield className="w-5 h-5 text-indigo-600" />
                    Staff Dashboard
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-base font-medium text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="py-2.5 px-4 text-center rounded-xl text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="py-2.5 px-4 text-center rounded-xl text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
