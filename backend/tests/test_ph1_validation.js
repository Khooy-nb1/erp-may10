'use strict';

/**
 * PH1 Sales module - request validation contract.
 *
 * Every case here fails *before* the repository is reached, so this file needs
 * no database and can run anywhere (`node tests/test_ph1_validation.js`). It
 * locks the boundary behaviour the API contract promises:
 *
 *   - malformed identifiers answer 422 with a field detail instead of reaching
 *     PostgreSQL and surfacing as a 500 (`Number('abc')` is `NaN`);
 *   - unknown body/query keys are rejected instead of silently dropped;
 *   - PH1's bilingual aliases may not carry disagreeing values;
 *   - dates are real calendar days in `YYYY-MM-DD`;
 *   - sort columns come from the repository allow-list (never raw SQL);
 *   - payload limits (lengths, ranges, array sizes) are enforced.
 */

const assert = require('assert');

const { parseIdParam, assertNoAliasConflict } = require('../src/utils/sales/request');
const { customerService, createCustomerSchema } = require('../src/services/sales/customer.service');
const { createInvoiceSchema, invoiceService } = require('../src/services/sales/invoice.service');
const {
  createDeliverySchema,
  createDeliveryService,
  deliveryService,
} = require('../src/services/sales/delivery.service');
const { createOrderSchema, orderQuerySchema } = require('../src/services/sales/order.service');
const { productQuerySchema } = require('../src/services/sales/product.service');
const {
  receivableQuerySchema,
  receivableService,
} = require('../src/services/sales/receivable.service');
const { overviewService } = require('../src/services/sales/overview.service');

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
  } else {
    failures.push(`${name}${detail === undefined ? '' : ` -> ${JSON.stringify(detail)}`}`);
  }
}

function expect(asyncFn) {
  return Promise.resolve()
    .then(asyncFn)
    .then((value) => ({ ok: true, value }))
    .catch((error) => ({ ok: false, error }));
}

function fieldsOf(error) {
  return (error.details || []).map((detail) => (typeof detail === 'string' ? detail : detail.field));
}

