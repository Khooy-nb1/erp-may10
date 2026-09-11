import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { LoadingState } from '../components/common/LoadingState.js';
import { ErrorState } from '../components/common/ErrorState.js';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState message="Đang kiểm tra phiên đăng nhập..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed = user.vai_tro === 'admin' || allowedRoles.includes(user.vai_tro);
    if (!isAllowed) {
      return (
        <div style={{ padding: '2rem' }}>
          <ErrorState
            code="AUTH_FORBIDDEN"
            message="Bạn không có quyền truy cập vào phân hệ hoặc chức năng này."
          />
        </div>
      );
    }
  }

  return children ? <>{children}</> : <Outlet />;
};
