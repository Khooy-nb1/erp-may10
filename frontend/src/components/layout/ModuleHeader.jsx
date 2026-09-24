import React from 'react';
import { MAY10_IMAGES } from '../../config/imageAssets';

export default function ModuleHeader({
  code,
  title,
  description,
  badgeText = 'Đang vận hành',
  badgeType = 'success',
  imageKey = 'warehouse',
  customImage,
  children,
}) {
  const imageUrl = customImage || MAY10_IMAGES[imageKey] || MAY10_IMAGES.warehouse;

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-[#E2EDF5] p-4 sm:p-5 shadow-sm mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[105px]">
      {/* Background/Right Visual Layer (25-35% on desktop) with Soft Gradient Fade */}
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-5/12 md:w-4/12 pointer-events-none overflow-hidden select-none">
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover object-center opacity-75 sm:opacity-85"
        />
        {/* Soft Linear Gradient overlay: Seamless fade from pure white into image */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0.92) 20%, rgba(255,255,255,0.35) 70%, rgba(255,255,255,0.10) 100%)',
          }}
        />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 min-w-0 max-w-2xl">
        <div className="flex items-center gap-2.5 flex-wrap mb-1">
          {code && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0F5FAF] text-white">
              {code}
            </span>
          )}
          <h1 className="text-lg sm:text-xl font-bold text-[#172033] tracking-tight">
            {title}
          </h1>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              badgeType === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {badgeText}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5F6F82] max-w-xl leading-relaxed">
          {description}
        </p>
      </div>

      {/* Action controls (Buttons, Refresh, etc.) */}
      {children && (
        <div className="relative z-10 flex items-center gap-2 self-start md:self-center flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
