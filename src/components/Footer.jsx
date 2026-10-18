import React from 'react';
import { Compass, ShieldCheck, Heart, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Campus<span className="text-emerald-400">Find</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your campus community, helping belongings find their way home. Built by students, for students.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Campus Safe Hand-off Protocol</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Explore
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-emerald-400 transition">
                  Browse All Items
                </Link>
              </li>
              <li>
                <Link to="/report?type=lost" className="hover:text-emerald-400 transition">
                  Report Lost Belonging
                </Link>
              </li>
              <li>
                <Link to="/report?type=found" className="hover:text-emerald-400 transition">
                  Report Found Belonging
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-emerald-400 transition">
                  How CampusFind Works
                </a>
              </li>
            </ul>
          </div>

          {/* Campus Support */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Campus Hubs
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Library Reception</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>A-Block / U-Block Help Desk</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Campus Safety &amp; Security Office</span>
              </li>
              <li className="text-xs pt-1 text-slate-500">
                Turn in valuable government IDs or keys to campus security if unclaimed.
              </li>
            </ul>
          </div>

          {/* Guidelines & Safety */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Trust &amp; Privacy
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#trust-safety" className="hover:text-emerald-400 transition">
                  Safety &amp; Verification Rules
                </a>
              </li>
              <li>
                <span className="text-slate-400 hover:text-slate-200 cursor-pointer transition">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-slate-400 hover:text-slate-200 cursor-pointer transition">
                  Terms of Community Use
                </span>
              </li>
              <li>
                <span className="text-slate-400 hover:text-slate-200 cursor-pointer transition">
                  Contact Campus Administration
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            &copy; {CURRENT_YEAR} CampusFind. All rights reserved. Designed for university campus communities.
          </p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for university campus safety
          </p>
        </div>
      </div>
    </footer>
  );
}
