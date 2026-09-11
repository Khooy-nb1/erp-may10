import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  implemented: boolean;
}

// Strictly obey foundation rule: "Do not show navigation for screens that are not implemented."
// Business modules are marked implemented as they are developed in P2-P9.
const NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', path: '/dashboard', icon: '📊', implemented: false },
  { label: 'Khách hàng', path: '/customers', icon: '👥', implemented: false },
  { label: 'Sản phẩm', path: '/products', icon: '📦', implemented: false },
  { label: 'Đơn bán hàng', path: '/sales-orders', icon: '📋', implemented: false },
  { label: 'Giao hàng', path: '/deliveries', icon: '🚚', implemented: false },
  { label: 'Hóa đơn', path: '/invoices', icon: '🧾', implemented: false },
  { label: 'Công nợ', path: '/receivables', icon: '💰', implemented: false },
];

export const AppShell: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const visibleNavItems = NAV_ITEMS.filter((item) => item.implemented);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '240px',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #1e293b' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8' }}>
            ERP Sales &amp; CRM
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Phân hệ Quản lý Bán hàng</span>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0.5rem' }}>
          {visibleNavItems.length > 0 ? (
            visibleNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 1rem',
                  margin: '0.25rem 0',
                  borderRadius: '6px',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  backgroundColor: isActive ? '#1e293b' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))
          ) : (
            <div
              style={{
                padding: '1rem',
                fontSize: '0.85rem',
                color: '#64748b',
                lineHeight: 1.5,
              }}
            >
              Nền tảng P1 sẵn sàng. Các phân hệ sẽ xuất hiện trên menu sau khi được triển khai ở các giai đoạn tiếp theo.
            </div>
          )}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid #1e293b', fontSize: '0.8rem', color: '#64748b' }}>
          <span>Phiên bản MVP 1.0 (P1 Foundation)</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header
          style={{
            height: '60px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2rem',
          }}
        >
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Hệ thống quản lý thông tin bán hàng và khách hàng</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isAuthenticated && user ? (
              <>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{user.ho_ten}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {user.vai_tro} {user.phong_ban ? `• ${user.phong_ban}` : ''}
                  </div>
                </div>
                <button
                  onClick={logout}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                style={{
                  padding: '0.4rem 0.9rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                Đăng nhập
              </NavLink>
            )}
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', width: '100%', boxSizing: 'border-box' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
