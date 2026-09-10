const express = require('express');
const router = express.Router();
const phieuXuatController = require('../controllers/phieuXuatController');
const { requireAuth, requireRoles } = require('../middlewares/auth');

router.get('/', requireAuth, phieuXuatController.getDanhSachPhieuXuat);
router.get('/:id', requireAuth, phieuXuatController.getChiTietPhieuXuat);
router.post('/', requireRoles('kho', 'admin'), phieuXuatController.createPhieuXuat);

module.exports = router;
