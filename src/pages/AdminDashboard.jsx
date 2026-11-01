import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Package,
  CheckCircle,
  Clock,
  Search,
  Trash2,
  Eye,
  FileText,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Users,
  Shield,
  KeyRound,
  X,
  Filter,
  UserCheck,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Copy,
  CheckCircle2,
  User,
  Activity,
  LogIn
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { itemService } from '../services/itemService';
import { complaintService } from '../services/complaintService';
import { auditService } from '../services/auditService';
import { authService } from '../services/authService';
import { formatDate, formatDateTime, timeAgo } from '../utils/formatDate';
import { formatItemLocation } from '../utils/formatLocation';
import { getItemImageUrl } from '../utils/itemImageHelper';

export function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation tab: 'overview' | 'users' | 'items' | 'complaints' | 'authorities' | 'audit' | 'settings'
  const [activeTab, setActiveTab] = useState('overview');

  // Core Data
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userDateFilter, setUserDateFilter] = useState('all'); // 'all' | 'today' | '7days' | '30days'
  const [userProviderFilter, setUserProviderFilter] = useState('all'); // 'all' | 'google' | 'phone' | 'password'
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [copiedUid, setCopiedUid] = useState(null);

  const [itemSearch, setItemSearch] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [itemStatusFilter, setItemStatusFilter] = useState('all');

  const [complaintSearch, setComplaintSearch] = useState('');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('all');

  // Modals & Action dialogs
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deletingItem, setDeletingItem] = useState(false);

  const [selectedItemForStatus, setSelectedItemForStatus] = useState(null);
  const [newItemStatus, setNewItemStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const [selectedComplaintForResolve, setSelectedComplaintForResolve] = useState(null);
  const [complaintResolveStatus, setComplaintResolveStatus] = useState('resolved');
  const [complaintResolveNote, setComplaintResolveNote] = useState('');
  const [resolvingComplaint, setResolvingComplaint] = useState(false);

  const [userForRoleChange, setUserForRoleChange] = useState(null);
  const [updatingRole, setUpdatingRole] = useState(false);

  const [viewingItem, setViewingItem] = useState(null);
  const [notification, setNotification] = useState('');

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [allItems, allUsers, allComplaints, allLogs] = await Promise.all([
        itemService.getItems(),
        authService.getAllUsers(),
        complaintService.getAllComplaints(),
        auditService.getAuditLogs(100)
      ]);
      setItems(allItems);
      setUsers(allUsers);
      setComplaints(allComplaints);
      setAuditLogs(allLogs);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  // --- Item Management Actions ---
  const handleOpenStatusModal = (item) => {
    setSelectedItemForStatus(item);
    setNewItemStatus(item.status);
    setStatusNote('');
  };

  const handleSaveItemStatus = async (e) => {
    e.preventDefault();
    if (!selectedItemForStatus) return;

    try {
      await itemService.setStatus(selectedItemForStatus.id, newItemStatus, {
        adminNote: statusNote.trim() || null,
        statusUpdatedBy: currentUser?.email || 'Admin'
      });

      await auditService.logAction({
        actorUid: currentUser?.uid || 'admin',
        actorEmail: currentUser?.email || 'admin@vignan.ac.in',
        actorRole: 'admin',
        action: 'STATUS_OVERRIDE',
        targetType: 'item',
        targetId: selectedItemForStatus.id,
        details: `Updated item "${selectedItemForStatus.title}" status from "${selectedItemForStatus.status}" to "${newItemStatus}". ${statusNote ? `Note: ${statusNote}` : ''}`
      });

      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedItemForStatus.id ? { ...i, status: newItemStatus } : i
        )
      );

      setSelectedItemForStatus(null);
      notify(`Status of "${selectedItemForStatus.title}" changed to ${newItemStatus}.`);
      loadAllData();
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    setDeletingItem(true);
    try {
      await itemService.deleteItem(itemToDelete.id);

      await auditService.logAction({
        actorUid: currentUser?.uid || 'admin',
        actorEmail: currentUser?.email || 'admin@vignan.ac.in',
        actorRole: 'admin',
        action: 'ITEM_DELETED',
        targetType: 'item',
        targetId: itemToDelete.id,
        details: `Permanently removed item report "${itemToDelete.title}" (ID: ${itemToDelete.id})`
      });

      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      setItemToDelete(null);
      notify(`Item "${itemToDelete.title}" deleted.`);
      loadAllData();
    } catch (err) {
      console.error('Delete item failed:', err);
    } finally {
      setDeletingItem(false);
    }
  };

  // --- Complaint Management Actions ---
  const handleOpenResolveModal = (comp) => {
    setSelectedComplaintForResolve(comp);
    setComplaintResolveStatus('resolved');
    setComplaintResolveNote('');
  };

  const handleSaveComplaintResolution = async (e) => {
    e.preventDefault();
    if (!selectedComplaintForResolve || !complaintResolveNote.trim()) return;

    setResolvingComplaint(true);
    try {
      const adminName = currentUser?.displayName || currentUser?.email || 'Administrator';
      await complaintService.updateComplaintStatus(selectedComplaintForResolve.id, {
        status: complaintResolveStatus,
        resolutionNote: complaintResolveNote.trim(),
        resolvedBy: adminName
      });

      await auditService.logAction({
        actorUid: currentUser?.uid || 'admin',
        actorEmail: currentUser?.email || 'admin@vignan.ac.in',
        actorRole: 'admin',
        action: 'COMPLAINT_RESOLVED',
        targetType: 'complaint',
        targetId: selectedComplaintForResolve.id,
        details: `Resolved complaint for "${selectedComplaintForResolve.itemTitle}" as ${complaintResolveStatus}: ${complaintResolveNote.trim()}`
      });

      setComplaints((prev) =>
        prev.map((c) =>
          c.id === selectedComplaintForResolve.id
            ? {
                ...c,
                status: complaintResolveStatus,
                resolutionNote: complaintResolveNote.trim(),
                resolvedBy: adminName,
                resolvedAt: new Date().toISOString()
              }
            : c
        )
      );

      setSelectedComplaintForResolve(null);
      notify(`Complaint for "${selectedComplaintForResolve.itemTitle}" marked ${complaintResolveStatus}.`);
      loadAllData();
    } catch (err) {
      console.error('Resolve complaint failed:', err);
    } finally {
      setResolvingComplaint(false);
    }
  };

  // --- User / Role Management Actions ---
  const handleToggleStaffRole = async (user) => {
    const newRole = user.role === 'authority' ? 'student' : 'authority';
    setUserForRoleChange({ user, newRole });
  };

  const handleConfirmRoleChange = async () => {
    if (!userForRoleChange) return;
    setUpdatingRole(true);
    try {
      await authService.setUserRole(userForRoleChange.user.uid, userForRoleChange.newRole, {
        uid: currentUser?.uid,
        email: currentUser?.email
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.uid === userForRoleChange.user.uid
            ? { ...u, role: userForRoleChange.newRole }
            : u
        )
      );

      notify(
        `${userForRoleChange.newRole === 'authority' ? 'Granted Staff Authority to' : 'Revoked Staff Authority from'} ${
          userForRoleChange.user.displayName || userForRoleChange.user.email
        }.`
      );
      setUserForRoleChange(null);
      loadAllData();
    } catch (err) {
      console.error('Failed to change role:', err);
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleCopyUid = (uid, e) => {
    e?.stopPropagation?.();
    if (!uid) return;
    try {
      navigator.clipboard?.writeText(uid);
      setCopiedUid(uid);
      setTimeout(() => setCopiedUid(null), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Calculations / Real Metrics
  const nowMs = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();

  const totalUsersCount = users.length;
  const totalRegisteredUsers = users.length;
  const recentlyActiveUsers = users.filter((u) => {
    const t = new Date(u.lastLoginAt || u.lastSignInTime || 0).getTime();
    return nowMs - t <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const usersLoggedInToday = users.filter((u) => {
    const t = new Date(u.lastLoginAt || u.lastSignInTime || 0).getTime();
    return t >= startOfTodayMs;
  }).length;
  const newRegistrations = users.filter((u) => {
    const t = new Date(u.createdAt || 0).getTime();
    return nowMs - t <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const totalItemsCount = items.length;
  const lostItemsCount = items.filter((i) => i.type === 'lost').length;
  const foundItemsCount = items.filter((i) => i.type === 'found').length;
  const unresolvedComplaintsCount = complaints.filter(
    (c) => c.status === 'pending' || c.status === 'in_progress'
  ).length;
  const resolvedComplaintsCount = complaints.filter((c) => c.status === 'resolved').length;
  const staffAuthoritiesCount = users.filter((u) => u.role === 'authority').length;

  // Filtered Users (Search by Name, Email, Phone, UID + Role + Provider + Date)
  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phoneNumber?.toLowerCase().includes(q) ||
      u.uid?.toLowerCase().includes(q);

    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;

    const provider = (u.authProvider || '').toLowerCase();
    const matchesProvider =
      userProviderFilter === 'all' ||
      (userProviderFilter === 'google' && provider.includes('google')) ||
      (userProviderFilter === 'phone' && provider.includes('phone')) ||
      (userProviderFilter === 'password' && (provider.includes('password') || provider.includes('email')));

    let matchesDate = true;
    const loginTime = new Date(u.lastLoginAt || u.lastSignInTime || 0).getTime();
    if (userDateFilter === 'today') {
      matchesDate = loginTime >= startOfTodayMs;
    } else if (userDateFilter === '7days') {
      matchesDate = nowMs - loginTime <= 7 * 24 * 60 * 60 * 1000;
    } else if (userDateFilter === '30days') {
      matchesDate = nowMs - loginTime <= 30 * 24 * 60 * 60 * 1000;
    }

    return matchesSearch && matchesRole && matchesProvider && matchesDate;
  });

  const totalUserPages = Math.ceil(filteredUsers.length / userPageSize) || 1;
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * userPageSize,
    userPage * userPageSize
  );

  // Filtered Items
  const filteredItems = items.filter((i) => {
    const q = itemSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      i.title?.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q) ||
      i.location?.toLowerCase().includes(q) ||
      i.ownerDisplayName?.toLowerCase().includes(q);
    const matchesType = itemTypeFilter === 'all' || i.type === itemTypeFilter;
    const matchesStatus = itemStatusFilter === 'all' || i.status === itemStatusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Filtered Complaints
  const filteredComplaints = complaints.filter((c) => {
    const q = complaintSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.itemTitle?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.reporterDisplayName?.toLowerCase().includes(q) ||
      c.reporterEmail?.toLowerCase().includes(q);
    const matchesStatus = complaintStatusFilter === 'all' || c.status === complaintStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-white shrink-0 flex flex-col border-r border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center border border-slate-700 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-white">CampusFind Admin</h2>
            <p className="text-[10px] text-slate-400 font-medium">Root Authority Console</p>
          </div>
        </div>

        {/* Admin Card */}
        <div className="p-4 mx-3 my-3 rounded-2xl bg-slate-800/60 border border-slate-700/70 text-xs space-y-1">
          <p className="font-bold text-white truncate">{currentUser?.displayName || 'System Administrator'}</p>
          <p className="text-[11px] text-slate-400 truncate">{currentUser?.email}</p>
          <div className="pt-1">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800/60">
              Full Administrator
            </span>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('users');
              setUserPage(1);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
              activeTab === 'users'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>User Management</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">
              {totalUsersCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
              activeTab === 'items'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4" />
              <span>Manage All Items</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">
              {totalItemsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('complaints')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
              activeTab === 'complaints'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Complaints &amp; Disputes</span>
            </div>
            {unresolvedComplaintsCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500 text-slate-950 font-bold">
                {unresolvedComplaintsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('authorities')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
              activeTab === 'authorities'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4" />
              <span>Staff Authorities</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-indigo-300">
              {staffAuthoritiesCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'audit'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Audit History</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Settings &amp; Security</span>
          </button>
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
        {/* Banner Alert if Action Success */}
        {notification && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* -------------------- TAB 1: OVERVIEW -------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Platform Operations Command
                </h1>
                <p className="text-xs text-slate-500">
                  Comprehensive real-time metrics across Vignan University lost and found reports, accounts, and disputes.
                </p>
              </div>
              <button
                onClick={loadAllData}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Sync Realtime Data</span>
              </button>
            </div>

            {/* Real Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Users</span>
                <p className="text-2xl font-black text-slate-900">{totalUsersCount}</p>
                <p className="text-[10px] text-slate-400">{staffAuthoritiesCount} Staff Authorities</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Items</span>
                <p className="text-2xl font-black text-slate-900">{totalItemsCount}</p>
                <p className="text-[10px] text-slate-400">Campus Listings</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lost Items</span>
                <p className="text-2xl font-black text-amber-600">{lostItemsCount}</p>
                <p className="text-[10px] text-slate-400">Reported Lost</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Found Items</span>
                <p className="text-2xl font-black text-emerald-600">{foundItemsCount}</p>
                <p className="text-[10px] text-slate-400">Recovered / In Care</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unresolved</span>
                <p className="text-2xl font-black text-rose-600">{unresolvedComplaintsCount}</p>
                <p className="text-[10px] text-slate-400">Open Disputes</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolved Cases</span>
                <p className="text-2xl font-black text-teal-600">{resolvedComplaintsCount}</p>
                <p className="text-[10px] text-slate-400">Completed Disputes</p>
              </div>
            </div>

            {/* Quick Actions & Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Complaints to Review */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Complaints Needing Moderation</h3>
                  <button
                    onClick={() => setActiveTab('complaints')}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {complaints.filter((c) => c.status !== 'resolved').length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No open complaints requiring action.</p>
                ) : (
                  <div className="space-y-2">
                    {complaints
                      .filter((c) => c.status !== 'resolved')
                      .slice(0, 4)
                      .map((c) => (
                        <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5 max-w-[70%]">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                              {c.type.replace('_', ' ')}
                            </span>
                            <p className="font-bold text-slate-900 truncate">{c.itemTitle}</p>
                            <p className="text-slate-500 truncate">{c.description}</p>
                          </div>
                          <button
                            onClick={() => handleOpenResolveModal(c)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shrink-0"
                          >
                            Resolve
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Recent Audit Actions */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Recent Platform Audit Events</h3>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <span>View Trail</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No audit logs recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.slice(0, 4).map((log) => (
                      <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[10px] uppercase bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-400">{formatDate(log.timestamp)}</span>
                        </div>
                        <p className="text-slate-700 line-clamp-1">{log.details}</p>
                        <p className="text-[10px] text-slate-400">By: {log.actorEmail || log.actorUid}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------------------- TAB 2: USER MANAGEMENT -------------------- */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  User Management
                </h1>
                <p className="text-xs text-slate-500">
                  Live authenticated accounts, activity timestamps, and authorization status across Vignan University.
                </p>
              </div>

              <button
                onClick={loadAllData}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Sync Realtime Data</span>
              </button>
            </div>

            {/* 4 Summary Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Registered Users
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900">{totalRegisteredUsers}</p>
                <p className="text-[10px] text-slate-400">Total accounts in Firebase</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Recently Active Users
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-indigo-600">{recentlyActiveUsers}</p>
                <p className="text-[10px] text-slate-400">Active in last 7 days</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Users Logged In Today
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <LogIn className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-teal-600">{usersLoggedInToday}</p>
                <p className="text-[10px] text-slate-400">Authenticated today</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    New Registrations
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-purple-600">{newRegistrations}</p>
                <p className="text-[10px] text-slate-400">Joined in last 7 days</p>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by student name, email, phone number, or UID..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {userSearch && (
                    <button
                      onClick={() => {
                        setUserSearch('');
                        setUserPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Activity Filter */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                      value={userDateFilter}
                      onChange={(e) => {
                        setUserDateFilter(e.target.value);
                        setUserPage(1);
                      }}
                      className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="all">Activity: All Time</option>
                      <option value="today">Activity: Today</option>
                      <option value="7days">Activity: Last 7 Days</option>
                      <option value="30days">Activity: Last 30 Days</option>
                    </select>
                  </div>

                  {/* Provider Filter */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                      value={userProviderFilter}
                      onChange={(e) => {
                        setUserProviderFilter(e.target.value);
                        setUserPage(1);
                      }}
                      className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="all">Provider: All</option>
                      <option value="google">Google Login</option>
                      <option value="phone">Phone OTP</option>
                      <option value="password">Email &amp; Password</option>
                    </select>
                  </div>

                  {/* Role Filter */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                      value={userRoleFilter}
                      onChange={(e) => {
                        setUserRoleFilter(e.target.value);
                        setUserPage(1);
                      }}
                      className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="all">Role: All</option>
                      <option value="student">Students</option>
                      <option value="authority">Staff Authorities</option>
                      <option value="admin">Administrators</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Active Filter Chips */}
              {(userSearch || userRoleFilter !== 'all' || userDateFilter !== 'all' || userProviderFilter !== 'all') && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                  <span className="font-semibold">Filtered results ({filteredUsers.length} users):</span>
                  <button
                    onClick={() => {
                      setUserSearch('');
                      setUserRoleFilter('all');
                      setUserDateFilter('all');
                      setUserProviderFilter('all');
                      setUserPage(1);
                    }}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold underline cursor-pointer"
                  >
                    Reset all filters
                  </button>
                </div>
              )}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Student / User</th>
                      <th className="p-3.5">Email Address</th>
                      <th className="p-3.5">Mobile Number</th>
                      <th className="p-3.5">Firebase UID</th>
                      <th className="p-3.5">Login Provider</th>
                      <th className="p-3.5">Registration Date</th>
                      <th className="p-3.5">Last Successful Login</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-slate-700 text-sm">No registered users found</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {users.length === 0
                              ? 'No users have authenticated in Firebase yet.'
                              : 'No users matched your current search and filter settings.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((u) => {
                        const providerLower = (u.authProvider || '').toLowerCase();
                        let providerBadge = {
                          label: 'Email & Password',
                          classes: 'bg-slate-100 text-slate-700 border-slate-200'
                        };
                        if (providerLower.includes('google')) {
                          providerBadge = {
                            label: 'Google',
                            classes: 'bg-rose-50 text-rose-700 border-rose-200'
                          };
                        } else if (providerLower.includes('phone')) {
                          providerBadge = {
                            label: 'Phone OTP',
                            classes: 'bg-blue-50 text-blue-700 border-blue-200'
                          };
                        }

                        return (
                          <tr key={u.uid} className="hover:bg-slate-50/70 transition">
                            {/* 1. Student Name */}
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                {u.photoURL ? (
                                  <img
                                    src={u.photoURL}
                                    alt={u.displayName || 'User'}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                    {u.displayName ? u.displayName[0] : (u.email ? u.email[0].toUpperCase() : 'U')}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 truncate">
                                    {u.displayName || 'Vignan Student'}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span
                                      className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                                        u.role === 'admin'
                                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                          : u.role === 'authority'
                                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {u.role || 'student'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 2. Email Address */}
                            <td className="p-3.5">
                              {u.email ? (
                                <span className="font-medium text-slate-800">{u.email}</span>
                              ) : (
                                <span className="text-slate-400 italic">Not Provided</span>
                              )}
                            </td>

                            {/* 3. Mobile Number */}
                            <td className="p-3.5">
                              {u.phoneNumber ? (
                                <span className="font-medium text-slate-800">{u.phoneNumber}</span>
                              ) : (
                                <span className="text-slate-400 italic">Not Provided</span>
                              )}
                            </td>

                            {/* 4. Firebase UID */}
                            <td className="p-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {u.uid.slice(0, 10)}...
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyUid(u.uid, e)}
                                  title="Copy full UID"
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                                >
                                  {copiedUid === u.uid ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* 5. Login Provider */}
                            <td className="p-3.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${providerBadge.classes}`}
                              >
                                {providerBadge.label}
                              </span>
                            </td>

                            {/* 6. Account Registration Date */}
                            <td className="p-3.5 text-slate-600 whitespace-nowrap">
                              {formatDate(u.createdAt)}
                            </td>

                            {/* 7. Last Successful Login Date & Time */}
                            <td className="p-3.5 text-slate-800 whitespace-nowrap">
                              <div className="space-y-0.5">
                                <p className="font-semibold text-slate-900">{formatDateTime(u.lastLoginAt)}</p>
                                <p className="text-[10px] text-slate-400">{timeAgo(u.lastLoginAt)}</p>
                              </div>
                            </td>

                            {/* 8. Account Status */}
                            <td className="p-3.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active
                              </span>
                            </td>

                            {/* 9. Actions */}
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedUserForDetails(u)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer"
                                  title="View full user details and activity"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Details</span>
                                </button>

                                {u.role === 'admin' ? (
                                  <span className="text-[11px] font-semibold text-slate-400 italic px-2">
                                    Root Admin
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStaffRole(u)}
                                    className={`px-2.5 py-1.5 rounded-xl font-semibold text-[11px] transition cursor-pointer ${
                                      u.role === 'authority'
                                        ? 'border border-rose-200 text-rose-700 hover:bg-rose-50'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                                    }`}
                                  >
                                    {u.role === 'authority' ? 'Revoke Staff' : 'Grant Staff'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredUsers.length > 0 && (
                <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span>
                      Showing{' '}
                      <strong>{(userPage - 1) * userPageSize + 1}</strong> to{' '}
                      <strong>{Math.min(userPage * userPageSize, filteredUsers.length)}</strong> of{' '}
                      <strong>{filteredUsers.length}</strong> users
                    </span>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-500">Rows:</span>
                      <select
                        value={userPageSize}
                        onChange={(e) => {
                          setUserPageSize(Number(e.target.value));
                          setUserPage(1);
                        }}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-semibold text-slate-700 focus:outline-none"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs text-slate-700"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <span className="px-2 text-xs font-bold text-slate-700">
                      Page {userPage} of {totalUserPages}
                    </span>
                    <button
                      type="button"
                      disabled={userPage >= totalUserPages}
                      onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs text-slate-700"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------- TAB 3: MANAGE ALL ITEMS -------------------- */}
        {activeTab === 'items' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Item Inventory &amp; Moderation
                </h1>
                <p className="text-xs text-slate-500">
                  Inspect all lost and found listings. Update statuses or remove invalid items.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={itemTypeFilter}
                  onChange={(e) => setItemTypeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="lost">Lost Items</option>
                  <option value="found">Found Items</option>
                </select>

                <select
                  value={itemStatusFilter}
                  onChange={(e) => setItemStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
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
                placeholder="Search items by title, category, location, or reporter..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Listing</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Location</th>
                      <th className="p-3.5">Reporter</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
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
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                                    item.type === 'lost' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {item.type}
                                </span>
                                <span className="text-[10px] text-slate-400">{formatDate(item.createdAt || item.eventDate)}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">{item.category}</td>
                        <td className="p-3.5 text-slate-600 font-medium">{formatItemLocation(item)}</td>
                        <td className="p-3.5 text-slate-600">{item.ownerDisplayName || 'Student'}</td>
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
                              onClick={() => setViewingItem(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                              title="Inspect Item"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenStatusModal(item)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-xs text-slate-700 transition"
                            >
                              Status
                            </button>
                            <button
                              onClick={() => setItemToDelete(item)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* -------------------- TAB 4: COMPLAINTS & DISPUTES -------------------- */}
        {activeTab === 'complaints' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Dispute &amp; Complaint Moderation
                </h1>
                <p className="text-xs text-slate-500">
                  Review student reports regarding inaccurate items, duplicate postings, or contested ownership claims.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={complaintStatusFilter}
                  onChange={(e) => setComplaintStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Complaints</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search complaints by title, reporter, or content..."
                value={complaintSearch}
                onChange={(e) => setComplaintSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Complaints Cards */}
            <div className="grid grid-cols-1 gap-3.5">
              {filteredComplaints.map((comp) => (
                <div
                  key={comp.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
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
                    <span className="text-[11px] text-slate-400">{formatDate(comp.createdAt)}</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900">{comp.itemTitle}</h3>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                      "{comp.description}"
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                    <div className="space-y-0.5 text-slate-500">
                      <p>
                        <strong className="text-slate-700">Reporter:</strong> {comp.reporterDisplayName} ({comp.reporterEmail || 'No email'})
                      </p>
                      {comp.resolutionNote && (
                        <p className="text-emerald-700 font-semibold">
                          Resolution: {comp.resolutionNote} ({comp.resolvedBy})
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenResolveModal(comp)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
                      >
                        {comp.status === 'resolved' ? 'Update Note' : 'Resolve Case'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------- TAB 5: STAFF AUTHORITIES -------------------- */}
        {activeTab === 'authorities' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Staff Authorities Management
              </h1>
              <p className="text-xs text-slate-500">
                Manage designated security officers and campus personnel authorized to resolve disputes and record returns.
              </p>
            </div>

            {/* Security Notice */}
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>Security Separation of Privileges:</span>
              </div>
              <p className="leading-relaxed">
                Staff authorities are strictly restricted to updating item statuses with verified notes and resolving student complaints. They cannot access user administration, grant roles, delete listings, or modify security settings.
              </p>
            </div>

            {/* Authorities List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users
                .filter((u) => u.role === 'authority')
                .map((staff) => (
                  <div
                    key={staff.uid}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                          {staff.displayName ? staff.displayName[0] : 'S'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{staff.displayName}</p>
                          <p className="text-xs text-slate-500">{staff.email}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                        Staff
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">UID: {staff.uid.slice(0, 12)}...</span>
                      <button
                        onClick={() => handleToggleStaffRole(staff)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition"
                      >
                        Revoke Clearance
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* -------------------- TAB 6: AUDIT TRAIL -------------------- */}
        {activeTab === 'audit' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Campus Moderation Audit History
              </h1>
              <p className="text-xs text-slate-500">
                Immutable chronological log of all administrator and staff operations on CampusFind.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800">
                        {log.action}
                      </span>
                      <span className="font-bold text-slate-800">
                        {log.actorEmail || log.actorUid} ({log.actorRole})
                      </span>
                    </div>
                    <p className="text-slate-600">{log.details}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{formatDate(log.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------- TAB 7: SETTINGS & SECURITY -------------------- */}
        {activeTab === 'settings' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Security Architecture &amp; System Configuration
              </h1>
              <p className="text-xs text-slate-500">
                Information on Firebase security rules, custom claims provisioning, and university domain enforcement.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 text-xs text-slate-700 leading-relaxed shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Role Enforcement Architecture</h3>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Admin Role:</strong> Enforced by Firebase custom claims (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">claims.admin === true</code>) or verified email domain (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">*admin@vignan.ac.in</code>).
                </li>
                <li>
                  <strong>Authority Role:</strong> Enforced by custom claims (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">claims.authority === true</code>) or staff Firestore profile.
                </li>
                <li>
                  <strong>Firestore Rules:</strong> Database operations are guarded at the server layer. Regular students and authorities are strictly blocked from writing <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">role = 'admin'</code>.
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* -------------------- MODAL: UPDATE ITEM STATUS -------------------- */}
      {selectedItemForStatus && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Override Item Status</h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{selectedItemForStatus.title}</p>
              </div>
              <button
                onClick={() => setSelectedItemForStatus(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItemStatus} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Target Status
                </label>
                <select
                  value={newItemStatus}
                  onChange={(e) => setNewItemStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="open">Active / Open</option>
                  <option value="pending">Pending Claim Verification</option>
                  <option value="claimed">Claimed</option>
                  <option value="found">Found / Stored at Security</option>
                  <option value="returned">Returned to Owner</option>
                  <option value="resolved">Resolved &amp; Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Administrative Reason / Note
                </label>
                <textarea
                  rows={2}
                  placeholder="Reason for status change..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition"
                >
                  Confirm Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: RESOLVE COMPLAINT -------------------- */}
      {selectedComplaintForResolve && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Resolve Complaint</h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{selectedComplaintForResolve.itemTitle}</p>
              </div>
              <button
                onClick={() => setSelectedComplaintForResolve(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveComplaintResolution} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Resolution Decision
                </label>
                <select
                  value={complaintResolveStatus}
                  onChange={(e) => setComplaintResolveStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="resolved">Resolved (Corrective Action Taken)</option>
                  <option value="dismissed">Dismissed (No Action Required)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Resolution Explanation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain how this dispute or inaccurate information was resolved..."
                  value={complaintResolveNote}
                  onChange={(e) => setComplaintResolveNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
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
                  disabled={resolvingComplaint || !complaintResolveNote.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition disabled:opacity-50"
                >
                  {resolvingComplaint ? 'Saving...' : 'Resolve Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: DELETE ITEM CONFIRMATION -------------------- */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-rose-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Item Report?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-800">"{itemToDelete.title}"</strong>? This will remove all associated claims and cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteItem}
                disabled={deletingItem}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition disabled:opacity-50"
              >
                {deletingItem ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: ROLE CHANGE CONFIRMATION -------------------- */}
      {userForRoleChange && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {userForRoleChange.newRole === 'authority' ? 'Grant Staff Authority?' : 'Revoke Staff Authority?'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                User: <strong className="text-slate-800">{userForRoleChange.user.displayName || userForRoleChange.user.email}</strong>
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {userForRoleChange.newRole === 'authority'
                  ? 'This allows the user to access the Authority Portal, update item statuses, and resolve complaints.'
                  : 'This reverts the user back to standard student privileges.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setUserForRoleChange(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRoleChange}
                disabled={updatingRole}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition disabled:opacity-50"
              >
                {updatingRole ? 'Updating...' : 'Confirm Role Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: ITEM INSPECTION -------------------- */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{viewingItem.title}</h3>
                <p className="text-xs text-slate-500">Item Inspection</p>
              </div>
              <button
                onClick={() => setViewingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={getItemImageUrl(viewingItem)}
                  alt={viewingItem.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <strong className="text-slate-800">Category:</strong> {viewingItem.category}
                </div>
                <div>
                  <strong className="text-slate-800">Type:</strong> {viewingItem.type}
                </div>
                <div>
                  <strong className="text-slate-800">Status:</strong> {viewingItem.status}
                </div>
                <div>
                  <strong className="text-slate-800">Campus Location:</strong> {formatItemLocation(viewingItem)}
                </div>
                <div>
                  <strong className="text-slate-800">Reported By:</strong> {viewingItem.ownerDisplayName || 'Student'}
                </div>
                <div>
                  <strong className="text-slate-800">Owner UID:</strong> {viewingItem.ownerUid || 'N/A'}
                </div>
              </div>

              <div className="space-y-1">
                <strong className="text-slate-800">Description:</strong>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {viewingItem.description}
                </p>
              </div>

              {viewingItem.privateVerificationClue && (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                  <strong className="text-amber-900">Private Verification Challenge:</strong>
                  <p className="font-mono text-slate-800 mt-0.5">{viewingItem.privateVerificationClue}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setViewingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
      {/* -------------------- MODAL: USER DETAILS VIEW -------------------- */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Student Profile &amp; Login Activity</h3>
                  <p className="text-[11px] text-slate-500">Live Firebase Authentication Record</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Overview */}
            <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              {selectedUserForDetails.photoURL ? (
                <img
                  src={selectedUserForDetails.photoURL}
                  alt={selectedUserForDetails.displayName || 'User'}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base uppercase shrink-0">
                  {selectedUserForDetails.displayName
                    ? selectedUserForDetails.displayName[0]
                    : selectedUserForDetails.email ? selectedUserForDetails.email[0].toUpperCase() : 'U'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-slate-900 text-sm truncate">
                  {selectedUserForDetails.displayName || 'Vignan Student'}
                </h4>
                <p className="text-xs text-slate-500 truncate">{selectedUserForDetails.email || 'No email registered'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    Status: {selectedUserForDetails.status || 'Active'}
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                    Role: {selectedUserForDetails.role || 'student'}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</span>
                <p className="font-semibold text-slate-800">{selectedUserForDetails.email || 'Not Provided'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile Number</span>
                <p className="font-semibold text-slate-800">{selectedUserForDetails.phoneNumber || 'Not Provided'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Firebase User UID</span>
                  <button
                    type="button"
                    onClick={(e) => handleCopyUid(selectedUserForDetails.uid, e)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    {copiedUid === selectedUserForDetails.uid ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy UID</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-[11px] text-slate-700 break-all select-all">
                  {selectedUserForDetails.uid}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Login Method / Provider</span>
                <p className="font-semibold text-slate-800 capitalize">
                  {selectedUserForDetails.authProvider === 'google'
                    ? 'Google Account SSO'
                    : selectedUserForDetails.authProvider === 'phone'
                    ? 'Mobile Phone OTP'
                    : 'Email & Password'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registration Date</span>
                <p className="font-semibold text-slate-800">{formatDateTime(selectedUserForDetails.createdAt)}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Successful Authentication</span>
                <p className="font-semibold text-slate-900">{formatDateTime(selectedUserForDetails.lastLoginAt)}</p>
                <p className="text-[11px] text-slate-400">{timeAgo(selectedUserForDetails.lastLoginAt)}</p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {selectedUserForDetails.role !== 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    handleToggleStaffRole(selectedUserForDetails);
                    setSelectedUserForDetails(null);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    selectedUserForDetails.role === 'authority'
                      ? 'border border-rose-200 text-rose-700 hover:bg-rose-50'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {selectedUserForDetails.role === 'authority' ? 'Revoke Staff Clearance' : 'Grant Staff Authority'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedUserForDetails(null)}
                className="ml-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
