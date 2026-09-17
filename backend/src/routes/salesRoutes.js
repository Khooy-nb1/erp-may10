'use strict';

const express = require('express');
const { requireAuth } = require('../middlewares/auth');

/**
 * Sales module router - the single mount point Core uses:
 *
 *   const salesRoutes = require('./routes/salesRoutes');
 *   app.use('/api/v1/sales', salesRoutes);
 *
 * Every endpoint requires a Core-issued token (`requireAuth` -> 401 when the
 * token is missing/expired/forged); finer-grained authorization is applied per
 * route with Core `requireRoles` / `requirePermission`.
 */

const router = express.Router();

router.use(requireAuth);

router.use('/khach-hang', require('./sales/customers.routes'));
router.use('/cong-no', require('./sales/receivables.routes'));
router.use('/san-pham', require('./sales/products.routes'));
router.use('/tong-quan', require('./sales/overview.routes'));
router.use('/don-hang', require('./sales/orders.routes'));
router.use('/hoa-don', require('./sales/invoices.routes'));
router.use('/giao-hang', require('./sales/deliveries.routes'));
router.use('/deliveries', require('./sales/deliveries.routes'));

// Module-scoped error boundary: renders the contract §9.3 failure envelope
// (with field-level `details`) for the module's own errors and forwards every
// other error to Core's handler. See `utils/sales/errorBoundary.js`.
router.use(require('../utils/sales/errorBoundary').salesErrorBoundary);

module.exports = router;
