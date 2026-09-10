const express = require('express');
const router = express.Router();
const masterDataController = require('../controllers/masterDataController');
const { requireAuth, requireRoles } = require('../middlewares/auth');

router.get('/kho', masterDataController.getDanhSachKho);
router.get('/vat-tu', masterDataController.getDanhSachVatTu);
router.get('/don-vi-tinh', masterDataController.getDanhSachDVT);
router.get('/nha-cung-cap', requireAuth, masterDataController.getDanhSachNCC);
router.get('/nguoi-dung', requireAuth, requireRoles('admin'), masterDataController.getDanhSachNguoiDung);
router.get('/cross-module', masterDataController.getCrossModuleReferences);

module.exports = router;
