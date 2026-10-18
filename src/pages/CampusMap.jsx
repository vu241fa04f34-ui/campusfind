import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Building2,
  Trophy,
  Coffee,
  BookOpen,
  Search,
  PlusCircle,
  HelpCircle,
  Filter
} from 'lucide-react';
import { itemService } from '../services/itemService';
import { ItemCard } from '../components/ItemCard';
import { LoadingSpinner } from '../components/LoadingSpinner';

const CAMPUS_LOCATIONS = [
  {
    id: 'A-Block',
    name: 'A-Block',
    category: 'Blocks',
    description: 'Administrative offices, Vice Chancellor secretariat, CSE and IT lecture halls.',
    floors: 'Ground + 6 Floors',
    handoverPoint: 'Ground Floor Reception & Security Desk',
    type: 'block'
  },
  {
    id: 'U-Block',
    name: 'U-Block',
    category: 'Blocks',
    description: 'Engineering labs, ECE/EEE departments, faculty chambers.',
    floors: 'Ground + 5 Floors',
    handoverPoint: 'Central Atrium Help Desk',
    type: 'block'
  },
  {
    id: 'N-Block',
    name: 'N-Block',
    category: 'Blocks',
    description: 'Science, Humanities, First-Year lecture complexes and design studios.',
    floors: 'Ground + 4 Floors',
    handoverPoint: 'Entrance Security Office',
    type: 'block'
  },
  {
    id: 'P-Block',
    name: 'P-Block',
    category: 'Blocks',
    description: 'Pharmacy block, Biotechnology research labs, seminar auditoriums.',
    floors: 'Ground + 4 Floors',
    handoverPoint: 'Pharmacy Administrative Wing',
    type: 'block'
  },
  {
    id: 'H-Block',
    name: 'H-Block',
    category: 'Blocks',
    description: 'Mechanical and Civil Engineering workshops, design testing bays.',
    floors: 'Ground + 3 Floors',
    handoverPoint: 'Workshop Supervisor Office',
    type: 'block'
  },
  {
    id: 'Library',
    name: 'Central Library',
    category: 'Other',
    description: 'NTR Vignan Central Library, digital reading rooms, reference sections.',
    floors: '3 Floors (Air Conditioned)',
    handoverPoint: 'Main Circulation & Return Desk',
    type: 'facility'
  },
  {
    id: 'MHP Canteen',
    name: 'MHP Canteen',
    category: 'Other',
    description: 'Central campus dining, fast food counters, cafeteria seating zones.',
    floors: 'Ground Level Pavilion',
    handoverPoint: 'Manager Counter / Token Booth',
    type: 'facility'
  },
  {
    id: 'Convocation',
    name: 'Convocation Hall',
    category: 'Other',
    description: 'Grand University Auditorium for campus fests, conventions, and convocations.',
    floors: 'Auditorium + Balcony',
    handoverPoint: 'Security Booth #2',
    type: 'facility'
  },
  {
    id: 'Guest House',
    name: 'University Guest House',
    category: 'Other',
    description: 'Executive visitor suites, visiting professor quarters, boardrooms.',
    floors: 'Ground + 2 Floors',
    handoverPoint: 'Guest House Reception',
    type: 'facility'
  },
  {
    id: 'Main Ground',
    name: 'Main Athletic Ground',
    category: 'Grounds',
    description: 'Standard 400m track, football stadium turf, athletics pavilion.',
    floors: 'Open Air Stadium',
    handoverPoint: 'Physical Education Office',
    type: 'ground'
  },
  {
    id: 'Basketball Ground',
    name: 'Basketball Complex',
    category: 'Grounds',
    description: 'Floodlit synthetic basketball courts adjacent to indoor stadium.',
    floors: 'Outdoor Courts',
    handoverPoint: 'Sports Equipment Room',
    type: 'ground'
  },
  {
    id: 'Volleyball Ground',
    name: 'Volleyball Ground',
    category: 'Grounds',
    description: 'University volleyball sand and clay court courts.',
    floors: 'Outdoor Courts',
    handoverPoint: 'Sports Equipment Room',
    type: 'ground'
  }
];

