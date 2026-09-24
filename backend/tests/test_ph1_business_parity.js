'use strict';

/**
 * PH1 Sales module - business parity suite.
 *
 * Evidence for PLAN.md Step 8 (business-rule parity with the retired PH1 test
 * suite) and Step 9 (security hardening checks):
 *
 *   - pricing helpers keep PH1's per-line half-up rounding and totals algebra;
 *   - the module's response helpers keep the contract §9.3 envelope incl. the
 *     "details is null, never a stack" rule;
 *   - customer/product filters, master-data guards (inactive customer,
 *     discontinued product), credit-limit policy and order cancellation;
 *   - delivery state machine (cho_giao -> dang_giao -> da_giao / that_bai),
 *     `deliveredLines` rejection and failure-note persistence;
 *   - invoice state guards, customer-match guard, over-payment guard, due-date
 *     derivation from credit terms, `qua_han` re-derivation and due-date window;
 *   - receivables are payables-free, `overdueOnly` only returns overdue rows,
 *     the aging buckets are exhaustive + mutually exclusive at the
 *     1/30/31/60/61/90/91-day boundaries, and the ledger agrees with the
 *     dashboard's money metrics;
 *   - role-scoped dashboard scopes and the cancelled-order exclusion rule;
 *   - error envelopes never leak SQL or stack frames, production mode hides
 *     error details, CORS answers only allow-listed origins, and a forbidden
 *     `sortBy` cannot inject SQL.
 *
 * Run from `backend/`:
 *   node tests/test_ph1_business_parity.js
 *
 * Rows created by this test are marked `[SMOKE-PARITY]` and are deleted again
 * at the end of the run (the disposable development database is assumed).
 */

const app = require('../src/app');
const db = require('../src/config/database');
const { signToken } = require('../src/middlewares/auth');
const { roundHalfUp, calculateOrderTotals } = require('../src/utils/sales/pricing');
const { sendSuccess, sendPaginated, sendError } = require('../src/utils/sales/response');
const { errorHandler } = require('../src/middlewares/errorHandler');

const TOKENS = {
  admin: signToken(1),
  ban_hang: signToken(2),
  san_xuat: signToken(3),
  kho: signToken(5),
  ke_toan: signToken(6),
};

