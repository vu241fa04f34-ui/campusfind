import React, { useState } from 'react';
import { Sparkles, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function DemoBanner() {
  const { isDemoMode } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <aside aria-label="CampusFind environment status" className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white text-xs py-2 px-4 border-b border-emerald-700/50">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isDemoMode ? (
            <span className="flex items-center gap-1.5 bg-emerald-700/80 px-2 py-0.5 rounded font-medium text-emerald-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Demo Mode Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-emerald-600 px-2 py-0.5 rounded font-medium text-white">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
              Connected to Cloud Firebase
            </span>
          )}
          <span className="hidden sm:inline text-emerald-100/90">
            {isDemoMode
              ? 'Exploring with campus sample records. Add your Firebase keys in .env.local to enable live cloud authentication and sync.'
              : 'Live authentication, Firestore database, and Storage active.'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDismissed(true)}
            className="text-emerald-300 hover:text-white p-0.5 rounded transition"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
