const express = require('express');
const router = express.Router();
const phieuNhapController = require('../controllers/phieuNhapController');
const { requireAuth, requireRoles } = require('../middlewares/auth');

router.get('/', requireAuth, phieuNhapController.getDanhSachPhieuNhap);
router.get('/:id', requireAuth, phieuNhapController.getChiTietPhieuNhap);
router.post('/', requireRoles('kho', 'admin'), phieuNhapController.createPhieuNhap);

module.exports = router;
