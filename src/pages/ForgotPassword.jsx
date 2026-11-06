import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { validateEmail } from '../utils/validation';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validateEmail(email)) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setMessage('Password reset link sent! Check your inbox for instructions.');
    } catch (err) {
      console.error('Password reset error:', err);
      let msg = 'Failed to reset password. Please check the email entered.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No student account found with this email.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F8F7F4]">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-[#E8EAF0] shadow-xl clay-card">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4776E6] to-[#385ec7] flex items-center justify-center text-white mx-auto shadow-md shadow-[#4776E6]/30">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#202B3C]">
            Reset Password
          </h2>
          <p className="text-xs sm:text-sm text-[#737B89]">
            Enter your student email and we'll send a password recovery link
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-3.5 rounded-xl bg-[#DDF4EE] border border-[#bfebe0] text-[#202B3C] text-xs sm:text-sm flex items-start gap-2.5">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-[#4776E6]" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#202B3C] mb-1.5">
              Campus Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#737B89]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@campus.edu"
                className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E8EAF0] rounded-xl text-[#202B3C] text-sm focus:outline-none focus:ring-2 focus:ring-[#4776E6]/50 focus:border-[#4776E6]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#4776E6] hover:bg-[#385ec7] active:bg-[#2b47a8] shadow-sm shadow-[#4776E6]/30 transition duration-150 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Send Recovery Link</span>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-[#737B89]">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 font-semibold text-[#4776E6] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
