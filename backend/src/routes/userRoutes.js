/**
 * User Routes - ERP May 10
 * Quản trị Người dùng (QUẢN TRỊ → NGƯỜI DÙNG)
 * Bảo vệ: CHỈ ADMIN được phép truy cập
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireRoles } = require('../middlewares/auth');

// BẮT BUỘC: Đăng nhập và có vai trò ADMIN cho toàn bộ các thao tác
router.use(requireAuth, requireRoles('admin'));

// 1. Tra cứu danh sách người dùng
router.get('/', userController.getUsers);

// 2. Lấy thông tin chi tiết một người dùng
router.get('/:id', userController.getUserById);

// 3. Tạo người dùng mới
router.post('/', userController.createUser);

// 4. Cập nhật thông tin người dùng
router.put('/:id', userController.updateUser);

// 5. Thay đổi vai trò người dùng
router.patch('/:id/role', userController.changeRole);

// 6. Khóa hoặc mở khóa tài khoản người dùng
router.patch('/:id/status', userController.toggleUserStatus);

// 7. Đặt lại mật khẩu tài khoản
router.post('/:id/reset-password', userController.resetPassword);

module.exports = router;
