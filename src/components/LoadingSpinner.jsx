import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading campus listings...' }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center space-y-3">
      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}
