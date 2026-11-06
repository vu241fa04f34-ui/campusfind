import React from 'react';
import { Search, X } from 'lucide-react';

export function SearchBar({ value, onChange, placeholder = 'Search by item title, description, or campus building...' }) {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <Search className="w-5 h-5 text-[#4776E6]" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-10 py-3 bg-white border border-[#E8EAF0] rounded-2xl text-[#202B3C] placeholder-[#737B89] text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#4776E6]/40 focus:border-[#4776E6] transition"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#737B89] hover:text-[#202B3C] focus:outline-none cursor-pointer"
          title="Clear search query"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
