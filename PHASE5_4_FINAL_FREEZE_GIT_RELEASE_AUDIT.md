# PHASE 5.4 — FINAL FREEZE & GIT RELEASE AUDIT REPORT
**ERP MAY 10 — COMPREHENSIVE REPOSITORY FREEZE & RELEASE SCOPE AUDIT**

---

## 1. GIT BASELINE
- **Branch:** `feature/ph4-core-portal`
- **Working Tree Status (`git status --short`):**
  ```text
  M backend/package.json
  M backend/src/app.js
  M backend/src/validators/vatTuValidator.js
  M frontend/src/config/menu.js
  M frontend/src/routes/AppRoutes.jsx
  ```
- **Tracked Diffs (`git diff --stat`):**
  ```text
  backend/package.json                     |  8 +++++-
  backend/src/app.js                       |  2 ++
  backend/src/validators/vatTuValidator.js |  1 +
  frontend/src/config/menu.js              | 43 +++++++++++++++++++++++++++++---
  frontend/src/routes/AppRoutes.jsx        |  7 +++---
  5 files changed, 53 insertions(+), 8 deletions(-)
  ```
- **Staged Diffs (`git diff --cached`):** `0 files changed` (Clean index, nothing staged).

---

## 2. HEAD & BASE COMMITS
- **Current HEAD:** `8ef0c20` (`feat(ph4): add material master data management`)
- **Key Base Commits in History:**
  - `8ef0c20` (PH4 Material Master Data & Vat Tu)
  - `1b22ccb` (PH4 Purchasing Receiving integration)
  - `1e14542` (PH4 Stock Card Running Balance Fix)
  - `eaf8af0` (Core Authentication & RBAC hardening)
  - `e1c13c8` (Admin User Management)
  - `bf5dca7` (PH3 Discovery & Push Status)
  - `3d74367` (PH4 & Core Portal Push Integration Report)
  - `3edf5e1` (Core Portal & Login integration)
  - `fe333e8` (README with Git command instructions)
  - `f548013` (Base ERP May 10 repository)

---

## 3. AUDIT COMMIT HISTORY & MODULE MAPPING
| Commit Hash | Module / Purpose | Tracked Files Impacted | Status |
|---|---|---|:---:|
| `8ef0c20` | PH4: Master Data Vật tư & Tồn kho | `masterDataController`, `vatTuValidator`, `TonKhoPage`, tests | Committed |
| `1b22ccb` | PH4: Purchasing Receiving Workflow | `phieuNhapController`, `PhieuNhapPage`, `WarehouseModule` | Committed |
| `1e14542` | PH4: Thẻ kho & Running Balance | `tonKhoController.js` | Committed (Frozen) |
| `eaf8af0` | Core: Authentication & RBAC | `database.js`, `roleMapping.js`, `portalController`, `Header`, `Sidebar` | Committed |
| `e1c13c8` | Core: User Management | `userController.js`, `userRoutes.js`, Admin Pages | Committed |

---

## 4. FILE-BY-FILE COMPREHENSIVE CLASSIFICATION

### Classification Code Legend:
- **A = MUST COMMIT:** Production / integration / test files strictly implementing PH1, Phase 5.1 & Phase 5.2 fulfillment.
- **B = OPTIONAL DOCUMENTATION:** Audit reports and integration reports.
- **C = DO NOT COMMIT:** Untracked temporary files, scratch scripts, test output.
- **D = PRE-EXISTING CHANGE:** Tracked modifications or files created in prior phases (PH2, PH3, PH5) that must not be bundled without separate approval.
- **E = GENERATED:** Build outputs, mockups, images, generated diagrams.
- **F = BACKUP:** Backup files (`.before_*`, `.bak`, `.old`).
- **G = UNKNOWN — REQUIRES REVIEW:** Files with ambiguous origins.

---

