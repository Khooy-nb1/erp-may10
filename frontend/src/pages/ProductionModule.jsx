import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Layers,
  Factory,
  Cpu,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import ModuleHeader from '../components/layout/ModuleHeader';
import Toast from '../components/Toast';

// Subpages
import ProductionDashboard from './production/ProductionDashboard';
import ProductionPlansPage from './production/ProductionPlansPage';
import BomPage from './production/BomPage';
import ProductionOrdersPage from './production/ProductionOrdersPage';
import MrpPage from './production/MrpPage';
import ProductionProgressPage from './production/ProductionProgressPage';

export default function ProductionModule() {
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);

  const showToast = (toastData) => {
    setToast(toastData);
    setTimeout(() => {
      setToast(null);
    }, 6000);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    showToast({
      type: 'success',
      message: 'Đã làm mới dữ liệu phân hệ Sản Xuất & Hoạch Định Nguyên Liệu May 10.',
    });
  };

  const currentPath = location.pathname;

  const navItems = [
    {
      label: 'Tổng quan',
      path: '/production',
      icon: LayoutDashboard,
      isActive: currentPath === '/production' || currentPath === '/production/',
    },
    {
      label: 'Kế hoạch sản xuất',
      path: '/production/plans',
      icon: CalendarDays,
      isActive: currentPath.startsWith('/production/plans'),
    },
    {
      label: 'Định mức BOM',
      path: '/production/bom',
      icon: Layers,
      isActive: currentPath.startsWith('/production/bom'),
    },
    {
      label: 'Lệnh sản xuất (LSX)',
      path: '/production/orders',
      icon: Factory,
      isActive: currentPath.startsWith('/production/orders'),
    },
    {
      label: 'Hoạch định MRP',
      path: '/production/mrp',
      icon: Cpu,
      isActive: currentPath.startsWith('/production/mrp'),
    },
    {
      label: 'Tiến độ & Đối soát',
      path: '/production/progress',
      icon: BarChart3,
      isActive: currentPath.startsWith('/production/progress'),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Module Header aligned with Global UI V2.11 */}
      <ModuleHeader
        code="PH2"
        title="Sản Xuất & Hoạch Định Nguyên Liệu"
        description="Quản lý định mức BOM, lập kế hoạch sản xuất, chạy thuật toán MRP, điều hành lệnh sản xuất và quyết toán đối soát vật tư với Kho May 10"
        badgeText="Đang vận hành"
        badgeType="success"
        imageKey="production"
      >
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DCEAF4] text-xs font-semibold text-[#0F4C81] bg-white hover:bg-[#EAF5FC] transition-all self-start md:self-auto shadow-xs hover:border-[#96C8EB]"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#0F5FAF]" />
          <span>Làm mới dữ liệu</span>
        </button>
      </ModuleHeader>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white rounded-xl px-2 py-1 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  item.isActive
                    ? 'bg-[#0F5FAF] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0F5FAF] hover:bg-[#F4FAFE]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Subpage Router */}
      <div key={refreshKey}>
        <Routes>
          <Route index element={<ProductionDashboard showToast={showToast} />} />
          <Route path="plans" element={<ProductionPlansPage showToast={showToast} />} />
          <Route path="bom" element={<BomPage showToast={showToast} />} />
          <Route path="orders" element={<ProductionOrdersPage showToast={showToast} />} />
          <Route path="mrp" element={<MrpPage showToast={showToast} />} />
          <Route path="progress" element={<ProductionProgressPage showToast={showToast} />} />
          <Route path="*" element={<ProductionDashboard showToast={showToast} />} />
        </Routes>
      </div>

      {/* Global Toast for Production Actions */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
