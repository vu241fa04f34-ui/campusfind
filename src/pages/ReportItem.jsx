import React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, PlusCircle, ShieldAlert } from 'lucide-react';
import { ReportItemForm } from '../components/ReportItemForm';
import { useAuth } from '../hooks/useAuth';

export function ReportItem() {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'found' ? 'found' : 'lost';
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-10">
        <div className="border-b border-slate-100 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <PlusCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Report Campus Belonging
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Help our campus community reconnect lost items with their rightful owners
              </p>
            </div>
          </div>
        </div>

        {!currentUser ? (
          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">Student Authentication Required</h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  To prevent fraudulent listings and maintain campus safety, you must be signed in with a campus account before publishing a lost or found report.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition"
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : (
          <ReportItemForm
            initialType={initialType}
            onCancel={() => navigate('/')}
          />
        )}
      </div>
    </div>
  );
}