### A. Phase 5.1 & 5.2 Fulfillment Backend Core (MUST COMMIT / PRODUCTION)
1. `backend/src/services/sales/fulfillment.service.js` — **A (MUST COMMIT)**: Core fulfillment orchestrator connecting sales delivery to warehouse stock deduction and stock card.
2. `backend/src/services/sales/delivery.service.js` — **A (MUST COMMIT)**: Delivery service integrating fulfillment dispatch.
3. `backend/src/repositories/sales/delivery.repository.js` — **A (MUST COMMIT)**: Delivery repository with atomic transaction & row locking queries.
4. `backend/src/routes/sales/deliveries.routes.js` — **A (MUST COMMIT)**: Delivery router exposing `/fulfill` and role-gating (`kho`, `admin`).
5. `backend/src/routes/salesRoutes.js` — **A (MUST COMMIT)**: Sales module router mount point.
6. `backend/src/config/sales.js` — **A (MUST COMMIT)**: Sales module configuration and constants.
7. `backend/src/utils/sales/errorBoundary.js` — **A (MUST COMMIT)**: Module error boundary wrapper.
8. `backend/src/utils/sales/errors.js` — **A (MUST COMMIT)**: Sales AppError, ConflictError, NotFoundError classes.
9. `backend/src/utils/sales/identity.js` — **A (MUST COMMIT)**: Sales identity helper.
10. `backend/src/utils/sales/logger.js` — **A (MUST COMMIT)**: Sales logging utility.
11. `backend/src/utils/sales/pricing.js` — **A (MUST COMMIT)**: Currency and pricing math utility.
12. `backend/src/utils/sales/request.js` — **A (MUST COMMIT)**: Request parsing and sanitization.
13. `backend/src/utils/sales/response.js` — **A (MUST COMMIT)**: Standard response envelopes.
14. `backend/src/utils/sales/transaction.js` — **A (MUST COMMIT)**: Transaction client wrapper.
15. `backend/src/utils/sales/validate.js` — **A (MUST COMMIT)**: Input validator helpers.

---

### B. Phase 5.1 & 5.2 Tests (MUST COMMIT / TEST SUITES)
16. `backend/tests/test_ph1_ph4_fulfillment.js` — **A (MUST COMMIT)**: 17 integration tests verifying atomic fulfillment orchestrator.
17. `backend/tests/test_ph5_2_fulfillment_api_ui.js` — **A (MUST COMMIT)**: 13 integration tests verifying exposed fulfill API, RBAC, idempotency.

---

### C. PH1 Sales Module Backend Port (MUST COMMIT / PRODUCTION)
18. `backend/src/repositories/sales/customer.repository.js` — **A (MUST COMMIT)**
19. `backend/src/repositories/sales/invoice.repository.js` — **A (MUST COMMIT)**
20. `backend/src/repositories/sales/order.repository.js` — **A (MUST COMMIT)**
21. `backend/src/repositories/sales/overview.repository.js` — **A (MUST COMMIT)**
22. `backend/src/repositories/sales/product.repository.js` — **A (MUST COMMIT)**
23. `backend/src/repositories/sales/receivable.repository.js` — **A (MUST COMMIT)**
24. `backend/src/routes/sales/customers.routes.js` — **A (MUST COMMIT)**
25. `backend/src/routes/sales/invoices.routes.js` — **A (MUST COMMIT)**
26. `backend/src/routes/sales/orders.routes.js` — **A (MUST COMMIT)**
27. `backend/src/routes/sales/overview.routes.js` — **A (MUST COMMIT)**
28. `backend/src/routes/sales/products.routes.js` — **A (MUST COMMIT)**
29. `backend/src/routes/sales/receivables.routes.js` — **A (MUST COMMIT)**
30. `backend/src/services/sales/customer.service.js` — **A (MUST COMMIT)**
31. `backend/src/services/sales/invoice.service.js` — **A (MUST COMMIT)**
32. `backend/src/services/sales/order.service.js` — **A (MUST COMMIT)**
33. `backend/src/services/sales/overview.service.js` — **A (MUST COMMIT)**
34. `backend/src/services/sales/product.service.js` — **A (MUST COMMIT)**
35. `backend/src/services/sales/receivable.service.js` — **A (MUST COMMIT)**
36. `backend/tests/test_ph1_validation.js` — **A (MUST COMMIT)**: 69 tests for PH1 validation.
37. `backend/tests/test_ph1_business_parity.js` — **A (MUST COMMIT)**: 70 tests for PH1 business parity.
38. `backend/tests/test_ph1_sales_api.js` — **A (MUST COMMIT)**: 123 tests for PH1 sales APIs.

