import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  ShieldCheck,
  MapPin,
  Lock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { SearchBar } from '../components/SearchBar';
import { FilterBar } from '../components/FilterBar';
import { ItemCard } from '../components/ItemCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { itemService } from '../services/itemService';
import { useAuth } from '../hooks/useAuth';
import { CAMPUS_LOCATIONS } from '../utils/validation';

export function Home() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all', // 'all', 'lost', 'found'
    category: 'all',
    location: 'all',
    sort: 'newest'
  });

  // Automatically sync any pending local reports to Cloud Firestore when user is authenticated
  useEffect(() => {
    if (currentUser?.uid) {
      itemService.syncLocalItemsToFirestore(currentUser);
    }
  }, [currentUser]);

  // Load items with real-time Firestore synchronization and safety timeout
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadError(null);

    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 4500);

    const unsubscribe = itemService.subscribeToItems(
      (data) => {
        if (isMounted) {
          clearTimeout(safetyTimer);
          setItems(data);
          setLoading(false);
        }
      },
      { sort: filters.sort }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [filters.sort]);

  // Synchronized counts for tabs
  const typeCounts = useMemo(() => {
    // Calculate counts across the full dataset
    const all = items.length;
    const lost = items.filter((i) => i.type === 'lost').length;
    const found = items.filter((i) => i.type === 'found').length;
    return { all, lost, found };
  }, [items]);

  // Synchronized client filtering for instant, responsive search and pill changes
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Type filter
      if (filters.type !== 'all' && item.type !== filters.type) {
        return false;
      }

      // Category filter
      if (filters.category !== 'all' && item.category !== filters.category) {
        return false;
      }

      // Location filter
      if (filters.location !== 'all') {
        if (filters.location === 'Other') {
          const isStandard = CAMPUS_LOCATIONS.filter((l) => l !== 'Other').includes(item.location);
          if (isStandard) {
            return false;
          }
        } else if (item.location !== filters.location) {
          return false;
        }
      }

      // Search keyword
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesLoc = item.location?.toLowerCase().includes(q);
        const matchesCat = item.category?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesCat) {
          return false;
        }
      }

      return true;
    });
  }, [items, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      category: 'all',
      location: 'all',
      sort: 'newest'
    });
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Campus Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 border-b border-slate-200/60 pt-16 pb-20 sm:pt-24 sm:pb-28 text-white">
        {/* Campus Background Image with dark translucent overlay and fallback */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1920&q=80"
            alt="Vignan University Campus"
            className="w-full h-full object-cover object-center scale-105 opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/80 to-slate-950/95" />
          <div className="absolute -top-24 left-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-16 right-1/4 w-80 h-80 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-semibold shadow-xs">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Vignan University, Guntur • Official Campus Lost &amp; Found</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Lost Something?{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
              Let's Find It.
            </span>
          </h1>

          {/* Short Description */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            CampusFind connects students and staff across all Vignan University blocks, grounds, and campus facilities to report missing belongings, catalog found valuables, and reunite items safely.
          </p>

          {/* Prominent Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/report?type=lost"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 shadow-lg shadow-rose-600/30 transition-all transform hover:-translate-y-0.5"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Report Lost Item</span>
            </Link>

            <Link
              to="/report?type=found"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 shadow-lg shadow-emerald-400/30 transition-all transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Found Item</span>
            </Link>
          </div>

          {/* Hero Search Bar */}
          <div className="max-w-2xl mx-auto pt-4">
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl">
              <SearchBar
                value={filters.search}
                onChange={(val) => handleFilterChange('search', val)}
                placeholder="Search lost & found by item name, e.g. 'AirPods', 'Student ID', 'Notebook'..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: Filter Bar & Item Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Current Campus Listings
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Browse recent reports or filter by campus building and category.
            </p>
          </div>
        </div>

        {loadError && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          totalCount={filteredItems.length}
          typeCounts={typeCounts}
        />

        {/* Item Cards or Loading / Empty state */}
        {loading ? (
          <LoadingSpinner message="Scanning campus lost and found records..." />
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No matching listings found"
            description={
              filters.search || filters.category !== 'all' || filters.location !== 'all'
                ? `No items found matching "${filters.search || filters.category}". Try resetting filters or reporting this item.`
                : 'There are currently no items in this category.'
            }
            onReset={handleResetFilters}
          />
        )}
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 sm:p-12 lg:p-16">
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              How CampusFind Works
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              A straightforward, transparent 3-step recovery process designed specifically for high-trust campus environments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-emerald-200 transition">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-emerald-600/30 mb-5">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Report the Belonging</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Post detailed photos, last known campus location (e.g. Library or A-Block), and approximate time without revealing sensitive credentials.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-emerald-200 transition">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-emerald-600/30 mb-5">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Connect Securely</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Found your item? Submit a recovery request. Verify ownership through distinctive details (like a custom lock-screen or unique sticker) in private messages.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-emerald-200 transition">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-emerald-600/30 mb-5">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Safe Campus Hand-Off</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Arrange a safe, daylight meetup at designated campus safety points like the Library reception or A-Block help desk. Mark item as returned!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust and Safety Section */}
      <section id="trust-safety" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-3xl text-white p-8 sm:p-12 lg:p-14 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-1 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Student Community Safety First</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-snug">
                Safety &amp; Verification Protocol
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                CampusFind protects privacy by keeping direct contact info shielded until mutual claim verification is established.
              </p>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Lock className="w-4 h-4" />
                  <h4>Never Publish Passwords or SSN</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Never post full passwords, device passcodes, or government ID numbers. Require the claimant to unlock or identify secret marks.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <MapPin className="w-4 h-4" />
                  <h4>Meet at Campus Public Hubs</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Always conduct in-person handoffs during daytime hours in well-lit, public areas such as the Library or A-Block / U-Block information desks.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <h4>Zero Cash Demands</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  CampusFind is a community service. Demanding money or ransom for returned belongings violates student honor code and will be reported.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <h4>Hand over High-Value Items</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  High-value unattended items (credit cards, driver licenses, car keys) should be surrendered to Campus Safety Security dispatch.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
