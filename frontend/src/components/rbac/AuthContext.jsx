import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../../services/authService';
import { ROLE_DETAILS } from '../../config/roles';
import { ROLE_PERMISSIONS } from '../../config/permissions';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(authService.getCurrentUser());
  const [role, setRole] = useState(authService.getCurrentRole());
  const [permissions, setPermissions] = useState(
    ROLE_PERMISSIONS[authService.getCurrentRole()] || []
  );
  const [loading, setLoading] = useState(true);

  // Khởi tạo session ban đầu
  useEffect(() => {
    const initAuth = async () => {
      try {
        const data = await authService.getMe();
        if (data && data.user) {
          setUser(data.user);
          setRole(data.role || data.user.vai_tro);
          setPermissions(data.permissions || ROLE_PERMISSIONS[data.role || data.user.vai_tro] || []);
        } else {
          setUser(null);
          setRole(null);
          setPermissions([]);
        }
      } catch (err) {
        console.warn('Lỗi đồng bộ xác thực ban đầu:', err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setUser(data.user);
    setRole(data.role);
    setPermissions(data.permissions || ROLE_PERMISSIONS[data.role] || []);
    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setRole(null);
    setPermissions([]);
  };

  const switchRole = (newRoleCode) => {
    const data = authService.switchRole(newRoleCode);
    setUser(data.user);
    setRole(data.role);
    setPermissions(data.permissions);
  };

  const hasPermission = (permissionCode) => {
    if (!permissionCode) return true;
    if (role === 'admin') return true;
    return permissions.includes(permissionCode);
  };

  const hasAnyPermission = (permissionCodes = []) => {
    if (!permissionCodes || permissionCodes.length === 0) return true;
    if (role === 'admin') return true;
    return permissionCodes.some((p) => permissions.includes(p));
  };

  const hasAllPermissions = (permissionCodes = []) => {
    if (!permissionCodes || permissionCodes.length === 0) return true;
    if (role === 'admin') return true;
    return permissionCodes.every((p) => permissions.includes(p));
  };

  const roleMeta = (role && ROLE_DETAILS[role])
    ? ROLE_DETAILS[role]
    : (user?.vai_tro && ROLE_DETAILS[user.vai_tro])
      ? ROLE_DETAILS[user.vai_tro]
      : {
          code: role || 'nguoi_dung',
          name: 'Người dùng hệ thống',
          shortName: 'Nhân viên',
          department: user?.phong_ban || 'Tổng Công ty May 10',
          badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
          description: 'Tài khoản người dùng hệ thống ERP May 10.',
        };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        roleMeta,
        permissions,
        loading,
        login,
        logout,
        switchRole,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
