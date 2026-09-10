const express = require('express');
const router = express.Router();
const purchasingController = require('../controllers/purchasingController');
const { requireAuth, requireRoles } = require('../middlewares/auth');

// Bắt buộc đăng nhập cho toàn bộ API phân hệ Mua hàng
router.use(requireAuth);

// 1. Core Homepage API Contract (Mọi người dùng đã đăng nhập đều có thể truy cập để nạp KPI)
router.get('/core-kpi', purchasingController.getCoreKpiContract);

// 2. Dashboard Mua hàng
router.get(
  '/dashboard',
  requireRoles('mua_hang', 'admin'),
  purchasingController.getDashboardStats
);

// 3. Quản lý Nhà cung cấp (Suppliers)
router.get(
  '/suppliers',
  requireRoles('mua_hang', 'admin', 'kho'),
  purchasingController.getSuppliers
);
router.get(
  '/suppliers/:id',
  requireRoles('mua_hang', 'admin'),
  purchasingController.getSupplierDetail
);
router.post(
  '/suppliers',
  requireRoles('mua_hang', 'admin'),
  purchasingController.createSupplier
);
router.put(
  '/suppliers/:id',
  requireRoles('mua_hang', 'admin'),
  purchasingController.updateSupplier
);

// 4. Quản lý Đơn mua hàng (Purchase Orders)
router.get(
  '/purchase-orders',
  requireRoles('mua_hang', 'admin', 'kho'),
  purchasingController.getPurchaseOrders
);
router.get(
  '/purchase-orders/:id',
  requireRoles('mua_hang', 'admin', 'kho'),
  purchasingController.getPurchaseOrderDetail
);
router.post(
  '/purchase-orders',
  requireRoles('mua_hang', 'admin'),
  purchasingController.createPurchaseOrder
);

// 5. Thao tác phê duyệt & hủy đơn mua (ACID Concurrency Locking)
router.post(
  '/purchase-orders/:id/approve',
  requireRoles('mua_hang', 'admin'),
  purchasingController.approvePurchaseOrder
);
router.post(
  '/purchase-orders/:id/cancel',
  requireRoles('mua_hang', 'admin'),
  purchasingController.cancelPurchaseOrder
);
router.post(
  '/purchase-orders/:id/status',
  requireRoles('mua_hang', 'admin'),
  purchasingController.updateStatusTransition
);

// 6. Quy trình giao nhận & tích hợp Nhập kho PH4
router.get(
  '/receiving',
  requireRoles('mua_hang', 'kho', 'admin'),
  purchasingController.getReceivingOrders
);
router.post(
  '/receive-status-update',
  requireRoles('mua_hang', 'kho', 'admin'),
  purchasingController.receiveStatusUpdate
);

// 7. Báo cáo mua hàng
router.get(
  '/reports',
  requireRoles('mua_hang', 'admin'),
  purchasingController.getReports
);

module.exports = router;