const MARKER = `[SMOKE-PARITY] ${new Date().toISOString()}`;

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok   - ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  FAIL - ${name}${detail !== undefined ? ` :: ${JSON.stringify(detail)}` : ''}`);
  }
}

function headers(token, extra = {}) {
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extra }
    : { 'Content-Type': 'application/json', ...extra };
}

async function call(baseUrl, method, path, { token, body, rawHeaders } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: rawHeaders || headers(token),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed = null;
  const text = await response.text();
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    parsed = { raw: text };
  }
  return { status: response.status, body: parsed, responseHeaders: response.headers };
}

function fakeRes() {
  const captured = { statusCode: null, payload: null };
  return {
    captured,
    status(code) {
      captured.statusCode = code;
      return this;
    },
    json(payload) {
      captured.payload = payload;
      return this;
    },
  };
}

const isoDay = (offsetDays) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
const money = (value) => roundHalfUp(Number(value) || 0, 2);
const near = (a, b, epsilon = 0.005) => Math.abs(Number(a) - Number(b)) <= epsilon;

/** Every error payload captured in this run is scanned for SQL text / stack frames. */
const errorBodies = [];
function rememberErrorBody(label, body) {
  if (body && typeof body === 'object') {
    errorBodies.push({ label, text: JSON.stringify(body) });
  }
}

async function main() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const cleanup = {
    customers: [],
    orders: [],
    deliveries: [],
    invoices: [],
    congNo: [],
    productStatus: [],
  };

  try {
    // ------------------------------------------------------------------
    console.log('== pricing helpers (PH1 utils/pricing.test.ts) ==');
    check('roundHalfUp rounds .5 up at 0 decimals', roundHalfUp(2.5, 0) === 3, roundHalfUp(2.5, 0));
    check('roundHalfUp rounds .x5 up at 2 decimals', roundHalfUp(0.125, 2) === 0.13, roundHalfUp(0.125, 2));
    check('roundHalfUp compensates binary representation (1.005 -> 1.01)', roundHalfUp(1.005, 2) === 1.01, roundHalfUp(1.005, 2));

    const priced = calculateOrderTotals([
      { ma_san_pham: 1, so_luong: 3, don_gia: 100000, ty_le_giam_gia: 10 },
      { ma_san_pham: 2, so_luong: 2, don_gia: 0.125, ty_le_giam_gia: 50 },
    ]);
    check('line: gross -> discount -> thanh_tien', priced.lines[0].grossLine === 300000 && priced.lines[0].discountLine === 30000 && priced.lines[0].thanh_tien === 270000, priced.lines[0]);
    check(
      'line rounding is half-up per line (0.125 discount -> 0.13)',
      priced.lines[1].grossLine === 0.25 && priced.lines[1].discountLine === 0.13 && priced.lines[1].thanh_tien === 0.12,
      priced.lines[1]
    );
    check('totals: sum of lines equals tong_tien_hang - tien_giam_gia', near(priced.tong_tien_hang - priced.tien_giam_gia, priced.lines.reduce((sum, line) => sum + line.thanh_tien, 0)), priced);
    check('totals: tax is applied to the discounted amount', calculateOrderTotals([{ so_luong: 2, don_gia: 150000, ty_le_giam_gia: 10 }], 0.1).tong_thanh_toan === 297000, calculateOrderTotals([{ so_luong: 2, don_gia: 150000, ty_le_giam_gia: 10 }], 0.1));
    const fullyDiscounted = calculateOrderTotals([{ so_luong: 1, don_gia: 100000, ty_le_giam_gia: 100 }], 0.1);
    check('totals: a 100% discount never produces negative taxable amount', fullyDiscounted.tong_thanh_toan === 0 && fullyDiscounted.tien_thue === 0, fullyDiscounted);

    // ------------------------------------------------------------------
    console.log('== response envelope helpers (PH1 utils/response) ==');
    const successRes = fakeRes();
    sendSuccess(successRes, { id: 7 }, 'ok');
    check('sendSuccess -> { success, message, data }', successRes.captured.statusCode === 200 && successRes.captured.payload.success === true && successRes.captured.payload.message === 'ok' && successRes.captured.payload.data.id === 7, successRes.captured);

    const paginatedRes = fakeRes();
    sendPaginated(paginatedRes, [1, 2], { page: 1, pageSize: 2, total: 2, totalPages: 1 });
    check('sendPaginated -> data array + meta block', Array.isArray(paginatedRes.captured.payload.data) && paginatedRes.captured.payload.meta.totalPages === 1, paginatedRes.captured);

    const errorRes = fakeRes();
    sendError(errorRes, 'VALIDATION_ERROR', 'bad', 422);
    check('sendError without details -> details is null', errorRes.captured.payload.details === null && errorRes.captured.payload.success === false, errorRes.captured);
    const errorWithDetails = fakeRes();
    sendError(errorWithDetails, 'VALIDATION_ERROR', 'bad', 422, [{ field: 'page', message: 'x' }]);
    check('sendError passes field-level details through', Array.isArray(errorWithDetails.captured.payload.details) && errorWithDetails.captured.payload.details[0].field === 'page', errorWithDetails.captured);

    // ------------------------------------------------------------------
    console.log('== customers (PH1 customer list filters + guardrails) ==');
    const city = `PARITY-${Date.now()}`;
    const customerPayload = (overrides = {}) => ({
      ten_khach_hang: `${MARKER} Khách parity`,
      loai_khach_hang: 'to_chuc',
      so_dien_thoai: '0912345678',
      email: `parity.${Date.now()}@example.com`,
      dia_chi: 'Số 1 Mai Động, Hà Nội',
      tinh_thanh_pho: city,
      han_muc_cong_no: 0,
      so_ngay_cong_no: 15,
      ghi_chu: MARKER,
      ...overrides,
    });

    const customerCreated = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', { token: TOKENS.ban_hang, body: customerPayload() });
    const customer = customerCreated.body && customerCreated.body.data;
    check('customer created -> 201 with KH code', customerCreated.status === 201 && /^KH-\d{4}-\d{6}$/.test(customer.ma_khach_hang), customerCreated.body);
    if (customer) cleanup.customers.push(customer.id);

    const negativeCredit = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', { token: TOKENS.ban_hang, body: customerPayload({ han_muc_cong_no: -1 }) });
    rememberErrorBody('negative credit limit', negativeCredit.body);
    check('negative credit limit -> 422 naming han_muc_cong_no', negativeCredit.status === 422 && negativeCredit.body.errorCode === 'VALIDATION_ERROR' && negativeCredit.body.details.some((d) => d.field === 'han_muc_cong_no'), negativeCredit.body);

    const cityFiltered = await call(baseUrl, 'GET', `/api/v1/sales/khach-hang?tinh_thanh_pho=${encodeURIComponent(city)}`, { token: TOKENS.admin });
    check('city filter returns only matching rows (and the new one)', cityFiltered.status === 200 && cityFiltered.body.data.every((row) => row.tinh_thanh_pho === city) && cityFiltered.body.data.some((row) => row.id === customer.id), cityFiltered.body && cityFiltered.body.data);

    const statusUpdate = await call(baseUrl, 'PATCH', `/api/v1/sales/khach-hang/${customer.id}/status`, { token: TOKENS.admin, body: { trang_thai: 'tam_khoa' } });
    check('status change -> 200 tam_khoa', statusUpdate.status === 200 && statusUpdate.body.data.trang_thai === 'tam_khoa', statusUpdate.body);
    const statusFiltered = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang?trang_thai=tam_khoa&pageSize=100', { token: TOKENS.admin });
    check('status filter returns only tam_khoa rows', statusFiltered.status === 200 && statusFiltered.body.data.every((row) => row.trang_thai === 'tam_khoa') && statusFiltered.body.data.some((row) => row.id === customer.id), statusFiltered.body && statusFiltered.body.data.length);
    const statusAudit = await db.query('SELECT nguoi_cap_nhat, trang_thai FROM khach_hang WHERE id = $1', [customer.id]);
    check('status change records the acting user (audit column)', Number(statusAudit.rows[0].nguoi_cap_nhat) === 1, statusAudit.rows[0]);

    const protectedPatch = await call(baseUrl, 'PATCH', `/api/v1/sales/khach-hang/${customer.id}`, {
      token: TOKENS.admin,
      body: { ma_khach_hang: 'KH-HACKED', nguoi_tao: 999, id: 999999, ten_khach_hang: `${MARKER} renamed` },
    });
    const protectedRow = await db.query('SELECT ma_khach_hang, nguoi_tao, ten_khach_hang FROM khach_hang WHERE id = $1', [customer.id]);
    check('PATCH ignores non-whitelisted fields (code/audit/id intact)', protectedPatch.status === 200 && protectedRow.rows[0].ma_khach_hang === customer.ma_khach_hang && Number(protectedRow.rows[0].nguoi_tao) === Number(customer.nguoi_tao) && protectedRow.rows[0].ten_khach_hang.includes('renamed'), protectedRow.rows[0]);

    // ------------------------------------------------------------------
    console.log('== products (PH1 catalogue filters) ==');
    const productList = await call(baseUrl, 'GET', '/api/v1/sales/san-pham?pageSize=100', { token: TOKENS.admin });
    check('default catalogue lists only dang_ban rows', productList.status === 200 && productList.body.data.length > 0 && productList.body.data.every((row) => row.trang_thai === 'dang_ban'), productList.body && productList.body.data.map((row) => row.trang_thai));
    const sellable = productList.body.data[0];
    const nowSeller = productList.body.data.find((row) => Number(row.gia_ban) > 0) || sellable;

    const searchFiltered = await call(baseUrl, 'GET', `/api/v1/sales/san-pham?search=${encodeURIComponent(sellable.ma_san_pham)}`, { token: TOKENS.admin });
    check('search narrows the catalogue to matching rows', searchFiltered.status === 200 && searchFiltered.body.data.length > 0 && searchFiltered.body.data.every((row) => `${row.ma_san_pham} ${row.ten_san_pham}`.toLowerCase().includes(sellable.ma_san_pham.toLowerCase())), searchFiltered.body && searchFiltered.body.data);

    const colorFiltered = await call(baseUrl, 'GET', '/api/v1/sales/san-pham?mau_sac=ZZ-PARITY-NO-SUCH-COLOR&pageSize=100', { token: TOKENS.admin });
    check('a colour filter is applied (sentinel colour returns nothing)', colorFiltered.status === 200 && colorFiltered.body.data.length === 0, colorFiltered.body && colorFiltered.body.data.length);

    const cappedPage = await call(baseUrl, 'GET', '/api/v1/sales/san-pham?pageSize=500', { token: TOKENS.admin });
    rememberErrorBody('pageSize above max', cappedPage.body);
    check('pageSize above the maximum is rejected -> 422 naming pageSize', cappedPage.status === 422 && cappedPage.body.details.some((d) => d.field === 'pageSize'), cappedPage.body);

    check('catalogue rows expose the unit of measure for display', productList.body.data.every((row) => 'ten_don_vi' in row && 'ma_don_vi_tinh' in row), Object.keys(productList.body.data[0] || {}));
    const productWriteAttempt = await call(baseUrl, 'POST', '/api/v1/sales/san-pham', { token: TOKENS.admin, body: { ten_san_pham: 'x' } });
    const ledgerWriteAttempt = await call(baseUrl, 'POST', '/api/v1/sales/cong-no', { token: TOKENS.admin, body: { loai_cong_no: 'phai_thu' } });
    rememberErrorBody('catalogue write attempt', productWriteAttempt.body);
    rememberErrorBody('ledger write attempt', ledgerWriteAttempt.body);
    check('the module exposes no write route for catalogue or ledger', productWriteAttempt.status === 404 && ledgerWriteAttempt.status === 404, { catalogue: productWriteAttempt.status, ledger: ledgerWriteAttempt.status });

    // ------------------------------------------------------------------
    console.log('== orders (PH1 order guardrails + credit policy) ==');
    const orderPayload = (customerId, overrides = {}) => ({
      ma_khach_hang: customerId,
      ngay_dat_hang: isoDay(0),
      ngay_giao_hang_yc: isoDay(3),
      dia_chi_giao_hang: 'Số 1 Mai Động, Hà Nội',
      ghi_chu: MARKER,
      lines: [{ ma_san_pham: nowSeller.id, so_luong: 2, ty_le_giam_gia: 10 }],
      ...overrides,
    });

    const inactiveOrder = await call(baseUrl, 'POST', '/api/v1/sales/don-hang', { token: TOKENS.ban_hang, body: orderPayload(customer.id) });
    rememberErrorBody('inactive customer', inactiveOrder.body);
    check('order for a tam_khoa customer -> 422 CUSTOMER_INACTIVE', inactiveOrder.status === 422 && inactiveOrder.body.errorCode === 'CUSTOMER_INACTIVE', inactiveOrder.body);

    const activeCustomer = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', { token: TOKENS.ban_hang, body: customerPayload() });
    const buyer = activeCustomer.body && activeCustomer.body.data;
    cleanup.customers.push(buyer.id);

    const productRow = await db.query('SELECT id, gia_ban, trang_thai FROM san_pham WHERE id = $1', [nowSeller.id]);
    cleanup.productStatus.push({ id: productRow.rows[0].id, trang_thai: productRow.rows[0].trang_thai });
    await db.query(`UPDATE san_pham SET trang_thai = 'ngung_ban' WHERE id = $1`, [nowSeller.id]);
    const discontinuedOrder = await call(baseUrl, 'POST', '/api/v1/sales/don-hang', { token: TOKENS.ban_hang, body: orderPayload(buyer.id) });
    rememberErrorBody('discontinued product', discontinuedOrder.body);
    check('order with a ngung_ban product -> 422 PRODUCT_NOT_SELLABLE', discontinuedOrder.status === 422 && discontinuedOrder.body.errorCode === 'PRODUCT_NOT_SELLABLE', discontinuedOrder.body);
    await db.query('UPDATE san_pham SET trang_thai = $2 WHERE id = $1', [productRow.rows[0].id, productRow.rows[0].trang_thai]);

    const draftOrder = await call(baseUrl, 'POST', '/api/v1/sales/don-hang', { token: TOKENS.ban_hang, body: orderPayload(buyer.id) });
    const draft = draftOrder.body && draftOrder.body.data;
    check('order created -> 201 cho_xac_nhan', draftOrder.status === 201 && draft.trang_thai === 'cho_xac_nhan', draftOrder.body);
    cleanup.orders.push(draft.id);
    const unitPrice = Number(draft.lines[0].don_gia);
    check('discount line math is server-side', near(draft.tong_tien_hang, 2 * unitPrice) && near(draft.tien_giam_gia, roundHalfUp(2 * unitPrice * 0.1, 2)) && near(draft.tong_thanh_toan, roundHalfUp(2 * unitPrice - roundHalfUp(2 * unitPrice * 0.1, 2) + Number(draft.tien_thue), 2)), draft);

    const credit = await call(baseUrl, 'PATCH', `/api/v1/sales/khach-hang/${buyer.id}`, { token: TOKENS.admin, body: { han_muc_cong_no: Math.max(1, Math.floor(Number(draft.tong_thanh_toan) / 2)) } });
    check('credit limit set below the order value', credit.status === 200, credit.body);
    const blockedConfirm = await call(baseUrl, 'POST', `/api/v1/sales/don-hang/${draft.id}/confirm`, { token: TOKENS.ban_hang, body: {} });
    rememberErrorBody('credit warning', blockedConfirm.body);
    check('credit overrun without acknowledgement -> 422 CUSTOMER_CREDIT_LIMIT_EXCEEDED', blockedConfirm.status === 422 && blockedConfirm.body.errorCode === 'CUSTOMER_CREDIT_LIMIT_EXCEEDED' && blockedConfirm.body.details.some((d) => d.field === 'acknowledgeCreditLimit'), blockedConfirm.body);
    const acknowledgedConfirm = await call(baseUrl, 'POST', `/api/v1/sales/don-hang/${draft.id}/confirm`, { token: TOKENS.ban_hang, body: { acknowledgeCreditLimit: true } });
    check('credit overrun acknowledged -> 200 da_xac_nhan', acknowledgedConfirm.status === 200 && acknowledgedConfirm.body.data.trang_thai === 'da_xac_nhan', acknowledgedConfirm.body);

    // Cancelled-order exclusion (dashboard) uses a fresh draft so the delta is exact.
    const cancelDraft = await call(baseUrl, 'POST', '/api/v1/sales/don-hang', { token: TOKENS.ban_hang, body: orderPayload(buyer.id, { lines: [{ ma_san_pham: nowSeller.id, so_luong: 1 }] }) });
    const toCancel = cancelDraft.body && cancelDraft.body.data;
    cleanup.orders.push(toCancel.id);
    const summaryBeforeCancel = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/summary?period=month', { token: TOKENS.admin });
    const cancelNoReason = await call(baseUrl, 'POST', `/api/v1/sales/don-hang/${toCancel.id}/cancel`, { token: TOKENS.ban_hang, body: {} });
    rememberErrorBody('cancel without reason', cancelNoReason.body);
    check('cancel without a reason -> 422 naming ly_do', cancelNoReason.status === 422 && cancelNoReason.body.details.some((d) => d.field === 'ly_do'), cancelNoReason.body);
    const cancelReason = 'Khách parity đổi ý';
    const cancelled = await call(baseUrl, 'POST', `/api/v1/sales/don-hang/${toCancel.id}/cancel`, { token: TOKENS.ban_hang, body: { ly_do: cancelReason } });
    check('cancel with a reason -> 200 huy', cancelled.status === 200 && cancelled.body.data.trang_thai === 'huy', cancelled.body);
    const cancelledDetail = await call(baseUrl, 'GET', `/api/v1/sales/don-hang/${toCancel.id}`, { token: TOKENS.admin });
    check('cancel reason is persisted on the order', Boolean(cancelledDetail.body.data.ghi_chu && cancelledDetail.body.data.ghi_chu.includes(cancelReason)), cancelledDetail.body.data && cancelledDetail.body.data.ghi_chu);
    const summaryAfterCancel = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/summary?period=month', { token: TOKENS.admin });
    const before = summaryBeforeCancel.body.data.metrics;
    const after = summaryAfterCancel.body.data.metrics;
    check(
      'cancelled order leaves orderCount untouched but leaves the sales value',
      after.orderCount === before.orderCount && near(Number(before.totalOrderValue) - Number(after.totalOrderValue), Number(toCancel.tong_thanh_toan)) && after.statusCounts.huy === before.statusCounts.huy + 1,
      { before, after, cancelledValue: toCancel.tong_thanh_toan }
    );

    // ------------------------------------------------------------------
    console.log('== deliveries (PH1 state machine) ==');
    const deliveryPayload = (orderId, overrides = {}) => ({
      ma_don_ban_hang: orderId,
      ma_kho: 2,
      ngay_giao: isoDay(1),
      ten_nguoi_nhan: 'Nguyễn Văn Nhận',
      dia_chi_giao: 'Số 1 Mai Động, Hà Nội',
      ghi_chu: MARKER,
      ...overrides,
    });

    const linesUnsupported = await call(baseUrl, 'POST', '/api/v1/sales/giao-hang', { token: TOKENS.kho, body: deliveryPayload(draft.id, { deliveredLines: [{ ma_san_pham: nowSeller.id, so_luong: 1 }] }) });
    rememberErrorBody('deliveredLines', linesUnsupported.body);
    check('partial delivery lines -> 422 DELIVERY_LINES_UNSUPPORTED', linesUnsupported.status === 422 && linesUnsupported.body.errorCode === 'DELIVERY_LINES_UNSUPPORTED', linesUnsupported.body);

    const cancelledDelivery = await call(baseUrl, 'POST', '/api/v1/sales/giao-hang', { token: TOKENS.kho, body: deliveryPayload(toCancel.id) });
    rememberErrorBody('delivery for cancelled order', cancelledDelivery.body);
    check('delivery for a cancelled order -> 422 ORDER_INVALID_STATE', cancelledDelivery.status === 422 && cancelledDelivery.body.errorCode === 'ORDER_INVALID_STATE', cancelledDelivery.body);

    const firstDelivery = await call(baseUrl, 'POST', '/api/v1/sales/giao-hang', { token: TOKENS.kho, body: deliveryPayload(draft.id) });
    const delivery = firstDelivery.body && firstDelivery.body.data;
    cleanup.deliveries.push(delivery.id);
    const prematureComplete = await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${delivery.id}/complete`, { token: TOKENS.kho, body: {} });
    rememberErrorBody('complete before dispatch', prematureComplete.body);
    check('complete while cho_giao -> 422 DELIVERY_INVALID_STATE', prematureComplete.status === 422 && prematureComplete.body.errorCode === 'DELIVERY_INVALID_STATE', prematureComplete.body);

    await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${delivery.id}/start`, { token: TOKENS.kho, body: {} });
    const stockSnapshot = () =>
      db.query(`SELECT COALESCE(SUM(so_luong_ton), 0)::numeric AS ton, (SELECT COUNT(*) FROM chi_tiet_phieu_xuat)::int AS xuat_lines FROM ton_kho`);
    const stockBefore = await stockSnapshot();
    const completed = await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${delivery.id}/complete`, { token: TOKENS.kho, body: {} });
    const stockAfter = await stockSnapshot();
    rememberErrorBody('complete without a stock-linked product', completed.body);
    // Completion is the sales-to-warehouse hand-off: the stock item is resolved
    // through `san_pham.ma_vat_tu_ton_kho` and the deduction happens in the same
    // transaction. A catalogue row with no stock link is refused rather than
    // guessed, so this delivery cannot be fulfilled and nothing is written - the
    // deducting happy path lives in `test_ph1_fulfillment_integration.js`.
    check(
      'completing a delivery for a product with no stock item -> 422 PRODUCT_STOCK_ITEM_NOT_FOUND',
      completed.status === 422 && completed.body.errorCode === 'PRODUCT_STOCK_ITEM_NOT_FOUND',
      completed.body
    );
    check(
      'a refused completion leaves PH4 stock and issue documents untouched',
      String(stockBefore.rows[0].ton) === String(stockAfter.rows[0].ton) && stockBefore.rows[0].xuat_lines === stockAfter.rows[0].xuat_lines,
      { before: stockBefore.rows[0], after: stockAfter.rows[0] }
    );

    const failedDelivery = await call(baseUrl, 'POST', '/api/v1/sales/giao-hang', { token: TOKENS.kho, body: deliveryPayload(draft.id) });
    const deliveryToFail = failedDelivery.body && failedDelivery.body.data;
    cleanup.deliveries.push(deliveryToFail.id);
    await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${deliveryToFail.id}/start`, { token: TOKENS.kho, body: {} });
    const failReason = 'Khách parity không nhận hàng';
    const failed = await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${deliveryToFail.id}/fail`, { token: TOKENS.kho, body: { ly_do: failReason } });
    const failedRow = await db.query('SELECT trang_thai, ghi_chu FROM giao_hang WHERE id = $1', [deliveryToFail.id]);
    check('failure stores the reason on the delivery note', failed.status === 200 && failed.body.data.trang_thai === 'that_bai' && failedRow.rows[0].ghi_chu.includes(failReason), failedRow.rows[0]);

    // ------------------------------------------------------------------
    console.log('== invoices (PH1 invoice guardrails) ==');
    const invoicePayload = (orderId, overrides = {}) => ({ ma_don_ban_hang: orderId, so_tien_da_thu: 0, ghi_chu: MARKER, ...overrides });

    const draftInvoice = await call(baseUrl, 'POST', '/api/v1/sales/hoa-don', { token: TOKENS.ke_toan, body: invoicePayload(toCancel.id) });
    rememberErrorBody('invoice for cancelled order', draftInvoice.body);
    check('invoice for a cancelled order -> 422 INVOICE_INVALID_ORDER', draftInvoice.status === 422 && draftInvoice.body.errorCode === 'INVOICE_INVALID_ORDER', draftInvoice.body);

    const freshDraft = await call(baseUrl, 'POST', '/api/v1/sales/don-hang', { token: TOKENS.ban_hang, body: orderPayload(buyer.id, { lines: [{ ma_san_pham: nowSeller.id, so_luong: 1 }] }) });
    const unconfirmedOrder = freshDraft.body && freshDraft.body.data;
    cleanup.orders.push(unconfirmedOrder.id);
    const unconfirmedInvoice = await call(baseUrl, 'POST', '/api/v1/sales/hoa-don', { token: TOKENS.ke_toan, body: invoicePayload(unconfirmedOrder.id) });
    rememberErrorBody('invoice for unconfirmed order', unconfirmedInvoice.body);
    check('invoice for a cho_xac_nhan order -> 422 INVOICE_INVALID_ORDER', unconfirmedInvoice.status === 422 && unconfirmedInvoice.body.errorCode === 'INVOICE_INVALID_ORDER', unconfirmedInvoice.body);

    const secondBuyer = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', { token: TOKENS.ban_hang, body: customerPayload() });
    cleanup.customers.push(secondBuyer.body.data.id);
    const mismatch = await call(baseUrl, 'POST', '/api/v1/sales/hoa-don', { token: TOKENS.ke_toan, body: invoicePayload(draft.id, { ma_khach_hang: secondBuyer.body.data.id }) });
    rememberErrorBody('invoice customer mismatch', mismatch.body);
    check('invoice customer mismatch -> 422 INVOICE_CUSTOMER_MISMATCH', mismatch.status === 422 && mismatch.body.errorCode === 'INVOICE_CUSTOMER_MISMATCH', mismatch.body);

    const overpaid = await call(baseUrl, 'POST', '/api/v1/sales/hoa-don', { token: TOKENS.ke_toan, body: invoicePayload(draft.id, { so_tien_da_thu: Number(draft.tong_thanh_toan) + 1000 }) });
    rememberErrorBody('overpaid invoice', overpaid.body);
    check('paid amount above the order total -> 422 VALIDATION_ERROR', overpaid.status === 422 && overpaid.body.errorCode === 'VALIDATION_ERROR', overpaid.body);

    const issued = await call(baseUrl, 'POST', '/api/v1/sales/hoa-don', { token: TOKENS.ke_toan, body: invoicePayload(draft.id) });
    const invoice = issued.body && issued.body.data;
    cleanup.invoices.push(invoice.id);
    check('invoice issued -> 201 with HDBH-<year>-<6 digits>', issued.status === 201 && /^HDBH-\d{4}-\d{6}$/.test(invoice.ma_hoa_don), issued.body);
    const creditTerms = await db.query('SELECT so_ngay_cong_no FROM khach_hang WHERE id = $1', [buyer.id]);
    const expectedDays = Number(creditTerms.rows[0].so_ngay_cong_no);
    const actualDays = Math.round((new Date(invoice.ngay_dao_han).getTime() - new Date(invoice.ngay_xuat_hoa_don).getTime()) / 86400000);
    check('due date = issue date + customer credit days', actualDays === expectedDays && invoice.trang_thai === 'chua_thanh_toan', { actualDays, expectedDays, status: invoice.trang_thai });

    await db.query(`UPDATE hoa_don_ban_hang SET ngay_dao_han = NOW() - INTERVAL '5 days' WHERE id = $1`, [invoice.id]);
    const overdueRead = await call(baseUrl, 'GET', `/api/v1/sales/hoa-don/${invoice.id}`, { token: TOKENS.ke_toan });
    check('an overdue unpaid invoice reads back as qua_han', overdueRead.status === 200 && overdueRead.body.data.trang_thai === 'qua_han', overdueRead.body.data && overdueRead.body.data.trang_thai);
    check('invoice keeps its source order linkage', Number(overdueRead.body.data.ma_don_ban_hang) === Number(draft.id) && Number(overdueRead.body.data.ma_khach_hang) === Number(buyer.id), { order: overdueRead.body.data.ma_don_ban_hang, customer: overdueRead.body.data.ma_khach_hang });

    const pastWindow = await call(baseUrl, 'GET', `/api/v1/sales/hoa-don?dueFromDate=${isoDay(-30)}&dueToDate=${isoDay(-1)}&pageSize=100`, { token: TOKENS.ke_toan });
    const futureWindow = await call(baseUrl, 'GET', `/api/v1/sales/hoa-don?dueFromDate=${isoDay(1)}&pageSize=100`, { token: TOKENS.ke_toan });
    check('due-date window includes/excludes the invoice', pastWindow.status === 200 && pastWindow.body.data.some((row) => row.id === invoice.id) && futureWindow.status === 200 && !futureWindow.body.data.some((row) => row.id === invoice.id), { passed: pastWindow.body && pastWindow.body.data.length, future: futureWindow.body && futureWindow.body.data.length });

    // ------------------------------------------------------------------
    console.log('== receivables (PH1 ledger + aging boundaries) ==');
    const receivableList = await call(baseUrl, 'GET', '/api/v1/sales/cong-no?pageSize=100', { token: TOKENS.admin });
    const receivableIds = receivableList.body.data.map((row) => row.id);
    const payableCheck = await db.query(`SELECT COUNT(*)::int AS n FROM cong_no WHERE id = ANY($1::int[]) AND loai_cong_no <> 'phai_thu'`, [receivableIds]);
    check('receivables list can never surface payables', receivableList.status === 200 && payableCheck.rows[0].n === 0, { rows: receivableIds.length, payables: payableCheck.rows[0].n });

    const overdueOnly = await call(baseUrl, 'GET', '/api/v1/sales/cong-no?overdueOnly=true&pageSize=100', { token: TOKENS.admin });
    check('overdueOnly returns only overdue rows', overdueOnly.status === 200 && overdueOnly.body.data.every((row) => Number(row.days_overdue) > 0), overdueOnly.body && overdueOnly.body.data.map((row) => row.days_overdue));

    const agingBefore = await call(baseUrl, 'GET', '/api/v1/sales/cong-no/aging', { token: TOKENS.ke_toan });
    const probeCustomer = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', { token: TOKENS.ban_hang, body: customerPayload() });
    cleanup.customers.push(probeCustomer.body.data.id);
    const probeCustomerId = probeCustomer.body.data.id;
    // 1/30/31/60/61/90/91-day probes: each must land in its own band.
    const probes = [
      { days: -5, amount: '18000.00' },
      { days: 1, amount: '11000.00' },
      { days: 30, amount: '12000.00' },
      { days: 31, amount: '13000.00' },
      { days: 60, amount: '14000.00' },
      { days: 61, amount: '15000.00' },
      { days: 90, amount: '16000.00' },
      { days: 91, amount: '17000.00' },
    ];
    for (const probe of probes) {
      const inserted = await db.query(
        `INSERT INTO cong_no (loai_cong_no, ma_khach_hang, so_tien_phat_sinh, so_tien_da_thanh_toan, so_tien_con_lai, ngay_dao_han, trang_thai)
         VALUES ('phai_thu', $1, $2, 0, $2, NOW() - ($3 || ' days')::interval, 'chua_thanh_toan') RETURNING id`,
        [probeCustomerId, probe.amount, String(probe.days)]
      );
      cleanup.congNo.push(inserted.rows[0].id);
    }

    const agingAfter = await call(baseUrl, 'GET', '/api/v1/sales/cong-no/aging', { token: TOKENS.ke_toan });
    const bucketDelta = {};
    for (const bucket of ['current', 'days1To30', 'days31To60', 'days61To90', 'daysOver90']) {
      bucketDelta[bucket] = Number(agingAfter.body.data[bucket].totalAmount) - Number(agingBefore.body.data[bucket].totalAmount);
    }
    const expectedDeltas = {
      current: 18000,
      days1To30: 23000,
      days31To60: 27000,
      days61To90: 31000,
      daysOver90: 17000,
    };
    check('aging bands are exact at the 1/30/31/60/61/90/91-day boundaries', Object.keys(expectedDeltas).every((bucket) => near(bucketDelta[bucket], expectedDeltas[bucket])), { bucketDelta, expectedDeltas });

    const buckets = ['current', 'days1To30', 'days31To60', 'days61To90', 'daysOver90'];
    const bucketTotal = buckets.reduce((sum, bucket) => sum + Number(agingAfter.body.data[bucket].totalAmount), 0);
    check('aging buckets are exhaustive over totalReceivables', near(bucketTotal, Number(agingAfter.body.data.totalReceivables)), { bucketTotal, totalReceivables: agingAfter.body.data.totalReceivables });

    const accountingLedgerDenied = await call(baseUrl, 'GET', '/api/v1/sales/cong-no/summary', { token: TOKENS.ke_toan });
    const sellerLedger = await call(baseUrl, 'GET', '/api/v1/sales/cong-no?pageSize=5', { token: TOKENS.ban_hang });
    rememberErrorBody('ke_toan ledger read', accountingLedgerDenied.body);
    check('ruling R-2: ledger list/summary need sales.view (ke_toan 403, ban_hang 200)', accountingLedgerDenied.status === 403 && sellerLedger.status === 200, { ke_toan: accountingLedgerDenied.status, ban_hang: sellerLedger.status });

    const receivableSummary = await call(baseUrl, 'GET', '/api/v1/sales/cong-no/summary', { token: TOKENS.ban_hang });
    const overdueBucketTotal = ['days1To30', 'days31To60', 'days61To90', 'daysOver90'].reduce((sum, bucket) => sum + Number(agingAfter.body.data[bucket].totalAmount), 0);
    check('overdue bands equal the summary totalOverdue', near(overdueBucketTotal, Number(receivableSummary.body.data.totalOverdue)), { overdueBucketTotal, totalOverdue: receivableSummary.body.data.totalOverdue });

    const dashboardSummary = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/summary?period=month', { token: TOKENS.admin });
    check(
      'dashboard money metrics agree with the receivables ledger',
      money(dashboardSummary.body.data.metrics.openReceivable) === money(receivableSummary.body.data.totalOutstanding) &&
        money(dashboardSummary.body.data.metrics.overdueReceivable) === money(receivableSummary.body.data.totalOverdue),
      { dashboard: dashboardSummary.body.data.metrics, ledger: receivableSummary.body.data }
    );

    // ------------------------------------------------------------------
    console.log('== dashboard (PH1 role scopes + period rules) ==');
    const accountingScope = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/summary?period=month', { token: TOKENS.ke_toan });
    const accountingKeys = Object.keys(accountingScope.body.data.metrics).sort();
    check(
      'ke_toan receives the financial scope only',
      accountingScope.status === 200 &&
        accountingScope.body.data.scope === 'financial' &&
        accountingKeys.join(',') === 'openReceivable,overdueInvoiceCount,overdueReceivable,unpaidInvoiceCount',
      accountingScope.body.data
    );
    const warehouseScope = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/summary?period=month', { token: TOKENS.kho });
    check(
      'kho receives the fulfillment scope only (no money)',
      warehouseScope.status === 200 && warehouseScope.body.data.scope === 'fulfillment' && Object.keys(warehouseScope.body.data.metrics).sort().join(',') === 'orderCount,statusCounts',
      warehouseScope.body.data
    );
    const productionDenied = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/summary?period=month', { token: TOKENS.san_xuat });
    rememberErrorBody('production scope', productionDenied.body);
    check('a non-sales role is denied the summary -> 403', productionDenied.status === 403, productionDenied.status);

    const fullScope = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/summary?period=month', { token: TOKENS.admin });
    const statusCountSum = Object.values(fullScope.body.data.metrics.statusCounts).reduce((sum, value) => sum + Number(value), 0);
    check('status breakdown adds up to orderCount', statusCountSum === Number(fullScope.body.data.metrics.orderCount), fullScope.body.data.metrics);

    const invertedRange = await call(baseUrl, 'GET', `/api/v1/sales/tong-quan/summary?period=custom&fromDate=${isoDay(1)}&toDate=${isoDay(-1)}`, { token: TOKENS.admin });
    rememberErrorBody('inverted range', invertedRange.body);
    check('custom period with fromDate > toDate -> 422', invertedRange.status === 422 && invertedRange.body.errorCode === 'VALIDATION_ERROR', invertedRange.body);

    // ------------------------------------------------------------------
    console.log('== security hardening (PLAN.md Step 9) ==');
    const injectionAttempt = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang?sortBy=id%3B%20DROP%20TABLE%20khach_hang&sortOrder=ASC', { token: TOKENS.admin });
    const tableStillThere = await db.query(`SELECT COUNT(*)::int AS n FROM khach_hang`);
    check('a forbidden sortBy cannot inject SQL', injectionAttempt.status === 200 && tableStillThere.rows[0].n > 0, { status: injectionAttempt.status, rows: tableStillThere.rows[0].n });

    const expiredToken = signToken(1, Date.now() - 25 * 60 * 60 * 1000);
    const futureToken = signToken(1, Date.now() + 10 * 60 * 1000);
    const expiredAttempt = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang', { token: expiredToken });
    const futureAttempt = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang', { token: futureToken });
    rememberErrorBody('expired token', expiredAttempt.body);
    check('expired and future-dated tokens -> 401 UNAUTHORIZED', expiredAttempt.status === 401 && futureAttempt.status === 401 && expiredAttempt.body.errorCode === 'UNAUTHORIZED', { expired: expiredAttempt.status, future: futureAttempt.status });

    const spoofedIdentity = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang', {
      rawHeaders: { 'Content-Type': 'application/json', Authorization: `Bearer ${signToken(5)}`, 'x-role': 'admin', 'x-user-id': '1' },
    });
    rememberErrorBody('identity header spoof', spoofedIdentity.body);
    check('identity headers cannot escalate a token (kho + x-role admin -> 403)', spoofedIdentity.status === 403, spoofedIdentity.status);

    const corsUnlisted = await call(baseUrl, 'GET', '/api/v1/health', { rawHeaders: { Origin: 'http://evil.example' } });
    const corsListed = await call(baseUrl, 'GET', '/api/v1/health', { rawHeaders: { Origin: 'http://localhost:5173' } });
    check('CORS echoes an allow-listed origin only', !corsUnlisted.responseHeaders.get('access-control-allow-origin') && corsListed.responseHeaders.get('access-control-allow-origin') === 'http://localhost:5173', { unlisted: corsUnlisted.responseHeaders.get('access-control-allow-origin'), listed: corsListed.responseHeaders.get('access-control-allow-origin') });

    const leakPattern = /at [A-Za-z]:\\|\n\s+at |SELECT |INSERT INTO|UPDATE \w+ SET|DELETE FROM|pg_|node:internal/i;
    const leaking = errorBodies.filter((entry) => leakPattern.test(entry.text));
    check(`error envelopes never leak SQL or stack frames (${errorBodies.length} payloads scanned)`, leaking.length === 0, leaking.map((entry) => entry.label));

    const savedNodeEnv = process.env.NODE_ENV;
    const secretMessage = 'PARITY-INTERNAL-SECRET';
    const productionRes = fakeRes();
    process.env.NODE_ENV = 'production';
    errorHandler(new Error(secretMessage), { method: 'GET', originalUrl: '/parity' }, productionRes, () => {});
    process.env.NODE_ENV = savedNodeEnv;
    const productionText = JSON.stringify(productionRes.captured.payload);
    // Core's boundary keeps `message` (contract §9.3) but must never render the stack
    // (`details` is dev-only) nor any SQL text.
    check(
      'production mode answers 500 without details, stack frames or SQL',
      productionRes.captured.statusCode === 500 &&
        productionRes.captured.payload.success === false &&
        productionRes.captured.payload.errorCode === 'INTERNAL_SERVER_ERROR' &&
        productionRes.captured.payload.details === undefined &&
        !/at [A-Za-z]:\\|\n\s+at |node:internal|SELECT |INSERT INTO/.test(productionText),
      productionRes.captured
    );
  } finally {
    server.close();
    const cleanupErrors = [];
    const safeWrite = async (label, sql, params) => {
      try {
        await db.query(sql, params);
      } catch (error) {
        cleanupErrors.push(`${label}: ${error.message}`);
      }
    };
    for (const entry of cleanup.productStatus) {
      await safeWrite('restore product status', 'UPDATE san_pham SET trang_thai = $2 WHERE id = $1', [entry.id, entry.trang_thai]);
    }
    if (cleanup.invoices.length) {
      // Issuing an invoice posts a `phai_thu` receivable row pointing at it (no
      // FK, so the order matters): remove the ledger row with its invoice.
      await safeWrite('delete invoice receivables', `DELETE FROM cong_no WHERE ma_hoa_don = ANY($1::int[])`, [cleanup.invoices]);
      await safeWrite('delete invoices', `DELETE FROM hoa_don_ban_hang WHERE id = ANY($1::int[])`, [cleanup.invoices]);
    }
    if (cleanup.deliveries.length) await safeWrite('delete deliveries', `DELETE FROM giao_hang WHERE id = ANY($1::int[])`, [cleanup.deliveries]);
    if (cleanup.congNo.length) await safeWrite('delete aging probes', `DELETE FROM cong_no WHERE id = ANY($1::int[])`, [cleanup.congNo]);
    if (cleanup.orders.length) {
      // Confirming an order hands it to Production, which owns `lenh_san_xuat`
      // rows referencing it; they must go before the order they were raised for.
      await safeWrite('delete production orders', `DELETE FROM lenh_san_xuat WHERE ma_don_ban_hang = ANY($1::int[])`, [cleanup.orders]);
      await safeWrite('delete order lines', `DELETE FROM chi_tiet_don_ban_hang WHERE ma_don_ban_hang = ANY($1::int[])`, [cleanup.orders]);
      await safeWrite('delete orders', `DELETE FROM don_ban_hang WHERE id = ANY($1::int[])`, [cleanup.orders]);
    }
    if (cleanup.customers.length) await safeWrite('delete customers', `DELETE FROM khach_hang WHERE id = ANY($1::int[])`, [cleanup.customers]);
    check('cleanup finished without errors (no test rows left behind)', cleanupErrors.length === 0, cleanupErrors);
    await db.pool?.end?.().catch?.(() => {});
  }

  console.log('================================================================');
  console.log(`PH1 BUSINESS PARITY: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log(`Failures: ${failures.join(' | ')}`);
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error('Parity suite aborted:', error);
  try {
    await db.pool?.end?.();
  } catch (closeError) {
    /* ignore */
  }
  process.exitCode = 1;
});
