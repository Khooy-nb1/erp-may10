import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  MapPin,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardCheck,
  ShieldCheck,
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Tổng quan (Dashboard)', icon: LayoutDashboard },
  { id: 'ton-kho', label: 'Tồn kho & Thẻ kho', icon: Boxes },
  { id: 'vi-tri', label: 'Vị trí kho', icon: MapPin },
  { id: 'lo-vat-tu', label: 'Lô vật tư & Vải', icon: Layers },
  { id: 'phieu-nhap', label: 'Phiếu Nhập kho', icon: ArrowDownToLine },
  { id: 'phieu-xuat', label: 'Phiếu Xuất kho', icon: ArrowUpFromLine },
  { id: 'phieu-chuyen', label: 'Phiếu Chuyển kho', icon: ArrowLeftRight },
  { id: 'kiem-ke', label: 'Kiểm kê kho', icon: ClipboardCheck },
];

export default function Sidebar({ currentTab, setCurrentTab }) {
  return (
    <aside className="w-64 bg-may10-900 text-slate-200 flex flex-col h-screen fixed left-0 top-0 shadow-xl z-20">
      {/* Brand Logo Header */}
      <div className="h-16 flex items-center px-6 border-b border-may10-800 bg-may10-900/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-may10-500 flex items-center justify-center font-bold text-white text-lg tracking-wider shadow">
            M10
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-white">MAY 10 ERP</h1>
            <p className="text-xs text-may10-100 font-medium">PH4: Kho & Vật tư</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Nghiệp vụ kho
        </div>
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-may10-500 text-white shadow-md font-semibold'
                  : 'text-slate-300 hover:bg-may10-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-may10-800 bg-may10-950/40 text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-medium mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>PostgreSQL: erp_may10</span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center justify-between">
          <span>Row Locking FOR UPDATE:</span>
          <span className="text-emerald-400 font-semibold">Active</span>
        </div>
      </div>
    </aside>
  );
}
