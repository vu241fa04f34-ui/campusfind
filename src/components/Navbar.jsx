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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8EAF0] shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <Link
            to="/"
            onClick={closeMenu}
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[#4776E6] rounded-lg p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4776E6] to-[#385ec7] flex items-center justify-center text-white shadow-md shadow-[#4776E6]/25 group-hover:scale-105 transition-transform duration-200">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#202B3C] group-hover:text-[#4776E6] transition">
                Campus<span className="text-[#4776E6]">Find</span>
              </span>
              <p className="text-[10px] tracking-wide text-[#737B89] font-medium hidden sm:block -mt-1">
                Lost something? Let's find it.
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              to={currentUser ? "/" : "/browse"}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${
                (isActive('/') && currentUser) || isActive('/browse')
                  ? 'text-[#4776E6] bg-[#4776E6]/10'
                  : 'text-[#737B89] hover:text-[#202B3C] hover:bg-slate-100'
              }`}
            >
              Browse Items
            </Link>

            <Link
              to="/campus-map"
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${
                isActive('/campus-map')
                  ? 'text-[#4776E6] bg-[#4776E6]/10'
                  : 'text-[#737B89] hover:text-[#202B3C] hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-4 h-4 text-[#4776E6]" />
              <span>Campus Map</span>
            </Link>

            {currentUser && (
              <Link
                to="/matches"
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${
                  isActive('/matches')
                    ? 'text-[#4776E6] bg-[#4776E6]/10'
                    : 'text-[#737B89] hover:text-[#202B3C] hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#4776E6]" />
                <span>Matches</span>
              </Link>
            )}

            <a
              href="#how-it-works"
              className="px-3 py-2 rounded-xl text-sm font-semibold text-[#737B89] hover:text-[#202B3C] hover:bg-slate-100 transition"
            >
              How It Works
            </a>
          </nav>

          {/* Action Buttons & Auth */}
          <div className="hidden md:flex items-center gap-2.5">
            {currentUser && <NotificationCenter />}

            <Link
              to="/report"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#4776E6] hover:bg-[#385ec7] active:bg-[#2b47a8] shadow-sm shadow-[#4776E6]/30 hover:shadow-md transition-all duration-200"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Item</span>
            </Link>

            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E8EAF0] bg-white hover:bg-slate-50 text-[#202B3C] transition focus:outline-none focus:ring-2 focus:ring-[#4776E6] cursor-pointer shadow-2xs"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-7 h-7 rounded-full object-cover border border-[#4776E6]"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#4776E6] text-white flex items-center justify-center text-xs font-bold">
                      {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="text-sm font-semibold max-w-[120px] truncate text-[#202B3C]">
                    {currentUser.displayName || 'My Account'}
                  </span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E8EAF0] py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-[#E8EAF0]">
                      <p className="text-[11px] text-[#737B89]">Signed in as</p>
                      <p className="text-sm font-bold text-[#202B3C] truncate">
                        {currentUser.displayName || currentUser.email}
                      </p>
                      <p className="text-xs text-[#737B89] truncate">{currentUser.email}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-[#202B3C] hover:bg-slate-50 hover:text-[#4776E6]"
                    >
                      <User className="w-4 h-4 text-[#4776E6]" />
                      <span>Student Profile</span>
                    </Link>

                    <Link
                      to="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-[#202B3C] hover:bg-slate-50 hover:text-[#4776E6]"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[#4776E6]" />
                      <span>My Dashboard</span>
                    </Link>

                    <Link
                      to="/matches"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-[#202B3C] hover:bg-slate-50 hover:text-[#4776E6]"
                    >
                      <Sparkles className="w-4 h-4 text-[#4776E6]" />
                      <span>Item Matches</span>
                    </Link>

                    {userRole === 'admin' && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#4776E6] hover:bg-blue-50 font-semibold"
                      >
                        <Shield className="w-4 h-4 text-[#4776E6]" />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}

                    {userRole === 'authority' && (
                      <Link
                        to="/authority/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#4776E6] hover:bg-blue-50 font-semibold"
                      >
                        <Shield className="w-4 h-4 text-[#4776E6]" />
                        <span>Staff Dashboard</span>
                      </Link>
                    )}

                    <div className="border-t border-[#E8EAF0] my-1"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer"
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
                  className="px-3.5 py-2 rounded-xl text-sm font-semibold text-[#202B3C] hover:text-[#4776E6] hover:bg-slate-100 transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-sm font-bold text-[#202B3C] bg-[#DDF4EE] border border-[#bfebe0] hover:bg-[#c8ede4] transition shadow-2xs"
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
              className="p-2 rounded-xl text-[#202B3C] hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E8EAF0] px-4 pt-2 pb-6 space-y-3 shadow-lg">
          <div className="space-y-1">
            <Link
              to={currentUser ? "/" : "/browse"}
              onClick={closeMenu}
              className="block px-3 py-2 rounded-xl text-base font-semibold text-[#202B3C] hover:bg-slate-50"
            >
              Browse All Items
            </Link>

            <Link
              to="/campus-map"
              onClick={closeMenu}
              className="block px-3 py-2 rounded-xl text-base font-semibold text-[#202B3C] hover:bg-slate-50 flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-[#4776E6]" />
              <span>Campus Map</span>
            </Link>

            {currentUser && (
              <Link
                to="/matches"
                onClick={closeMenu}
                className="block px-3 py-2 rounded-xl text-base font-semibold text-[#202B3C] hover:bg-slate-50 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#4776E6]" />
                <span>Item Matches</span>
              </Link>
            )}

            <a
              href="#how-it-works"
              onClick={closeMenu}
              className="block px-3 py-2 rounded-xl text-base font-semibold text-[#737B89] hover:bg-slate-50"
            >
              How It Works
            </a>
          </div>

          <div className="pt-3 border-t border-[#E8EAF0] space-y-2">
            <Link
              to="/report"
              onClick={closeMenu}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-center text-sm font-bold text-white bg-[#4776E6] hover:bg-[#385ec7]"
            >
              <PlusCircle className="w-4 h-4" />
              Report Lost or Found Item
            </Link>

            {currentUser ? (
              <div className="space-y-1 pt-2">
                <Link
                  to="/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-2 px-3 py-2 text-base font-semibold text-[#202B3C] hover:bg-slate-50 rounded-xl"
                >
                  <User className="w-5 h-5 text-[#4776E6]" />
                  Student Profile
                </Link>

                <Link
                  to="/dashboard"
                  onClick={closeMenu}
                  className="flex items-center gap-2 px-3 py-2 text-base font-semibold text-[#202B3C] hover:bg-slate-50 rounded-xl"
                >
                  <LayoutDashboard className="w-5 h-5 text-[#4776E6]" />
                  My Dashboard
                </Link>

                {userRole === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    onClick={closeMenu}
                    className="flex items-center gap-2 px-3 py-2 text-base font-semibold text-[#4776E6] hover:bg-blue-50 rounded-xl"
                  >
                    <Shield className="w-5 h-5 text-[#4776E6]" />
                    Admin Dashboard
                  </Link>
                )}

                {userRole === 'authority' && (
                  <Link
                    to="/authority/dashboard"
                    onClick={closeMenu}
                    className="flex items-center gap-2 px-3 py-2 text-base font-semibold text-[#4776E6] hover:bg-blue-50 rounded-xl"
                  >
                    <Shield className="w-5 h-5 text-[#4776E6]" />
                    Staff Dashboard
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-base font-semibold text-rose-600 hover:bg-rose-50 rounded-xl"
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
                  className="py-2.5 px-4 text-center rounded-xl text-sm font-semibold text-[#202B3C] border border-[#E8EAF0] hover:bg-slate-50"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="py-2.5 px-4 text-center rounded-xl text-sm font-semibold text-[#202B3C] bg-[#DDF4EE] border border-[#bfebe0] hover:bg-[#c8ede4]"
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
