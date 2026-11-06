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
    <div className="clay-card bg-white rounded-3xl border border-[#E8EAF0] p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm my-8">
      <div className="w-16 h-16 rounded-2xl bg-[#DDF4EE] text-[#4776E6] flex items-center justify-center mx-auto mb-4 border border-[#bfebe0]">
        <SearchX className="w-8 h-8" />
      </div>

      <h3 className="text-lg font-bold text-[#202B3C] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[#737B89] mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#202B3C] bg-[#F8F7F4] hover:bg-[#E8EAF0] border border-[#E8EAF0] transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear Filters</span>
          </button>
        )}

        {showReportAction && (
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#4776E6] hover:bg-[#385ec7] shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report Item</span>
          </Link>
        )}
      </div>
    </div>
  );
}
