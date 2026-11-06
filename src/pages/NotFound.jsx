import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16 px-4">
      <div className="clay-card bg-white rounded-3xl border border-[#E8EAF0] max-w-md w-full text-center space-y-6 p-8 shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-[#DDF4EE] text-[#4776E6] flex items-center justify-center mx-auto shadow-md">
          <Compass className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-[#202B3C] tracking-tight">404</h1>
          <h2 className="text-xl font-bold text-[#202B3C]">Page Not Found</h2>
          <p className="text-xs sm:text-sm text-[#737B89] leading-relaxed">
            The campus page or report listing you are looking for has been moved or does not exist.
          </p>
        </div>
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#4776E6] hover:bg-[#385ec7] shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Campus Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