---

### D. PH1 Sales Module Frontend Port & Phase 5.2 UI (MUST COMMIT / PRODUCTION)
39. `frontend/src/sales/SalesRoutes.jsx` — **A (MUST COMMIT)**
40. `frontend/src/sales/sales.css` — **A (MUST COMMIT)**
41. `frontend/src/sales/config/permissions.js` — **A (MUST COMMIT)**
42. `frontend/src/sales/lib/cn.js` — **A (MUST COMMIT)**
43. `frontend/src/sales/lib/format.js` — **A (MUST COMMIT)**
44. `frontend/src/sales/lib/validation.js` — **A (MUST COMMIT)**
45. `frontend/src/sales/lib/validation.test.js` — **A (MUST COMMIT)**
46. `frontend/src/sales/services/client.js` — **A (MUST COMMIT)**
47. `frontend/src/sales/services/customerService.js` — **A (MUST COMMIT)**
48. `frontend/src/sales/services/deliveryService.js` — **A (MUST COMMIT)**: Contains `fulfillDelivery` API caller.
49. `frontend/src/sales/services/invoiceService.js` — **A (MUST COMMIT)**
50. `frontend/src/sales/services/orderService.js` — **A (MUST COMMIT)**
51. `frontend/src/sales/services/overviewService.js` — **A (MUST COMMIT)**
52. `frontend/src/sales/services/productService.js` — **A (MUST COMMIT)**
53. `frontend/src/sales/services/receivableService.js` — **A (MUST COMMIT)**
54. `frontend/src/sales/pages/CustomerDetailPage.jsx` — **A (MUST COMMIT)**
55. `frontend/src/sales/pages/CustomerListPage.jsx` — **A (MUST COMMIT)**
56. `frontend/src/sales/pages/DashboardPage.jsx` — **A (MUST COMMIT)**
57. `frontend/src/sales/pages/DeliveryDetailPage.jsx` — **A (MUST COMMIT)**: Contains Action Dialog & error toasts for fulfillment.
58. `frontend/src/sales/pages/DeliveryListPage.jsx` — **A (MUST COMMIT)**
59. `frontend/src/sales/pages/InvoiceDetailPage.jsx` — **A (MUST COMMIT)**
60. `frontend/src/sales/pages/InvoiceListPage.jsx` — **A (MUST COMMIT)**
61. `frontend/src/sales/pages/ProductListPage.jsx` — **A (MUST COMMIT)**
62. `frontend/src/sales/pages/ReceivableListPage.jsx` — **A (MUST COMMIT)**
63. `frontend/src/sales/pages/SalesOrderDetailPage.jsx` — **A (MUST COMMIT)**
64. `frontend/src/sales/pages/SalesOrderListPage.jsx` — **A (MUST COMMIT)**
65. `frontend/src/sales/components/charts/CategoryBarChart.jsx` — **A (MUST COMMIT)**
66. `frontend/src/sales/components/charts/TrendChart.jsx` — **A (MUST COMMIT)**
67. `frontend/src/sales/components/charts/chartScale.js` — **A (MUST COMMIT)**
68. `frontend/src/sales/components/charts/chartTheme.js` — **A (MUST COMMIT)**
69. `frontend/src/sales/components/charts/useChartWidth.js` — **A (MUST COMMIT)**
70. `frontend/src/sales/components/common/AsyncPanel.jsx` — **A (MUST COMMIT)**
71. `frontend/src/sales/components/common/DataTableCard.jsx` — **A (MUST COMMIT)**
72. `frontend/src/sales/components/common/EmptyState.jsx` — **A (MUST COMMIT)**
73. `frontend/src/sales/components/common/ErrorState.jsx` — **A (MUST COMMIT)**
74. `frontend/src/sales/components/common/FilterBar.jsx` — **A (MUST COMMIT)**
75. `frontend/src/sales/components/common/FormSection.jsx` — **A (MUST COMMIT)**
76. `frontend/src/sales/components/common/LoadingState.jsx` — **A (MUST COMMIT)**
77. `frontend/src/sales/components/common/PageHeader.jsx` — **A (MUST COMMIT)**
78. `frontend/src/sales/components/common/PageScaffold.jsx` — **A (MUST COMMIT)**
79. `frontend/src/sales/components/common/StatusBadge.jsx` — **A (MUST COMMIT)**
80. `frontend/src/sales/components/customers/CustomerCreateDialog.jsx` — **A (MUST COMMIT)**
81. `frontend/src/sales/components/dashboard/KpiCard.jsx` — **A (MUST COMMIT)**
82. `frontend/src/sales/components/deliveries/DeliveryCreateDialog.jsx` — **A (MUST COMMIT)**
83. `frontend/src/sales/components/invoices/InvoiceCreateDialog.jsx` — **A (MUST COMMIT)**
84. `frontend/src/sales/components/orders/SalesOrderCreateDialog.jsx` — **A (MUST COMMIT)**
85. `frontend/src/sales/components/products/ProductSelector.jsx` — **A (MUST COMMIT)**
86. `frontend/src/sales/components/ui/AlertDialog.jsx` — **A (MUST COMMIT)**
87. `frontend/src/sales/components/ui/Badge.jsx` — **A (MUST COMMIT)**
88. `frontend/src/sales/components/ui/Banner.jsx` — **A (MUST COMMIT)**
89. `frontend/src/sales/components/ui/Breadcrumbs.jsx` — **A (MUST COMMIT)**
90. `frontend/src/sales/components/ui/Button.jsx` — **A (MUST COMMIT)**
91. `frontend/src/sales/components/ui/Card.jsx` — **A (MUST COMMIT)**
92. `frontend/src/sales/components/ui/Checkbox.jsx` — **A (MUST COMMIT)**
93. `frontend/src/sales/components/ui/Combobox.jsx` — **A (MUST COMMIT)**
94. `frontend/src/sales/components/ui/DateInput.jsx` — **A (MUST COMMIT)**
95. `frontend/src/sales/components/ui/Dialog.jsx` — **A (MUST COMMIT)**
96. `frontend/src/sales/components/ui/IconButton.jsx` — **A (MUST COMMIT)**
97. `frontend/src/sales/components/ui/Input.jsx` — **A (MUST COMMIT)**
98. `frontend/src/sales/components/ui/MetadataList.jsx` — **A (MUST COMMIT)**
99. `frontend/src/sales/components/ui/NumberInput.jsx` — **A (MUST COMMIT)**
100. `frontend/src/sales/components/ui/Pagination.jsx` — **A (MUST COMMIT)**
101. `frontend/src/sales/components/ui/ProgressBar.jsx` — **A (MUST COMMIT)**
102. `frontend/src/sales/components/ui/ReasonDialog.jsx` — **A (MUST COMMIT)**
103. `frontend/src/sales/components/ui/Select.jsx` — **A (MUST COMMIT)**
104. `frontend/src/sales/components/ui/Skeleton.jsx` — **A (MUST COMMIT)**
105. `frontend/src/sales/components/ui/Spinner.jsx` — **A (MUST COMMIT)**
106. `frontend/src/sales/components/ui/Table.jsx` — **A (MUST COMMIT)**
107. `frontend/src/sales/components/ui/Tabs.jsx` — **A (MUST COMMIT)**
108. `frontend/src/sales/components/ui/TextLink.jsx` — **A (MUST COMMIT)**
109. `frontend/src/sales/components/ui/Textarea.jsx` — **A (MUST COMMIT)**
110. `frontend/src/sales/components/ui/Typography.jsx` — **A (MUST COMMIT)**
111. `frontend/src/sales/components/ui/toast.jsx` — **A (MUST COMMIT)**

