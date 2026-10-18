import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, ArrowRight, Tag, UserCheck, ImageOff } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../utils/formatDate';
import { formatItemLocation } from '../utils/formatLocation';
import { getItemImageUrl, CATEGORY_DEFAULT_IMAGES } from '../utils/itemImageHelper';

export function ItemCard({ item }) {
  const [imgSrc, setImgSrc] = useState(() => getItemImageUrl(item));
  const [fallbackAttempted, setFallbackAttempted] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgSrc(getItemImageUrl(item));
    setFallbackAttempted(false);
    setImgFailed(false);
  }, [item.id, item.imageUrl, item.category]);

  const handleImgError = () => {
    const categoryFallback = CATEGORY_DEFAULT_IMAGES[item.category] || CATEGORY_DEFAULT_IMAGES.Other;
    if (!fallbackAttempted && imgSrc !== categoryFallback) {
      setFallbackAttempted(true);
      setImgSrc(categoryFallback);
    } else {
      setImgFailed(true);
    }
  };

  return (
    <article className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-emerald-300/80 transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1">
      {/* Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        {!imgFailed && imgSrc ? (
          <img
            src={imgSrc}
            alt={item.title}
            onError={handleImgError}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
            <ImageOff className="w-8 h-8 mb-1 text-slate-300" />
            <span className="text-xs font-medium">{item.category}</span>
          </div>
        )}

        {/* Status Badge overlay */}
        <div className="absolute top-3 left-3 z-10">
          <StatusBadge type={item.type} status={item.status} isDemo={item.isDemo} isSample={item.isSample} />
        </div>

        {/* Category Pill overlay */}
        <div className="absolute bottom-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900/80 backdrop-blur-md text-white shadow-sm">
            <Tag className="w-3 h-3 text-emerald-400" />
            <span>{item.category}</span>
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {/* Title */}
          <h3 className="font-semibold text-slate-900 text-base line-clamp-1 group-hover:text-emerald-700 transition">
            {item.title}
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Metadata: Location & Date */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate" title={formatItemLocation(item)}>
              {formatItemLocation(item)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>{formatDate(item.eventDate || item.createdAt)}</span>
            </div>
            {item.ownerDisplayName && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-slate-400" />
                <span className="truncate max-w-[90px]">{item.ownerDisplayName}</span>
              </span>
            )}
          </div>
        </div>

        {/* View Details Action */}
        <div className="pt-2">
          <Link
            to={`/item/${item.id}`}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-600 hover:text-white border border-emerald-200/60 transition-all duration-200 group-hover:border-emerald-500"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </article>
  );
}
