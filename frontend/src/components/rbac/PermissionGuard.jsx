import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Component bảo vệ theo Permission.
 * Nếu người dùng có quyền -> Render children.
 * Nếu không có quyền:
 * - Nếu redirect === true -> Navigate tới /403
 * - Nếu có fallback -> Render fallback
 * - Nếu không -> Render null
 */
export default function PermissionGuard({
  permission,
  permissions = [],
  requireAll = false,
  redirect = false,
  fallback = null,
  children,
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  let isAllowed = true;

  if (permission) {
    isAllowed = hasPermission(permission);
  } else if (permissions.length > 0) {
    isAllowed = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (isAllowed) {
    return <>{children}</>;
  }

  if (redirect) {
    return <Navigate to="/403" replace />;
  }

  return fallback;
}
