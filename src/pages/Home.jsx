import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  ShieldCheck,
  MapPin,
  Lock,
  Sparkles,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Bot,
  ChevronDown,
  ChevronUp,
  Building2,
  BookOpen,
  Key,
  Laptop,
  CreditCard,
  Watch,
  Layers,
  Shield,
  HeartHandshake,
  Clock,
  Compass,
  Check,
  RotateCcw
} from 'lucide-react';
import { SearchBar } from '../components/SearchBar';
import { FilterBar } from '../components/FilterBar';
import { ItemCard } from '../components/ItemCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { itemService } from '../services/itemService';
import { useAuth } from '../hooks/useAuth';
import { CAMPUS_LOCATIONS } from '../utils/validation';

const FAQ_ITEMS = [
  {
    question: "How do I prove a lost item belongs to me?",
    answer: "CampusFind uses private verification challenges. When reporting a lost item, you can specify distinctive private details (like custom lock-screen wallpaper, serial marks, or unique keychain tags). Claimants must answer these verification prompts before hand-offs take place."
  },
  {
    question: "What should I do if I find an item on campus?",
    answer: "Simply snap a clear photo and click 'Report an Item' selecting 'Found Item'. Record where you spotted it (e.g., Library 2nd floor, A-Block 304). If it's a high-value item like an official student ID or laptop, you can hand it over to Campus Security Dispatch or the nearest Block Help Desk."
  },
  {
    question: "Is my personal phone number or email publicly displayed?",
    answer: "No. Your contact details remain confidential. All initial recovery communication happens securely through CampusFind until verified ownership is established."
  },
  {
    question: "Where are the official campus lost and found desks?",
    answer: "Official safe hand-off points include Central Library Reception, A-Block Help Desk, U-Block Information Center, and Campus Safety & Security Headquarters."
  },
  {
    question: "How long does it take for reported items to appear?",
    answer: "Instantly. CampusFind utilizes Cloud Firestore real-time synchronization, so newly reported lost and found items appear immediately for all students, staff, and administrators without manual page refresh."
  }
];

