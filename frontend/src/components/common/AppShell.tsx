import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { LucideIcon } from 'lucide-react';
import {
  BadgeDollarSign,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { Text } from '../ui/Typography.js';
import { Button } from '../ui/Button.js';
import { IconButton } from '../ui/IconButton.js';
import { useAuth } from '../../context/AuthContext.js';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

// Navigation mirrors AppRoutes: every entry here resolves to a real route.
const NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Khách hàng', path: '/customers', icon: Users },
  { label: 'Sản phẩm', path: '/products', icon: Boxes },
  { label: 'Đơn bán hàng', path: '/sales-orders', icon: ClipboardList },
  { label: 'Giao hàng', path: '/deliveries', icon: Truck },
  { label: 'Hóa đơn', path: '/invoices', icon: ReceiptText },
  { label: 'Công nợ', path: '/receivables', icon: BadgeDollarSign },
];

const NavItems: React.FC<{ pathname: string; onNavigate?: () => void }> = ({ pathname, onNavigate }) => {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-control px-3 py-2.5 text-sm transition-colors',
              isActive
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
            )}
          >
            <Icon size={18} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </>
  );
};

/**
 * The top bar keeps the profile block out of the phone layout: below `lg` it
 * collapses to an icon-only logout that keeps the accessible name, which is
 * what holds the header at a single 56px row on a narrow viewport.
 */
const ShellEndContent: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) return null;

  return (
    <>
      <IconButton
        label="Đăng xuất"
        variant="secondary"
        size="sm"
        icon={<LogOut size={16} aria-hidden />}
        onClick={logout}
        className="lg:hidden"
      />
      <div className="hidden items-center gap-3 lg:flex">
        <div className="flex flex-col items-end">
          <Text variant="label">{user.ho_ten}</Text>
          <Text variant="supporting">
            {user.vai_tro}
            {user.phong_ban ? ` • ${user.phong_ban}` : ''}
          </Text>
        </div>
        <Button variant="secondary" size="sm" icon={<LogOut size={16} aria-hidden />} onClick={logout}>
          Đăng xuất
        </Button>
      </div>
    </>
  );
};

export const AppShell: React.FC = () => {
  const { pathname } = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <DialogPrimitive.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-border bg-surface lg:flex">
          <div className="flex h-14 items-center gap-2 border-b border-border px-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-control bg-primary/10 text-primary">
              <ClipboardList size={18} aria-hidden />
            </span>
            <span className="flex flex-col leading-tight">
              <Text variant="label">ERP Sales &amp; CRM</Text>
              <Text variant="supporting">Phiên bản MVP 1.0</Text>
            </span>
          </div>
          <nav aria-label="Điều hướng bên" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            <NavItems pathname={pathname} />
          </nav>
        </aside>

        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border bg-surface lg:hidden">
            <div className="flex h-14 items-center justify-between gap-2 border-b border-border px-4">
              <DialogPrimitive.Title className="flex flex-col leading-tight">
                <Text variant="label">ERP Sales &amp; CRM</Text>
                <Text variant="supporting">Phiên bản MVP 1.0</Text>
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Đóng"
                className="flex h-8 w-8 items-center justify-center rounded-full text-subtle-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <X size={16} aria-hidden />
              </DialogPrimitive.Close>
            </div>
            <nav aria-label="Điều hướng bên" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              <NavItems pathname={pathname} onNavigate={() => setIsDrawerOpen(false)} />
            </nav>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>

        <div className="lg:pl-[260px]">
          <header
            aria-label="Điều hướng chính"
            className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 lg:px-8"
          >
            <div className="flex min-w-0 items-center gap-2">
              <DialogPrimitive.Trigger asChild>
                <IconButton
                  label="Mở điều hướng"
                  size="sm"
                  icon={<Menu size={18} aria-hidden />}
                  className="lg:hidden"
                />
              </DialogPrimitive.Trigger>
              <span className="hidden h-8 w-8 items-center justify-center rounded-control bg-primary/10 text-primary sm:flex">
                <ClipboardList size={18} aria-hidden />
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <Text variant="label" className="truncate">
                  ERP Sales &amp; CRM
                </Text>
                <Text variant="supporting" className="hidden truncate sm:block">
                  Phân hệ Quản lý Bán hàng
                </Text>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <ShellEndContent />
            </div>
          </header>

          <main className="p-5 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </DialogPrimitive.Root>
    </div>
  );
};
