const express = require('express');
const router = express.Router();
const phieuKiemKeController = require('../controllers/phieuKiemKeController');
const { requireAuth, requireRoles } = require('../middlewares/auth');

router.get('/', requireAuth, requireRoles('kho', 'admin'), phieuKiemKeController.getDanhSachPhieuKiemKe);
router.get('/:id', requireAuth, requireRoles('kho', 'admin'), phieuKiemKeController.getChiTietPhieuKiemKe);
router.post('/', requireRoles('kho', 'admin'), phieuKiemKeController.createPhieuKiemKe);
router.post('/:id/dieu-chinh', requireRoles('kho', 'admin'), phieuKiemKeController.dieuChinhTonKho);

module.exports = router;
