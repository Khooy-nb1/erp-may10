'use strict';

/**
 * PH1 Sales module - cross-module & fulfilment integration suite.
 *
 * Covers the integration contract the sales module is responsible for, end to
 * end through HTTP + the real database:
 *
 *   - selling flows use backend-generated business codes (`KH-` / `DBH-` / `GH-`
 *     / `HDBH-` / `PXK-` / `LSX-`), they are unique, and a code or database id
 *     crafted into a request body never becomes the stored value;
 *   - customer validation boundaries over the wire: name/address/city lengths,
 *     Vietnamese tax ids (including the duplicate guard) and phone numbers;
 *   - the customer picker's search contract: server-side search over name, code,
 *     phone and tax id, `hoat_dong` only, one page at a time;
 *   - a confirmed sales order opens production demand linked through
 *     `lenh_san_xuat.ma_don_ban_hang` (once - a retry does not duplicate it);
 *   - completing a delivery fulfils through PH4 in one transaction: stock is
 *     validated, a `giao_khach` issue note is written, `ton_kho` is deducted,
 *     `so_luong_giao` advances, and delivery+order land on `da_giao`;
 *   - the completion is idempotent (a repeat deducts nothing) and insufficient
 *     stock is refused with 409 while writing nothing;
 *   - issuing an invoice posts/refreshes its `phai_thu` `cong_no` row in the same
 *     transaction, exactly once per invoice.
 *
 * Run from `backend/`:
 *   node tests/test_ph1_fulfillment_integration.js
 *
 * Requires the database configured in `backend/.env`. The suite creates its own
 * fixtures (a stock item, a stock balance in warehouse 2 and a sellable product
 * linked to it) and removes every row it created at the end of the run.
 */

const app = require('../src/app');
const db = require('../src/config/database');
const { signToken } = require('../src/middlewares/auth');

const TOKENS = {
  admin: signToken(1),
  ban_hang: signToken(2),
  kho: signToken(5),
  ke_toan: signToken(6),
};

const MARKER = `[SMOKE-FULFILLMENT] ${new Date().toISOString()}`;

