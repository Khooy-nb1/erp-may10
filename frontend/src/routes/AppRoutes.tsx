import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../components/common/AppShell.js';
import { PageHeader } from '../components/common/PageHeader.js';
import { EmptyState } from '../components/common/EmptyState.js';

// Placeholder screen component for modular development
const ScreenPlaceholder: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div>
    <PageHeader title={title} subtitle={subtitle} />
    <EmptyState
      title={`${title} - Chức năng đang hoàn thiện`}
      description={`Mô-đun ${title} sẽ được triển khai theo kế hoạch phân kỳ.`}
    />
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
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
        <Route
          path="customers"
          element={
            <ScreenPlaceholder
              title="Quản lý khách hàng"
              subtitle="Danh sách khách hàng, thông tin hạn mức tín dụng và lịch sử giao dịch"
            />
          }
        />
        <Route
          path="products"
          element={
            <ScreenPlaceholder
              title="Tra cứu sản phẩm"
              subtitle="Danh mục sản phẩm may mặc sẵn sàng bán và giá niêm yết"
            />
          }
        />
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
        <Route
          path="login"
          element={
            <ScreenPlaceholder
              title="Đăng nhập hệ thống"
              subtitle="Nhập thông tin xác thực để truy cập các chức năng bán hàng"
            />
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
