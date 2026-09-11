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
import { SalesOrderListPage } from '../pages/orders/SalesOrderListPage.js';
import { SalesOrderCreatePage } from '../pages/orders/SalesOrderCreatePage.js';
import { SalesOrderDetailPage } from '../pages/orders/SalesOrderDetailPage.js';
import { DeliveryListPage } from '../pages/deliveries/DeliveryListPage.js';
import { DeliveryCreatePage } from '../pages/deliveries/DeliveryCreatePage.js';
import { DeliveryDetailPage } from '../pages/deliveries/DeliveryDetailPage.js';
import { InvoiceListPage } from '../pages/invoices/InvoiceListPage.js';
import { InvoiceCreatePage } from '../pages/invoices/InvoiceCreatePage.js';
import { InvoiceDetailPage } from '../pages/invoices/InvoiceDetailPage.js';
import { ReceivableListPage } from '../pages/receivables/ReceivableListPage.js';

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
        <Route path="sales-orders" element={<SalesOrderListPage />} />
        <Route path="sales-orders/new" element={<SalesOrderCreatePage />} />
        <Route path="sales-orders/:id" element={<SalesOrderDetailPage />} />
        <Route path="deliveries" element={<DeliveryListPage />} />
        <Route path="deliveries/new" element={<DeliveryCreatePage />} />
        <Route path="deliveries/:id" element={<DeliveryDetailPage />} />
        <Route path="invoices" element={<InvoiceListPage />} />
        <Route
          path="invoices/new"
          element={
            <ProtectedRoute allowedRoles={['ke_toan']}>
              <InvoiceCreatePage />
            </ProtectedRoute>
          }
        />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="receivables" element={<ReceivableListPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
