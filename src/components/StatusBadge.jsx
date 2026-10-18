import React from 'react';

export function StatusBadge({ type, status, isDemo, isSample }) {
  const isFound = type === 'found';
  
  let statusBadge = null;
  if (status === 'resolved') {
    statusBadge = (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-slate-400"></span>
        Resolved
      </span>
    );
  } else if (status === 'pending') {
    statusBadge = (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-400 animate-pulse"></span>
        Pending Claim
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
          isFound
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            : 'bg-rose-100 text-rose-800 border border-rose-200'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 mr-1.5 rounded-full ${
            isFound ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        ></span>
        {isFound ? 'Found' : 'Lost'}
      </span>

      {statusBadge}

      {(isDemo || isSample) && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs tracking-wider">
          DEMO
        </span>
      )}
    </div>
  );
}
