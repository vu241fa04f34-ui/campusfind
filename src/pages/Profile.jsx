import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  ShieldAlert,
  Building2,
  IdCard,
  Mail,
  Phone,
  Calendar,
  LayoutDashboard,
  CheckCircle,
  PlusCircle,
  Sparkles,
  Shield
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { itemService } from '../services/itemService';
import { recoveryService } from '../services/recoveryService';

export function Profile() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [department, setDepartment] = useState('');
  const [studentId, setStudentId] = useState('');
  const [stats, setStats] = useState({ reported: 0, claims: 0, resolved: 0 });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [role, setRole] = useState('student');

  useEffect(() => {
    async function loadData() {
      if (!currentUser) return;
      const prof = await authService.getUserProfile(currentUser.uid);
      setProfile(prof || {});
      setDepartment(prof?.department || '');
      setStudentId(prof?.studentId || '');
      setRole(prof?.role || 'student');

      // Load statistics
      try {
        const allItems = await itemService.getItems();
        const myItems = allItems.filter((i) => i.ownerUid === currentUser.uid);
        const resolvedCount = myItems.filter((i) => i.status === 'resolved' || i.status === 'returned').length;
        const reqs = await recoveryService.getUserRequests(currentUser.uid);

        setStats({
          reported: myItems.length,
          claims: reqs.length,
          resolved: resolvedCount
        });
      } catch (err) {
        console.warn('Profile stats load error:', err);
      }
    }
    loadData();
  }, [currentUser]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      await authService.updateUserProfile(currentUser.uid, {
        department: department.trim(),
        studentId: studentId.trim(),
        role
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const isVignanVerified =
    Boolean(currentUser?.email?.toLowerCase().endsWith('@vignan.ac.in')) ||
    profile?.isVerified === true;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {currentUser?.photoURL ? (
          <img
            src={currentUser.photoURL}
            alt={currentUser.displayName || 'Profile'}
            className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-400 shadow-md flex-shrink-0"
          />
        ) : (
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-3xl font-bold shadow-md flex-shrink-0">
            {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : <User className="w-12 h-12" />}
          </div>
        )}

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {currentUser?.displayName || 'Campus Student'}
            </h1>

            {/* University Verification Badge */}
            {isVignanVerified ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Vignan Student</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                <span>Standard Account</span>
              </span>
            )}

            {/* Role Badge */}
            {role === 'admin' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                <Shield className="w-3 h-3 text-purple-600" />
                <span>Campus Admin</span>
              </span>
            )}
          </div>

          <p className="text-sm text-slate-500">
            Vignan University, Guntur • CampusFind Community Member
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-slate-600">
            {currentUser?.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {currentUser.email}
              </span>
            )}
            {currentUser?.phoneNumber && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {currentUser.phoneNumber}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Active Member
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            <LayoutDashboard className="w-4 h-4 text-emerald-600" />
            <span>Go to Dashboard</span>
          </Link>
          <Link
            to="/report"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report an Item</span>
          </Link>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xl">
            {stats.reported}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Reported</p>
            <p className="text-sm font-semibold text-slate-800">Items posted by you</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xl">
            {stats.claims}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Claims &amp; Messages</p>
            <p className="text-sm font-semibold text-slate-800">Recovery interactions</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xl">
            {stats.resolved}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Returned Safely</p>
            <p className="text-sm font-semibold text-slate-800">Reunited belongings</p>
          </div>
        </div>
      </div>

      {/* Academic & Verification Details Form */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Academic &amp; Student Details
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Keep your department and student ID updated to expedite recovery handoffs.
          </p>
        </div>

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Profile information updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-dept" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Department / Branch</span>
              </label>
              <input
                id="prof-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science & Engineering (CSE)"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label htmlFor="prof-id" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Vignan Student Roll / ID No.</span>
              </label>
              <input
                id="prof-id"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. 211FA04001"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Development / Evaluation Access Role Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Evaluation &amp; Role Setting</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Toggle Administrator role to review and evaluate the Admin Dashboard.
                </p>
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 cursor-pointer"
              >
                <option value="student">Student Account</option>
                <option value="admin">Campus Administrator</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default Profile;