export function CampusMap() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [activeZone, setActiveZone] = useState('All');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const all = await itemService.getItems();
        setItems(all);
      } catch (err) {
        console.error('Failed to load campus items for map:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute location statistics
  const locationStats = CAMPUS_LOCATIONS.map((loc) => {
    const locItems = items.filter(
      (item) => item.location === loc.id || item.location === loc.name
    );
    const lostCount = locItems.filter((i) => i.type === 'lost' && i.status !== 'resolved').length;
    const foundCount = locItems.filter((i) => i.type === 'found' && i.status !== 'resolved').length;
    return {
      ...loc,
      lostCount,
      foundCount,
      totalCount: lostCount + foundCount
    };
  });

  const filteredLocations = locationStats.filter((loc) => {
    if (activeZone === 'All') return true;
    if (activeZone === 'Blocks') return loc.category === 'Blocks';
    if (activeZone === 'Grounds') return loc.category === 'Grounds';
    if (activeZone === 'Facilities') return loc.category === 'Other';
    return true;
  });

  const selectedItems = selectedLocation === 'All'
    ? []
    : items.filter(
        (item) => item.location === selectedLocation || (selectedLocation === 'Library' && item.location === 'Library')
      );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <Building2 className="w-96 h-96" />
        </div>
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
            <MapPin className="w-3.5 h-3.5" />
            <span>Interactive Campus Directory</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Vignan University Campus Map &amp; Recovery Hubs
          </h1>
          <p className="text-emerald-100/80 text-xs sm:text-sm leading-relaxed">
            Explore lost and found activity across Vadlamudi campus facilities, lecture complexes, and sports grounds. Identify designated safe handover points for verifying items.
          </p>
        </div>
      </div>

      {/* Zone Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter Zones:</span>
          {['All', 'Blocks', 'Grounds', 'Facilities'].map((zone) => (
            <button
              key={zone}
              onClick={() => setActiveZone(zone)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeZone === zone
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>

        <Link
          to="/report"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report Item at a Location</span>
        </Link>
      </div>

      {/* Locations Grid */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner message="Loading campus locations and recovery stats..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLocations.map((loc) => {
            const isSelected = selectedLocation === loc.id;
            return (
              <div
                key={loc.id}
                onClick={() => setSelectedLocation(isSelected ? 'All' : loc.id)}
                className={`bg-white rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden p-5 flex flex-col justify-between space-y-4 hover:shadow-lg ${
                  isSelected
                    ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                    : 'border-slate-200/80 hover:border-emerald-300'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top Location Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                        {loc.type === 'block' && <Building2 className="w-5 h-5" />}
                        {loc.type === 'ground' && <Trophy className="w-5 h-5" />}
                        {loc.type === 'facility' && (
                          loc.id === 'Library' ? <BookOpen className="w-5 h-5" /> : <Coffee className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{loc.name}</h3>
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          {loc.floors}
                        </span>
                      </div>
                    </div>

                    {/* Counts Badge */}
                    <div className="flex items-center gap-1.5">
                      {loc.lostCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800" title="Active Lost Items">
                          {loc.lostCount} Lost
                        </span>
                      )}
                      {loc.foundCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800" title="Active Found Items">
                          {loc.foundCount} Found
                        </span>
                      )}
                      {loc.totalCount === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-400 bg-slate-100">
                          Clear
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {loc.description}
                  </p>
                </div>

                {/* Handover checkpoint */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] text-slate-500 flex items-start gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-700">Official Safe Desk:</strong> {loc.handoverPoint}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-emerald-700 font-semibold">
                      {isSelected ? 'Hide Location Listings' : `View ${loc.totalCount} active items`}
                    </span>
                    <span className="text-[11px] text-slate-400">Click to filter</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Location Filter View */}
      {selectedLocation !== 'All' && (
        <div className="bg-slate-100/70 border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-slate-900">
                  Active Listings at {selectedLocation} ({selectedItems.length})
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Showing all reports recorded at or near this campus building.
              </p>
            </div>
            <button
              onClick={() => setSelectedLocation('All')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
            >
              Clear Filter
            </button>
          </div>

          {selectedItems.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
              <Search className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">No open reports at {selectedLocation} right now.</p>
              <Link
                to="/report"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Report an item found or lost here</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {selectedItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CampusMap;