---

### E. Tracked Modified Configuration Files
112. `backend/src/app.js` — **A (MUST COMMIT)**: Contains essential `/api/v1/sales` router mount.
113. `backend/src/validators/vatTuValidator.js` — **A (MUST COMMIT)**: Phase 4.2 addition of `'thanh_pham'` into `VALID_LOAI_VAT_TU`.
114. `frontend/src/config/menu.js` — **A (MUST COMMIT)**: Navigation menu items for Sales module.
115. `frontend/src/routes/AppRoutes.jsx` — **A (MUST COMMIT)**: Route routing for `sales/*` linking `SalesRoutes`.
116. `backend/package.json` — **D (PRE-EXISTING CHANGE)**: Contains test script additions (`test:ph2`, `test:ph3`, `test:ph5`). Should NOT be committed in sales-only release or committed under separate maintenance tag.

---

### F. Other Uncommitted Modules (DO NOT COMMIT / PRE-EXISTING)
- **PH2 (Production):**
  - `backend/src/controllers/productionController.js` — **D**
  - `backend/src/routes/productionRoutes.js` — **D**
  - `backend/src/validators/productionValidator.js` — **D**
  - `backend/src/services/productionService.js` — **D**
  - `frontend/src/pages/ProductionModule.jsx`, `frontend/src/pages/production/*` — **D**
  - `frontend/src/services/productionService.js` — **D**
  - `backend/tests/test_ph2_production.js`, `test_ph2_concurrency.js` — **D**
