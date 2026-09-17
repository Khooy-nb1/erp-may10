import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastHost } from './components/ui/toast.jsx';
import './sales.css';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { CustomerListPage } from './pages/CustomerListPage.jsx';
import { CustomerCreatePage } from './pages/CustomerCreatePage.jsx';
import { CustomerDetailPage } from './pages/CustomerDetailPage.jsx';
import { ProductListPage } from './pages/ProductListPage.jsx';
import { SalesOrderListPage } from './pages/SalesOrderListPage.jsx';
import { SalesOrderDetailPage } from './pages/SalesOrderDetailPage.jsx';
import { DeliveryListPage } from './pages/DeliveryListPage.jsx';
import { DeliveryDetailPage } from './pages/DeliveryDetailPage.jsx';
import { InvoiceListPage } from './pages/InvoiceListPage.jsx';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage.jsx';
import { ReceivableListPage } from './pages/ReceivableListPage.jsx';

/**
 * Sales module route subtree (PLAN Step 6F / TARGET_DESIGN §1).
 *
 * Core mounts this at \`/sales/*\` behind its own \`sales.view\` PermissionGuard and
 * supplies the shell (MainLayout/Header/Sidebar/Breadcrumb); the module owns only
 * these child routes. \`new\` URLs redirect to their list pages because creation is a
 * dialog on the list screen (PH1 behaviour).
 */
export default function SalesRoutes() {
  return (
    <div className="sales-module-content">
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomerListPage />} />
        <Route path="customers/new" element={<CustomerCreatePage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="orders" element={<SalesOrderListPage />} />
        <Route path="orders/new" element={<Navigate to="/sales/orders" replace />} />
        <Route path="orders/:id" element={<SalesOrderDetailPage />} />
        <Route path="deliveries" element={<DeliveryListPage />} />
        <Route path="deliveries/new" element={<Navigate to="/sales/deliveries" replace />} />
        <Route path="deliveries/:id" element={<DeliveryDetailPage />} />
        <Route path="invoices" element={<InvoiceListPage />} />
        <Route path="invoices/new" element={<Navigate to="/sales/invoices" replace />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="receivables" element={<ReceivableListPage />} />
        <Route path="*" element={<Navigate to="/sales" replace />} />
      </Routes>
      <ToastHost />
    </div>
  );
}
