const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portalController');
const { requireAuth } = require('../middlewares/auth');

// Authentication & Profile (RBAC-F02: Bắt buộc đăng nhập để xem thông tin cá nhân)
router.get('/auth/me', requireAuth, portalController.getMe);
router.post('/auth/login', portalController.login);

// Module catalog & RBAC permissions (Public catalogs)
router.get('/modules', portalController.getModules);
router.get('/permissions', portalController.getPermissions);

// Global ERP Dashboard & Activity (RBAC-F04: Bảo vệ dữ liệu tài chính, nhật ký, thông báo)
router.get('/dashboard/summary', requireAuth, portalController.getDashboardSummary);
router.get('/dashboard/activity', requireAuth, portalController.getRecentActivity);
router.get('/notifications', requireAuth, portalController.getNotifications);

module.exports = router;
