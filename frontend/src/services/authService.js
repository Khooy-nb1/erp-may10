import api from './api';
import { ROLE_PERMISSIONS } from '../config/permissions';
import { ROLE_DETAILS } from '../config/roles';

const TOKEN_KEY = 'erp_token';
const USER_KEY = 'erp_user';
const ROLE_KEY = 'erp_role';
const USER_ID_KEY = 'erp_user_id';

export const authService = {
  /**
   * Đăng nhập với email và password
   */
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data && response.data.success && response.data.data) {
      const { user, token, role, permissions } = response.data.data;
      if (!user || typeof user !== 'object' || !user.id || !user.vai_tro) {
        throw new Error('Dữ liệu người dùng phản hồi không hợp lệ từ máy chủ.');
      }
      const canonicalRole = role || user.vai_tro;
      localStorage.setItem(TOKEN_KEY, token || 'session-token');
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(ROLE_KEY, canonicalRole);
      localStorage.setItem(USER_ID_KEY, String(user.id));
      return { user, token, role: canonicalRole, permissions: permissions || [] };
    }
    throw new Error(response.data?.message || 'Đăng nhập không thành công');
  },

  /**
   * Đăng xuất khỏi hệ thống
   */
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_ID_KEY);
  },

  /**
   * Chuyển đổi nhanh vai trò (dành cho kiểm thử RBAC và demo điều hành)
   * BẮT BUỘC: Thực hiện luồng đăng nhập thật với Backend để nhận Token HMAC có chữ ký số hợp lệ.
   * TUYỆT ĐỐI KHÔNG tự tạo token chuỗi giả 'mock-jwt-token-*' (Khắc phục triệt để RC-01).
   */
  switchRole(roleCode) {
    const roleInfo = ROLE_DETAILS[roleCode];
    if (!roleInfo) {
      throw new Error(`Vai trò không hợp lệ: ${roleCode}`);
    }

    const targetEmail = roleInfo.defaultEmail; // canonical domain: @may10.vn
    const defaultPassword = 'password';

    // 1. Thực hiện gọi POST /api/v1/auth/login đồng bộ qua XMLHttpRequest trong trình duyệt
    // để cập nhật tức thì localStorage và state trước khi caller thực hiện điều hướng navigate()
    if (typeof XMLHttpRequest !== 'undefined') {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/v1/auth/login', false); // Đồng bộ
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({ email: targetEmail, password: defaultPassword }));

        if (xhr.status === 200) {
          const responseData = JSON.parse(xhr.responseText);
          if (responseData && responseData.success && responseData.data) {
            const { user, token, role, permissions } = responseData.data;
            if (!token || token.startsWith('mock-')) {
              throw new Error('Máy chủ không phát hành token HMAC hợp lệ.');
            }
            const canonicalRole = role || user.vai_tro;
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            localStorage.setItem(ROLE_KEY, canonicalRole);
            localStorage.setItem(USER_ID_KEY, String(user.id));

            const result = {
              user,
              role: canonicalRole,
              permissions: permissions || ROLE_PERMISSIONS[canonicalRole] || [],
              token,
            };
            // Hỗ trợ cả caller đồng bộ và caller dùng await (Thenable)
            result.then = (resolve) => {
              resolve(result);
              return result;
            };
            return result;
          }
        } else {
          let errorMsg = 'Đăng nhập chuyển vai trò thất bại';
          try {
            const errData = JSON.parse(xhr.responseText);
            if (errData && errData.message) errorMsg = errData.message;
          } catch (_) {}
          console.error('[authService.switchRole] Đăng nhập backend trả về mã HTTP:', xhr.status, xhr.responseText);
          throw new Error(errorMsg);
        }
      } catch (err) {
        console.error('[authService.switchRole] Gọi đăng nhập backend gặp lỗi:', err);
        throw err;
      }
    }

    throw new Error('Môi trường trình duyệt không hỗ trợ xác thực đồng bộ.');
  },

  /**
   * Lấy thông tin người dùng hiện tại từ API backend /auth/me
   * BẢO MẬT: Nếu /auth/me trả về 401 Unauthorized, dọn sạch session ngay lập tức,
   * TUYỆT ĐỐI KHÔNG fallback về user cũ từ LocalStorage (Khắc phục triệt để Zombie Session RC-02).
   */
  async getMe() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || token.startsWith('mock-')) {
      this.logout();
      return null;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data && res.data.success && res.data.data) {
        const { user, role, permissions } = res.data.data;
        if (user && typeof user === 'object' && user.id) {
          const canonicalRole = role || user.vai_tro;
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          localStorage.setItem(ROLE_KEY, canonicalRole);
          localStorage.setItem(USER_ID_KEY, String(user.id));
          return { user, role: canonicalRole, permissions: permissions || [] };
        }
      }
    } catch (e) {
      console.warn('[authService.getMe] Xác thực phiên /auth/me thất bại:', e.message);

      // Khi backend từ chối phiên đăng nhập (401 Unauthorized):
      // Dọn sạch toàn bộ session trong LocalStorage và chuyển hướng về /login
      if (
        e.response?.status === 401 ||
        e.status === 401 ||
        e.response?.data?.errorCode === 'UNAUTHORIZED' ||
        e.response?.data?.errorCode === 'ACCOUNT_SUSPENDED'
      ) {
        this.logout();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return null;
      }
    }

    // Không khôi phục ngầm dữ liệu cũ từ LocalStorage khi token không được xác nhận bởi backend
    this.logout();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return null;
  },

  getCurrentUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw || raw === 'undefined' || raw === 'null') {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  getCurrentRole() {
    const user = this.getCurrentUser();
    if (user && user.vai_tro) return user.vai_tro;
    const role = localStorage.getItem(ROLE_KEY);
    if (role && role !== 'undefined' && role !== 'null') return role;
    return null;
  },

  isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY) && !!this.getCurrentUser();
  },

  hasPermission(requiredPermission, permissions = []) {
    if (!requiredPermission) return true;
    const currentRole = this.getCurrentRole();
    if (currentRole === 'admin') return true;
    const effectivePermissions = permissions.length > 0
      ? permissions
      : (ROLE_PERMISSIONS[currentRole] || []);
    return effectivePermissions.includes(requiredPermission);
  },

  hasRole(requiredRoles = []) {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    const currentRole = this.getCurrentRole();
    if (currentRole === 'admin') return true;
    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return rolesArray.includes(currentRole);
  },
};

export default authService;
