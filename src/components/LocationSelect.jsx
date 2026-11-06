import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Search, X, Check, Building2, Trophy, Navigation } from 'lucide-react';
import { CAMPUS_LOCATION_GROUPS, CAMPUS_LOCATIONS } from '../utils/validation';

export function LocationSelect({
  value = '',
  onChange,
  error = null,
  id = 'location-select',
  placeholder = 'Select a campus location...'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Determine if current value is "Other" or custom
  const isStandardLocation = CAMPUS_LOCATIONS.filter(l => l !== 'Other').includes(value);
  const isOtherSelected = !isStandardLocation && Boolean(value);

  // Derive custom location text directly from value
  const customLocation = value.startsWith('Other: ')
    ? value.slice(7)
    : (!isStandardLocation && value !== 'Other' ? value : '');

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const customInputRef = useRef(null);

  // Handle outside clicks and touches to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Filter groups and locations by search query
  const query = searchQuery.trim().toLowerCase();

  const filteredGroups = CAMPUS_LOCATION_GROUPS.map((group) => {
    const matchedLocations = group.locations.filter((loc) =>
      loc.toLowerCase().includes(query) || group.category.toLowerCase().includes(query)
    );
    return {
      category: group.category,
      locations: matchedLocations
    };
  }).filter((group) => group.locations.length > 0);

  const showOtherOption = !query || 'other'.includes(query) || 'custom'.includes(query);
  const totalMatches = filteredGroups.reduce((acc, g) => acc + g.locations.length, 0) + (showOtherOption ? 1 : 0);

  const handleSelect = (loc) => {
    if (loc === 'Other') {
      const finalVal = customLocation.trim() ? `Other: ${customLocation.trim()}` : 'Other';
      onChange?.(finalVal);
      setIsOpen(false);
      setSearchQuery('');
      setTimeout(() => {
        customInputRef.current?.focus();
      }, 100);
    } else {
      onChange?.(loc);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const handleCustomChange = (e) => {
    const text = e.target.value;
    const finalVal = text.trim() ? `Other: ${text}` : 'Other';
    onChange?.(finalVal);
  };

  // Icon helper per group category
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Blocks':
        return <Building2 className="w-3.5 h-3.5 text-[#4776E6]" />;
      case 'Grounds':
        return <Trophy className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Navigation className="w-3.5 h-3.5 text-[#4776E6]" />;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-2">
      {/* Dropdown Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full min-h-[46px] px-3.5 py-2.5 bg-[#F8F7F4] border rounded-xl text-left text-sm flex items-center justify-between gap-2 transition cursor-pointer select-none ${
          isOpen
            ? 'border-[#4776E6] ring-2 ring-[#4776E6]/20 bg-white'
            : error
            ? 'border-rose-400 bg-rose-50/30'
            : 'border-[#E8EAF0] hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <MapPin className={`w-4 h-4 flex-shrink-0 ${value ? 'text-[#4776E6]' : 'text-[#737B89]'}`} />
          <span className={`truncate font-medium ${value ? 'text-[#202B3C]' : 'text-[#737B89]'}`}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#737B89] flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#4776E6]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="clay-card absolute left-0 right-0 z-50 mt-1 bg-white border border-[#E8EAF0] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-[#E8EAF0] bg-[#F8F7F4]">
            <div className="relative">
              <Search className="w-4 h-4 text-[#737B89] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredGroups.length > 0 && filteredGroups[0].locations.length > 0) {
                      handleSelect(filteredGroups[0].locations[0]);
                    } else if (showOtherOption) {
                      handleSelect('Other');
                    }
                  }
                }}
                placeholder="Search campus blocks, grounds..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-[#E8EAF0] rounded-xl text-xs sm:text-sm text-[#202B3C] placeholder:text-[#737B89] focus:outline-none focus:ring-2 focus:ring-[#4776E6]/40 focus:border-[#4776E6]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737B89] hover:text-[#202B3C] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Location Group Lists */}
          <div className="max-h-64 sm:max-h-72 overflow-y-auto p-2 space-y-3 divide-y divide-[#E8EAF0]" role="listbox">
            {totalMatches === 0 ? (
              <div className="py-6 px-4 text-center space-y-2">
                <p className="text-xs text-[#737B89]">
                  No campus location matching "{searchQuery}"
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const finalVal = searchQuery.trim() ? `Other: ${searchQuery.trim()}` : 'Other';
                    onChange?.(finalVal);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4776E6] bg-[#DDF4EE] hover:bg-[#c8ede4] transition cursor-pointer"
                >
                  <span>Use "{searchQuery}" as custom location</span>
                </button>
              </div>
            ) : (
              <>
                {filteredGroups.map((group) => (
                  <div key={group.category} className="pt-2 first:pt-0">
                    {/* Category Label */}
                    <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#737B89] flex items-center gap-1.5 select-none">
                      {getCategoryIcon(group.category)}
                      <span>{group.category}</span>
                    </div>

                    {/* Locations in this Category */}
                    <div className="mt-1 space-y-0.5">
                      {group.locations.map((loc) => {
                        const isSelected = value === loc;
                        return (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => handleSelect(loc)}
                            role="option"
                            aria-selected={isSelected}
                            className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-medium flex items-center justify-between transition cursor-pointer select-none ${
                              isSelected
                                ? 'bg-[#DDF4EE] text-[#202B3C] font-semibold'
                                : 'text-[#202B3C] hover:bg-[#F8F7F4] active:bg-[#E8EAF0]'
                            }`}
                          >
                            <span>{loc}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#4776E6] flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* "Other" Option */}
                {showOtherOption && (
                  <div className="pt-2">
                    <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#737B89] select-none">
                      Unlisted Location
                    </div>
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => handleSelect('Other')}
                        role="option"
                        aria-selected={isOtherSelected}
                        className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-medium flex items-center justify-between transition cursor-pointer select-none ${
                          isOtherSelected
                            ? 'bg-[#DDF4EE] text-[#202B3C] font-semibold'
                            : 'text-[#202B3C] hover:bg-[#F8F7F4] active:bg-[#E8EAF0]'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span>Other</span>
                          <span className="text-[11px] text-[#737B89] font-normal">
                            Specify an unlisted campus area or workshop
                          </span>
                        </div>
                        {isOtherSelected && <Check className="w-4 h-4 text-[#4776E6] flex-shrink-0" />}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Custom Location Input (Visible when "Other" is chosen) */}
      {isOtherSelected && (
        <div className="p-3 bg-[#DDF4EE]/40 border border-[#bfebe0] rounded-xl space-y-1.5 animate-in fade-in duration-200">
          <label
            htmlFor={`${id}-custom`}
            className="block text-[11px] font-bold uppercase tracking-wider text-[#202B3C]"
          >
            Specify Campus Location <span className="text-rose-500">*</span>
          </label>
          <input
            ref={customInputRef}
            id={`${id}-custom`}
            type="text"
            value={customLocation}
            onChange={handleCustomChange}
            placeholder="e.g. Mechanical Workshop, Seminar Hall 2, Gate 1..."
            className="w-full px-3 py-2 bg-white border border-[#bfebe0] rounded-lg text-xs sm:text-sm text-[#202B3C] placeholder:text-[#737B89] focus:outline-none focus:ring-2 focus:ring-[#4776E6]/40"
          />
          <p className="text-[11px] text-[#737B89]">
            This custom location will be saved with your report.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
