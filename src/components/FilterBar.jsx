import React from 'react';
import { RotateCcw, ArrowUpDown, Tag, MapPin } from 'lucide-react';
import { CATEGORIES, CAMPUS_LOCATION_GROUPS } from '../utils/validation';

export function FilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  totalCount,
  typeCounts = { all: 0, lost: 0, found: 0 }
}) {
  const isFiltered =
    filters.type !== 'all' ||
    filters.category !== 'all' ||
    filters.location !== 'all' ||
    Boolean(filters.search);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-4">
      {/* Top Row: Type Tabs & Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Type Tabs */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => onFilterChange('type', 'all')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              filters.type === 'all'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All Items</span>
            <span
              className={`text-xs px-1.5 py-0.2 rounded-full ${
                filters.type === 'all'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {typeCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('type', 'lost')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              filters.type === 'lost'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Lost Items</span>
            <span
              className={`text-xs px-1.5 py-0.2 rounded-full ${
                filters.type === 'lost'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {typeCounts.lost}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('type', 'found')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              filters.type === 'found'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Found Items</span>
            <span
              className={`text-xs px-1.5 py-0.2 rounded-full ${
                filters.type === 'found'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {typeCounts.found}
            </span>
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <label htmlFor="sort-select" className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort:</span>
          </label>
          <select
            id="sort-select"
            value={filters.sort || 'newest'}
            onChange={(e) => onFilterChange('sort', e.target.value)}
            className="text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Bottom Row: Category & Location Dropdowns + Results Counter & Clear */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-[240px]">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Filter by category"
              value={filters.category}
              onChange={(e) => onFilterChange('category', e.target.value)}
              className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Filter by campus location"
              value={filters.location}
              onChange={(e) => onFilterChange('location', e.target.value)}
              className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Campus Locations</option>
              {CAMPUS_LOCATION_GROUPS.map((group) => (
                <optgroup key={group.category} label={group.category}>
                  {group.locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="Other">Other (Unlisted)</option>
            </select>
          </div>
        </div>

        {/* Counter & Reset */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">
            Showing <strong className="text-slate-800 font-bold">{totalCount}</strong> {totalCount === 1 ? 'item' : 'items'}
          </span>

          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
