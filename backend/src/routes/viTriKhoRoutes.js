const express = require('express');
const router = express.Router();
const viTriKhoController = require('../controllers/viTriKhoController');
const { requireAuth, requireRoles } = require('../middlewares/auth');

router.get('/', requireAuth, viTriKhoController.getDanhSachViTri);
router.get('/:id', requireAuth, viTriKhoController.getChiTietViTri);
router.post('/', requireRoles('kho', 'admin'), viTriKhoController.createViTri);
router.put('/:id', requireRoles('kho', 'admin'), viTriKhoController.updateViTri);
router.delete('/:id', requireRoles('kho', 'admin'), viTriKhoController.deleteViTri);

module.exports = router;
