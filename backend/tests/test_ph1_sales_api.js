'use strict';

/**
 * PH1 Sales module - API smoke / regression test.
 *
 * Evidence for PLAN.md Step 5 (backend remediation) and Step 11 (automated
 * regression), Gate 3 (Security/RBAC) and Gate 4 (Automated regression):
 *
 *   - every protected endpoint returns 401 without a token, 401 with a forged
 *     token, 403 with a valid token whose role is not allowed, and 2xx for an
 *     allowed role (contract §6.2 / §9.2);
 *   - success/error envelopes follow contract §9.3;
 *   - validation rejects malformed input with 422 and field-level details;
 *   - a PATCH that omits optional fields does not overwrite stored values;
 *   - Core and PH4 endpoints still behave (no regression from the PH1 mount).
 *
 * Run from `backend/`:
 *   node tests/test_ph1_sales_api.js
 *
 * Requires the database configured in `backend/.env` (see the handover notes).
 * Rows created by this test are marked `[SMOKE]` in `ghi_chu` and are safe to
 * delete from the disposable development database.
 */

const assert = require('assert');

const app = require('../src/app');
const { signToken } = require('../src/middlewares/auth');

const TOKENS = {
  admin: signToken(1),
  ban_hang: signToken(2),
  kho: signToken(5),
  ke_toan: signToken(6),
  forged: `erp_token_1_${Date.now()}.forged-signature`,
};

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

