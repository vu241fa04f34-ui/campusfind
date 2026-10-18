import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Inbox,
  Trash2,
  Edit3,
  ExternalLink,
  Tag,
  MapPin,
  AlertTriangle,
  X,
  Check,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { itemService } from '../services/itemService';
import { recoveryService } from '../services/recoveryService';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LocationSelect } from '../components/LocationSelect';
import { formatDate } from '../utils/formatDate';
import { formatItemLocation } from '../utils/formatLocation';
import { BLOCK_FLOORS, isBlockLocation } from '../utils/validation';
import { getItemImageUrl, CATEGORY_DEFAULT_IMAGES } from '../utils/itemImageHelper';

export function Dashboard() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-items'); // 'my-items' | 'requests'

  // Item deletion dialog state
  const [deleteTargetItem, setDeleteTargetItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit item modal state
  const [editItem, setEditItem] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      if (!currentUser) return;
      setLoading(true);
      try {
        const allItems = await itemService.getItems();
        // Filter items where owner matches current user
        const userItems = allItems.filter(
          (i) => i.ownerUid === currentUser.uid
        );
        setItems(userItems);

        const userRequests = await recoveryService.getUserRequests(currentUser.uid);
        setRequests(userRequests);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [currentUser]);

  // Handle Delete
  const confirmDelete = async () => {
    if (!deleteTargetItem) return;
    setIsDeleting(true);
    try {
      await itemService.deleteItem(deleteTargetItem.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTargetItem.id));
      setDeleteTargetItem(null);
    } catch (err) {
      console.error('Failed to delete item:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Edit
  const openEditModal = (item) => {
    setEditItem(item);
    setEditTitle(item.title);
    setEditDesc(item.description);
    setEditLocation(item.location);
    setEditFloor(item.floor || '');
    setEditRoom(item.roomNumber || '');
  };

  const handleEditLocationChange = (newLoc) => {
    setEditLocation(newLoc);
    if (!isBlockLocation(newLoc) || newLoc !== editLocation) {
      setEditFloor('');
      setEditRoom('');
    }
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editItem) return;

    setIsSavingEdit(true);
    try {
      const isBlock = isBlockLocation(editLocation);
      const updatedFields = {
        title: editTitle.trim(),
        description: editDesc.trim(),
        location: editLocation.trim(),
        floor: isBlock ? (editFloor.trim() || null) : null,
        roomNumber: isBlock ? (editRoom.trim() || null) : null
      };

      await itemService.updateItem(
        editItem.id,
        updatedFields,
        currentUser
      );

      setItems((prev) =>
        prev.map((i) =>
          i.id === editItem.id
            ? { ...i, ...updatedFields }
            : i
        )
      );
      setEditItem(null);
    } catch (err) {
      console.error('Failed to update listing:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Quick Status Mark (e.g. Returned)
  const handleStatusUpdate = async (itemId, newStatus) => {
    try {
      await itemService.setStatus(itemId, newStatus);
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, status: newStatus } : i))
      );
    } catch (err) {
      console.error('Failed to mark status:', err);
    }
  };

  // Handle Recovery Request Action (accept or decline)
  const handleRequestStatusChange = async (reqId, newStatus) => {
    try {
      await recoveryService.updateRequestStatus(reqId, newStatus);
      setRequests((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      console.error('Failed to update request status:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner message="Loading your campus dashboard..." />
      </div>
    );
  }

  const activeReportsCount = items.filter((i) => i.status !== 'resolved').length;
  const resolvedCount = items.filter((i) => i.status === 'resolved').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* User Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName || 'Student'}
              className="w-16 h-16 rounded-2xl object-cover shadow-md shadow-emerald-600/30 border-2 border-emerald-500"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-2xl font-bold shadow-md shadow-emerald-600/30">
              {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'S'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {currentUser?.displayName || 'Student Account'}
              </h1>
              {(currentUser?.authProvider === 'google' || currentUser?.providerData?.some(p => p.providerId === 'google.com')) && (
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                  Google Verified
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              {currentUser?.email || ''}
            </p>
          </div>
        </div>

        {/* Quick Stats & Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <span className="block text-xl font-bold text-slate-900">{items.length}</span>
            <span className="text-[11px] font-medium text-slate-500">Total Reports</span>
          </div>

          <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-100 text-center">
            <span className="block text-xl font-bold text-amber-700">{activeReportsCount}</span>
            <span className="text-[11px] font-medium text-amber-600">Active</span>
          </div>

          <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
            <span className="block text-xl font-bold text-emerald-700">{resolvedCount}</span>
            <span className="text-[11px] font-medium text-emerald-600">Reunited</span>
          </div>

          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Report</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-4">
        <button
          onClick={() => setActiveTab('my-items')}
          className={`pb-3 text-sm font-semibold transition flex items-center gap-2 border-b-2 ${
            activeTab === 'my-items'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>My Reported Items</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
            {items.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 text-sm font-semibold transition flex items-center gap-2 border-b-2 ${
            activeTab === 'requests'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Recovery Claims &amp; Messages</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">
            {requests.length}
          </span>
        </button>
      </div>

      {/* Tab 1: My Reported Items */}
      {activeTab === 'my-items' && (
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">No Items Reported Yet</h3>
              <p className="text-xs sm:text-sm text-slate-500">
                You haven't reported any lost or found belongings yet. Report an item to start tracking it.
              </p>
              <Link
                to="/report"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Report an Item Now</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={getItemImageUrl(item)}
                      alt={item.title}
                      onError={(e) => {
                        e.currentTarget.src = CATEGORY_DEFAULT_IMAGES[item.category] || CATEGORY_DEFAULT_IMAGES.Other;
                      }}
                      className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-slate-100"
                    />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge type={item.type} status={item.status} />
                        <span className="text-[11px] text-slate-400">
                          {formatDate(item.createdAt || item.eventDate)}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="truncate max-w-[200px]" title={formatItemLocation(item)}>
                            {formatItemLocation(item)}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>{item.category}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/item/${item.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Public View</span>
                      </Link>

                      <button
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => setDeleteTargetItem(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>

                    {item.status !== 'resolved' ? (
                      <button
                        onClick={() => handleStatusUpdate(item.id, 'resolved')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Returned</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusUpdate(item.id, 'open')}
                        className="text-xs text-slate-400 hover:text-slate-600 transition"
                      >
                        Reopen Listing
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Recovery Claims & Messages */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">No Messages Yet</h3>
              <p className="text-xs sm:text-sm text-slate-500">
                When fellow students submit ownership claims or retrieval info on your listings, they will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {req.itemTitle || 'Campus Listing'}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          req.status === 'accepted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'declined'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatDate(req.createdAt)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl text-xs sm:text-sm text-slate-700 leading-relaxed border border-slate-100">
                    <span className="font-semibold text-slate-900 block mb-1">
                      From {req.requesterDisplayName}:
                    </span>
                    {req.message}
                  </div>

                  {req.ownerUid === currentUser.uid && req.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => handleRequestStatusChange(req.id, 'declined')}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100"
                      >
                        Decline Claim
                      </button>
                      <button
                        onClick={() => handleRequestStatusChange(req.id, 'accepted')}
                        className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                      >
                        Accept Claim &amp; Arrange Hand-off
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Delete Listing?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently delete "{deleteTargetItem.title}"? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setDeleteTargetItem(null)}
                disabled={isDeleting}
                className="py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Edit Listing</h3>
              <button
                onClick={() => setEditItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="edit-item-location" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Campus Location
                </label>
                <LocationSelect
                  id="edit-item-location"
                  value={editLocation}
                  onChange={handleEditLocationChange}
                />
              </div>

              {isBlockLocation(editLocation) && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-900 mb-1">
                      Floor <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={editFloor}
                      onChange={(e) => setEditFloor(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select Floor...</option>
                      {(BLOCK_FLOORS[editLocation] || []).map((fl) => (
                        <option key={fl} value={fl}>
                          {fl}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-900 mb-1">
                      Room Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editRoom}
                      onChange={(e) => setEditRoom(e.target.value)}
                      placeholder="e.g. 101, 204"
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
