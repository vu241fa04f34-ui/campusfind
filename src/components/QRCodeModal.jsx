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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="clay-card bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-[#E8EAF0] my-8">
        {/* Modal Top Actions */}
        <div className="px-6 py-4 bg-[#F8F7F4] border-b border-[#E8EAF0] flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-[#202B3C] font-bold text-sm">
            <QrCode className="w-5 h-5 text-[#4776E6]" />
            <span>Campus Recovery Flyer &amp; QR Code</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#737B89] hover:text-[#202B3C] hover:bg-[#E8EAF0] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Flyer Content */}
        <div id="printable-flyer" className="p-6 sm:p-8 space-y-6 text-center bg-white">
          {/* Header */}
          <div className="space-y-1 border-b pb-4 border-[#E8EAF0]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#DDF4EE] text-[#4776E6] border border-[#bfebe0]">
              CAMPUSFIND • VIGNAN UNIVERSITY
            </div>
            <h2 className="text-2xl font-black text-[#202B3C] tracking-tight pt-1">
              {item.type === 'lost' ? '⚠️ LOST ITEM NOTICE' : '📢 FOUND ITEM NOTICE'}
            </h2>
            <p className="text-xs text-[#737B89]">
              Vadlamudi, Guntur Campus • Official Lost &amp; Found Bulletin
            </p>
          </div>

          {/* Item details */}
          <div className="space-y-2 text-left bg-[#F8F7F4] p-4 rounded-2xl border border-[#E8EAF0]">
            <h3 className="text-lg font-bold text-[#202B3C]">{item.title}</h3>
            <div className="text-xs text-[#737B89] space-y-1">
              <p>
                <strong className="text-[#202B3C]">Category:</strong> {item.category}
              </p>
              <p>
                <strong className="text-[#202B3C]">Location:</strong> {formatItemLocation(item)}
              </p>
              <p>
                <strong className="text-[#202B3C]">Date:</strong> {formatDate(item.eventDate || item.createdAt)}
              </p>
              {item.rewardNote && (
                <p className="text-amber-800 font-bold bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 mt-1 inline-block">
                  🎁 Reward Offered: {item.rewardNote}
                </p>
              )}
            </div>
            {item.description && (
              <p className="text-xs text-[#737B89] italic pt-1 border-t border-[#E8EAF0] line-clamp-2">
                "{item.description}"
              </p>
            )}
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center justify-center p-4 bg-[#DDF4EE]/40 rounded-2xl border border-[#bfebe0] space-y-3">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#bfebe0]">
              <img
                src={qrCodeUrl}
                alt={`QR code for ${item.title}`}
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
              />
            </div>
            <p className="text-xs text-[#202B3C] font-semibold max-w-xs">
              Scan with your phone camera to view full report, verify details, and message the finder or owner directly.
            </p>
          </div>

          <p className="text-[11px] text-[#737B89]">
            For safe campus returns, visit the Library Helpdesk or A-Block Reception.
          </p>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-[#F8F7F4] border-t border-[#E8EAF0] flex flex-wrap items-center justify-between gap-3 no-print">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#202B3C] bg-white border border-[#E8EAF0] hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-[#4776E6]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Link Copied!' : 'Copy Item Link'}</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href={qrCodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`${item.id}-qr.png`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#737B89] hover:bg-slate-200 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Save QR</span>
            </a>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#4776E6] hover:bg-[#385ec7] transition shadow-sm cursor-pointer"
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