function headers(token) {
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function call(baseUrl, method, path, { token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: headers(token),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch (err) {
    payload = null;
  }
  return { status: response.status, body: payload };
}

async function main() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    console.log('== platform health ==');
    const health = await call(baseUrl, 'GET', '/api/v1/health');
    check('GET /api/v1/health -> 200', health.status === 200, health);
    check('health payload reports UP', health.body && health.body.status === 'UP', health.body);

    console.log('== authentication gate (contract §6.2) ==');
    const noToken = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang');
    check('no token -> 401', noToken.status === 401, noToken);
    check('401 envelope carries errorCode', noToken.body && noToken.body.success === false && noToken.body.errorCode === 'UNAUTHORIZED', noToken.body);

    const forged = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang', { token: TOKENS.forged });
    check('forged token -> 401', forged.status === 401, forged);

    const wrongRole = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang', { token: TOKENS.kho });
    check('valid token without permission -> 403', wrongRole.status === 403, wrongRole);
    check('403 envelope carries errorCode', wrongRole.body && wrongRole.body.errorCode === 'FORBIDDEN', wrongRole.body);

    console.log('== customer list (read matrix) ==');
    const adminList = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang', { token: TOKENS.admin });
    check('admin -> 200', adminList.status === 200, adminList.status);
    check(
      'list envelope follows contract §9.3 + pagination',
      adminList.body &&
        adminList.body.success === true &&
        Array.isArray(adminList.body.data) &&
        adminList.body.meta &&
        typeof adminList.body.meta.page === 'number' &&
        typeof adminList.body.meta.pageSize === 'number' &&
        typeof adminList.body.meta.total === 'number' &&
        typeof adminList.body.meta.totalPages === 'number',
      adminList.body && adminList.body.meta
    );

    const salesList = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang', { token: TOKENS.ban_hang });
    check('ban_hang -> 200', salesList.status === 200, salesList.status);

    const accountingList = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang', { token: TOKENS.ke_toan });
    check('ke_toan -> 200 (accounting read retained)', accountingList.status === 200, accountingList.status);

    const paged = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang?page=1&pageSize=5&sortBy=ten_khach_hang&sortOrder=ASC', {
      token: TOKENS.admin,
    });
    check('pageSize honoured', paged.status === 200 && paged.body.data.length <= 5, paged.body && paged.body.data.length);

    const badQuery = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang?page=0', { token: TOKENS.admin });
    check('invalid query -> 422', badQuery.status === 422, badQuery.status);
    check(
      'validation details name the offending field',
      badQuery.body && Array.isArray(badQuery.body.details) && badQuery.body.details.some((d) => d.field === 'page'),
      badQuery.body && badQuery.body.details
    );

    console.log('== customer create (write matrix + validation) ==');
    const marker = `[SMOKE] ${new Date().toISOString()}`;
    const createPayload = {
      ten_khach_hang: 'Khách hàng kiểm thử tích hợp',
      loai_khach_hang: 'to_chuc',
      so_dien_thoai: '0900000001',
      email: 'smoke.test@may10.vn',
      dia_chi: 'Số 1 Mai Động',
      tinh_thanh_pho: 'Hà Nội',
      han_muc_cong_no: 1000000,
      so_ngay_cong_no: 30,
      ghi_chu: marker,
    };

    const forbiddenCreate = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', { token: TOKENS.kho, body: createPayload });
    check('kho cannot create -> 403', forbiddenCreate.status === 403, forbiddenCreate.status);

    const invalidCreate = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', { token: TOKENS.ban_hang, body: { ten_khach_hang: '' } });
    check('missing fields -> 422', invalidCreate.status === 422, invalidCreate.status);
    check(
      'field-level details returned for create',
      invalidCreate.body && Array.isArray(invalidCreate.body.details) && invalidCreate.body.details.length >= 4,
      invalidCreate.body && invalidCreate.body.details && invalidCreate.body.details.length
    );

    const created = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', { token: TOKENS.ban_hang, body: createPayload });
    check('ban_hang creates -> 201', created.status === 201, created.body);
    check('generated code follows KH-<year>-<6 digits>', created.body && /^KH-\d{4}-\d{6}$/.test(created.body.data.ma_khach_hang), created.body && created.body.data && created.body.data.ma_khach_hang);
    check('new customer is active', created.body && created.body.data.trang_thai === 'hoat_dong', created.body && created.body.data && created.body.data.trang_thai);
    check('numeric input preserved (1,000,000)', created.body && Number(created.body.data.han_muc_cong_no) === 1000000, created.body && created.body.data && created.body.data.han_muc_cong_no);

    const customerId = created.body && created.body.data ? created.body.data.id : null;

    console.log('== customer detail / update ==');
    if (customerId) {
      const detail = await call(baseUrl, 'GET', `/api/v1/sales/khach-hang/${customerId}`, { token: TOKENS.admin });
      check('detail -> 200 with envelope', detail.status === 200 && detail.body.success === true && detail.body.data.id === customerId, detail.status);

      const missing = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang/99999999', { token: TOKENS.admin });
      check('unknown id -> 404', missing.status === 404, missing.status);
      check('404 envelope carries the domain error code', missing.body && missing.body.errorCode === 'CUSTOMER_NOT_FOUND', missing.body);

      const patched = await call(baseUrl, 'PATCH', `/api/v1/sales/khach-hang/${customerId}`, {
        token: TOKENS.ban_hang,
        body: { so_ngay_cong_no: 45 },
      });
      check('partial update -> 200', patched.status === 200, patched.status);
      check('patched field applied', patched.body && patched.body.data.so_ngay_cong_no === 45, patched.body && patched.body.data && patched.body.data.so_ngay_cong_no);
      check(
        'omitted field NOT overwritten by its default',
        patched.body && Number(patched.body.data.han_muc_cong_no) === 1000000,
        patched.body && patched.body.data && patched.body.data.han_muc_cong_no
      );

      const invalidPatch = await call(baseUrl, 'PATCH', `/api/v1/sales/khach-hang/${customerId}`, {
        token: TOKENS.ban_hang,
        body: { email: 'not-an-email' },
      });
      check('invalid patch -> 422', invalidPatch.status === 422, invalidPatch.status);

      const statusBySales = await call(baseUrl, 'PATCH', `/api/v1/sales/khach-hang/${customerId}/status`, {
        token: TOKENS.ban_hang,
        body: { trang_thai: 'tam_khoa' },
      });
      check('status change is admin-only -> 403 for ban_hang', statusBySales.status === 403, statusBySales.status);

      const statusByAdmin = await call(baseUrl, 'PATCH', `/api/v1/sales/khach-hang/${customerId}/status`, {
        token: TOKENS.admin,
        body: { trang_thai: 'tam_khoa' },
      });
      check('admin status change -> 200', statusByAdmin.status === 200 && statusByAdmin.body.data.trang_thai === 'tam_khoa', statusByAdmin.body);

      const summary = await call(baseUrl, 'GET', `/api/v1/sales/khach-hang/${customerId}/summary`, { token: TOKENS.admin });
      check('summary -> 200', summary.status === 200, summary.status);
      check(
        'summary carries the commercial fields',
        summary.body &&
          summary.body.data &&
          ['totalOrders', 'totalOrderValue', 'unpaidInvoicesCount', 'outstandingReceivable', 'overdueReceivable'].every((k) => k in summary.body.data),
        summary.body && summary.body.data
      );

      const customerReceivablesByAccounting = await call(baseUrl, 'GET', `/api/v1/sales/khach-hang/${customerId}/receivables`, { token: TOKENS.ke_toan });
      check('customer receivables follow ruling R-2 (sales permission) -> 403 for ke_toan', customerReceivablesByAccounting.status === 403, customerReceivablesByAccounting.status);

      const customerReceivables = await call(baseUrl, 'GET', `/api/v1/sales/khach-hang/${customerId}/receivables`, { token: TOKENS.ban_hang });
      check('customer receivables -> 200 for ban_hang', customerReceivables.status === 200, customerReceivables.status);
    } else {
      check('customer id present for detail checks', false, created.body);
    }

    console.log('== receivables module (ruling R-2) ==');
    const arListSales = await call(baseUrl, 'GET', '/api/v1/sales/cong-no', { token: TOKENS.ban_hang });
    check('receivables list allowed for sales -> 200', arListSales.status === 200, arListSales.status);
    const arListAccounting = await call(baseUrl, 'GET', '/api/v1/sales/cong-no', { token: TOKENS.ke_toan });
    check('receivables list denied for accounting (R-2) -> 403', arListAccounting.status === 403, arListAccounting.status);
    const agingAccounting = await call(baseUrl, 'GET', '/api/v1/sales/cong-no/aging', { token: TOKENS.ke_toan });
    check('aging allowed for accounting -> 200', agingAccounting.status === 200, agingAccounting.status);
    const agingSales = await call(baseUrl, 'GET', '/api/v1/sales/cong-no/aging', { token: TOKENS.ban_hang });
    check('aging denied for sales (R-2) -> 403', agingSales.status === 403, agingSales.status);

    console.log('== product catalogue ==');
    const productListAdmin = await call(baseUrl, 'GET', '/api/v1/sales/san-pham', { token: TOKENS.admin });
    check('product list -> 200', productListAdmin.status === 200, productListAdmin.status);
    const firstProduct = productListAdmin.body && Array.isArray(productListAdmin.body.data) ? productListAdmin.body.data[0] : null;
    check('product list returns sellable rows', Boolean(firstProduct && firstProduct.id), productListAdmin.body && productListAdmin.body.meta);
    check('cost price (gia_von) never serialized', Boolean(firstProduct) && !('gia_von' in firstProduct), firstProduct && Object.keys(firstProduct));
    const productPrice = firstProduct ? Number(firstProduct.gia_ban) : 0;
    const productId = firstProduct ? firstProduct.id : null;

    const productKho = await call(baseUrl, 'GET', '/api/v1/sales/san-pham', { token: TOKENS.kho });
    check('warehouse role may read products -> 200', productKho.status === 200, productKho.status);
    const productAccounting = await call(baseUrl, 'GET', '/api/v1/sales/san-pham', { token: TOKENS.ke_toan });
    check('accounting role may read products -> 200', productAccounting.status === 200, productAccounting.status);
    const productDetail = await call(baseUrl, 'GET', `/api/v1/sales/san-pham/${productId}`, { token: TOKENS.admin });
    check('product detail -> 200', productDetail.status === 200, productDetail.status);
    const productMissing = await call(baseUrl, 'GET', '/api/v1/sales/san-pham/99999999', { token: TOKENS.admin });
    check('unknown product -> 404 PRODUCT_NOT_FOUND', productMissing.status === 404 && productMissing.body.errorCode === 'PRODUCT_NOT_FOUND', productMissing.body);
    check('non-field error carries details: null (contract §9.3)', productMissing.body && productMissing.body.details === null, productMissing.body);

    console.log('== sales orders (create -> confirm -> cancel matrix) ==');
    // A committed customer that stays active: the earlier section deliberately
    // flips its own customer to a non-active status.
    const orderCustomer = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', {
      token: TOKENS.ban_hang,
      body: {
        ten_khach_hang: 'Khách hàng đơn hàng tích hợp',
        loai_khach_hang: 'to_chuc',
        so_dien_thoai: '0900000002',
        email: 'smoke.orders@may10.vn',
        dia_chi: 'Số 1 Mai Động',
        tinh_thanh_pho: 'Hà Nội',
        han_muc_cong_no: 1000000000,
        so_ngay_cong_no: 30,
        ghi_chu: marker,
      },
    });
    const orderCustomerId = orderCustomer.body && orderCustomer.body.data ? orderCustomer.body.data.id : null;
    check('order-suite customer created and active', Boolean(orderCustomerId) && orderCustomer.body.data.trang_thai === 'hoat_dong', orderCustomer.body);

    const isoDay = (offsetDays) => {
      const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
      return date.toISOString().slice(0, 10);
    };
    const orderPayload = () => ({
      ma_khach_hang: orderCustomerId,
      ngay_dat_hang: isoDay(0),
      ngay_giao_hang_yc: isoDay(3),
      dia_chi_giao_hang: 'Số 1 Mai Động, Hà Nội',
      ghi_chu: marker,
      lines: [{ ma_san_pham: productId, so_luong: 2, ty_le_giam_gia: 10 }],
    });

    const orderReadGuard = await call(baseUrl, 'GET', '/api/v1/sales/don-hang', { token: TOKENS.kho });
    check('order list readable by kho -> 200', orderReadGuard.status === 200, orderReadGuard.status);
    const orderWriteGuard = await call(baseUrl, 'POST', '/api/v1/sales/don-hang', { token: TOKENS.kho, body: orderPayload() });
    check('kho cannot create orders -> 403', orderWriteGuard.status === 403, orderWriteGuard.status);

    const orderCreated = await call(baseUrl, 'POST', '/api/v1/sales/don-hang', { token: TOKENS.ban_hang, body: orderPayload() });
    check('ban_hang creates order -> 201', orderCreated.status === 201, orderCreated.body);
    const order = orderCreated.body && orderCreated.body.data;
    check('order code follows DBH-<year>-<6 digits>', Boolean(order && /^DBH-\d{4}-\d{6}$/.test(order.ma_don_ban)), order && order.ma_don_ban);
    check('new order starts as cho_xac_nhan', Boolean(order && order.trang_thai === 'cho_xac_nhan'), order && order.trang_thai);
    const gross = 2 * productPrice;
    const discount = Math.round(gross * 10) / 100;
    check('server computed gross total', Boolean(order) && Number(order.tong_tien_hang) === gross, order && order.tong_tien_hang);
    check('server computed discount', Boolean(order) && Number(order.tien_giam_gia) === discount, order && order.tien_giam_gia);
    check(
      'taxable + tax = payable',
      Boolean(order) && Number(order.tong_thanh_toan) === Math.round((gross - discount + Number(order.tien_thue)) * 100) / 100,
      order && order.tong_thanh_toan
    );
    check('line price comes from the product table', Boolean(order && order.lines && order.lines.length === 1 && Number(order.lines[0].don_gia) === productPrice), order && order.lines && order.lines[0]);

    const badDeliveryDate = await call(baseUrl, 'POST', '/api/v1/sales/don-hang', {
      token: TOKENS.ban_hang,
      body: { ...orderPayload(), ngay_giao_hang_yc: isoDay(-2) },
    });
    check('delivery date before order date -> 422', badDeliveryDate.status === 422, badDeliveryDate.status);
    check(
      'date rule reports the offending field',
      Boolean(badDeliveryDate.body && Array.isArray(badDeliveryDate.body.details) && badDeliveryDate.body.details.some((d) => d.field === 'ngay_giao_hang_yc')),
      badDeliveryDate.body && badDeliveryDate.body.details
    );
    const zeroQuantity = await call(baseUrl, 'POST', '/api/v1/sales/don-hang', {
      token: TOKENS.ban_hang,
      body: { ...orderPayload(), lines: [{ ma_san_pham: productId, so_luong: 0 }] },
    });
    check('zero quantity -> 422', zeroQuantity.status === 422, zeroQuantity.status);
    const unknownProduct = await call(baseUrl, 'POST', '/api/v1/sales/don-hang', {
      token: TOKENS.ban_hang,
      body: { ...orderPayload(), lines: [{ ma_san_pham: 99999999, so_luong: 1 }] },
    });
    check('unknown product in order -> 404 PRODUCT_NOT_FOUND', unknownProduct.status === 404 && unknownProduct.body.errorCode === 'PRODUCT_NOT_FOUND', unknownProduct.body);

    const orderDetail = await call(baseUrl, 'GET', `/api/v1/sales/don-hang/${order.id}`, { token: TOKENS.admin });
    check('order detail -> 200 with lines', orderDetail.status === 200 && orderDetail.body.data.lines.length >= 1, orderDetail.status);
    const orderList = await call(baseUrl, 'GET', `/api/v1/sales/don-hang?ma_khach_hang=${customerId}&trang_thai=cho_xac_nhan`, { token: TOKENS.ban_hang });
    check('order list filters by customer and status', orderList.status === 200 && orderList.body.data.every((o) => o.ma_khach_hang === orderCustomerId), orderList.status);

    const orderPatched = await call(baseUrl, 'PATCH', `/api/v1/sales/don-hang/${order.id}`, {
      token: TOKENS.admin,
      body: { ngay_giao_hang_yc: isoDay(5), lines: [{ ma_san_pham: productId, so_luong: 3, ty_le_giam_gia: 10 }] },
    });
    check('patch draft order -> 200', orderPatched.status === 200, orderPatched.body);
    check(
      'patch recalculates totals from the new lines',
      orderPatched.body && Number(orderPatched.body.data.tong_tien_hang) === 3 * productPrice,
      orderPatched.body && orderPatched.body.data.tong_tien_hang
    );
    const patchGuard = await call(baseUrl, 'PATCH', `/api/v1/sales/don-hang/${order.id}`, { token: TOKENS.kho, body: { ghi_chu: 'x' } });
    check('kho cannot patch orders -> 403', patchGuard.status === 403, patchGuard.status);

    const confirmGuard = await call(baseUrl, 'POST', `/api/v1/sales/don-hang/${order.id}/confirm`, { token: TOKENS.kho, body: {} });
    check('kho cannot confirm orders -> 403', confirmGuard.status === 403, confirmGuard.status);
    const confirmed = await call(baseUrl, 'POST', `/api/v1/sales/don-hang/${order.id}/confirm`, {
      token: TOKENS.ban_hang,
      body: { acknowledgeCreditLimit: true },
    });
    check('ban_hang confirms order -> 200', confirmed.status === 200, confirmed.body);
    check('confirmed status is da_xac_nhan', confirmed.body && confirmed.body.data.trang_thai === 'da_xac_nhan', confirmed.body && confirmed.body.data.trang_thai);
    const reConfirm = await call(baseUrl, 'POST', `/api/v1/sales/don-hang/${order.id}/confirm`, { token: TOKENS.ban_hang, body: {} });
    check('confirming twice -> 422 ORDER_INVALID_STATE', reConfirm.status === 422 && reConfirm.body.errorCode === 'ORDER_INVALID_STATE', reConfirm.body);

    const orderB = await call(baseUrl, 'POST', '/api/v1/sales/don-hang', { token: TOKENS.ban_hang, body: orderPayload() });
    const cancelNoReason = await call(baseUrl, 'POST', `/api/v1/sales/don-hang/${orderB.body.data.id}/cancel`, { token: TOKENS.ban_hang, body: {} });
    check('cancel without reason -> 422', cancelNoReason.status === 422, cancelNoReason.status);
    check(
      'cancel rule reports ly_do',
      Boolean(cancelNoReason.body && cancelNoReason.body.details.some((d) => d.field === 'ly_do')),
      cancelNoReason.body && cancelNoReason.body.details
    );
    await call(baseUrl, 'POST', `/api/v1/sales/don-hang/${orderB.body.data.id}/confirm`, { token: TOKENS.ban_hang, body: { acknowledgeCreditLimit: true } });
    const cancelConfirmedBySeller = await call(baseUrl, 'POST', `/api/v1/sales/don-hang/${orderB.body.data.id}/cancel`, {
      token: TOKENS.ban_hang,
      body: { ly_do: 'Đổi ý' },
    });
    check('seller cannot cancel a confirmed order -> 403', cancelConfirmedBySeller.status === 403, cancelConfirmedBySeller.body);
    const cancelConfirmedByAdmin = await call(baseUrl, 'POST', `/api/v1/sales/don-hang/${orderB.body.data.id}/cancel`, {
      token: TOKENS.admin,
      body: { ly_do: 'Khách đổi ý' },
    });
    check('admin cancels confirmed order -> 200', cancelConfirmedByAdmin.status === 200, cancelConfirmedByAdmin.body);
    check(
      'cancellation note is appended',
      cancelConfirmedByAdmin.body && /\[HỦY ĐƠN: Khách đổi ý\]/.test(cancelConfirmedByAdmin.body.data.ghi_chu || ''),
      cancelConfirmedByAdmin.body && cancelConfirmedByAdmin.body.data.ghi_chu
    );

    console.log('== invoices (finance-owned issuance) ==');
    const invoiceCreateGuard = await call(baseUrl, 'POST', '/api/v1/sales/hoa-don', {
      token: TOKENS.ban_hang,
      body: { ma_don_ban_hang: order.id },
    });
    check('seller cannot issue an invoice -> 403', invoiceCreateGuard.status === 403, invoiceCreateGuard.status);
    const invoiceCreated = await call(baseUrl, 'POST', '/api/v1/sales/hoa-don', {
      token: TOKENS.ke_toan,
      body: { ma_don_ban_hang: order.id, ma_khach_hang: orderCustomerId, so_tien_da_thu: 0, ghi_chu: marker },
    });
    check('accounting issues invoice -> 201', invoiceCreated.status === 201, invoiceCreated.body);
    const invoice = invoiceCreated.body && invoiceCreated.body.data;
    check('invoice carries a document number', Boolean(invoice && typeof invoice.ma_hoa_don === 'string' && invoice.ma_hoa_don.length > 0), invoice && invoice.ma_hoa_don);
    check('invoice total matches the confirmed order', Boolean(invoice) && Number(invoice.tong_tien_sau_thue) === Number(confirmed.body.data.tong_thanh_toan), invoice && invoice.tong_tien_sau_thue);
    check('invoice due date derives from credit terms', Boolean(invoice && invoice.ngay_dao_han), invoice && invoice.ngay_dao_han);
    const invoiceDuplicate = await call(baseUrl, 'POST', '/api/v1/sales/hoa-don', { token: TOKENS.ke_toan, body: { ma_don_ban_hang: order.id } });
    check('second invoice for the same order -> 409', invoiceDuplicate.status === 409 && invoiceDuplicate.body.errorCode === 'INVOICE_ALREADY_EXISTS', invoiceDuplicate.body);
    const invoiceDraftOrder = await call(baseUrl, 'POST', '/api/v1/sales/hoa-don', { token: TOKENS.ke_toan, body: { ma_don_ban_hang: 99999999 } });
    check('invoice for unknown order -> 404 ORDER_NOT_FOUND', invoiceDraftOrder.status === 404 && invoiceDraftOrder.body.errorCode === 'ORDER_NOT_FOUND', invoiceDraftOrder.body);
    const invoiceMissingField = await call(baseUrl, 'POST', '/api/v1/sales/hoa-don', { token: TOKENS.ke_toan, body: {} });
    check('invoice without order reference -> 422', invoiceMissingField.status === 422, invoiceMissingField.status);
    const invoiceListAccounting = await call(baseUrl, 'GET', `/api/v1/sales/hoa-don?ma_don_ban_hang=${order.id}`, { token: TOKENS.ke_toan });
    check('invoice list for accounting -> 200', invoiceListAccounting.status === 200 && invoiceListAccounting.body.data.some((i) => i.id === invoice.id), invoiceListAccounting.status);
    const invoiceListSeller = await call(baseUrl, 'GET', '/api/v1/sales/hoa-don', { token: TOKENS.ban_hang });
    check('seller may read invoices -> 200', invoiceListSeller.status === 200, invoiceListSeller.status);
    const invoiceListWarehouse = await call(baseUrl, 'GET', '/api/v1/sales/hoa-don', { token: TOKENS.kho });
    check('warehouse cannot read invoices -> 403', invoiceListWarehouse.status === 403, invoiceListWarehouse.status);
    const invoiceDetail = await call(baseUrl, 'GET', `/api/v1/sales/hoa-don/${invoice.id}`, { token: TOKENS.ke_toan });
    check('invoice detail -> 200', invoiceDetail.status === 200 && invoiceDetail.body.data.id === invoice.id, invoiceDetail.status);

    console.log('== deliveries (dispatch lifecycle) ==');
    const deliveryMissingFields = await call(baseUrl, 'POST', '/api/v1/sales/giao-hang', { token: TOKENS.kho, body: { ma_don_ban_hang: order.id } });
    check('delivery without warehouse/date/receiver -> 422', deliveryMissingFields.status === 422, deliveryMissingFields.status);
    check(
      'delivery validation reports each required field',
      Boolean(
        deliveryMissingFields.body &&
          Array.isArray(deliveryMissingFields.body.details) &&
          ['ma_kho', 'ngay_giao', 'ten_nguoi_nhan', 'dia_chi_giao'].every((field) => deliveryMissingFields.body.details.some((d) => d.field === field))
      ),
      deliveryMissingFields.body && deliveryMissingFields.body.details
    );
    const deliveryBadWarehouse = await call(baseUrl, 'POST', '/api/v1/sales/giao-hang', {
      token: TOKENS.kho,
      body: { ma_don_ban_hang: order.id, ma_kho: 99999999, ngay_giao: isoDay(1), ten_nguoi_nhan: 'Nguyễn Văn Nhận', dia_chi_giao: 'Số 1 Mai Động' },
    });
    check('unknown warehouse -> 404 WAREHOUSE_NOT_FOUND', deliveryBadWarehouse.status === 404 && deliveryBadWarehouse.body.errorCode === 'WAREHOUSE_NOT_FOUND', deliveryBadWarehouse.body);
    const deliveryPayload = () => ({
      ma_don_ban_hang: order.id,
      ma_kho: 2,
      ngay_giao: isoDay(1),
      ten_nguoi_nhan: 'Nguyễn Văn Nhận',
      dia_chi_giao: 'Số 1 Mai Động, Hà Nội',
      ghi_chu: marker,
    });
    const deliveryCreated = await call(baseUrl, 'POST', '/api/v1/sales/giao-hang', { token: TOKENS.kho, body: deliveryPayload() });
    check('kho creates delivery -> 201', deliveryCreated.status === 201, deliveryCreated.body);
    const delivery = deliveryCreated.body && deliveryCreated.body.data;
    check('new delivery starts as cho_giao', Boolean(delivery && delivery.trang_thai === 'cho_giao'), delivery && delivery.trang_thai);
    const deliveryStartGuard = await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${delivery.id}/start`, { token: TOKENS.ban_hang, body: {} });
    check('seller cannot dispatch -> 403 (kho.xuat)', deliveryStartGuard.status === 403, deliveryStartGuard.status);
    const deliveryStarted = await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${delivery.id}/start`, { token: TOKENS.kho, body: {} });
    check('kho starts delivery -> 200 dang_giao', deliveryStarted.status === 200 && deliveryStarted.body.data.trang_thai === 'dang_giao', deliveryStarted.body && deliveryStarted.body.data);
    const deliveryCompleted = await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${delivery.id}/complete`, { token: TOKENS.kho, body: {} });
    check('kho completes delivery -> 200 da_giao', deliveryCompleted.status === 200 && deliveryCompleted.body.data.trang_thai === 'da_giao', deliveryCompleted.body && deliveryCompleted.body.data);
    const deliverySecond = await call(baseUrl, 'POST', '/api/v1/sales/giao-hang', { token: TOKENS.kho, body: deliveryPayload() });
    const deliveryFailNoReason = await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${deliverySecond.body.data.id}/fail`, { token: TOKENS.kho, body: {} });
    check('fail without reason -> 422', deliveryFailNoReason.status === 422, deliveryFailNoReason.status);
    await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${deliverySecond.body.data.id}/start`, { token: TOKENS.kho, body: {} });
    const deliveryFailed = await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${deliverySecond.body.data.id}/fail`, { token: TOKENS.kho, body: { ly_do: 'Khách không nhận hàng' } });
    check('fail with reason -> 200 that_bai', deliveryFailed.status === 200 && deliveryFailed.body.data.trang_thai === 'that_bai', deliveryFailed.body && deliveryFailed.body.data);
    const deliveryList = await call(baseUrl, 'GET', `/api/v1/sales/giao-hang?ma_don_ban_hang=${order.id}`, { token: TOKENS.kho });
    check('delivery list filters by order', deliveryList.status === 200 && deliveryList.body.data.length >= 1, deliveryList.status);

    console.log('== receivables after issuance ==');
    const receivablesAfterInvoice = await call(baseUrl, 'GET', `/api/v1/sales/cong-no?ma_hoa_don=${invoice.id}`, { token: TOKENS.ban_hang });
    check(
      'receivable list honours the invoice filter',
      receivablesAfterInvoice.status === 200 && Array.isArray(receivablesAfterInvoice.body.data) && typeof receivablesAfterInvoice.body.meta.total === 'number',
      receivablesAfterInvoice.body && receivablesAfterInvoice.body.meta
    );
    // Known PH1 gap (preserved, not fixed): issuing an invoice writes
    // `hoa_don_ban_hang` only - no code path in PH1 inserted into `cong_no`
    // outside the seed script, so the receivable ledger is not posted to on
    // issuance. Recorded in docs/ph1-remediation/KNOWN_GAPS.md for the
    // Integration Owner; posting to AR belongs to Finance, not to this module.
    console.log(`   note - invoice ${invoice.ma_hoa_don} posted ${receivablesAfterInvoice.body.meta.total} cong_no row(s) (PH1 parity: no AR posting outside seed data)`);
    const aging = await call(baseUrl, 'GET', '/api/v1/sales/cong-no/aging', { token: TOKENS.ke_toan });
    const agingBuckets = aging.body && aging.body.data;
    const bucketSum = agingBuckets
      ? ['current', 'days1To30', 'days31To60', 'days61To90', 'daysOver90'].reduce((sum, key) => sum + Number(agingBuckets[key].totalAmount), 0)
      : -1;
    check(
      'aging buckets are exhaustive over open receivables',
      Boolean(agingBuckets) && Math.abs(bucketSum - Number(agingBuckets.totalReceivables)) < 0.01,
      { bucketSum, total: agingBuckets && agingBuckets.totalReceivables }
    );
    const summaryAfterInvoice = await call(baseUrl, 'GET', '/api/v1/sales/cong-no/summary', { token: TOKENS.ban_hang });
    check(
      'receivable summary is consistent with the aging total',
      Boolean(summaryAfterInvoice.body) && Math.abs(Number(summaryAfterInvoice.body.data.totalOutstanding) - Number(agingBuckets.totalReceivables)) < 1,
      { summary: summaryAfterInvoice.body && summaryAfterInvoice.body.data, aging: agingBuckets && agingBuckets.totalReceivables }
    );

    console.log('== dashboard aggregates (role scoping) ==');
    const overviewAdmin = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/summary?period=month', { token: TOKENS.admin });
    check('admin summary -> 200 scope full', overviewAdmin.status === 200 && overviewAdmin.body.data.scope === 'full', overviewAdmin.body && overviewAdmin.body.data);
    check(
      'full scope carries sales and finance metrics',
      Boolean(overviewAdmin.body && overviewAdmin.body.data.metrics.totalOrderValue !== undefined && overviewAdmin.body.data.metrics.openReceivable !== undefined),
      overviewAdmin.body && overviewAdmin.body.data && overviewAdmin.body.data.metrics
    );
    const overviewWarehouse = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/summary', { token: TOKENS.kho });
    check('kho summary -> 200 scope fulfillment', overviewWarehouse.status === 200 && overviewWarehouse.body.data.scope === 'fulfillment', overviewWarehouse.body && overviewWarehouse.body.data);
    check(
      'fulfillment scope hides money metrics',
      Boolean(overviewWarehouse.body && overviewWarehouse.body.data.metrics.openReceivable === undefined && overviewWarehouse.body.data.metrics.orderCount !== undefined),
      overviewWarehouse.body && overviewWarehouse.body.data && overviewWarehouse.body.data.metrics
    );
    const overviewAccounting = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/summary', { token: TOKENS.ke_toan });
    check(
      'accounting scope returns finance metrics only',
      overviewAccounting.status === 200 &&
        overviewAccounting.body.data.scope === 'financial' &&
        overviewAccounting.body.data.metrics.openReceivable !== undefined &&
        overviewAccounting.body.data.metrics.orderCount === undefined,
      overviewAccounting.body && overviewAccounting.body.data
    );
    const revenueWarehouse = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/revenue-chart', { token: TOKENS.kho });
    check('kho is denied the revenue chart -> 403', revenueWarehouse.status === 403, revenueWarehouse.status);
    const revenueAccounting = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/revenue-chart?period=year', { token: TOKENS.ke_toan });
    check(
      'accounting revenue chart -> 200 with series',
      revenueAccounting.status === 200 && Array.isArray(revenueAccounting.body.data.series) && typeof revenueAccounting.body.data.total === 'string',
      revenueAccounting.body && revenueAccounting.body.data
    );
    const topProducts = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/top-products?limit=5', { token: TOKENS.ban_hang });
    check(
      'top products are scaled strings (qty 3dp, value 2dp)',
      topProducts.status === 200 &&
        topProducts.body.data.items.every((item) => /^\d+\.\d{3}$/.test(item.quantity) && /^-?\d+\.\d{2}$/.test(item.totalValue)),
      topProducts.body && topProducts.body.data && topProducts.body.data.items
    );
    const orderStatus = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/order-status', { token: TOKENS.kho });
    check('fulfillment order-status allowed for kho -> 200', orderStatus.status === 200, orderStatus.status);
    const badPeriod = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/summary?period=decade', { token: TOKENS.admin });
    check('unknown period -> 422 naming period', badPeriod.status === 422 && badPeriod.body.details.some((d) => d.field === 'period'), badPeriod.body);
    const customWithoutDates = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/summary?period=custom', { token: TOKENS.admin });
    check('custom period without dates -> 422 naming fromDate', customWithoutDates.status === 422 && customWithoutDates.body.details.some((d) => d.field === 'fromDate'), customWithoutDates.body);
    const badLimit = await call(baseUrl, 'GET', '/api/v1/sales/tong-quan/summary?limit=51', { token: TOKENS.admin });
    check('limit above the maximum -> 422 naming limit', badLimit.status === 422 && badLimit.body.details.some((d) => d.field === 'limit'), badLimit.body);

    console.log('== Core / PH4 regression ==');
    const me = await call(baseUrl, 'GET', '/api/v1/auth/me', { token: TOKENS.admin });
    check('Core /api/v1/auth/me -> 200', me.status === 200, me.status);
    const warehouse = await call(baseUrl, 'GET', '/api/v1/ton-kho', { token: TOKENS.kho });
    check('PH4 /api/v1/ton-kho still reachable -> 200', warehouse.status === 200, warehouse.status);
    const modules = await call(baseUrl, 'GET', '/api/v1/modules');
    check('Core module catalog -> 200', modules.status === 200, modules.status);

    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) {
      console.log('failed checks:', failures.join(' | '));
    }
    return failed === 0 ? 0 : 1;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('\nSMOKE TEST CRASHED:', error);
    process.exit(2);
  });