- **PH3 (Purchasing):**
  - `backend/src/controllers/purchasingController.js` — **D**
  - `backend/src/routes/purchasingRoutes.js` — **D**
  - `backend/src/validators/purchasingValidator.js` — **D**
  - `backend/src/services/purchasingService.js` — **D**
  - `frontend/src/pages/PurchasingModule.jsx`, `frontend/src/pages/purchasing/*` — **D**
  - `frontend/src/services/purchasingService.js` — **D**
  - `backend/tests/test_ph3_purchasing.js`, `test_ph3_concurrency.js` — **D**
  - `database/ph3_expansion.sql` — **D**
- **PH5 (Finance):**
  - `backend/src/controllers/costController.js`, `costingController.js`, `debtController.js`, `documentController.js`, `documentWriteController.js`, `financialReportController.js`, `journalController.js`, `orderEfficiencyController.js` — **D**
  - `backend/src/routes/financeRoutes.js` — **D**
  - `backend/src/services/costService.js`, `costingService.js`, `debtService.js`, `documentService.js`, `documentWriteService.js`, `financialReportService.js`, `journalService.js`, `journalWriteService.js`, `orderEfficiencyService.js` — **D**
  - `frontend/src/finance/*` — **D**
  - `backend/tests/test_ph5_finance.js` — **D**

---

### G. Backup & Temporary Files (DO NOT COMMIT)
- `backend/src/controllers/tonKhoController.js.before_encoding_recovery` — **F (BACKUP)**
- `database/migrations/add_roll_attributes_to_lo_vat_tu.sql` — **D (PRE-EXISTING)**
- `PH4_MOCKUP_QUAN_LY_VAT_TU.png` — **E (GENERATED)**
- `docs/mockups/*` — **E (GENERATED)**
- `docs/report/chapter5/*` — **E (GENERATED / REPORT ASSET)**

---

### H. Audit Reports & Documentation (OPTIONAL DOCUMENTATION)
- `PHASE5_1_FULFILLMENT_IMPLEMENTATION_AUDIT.md` — **B (OPTIONAL)**
- `PHASE5_2_PRE_IMPLEMENTATION_AUDIT.md` — **B (OPTIONAL)**
- `PHASE5_2_INTEGRATION_AUDIT.md` — **B (OPTIONAL)**
- `PHASE5_3_FULL_E2E_VALIDATION_AUDIT.md` — **B (OPTIONAL)**
- `PHASE5_4_FINAL_FREEZE_GIT_RELEASE_AUDIT.md` — **B (OPTIONAL)**
- `POSTGRESQL_RUNTIME_AUDIT.md` — **B (OPTIONAL)**
- `PH1_CONNECTION_FINAL_AUDIT.md`, `PH1_CONNECTION_READ_ONLY_AUDIT.md`, `PH1_FILE_BY_FILE_CONNECTION_AUDIT.md` — **B (OPTIONAL)**
- All reports in `docs/` and `docs/integration/` — **B (OPTIONAL)**

