import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout & Guards
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from '../components/rbac/ProtectedRoute';
import PermissionGuard from '../components/rbac/PermissionGuard';
import RoleGuard from '../components/rbac/RoleGuard';

// Pages
import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login';
import Forbidden from '../pages/Forbidden';
import NotFound from '../pages/NotFound';
import WarehouseModule from '../pages/WarehouseModule';
import PurchasingModule from '../pages/PurchasingModule';
import PlaceholderModule from '../pages/PlaceholderModule';

// Admin Pages
import Users from '../pages/admin/Users';
import Roles from '../pages/admin/Roles';
import Permissions from '../pages/admin/Permissions';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/403" element={<Forbidden />} />

      {/* Protected Portal Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Core ERP Homepage */}
        <Route index element={<Dashboard />} />

        {/* PH4: Kho & Quản lý vật tư (Audited & Frozen) */}
        <Route
          path="warehouse/*"
          element={
            <PermissionGuard
              permission="kho.view"
              redirect={true}
              fallback={<Forbidden />}
            >
              <WarehouseModule />
            </PermissionGuard>
          }
        />

        {/* PH1: Bán hàng */}
        <Route
          path="sales"
          element={
            <PermissionGuard
              permission="sales.view"
              redirect={true}
              fallback={<Forbidden />}
            >
              <PlaceholderModule />
            </PermissionGuard>
          }
        />

        {/* PH2: Sản xuất */}
        <Route
          path="production"
          element={
            <PermissionGuard
              permission="production.view"
              redirect={true}
              fallback={<Forbidden />}
            >
              <PlaceholderModule />
            </PermissionGuard>
          }
        />

        {/* PH3: Mua hàng */}
        <Route
          path="purchasing/*"
          element={
            <PermissionGuard
              permission="purchasing.view"
              redirect={true}
              fallback={<Forbidden />}
            >
              <PurchasingModule />
            </PermissionGuard>
          }
        />

        {/* PH5: Kế toán */}
        <Route
          path="accounting"
          element={
            <PermissionGuard
              permission="accounting.view"
              redirect={true}
              fallback={<Forbidden />}
            >
              <PlaceholderModule />
            </PermissionGuard>
          }
        />

        {/* Admin Section (Protected by Admin Role) */}
        <Route
          path="admin/users"
          element={
            <RoleGuard roles={['admin']} redirect={true} fallback={<Forbidden />}>
              <Users />
            </RoleGuard>
          }
        />
        <Route
          path="admin/roles"
          element={
            <RoleGuard roles={['admin']} redirect={true} fallback={<Forbidden />}>
              <Roles />
            </RoleGuard>
          }
        />
        <Route
          path="admin/permissions"
          element={
            <RoleGuard roles={['admin']} redirect={true} fallback={<Forbidden />}>
              <Permissions />
            </RoleGuard>
          }
        />

        {/* 404 Inside Layout */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Global Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
