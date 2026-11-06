import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Tag,
  UserCheck,
  ArrowLeft,
  ShieldCheck,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Lock,
  Share2,
  Inbox,
  QrCode,
  MessageSquare,
  Gift,
  KeyRound,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ConversationModal } from '../components/ConversationModal';
import { QRCodeModal } from '../components/QRCodeModal';
import { ReportComplaintModal } from '../components/ReportComplaintModal';
import { itemService } from '../services/itemService';
import { recoveryService } from '../services/recoveryService';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/formatDate';
import { formatItemLocation } from '../utils/formatLocation';
import { getItemImageUrl, CATEGORY_DEFAULT_IMAGES } from '../utils/itemImageHelper';

export function ItemDetails() {
  const { id } = useParams();
  const { currentUser } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [itemRequests, setItemRequests] = useState([]);
  const [claimMessage, setClaimMessage] = useState('');
  const [verificationAnswer, setVerificationAnswer] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [detailImgSrc, setDetailImgSrc] = useState('');
  const [showComplaintModal, setShowComplaintModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadItemAndRequests() {
      setLoading(true);
      try {
        const found = await itemService.getItemById(id);
        if (!isMounted) return;
        setItem(found);
        if (found) {
          setDetailImgSrc(getItemImageUrl(found));

          // Only request private claims if user is logged in as the owner, authority, or admin
          const isOwnerOrStaff =
            currentUser &&
            (currentUser.uid === found.ownerUid ||
              currentUser.role === 'admin' ||
              currentUser.role === 'authority');

          if (isOwnerOrStaff) {
            const reqs = await recoveryService.getItemRequests(found.id, currentUser);
            if (isMounted) {
              setItemRequests(reqs || []);
            }
          } else {
            if (isMounted) {
              setItemRequests([]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching item details:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadItemAndRequests();
    return () => {
      isMounted = false;
    };
  }, [id, currentUser]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner message="Retrieving item details..." />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Listing Not Found</h2>
        <p className="text-sm text-slate-500">
          This lost or found item record may have been resolved or removed.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse All Campus Listings</span>
        </Link>
      </div>
    );
  }

  const isOwner = Boolean(currentUser && item.ownerUid && currentUser.uid === item.ownerUid);
  const existingUserClaim = currentUser && !isOwner && itemRequests.find((r) => r.requesterUid === currentUser.uid);

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimMessage.trim()) return;

    if (item.privateVerificationClue && !verificationAnswer.trim()) {
      setClaimError('Please provide an answer to the owner\'s verification challenge.');
      return;
    }

    setClaimSubmitting(true);
    setClaimError('');
    try {
      const newReq = await recoveryService.submitRequest({
        itemId: item.id,
        itemTitle: item.title,
        ownerUid: item.ownerUid,
        requesterUid: currentUser.uid,
        requesterDisplayName: currentUser.displayName || 'Campus Student',
        message: claimMessage.trim(),
        verificationAnswer: verificationAnswer.trim() || null
      });

      // Update item to pending claim
      if (item.status === 'open') {
        await itemService.setStatus(item.id, 'pending');
        setItem((prev) => ({ ...prev, status: 'pending' }));
      }

      setItemRequests((prev) => [newReq, ...prev]);
      setClaimSuccess(true);
      setClaimMessage('');
      setVerificationAnswer('');
    } catch (err) {
      console.error('Error submitting recovery request:', err);
      setClaimError('Failed to send message. Please try again.');
    } finally {
      setClaimSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await itemService.setStatus(item.id, newStatus);
      setItem((prev) => ({ ...prev, status: newStatus }));
      setShowStatusModal(false);
    } catch (err) {
      console.error('Status update error:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRequestStatusChange = async (reqId, newStatus) => {
    try {
      await recoveryService.updateRequestStatus(reqId, newStatus);
      setItemRequests((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r))
      );
      if (newStatus === 'accepted') {
        await handleStatusChange('resolved');
      }
    } catch (err) {
      console.error('Failed to update request:', err);
    }
  };

  const handleCopyShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top back & share bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Listings</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#202B3C] bg-[#DDF4EE] border border-[#bfebe0] hover:bg-[#c8ede4] transition shadow-xs cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-[#4776E6]" />
            <span>Recovery Flyer / QR</span>
          </button>

          <button
            onClick={handleCopyShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#737B89] bg-white border border-[#E8EAF0] hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedLink ? 'Link Copied!' : 'Share Listing'}</span>
          </button>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="clay-card bg-white rounded-3xl border border-[#E8EAF0] shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0">
        {/* Left Column: Image */}
        <div className="md:col-span-5 bg-slate-100 border-r border-[#E8EAF0] flex flex-col justify-center relative min-h-[280px] sm:min-h-[380px]">
          <img
            src={detailImgSrc || getItemImageUrl(item)}
            alt={item.title}
            onError={() => {
              const fallback = CATEGORY_DEFAULT_IMAGES[item.category] || CATEGORY_DEFAULT_IMAGES.Other;
              if (detailImgSrc !== fallback) {
                setDetailImgSrc(fallback);
              }
            }}
            className="w-full h-full object-cover max-h-[460px]"
          />
          <div className="absolute top-4 left-4 z-10">
            <StatusBadge type={item.type} status={item.status} isDemo={item.isDemo} isSample={item.isSample} />
          </div>
        </div>

        {/* Right Column: Information */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Category tag */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#DDF4EE] text-[#202B3C] border border-[#bfebe0]">
                <Tag className="w-3 h-3 text-[#4776E6]" />
                <span>{item.category}</span>
              </span>
              <span className="text-xs text-[#737B89]">
                Reported {formatDate(item.createdAt || item.eventDate)}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#202B3C] tracking-tight leading-tight">
              {item.title}
            </h1>

            {/* Optional Reward Banner */}
            {item.rewardNote && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs sm:text-sm font-semibold">
                <Gift className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Reward Offered: {item.rewardNote}</span>
              </div>
            )}

            {/* Location & Reported date details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 border-y border-[#E8EAF0] text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-[#737B89]">
                <MapPin className="w-4 h-4 text-[#4776E6] flex-shrink-0" />
                <span>
                  <strong className="text-[#202B3C] font-semibold">Location:</strong>{' '}
                  {formatItemLocation(item)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[#737B89]">
                <Calendar className="w-4 h-4 text-[#737B89] flex-shrink-0" />
                <span>
                  <strong className="text-[#202B3C] font-semibold">Date {item.type === 'found' ? 'Found' : 'Lost'}:</strong>{' '}
                  {formatDate(item.eventDate)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[#737B89]">
                <UserCheck className="w-4 h-4 text-[#737B89] flex-shrink-0" />
                <span>
                  <strong className="text-[#202B3C] font-semibold">Reported By:</strong>{' '}
                  {item.ownerDisplayName || 'Campus Student'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[#737B89]">
                <Clock className="w-4 h-4 text-[#737B89] flex-shrink-0" />
                <span>
                  <strong className="text-[#202B3C] font-semibold">Status:</strong>{' '}
                  <span className="capitalize text-[#202B3C]">{item.status}</span>
                </span>
              </div>
            </div>

            {/* Distinguishing Features */}
            {item.features && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#737B89] uppercase tracking-wider">Features:</span>
                {(Array.isArray(item.features) ? item.features : item.features.split(',')).map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F8F7F4] text-[#202B3C] border border-[#E8EAF0]">
                    <Sparkles className="w-3 h-3 text-[#4776E6]" />
                    {f.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* Detailed Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#202B3C]">
                Description &amp; Identifying Details
              </h3>
              <p className="text-sm text-[#202B3C] leading-relaxed whitespace-pre-line bg-[#F8F7F4] p-4 rounded-2xl border border-[#E8EAF0]">
                {item.description}
              </p>
            </div>
          </div>

          {/* Action Zone: Owner Actions vs Claimant Actions */}
          <div className="pt-4 border-t border-[#E8EAF0] space-y-4">
            {isOwner ? (
              <div className="bg-[#DDF4EE]/40 border border-[#bfebe0] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#202B3C]">
                      Listing Management &amp; Claims
                    </h4>
                    <p className="text-xs text-[#737B89]">
                      You reported this listing. Manage status, review private verification answers, or coordinate handovers.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowStatusModal(true)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#4776E6] hover:bg-[#385ec7] shadow-sm transition"
                    >
                      Change Status
                    </button>
                    {item.status !== 'resolved' && (
                      <button
                        onClick={() => handleStatusChange('resolved')}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#4776E6] bg-[#DDF4EE] hover:bg-[#c8ede4] transition"
                      >
                        Mark Returned
                      </button>
                    )}
                  </div>
                </div>

                {/* Owner Private Verification Clue Preview */}
                {item.privateVerificationClue && (
                  <div className="p-3 bg-white rounded-xl border border-[#bfebe0] text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#202B3C]">
                      <KeyRound className="w-3.5 h-3.5 text-[#4776E6]" />
                      <span>Your Private Verification Challenge:</span>
                    </div>
                    <p className="font-mono text-[#202B3C] bg-[#F8F7F4] p-2 rounded-lg border border-[#E8EAF0]">
                      "{item.privateVerificationClue}"
                    </p>
                    <p className="text-[11px] text-[#737B89]">
                      Claimants must answer this challenge. Check their responses below before accepting.
                    </p>
                  </div>
                )}

                {/* Display incoming claims for owner */}
                <div className="pt-3 border-t border-[#E8EAF0] space-y-2.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-[#202B3C] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Inbox className="w-3.5 h-3.5 text-[#4776E6]" />
                      <span>Claims Received ({itemRequests.length})</span>
                    </span>
                  </h5>

                  {itemRequests.length === 0 ? (
                    <p className="text-xs text-[#737B89] italic py-1">
                      No student recovery claims submitted yet.
                    </p>
                  ) : (
                    itemRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 bg-white rounded-xl border border-[#E8EAF0] text-xs space-y-2.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#202B3C] text-sm">
                            {req.requesterDisplayName}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                              req.status === 'accepted'
                                ? 'bg-[#DDF4EE] text-[#1c695b]'
                                : req.status === 'declined'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Claimant message */}
                        <div className="bg-[#F8F7F4] p-2.5 rounded-lg border border-[#E8EAF0] text-[#202B3C]">
                          <p className="leading-relaxed">{req.message}</p>
                        </div>

                        {/* Claimant's verification answer if present */}
                        {req.verificationAnswer && (
                          <div className="p-2.5 bg-amber-50/70 rounded-lg border border-amber-200/80 space-y-1">
                            <span className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                              <KeyRound className="w-3 h-3 text-amber-700" />
                              Claimant's Verification Answer:
                            </span>
                            <p className="font-mono text-xs text-[#202B3C] font-semibold bg-white p-2 rounded border border-amber-200">
                              {req.verificationAnswer}
                            </p>
                          </div>
                        )}

                        {/* Actions for this claim */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E8EAF0]">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveChat({
                                conversationId: `conv_${item.id}_${req.requesterUid}`,
                                otherUserDisplayName: req.requesterDisplayName
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#4776E6] bg-[#DDF4EE] hover:bg-[#c8ede4] font-semibold transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat with Claimant</span>
                          </button>

                          {req.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRequestStatusChange(req.id, 'declined')}
                                className="px-2.5 py-1.5 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold transition"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => handleRequestStatusChange(req.id, 'accepted')}
                                className="px-3 py-1.5 rounded-lg text-white bg-[#4776E6] hover:bg-[#385ec7] font-semibold shadow-xs transition"
                              >
                                Accept Claim
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {item.status === 'resolved' ? (
                  <div className="p-4 rounded-2xl bg-[#DDF4EE]/60 border border-[#bfebe0] text-[#202B3C] text-xs sm:text-sm flex items-center gap-2.5">
                    <CheckCircle className="w-5 h-5 text-[#4776E6] flex-shrink-0" />
                    <span className="font-medium">
                      This item has been safely recovered and returned to its owner!
                    </span>
                  </div>
                ) : !currentUser ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>Sign in to verify ownership or submit a recovery request</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/login"
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#4776E6] hover:bg-[#385ec7] transition"
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/register"
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#4776E6] bg-[#DDF4EE] hover:bg-[#c8ede4] transition"
                      >
                        Create Account
                      </Link>
                    </div>
                  </div>
                ) : existingUserClaim ? (
                  <div className="p-4 rounded-2xl bg-[#DDF4EE]/40 border border-[#bfebe0] text-[#202B3C] text-xs sm:text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold">
                        <CheckCircle className="w-4 h-4 text-[#4776E6]" />
                        <span>Your Recovery Claim is {existingUserClaim.status.toUpperCase()}</span>
                      </div>
                      <span className="text-[11px] text-[#737B89] font-medium">
                        Sent {formatDate(existingUserClaim.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[#202B3C] leading-relaxed bg-white/70 p-2.5 rounded-xl border border-[#bfebe0]">
                      "{existingUserClaim.message}"
                    </p>
                    <div className="pt-1 flex items-center justify-between">
                      <p className="text-[11px] text-[#737B89]">
                        Listing owner has been notified. Coordinate a safe handover in-app:
                      </p>
                      <button
                        onClick={() =>
                          setActiveChat({
                            conversationId: `conv_${item.id}_${currentUser.uid}`,
                            otherUserDisplayName: item.ownerDisplayName || 'Reporter'
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#4776E6] hover:bg-[#385ec7] transition shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Open Chat with Reporter</span>
                      </button>
                    </div>
                  </div>
                ) : claimSuccess ? (
                  <div className="p-4 rounded-2xl bg-[#DDF4EE]/50 border border-[#bfebe0] text-[#202B3C] text-xs sm:text-sm space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle className="w-5 h-5 text-[#4776E6] flex-shrink-0" />
                      <span>Recovery Claim Successfully Submitted!</span>
                    </div>
                    <p className="text-xs text-[#737B89]">
                      The listing owner has been notified and can review your verification answers.
                    </p>
                    <button
                      onClick={() =>
                        setActiveChat({
                          conversationId: `conv_${item.id}_${currentUser.uid}`,
                          otherUserDisplayName: item.ownerDisplayName || 'Reporter'
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#4776E6] hover:bg-[#385ec7] transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Open Chat with Reporter</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleClaimSubmit} className="space-y-3.5 bg-[#F8F7F4] p-4 sm:p-5 rounded-2xl border border-[#E8EAF0]">
                    <div className="flex items-center justify-between border-b border-[#E8EAF0] pb-2.5">
                      <label htmlFor="recovery-msg" className="block text-xs font-bold uppercase tracking-wider text-[#202B3C]">
                        {item.type === 'found' ? 'Claim This Item (Prove Ownership)' : 'I Found Your Item (Contact Owner)'}
                      </label>
                      <span className="text-[11px] text-[#737B89] font-medium">Encrypted In-App Handshake</span>
                    </div>

                    {/* Private Verification Question Challenge */}
                    {item.privateVerificationClue && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                          <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                          <span>Owner's Verification Challenge (Required to Claim):</span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 italic bg-white p-2 rounded-lg border border-amber-100">
                          "{item.privateVerificationClue}"
                        </p>
                        <div>
                          <label htmlFor="verify-ans" className="block text-[11px] font-semibold text-amber-950 mb-1">
                            Your Answer / Proof of Ownership:
                          </label>
                          <input
                            id="verify-ans"
                            type="text"
                            required
                            value={verificationAnswer}
                            onChange={(e) => setVerificationAnswer(e.target.value)}
                            placeholder="e.g., serial number, exact lockscreen wallpaper, engraving, internal marks..."
                            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4776E6]"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label htmlFor="recovery-msg" className="block text-xs font-semibold text-[#202B3C]">
                        Message &amp; Preferred Campus Handover Location:
                      </label>
                      <textarea
                        id="recovery-msg"
                        rows={3}
                        required
                        value={claimMessage}
                        onChange={(e) => setClaimMessage(e.target.value)}
                        placeholder={
                          item.type === 'found'
                            ? "Provide contact note and meeting preference: e.g., 'I can meet you at the Library Helpdesk during lunch hour.'"
                            : "Provide retrieval instructions: e.g., 'I safely turned this in to the Student Union Info Desk under reference ID #42.'"
                        }
                        className="w-full px-3.5 py-2.5 bg-white border border-[#E8EAF0] rounded-xl text-[#202B3C] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4776E6]/40 focus:border-[#4776E6]"
                      />
                    </div>

                    {claimError && (
                      <p className="text-xs text-rose-600 font-semibold">{claimError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={claimSubmitting}
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#4776E6] hover:bg-[#385ec7] shadow-sm transition disabled:opacity-50"
                    >
                      {claimSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Recovery Claim</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Safety Protocol Banner */}
      <div className="clay-card bg-white border border-[#E8EAF0] rounded-2xl p-5 flex items-start gap-3.5 text-xs text-[#737B89]">
        <ShieldCheck className="w-5 h-5 text-[#4776E6] flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#202B3C]">Campus Verification Reminder:</strong> Never pay money to claim belongings. For personal safety, meet during daylight hours at official campus hubs like the A-Block / U-Block Information Desk or Campus Library Entrance.
        </div>
      </div>

      {/* Dispute or Issue Reporting */}
      <div className="flex items-center justify-between px-2 pt-1 text-xs text-[#737B89]">
        <span>Notice an error, fake claim, or duplicate?</span>
        <button
          type="button"
          onClick={() => setShowComplaintModal(true)}
          className="inline-flex items-center gap-1.5 font-semibold text-amber-700 hover:text-amber-800 transition cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Report Issue or Dispute</span>
        </button>
      </div>

      {/* Owner Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="clay-card bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 shadow-2xl border border-[#E8EAF0]">
            <h3 className="text-lg font-bold text-[#202B3C]">
              Update Listing Status
            </h3>
            <p className="text-xs sm:text-sm text-[#737B89] leading-relaxed">
              Mark whether this item is currently available, pending verification, or successfully returned to its owner.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleStatusChange('open')}
                disabled={updatingStatus}
                className="w-full text-left p-3 rounded-xl border border-[#E8EAF0] hover:bg-[#F8F7F4] flex items-center justify-between text-xs sm:text-sm font-medium text-[#202B3C]"
              >
                <span>Active / Open</span>
                {item.status === 'open' && <CheckCircle className="w-4 h-4 text-[#4776E6]" />}
              </button>

              <button
                onClick={() => handleStatusChange('pending')}
                disabled={updatingStatus}
                className="w-full text-left p-3 rounded-xl border border-[#E8EAF0] hover:bg-[#F8F7F4] flex items-center justify-between text-xs sm:text-sm font-medium text-[#202B3C]"
              >
                <span>Pending Claim Verification</span>
                {item.status === 'pending' && <CheckCircle className="w-4 h-4 text-amber-500" />}
              </button>

              <button
                onClick={() => handleStatusChange('resolved')}
                disabled={updatingStatus}
                className="w-full text-left p-3 rounded-xl border border-[#bfebe0] bg-[#DDF4EE]/50 hover:bg-[#DDF4EE]/70 flex items-center justify-between text-xs sm:text-sm font-medium text-[#202B3C]"
              >
                <span>Returned &amp; Recovered</span>
                {item.status === 'resolved' && <CheckCircle className="w-4 h-4 text-[#4776E6]" />}
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#737B89] hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Printable Modal */}
      <QRCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        item={item}
      />

      {/* In-App Handover Chat Modal */}
      {activeChat && (
        <ConversationModal
          isOpen={Boolean(activeChat)}
          onClose={() => setActiveChat(null)}
          conversationId={activeChat.conversationId}
          otherUserDisplayName={activeChat.otherUserDisplayName}
          itemTitle={item.title}
          currentUser={currentUser}
        />
      )}

      {/* Report Complaint / Issue Modal */}
      {showComplaintModal && (
        <ReportComplaintModal
          item={item}
          onClose={() => setShowComplaintModal(false)}
        />
      )}
    </div>
  );
}
