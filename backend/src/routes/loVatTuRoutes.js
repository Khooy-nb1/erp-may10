const express = require('express');
const router = express.Router();
const loVatTuController = require('../controllers/loVatTuController');
const { requireAuth, requireRoles } = require('../middlewares/auth');

router.get('/', requireAuth, loVatTuController.getDanhSachLo);
router.get('/:id', requireAuth, loVatTuController.getChiTietLo);
router.post('/', requireRoles('kho', 'admin'), loVatTuController.createLoVatTu);
router.put('/:id', requireRoles('kho', 'admin'), loVatTuController.updateLoVatTu);

module.exports = router;