/** Warehouse 2 (KTP01) is where finished goods are held. */
const WAREHOUSE_ID = 2;
const PRODUCT_PRICE = 500000;
const STOCK_ON_HAND = 5;
const ORDER_QTY = 2;
const OVER_QTY = 4; // more than what is left after the first delivery

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok   - ${name}`);
  } else {
    failures.push(`${name}${detail === undefined ? '' : ` :: ${JSON.stringify(detail)}`}`);
    console.log(`  FAIL - ${name}${detail === undefined ? '' : ` :: ${JSON.stringify(detail)}`}`);
  }
}

function headers(token) {
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function call(baseUrl, method, path, { token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: headers(token),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    parsed = { raw: text };
  }
  return { status: response.status, body: parsed };
}

const isoDay = (offsetDays) =>
  new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);

const fieldError = (payload, field) =>
  Boolean(
    payload &&
      Array.isArray(payload.details) &&
      payload.details.some((detail) => detail.field === field)
  );

const errorCode = (payload) => (payload && payload.errorCode) || null;

async function main() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const ids = {
    stockItems: [],
    stockRows: [],
    products: [],
    customers: [],
    orders: [],
    deliveries: [],
    invoices: [],
  };

  const cleanedUp = [];

  const cleanup = async (label, sql, params) => {
    try {
      await db.query(sql, params);
      cleanedUp.push(label);
    } catch (error) {
      cleanedUp.push(`${label} FAILED: ${error.message}`);
    }
  };

  try {
    // ------------------------------------------------------------------
    // Fixtures: a stock item with a balance in warehouse 2 and a sellable
    // product that points at it (the link fulfilment resolves stock through).
    const stamp = Date.now();
    const stockItem = await db.query(
      `INSERT INTO vat_tu (ma_vat_tu, ten_vat_tu, loai_vat_tu, trang_thai, nguoi_tao)
       VALUES ($1, $2, 'vai_chinh', 'dang_su_dung', 1)
       RETURNING id, ma_vat_tu`,
      [`VT-SMOKE-${stamp}`, 'Vải kiểm thử giao khách']
    );
    const stockItemId = stockItem.rows[0].id;
    ids.stockItems.push(stockItemId);

    const stockRow = await db.query(
      `INSERT INTO ton_kho (ma_kho, ma_vat_tu, so_luong_ton, gia_tri_ton_kho, nguoi_cap_nhat)
       VALUES ($1, $2, $3, $4, 1)
       RETURNING id`,
      [WAREHOUSE_ID, stockItemId, STOCK_ON_HAND, STOCK_ON_HAND * PRODUCT_PRICE]
    );
    ids.stockRows.push(stockRow.rows[0].id);

    const product = await db.query(
      `INSERT INTO san_pham (ma_san_pham, ten_san_pham, gia_ban, trang_thai, ma_vat_tu_ton_kho, nguoi_tao)
       VALUES ($1, $2, $3, 'dang_ban', $4, 1)
       RETURNING id, ma_san_pham`,
      [`SP-SMOKE-${stamp}`, 'Sản phẩm kiểm thử giao khách', PRODUCT_PRICE, stockItemId]
    );
    const productId = product.rows[0].id;
    ids.products.push(productId);

    const stockOf = async () => {
      const result = await db.query(`SELECT so_luong_ton FROM ton_kho WHERE id = $1`, [ids.stockRows[0]]);
      return Number(result.rows[0].so_luong_ton);
    };

    console.log('== customer validation boundaries (HTTP) ==');
    const customerPayload = (overrides = {}) => ({
      ten_khach_hang: 'Khách hàng kiểm thử giao hàng',
      loai_khach_hang: 'to_chuc',
      ma_so_thue: `0100${String(stamp).slice(-6)}`,
      so_dien_thoai: '0912345678',
      email: 'smoke.fulfillment@may10.vn',
      dia_chi: 'Số 1 Mai Động',
      tinh_thanh_pho: 'Hà Nội',
      han_muc_cong_no: 0,
      so_ngay_cong_no: 30,
      ghi_chu: MARKER,
      ...overrides,
    });

    const nameTooShort = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', {
      token: TOKENS.ban_hang,
      body: customerPayload({ ten_khach_hang: 'A' }),
    });
    check(
      'customer name below the minimum -> 422 naming ten_khach_hang',
      nameTooShort.status === 422 && fieldError(nameTooShort.body, 'ten_khach_hang'),
      nameTooShort.body
    );
    const nameAtMinimum = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', {
      token: TOKENS.ban_hang,
      body: customerPayload({ ten_khach_hang: 'AB', ma_so_thue: undefined, so_dien_thoai: '0900000003' }),
    });
    check('customer name at the minimum (2 chars) accepted', nameAtMinimum.status === 201, nameAtMinimum.body);
    if (nameAtMinimum.status === 201) ids.customers.push(nameAtMinimum.body.data.id);

    const shortAddress = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', {
      token: TOKENS.ban_hang,
      body: customerPayload({ dia_chi: '1234' }),
    });
    check(
      'customer address below 5 chars -> 422 naming dia_chi',
      shortAddress.status === 422 && fieldError(shortAddress.body, 'dia_chi'),
      shortAddress.body
    );
    const shortCity = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', {
      token: TOKENS.ban_hang,
      body: customerPayload({ tinh_thanh_pho: 'H' }),
    });
    check(
      'city below 2 chars -> 422 naming tinh_thanh_pho',
      shortCity.status === 422 && fieldError(shortCity.body, 'tinh_thanh_pho'),
      shortCity.body
    );

    for (const badTaxCode of ['123', '0100109106-01', 'MST-000001', '01001091067']) {
      const badTax = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', {
        token: TOKENS.ban_hang,
        body: customerPayload({ ma_so_thue: badTaxCode }),
      });
      check(
        `tax id ${JSON.stringify(badTaxCode)} -> 422 naming ma_so_thue`,
        badTax.status === 422 && fieldError(badTax.body, 'ma_so_thue'),
        badTax.body
      );
    }

    for (const badPhone of ['091234567', '09123456789', '09a1234567', '(091) 2345678']) {
      const badPhoneRes = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', {
        token: TOKENS.ban_hang,
        body: customerPayload({ so_dien_thoai: badPhone }),
      });
      check(
        `phone ${JSON.stringify(badPhone)} -> 422 naming so_dien_thoai`,
        badPhoneRes.status === 422 && fieldError(badPhoneRes.body, 'so_dien_thoai'),
        badPhoneRes.body
      );
    }

    console.log('== customers: normalisation, duplicate tax id, search ==');
    const brachTaxCode = `${customerPayload().ma_so_thue}-001`;
    const created = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', {
      token: TOKENS.ban_hang,
      body: customerPayload({ ma_so_thue: brachTaxCode, so_dien_thoai: '+84 91 234-5678' }),
    });
    check('customer with a branch tax id and a spaced E.164 phone -> 201', created.status === 201, created.body);
    const customer = created.body && created.body.data;
    if (customer) ids.customers.push(customer.id);
    check(
      'generated customer code follows KH-<year>-<6 digits>',
      Boolean(customer && /^KH-\d{4}-\d{6}$/.test(customer.ma_khach_hang)),
      customer && customer.ma_khach_hang
    );
    check(
      'phone separators are stripped before storing',
      Boolean(customer && customer.so_dien_thoai === '+84912345678'),
      customer && customer.so_dien_thoai
    );
    check(
      'tax id is stored verbatim (branch suffix kept)',
      Boolean(customer && customer.ma_so_thue === brachTaxCode),
      customer && customer.ma_so_thue
    );

    const duplicateTax = await call(baseUrl, 'POST', '/api/v1/sales/khach-hang', {
      token: TOKENS.ban_hang,
      body: customerPayload({ ma_so_thue: brachTaxCode, so_dien_thoai: '0900000004' }),
    });
    check(
      'duplicate tax id -> 409 CUSTOMER_TAX_CODE_EXISTS naming ma_so_thue',
      duplicateTax.status === 409 &&
        errorCode(duplicateTax.body) === 'CUSTOMER_TAX_CODE_EXISTS' &&
        fieldError(duplicateTax.body, 'ma_so_thue'),
      duplicateTax.body
    );
    const taxRows = await db.query(`SELECT COUNT(*)::int AS n FROM khach_hang WHERE ma_so_thue = $1`, [brachTaxCode]);
    check('duplicate tax id wrote no second row', taxRows.rows[0].n === 1, taxRows.rows[0]);

    const searchByTax = await call(
      baseUrl,
      'GET',
      `/api/v1/sales/khach-hang?search=${encodeURIComponent(brachTaxCode)}&pageSize=20`,
      { token: TOKENS.ban_hang }
    );
    check(
      'customer search finds the row by tax id',
      searchByTax.status === 200 &&
        searchByTax.body.data.some((row) => row.id === customer.id) &&
        searchByTax.body.data.every((row) => `${row.ma_khach_hang} ${row.ten_khach_hang} ${row.so_dien_thoai} ${row.ma_so_thue}`.includes(brachTaxCode)),
      searchByTax.body && searchByTax.body.data
    );
    const searchByPhone = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang?search=84912345678', {
      token: TOKENS.ban_hang,
    });
    check(
      'customer search finds the row by phone',
      searchByPhone.status === 200 && searchByPhone.body.data.some((row) => row.id === customer.id),
      searchByPhone.body && searchByPhone.body.data
    );
    const searchByName = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang?search=kiểm thử giao hàng', {
      token: TOKENS.ban_hang,
    });
    check(
      'customer search finds the row by name',
      searchByName.status === 200 && searchByName.body.data.some((row) => row.id === customer.id),
      searchByName.body && searchByName.body.data
    );
    const activeOnly = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang?trang_thai=hoat_dong&pageSize=100', {
      token: TOKENS.ban_hang,
    });
    check(
      'the picker filter (hoat_dong) returns active customers only',
      activeOnly.status === 200 && activeOnly.body.data.every((row) => row.trang_thai === 'hoat_dong'),
      activeOnly.body && activeOnly.body.data.map((row) => row.trang_thai)
    );
    const firstPage = await call(baseUrl, 'GET', '/api/v1/sales/khach-hang?page=1&pageSize=1', {
      token: TOKENS.ban_hang,
    });
    check(
      'customer list is paged server-side (pageSize=1 -> one row, more pages)',
      firstPage.status === 200 &&
        firstPage.body.data.length === 1 &&
        firstPage.body.meta.total > 1 &&
        firstPage.body.meta.totalPages === firstPage.body.meta.total,
      firstPage.body && firstPage.body.meta
    );

    console.log('== orders: generated codes, no client-supplied ids, production hand-off ==');
    const orderPayload = (overrides = {}) => ({
      ma_khach_hang: customer.id,
      ngay_dat_hang: isoDay(0),
      ngay_giao_hang_yc: isoDay(3),
      dia_chi_giao_hang: 'Số 1 Mai Động, Hà Nội',
      ghi_chu: MARKER,
      lines: [{ ma_san_pham: productId, so_luong: ORDER_QTY, ty_le_giam_gia: 0 }],
      ...overrides,
    });

    const shortOrderAddress = await call(baseUrl, 'POST', '/api/v1/sales/don-hang', {
      token: TOKENS.ban_hang,
      body: orderPayload({ dia_chi_giao_hang: '1234' }),
    });
    check(
      'order delivery address below 5 chars -> 422 naming dia_chi_giao_hang',
      shortOrderAddress.status === 422 && fieldError(shortOrderAddress.body, 'dia_chi_giao_hang'),
      shortOrderAddress.body
    );

    const craftedCode = 'DBH-2000-000001';
    const orderCreated = await call(baseUrl, 'POST', '/api/v1/sales/don-hang', {
      token: TOKENS.ban_hang,
      body: orderPayload({
        ma_don_ban: craftedCode,
        id: 999999,
        trang_thai: 'da_giao',
        tong_tien_hang: 1,
        tong_thanh_toan: 1,
      }),
    });
    check('order created -> 201', orderCreated.status === 201, orderCreated.body);
    const order = orderCreated.body && orderCreated.body.data;
    if (order) ids.orders.push(order.id);
    check(
      'a code crafted into the body is ignored (backend generates DBH-<year>-<6 digits>)',
      Boolean(order && /^DBH-\d{4}-\d{6}$/.test(order.ma_don_ban) && order.ma_don_ban !== craftedCode),
      order && order.ma_don_ban
    );
    check(
      'a database id crafted into the body is ignored',
      Boolean(order && order.id !== 999999),
      order && order.id
    );
    check(
      'a status crafted into the body is ignored (new orders start cho_xac_nhan)',
      Boolean(order && order.trang_thai === 'cho_xac_nhan'),
      order && order.trang_thai
    );
    check(
      'totals crafted into the body are ignored (server prices the lines)',
      Boolean(order && Number(order.tong_tien_hang) === ORDER_QTY * PRODUCT_PRICE && Number(order.tong_thanh_toan) !== 1),
      order && { gross: order.tong_tien_hang, payable: order.tong_thanh_toan }
    );

    const secondOrderCreated = await call(baseUrl, 'POST', '/api/v1/sales/don-hang', {
      token: TOKENS.ban_hang,
      body: orderPayload({ lines: [{ ma_san_pham: productId, so_luong: OVER_QTY, ty_le_giam_gia: 0 }] }),
    });
    const secondOrder = secondOrderCreated.body && secondOrderCreated.body.data;
    if (secondOrder) ids.orders.push(secondOrder.id);
    check(
      'generated order codes are unique across orders',
      secondOrderCreated.status === 201 && secondOrder.ma_don_ban !== order.ma_don_ban,
      { first: order && order.ma_don_ban, second: secondOrder && secondOrder.ma_don_ban }
    );

    const confirmed = await call(baseUrl, 'POST', `/api/v1/sales/don-hang/${order.id}/confirm`, {
      token: TOKENS.ban_hang,
      body: {},
    });
    check(
      'confirming the order -> 200 da_xac_nhan',
      confirmed.status === 200 && confirmed.body.data.trang_thai === 'da_xac_nhan',
      confirmed.body && confirmed.body.data
    );
    const productionOrders = await db.query(
      `SELECT id, ma_lenh_san_xuat, ma_don_ban_hang, ma_san_pham, so_luong_yeu_cau, trang_thai
       FROM lenh_san_xuat WHERE ma_don_ban_hang = $1`,
      [order.id]
    );
    check(
      'confirming opens one production order per line, linked by ma_don_ban_hang',
      productionOrders.rows.length === 1 &&
        Number(productionOrders.rows[0].ma_don_ban_hang) === Number(order.id) &&
        Number(productionOrders.rows[0].ma_san_pham) === Number(productId) &&
        Number(productionOrders.rows[0].so_luong_yeu_cau) === ORDER_QTY &&
        productionOrders.rows[0].trang_thai === 'chua_bat_dau',
      productionOrders.rows
    );
    check(
      'generated production code follows LSX-<year>-<6 digits>',
      /^LSX-\d{4}-\d{6}$/.test(productionOrders.rows[0] ? productionOrders.rows[0].ma_lenh_san_xuat : ''),
      productionOrders.rows[0] && productionOrders.rows[0].ma_lenh_san_xuat
    );

    const reConfirmed = await call(baseUrl, 'POST', `/api/v1/sales/don-hang/${order.id}/confirm`, {
      token: TOKENS.ban_hang,
      body: {},
    });
    check(
      'confirming twice -> 422 ORDER_INVALID_STATE',
      reConfirmed.status === 422 && errorCode(reConfirmed.body) === 'ORDER_INVALID_STATE',
      reConfirmed.body
    );
    const productionAfterRetry = await db.query(`SELECT COUNT(*)::int AS n FROM lenh_san_xuat WHERE ma_don_ban_hang = $1`, [order.id]);
    check('the production hand-off is not duplicated on retry', productionAfterRetry.rows[0].n === 1, productionAfterRetry.rows[0]);

    const statusFiltered = await call(
      baseUrl,
      'GET',
      '/api/v1/sales/don-hang?trang_thai_in=da_xac_nhan,dang_san_xuat&pageSize=100',
      { token: TOKENS.kho }
    );
    check(
      'order list filters by a status list (the picker contract)',
      statusFiltered.status === 200 &&
        statusFiltered.body.data.some((row) => row.id === order.id) &&
        statusFiltered.body.data.every((row) => ['da_xac_nhan', 'dang_san_xuat'].includes(row.trang_thai)),
      statusFiltered.body && statusFiltered.body.data.map((row) => row.trang_thai)
    );
    const badStatusFilter = await call(baseUrl, 'GET', '/api/v1/sales/don-hang?trang_thai_in=da_xac_nhan,khong_ton_tai', {
      token: TOKENS.kho,
    });
    check(
      'an unknown status in the list -> 422 naming trang_thai_in',
      badStatusFilter.status === 422 && fieldError(badStatusFilter.body, 'trang_thai_in'),
      badStatusFilter.body
    );

    // ------------------------------------------------------------------
    console.log('== delivery completion: warehouse fulfilment (transactional) ==');
    const deliveryPayload = (orderId, overrides = {}) => ({
      ma_don_ban_hang: orderId,
      ma_kho: WAREHOUSE_ID,
      ngay_giao: isoDay(1),
      ten_nguoi_nhan: 'Nguyễn Văn Nhận',
      dia_chi_giao: 'Số 1 Mai Động, Hà Nội',
      ghi_chu: MARKER,
      ...overrides,
    });

    const stockBeforeDelivery = await stockOf();
    const craftedDeliveryCode = 'GH-2000-000001';
    const deliveryCreated = await call(baseUrl, 'POST', '/api/v1/sales/giao-hang', {
      token: TOKENS.kho,
      body: deliveryPayload(order.id, { ma_giao_hang: craftedDeliveryCode, id: 999999 }),
    });
    check('delivery created -> 201', deliveryCreated.status === 201, deliveryCreated.body);
    const delivery = deliveryCreated.body && deliveryCreated.body.data;
    if (delivery) ids.deliveries.push(delivery.id);
    check(
      'delivery code is generated by the backend (GH-<year>-<6 digits>) and ignores a crafted one',
      Boolean(
        delivery &&
          /^GH-\d{4}-\d{6}$/.test(delivery.ma_giao_hang) &&
          delivery.ma_giao_hang !== craftedDeliveryCode &&
          delivery.id !== 999999
      ),
      delivery && { code: delivery.ma_giao_hang, id: delivery.id }
    );

    await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${delivery.id}/start`, { token: TOKENS.kho, body: {} });
    const completed = await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${delivery.id}/complete`, {
      token: TOKENS.kho,
      body: {},
    });
    check(
      'completing the delivery -> 200 da_giao',
      completed.status === 200 && completed.body.data.trang_thai === 'da_giao',
      completed.body && completed.body.data
    );

    const issueNote = await db.query(
      `SELECT id, ma_phieu_xuat, loai_xuat, ma_don_ban_hang, ma_kho_xuat, tong_gia_tri_xuat, trang_thai
       FROM phieu_xuat_kho WHERE ma_don_ban_hang = $1`,
      [order.id]
    );
    check(
      'fulfilment wrote one giao_khach issue note for the order',
      issueNote.rows.length === 1 &&
        issueNote.rows[0].loai_xuat === 'giao_khach' &&
        Number(issueNote.rows[0].ma_kho_xuat) === WAREHOUSE_ID &&
        Number(issueNote.rows[0].ma_don_ban_hang) === Number(order.id),
      issueNote.rows
    );
    check(
      'issue-note code follows PXK-<year>-<6 digits>',
      /^PXK-\d{4}-\d{6}$/.test(issueNote.rows[0] ? issueNote.rows[0].ma_phieu_xuat : ''),
      issueNote.rows[0] && issueNote.rows[0].ma_phieu_xuat
    );
    check(
      'the completion response reports the issue note it produced',
      Boolean(
        completed.body.data.fulfillment &&
          completed.body.data.fulfillment.ma_phieu_xuat === issueNote.rows[0].ma_phieu_xuat &&
          Number(completed.body.data.fulfillment.tong_gia_tri_xuat) === ORDER_QTY * PRODUCT_PRICE
      ),
      completed.body.data.fulfillment
    );

    const issueLines = await db.query(
      `SELECT ma_vat_tu, so_luong_xuat, don_gia_xuat FROM chi_tiet_phieu_xuat WHERE ma_phieu_xuat_kho = $1`,
      [issueNote.rows[0].id]
    );
    check(
      'the issue note draws the ordered quantity of the linked stock item',
      issueLines.rows.length === 1 &&
        Number(issueLines.rows[0].ma_vat_tu) === Number(stockItemId) &&
        Number(issueLines.rows[0].so_luong_xuat) === ORDER_QTY,
      issueLines.rows
    );

    const stockAfterDelivery = await stockOf();
    check(
      'stock is deducted by the delivered quantity',
      stockAfterDelivery === stockBeforeDelivery - ORDER_QTY,
      { before: stockBeforeDelivery, after: stockAfterDelivery }
    );

    const orderLines = await db.query(
      `SELECT so_luong, so_luong_giao, trang_thai FROM chi_tiet_don_ban_hang WHERE ma_don_ban_hang = $1`,
      [order.id]
    );
    check(
      'so_luong_giao advances and the line reads da_giao_du',
      orderLines.rows.length === 1 &&
        Number(orderLines.rows[0].so_luong_giao) === ORDER_QTY &&
        orderLines.rows[0].trang_thai === 'da_giao_du',
      orderLines.rows
    );

    const orderAfterDelivery = await db.query(`SELECT trang_thai, ngay_giao_thuc_te FROM don_ban_hang WHERE id = $1`, [order.id]);
    check(
      'the order moves to da_giao with the actual delivery date',
      orderAfterDelivery.rows[0].trang_thai === 'da_giao' && orderAfterDelivery.rows[0].ngay_giao_thuc_te !== null,
      orderAfterDelivery.rows[0]
    );

    console.log('== idempotency ==');
    const recompleted = await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${delivery.id}/complete`, {
      token: TOKENS.kho,
      body: {},
    });
    check(
      'completing an already completed delivery -> 200 da_giao (no-op)',
      recompleted.status === 200 && recompleted.body.data.trang_thai === 'da_giao',
      recompleted.body && recompleted.body.data
    );
    check(
      'the no-op does not report a second fulfilment',
      Boolean(recompleted.body.data && recompleted.body.data.fulfillment === undefined),
      recompleted.body && recompleted.body.data
    );
    const stockAfterRepeat = await stockOf();
    check('the repeat deducts no further stock', stockAfterRepeat === stockAfterDelivery, { after: stockAfterRepeat });
    const issueNotesAfterRepeat = await db.query(`SELECT COUNT(*)::int AS n FROM phieu_xuat_kho WHERE ma_don_ban_hang = $1`, [order.id]);
    const issueLinesAfterRepeat = await db.query(
      `SELECT COALESCE(SUM(so_luong_xuat), 0)::numeric AS qty FROM chi_tiet_phieu_xuat WHERE ma_phieu_xuat_kho = $1`,
      [issueNote.rows[0].id]
    );
    check(
      'the repeat writes no second issue note and no extra issue line',
      issueNotesAfterRepeat.rows[0].n === 1 && Number(issueLinesAfterRepeat.rows[0].qty) === ORDER_QTY,
      { notes: issueNotesAfterRepeat.rows[0], issued: issueLinesAfterRepeat.rows[0] }
    );
    const linesAfterRepeat = await db.query(`SELECT so_luong_giao FROM chi_tiet_don_ban_hang WHERE ma_don_ban_hang = $1`, [order.id]);
    check(
      'the repeat does not advance so_luong_giao twice',
      Number(linesAfterRepeat.rows[0].so_luong_giao) === ORDER_QTY,
      linesAfterRepeat.rows[0]
    );

    console.log('== insufficient stock ==');
    await call(baseUrl, 'POST', `/api/v1/sales/don-hang/${secondOrder.id}/confirm`, { token: TOKENS.ban_hang, body: {} });
    const secondDeliveryCreated = await call(baseUrl, 'POST', '/api/v1/sales/giao-hang', {
      token: TOKENS.kho,
      body: deliveryPayload(secondOrder.id),
    });
    const secondDelivery = secondDeliveryCreated.body && secondDeliveryCreated.body.data;
    if (secondDelivery) ids.deliveries.push(secondDelivery.id);
    check(
      'a second delivery gets its own generated code',
      secondDeliveryCreated.status === 201 && secondDelivery.ma_giao_hang !== delivery.ma_giao_hang,
      { first: delivery.ma_giao_hang, second: secondDelivery && secondDelivery.ma_giao_hang }
    );
    await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${secondDelivery.id}/start`, { token: TOKENS.kho, body: {} });

    const stockBeforeShortage = await stockOf();
    const overDelivery = await call(baseUrl, 'POST', `/api/v1/sales/giao-hang/${secondDelivery.id}/complete`, {
      token: TOKENS.kho,
      body: {},
    });
    check(
      'completing without enough stock -> 409 INSUFFICIENT_STOCK',
      overDelivery.status === 409 && errorCode(overDelivery.body) === 'INSUFFICIENT_STOCK',
      overDelivery.body
    );
    const stockAfterShortage = await stockOf();
    check(
      'the refused completion deducts nothing',
      stockAfterShortage === stockBeforeShortage,
      { before: stockBeforeShortage, after: stockAfterShortage }
    );
    const shortageWrites = await db.query(
      `SELECT (SELECT COUNT(*)::int FROM phieu_xuat_kho WHERE ma_don_ban_hang = $1) AS notes,
              (SELECT COALESCE(SUM(so_luong_giao), 0)::numeric FROM chi_tiet_don_ban_hang WHERE ma_don_ban_hang = $1) AS delivered`,
      [secondOrder.id]
    );
    check(
      'the refused completion writes no issue note and no delivered quantity',
      shortageWrites.rows[0].notes === 0 && Number(shortageWrites.rows[0].delivered) === 0,
      shortageWrites.rows[0]
    );
    const secondDeliveryState = await db.query(`SELECT trang_thai FROM giao_hang WHERE id = $1`, [secondDelivery.id]);
    const secondOrderState = await db.query(`SELECT trang_thai FROM don_ban_hang WHERE id = $1`, [secondOrder.id]);
    check(
      'the refused completion leaves the delivery dang_giao and the order da_xac_nhan',
      secondDeliveryState.rows[0].trang_thai === 'dang_giao' && secondOrderState.rows[0].trang_thai === 'da_xac_nhan',
      { delivery: secondDeliveryState.rows[0], order: secondOrderState.rows[0] }
    );

    console.log('== invoice -> cong_no (phai_thu) ==');
    const invoiceCreated = await call(baseUrl, 'POST', '/api/v1/sales/hoa-don', {
      token: TOKENS.ke_toan,
      body: { ma_don_ban_hang: order.id, ngay_xuat_hoa_don: isoDay(0), so_tien_da_thu: 0, ghi_chu: MARKER },
    });
    check('invoice created -> 201', invoiceCreated.status === 201, invoiceCreated.body);
    const invoice = invoiceCreated.body && invoiceCreated.body.data;
    if (invoice) ids.invoices.push(invoice.id);
    check(
      'invoice code follows HDBH-<year>-<6 digits>',
      Boolean(invoice && /^HDBH-\d{4}-\d{6}$/.test(invoice.ma_hoa_don)),
      invoice && invoice.ma_hoa_don
    );

    const receivable = await db.query(
      `SELECT id, loai_cong_no, ma_khach_hang, ma_hoa_don, bang_hoa_don, so_tien_phat_sinh,
              so_tien_da_thanh_toan, so_tien_con_lai, ngay_dao_han, trang_thai
       FROM cong_no WHERE bang_hoa_don = 'hoa_don_ban_hang' AND ma_hoa_don = $1`,
      [invoice.id]
    );
    check(
      'the invoice owns exactly one phai_thu cong_no row',
      receivable.rows.length === 1 && receivable.rows[0].loai_cong_no === 'phai_thu',
      receivable.rows
    );
    const receivableRow = receivable.rows[0];
    check(
      'the receivable mirrors the invoice (customer, amount, outstanding, due date)',
      Boolean(
        receivableRow &&
          Number(receivableRow.ma_khach_hang) === Number(customer.id) &&
          Number(receivableRow.so_tien_phat_sinh) === Number(invoice.tong_tien_sau_thue) &&
          Number(receivableRow.so_tien_da_thanh_toan) === 0 &&
          Number(receivableRow.so_tien_con_lai) === Number(invoice.tong_tien_sau_thue) &&
          new Date(receivableRow.ngay_dao_han).getTime() === new Date(invoice.ngay_dao_han).getTime()
      ),
      receivableRow
    );
    check(
      'an unpaid receivable reads chua_thanh_toan',
      receivableRow && receivableRow.trang_thai === 'chua_thanh_toan',
      receivableRow && receivableRow.trang_thai
    );

    const duplicateInvoice = await call(baseUrl, 'POST', '/api/v1/sales/hoa-don', {
      token: TOKENS.ke_toan,
      body: { ma_don_ban_hang: order.id, ngay_xuat_hoa_don: isoDay(0), so_tien_da_thu: 0 },
    });
    check(
      'a second invoice for the same order -> 409 INVOICE_ALREADY_EXISTS',
      duplicateInvoice.status === 409 && errorCode(duplicateInvoice.body) === 'INVOICE_ALREADY_EXISTS',
      duplicateInvoice.body
    );
    const receivablesAfterDuplicate = await db.query(
      `SELECT COUNT(*)::int AS n FROM cong_no WHERE bang_hoa_don = 'hoa_don_ban_hang' AND ma_hoa_don = $1`,
      [invoice.id]
    );
    check(
      'the refused invoice adds no second receivable',
      receivablesAfterDuplicate.rows[0].n === 1,
      receivablesAfterDuplicate.rows[0]
    );

    const partialInvoice = await call(baseUrl, 'POST', '/api/v1/sales/hoa-don', {
      token: TOKENS.ke_toan,
      body: { ma_don_ban_hang: secondOrder.id, ngay_xuat_hoa_don: isoDay(0), so_tien_da_thu: 100000, ghi_chu: MARKER },
    });
    const partial = partialInvoice.body && partialInvoice.body.data;
    if (partial) ids.invoices.push(partial.id);
    const partialReceivable = await db.query(
      `SELECT so_tien_phat_sinh, so_tien_da_thanh_toan, so_tien_con_lai, trang_thai
       FROM cong_no WHERE bang_hoa_don = 'hoa_don_ban_hang' AND ma_hoa_don = $1`,
      [partial.id]
    );
    check(
      'a part-paid invoice reads mot_phan with the reduced outstanding',
      partialReceivable.rows.length === 1 &&
        Number(partialReceivable.rows[0].so_tien_da_thanh_toan) === 100000 &&
        Number(partialReceivable.rows[0].so_tien_con_lai) ===
          Number(partialReceivable.rows[0].so_tien_phat_sinh) - 100000 &&
        partialReceivable.rows[0].trang_thai === 'mot_phan',
      partialReceivable.rows[0]
    );
    const generatedInvoices = [invoice.ma_hoa_don, partial.ma_hoa_don];
    check(
      'generated invoice codes are unique',
      generatedInvoices[0] !== generatedInvoices[1],
      generatedInvoices
    );

    const receivablesApi = await call(baseUrl, 'GET', `/api/v1/sales/cong-no?ma_hoa_don=${invoice.id}`, {
      token: TOKENS.ban_hang,
    });
    check(
      'the receivable is visible through the receivables API',
      receivablesApi.status === 200 &&
        receivablesApi.body.meta.total >= 1 &&
        receivablesApi.body.data.every((row) => row.loai_cong_no === 'phai_thu'),
      receivablesApi.body && receivablesApi.body.meta
    );
  } finally {
    server.close();

    // ------------------------------------------------------------------
    // Fixture teardown, children first: every row this suite created goes away.
    if (ids.orders.length) {
      await cleanup(
        'delete issue lines',
        `DELETE FROM chi_tiet_phieu_xuat
         WHERE ma_phieu_xuat_kho IN (SELECT id FROM phieu_xuat_kho WHERE ma_don_ban_hang = ANY($1::bigint[]))`,
        [ids.orders]
      );
      await cleanup('delete issue notes', `DELETE FROM phieu_xuat_kho WHERE ma_don_ban_hang = ANY($1::bigint[])`, [ids.orders]);
      await cleanup('delete production orders', `DELETE FROM lenh_san_xuat WHERE ma_don_ban_hang = ANY($1::bigint[])`, [ids.orders]);
    }
    if (ids.customers.length) {
      await cleanup('delete receivables', `DELETE FROM cong_no WHERE ma_khach_hang = ANY($1::bigint[])`, [ids.customers]);
    }
    if (ids.invoices.length) await cleanup('delete invoices', `DELETE FROM hoa_don_ban_hang WHERE id = ANY($1::bigint[])`, [ids.invoices]);
    if (ids.deliveries.length) await cleanup('delete deliveries', `DELETE FROM giao_hang WHERE id = ANY($1::bigint[])`, [ids.deliveries]);
    if (ids.orders.length) {
      await cleanup('delete order lines', `DELETE FROM chi_tiet_don_ban_hang WHERE ma_don_ban_hang = ANY($1::bigint[])`, [ids.orders]);
      await cleanup('delete orders', `DELETE FROM don_ban_hang WHERE id = ANY($1::bigint[])`, [ids.orders]);
    }
    if (ids.customers.length) await cleanup('delete customers', `DELETE FROM khach_hang WHERE id = ANY($1::bigint[])`, [ids.customers]);
    if (ids.stockRows.length) await cleanup('delete stock balances', `DELETE FROM ton_kho WHERE id = ANY($1::bigint[])`, [ids.stockRows]);
    if (ids.products.length) await cleanup('delete products', `DELETE FROM san_pham WHERE id = ANY($1::bigint[])`, [ids.products]);
    if (ids.stockItems.length) await cleanup('delete stock items', `DELETE FROM vat_tu WHERE id = ANY($1::bigint[])`, [ids.stockItems]);

    check(
      'cleanup finished without errors (no test rows left behind)',
      cleanedUp.every((entry) => !entry.includes('FAILED')),
      cleanedUp.filter((entry) => entry.includes('FAILED'))
    );

    await db.pool.end();
  }

  console.log('================================================================');
  console.log(`PH1 FULFILLMENT INTEGRATION: ${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.log(`Failures: ${failures.join(' | ')}`);
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error('Fulfillment integration suite aborted:', error);
  try {
    await db.pool.end();
  } catch (closeError) {
    /* ignore */
  }
  process.exitCode = 1;
});
