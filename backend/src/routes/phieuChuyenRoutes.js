const express = require('express');
const router = express.Router();
const phieuChuyenController = require('../controllers/phieuChuyenController');
const { requireAuth, requireRoles } = require('../middlewares/auth');

router.get('/', requireAuth, phieuChuyenController.getDanhSachPhieuChuyen);
router.get('/:id', requireAuth, phieuChuyenController.getChiTietPhieuChuyen);
router.post('/', requireRoles('kho', 'admin'), phieuChuyenController.createPhieuChuyen);

module.exports = router;
