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

// 7. Yêu cầu mua sắm (Purchase Requisitions - PR)
router.get(
  '/requisitions',
  requireRoles('mua_hang', 'admin', 'kho'),
  purchasingController.getPurchaseRequisitions
);
router.get(
  '/requisitions/:id',
  requireRoles('mua_hang', 'admin', 'kho'),
  purchasingController.getRequisitionDetail
);
router.post(
  '/requisitions',
  requireRoles('mua_hang', 'admin'),
  purchasingController.createPurchaseRequisition
);
router.post(
  '/requisitions/:id/approve',
  requireRoles('mua_hang', 'admin'),
  purchasingController.approveRequisition
);
router.post(
  '/requisitions/:id/reject',
  requireRoles('mua_hang', 'admin'),
  purchasingController.rejectRequisition
);
router.post(
  '/requisitions/:id/create-po',
  requireRoles('mua_hang', 'admin'),
  purchasingController.convertPrToPo
);

// 8. Yêu cầu báo giá & So sánh lựa chọn NCC (RFQ)
router.get(
  '/rfqs',
  requireRoles('mua_hang', 'admin'),
  purchasingController.getRfqs
);
router.get(
  '/rfqs/:id',
  requireRoles('mua_hang', 'admin'),
  purchasingController.getRfqDetail
);
router.post(
  '/rfqs',
  requireRoles('mua_hang', 'admin'),
  purchasingController.createRfq
);
router.post(
  '/rfqs/:id/quotes',
  requireRoles('mua_hang', 'admin'),
  purchasingController.submitQuote
);
router.post(
  '/rfqs/:id/select-vendor',
  requireRoles('mua_hang', 'admin'),
  purchasingController.selectVendorQuote
);

// 9. Đánh giá Nhà cung cấp (Supplier Evaluations)
router.get(
  '/suppliers/:id/evaluations',
  requireRoles('mua_hang', 'admin'),
  purchasingController.getSupplierEvaluations
);
router.post(
  '/suppliers/:id/evaluations',
  requireRoles('mua_hang', 'admin'),
  purchasingController.createSupplierEvaluation
);

// 10. Báo cáo mua hàng
router.get(
  '/reports',
  requireRoles('mua_hang', 'admin'),
  purchasingController.getReports
);

module.exports = router;