---

## 5. PH4 PROTECTED FILES AUDIT (FREEZE INTEGRITY)
| File | Git Diff | SHA256 Hash | Status |
|---|:---:|---|:---:|
| `backend/src/controllers/tonKhoController.js` | 0 lines changed | `B1719AB8B57A292FD9E0F2A250B21E8D72393AF1D3D5B4E858B118D1B0926508` | **INTACT / FROZEN** |
| `backend/src/routes/tonKhoRoutes.js` | 0 lines changed | `C55596AA8CB5F39A8AB77229FE29ABEC7E5715FFDD7141B2654BDC881D2FA5FB` | **INTACT / FROZEN** |
| `backend/tests/test_ph4_fr11_stock_card.js` | 0 lines changed | `A6D5868223A331936B6699D1108864C6BAED95BB288152C05E5273BF15872F1A` | **INTACT / FROZEN** |

---

## 6. END-TO-END BUSINESS CHAIN MAPPING
| Business Step | Implementation File | Key Function / Route | Test File | E2E Status |
|---|---|---|---|:---:|
| 1. PH1 Sales Order | `backend/src/services/sales/order.service.js` | `POST /api/v1/sales/don-hang` | `test_ph1_sales_api.js` | **PASS** |
| 2. Create Delivery | `backend/src/services/sales/delivery.service.js` | `POST /api/v1/sales/giao-hang` | `test_ph1_sales_api.js` | **PASS** |
| 3. Dispatch & Lock | `backend/src/repositories/sales/delivery.repository.js` | `findByIdForUpdate` | `test_ph1_ph4_fulfillment.js` | **PASS** |
| 4. Resolve Material | `backend/src/services/sales/fulfillment.service.js` | `dispatchFulfillmentDelivery` | `test_ph1_ph4_fulfillment.js` | **PASS** |
| 5. Warehouse Export | `backend/src/services/sales/fulfillment.service.js` | `INSERT INTO phieu_xuat_kho` | `test_ph5_2_fulfillment_api_ui.js` | **PASS** |
| 6. Decrement Stock | `backend/src/services/sales/fulfillment.service.js` | `UPDATE ton_kho` | `test_ph1_ph4_fulfillment.js` | **PASS** |
| 7. Stock Card ISSUE | `backend/src/controllers/tonKhoController.js` | `GET /api/v1/ton-kho/the-kho` | `test_ph4_fr11_stock_card.js` | **PASS** |
| 8. Complete Delivery | `backend/src/services/sales/fulfillment.service.js` | `trang_thai = 'da_giao'` | `test_ph5_2_fulfillment_api_ui.js` | **PASS** |

---

## 7. GIT RELEASE SCOPES

### LIST A — MUST COMMIT (EXACT PRODUCTION & TEST RELEASE FILES)
*(Note: These commands are proposals only. DO NOT EXECUTE AUTOMATICALLY)*

