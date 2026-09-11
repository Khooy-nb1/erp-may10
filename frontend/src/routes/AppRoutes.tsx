import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../components/common/AppShell.js';
import { PageHeader } from '../components/common/PageHeader.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { LoginPage } from '../pages/auth/LoginPage.js';
import { ProtectedRoute } from './ProtectedRoute.js';
import { CustomerListPage } from '../pages/customers/CustomerListPage.js';
import { CustomerCreatePage } from '../pages/customers/CustomerCreatePage.js';
import { CustomerDetailPage } from '../pages/customers/CustomerDetailPage.js';
import { ProductListPage } from '../pages/products/ProductListPage.js';

const ScreenPlaceholder: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div>
    <PageHeader title={title} subtitle={subtitle} />
    <EmptyState
      title={`${title} - Chức năng đang hoàn thiện`}
      description={`Phân hệ ${title} sẽ được triển khai theo kế hoạch phân kỳ.`}
    />
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected App Shell Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <ScreenPlaceholder
              title="Tổng quan kinh doanh"
              subtitle="Số liệu doanh thu, tình trạng đơn hàng và công nợ bán hàng"
            />
          }
        />
        <Route path="customers" element={<CustomerListPage />} />
        <Route path="customers/new" element={<CustomerCreatePage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route
          path="sales-orders"
          element={
            <ScreenPlaceholder
              title="Đơn bán hàng"
              subtitle="Tạo, xác nhận và theo dõi tiến độ đơn hàng bán"
            />
          }
        />
        <Route
          path="deliveries"
          element={
            <ScreenPlaceholder
              title="Quản lý giao hàng"
              subtitle="Điều phối xuất giao hàng và cập nhật trạng thái vận chuyển"
            />
          }
        />
        <Route
          path="invoices"
          element={
            <ScreenPlaceholder
              title="Hóa đơn bán hàng"
              subtitle="Lập và theo dõi hóa đơn bán hàng theo đơn hàng"
            />
          }
        />
        <Route
          path="receivables"
          element={
            <ScreenPlaceholder
              title="Quản lý công nợ"
              subtitle="Theo dõi công nợ phải thu khách hàng và tuổi nợ"
            />
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
