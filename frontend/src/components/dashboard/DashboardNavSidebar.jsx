import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  ShoppingBag,
  Factory,
  ShoppingCart,
  Warehouse,
  CreditCard,
  Settings,
  ChevronRight,
} from 'lucide-react';

const HOMEPAGE_SIDEBAR_ITEMS = [
  {
    id: 'home',
    title: 'Trang chủ',
    path: '/',
    exact: true,
    icon: Home,
  },
  {
    id: 'sales',
    title: 'Bán hàng & Đơn hàng',
    path: '/sales',
    icon: ShoppingBag,
  },
  {
    id: 'production',
    title: 'Sản xuất',
    path: '/production',
    icon: Factory,
  },
  {
    id: 'purchasing',
    title: 'Mua hàng',
    path: '/purchasing',
    icon: ShoppingCart,
  },
  {
    id: 'warehouse',
    title: 'Kho & Vật tư',
    path: '/warehouse?tab=dashboard',
    icon: Warehouse,
  },
  {
    id: 'accounting',
    title: 'Tài chính',
    path: '/accounting',
    icon: CreditCard,
  },
  {
    id: 'admin',
    title: 'Quản trị',
    path: '/admin/users',
    icon: Settings,
  },
];

export default function DashboardNavSidebar() {
  const location = useLocation();

  const isItemActive = (item) => {
    if (item.exact) {
      return location.pathname === '/';
    }
    const cleanPath = item.path.split('?')[0];
    return location.pathname.startsWith(cleanPath);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#DCEAF4] p-3 shadow-xs sticky top-20">
      <nav className="space-y-1" aria-label="Danh mục điều hướng nhanh">
        {HOMEPAGE_SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                active
                  ? 'bg-[#EAF5FC] text-[#0F5FAF] font-bold shadow-2xs'
                  : 'text-[#5F6F82] hover:bg-[#F4FAFE] hover:text-[#0F5FAF]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    active ? 'text-[#0F5FAF]' : 'text-[#8DA0B3] group-hover:text-[#0F5FAF]'
                  }`}
                />
                <span className="truncate">{item.title}</span>
              </div>
              <ChevronRight
                className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                  active
                    ? 'text-[#0F5FAF] translate-x-0.5'
                    : 'text-[#B4C4D4] group-hover:text-[#0F5FAF] group-hover:translate-x-0.5'
                }`}
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