```bash
# Core Configuration Updates
git add backend/src/app.js
git add backend/src/validators/vatTuValidator.js
git add frontend/src/config/menu.js
git add frontend/src/routes/AppRoutes.jsx

# Backend PH1 -> PH4 Fulfillment & Orchestrator
git add backend/src/config/sales.js
git add backend/src/routes/salesRoutes.js
git add backend/src/routes/sales/deliveries.routes.js
git add backend/src/routes/sales/customers.routes.js
git add backend/src/routes/sales/invoices.routes.js
git add backend/src/routes/sales/orders.routes.js
git add backend/src/routes/sales/overview.routes.js
git add backend/src/routes/sales/products.routes.js
git add backend/src/routes/sales/receivables.routes.js
git add backend/src/services/sales/fulfillment.service.js
git add backend/src/services/sales/delivery.service.js
git add backend/src/services/sales/customer.service.js
git add backend/src/services/sales/invoice.service.js
git add backend/src/services/sales/order.service.js
git add backend/src/services/sales/overview.service.js
git add backend/src/services/sales/product.service.js
git add backend/src/services/sales/receivable.service.js
git add backend/src/repositories/sales/delivery.repository.js
git add backend/src/repositories/sales/customer.repository.js
git add backend/src/repositories/sales/invoice.repository.js
git add backend/src/repositories/sales/order.repository.js
git add backend/src/repositories/sales/overview.repository.js
git add backend/src/repositories/sales/product.repository.js
git add backend/src/repositories/sales/receivable.repository.js
git add backend/src/utils/sales/errorBoundary.js
git add backend/src/utils/sales/errors.js
git add backend/src/utils/sales/identity.js
git add backend/src/utils/sales/logger.js
git add backend/src/utils/sales/pricing.js
git add backend/src/utils/sales/request.js
git add backend/src/utils/sales/response.js
git add backend/src/utils/sales/transaction.js
git add backend/src/utils/sales/validate.js

# Backend Fulfillment & PH1 Test Suites
git add backend/tests/test_ph1_ph4_fulfillment.js
git add backend/tests/test_ph5_2_fulfillment_api_ui.js
git add backend/tests/test_ph1_validation.js
git add backend/tests/test_ph1_business_parity.js
git add backend/tests/test_ph1_sales_api.js

# Frontend Sales Module & Fulfillment UI
git add frontend/src/sales/SalesRoutes.jsx
git add frontend/src/sales/sales.css
git add frontend/src/sales/config/permissions.js
git add frontend/src/sales/lib/cn.js
git add frontend/src/sales/lib/format.js
git add frontend/src/sales/lib/validation.js
git add frontend/src/sales/lib/validation.test.js
git add frontend/src/sales/services/client.js
git add frontend/src/sales/services/customerService.js
git add frontend/src/sales/services/deliveryService.js
git add frontend/src/sales/services/invoiceService.js
git add frontend/src/sales/services/orderService.js
git add frontend/src/sales/services/overviewService.js
git add frontend/src/sales/services/productService.js
git add frontend/src/sales/services/receivableService.js
git add frontend/src/sales/pages/CustomerDetailPage.jsx
git add frontend/src/sales/pages/CustomerListPage.jsx
git add frontend/src/sales/pages/DashboardPage.jsx
git add frontend/src/sales/pages/DeliveryDetailPage.jsx
git add frontend/src/sales/pages/DeliveryListPage.jsx
git add frontend/src/sales/pages/InvoiceDetailPage.jsx
git add frontend/src/sales/pages/InvoiceListPage.jsx
git add frontend/src/sales/pages/ProductListPage.jsx
git add frontend/src/sales/pages/ReceivableListPage.jsx
git add frontend/src/sales/pages/SalesOrderDetailPage.jsx
git add frontend/src/sales/pages/SalesOrderListPage.jsx
git add frontend/src/sales/components/charts/CategoryBarChart.jsx
git add frontend/src/sales/components/charts/TrendChart.jsx
git add frontend/src/sales/components/charts/chartScale.js
git add frontend/src/sales/components/charts/chartTheme.js
git add frontend/src/sales/components/charts/useChartWidth.js
git add frontend/src/sales/components/common/AsyncPanel.jsx
git add frontend/src/sales/components/common/DataTableCard.jsx
git add frontend/src/sales/components/common/EmptyState.jsx
git add frontend/src/sales/components/common/ErrorState.jsx
git add frontend/src/sales/components/common/FilterBar.jsx
git add frontend/src/sales/components/common/FormSection.jsx
git add frontend/src/sales/components/common/LoadingState.jsx
git add frontend/src/sales/components/common/PageHeader.jsx
git add frontend/src/sales/components/common/PageScaffold.jsx
git add frontend/src/sales/components/common/StatusBadge.jsx
git add frontend/src/sales/components/customers/CustomerCreateDialog.jsx
git add frontend/src/sales/components/dashboard/KpiCard.jsx
git add frontend/src/sales/components/deliveries/DeliveryCreateDialog.jsx
git add frontend/src/sales/components/invoices/InvoiceCreateDialog.jsx
git add frontend/src/sales/components/orders/SalesOrderCreateDialog.jsx
git add frontend/src/sales/components/products/ProductSelector.jsx
git add frontend/src/sales/components/ui/AlertDialog.jsx
git add frontend/src/sales/components/ui/Badge.jsx
git add frontend/src/sales/components/ui/Banner.jsx
git add frontend/src/sales/components/ui/Breadcrumbs.jsx
git add frontend/src/sales/components/ui/Button.jsx
git add frontend/src/sales/components/ui/Card.jsx
git add frontend/src/sales/components/ui/Checkbox.jsx
git add frontend/src/sales/components/ui/Combobox.jsx
git add frontend/src/sales/components/ui/DateInput.jsx
git add frontend/src/sales/components/ui/Dialog.jsx
git add frontend/src/sales/components/ui/IconButton.jsx
git add frontend/src/sales/components/ui/Input.jsx
git add frontend/src/sales/components/ui/MetadataList.jsx
git add frontend/src/sales/components/ui/NumberInput.jsx
git add frontend/src/sales/components/ui/Pagination.jsx
git add frontend/src/sales/components/ui/ProgressBar.jsx
git add frontend/src/sales/components/ui/ReasonDialog.jsx
git add frontend/src/sales/components/ui/Select.jsx
git add frontend/src/sales/components/ui/Skeleton.jsx
git add frontend/src/sales/components/ui/Spinner.jsx
git add frontend/src/sales/components/ui/Table.jsx
git add frontend/src/sales/components/ui/Tabs.jsx
git add frontend/src/sales/components/ui/TextLink.jsx
git add frontend/src/sales/components/ui/Textarea.jsx
git add frontend/src/sales/components/ui/Typography.jsx
git add frontend/src/sales/components/ui/toast.jsx
```

