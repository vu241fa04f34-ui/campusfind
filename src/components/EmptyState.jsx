import React from 'react';
import { SearchX, PlusCircle, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EmptyState({
  title = 'No items found',
  description = 'Try adjusting your search keywords, clearing selected category filters, or checking back soon.',
  onReset = null,
  showReportAction = true
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm my-8">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
        <SearchX className="w-8 h-8" />
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear Filters</span>
          </button>
        )}

        {showReportAction && (
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report Item</span>
          </Link>
        )}
      </div>
    </div>
  );
}
