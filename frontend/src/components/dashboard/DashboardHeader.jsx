import React from 'react';
import { Link } from 'react-router-dom';
import {
  Warehouse,
  ArrowRight,
  Building2,
  Calendar,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useAuth } from '../rbac/AuthContext';
import { MAY10_IMAGES } from '../../config/imageAssets';

export default function DashboardHeader() {
  const { user, roleMeta } = useAuth();

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="relative w-full overflow-hidden min-h-[380px] sm:min-h-[420px] lg:min-h-[460px] flex items-end pb-12 sm:pb-16 pt-24 sm:pt-28">
      {/* 1. Full-bleed Panoramic Background Image (Official May 10 Headquarters with blue sky & flags) */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <img
          src={MAY10_IMAGES.heroBg}
          alt="Tổng Công ty May 10"
          className="w-full h-full object-cover object-right sm:object-center"
        />

        {/* Soft Vignette Overlay on the left side to guarantee 100% white text contrast */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(14, 90, 168, 0.72) 0%, rgba(14, 90, 168, 0.45) 42%, rgba(14, 90, 168, 0.15) 70%, rgba(0, 0, 0, 0) 100%)',
          }}
        />

        {/* Top subtle vignette under the top floating header */}
        <div
          className="absolute top-0 inset-x-0 h-28"
          style={{
            background:
              'linear-gradient(to bottom, rgba(7, 45, 85, 0.28) 0%, rgba(7, 45, 85, 0) 100%)',
          }}
        />
      </div>

      {/* 2. Foreground Hero Greeting & Live Badges Content */}
      <div className="relative z-10 w-full max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {/* Greeting typography matching reference image media_1788974791237.png */}
          <div className="text-white/90 text-sm sm:text-base font-normal tracking-wide drop-shadow-sm mb-1">
            Xin chào,
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-white tracking-tight leading-tight drop-shadow-md">
            {user?.ho_ten || 'Quản Trị Viên Hệ Thống'}
          </h1>

          <p className="text-xs sm:text-sm text-white/90 mt-2 max-w-[620px] leading-relaxed drop-shadow-sm">
            Chào mừng bạn đến với hệ thống ERP Tổng Công ty May 10
          </p>

          {/* Operational Status Badges (Pill style directly over hero) */}
          <div className="flex flex-wrap items-center gap-2.5 mt-4 sm:mt-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium text-white bg-white/20 hover:bg-white/25 border border-white/35 backdrop-blur-md shadow-xs transition-colors">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Hệ thống đang hoạt động</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium text-white/95 bg-white/15 border border-white/25 backdrop-blur-md shadow-xs">
              <Clock className="w-3.5 h-3.5 text-white/90" />
              <span className="capitalize">{currentDate} | 08:30</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