---

### LIST B — OPTIONAL DOCUMENTATION
```bash
PHASE5_1_FULFILLMENT_IMPLEMENTATION_AUDIT.md
PHASE5_2_PRE_IMPLEMENTATION_AUDIT.md
PHASE5_2_INTEGRATION_AUDIT.md
PHASE5_3_FULL_E2E_VALIDATION_AUDIT.md
PHASE5_4_FINAL_FREEZE_GIT_RELEASE_AUDIT.md
POSTGRESQL_RUNTIME_AUDIT.md
PH1_CONNECTION_FINAL_AUDIT.md
PH1_CONNECTION_READ_ONLY_AUDIT.md
PH1_FILE_BY_FILE_CONNECTION_AUDIT.md
```

---

### LIST C — DO NOT COMMIT
- `backend/package.json` (Keep uncommitted or stage separately for test scripts)
- `backend/src/controllers/tonKhoController.js.before_encoding_recovery`
- `backend/src/controllers/productionController.js` and all PH2 production files
- `backend/src/controllers/purchasingController.js` and all PH3 purchasing files
- `backend/src/controllers/costController.js`, `financeRoutes.js` and all PH5 finance files
- `database/ph3_expansion.sql`
- `database/migrations/add_roll_attributes_to_lo_vat_tu.sql`
- `PH4_MOCKUP_QUAN_LY_VAT_TU.png`
- `docs/mockups/*`

---

## 8. PROPOSED RELEASE COMMIT MESSAGE
When authorized by the project lead, the proposed exact-file commit message is:

```text
feat(integration): integrate PH1 sales delivery with PH4 warehouse fulfillment

- Implement atomic fulfillment orchestrator in fulfillment.service.js
- Connect delivery service and repository with FOR UPDATE row locking
- Expose POST /api/v1/sales/giao-hang/:id/fulfill and alias /deliveries/:id/fulfill
- Add warehouse fulfillment action dialog and toast notifications in frontend
- Update vatTuValidator to allow 'thanh_pham' material classification
- Maintain 100% SHA256 freeze integrity on PH4 core warehouse modules
- Include comprehensive integration test suites (465/465 tests PASS)
```

---

## 9. FINAL VERDICT
**PASS — READY FOR EXACT-FILE GIT COMMIT**
