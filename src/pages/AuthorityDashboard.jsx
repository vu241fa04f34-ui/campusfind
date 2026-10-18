import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Package,
  CheckCircle,
  Clock,
  Search,
  Eye,
  FileText,
  AlertTriangle,
  ArrowRight,
  LogOut,
  MapPin,
  Tag,
  Calendar,
  Sparkles,
  UserCheck,
  Check,
  X,
  MessageSquare,
  HelpCircle,
  Filter
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { itemService } from '../services/itemService';
import { complaintService } from '../services/complaintService';
import { auditService } from '../services/auditService';
import { formatDate } from '../utils/formatDate';
import { formatItemLocation } from '../utils/formatLocation';
import { getItemImageUrl } from '../utils/itemImageHelper';

export function AuthorityDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Tab state: 'overview' | 'complaints' | 'items' | 'resolved' | 'activity'
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [items, setItems] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [myActivity, setMyActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & filter states
  const [itemSearch, setItemSearch] = useState('');
  const [itemStatusFilter, setItemStatusFilter] = useState('all');
  const [complaintSearch, setComplaintSearch] = useState('');
  const [complaintFilter, setComplaintFilter] = useState('all'); // 'all' | 'pending' | 'in_progress'

  // Modals & Action states
  const [selectedItemForStatus, setSelectedItemForStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [recipientInfo, setRecipientInfo] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusModalError, setStatusModalError] = useState('');

  const [selectedComplaintForResolve, setSelectedComplaintForResolve] = useState(null);
  const [resolveStatus, setResolveStatus] = useState('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolveError, setResolveError] = useState('');

  const [viewingItemDetail, setViewingItemDetail] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [allItems, allComplaints, userActivity] = await Promise.all([
        itemService.getItems(),
        complaintService.getAllComplaints(),
        auditService.getAuditLogsForActor(currentUser?.uid || currentUser?.email)
      ]);
      setItems(allItems);
      setComplaints(allComplaints);
      setMyActivity(userActivity);
    } catch (err) {
      console.error('Failed to load authority dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const showNotification = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  // Status Change for Item (requires Return Notes for Returned/Resolved)
  const handleOpenStatusModal = (item) => {
    setSelectedItemForStatus(item);
    setNewStatus(item.status);
    setReturnNotes('');
    setRecipientInfo('');
    setReturnDate(new Date().toISOString().split('T')[0]);
    setStatusModalError('');
  };

  const handleSaveItemStatus = async (e) => {
    e.preventDefault();
    if (!selectedItemForStatus) return;

    if (
      (newStatus === 'returned' || newStatus === 'resolved' || newStatus === 'found') &&
      !returnNotes.trim()
    ) {
      setStatusModalError('Staff status updates to Found, Returned, or Resolved require explanatory verification notes.');
      return;
    }

    try {
      const metadata = {
        returnNotes: returnNotes.trim() || null,
        recipientInfo: recipientInfo.trim() || null,
        returnDate: (newStatus === 'returned' || newStatus === 'resolved') ? returnDate : null,
        handledBy: currentUser?.displayName || currentUser?.email || 'Campus Staff',
        handledByUid: currentUser?.uid
      };

      await itemService.setStatus(selectedItemForStatus.id, newStatus, metadata);

      // Log in audit system
      await auditService.logAction({
        actorUid: currentUser?.uid || 'authority',
        actorEmail: currentUser?.email || 'staff@vignan.ac.in',
        actorRole: 'authority',
        action: 'STATUS_OVERRIDE',
        targetType: 'item',
        targetId: selectedItemForStatus.id,
        details: `Updated item "${selectedItemForStatus.title}" status to "${newStatus}". Note: ${returnNotes.trim() || 'No note'}`
      });

      // Update state locally
      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedItemForStatus.id
            ? { ...i, status: newStatus, ...metadata }
            : i
        )
      );

      setSelectedItemForStatus(null);
      showNotification(`Successfully updated "${selectedItemForStatus.title}" status to ${newStatus}.`);
      loadData();
    } catch (err) {
      console.error('Failed to update item status:', err);
      setStatusModalError(err.message || 'Error updating item status.');
    }
  };

  // Assign Complaint to Self
  const handleAssignToMe = async (complaint) => {
    try {
      const staffName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Campus Staff';
      await complaintService.assignComplaint(complaint.id, currentUser?.uid, staffName);

      await auditService.logAction({
        actorUid: currentUser?.uid,
        actorEmail: currentUser?.email,
        actorRole: 'authority',
        action: 'COMPLAINT_ASSIGNED',
        targetType: 'complaint',
        targetId: complaint.id,
        details: `Assigned case "${complaint.itemTitle}" to ${staffName}`
      });

      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaint.id
            ? { ...c, status: 'in_progress', assignedTo: currentUser?.uid, assignedToName: staffName }
            : c
        )
      );

      showNotification('Case assigned to you.');
      loadData();
    } catch (err) {
      console.error('Failed to assign complaint:', err);
    }
  };

  // Resolve Complaint (Requires Resolution Notes)
  const handleOpenResolveModal = (complaint) => {
    setSelectedComplaintForResolve(complaint);
    setResolveStatus('resolved');
    setResolutionNotes('');
    setResolveError('');
  };

  const handleSaveComplaintResolve = async (e) => {
    e.preventDefault();
    if (!selectedComplaintForResolve) return;

    if (!resolutionNotes.trim()) {
      setResolveError('A resolution note is required describing the action taken.');
      return;
    }

    try {
      const staffName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Campus Staff';

      await complaintService.updateComplaintStatus(selectedComplaintForResolve.id, {
        status: resolveStatus,
        resolutionNote: resolutionNotes.trim(),
        resolvedBy: staffName,
        assignedTo: currentUser?.uid,
        assignedToName: staffName
      });

      await auditService.logAction({
        actorUid: currentUser?.uid,
        actorEmail: currentUser?.email,
        actorRole: 'authority',
        action: 'COMPLAINT_RESOLVED',
        targetType: 'complaint',
        targetId: selectedComplaintForResolve.id,
        details: `Marked case "${selectedComplaintForResolve.itemTitle}" as ${resolveStatus}. Note: ${resolutionNotes.trim()}`
      });

      setComplaints((prev) =>
        prev.map((c) =>
          c.id === selectedComplaintForResolve.id
            ? {
                ...c,
                status: resolveStatus,
                resolutionNote: resolutionNotes.trim(),
                resolvedBy: staffName,
                resolvedAt: new Date().toISOString()
              }
            : c
        )
      );

      setSelectedComplaintForResolve(null);
      showNotification(`Case regarding "${selectedComplaintForResolve.itemTitle}" marked as ${resolveStatus}.`);
      loadData();
    } catch (err) {
      console.error('Failed to resolve complaint:', err);
      setResolveError(err.message || 'Error updating complaint.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/authority/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Metrics
  const openComplaintsCount = complaints.filter((c) => c.status === 'pending' || c.status === 'in_progress').length;
  const myAssignedCount = complaints.filter((c) => c.assignedTo === currentUser?.uid && c.status === 'in_progress').length;
  const resolvedCasesCount = complaints.filter((c) => c.status === 'resolved').length;
  const totalItemsCount = items.length;
  const returnedItemsCount = items.filter((i) => i.status === 'returned' || i.status === 'resolved').length;

  // Filtered Items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !itemSearch.trim() ||
      item.title?.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.category?.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.location?.toLowerCase().includes(itemSearch.toLowerCase());
    const matchesStatus = itemStatusFilter === 'all' || item.status === itemStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Complaints
  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      !complaintSearch.trim() ||
      c.itemTitle?.toLowerCase().includes(complaintSearch.toLowerCase()) ||
      c.description?.toLowerCase().includes(complaintSearch.toLowerCase()) ||
      c.reporterDisplayName?.toLowerCase().includes(complaintSearch.toLowerCase());
    const matchesFilter =
      complaintFilter === 'all'
        ? true
        : complaintFilter === 'my_cases'
        ? c.assignedTo === currentUser?.uid && c.status !== 'resolved'
        : c.status === complaintFilter;
    return matchesSearch && matchesFilter;
  });

  const resolvedComplaints = complaints.filter((c) => c.status === 'resolved');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-indigo-950 text-white shrink-0 flex flex-col border-r border-indigo-900">
        <div className="p-5 border-b border-indigo-900/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-900 text-indigo-400 flex items-center justify-center border border-indigo-800 shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-white">Campus Authority</h2>
            <p className="text-[10px] text-indigo-300 font-medium">Vignan Staff Portal</p>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 rounded-2xl bg-indigo-900/50 border border-indigo-800/80 text-xs space-y-1">
          <p className="font-bold text-white truncate">
            {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Campus Staff'}
          </p>
          <p className="text-[11px] text-indigo-300 truncate">{currentUser?.email}</p>
          <div className="pt-1">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-800 text-indigo-200">
              Staff Clearance
            </span>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'overview'
                ? 'bg-indigo-900 text-white shadow-sm'
                : 'text-indigo-200 hover:bg-indigo-900/60 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 text-indigo-400" />
            <span>Overview &amp; Metrics</span>
          </button>

          <button
            onClick={() => setActiveTab('complaints')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
              activeTab === 'complaints'
                ? 'bg-indigo-900 text-white shadow-sm'
                : 'text-indigo-200 hover:bg-indigo-900/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Assigned &amp; Open Cases</span>
            </div>
            {openComplaintsCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500 text-slate-950 font-bold">
                {openComplaintsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'items'
                ? 'bg-indigo-900 text-white shadow-sm'
                : 'text-indigo-200 hover:bg-indigo-900/60 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>All Authorized Items</span>
          </button>

          <button
            onClick={() => setActiveTab('resolved')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'resolved'
                ? 'bg-indigo-900 text-white shadow-sm'
                : 'text-indigo-200 hover:bg-indigo-900/60 hover:text-white'
            }`}
          >
            <CheckCircle className="w-4 h-4 text-teal-400" />
            <span>Resolved Cases</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'activity'
                ? 'bg-indigo-900 text-white shadow-sm'
                : 'text-indigo-200 hover:bg-indigo-900/60 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>My Activity Log</span>
          </button>
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-indigo-900/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
        {/* Banner Alert if Action Success */}
        {actionSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* -------------------- TAB 1: OVERVIEW -------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Authority Operational Overview
                </h1>
                <p className="text-xs text-slate-500">
                  Real-time status of university lost-and-found operations and student case resolution.
                </p>
              </div>
              <button
                onClick={loadData}
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition"
              >
                Refresh Data
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Unresolved Cases
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-amber-600">{openComplaintsCount}</span>
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-[11px] text-slate-500">Awaiting review or in progress</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  My Active Cases
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-indigo-600">{myAssignedCount}</span>
                  <Shield className="w-5 h-5 text-indigo-500" />
                </div>
                <p className="text-[11px] text-slate-500">Assigned specifically to you</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Items Recovered
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-emerald-600">{returnedItemsCount}</span>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-[11px] text-slate-500">Successfully returned</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Resolved Disputes
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-teal-600">{resolvedCasesCount}</span>
                  <Package className="w-5 h-5 text-teal-500" />
                </div>
                <p className="text-[11px] text-slate-500">Cases closed with notes</p>
              </div>
            </div>

            {/* Quick Action Queue: Unassigned Complaints */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Urgent Campus Reports Queue</h3>
                  <p className="text-xs text-slate-500">Recent student complaints needing staff assignment or verification</p>
                </div>
                <button
                  onClick={() => setActiveTab('complaints')}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>View All ({openComplaintsCount})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {complaints.filter((c) => c.status === 'pending').length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No unassigned complaints in queue. All student reports are being handled.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {complaints
                    .filter((c) => c.status === 'pending')
                    .slice(0, 4)
                    .map((comp) => (
                      <div key={comp.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                              {comp.type.replace('_', ' ')}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{comp.itemTitle}</span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-1">{comp.description}</p>
                          <span className="text-[10px] text-slate-400">
                            Reported by {comp.reporterDisplayName} • {formatDate(comp.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleAssignToMe(comp)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition"
                          >
                            Assign to Me
                          </button>
                          <button
                            onClick={() => handleOpenResolveModal(comp)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------- TAB 2: COMPLAINTS & CASES -------------------- */}
        {activeTab === 'complaints' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Assigned &amp; Open Cases
                </h1>
                <p className="text-xs text-slate-500">
                  Investigate user complaints, disputes, and inaccurate reports. Add required resolution notes to close cases.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setComplaintFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    complaintFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  All Active
                </button>
                <button
                  onClick={() => setComplaintFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    complaintFilter === 'pending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setComplaintFilter('in_progress')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    complaintFilter === 'in_progress' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => setComplaintFilter('my_cases')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    complaintFilter === 'my_cases' ? 'bg-indigo-900 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  My Assigned
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search cases by item name, reporter, or description..."
                value={complaintSearch}
                onChange={(e) => setComplaintSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Complaints List */}
            {filteredComplaints.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs">
                No cases match the selected filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredComplaints.map((comp) => (
                  <div
                    key={comp.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                          {comp.type.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            comp.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : comp.status === 'in_progress'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {comp.status.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Reported {formatDate(comp.createdAt)}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-900">{comp.itemTitle}</h3>
                      <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                        "{comp.description}"
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                      <div className="space-y-0.5 text-slate-500">
                        <p>
                          <strong className="text-slate-700">Reporter:</strong> {comp.reporterDisplayName} ({comp.reporterEmail || 'No email'})
                        </p>
                        {comp.assignedToName && (
                          <p>
                            <strong className="text-slate-700">Handling Staff:</strong> {comp.assignedToName}
                          </p>
                        )}
                        {comp.resolutionNote && (
                          <p className="text-emerald-700 font-medium">
                            <strong>Resolution:</strong> {comp.resolutionNote}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {comp.itemId && (
                          <button
                            onClick={async () => {
                              const found = await itemService.getItemById(comp.itemId);
                              if (found) setViewingItemDetail(found);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Linked Item</span>
                          </button>
                        )}

                        {comp.status !== 'resolved' && (
                          <>
                            {comp.assignedTo !== currentUser?.uid && (
                              <button
                                onClick={() => handleAssignToMe(comp)}
                                className="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold text-xs transition"
                              >
                                Assign to Me
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenResolveModal(comp)}
                              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Resolve with Notes</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* -------------------- TAB 3: ALL AUTHORIZED ITEMS -------------------- */}
        {activeTab === 'items' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  All Campus Items
                </h1>
                <p className="text-xs text-slate-500">
                  Inspect reported lost and found items. Update item status with mandatory verification details.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={itemStatusFilter}
                  onChange={(e) => setItemStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open / Active</option>
                  <option value="pending">Pending Claim</option>
                  <option value="claimed">Claimed</option>
                  <option value="returned">Returned</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search items by name, category, or location..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Item</th>
                      <th className="p-3.5">Type &amp; Category</th>
                      <th className="p-3.5">Campus Location</th>
                      <th className="p-3.5">Reported By</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Staff Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={getItemImageUrl(item)}
                              alt={item.title}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                            <div className="max-w-[200px]">
                              <p className="font-bold text-slate-900 truncate">{item.title}</p>
                              <p className="text-[10px] text-slate-400">{formatDate(item.createdAt || item.eventDate)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="space-y-0.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                item.type === 'lost' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.type}
                            </span>
                            <p className="text-[11px] text-slate-500">{item.category}</p>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="text-slate-800 font-medium">{formatItemLocation(item)}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="text-slate-600">{item.ownerDisplayName || 'Student'}</span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.status === 'returned' || item.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'pending'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingItemDetail(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenStatusModal(item)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition"
                            >
                              Update Status
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- TAB 4: RESOLVED CASES -------------------- */}
        {activeTab === 'resolved' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Resolved Campus Cases
              </h1>
              <p className="text-xs text-slate-500">
                Official archive of resolved student complaints and completed handovers.
              </p>
            </div>

            {resolvedComplaints.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs">
                No resolved cases recorded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {resolvedComplaints.map((comp) => (
                  <div
                    key={comp.id}
                    className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900">{comp.itemTitle}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Resolved {formatDate(comp.resolvedAt || comp.updatedAt)}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5">
                      <p className="text-slate-600">
                        <strong className="text-slate-800">Initial Issue:</strong> {comp.description}
                      </p>
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 font-medium">
                        <strong className="text-emerald-900">Official Staff Resolution Note:</strong> {comp.resolutionNote}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Resolved By: <span className="font-semibold text-slate-700">{comp.resolvedBy || 'Campus Authority'}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* -------------------- TAB 5: MY ACTIVITY LOG -------------------- */}
        {activeTab === 'activity' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                My Staff Activity Log
              </h1>
              <p className="text-xs text-slate-500">
                Audit record of actions, status updates, and resolutions logged under your staff credentials.
              </p>
            </div>

            {myActivity.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs">
                No staff actions recorded for this account yet.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
                {myActivity.map((log) => (
                  <div key={log.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                          {log.action}
                        </span>
                        <span className="font-bold text-slate-800">{log.targetType} #{log.targetId}</span>
                      </div>
                      <p className="text-slate-600">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{formatDate(log.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* -------------------- MODAL: ITEM STATUS UPDATE (MANDATORY NOTES) -------------------- */}
      {selectedItemForStatus && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Update Item Status</h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{selectedItemForStatus.title}</p>
              </div>
              <button
                onClick={() => setSelectedItemForStatus(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {statusModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {statusModalError}
              </div>
            )}

            <form onSubmit={handleSaveItemStatus} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select New Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="open">Active / Open</option>
                  <option value="pending">Pending Claim Verification</option>
                  <option value="claimed">Claimed</option>
                  <option value="found">Found (Safely Stored with Staff)</option>
                  <option value="returned">Returned to Owner</option>
                  <option value="resolved">Resolved &amp; Closed</option>
                </select>
              </div>

              {/* Mandatory fields for Returned / Found / Resolved */}
              {(newStatus === 'returned' || newStatus === 'resolved' || newStatus === 'found') && (
                <div className="space-y-3 p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200 text-xs">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-bold">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mandatory Staff Verification Record</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Return / Verification Notes <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. Student presented valid ID card. Handover verified at Main Ground security booth..."
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Recipient Name / Roll</label>
                      <input
                        type="text"
                        placeholder="e.g. 211FA04XXX"
                        value={recipientInfo}
                        onChange={(e) => setRecipientInfo(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Handover Date</label>
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedItemForStatus(null)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: COMPLAINT RESOLUTION (MANDATORY NOTES) -------------------- */}
      {selectedComplaintForResolve && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Resolve Case / Dispute</h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{selectedComplaintForResolve.itemTitle}</p>
              </div>
              <button
                onClick={() => setSelectedComplaintForResolve(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resolveError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {resolveError}
              </div>
            )}

            <form onSubmit={handleSaveComplaintResolve} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Resolution Outcome <span className="text-rose-500">*</span>
                </label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="resolved">Resolved (Corrective action completed)</option>
                  <option value="dismissed">Dismissed (Report checked, no action needed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Staff Resolution Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe how the problem was resolved (e.g. verified item details, corrected location, or completed student return)..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This note will be recorded permanently in the campus audit history.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedComplaintForResolve(null)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!resolutionNotes.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition disabled:opacity-50"
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: ITEM PREVIEW -------------------- */}
      {viewingItemDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{viewingItemDetail.title}</h3>
                <p className="text-xs text-slate-500">Item Inspection</p>
              </div>
              <button
                onClick={() => setViewingItemDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={getItemImageUrl(viewingItemDetail)}
                  alt={viewingItemDetail.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <strong className="text-slate-800">Category:</strong> {viewingItemDetail.category}
                </div>
                <div>
                  <strong className="text-slate-800">Status:</strong> {viewingItemDetail.status}
                </div>
                <div>
                  <strong className="text-slate-800">Campus Location:</strong> {formatItemLocation(viewingItemDetail)}
                </div>
                <div>
                  <strong className="text-slate-800">Reported By:</strong> {viewingItemDetail.ownerDisplayName || 'Student'}
                </div>
              </div>

              <div className="space-y-1">
                <strong className="text-slate-800">Description:</strong>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {viewingItemDetail.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setViewingItemDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthorityDashboard;
