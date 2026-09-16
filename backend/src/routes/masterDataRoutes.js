const express = require('express');
const router = express.Router();
const masterDataController = require('../controllers/masterDataController');
const { requireAuth, requireRoles } = require('../middlewares/auth');

// Kho & Vị trí
router.get('/kho', masterDataController.getDanhSachKho);

// Danh mục vật tư (FR-01)
router.get('/vat-tu', masterDataController.getDanhSachVatTu);
router.get('/vat-tu/:id', masterDataController.getChiTietVatTu);
router.post('/vat-tu', requireAuth, requireRoles('kho', 'admin'), masterDataController.createVatTu);
router.put('/vat-tu/:id', requireAuth, requireRoles('kho', 'admin'), masterDataController.updateVatTu);
router.patch('/vat-tu/:id/trang-thai', requireAuth, requireRoles('kho', 'admin'), masterDataController.toggleTrangThaiVatTu);
router.patch('/vat-tu/:id/status', requireAuth, requireRoles('kho', 'admin'), masterDataController.toggleTrangThaiVatTu);

// Đơn vị tính, NCC, Người dùng, Cross-module
router.get('/don-vi-tinh', masterDataController.getDanhSachDVT);
router.get('/nha-cung-cap', requireAuth, masterDataController.getDanhSachNCC);
router.get('/nguoi-dung', requireAuth, requireRoles('admin'), masterDataController.getDanhSachNguoiDung);
router.get('/cross-module', masterDataController.getCrossModuleReferences);

module.exports = router;
