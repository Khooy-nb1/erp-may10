import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Component bảo vệ theo Vai trò (Role).
 * Cho phép render khi role hiện tại thuộc danh sách roles cho phép.
 */
export default function RoleGuard({
  roles = [],
  redirect = false,
  fallback = null,
  children,
}) {
  const { role } = useAuth();

  // Admin luôn có quyền tối cao
  const isAllowed = role === 'admin' || roles.includes(role);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (redirect) {
    return <Navigate to="/403" replace />;
  }

  return fallback;
}