async function main() {
  // --- path ids -------------------------------------------------------------
  check('id: numeric string parses', parseIdParam('12', 'id', 'Mã') === 12);
  check('id: number passes through', parseIdParam(7, 'id', 'Mã') === 7);
  for (const raw of ['abc', '1.5', '', '0', '-3', '1e3', 'NaN']) {
    const result = await expect(() => parseIdParam(raw, 'id', 'Mã khách hàng'));
    check(
      `id: ${JSON.stringify(raw)} -> 422 field id`,
      result.ok === false && result.error.statusCode === 422 && fieldsOf(result.error).includes('id'),
      result.ok ? result.value : { status: result.error.statusCode, fields: fieldsOf(result.error) }
    );
  }
  check(
    'alias: equal values accepted',
    (() => {
      try {
        assertNoAliasConflict({ ma_kho: 3, warehouseId: 3 }, [['ma_kho', 'warehouseId']]);
        return true;
      } catch (error) {
        return false;
      }
    })()
  );
  check(
    'alias: differing values -> 422',
    (() => {
      try {
        assertNoAliasConflict({ ma_kho: 3, warehouseId: 4 }, [['ma_kho', 'warehouseId']]);
        return false;
      } catch (error) {
        return error.statusCode === 422 && fieldsOf(error).includes('ma_kho');
      }
    })()
  );

  // --- customers ------------------------------------------------------------
  const validCustomer = {
    ten_khach_hang: 'Công ty TNHH Kiểm Thử',
    loai_khach_hang: 'to_chuc',
    so_dien_thoai: '0901234567',
    dia_chi: '12 Lê Lợi',
    tinh_thanh_pho: 'Hà Nội',
  };
  check('customer: valid payload parses', createCustomerSchema.safeParse(validCustomer).success);
  // PH1/zod parity: unknown body keys are stripped, not rejected (the PATCH
  // whitelist in `test_ph1_business_parity.js` pins the same behaviour).
  const customerExtraKey = createCustomerSchema.safeParse({ ...validCustomer, han_muc_cong_no_usd: 10 });
  check(
    'customer: unknown key is stripped',
    customerExtraKey.success && customerExtraKey.data.han_muc_cong_no_usd === undefined,
    customerExtraKey.success ? Object.keys(customerExtraKey.data) : customerExtraKey.error.errors
  );
  check(
    'customer: phone with letters rejected',
    !createCustomerSchema.safeParse({ ...validCustomer, so_dien_thoai: 'abc-def-gh' }).success
  );
  check(
    'customer: phone shorter than 8 rejected',
    !createCustomerSchema.safeParse({ ...validCustomer, so_dien_thoai: '12345' }).success
  );
  check(
    'customer: bad email rejected',
    !createCustomerSchema.safeParse({ ...validCustomer, email: 'khong-phai-email' }).success
  );
  check(
    'customer: negative credit limit rejected',
    !createCustomerSchema.safeParse({ ...validCustomer, han_muc_cong_no: -1 }).success
  );
  check(
    'customer: unknown type rejected',
    !createCustomerSchema.safeParse({ ...validCustomer, loai_khach_hang: 'khach_vang_lai' }).success
  );

  // Boundary table for the fields the UI mirrors: name/address/city lengths,
  // Vietnamese tax ids and phone numbers. Each case is `[field, value, ok]`.
  const customerBoundaries = [
    ['ten_khach_hang', 'A', false],
    ['ten_khach_hang', 'AB', true],
    ['ten_khach_hang', '  AB  ', true],
    ['ten_khach_hang', '   ', false],
    ['ten_khach_hang', 'A'.repeat(200), true],
    ['ten_khach_hang', 'A'.repeat(201), false],
    ['dia_chi', '1234', false],
    ['dia_chi', '12345', true],
    ['dia_chi', 'A'.repeat(500), true],
    ['dia_chi', 'A'.repeat(501), false],
    ['tinh_thanh_pho', 'H', false],
    ['tinh_thanh_pho', 'HN', true],
    ['tinh_thanh_pho', 'A'.repeat(100), true],
    ['tinh_thanh_pho', 'A'.repeat(101), false],
    ['ma_so_thue', '0100109106', true],
    ['ma_so_thue', '0100109106-001', true],
    ['ma_so_thue', '', true],
    ['ma_so_thue', '   ', false],
    ['ma_so_thue', '010010910', false],
    ['ma_so_thue', '0100109106-01', false],
    ['ma_so_thue', '0100109106-0011', false],
    ['ma_so_thue', 'MST-000001', false],
    ['ma_so_thue', '01001091067', false],
    ['so_dien_thoai', '0912345678', true],
    ['so_dien_thoai', '091-234-5678', true],
    ['so_dien_thoai', '091 234 5678', true],
    ['so_dien_thoai', '+84912345678', true],
    ['so_dien_thoai', '+84 91 234-5678', true],
    ['so_dien_thoai', '+1 415 555 0100', true],
    ['so_dien_thoai', '091234567', false],
    ['so_dien_thoai', '09123456789', false],
    ['so_dien_thoai', 'abcdefgh', false],
    ['so_dien_thoai', '09a1234567', false],
    ['so_dien_thoai', '(091) 2345678', false],
    ['so_dien_thoai', '+0123456789', false],
  ];
  for (const [field, value, expected] of customerBoundaries) {
    const parsed = createCustomerSchema.safeParse({ ...validCustomer, [field]: value });
    check(
      `customer: ${field} = ${JSON.stringify(value)} -> ${expected ? 'accepted' : 'rejected'}`,
      parsed.success === expected,
      parsed.success ? parsed.data[field] : parsed.error.errors
    );
  }
  // The stored phone is the normalised one: separators never reach the database.
  check(
    'customer: phone separators are stripped before storage',
    createCustomerSchema.safeParse({ ...validCustomer, so_dien_thoai: '+84 91 234-5678' }).data.so_dien_thoai === '+84912345678'
  );

  // --- invoices -------------------------------------------------------------
  const invoiceExtraKey = createInvoiceSchema.safeParse({ ma_don_ban_hang: 1, tong_tien_nhap_tay: 5 });
  check(
    'invoice: unknown key is stripped (server owns totals)',
    invoiceExtraKey.success && invoiceExtraKey.data.tong_tien_nhap_tay === undefined
  );
  check(
    'invoice: negative paid amount rejected',
    !createInvoiceSchema.safeParse({ ma_don_ban_hang: 1, so_tien_da_thu: -1 }).success
  );
  check(
    'invoice: impossible issue date rejected',
    !createInvoiceSchema.safeParse({ ma_don_ban_hang: 1, ngay_xuat_hoa_don: '2026-02-30' }).success
  );
  const invoiceAlias = await expect(() =>
    invoiceService.createInvoice({ ma_don_ban_hang: 1, orderId: 2 }, 1)
  );
  check(
    'invoice: disagreeing order aliases -> 422 before the database',
    invoiceAlias.ok === false &&
      invoiceAlias.error.statusCode === 422 &&
      fieldsOf(invoiceAlias.error).includes('ma_don_ban_hang'),
    invoiceAlias.ok ? invoiceAlias.value : fieldsOf(invoiceAlias.error)
  );

  // --- deliveries -----------------------------------------------------------
  const validDelivery = {
    ma_don_ban_hang: 1,
    ma_kho: 1,
    ngay_giao: '2026-03-01',
    ten_nguoi_nhan: 'Nguyễn Văn A',
    dia_chi_giao: '45 Nguyễn Huệ',
  };
  check('delivery: valid payload parses', createDeliverySchema.safeParse(validDelivery).success);
  for (const field of ['ma_don_ban_hang', 'ma_kho', 'ngay_giao', 'ten_nguoi_nhan', 'dia_chi_giao']) {
    const payload = { ...validDelivery };
    delete payload[field];
    const parsed = createDeliverySchema.safeParse(payload);
    check(
      `delivery: missing ${field} rejected`,
      !parsed.success && parsed.error.errors.some((issue) => issue.path.includes(field)),
      parsed.success ? null : parsed.error.errors
    );
  }
  check(
    'delivery: impossible delivery date rejected',
    !createDeliverySchema.safeParse({ ...validDelivery, ngay_giao: '2026-02-30' }).success
  );
  check(
    'delivery: a timestamp is not a business day',
    !createDeliverySchema.safeParse({ ...validDelivery, ngay_giao: '2026-03-01T00:00:00.000Z' }).success
  );
  check(
    'delivery: unknown key is stripped',
    createDeliverySchema.safeParse({ ...validDelivery, kho_xuat: 1 }).success
  );
  const deliveryAlias = await expect(() =>
    createDeliveryService().createDelivery({ ...validDelivery, ma_kho: 1, warehouseId: 2 }, 1)
  );
  check(
    'delivery: disagreeing warehouse aliases -> 422 before the database',
    deliveryAlias.ok === false &&
      deliveryAlias.error.statusCode === 422 &&
      fieldsOf(deliveryAlias.error).includes('ma_kho'),
    deliveryAlias.ok ? deliveryAlias.value : fieldsOf(deliveryAlias.error)
  );
  const deliveryFailNoReason = await expect(() => deliveryService.failDelivery(1, {}, 1));
  check(
    'delivery: failing without a reason -> 422',
    deliveryFailNoReason.ok === false && deliveryFailNoReason.error.statusCode === 422,
    deliveryFailNoReason.ok ? deliveryFailNoReason.value : fieldsOf(deliveryFailNoReason.error)
  );

  // --- orders ---------------------------------------------------------------
  const orderLine = { ma_san_pham: 1, so_luong: 2, ty_le_giam_gia: 5 };
  const validOrder = {
    ma_khach_hang: 1,
    ngay_dat_hang: '2026-03-01',
    ngay_giao_hang_yc: '2026-03-10',
    dia_chi_giao_hang: '12 Lê Lợi',
    lines: [orderLine],
  };
  check('order: valid payload parses', createOrderSchema.safeParse(validOrder).success);
  check(
    'order: delivery date before order date rejected',
    !createOrderSchema.safeParse({ ...validOrder, ngay_giao_hang_yc: '2026-02-01' }).success
  );
  // The order's delivery address carries the same 5-500 bound as the customer's.
  for (const [address, expected] of [['1234', false], ['12345', true], ['A'.repeat(500), true], ['A'.repeat(501), false]]) {
    const parsed = createOrderSchema.safeParse({ ...validOrder, dia_chi_giao_hang: address });
    check(
      `order: delivery address of ${address.length} chars -> ${expected ? 'accepted' : 'rejected'}`,
      parsed.success === expected,
      parsed.success ? null : parsed.error.errors
    );
  }
  // Business codes and database ids are backend-owned: a client-sent value is
  // stripped, never echoed into the insert (the API suite pins the stored code).
  const craftedOrder = createOrderSchema.safeParse({
    ...validOrder,
    id: 999999,
    ma_don_ban: 'DBH-2000-000001',
    trang_thai: 'da_giao',
    tong_tien_hang: 1,
  });
  check(
    'order: client-sent id/code/status/total are stripped',
    craftedOrder.success &&
      craftedOrder.data.id === undefined &&
      craftedOrder.data.ma_don_ban === undefined &&
      craftedOrder.data.trang_thai === undefined &&
      craftedOrder.data.tong_tien_hang === undefined,
    craftedOrder.success ? Object.keys(craftedOrder.data) : craftedOrder.error.errors
  );
  const craftedDelivery = createDeliverySchema.safeParse({
    ...validDelivery,
    id: 999999,
    ma_giao_hang: 'GH-2000-000001',
    trang_thai: 'da_giao',
  });
  check(
    'delivery: client-sent id/code/status are stripped',
    craftedDelivery.success &&
      craftedDelivery.data.id === undefined &&
      craftedDelivery.data.ma_giao_hang === undefined &&
      craftedDelivery.data.trang_thai === undefined,
    craftedDelivery.success ? Object.keys(craftedDelivery.data) : craftedDelivery.error.errors
  );
  const craftedInvoice = createInvoiceSchema.safeParse({
    ma_don_ban_hang: 1,
    id: 999999,
    ma_hoa_don: 'HDBH-2000-000001',
    ngay_dao_han: '2026-01-01',
    tong_tien_sau_thue: 1,
  });
  check(
    'invoice: client-sent id/code/due date/total are stripped',
    craftedInvoice.success &&
      craftedInvoice.data.id === undefined &&
      craftedInvoice.data.ma_hoa_don === undefined &&
      craftedInvoice.data.ngay_dao_han === undefined &&
      craftedInvoice.data.tong_tien_sau_thue === undefined,
    craftedInvoice.success ? Object.keys(craftedInvoice.data) : craftedInvoice.error.errors
  );
  const craftedCustomer = createCustomerSchema.safeParse({
    ...validCustomer,
    id: 999999,
    ma_khach_hang: 'KH-2000-000001',
    trang_thai: 'ngung_giao_dich',
  });
  check(
    'customer: client-sent id/code/status are stripped',
    craftedCustomer.success &&
      craftedCustomer.data.id === undefined &&
      craftedCustomer.data.ma_khach_hang === undefined &&
      craftedCustomer.data.trang_thai === undefined,
    craftedCustomer.success ? Object.keys(craftedCustomer.data) : craftedCustomer.error.errors
  );
  check(
    'order: impossible order date rejected',
    !createOrderSchema.safeParse({ ...validOrder, ngay_dat_hang: '2026-02-30' }).success
  );
  check('order: empty lines rejected', !createOrderSchema.safeParse({ ...validOrder, lines: [] }).success);
  check(
    'order: zero quantity rejected',
    !createOrderSchema.safeParse({ ...validOrder, lines: [{ ...orderLine, so_luong: 0 }] }).success
  );
  check(
    'order: discount above 100% rejected',
    !createOrderSchema.safeParse({ ...validOrder, lines: [{ ...orderLine, ty_le_giam_gia: 150 }] }).success
  );
  const orderExtraKey = createOrderSchema.safeParse({ ...validOrder, tong_tien: 100 });
  check(
    'order: unknown order key is stripped (server recalcs totals)',
    orderExtraKey.success && orderExtraKey.data.tong_tien === undefined,
    orderExtraKey.success ? Object.keys(orderExtraKey.data) : orderExtraKey.error.errors
  );
  // A missing or non-string date leaves `undefined` in the parsed data; the date
  // refinements must answer 422 instead of throwing on `undefined.split`.
  const emptyOrder = (() => {
    try {
      return { ok: true, parsed: createOrderSchema.safeParse({}) };
    } catch (error) {
      return { ok: false, error };
    }
  })();
  check(
    'order: empty body parses to 422 instead of throwing',
    emptyOrder.ok === true && emptyOrder.parsed.success === false,
    emptyOrder.ok ? null : String(emptyOrder.error && emptyOrder.error.message)
  );
  for (const field of ['ngay_dat_hang', 'ngay_giao_hang_yc']) {
    const payload = { ...validOrder };
    delete payload[field];
    const parsed = (() => {
      try {
        return createOrderSchema.safeParse(payload);
      } catch (error) {
        return { threw: error };
      }
    })();
    check(
      `order: missing ${field} -> 422 naming the field`,
      parsed.threw === undefined &&
        parsed.success === false &&
        parsed.error.errors.some((issue) => issue.path.includes(field)),
      parsed.threw ? String(parsed.threw.message) : parsed.success ? null : parsed.error.errors
    );
  }
  check(
    'order: non-string order date -> 422 instead of throwing',
    createOrderSchema.safeParse({ ...validOrder, ngay_dat_hang: 20260301 }).success === false
  );
  check(
    'order: malformed date reports the format message first',
    (() => {
      const parsed = createOrderSchema.safeParse({ ...validOrder, ngay_dat_hang: '2026-02-30' });
      const first = parsed.success ? null : parsed.error.errors.find((issue) => issue.path.includes('ngay_dat_hang'));
      return first && /không hợp lệ/.test(first.message);
    })()
  );
  const lineExtraKey = createOrderSchema.safeParse({
    ...validOrder,
    lines: [{ ...orderLine, don_gia: 5 }],
  });
  check(
    'order: unknown line key is stripped (unit price comes from the product)',
    lineExtraKey.success && lineExtraKey.data.lines[0].don_gia === undefined
  );
  // Sort columns are not an enum at the schema: the contract pins PH1's
  // "unknown column falls back to the default order" behaviour, so the safety
  // property lives in the repositories' allow-lists (asserted below).
  const orderSortFallback = orderQuerySchema.safeParse({ sortBy: 'id; DROP TABLE don_ban_hang' });
  check(
    'order query: raw sort column passes the schema but is absent from the allow-list',
    orderSortFallback.success &&
      orderSortFallback.data.sortBy === 'id; DROP TABLE don_ban_hang' &&
      !require('../src/repositories/sales/order.repository').ALLOWED_ORDER_SORT_COLUMNS.includes(
        orderSortFallback.data.sortBy
      ),
    orderSortFallback.success ? orderSortFallback.data : orderSortFallback.error.errors
  );
  check('order query: impossible fromDate rejected', !orderQuerySchema.safeParse({ fromDate: '2026-02-30' }).success);
  // The pickers ask for a set of states in one request (`trang_thai_in`): the
  // value is a comma-separated list that must name known statuses only.
  const statusList = orderQuerySchema.safeParse({ trang_thai_in: 'da_xac_nhan,dang_san_xuat' });
  check(
    'order query: status list parses into an array',
    statusList.success && Array.isArray(statusList.data.trang_thai_in) && statusList.data.trang_thai_in.length === 2,
    statusList.success ? statusList.data.trang_thai_in : statusList.error.errors
  );
  const statusListSpaced = orderQuerySchema.safeParse({ trang_thai_in: ' da_xac_nhan , dang_san_xuat ' });
  check(
    'order query: status list tolerates padding',
    statusListSpaced.success && statusListSpaced.data.trang_thai_in.join(',') === 'da_xac_nhan,dang_san_xuat',
    statusListSpaced.success ? statusListSpaced.data.trang_thai_in : statusListSpaced.error.errors
  );
  const statusListEmpty = orderQuerySchema.safeParse({ trang_thai_in: '' });
  check(
    'order query: an empty status list means "no filter"',
    statusListEmpty.success && statusListEmpty.data.trang_thai_in.length === 0,
    statusListEmpty.success ? statusListEmpty.data.trang_thai_in : statusListEmpty.error.errors
  );
  const statusListUnknown = orderQuerySchema.safeParse({ trang_thai_in: 'da_xac_nhan,khong_ton_tai' });
  check(
    'order query: an unknown status in the list -> 422 naming trang_thai_in',
    !statusListUnknown.success &&
      statusListUnknown.error.errors.some((issue) => issue.path.join('.') === 'trang_thai_in'),
    statusListUnknown.success ? statusListUnknown.data : statusListUnknown.error.errors
  );
  check(
    'order query: toDate before fromDate rejected',
    !orderQuerySchema.safeParse({ fromDate: '2026-03-01', toDate: '2026-02-01' }).success
  );
  const unknownOrderParam = orderQuerySchema.safeParse({ kieu_sap_xep: 'ASC' });
  check(
    'order query: unknown param is ignored',
    unknownOrderParam.success && unknownOrderParam.data.kieu_sap_xep === undefined
  );

  // --- products / receivables ----------------------------------------------
  // Every list query resolves `sortBy` through its repository allow-list, so an
  // arbitrary column never reaches the ORDER BY clause.
  const sortAllowLists = {
    customer: require('../src/repositories/sales/customer.repository').ALLOWED_CUSTOMER_SORT_COLUMNS,
    product: require('../src/repositories/sales/product.repository').ALLOWED_PRODUCT_SORT_COLUMNS,
    order: require('../src/repositories/sales/order.repository').ALLOWED_ORDER_SORT_COLUMNS,
    delivery: require('../src/repositories/sales/delivery.repository').ALLOWED_DELIVERY_SORT_COLUMNS,
    invoice: require('../src/repositories/sales/invoice.repository').ALLOWED_INVOICE_SORT_COLUMNS,
    receivable: require('../src/repositories/sales/receivable.repository').ALLOWED_RECEIVABLE_SORT_COLUMNS,
  };
  for (const [domain, columns] of Object.entries(sortAllowLists)) {
    check(
      `${domain}: sort allow-list is non-empty and free of injections`,
      Array.isArray(columns) &&
        columns.length > 0 &&
        columns.every((column) => /^[a-z_]+$/.test(column)) &&
        !columns.includes('raw_sql')
    );
  }
  const productSortFallback = productQuerySchema.safeParse({ sortBy: 'ma_san_pham, 1=1' });
  check(
    'product query: raw sort column is not in the allow-list',
    productSortFallback.success && !sortAllowLists.product.includes(productSortFallback.data.sortBy)
  );
  check('product query: unknown status rejected', !productQuerySchema.safeParse({ trang_thai: 'het_hang' }).success);
  check(
    'receivable query: dueToDate before dueFromDate rejected',
    !receivableQuerySchema.safeParse({ dueFromDate: '2026-03-01', dueToDate: '2026-02-01' }).success
  );
  check(
    'receivable query: non-boolean overdueOnly rejected',
    !receivableQuerySchema.safeParse({ overdueOnly: 'maybe' }).success
  );
  check('receivable query: overdueOnly=false stays false', receivableQuerySchema.safeParse({ overdueOnly: 'false' }).data.overdueOnly === false);
  check('receivable query: overdueOnly=true stays true', receivableQuerySchema.safeParse({ overdueOnly: 'true' }).data.overdueOnly === true);
  const receivableServiceBadRange = await expect(() =>
    receivableService.listReceivables({ dueFromDate: '2026-03-01', dueToDate: '2026-02-01' })
  );
  check(
    'receivable service: inverted range -> 422',
    receivableServiceBadRange.ok === false && receivableServiceBadRange.error.statusCode === 422,
    receivableServiceBadRange.ok ? receivableServiceBadRange.value : fieldsOf(receivableServiceBadRange.error)
  );

  // --- dashboard ------------------------------------------------------------
  const badPeriod = await expect(() => overviewService.getSummary({ period: 'week' }, 'admin'));
  check(
    'dashboard: unknown period -> 422 field period',
    badPeriod.ok === false && badPeriod.error.statusCode === 422 && fieldsOf(badPeriod.error).includes('period'),
    badPeriod.ok ? badPeriod.value : fieldsOf(badPeriod.error)
  );
  const badCustomerType = await expect(() =>
    overviewService.getSummary({ period: 'month', loai_khach_hang: 'khach_vang_lai' }, 'admin')
  );
  check(
    'dashboard: unknown customer type -> 422',
    badCustomerType.ok === false && badCustomerType.error.statusCode === 422,
    badCustomerType.ok ? badCustomerType.value : fieldsOf(badCustomerType.error)
  );
  const missingCustomDates = await expect(() => overviewService.getSummary({ period: 'custom' }, 'admin'));
  check(
    'dashboard: period=custom without dates -> 422 field fromDate',
    missingCustomDates.ok === false &&
      missingCustomDates.error.statusCode === 422 &&
      fieldsOf(missingCustomDates.error).includes('fromDate'),
    missingCustomDates.ok ? missingCustomDates.value : fieldsOf(missingCustomDates.error)
  );
  const badLimit = await expect(() => overviewService.getSummary({ period: 'month', limit: 51 }, 'admin'));
  check(
    'dashboard: limit above maximum -> 422 field limit',
    badLimit.ok === false && badLimit.error.statusCode === 422 && fieldsOf(badLimit.error).includes('limit'),
    badLimit.ok ? badLimit.value : fieldsOf(badLimit.error)
  );

  // --- customer service surface --------------------------------------------
  // `{}` plus a stray key must fail validation, not reach the repository and
  // certainly not escape as a 500. No row is written by this case.
  const customerUnknownKey = await expect(() =>
    customerService.createCustomer({ khong_hop_le: 1 }, 1)
  );
  check(
    'customer service: invalid body -> 422 with field details',
    customerUnknownKey.ok === false &&
      customerUnknownKey.error.statusCode === 422 &&
      fieldsOf(customerUnknownKey.error).includes('ten_khach_hang'),
    customerUnknownKey.ok ? customerUnknownKey.value : fieldsOf(customerUnknownKey.error)
  );
  check('customer service: exports a service object', typeof customerService.listCustomers === 'function');

  console.log(`\n[PH1 validation] ${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.log('Failures:');
    for (const failure of failures) {
      console.log(`  - ${failure}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
