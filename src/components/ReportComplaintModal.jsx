import React, { useState } from 'react';
import { AlertTriangle, X, Send, CheckCircle2 } from 'lucide-react';
import { complaintService } from '../services/complaintService';
import { useAuth } from '../hooks/useAuth';

const ISSUE_TYPES = [
  { value: 'incorrect_info', label: 'Incorrect Information (Location / Item description)' },
  { value: 'duplicate_item', label: 'Duplicate Item Listing' },
  { value: 'fake_claim', label: 'Dispute / Suspected False Ownership Claim' },
  { value: 'already_returned', label: 'Item Already Recovered or Returned' },
  { value: 'inappropriate', label: 'Inappropriate Content or Privacy Concern' },
  { value: 'other', label: 'Other Issue or Campus Security Inquiry' }
];

export function ReportComplaintModal({ item, onClose, onSuccess }) {
  const { currentUser } = useAuth();
  const [type, setType] = useState('incorrect_info');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide specific details describing the issue or dispute.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await complaintService.createComplaint({
        itemId: item?.id || null,
        itemTitle: item?.title || 'Campus Item',
        type,
        description: description.trim(),
        reporterUid: currentUser?.uid || 'anonymous',
        reporterEmail: currentUser?.email || 'student@vignan.ac.in',
        reporterDisplayName: currentUser?.displayName || 'Campus Student'
      });

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to submit complaint:', err);
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">Issue Report Submitted</h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                Thank you for helping keep CampusFind accurate. Campus staff &amp; administrators have received your report and will review it shortly.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs sm:text-sm hover:bg-slate-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Report an Issue or Dispute</h3>
                <p className="text-xs text-slate-500">
                  Regarding: <span className="font-semibold text-slate-800">{item?.title || 'This Item'}</span>
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Issue Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {ISSUE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Detailed Explanation <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain why this listing needs attention, what is incorrect, or details regarding your dispute..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Your report will be reviewed confidentially by Vignan Campus Authorities.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !description.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition disabled:opacity-50"
              >
                {submitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ReportComplaintModal;