const CATEGORY_CARDS = [
  { name: 'Electronics', icon: Laptop, color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'AirPods, phones, chargers, laptops' },
  { name: 'ID Cards', icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Student IDs, bus passes, library cards' },
  { name: 'Books & Notes', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Textbooks, lab records, assignment notes' },
  { name: 'Bags', icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Backpacks, laptop sleeves, pouches' },
  { name: 'Keys', icon: Key, color: 'text-teal-600', bg: 'bg-teal-50', desc: 'Hostel room keys, bike & vehicle keys' },
  { name: 'Water Bottles', icon: Sparkles, color: 'text-cyan-600', bg: 'bg-cyan-50', desc: 'Insulated flasks, sports shakers' },
  { name: 'Accessories', icon: Watch, color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Watches, spectacles, calculators, wallets' },
  { name: 'Clothing', icon: Layers, color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Jackets, lab coats, hoodies, caps' },
  { name: 'Other', icon: HelpCircle, color: 'text-slate-600', bg: 'bg-slate-50', desc: 'Umbrellas, stationary, sporting goods' }
];

const CAMPUS_LOCATION_CARDS = [
  { name: 'A-Block', desc: 'Main Admin, Engineering Labs, Dean Office', tag: 'Academic' },
  { name: 'U-Block', desc: 'CSE, IT & AI Departments, Coding Labs', tag: 'Tech Hub' },
  { name: 'Library', desc: 'Central Library, Reading Halls & Digital Lab', tag: 'Quiet Zone' },
  { name: 'N-Block', desc: 'Management & Biotechnology Laboratories', tag: 'Academic' },
  { name: 'P-Block', desc: 'Pharmacy & Pharmaceutical Sciences', tag: 'Science' },
  { name: 'H-Block', desc: 'Humanities, Science & 1st Year Classes', tag: 'Freshers' },
  { name: 'Main Ground', desc: 'Sports Complex, Running Track & Cricket Field', tag: 'Outdoors' },
  { name: 'MHP Canteen', desc: 'Central Cafeteria & Food Court', tag: 'Dining' },
  { name: 'Convocation', desc: 'Main Auditorium & Event Convention Hall', tag: 'Events' }
];

export function Home() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const listingsRef = useRef(null);

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
    const all = items.length;
    const lost = items.filter((i) => i.type === 'lost').length;
    const found = items.filter((i) => i.type === 'found').length;
    return { all, lost, found };
  }, [items]);

  // Synchronized client filtering for instant, responsive search and pill changes
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filters.type !== 'all' && item.type !== filters.type) return false;
      if (filters.category !== 'all' && item.category !== filters.category) return false;

      if (filters.location !== 'all') {
        if (filters.location === 'Other') {
          const isStandard = CAMPUS_LOCATIONS.filter((l) => l !== 'Other').includes(item.location);
          if (isStandard) return false;
        } else if (item.location !== filters.location) {
          return false;
        }
      }

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

  const scrollToBrowse = () => {
    listingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectCategory = (categoryName) => {
    handleFilterChange('category', categoryName);
    scrollToBrowse();
  };

  const handleSelectLocation = (locationName) => {
    handleFilterChange('location', locationName);
    scrollToBrowse();
  };

  const openAIChatbot = () => {
    window.dispatchEvent(new CustomEvent('campusfind:open-chatbot'));
  };

  return (
    <div className="bg-[#f8faf9] text-slate-800 space-y-16 pb-20 selection:bg-emerald-200 selection:text-emerald-900">
      {/* -------------------- 1. HERO SECTION (LIGHT CLAYMORPHISM) -------------------- */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
        {/* Soft Ambient Pastel Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-b from-emerald-100/70 via-teal-50/50 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 -left-20 w-80 h-80 bg-sky-100/60 rounded-full blur-3xl" />
          <div className="absolute top-40 -right-20 w-80 h-80 bg-mint-100/60 bg-emerald-50/80 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-7">
          {/* Vignan Trust Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 border border-emerald-200/80 text-emerald-800 text-xs sm:text-sm font-bold shadow-[4px_6px_16px_rgba(16,185,129,0.12),-2px_-2px_10px_rgba(255,255,255,0.9)] backdrop-blur-xs">
            <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Vignan University, Guntur • Official Campus Lost &amp; Found</span>
          </div>

          {/* Hero Heading & Subtitle */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
              Lost Something?{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600">
                Your Campus Has Your Back.
              </span>
            </h1>
            <p className="text-lg sm:text-xl font-semibold text-emerald-900/80 tracking-wide">
              Your campus. Your community. Your belongings.
            </p>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Connect effortlessly across all Vignan University academic blocks, student lounges, sports grounds, and dining facilities to safely locate and recover missing belongings.
            </p>
          </div>

          {/* Two Prominent Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={scrollToBrowse}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-bold text-white clay-button-emerald cursor-pointer shadow-lg"
            >
              <Search className="w-4 h-4" />
              <span>Find My Item</span>
            </button>

            <Link
              to="/report"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-bold text-white clay-button-coral cursor-pointer shadow-lg"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report an Item</span>
            </Link>
          </div>

          {/* Clay Search Capsule */}
          <div className="max-w-2xl mx-auto pt-3">
            <div className="clay-card p-2 sm:p-2.5 bg-white/95">
              <SearchBar
                value={filters.search}
                onChange={(val) => {
                  handleFilterChange('search', val);
                  scrollToBrowse();
                }}
                placeholder="Search lost & found by item name, e.g. 'AirPods', 'Student ID', 'Notebook'..."
              />
            </div>
          </div>

          {/* Friendly Floating Clay Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 pt-2 text-xs font-semibold text-slate-700">
            <span className="px-3.5 py-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-[3px_4px_10px_rgba(100,116,139,0.06)] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-teal-600" /> Keys &amp; Keychains
            </span>
            <span className="px-3.5 py-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-[3px_4px_10px_rgba(100,116,139,0.06)] flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-rose-600" /> Student ID Cards
            </span>
            <span className="px-3.5 py-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-[3px_4px_10px_rgba(100,116,139,0.06)] flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-indigo-600" /> Laptops &amp; Tech
            </span>
            <span className="px-3.5 py-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-[3px_4px_10px_rgba(100,116,139,0.06)] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-600" /> Records &amp; Books
            </span>
          </div>
        </div>
      </section>

      {/* -------------------- 2. HOW CAMPUSFIND WORKS (4 STEPS) -------------------- */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="clay-card p-6 sm:p-10 lg:p-14 bg-gradient-to-b from-white via-white to-emerald-50/30">
          <div className="max-w-2xl mx-auto text-center space-y-2 mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200/60">
              Recovery Process
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              How CampusFind Works
            </h2>
            <p className="text-sm text-slate-600">
              A 4-step secure recovery pathway built specifically for Vignan University's trusted campus environment.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1: Report */}
            <div className="clay-card p-5 bg-white border border-emerald-100/80 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-500/25">
                1
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Report</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Publish a compulsory photo, last known campus location (e.g. Library or A-Block), and approximate time.
              </p>
            </div>

            {/* Step 2: Discover */}
            <div className="clay-card p-5 bg-white border border-emerald-100/80 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 text-white flex items-center justify-center font-black text-lg shadow-md shadow-teal-500/25">
                2
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Discover</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Browse real-time reports instantly or receive automated smart match alerts when matching items are found.
              </p>
            </div>

            {/* Step 3: Verify */}
            <div className="clay-card p-5 bg-white border border-emerald-100/80 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-400 text-white flex items-center justify-center font-black text-lg shadow-md shadow-sky-500/25">
                3
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Verify</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Confirm ownership securely using unique challenge identifiers (e.g. custom lock screen, sticker, pouch contents).
              </p>
            </div>

            {/* Step 4: Recover */}
            <div className="clay-card p-5 bg-white border border-emerald-100/80 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-700 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-600/25">
                4
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Recover</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Conduct a daylight hand-off at verified campus desks (Library reception, Security office) and close the report!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- 3. RECENTLY REPORTED ITEMS (REAL FIRESTORE DATA) -------------------- */}
      <section ref={listingsRef} id="browse-listings" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Live Campus Feed</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Recently Reported Items
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Live updates directly from Cloud Firestore. Browse reported belongings across campus.
            </p>
          </div>

          {(filters.search || filters.category !== 'all' || filters.location !== 'all' || filters.type !== 'all') && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition shadow-xs self-start md:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {loadError && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="clay-card p-3 bg-white">
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            totalCount={filteredItems.length}
            typeCounts={typeCounts}
          />
        </div>

        {/* Item Cards or Loading / Empty state */}
        {loading ? (
          <LoadingSpinner message="Fetching real-time campus listings..." />
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
              filters.search || filters.category !== 'all' || filters.location !== 'all' || filters.type !== 'all'
                ? `No items found matching your current filters. Try resetting or submit a new report.`
                : 'There are currently no published reports. You can report an item now!'
            }
            onReset={handleResetFilters}
          />
        )}
      </section>

      {/* -------------------- 4. CAMPUS LOCATIONS SECTION -------------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="clay-card p-6 sm:p-10 bg-gradient-to-br from-white via-slate-50/50 to-sky-50/30 space-y-6">
          <div className="max-w-2xl space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-100/70 px-3 py-1 rounded-full border border-sky-200/60">
              Campus Hotspots
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 pt-1">
              Explore by Campus Location
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Select any Vignan University building to immediately view items lost or found there.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAMPUS_LOCATION_CARDS.map((loc) => {
              const isSelected = filters.location === loc.name;
              return (
                <button
                  key={loc.name}
                  onClick={() => handleSelectLocation(loc.name)}
                  className={`clay-card p-4 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-400/40'
                      : 'bg-white hover:bg-sky-50/40 border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{loc.name}</h4>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {loc.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{loc.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------- 5. ITEM CATEGORIES SECTION -------------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="clay-card p-6 sm:p-10 bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/30 space-y-6">
          <div className="max-w-2xl space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200/60">
              Classified Items
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 pt-1">
              Browse by Item Category
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Filter campus listings by object category to accelerate item identification.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
            {CATEGORY_CARDS.map((cat) => {
              const IconComp = cat.icon;
              const isSelected = filters.category === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => handleSelectCategory(cat.name)}
                  className={`clay-card p-4 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/40'
                      : 'bg-white hover:bg-emerald-50/40 border-slate-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-2xl ${cat.bg} ${cat.color} flex items-center justify-center mb-2.5 shadow-inner`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{cat.name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{cat.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------- 6. AI CHATBOT INTRODUCTION SECTION -------------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="clay-card p-6 sm:p-10 lg:p-12 bg-gradient-to-br from-emerald-50/80 via-teal-50/60 to-white border border-emerald-200/70">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                <Bot className="w-4 h-4 text-emerald-600" />
                <span>Smart Campus AI Assistant</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
                Ask CampusFind AI Anything About Lost &amp; Found
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Need immediate help locating an item? Our intelligent assistant understands conversational questions like <em className="text-slate-800 font-medium">"Did anyone find a blue bottle near Central Library today?"</em> or <em className="text-slate-800 font-medium">"Where do I submit a found student ID?"</em>.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={openAIChatbot}
                  className="clay-button-emerald px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white inline-flex items-center gap-2 cursor-pointer"
                >
                  <Bot className="w-4 h-4" />
                  <span>Chat with AI Assistant</span>
                </button>
                <span className="text-xs text-slate-500">
                  Available 24/7 in the bottom-right bubble.
                </span>
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="clay-card p-5 bg-white space-y-3 border border-emerald-100">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    AI
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">Campus Assistant</p>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl text-slate-700">
                    "I lost my blue backpack near A-Block yesterday afternoon."
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-900 font-medium border border-emerald-100">
                    "Found 1 matching bag reported at A-Block. Let me show you the verification details!"
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- 7. WHY CAMPUSFIND SECTION -------------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="clay-card p-6 sm:p-10 lg:p-12 bg-white space-y-8">
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200/60">
              Community Benefits
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Why Vignan Students Trust CampusFind
            </h2>
            <p className="text-sm text-slate-600">
              Say goodbye to scattered WhatsApp groups and missing notices on campus boards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="clay-card p-5 bg-emerald-50/30 border border-emerald-100 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">100% University Verified</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every account is authenticated through student email, Google SSO, or mobile verification.
              </p>
            </div>

            <div className="clay-card p-5 bg-teal-50/30 border border-teal-100 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Privacy Protection</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Direct phone numbers and emails remain concealed until ownership challenges are fulfilled.
              </p>
            </div>

            <div className="clay-card p-5 bg-sky-50/30 border border-sky-100 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Smart NLP Matching</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated similarity detection cross-references Lost and Found reports with category keywords.
              </p>
            </div>

            <div className="clay-card p-5 bg-purple-50/30 border border-purple-100 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Staff &amp; Security Network</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Campus security authorities and facility coordinators moderate dispute resolutions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- 8. SAFETY & PRIVACY SECTION -------------------- */}
      <section id="trust-safety" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="clay-card p-6 sm:p-10 lg:p-12 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 border border-emerald-100 space-y-6">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
              Honor Code &amp; Security
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Campus Safety &amp; Privacy Protocol
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Guidelines to guarantee safe recovery hand-offs for both finders and owners.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="clay-card p-4 bg-white border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-xs">Never Share Passwords</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Never publish phone passcodes, OTPs, or Aadhaar numbers in descriptions.
              </p>
            </div>

            <div className="clay-card p-4 bg-white border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-xs">Verify Secret Marks</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Require claimants to confirm hidden identifiers before agreeing to an in-person exchange.
              </p>
            </div>

            <div className="clay-card p-4 bg-white border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-xs">Daylight Meet-ups</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Always meet at Central Library reception or A-Block / U-Block information counters.
              </p>
            </div>

            <div className="clay-card p-4 bg-white border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-xs">Zero Cash Demands</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                CampusFind is a community service. Demanding money for returned belongings violates the honor code.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- 9. FAQ ACCORDION SECTION -------------------- */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="clay-card p-6 sm:p-10 bg-white space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200/60">
              Help Center
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Common questions from Vignan University students and faculty.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {FAQ_ITEMS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="clay-card overflow-hidden bg-slate-50/60 border border-slate-100 transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left font-bold text-slate-900 text-sm hover:text-emerald-700 transition cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <div className="w-6 h-6 rounded-full bg-white text-slate-500 flex items-center justify-center shrink-0 border border-slate-200">
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-white">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------- 10. FINAL CALL TO ACTION -------------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="clay-card p-8 sm:p-12 lg:p-14 text-center space-y-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white relative overflow-hidden shadow-xl">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Ready to Reunite Belongings on Campus?
            </h2>
            <p className="text-sm sm:text-base text-emerald-100 leading-relaxed">
              Join thousands of Vignan University students and staff. Help someone recover their valuables or find what you lost today.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 relative z-10 pt-2">
            <Link
              to="/report"
              className="px-7 py-3.5 rounded-2xl bg-white text-emerald-800 font-extrabold text-sm shadow-lg hover:bg-emerald-50 active:scale-95 transition-all"
            >
              Report an Item Now
            </Link>
            <button
              type="button"
              onClick={scrollToBrowse}
              className="px-7 py-3.5 rounded-2xl bg-emerald-800/60 hover:bg-emerald-800/80 border border-white/30 text-white font-extrabold text-sm backdrop-blur-xs transition-all cursor-pointer"
            >
              Explore All Listings
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;