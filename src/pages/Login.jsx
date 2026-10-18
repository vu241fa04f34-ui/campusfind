import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Mail,
  Lock,
  LogIn,
  Info,
  Copy,
  Check,
  Edit3,
  X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { validateEmail } from '../utils/validation';
import { authService } from '../services/authService';

// Supported country codes for Mobile OTP
const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳', placeholder: '98765 43210', length: 10 },
  { code: '+1', country: 'US / Canada', flag: '🇺🇸', placeholder: '202 555 0199', length: 10 },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧', placeholder: '7911 123456', length: 10 },
  { code: '+971', country: 'UAE', flag: '🇦🇪', placeholder: '50 123 4567', length: 9 },
  { code: '+61', country: 'Australia', flag: '🇦🇺', placeholder: '412 345 678', length: 9 },
  { code: '+65', country: 'Singapore', flag: '🇸🇬', placeholder: '8123 4567', length: 8 },
];

// High-quality university campus background
const CAMPUS_BG_IMAGE = 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1920&q=80';

export function Login() {
  const {
    login,
    signInWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
    setUpRecaptcha,
    isFirebaseConfigured
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from?.pathname || '/';

  // Auth Modes & State
  const [activeTab, setActiveTab] = useState('phone'); // 'phone' | 'email'
  const [phoneStep, setPhoneStep] = useState('enter_phone'); // 'enter_phone' | 'enter_otp'
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [countdown, setCountdown] = useState(30);

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);

  // OTP inputs refs
  const otpInputRefs = useRef([]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (phoneStep === 'enter_otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phoneStep, countdown]);

  // Focus first OTP input when entering OTP step
  useEffect(() => {
    if (phoneStep === 'enter_otp') {
      const timer = setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [phoneStep]);

  // --- 1. Google Authentication ---
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError(authService.formatAuthError(err, 'google'));
      if (!isFirebaseConfigured) {
        setShowConfigModal(true);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // --- 2. Phone OTP: Send Code ---
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const rawDigits = phoneNumber.replace(/\D/g, '');
    if (!rawDigits) {
      setError('Please enter your mobile phone number.');
      return;
    }

    if (selectedCountry.code === '+91') {
      if (rawDigits.length !== 10) {
        setError('Please enter a valid 10-digit Indian mobile number.');
        return;
      }
      if (!/^[6-9]\d{9}$/.test(rawDigits)) {
        setError('Indian mobile numbers typically start with 6, 7, 8, or 9.');
        return;
      }
    } else {
      if (rawDigits.length < 7 || rawDigits.length > 15) {
        setError('Please enter a valid mobile number for the selected country.');
        return;
      }
    }

    const fullPhoneNumber = `${selectedCountry.code}${rawDigits}`;

    setLoading(true);
    try {
      // Set up invisible reCAPTCHA container
      const verifier = setUpRecaptcha('recaptcha-container');
      const confirmation = await sendPhoneOtp(fullPhoneNumber, verifier);
      setConfirmationResult(confirmation);
      setPhoneStep('enter_otp');
      setOtpDigits(['', '', '', '', '', '']);
      setCountdown(30);
    } catch (err) {
      console.error('Send OTP error:', err);
      setError(authService.formatAuthError(err, 'phone'));
      if (!isFirebaseConfigured) {
        setShowConfigModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- 3. Phone OTP: Verify Code ---
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (!confirmationResult) {
      setError('Verification session expired. Please request a new OTP.');
      setPhoneStep('enter_phone');
      return;
    }

    setLoading(true);
    try {
      const user = await verifyPhoneOtp(confirmationResult, otpCode);
      if (user) {
        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError(authService.formatAuthError(err, 'phone'));
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;
    await handleSendOtp();
  };

  // Change phone number handler
  const handleChangePhoneNumber = () => {
    setPhoneStep('enter_phone');
    setOtpDigits(['', '', '', '', '', '']);
    setError('');
  };

  // OTP inputs key and paste handlers
  const handleOtpDigitChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (!cleaned) {
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    newDigits[index] = cleaned.slice(-1);
    setOtpDigits(newDigits);

    if (index < 5 && cleaned) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setOtpDigits(newDigits);

    const focusIdx = Math.min(pastedData.length, 5);
    otpInputRefs.current[focusIdx]?.focus();
  };

  // --- 4. Email Sign-in ---
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !validateEmail(email)) {
      setError('Please enter a valid student email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error('Email login error:', err);
      setError(authService.formatAuthError(err, 'email'));
      if (!isFirebaseConfigured) {
        setShowConfigModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyConfigSnippet = () => {
    const snippet = `VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id`;
    navigator.clipboard?.writeText(snippet);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden bg-slate-950">
      {/* Background Campus Image with graceful fallback */}
      {!bgFailed && (
        <img
          src={CAMPUS_BG_IMAGE}
          alt="Vignan University Campus"
          onError={() => setBgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
        />
      )}

      {/* Fallback CSS gradient if image fails or before load */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/80 to-slate-900 pointer-events-none" />

      {/* Dark Translucent Overlay to maintain high readability and contrast */}
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] pointer-events-none" />

      {/* Subtle decorative glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container"></div>

      {/* Clean Centered Login Card */}
      <div className="relative z-10 w-full max-w-md mx-auto my-8">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 p-6 sm:p-8 space-y-6">
          {/* Header & Branding */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-600/30 mx-auto text-white">
              <Compass className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                CampusFind
              </h1>
              <p className="text-sm font-semibold text-emerald-700">
                Lost something? Find it on campus.
              </p>
              <p className="text-xs text-slate-500">
                Vignan University, Guntur • Student Portal
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span>{error}</span>
                {!isFirebaseConfigured && (
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(true)}
                    className="block font-semibold text-rose-800 underline mt-1 text-xs"
                  >
                    View Firebase Setup Guide
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Primary Action 1: Continue with Google */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full py-3 px-4 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition flex items-center justify-center gap-3 shadow-xs hover:border-slate-300 disabled:opacity-60 cursor-pointer"
            >
              {googleLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  {/* Official Google G Logo */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs font-medium text-slate-400 uppercase tracking-wider absolute">
              Or sign in with
            </span>
          </div>

          {/* Tab Selection: Phone OTP vs Email */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('phone');
                setError('');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeTab === 'phone'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📱 Mobile OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('email');
                setError('');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeTab === 'email'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ✉️ Student Email
            </button>
          </div>

          {/* -------------------- PHONE OTP TAB -------------------- */}
          {activeTab === 'phone' && (
            <div className="space-y-4">
              {phoneStep === 'enter_phone' ? (
                /* STEP A: Enter Phone Number */
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label
                      htmlFor="phone-input"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                    >
                      Student Mobile Number <span className="text-rose-500">*</span>
                    </label>

                    <div className="flex gap-2">
                      {/* Country Code Select */}
                      <div className="relative">
                        <select
                          aria-label="Country Code"
                          value={selectedCountry.code}
                          onChange={(e) => {
                            const found = COUNTRY_CODES.find((c) => c.code === e.target.value);
                            if (found) setSelectedCountry(found);
                          }}
                          className="appearance-none h-11 pl-2.5 pr-7 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Phone Input */}
                      <div className="relative flex-1">
                        <input
                          id="phone-input"
                          type="tel"
                          inputMode="numeric"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder={selectedCountry.placeholder}
                          className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      We'll send an official 6-digit OTP code to verify your campus identity.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !phoneNumber.trim()}
                    className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-bold shadow-sm shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending Verification Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send OTP Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* STEP B: 6-Digit OTP Verification */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Enter 6-Digit Code <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleChangePhoneNumber}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Change Number</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-500">
                      Sent to{' '}
                      <strong className="text-slate-800 font-semibold">
                        {selectedCountry.code} {phoneNumber}
                      </strong>
                    </p>

                    {/* 6 Digit Input Boxes */}
                    <div className="flex justify-between gap-1.5 sm:gap-2 pt-1" onPaste={handleOtpPaste}>
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (otpInputRefs.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="w-11 h-12 sm:w-12 sm:h-12 text-center text-lg font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Countdown Timer & Resend */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">
                      {countdown > 0 ? (
                        <>Resend code in <strong className="text-emerald-700 font-semibold">{countdown}s</strong></>
                      ) : (
                        "Didn't receive code?"
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={countdown > 0 || loading}
                      className="font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-40 cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpDigits.join('').length !== 6}
                    className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Student Account...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify &amp; Sign In</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* -------------------- EMAIL TAB -------------------- */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Student Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@vignan.ac.in"
                    className="w-full h-11 pl-10 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password-input"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="password-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim() || !password}
                className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In with Email</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer note */}
          <div className="pt-3 text-center text-xs text-slate-500 border-t border-slate-100 space-y-2">
            <div>
              <span>Don't have an account? </span>
              <Link to="/register" className="font-semibold text-emerald-700 hover:text-emerald-800 underline">
                Create student account
              </Link>
            </div>
            <div className="pt-1.5 border-t border-slate-100/60 flex items-center justify-center gap-3 text-[11px] text-slate-400">
              <Link
                to="/authority/login"
                className="hover:text-indigo-600 font-medium transition"
              >
                Staff Authority Login
              </Link>
              <span>•</span>
              <Link
                to="/admin/login"
                className="hover:text-slate-700 font-medium transition"
              >
                Administrator Portal →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Firebase Setup Modal for developers when unconfigured */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <Info className="w-5 h-5 text-emerald-600" />
                <span>Firebase Authentication Setup</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              To enable Google and Phone OTP authentication in CampusFind, configure your Firebase keys in{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-emerald-700">.env.local</code>.
            </p>

            <div className="relative">
              <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto leading-relaxed">
{`VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id`}
              </pre>
              <button
                type="button"
                onClick={copyConfigSnippet}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium flex items-center gap-1 shadow-xs"
              >
                {copiedConfig ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedConfig ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
            >
              Close Setup Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
