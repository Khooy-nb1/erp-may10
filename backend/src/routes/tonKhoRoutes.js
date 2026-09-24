const express = require('express');
const router = express.Router();
const tonKhoController = require('../controllers/tonKhoController');
const { requireAuth, requireRoles } = require('../middlewares/auth');

// Bảo vệ dữ liệu tồn kho: Bắt buộc đăng nhập và chỉ cho phép các vai trò được cấp phép xem kho
router.get('/', requireAuth, requireRoles('kho', 'warehouse', 'warehouse_manager', 'admin', 'ban_hang', 'sales', 'san_xuat', 'production', 'mua_hang', 'purchasing', 'ke_toan', 'accounting'), tonKhoController.getBaoCaoTonKho);
router.get('/the-kho', requireAuth, requireRoles('kho', 'warehouse', 'warehouse_manager', 'admin', 'ke_toan', 'accounting'), tonKhoController.getTheKho);
router.get('/dashboard', requireAuth, tonKhoController.getDashboardStats);

module.exports = router;
