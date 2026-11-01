import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, User, MapPin, Calendar, Tag, ArrowRight, ExternalLink } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../utils/formatDate';
import { formatItemLocation } from '../utils/formatLocation';
import { getItemImageUrl, CATEGORY_DEFAULT_IMAGES } from '../utils/itemImageHelper';

export function ChatMessage({ message, onQuickReply, onNavigate }) {
  const isUser = message.sender === 'user';

  // Helper to format inline markdown (bold, code, links)
  const formatInlineStyles = (content, isUserMsg) => {
    if (typeof content !== 'string') return content;

    // Split by **bold** tokens
    const boldParts = content.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((bToken, bIdx) => {
      if (bToken.startsWith('**') && bToken.endsWith('**') && bToken.length >= 4) {
        return (
          <strong
            key={`b-${bIdx}`}
            className={`font-bold ${isUserMsg ? 'text-white' : 'text-slate-900'}`}
          >
            {bToken.slice(2, -2)}
          </strong>
        );
      }

      // Split by `code` tokens
      const codeParts = bToken.split(/(`.*?`)/g);
      return codeParts.map((cToken, cIdx) => {
        if (cToken.startsWith('`') && cToken.endsWith('`') && cToken.length >= 2) {
          return (
            <code
              key={`c-${cIdx}`}
              className={`px-1.5 py-0.5 rounded text-xs font-mono font-medium ${
                isUserMsg
                  ? 'bg-emerald-700/80 text-white'
                  : 'bg-slate-100 text-emerald-800 border border-slate-200/60'
              }`}
            >
              {cToken.slice(1, -1)}
            </code>
          );
        }
        return cToken;
      });
    });
  };

  // Helper to format text with links, bullets, and bold words
  const renderFormattedText = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Check for markdown links [label](url)
      const linkRegex = /\[(.*?)\]\((.*?)\)/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = linkRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          const rawSegment = line.substring(lastIndex, match.index);
          parts.push(formatInlineStyles(rawSegment, isUser));
        }
        const label = match[1];
        const url = match[2];
        parts.push(
          <Link
            key={`link-${idx}-${match.index}`}
            to={url}
            onClick={onNavigate}
            className={`font-bold underline inline-flex items-center gap-0.5 ${
              isUser
                ? 'text-white hover:text-emerald-100'
                : 'text-emerald-700 hover:text-emerald-800'
            }`}
          >
            <span>{label}</span>
            <ExternalLink className="w-3 h-3 inline ml-0.5" />
          </Link>
        );
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < line.length) {
        parts.push(formatInlineStyles(line.substring(lastIndex), isUser));
      }

      // Check if line is bullet
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanContent = parts.length > 0 ? parts : formatInlineStyles(line, isUser);

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs sm:text-sm my-0.5">
            {typeof cleanContent === 'string'
              ? formatInlineStyles(cleanContent.replace(/^[-*]\s+/, ''), isUser)
              : cleanContent}
          </li>
        );
      }

      // Check for numbered list item: "1. ", "2. ", etc.
      const numberMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numberMatch) {
        return (
          <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm my-1 pl-1">
            <span
              className={`font-bold text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                isUser
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {numberMatch[1]}
            </span>
            <div className="flex-1 leading-relaxed">
              {formatInlineStyles(numberMatch[2], isUser)}
            </div>
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="text-xs sm:text-sm my-1 leading-relaxed">
          {cleanContent}
        </p>
      );
    });
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
      {/* Bot Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
          <Compass className="w-4 h-4" />
        </div>
      )}

      {/* Bubble Container */}
      <div className={`max-w-[85%] sm:max-w-[80%] space-y-2`}>
        <div
          className={`p-3.5 rounded-2xl shadow-xs ${
            isUser
              ? 'bg-emerald-600 text-white rounded-tr-none'
              : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-none'
          }`}
        >
          <div className="space-y-1">
            {renderFormattedText(message.text)}
          </div>

          <div
            className={`text-[10px] mt-1.5 flex items-center ${
              isUser ? 'text-emerald-100 justify-end' : 'text-slate-400 justify-start'
            }`}
          >
            <span>{message.time || 'Just now'}</span>
          </div>
        </div>

        {/* Matched Items Grid / Cards */}
        {!isUser && message.matchedItems && message.matchedItems.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Possible Matches ({message.matchedItems.length}):
            </span>
            <div className="space-y-2">
              {message.matchedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 shadow-xs hover:border-emerald-400 hover:shadow-md transition flex gap-3 items-center"
                >
                  <img
                    src={getItemImageUrl(item)}
                    alt={item.title}
                    onError={(e) => {
                      e.currentTarget.src = CATEGORY_DEFAULT_IMAGES[item.category] || CATEGORY_DEFAULT_IMAGES.Other;
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <StatusBadge type={item.type} status={item.status} isDemo={item.isDemo} />
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {formatDate(item.eventDate || item.createdAt)}
                      </span>
                    </div>

                    <h5 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                      {item.title}
                    </h5>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate">
                      <span className="flex items-center gap-0.5 truncate">
                        <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                        <span className="truncate" title={formatItemLocation(item)}>{formatItemLocation(item)}</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-0.5 flex-shrink-0">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>{item.category}</span>
                      </span>
                    </div>

                    <div className="pt-1">
                      <Link
                        to={`/item/${item.id}`}
                        onClick={onNavigate}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Reply Chips */}
        {!isUser && message.quickReplies && message.quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.quickReplies.map((qr, qIdx) => (
              <button
                key={qIdx}
                onClick={() => onQuickReply && onQuickReply(qr)}
                className="text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-full transition shadow-2xs"
              >
                {qr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
