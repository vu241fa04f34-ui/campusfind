import React, { useState } from 'react';
import { X, Printer, Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { formatItemLocation } from '../utils/formatLocation';
import { formatDate } from '../utils/formatDate';

export function QRCodeModal({ isOpen, onClose, item }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !item) return null;

  const itemUrl = window.location.href;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(itemUrl)}&color=064e3b`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(itemUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 my-8">
        {/* Modal Top Actions */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <QrCode className="w-5 h-5 text-emerald-600" />
            <span>Campus Recovery Flyer &amp; QR Code</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Flyer Content */}
        <div id="printable-flyer" className="p-6 sm:p-8 space-y-6 text-center bg-white">
          {/* Header */}
          <div className="space-y-1 border-b pb-4 border-slate-100">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              CAMPUSFIND • VIGNAN UNIVERSITY
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight pt-1">
              {item.type === 'lost' ? '⚠️ LOST ITEM NOTICE' : '📢 FOUND ITEM NOTICE'}
            </h2>
            <p className="text-xs text-slate-500">
              Vadlamudi, Guntur Campus • Official Lost &amp; Found Bulletin
            </p>
          </div>

          {/* Item details */}
          <div className="space-y-2 text-left bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
            <div className="text-xs text-slate-600 space-y-1">
              <p>
                <strong>Category:</strong> {item.category}
              </p>
              <p>
                <strong>Location:</strong> {formatItemLocation(item)}
              </p>
              <p>
                <strong>Date:</strong> {formatDate(item.eventDate || item.createdAt)}
              </p>
              {item.rewardNote && (
                <p className="text-amber-800 font-bold bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 mt-1 inline-block">
                  🎁 Reward Offered: {item.rewardNote}
                </p>
              )}
            </div>
            {item.description && (
              <p className="text-xs text-slate-500 italic pt-1 border-t border-slate-200/60 line-clamp-2">
                "{item.description}"
              </p>
            )}
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center justify-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-emerald-200">
              <img
                src={qrCodeUrl}
                alt={`QR code for ${item.title}`}
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
              />
            </div>
            <p className="text-xs text-emerald-900 font-semibold max-w-xs">
              Scan with your phone camera to view full report, verify details, and message the finder or owner directly.
            </p>
          </div>

          <p className="text-[11px] text-slate-400">
            For safe campus returns, visit the Library Helpdesk or A-Block Reception.
          </p>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition shadow-xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Link Copied!' : 'Copy Item Link'}</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href={qrCodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`${item.id}-qr.png`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Save QR</span>
            </a>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Poster</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRCodeModal;
