import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../components/common/AppShell.js';
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
import { DeliveryDetailPage } from '../pages/deliveries/DeliveryDetailPage.js';
import { InvoiceListPage } from '../pages/invoices/InvoiceListPage.js';
import { InvoiceDetailPage } from '../pages/invoices/InvoiceDetailPage.js';
import { ReceivableListPage } from '../pages/receivables/ReceivableListPage.js';
import { DashboardPage } from '../pages/dashboard/DashboardPage.js';

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
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="customers" element={<CustomerListPage />} />
        <Route path="customers/new" element={<CustomerCreatePage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="sales-orders" element={<SalesOrderListPage />} />
        <Route path="sales-orders/new" element={<SalesOrderCreatePage />} />
        <Route path="sales-orders/:id" element={<SalesOrderDetailPage />} />
        <Route path="deliveries" element={<DeliveryListPage />} />
        {/* Creation moved into a dialog on the list page; keep the old URL reachable. */}
        <Route path="deliveries/new" element={<Navigate to="/deliveries" replace />} />
        <Route path="deliveries/:id" element={<DeliveryDetailPage />} />
        <Route path="invoices" element={<InvoiceListPage />} />
        {/* Creation moved into a dialog on the list page; keep the old URL reachable. */}
        <Route path="invoices/new" element={<Navigate to="/invoices" replace />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="receivables" element={<ReceivableListPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
