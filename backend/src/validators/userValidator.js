/**
 * User Validator - ERP May 10
 * Validation logic for User Management (RBAC Admin)
 */

const CANONICAL_ROLES = ['admin', 'ban_hang', 'san_xuat', 'mua_hang', 'kho', 'ke_toan'];
const VALID_STATUSES = ['hoat_dong', 'khoa'];

/**
 * Validate input khi tạo người dùng mới
 */
function validateCreateUser(body) {
  const errors = [];

  if (!body.ho_ten || typeof body.ho_ten !== 'string' || body.ho_ten.trim().length < 2) {
    errors.push('Họ và tên bắt buộc và phải có ít nhất 2 ký tự.');
  }

  if (!body.email || typeof body.email !== 'string') {
    errors.push('Email bắt buộc.');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.trim())) {
      errors.push('Định dạng email không hợp lệ.');
    }
  }

  if (!body.vai_tro || !CANONICAL_ROLES.includes(body.vai_tro)) {
    errors.push(`Vai trò không hợp lệ. Chỉ chấp nhận các vai trò: ${CANONICAL_ROLES.join(', ')}.`);
  }

  if (body.mat_khau !== undefined && body.mat_khau !== null) {
    if (typeof body.mat_khau !== 'string' || body.mat_khau.length < 6) {
      errors.push('Mật khẩu phải có độ dài tối thiểu 6 ký tự.');
    }
  }

  if (body.trang_thai && !VALID_STATUSES.includes(body.trang_thai)) {
    errors.push(`Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(', ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate input khi cập nhật thông tin người dùng
 */
function validateUpdateUser(body) {
  const errors = [];

  if (body.ho_ten !== undefined) {
    if (typeof body.ho_ten !== 'string' || body.ho_ten.trim().length < 2) {
      errors.push('Họ và tên phải có ít nhất 2 ký tự.');
    }
  }

  if (body.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof body.email !== 'string' || !emailRegex.test(body.email.trim())) {
      errors.push('Định dạng email không hợp lệ.');
    }
  }

  if (body.vai_tro !== undefined) {
    if (!CANONICAL_ROLES.includes(body.vai_tro)) {
      errors.push(`Vai trò không hợp lệ. Chỉ chấp nhận các vai trò: ${CANONICAL_ROLES.join(', ')}.`);
    }
  }

  if (body.trang_thai !== undefined) {
    if (!VALID_STATUSES.includes(body.trang_thai)) {
      errors.push(`Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(', ')}.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate input khi đổi vai trò
 */
function validateChangeRole(vai_tro) {
  if (!vai_tro || !CANONICAL_ROLES.includes(vai_tro)) {
    return {
      isValid: false,
      message: `Vai trò không hợp lệ. Chỉ chấp nhận các vai trò: ${CANONICAL_ROLES.join(', ')}.`,
    };
  }
  return { isValid: true };
}

/**
 * Validate mật khẩu khi đặt lại mật khẩu
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string' || password.length < 6) {
    return {
      isValid: false,
      message: 'Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.',
    };
  }
  return { isValid: true };
}

module.exports = {
  CANONICAL_ROLES,
  VALID_STATUSES,
  validateCreateUser,
  validateUpdateUser,
  validateChangeRole,
  validatePassword,
};
