import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppShell as AstryxAppShell, useAppShellMobile } from '@astryxdesign/core/AppShell';
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { TopNav } from '@astryxdesign/core/TopNav';
import { NavIcon } from '@astryxdesign/core/NavIcon';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  BadgeDollarSign,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Truck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
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

/**
 * TopNav's mobile bar renders `endContent` verbatim next to its own menu toggle,
 * so the desktop profile block would overflow a phone viewport. Below the
 * mobile breakpoint the profile collapses to an icon-only logout that keeps the
 * accessible name.
 *
 * Must render inside AppShell so it can read the mobile context.
 */
const ShellEndContent: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { isMobile } = useAppShellMobile();

  if (!isAuthenticated || !user) return null;

  if (isMobile) {
    return <IconButton label="Đăng xuất" variant="secondary" size="sm" icon={<LogOut size={16} aria-hidden />} onClick={logout} />;
  }

  return (
    <HStack gap={3} vAlign="center">
      <VStack gap={0} hAlign="end">
        <Text type="label">{user.ho_ten}</Text>
        <Text type="supporting">
          {user.vai_tro}
          {user.phong_ban ? ` • ${user.phong_ban}` : ''}
        </Text>
      </VStack>
      <Button
        label="Đăng xuất"
        variant="secondary"
        size="sm"
        icon={<LogOut size={16} aria-hidden />}
        onClick={logout}
      />
    </HStack>
  );
};

export const AppShell: React.FC = () => {
  const { pathname } = useLocation();

  const isSelected = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <AstryxAppShell
      height="fill"
      variant="elevated"
      contentPadding={6}
      topNav={
        <TopNav
          label="Điều hướng chính"
          heading={
            <HStack gap={2} vAlign="center">
              <NavIcon icon={<ClipboardList size={16} aria-hidden />} />
              <VStack gap={0}>
                <Text type="label">ERP Sales &amp; CRM</Text>
                <Text type="supporting">Phân hệ Quản lý Bán hàng</Text>
              </VStack>
            </HStack>
          }
          endContent={<ShellEndContent />}
        />
      }
      sideNav={
        <SideNav collapsible={{ hasButton: true, buttonLabel: 'Thu gọn điều hướng' }}>
          <SideNavHeading heading="ERP Sales & CRM" subheading="Phiên bản MVP 1.0" />
          <SideNavSection title="Phân hệ" isHeaderHidden>
            {NAV_ITEMS.map((item) => (
              <SideNavItem
                key={item.path}
                label={item.label}
                icon={item.icon}
                href={item.path}
                isSelected={isSelected(item.path)}
              />
            ))}
          </SideNavSection>
        </SideNav>
      }
    >
      <Outlet />
    </AstryxAppShell>
  );
};
