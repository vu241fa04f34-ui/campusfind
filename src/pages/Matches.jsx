import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  XCircle,
  HelpCircle,
  MapPin
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { matchingService } from '../services/matchingService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatItemLocation } from '../utils/formatLocation';

export function Matches() {
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterConfidence, setFilterConfidence] = useState('all');

  const loadMatches = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const results = await matchingService.getAllMatchesForUser(currentUser.uid);
      setMatches(results);
    } catch (err) {
      console.warn('Error loading matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [currentUser]);

  const handleDismiss = (matchKey) => {
    matchingService.dismissMatch(matchKey);
    setMatches((prev) => prev.filter((m) => m.matchKey !== matchKey));
  };

  const filteredMatches = matches.filter((m) => {
    if (filterConfidence === 'high') return m.score >= 75;
    if (filterConfidence === 'moderate') return m.score >= 55 && m.score < 75;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>CampusFind Automated Discovery Engine</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Potential Item Matches
          </h1>
          <p className="text-slate-300 text-xs sm:text-base leading-relaxed">
            Our multi-attribute matching algorithm automatically correlates your reported lost belongings with newly cataloged found items across Vignan University buildings.
          </p>
        </div>
      </div>

      {/* Filter and Count Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Match Confidence:
          </span>
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterConfidence('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterConfidence === 'all' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              All ({matches.length})
            </button>
            <button
              onClick={() => setFilterConfidence('high')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterConfidence === 'high' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              High (75%+)
            </button>
            <button
              onClick={() => setFilterConfidence('moderate')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterConfidence === 'moderate' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Moderate
            </button>
          </div>
        </div>

        <button
          onClick={loadMatches}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Refresh Matches
        </button>
      </div>

      {/* Matches Grid */}
      {loading ? (
        <LoadingSpinner message="Evaluating campus records for matches..." />
      ) : filteredMatches.length > 0 ? (
        <div className="space-y-6">
          {filteredMatches.map((match) => (
            <div
              key={match.matchKey}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition p-6 sm:p-8 space-y-6"
            >
              {/* Match Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      match.score >= 75
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-teal-100 text-teal-800 border border-teal-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{match.score}% Match Confidence</span>
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {match.confidence} correlation
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDismiss(match.matchKey)}
                  className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Dismiss Suggestion</span>
                </button>
              </div>

              {/* Items Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Your Lost Item */}
                <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                      Your Lost Item
                    </span>
                    <span className="text-xs text-slate-500">{match.lostItem.category}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{match.lostItem.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{match.lostItem.description}</p>
                  <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-rose-200/50">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{formatItemLocation(match.lostItem)}</span>
                    </div>
                  </div>
                </div>

                {/* Found Item Match */}
                <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Discovered Found Item
                    </span>
                    <span className="text-xs text-slate-500">{match.foundItem.category}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{match.foundItem.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{match.foundItem.description}</p>
                  <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-emerald-200/50">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{formatItemLocation(match.foundItem)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Reasons Explanation Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Why this was matched:</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-600">
                  {match.reasons.map((r, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action */}
              <div className="flex justify-end pt-2">
                <Link
                  to={`/item/${match.foundItem.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition"
                >
                  <span>Review Found Item &amp; Claim</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">No Active Matches Found</h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            As students and staff catalog new found belongings across Vignan campus blocks, our matching engine will notify you immediately if a candidate aligns with your reports.
          </p>
          <div className="pt-2">
            <Link
              to="/report?type=lost"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition"
            >
              Report a Lost Item
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
export default Matches;