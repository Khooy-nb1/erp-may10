/**
 * Local-rule tests for the sales module forms.
 *
 * The module's contract is that a value the form accepts is accepted by the API,
 * and a value the form rejects fails with the message the API would have used for
 * the same input. Every expectation below is therefore a message literal: the
 * strings were verified against the running API's `details[].message` (see the
 * parity run recorded in `PH1_HANDOVER/BUSINESS_RULES.md` §9.7).
 *
 * Run with `npm test` in `frontend/` (node:test, no extra dependency).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CUSTOMER_TYPES,
  TAX_CODE_PATTERN,
  customerFieldError,
  customerFieldErrors,
  deliveryFieldErrors,
  fieldStatus,
  firstFieldError,
  invoiceFieldErrors,
  isBlank,
  isDateShape,
  isRealDate,
  isoDateError,
  maxLengthError,
  normalizePhone,
  orderFieldErrors,
  serverFieldErrors,
  toWireAmount,
  toWireQuantity,
} from './validation.js';

const validCustomer = {
  ten_khach_hang: 'Công ty May 10',
  loai_khach_hang: 'to_chuc',
  ma_so_thue: '0100100000',
  so_dien_thoai: '0912345678',
  email: 'sales@may10.vn',
  dia_chi: 'Số 1 Mai Động',
  tinh_thanh_pho: 'Hà Nội',
  nguoi_lien_he: 'Chị Lan',
  han_muc_cong_no: 1_000_000_000,
  so_ngay_cong_no: 30,
  ghi_chu: 'Khách quen',
};

const validOrderLine = { product: { id: 7 }, quantity: 2, discountRate: 5 };

const validOrder = {
  customerId: 3,
  orderDate: '2026-09-01',
  requestedDeliveryDate: '2026-09-10',
  deliveryAddress: 'Số 1 Mai Động, Hà Nội',
  notes: '',
  lines: [validOrderLine],
};

const validDelivery = {
  orderId: 12,
  warehouseId: '1',
  deliveryDate: '2026-09-10',
  receiverName: 'Chị Lan',
  deliveryAddress: 'Số 1 Mai Động',
  transportMethod: 'Xe tải công ty',
  notes: '',
};

const validInvoice = { orderId: 12, issueDate: '2026-09-10', paidAmount: 0, notes: '' };

test('isRealDate accepts real calendar days and rejects impossible ones', () => {
  assert.equal(isRealDate('2026-02-28'), true);
  assert.equal(isRealDate('2024-02-29'), true); // leap year
  assert.equal(isRealDate('2026-02-30'), false);
  assert.equal(isRealDate('2026-13-01'), false);
  assert.equal(isRealDate('2026-2-3'), false);
  assert.equal(isRealDate(undefined), false);
  assert.equal(isDateShape('2026-02-30'), true);
  assert.equal(isDateShape('2026-2-3'), false);
});

test('isoDateError mirrors the two tiers of the backend dateISO helper', () => {
  assert.equal(isoDateError('2026-09-10', 'X (YYYY-MM-DD)'), null);
  assert.equal(isoDateError(undefined, 'X (YYYY-MM-DD)'), null); // `.optional()`, key absent
  // Only `undefined` is optional: a cleared input is a submitted '' (format
  // message), whitespace is not a date either, and a non-string is a type error.
  assert.equal(isoDateError('', 'X (YYYY-MM-DD)'), 'X (YYYY-MM-DD)');
  assert.equal(isoDateError('   ', 'X (YYYY-MM-DD)'), 'X (YYYY-MM-DD)');
  assert.equal(isoDateError(null, 'X (YYYY-MM-DD)'), 'Giá trị phải là chuỗi ký tự.');
  assert.equal(isoDateError('2026-2-3', 'X (YYYY-MM-DD)'), 'X (YYYY-MM-DD)');
  assert.equal(isoDateError('2026-02-30', 'X (YYYY-MM-DD)'), 'Ngày không tồn tại.');
});

test('small helpers keep the option/blank semantics the forms rely on', () => {
  assert.equal(isBlank('   '), true);
  assert.equal(isBlank(null), true);
  assert.equal(isBlank(0), false);
  assert.equal(maxLengthError('abc', 3, 'too long'), null);
  assert.equal(maxLengthError('abcd', 3, 'too long'), 'too long');
  assert.equal(firstFieldError({}), null);
  assert.deepEqual(firstFieldError({ a: '', b: 'second' }), { field: 'b', message: 'second' });
  assert.deepEqual(fieldStatus({ a: 'bad' }, 'a'), { type: 'error', message: 'bad' });
  assert.equal(fieldStatus({}, 'a'), undefined);
});

test('a complete customer form raises no local error', () => {
  assert.deepEqual(customerFieldErrors(validCustomer), {});
  // A blank form flags exactly the required fields and nothing optional.
  assert.deepEqual(Object.keys(customerFieldErrors({})).sort(), [
    'dia_chi',
    'loai_khach_hang',
    'so_dien_thoai',
    'ten_khach_hang',
    'tinh_thanh_pho',
  ]);
});

test('cleared numeric fields take the dialog default, not a number error', () => {
  // `CustomerCreateDialog` sends `toWireAmount(state)` (`Number(value) || 0`), so
  // a cleared credit limit or payment term is 0 on the wire and the API accepts it.
  const cleared = customerFieldErrors({ ...validCustomer, han_muc_cong_no: null, so_ngay_cong_no: '' });
  assert.deepEqual(cleared, {});
  assert.equal(toWireAmount(null), 0);
  assert.equal(toWireAmount(''), 0);
  assert.equal(toWireAmount('abc'), 0);
  assert.equal(toWireQuantity(null), 0);
  assert.equal(Number.isNaN(toWireQuantity(undefined)), true);
});

test('phone numbers accept VN domestic and E.164, normalising separators', () => {
  assert.equal(normalizePhone('+84 91 234-5678'), '+84912345678');
  assert.equal(normalizePhone('091-234-5678'), '0912345678');
  assert.equal(normalizePhone(' 0912345678 '), '0912345678');

  const accepted = [
    '0912345678',
    '091-234-5678',
    '091 234 5678',
    '+84912345678',
    '+84 91 234-5678',
    '+1 415 555 0100',
  ];
  for (const phone of accepted) {
    assert.equal(
      customerFieldError({ ...validCustomer, so_dien_thoai: phone }, 'so_dien_thoai'),
      null,
      phone
    );
  }

  const rejected = [
    '091234567', // 9 digits
    '09123456789', // 11 digits, not E.164
    'abcdefgh', // letters
    '09a1234567', // letters mixed in
    '(091) 2345678', // parentheses are not separators
    '+0123456789', // E.164 country code cannot start with 0
  ];
  for (const phone of rejected) {
    assert.notEqual(
      customerFieldError({ ...validCustomer, so_dien_thoai: phone }, 'so_dien_thoai'),
      null,
      phone
    );
  }
});

test('tax ids accept the two Vietnamese shapes and nothing else', () => {
  assert.equal(TAX_CODE_PATTERN.test('0100109106'), true);
  assert.equal(TAX_CODE_PATTERN.test('0100109106-001'), true);
  assert.equal(TAX_CODE_PATTERN.test('010010910'), false);
  assert.equal(TAX_CODE_PATTERN.test('0100109106-01'), false);
  assert.equal(TAX_CODE_PATTERN.test('0100109106-0011'), false);

  for (const taxCode of ['0100109106', '0100109106-001', '', null]) {
    assert.equal(
      customerFieldError({ ...validCustomer, ma_so_thue: taxCode }, 'ma_so_thue'),
      null,
      JSON.stringify(taxCode)
    );
  }

  // `.or(v.literal(''))` matches an exact empty string only, so whitespace is a
  // format failure rather than an absent tax id.
  assert.equal(
    customerFieldError({ ...validCustomer, ma_so_thue: '   ' }, 'ma_so_thue'),
    'Mã số thuế không đúng định dạng (10 số hoặc 10 số-3 số)'
  );
});

test('customer field rules carry the API wording', () => {
  const cases = [
    ['ten_khach_hang', '', 'Tên khách hàng phải từ 2 ký tự'],
    ['ten_khach_hang', 'A', 'Tên khách hàng phải từ 2 ký tự'],
    ['ten_khach_hang', 'A'.repeat(201), 'Tên khách hàng tối đa 200 ký tự'],
    ['loai_khach_hang', 'bogus', 'Giá trị không nằm trong danh sách cho phép.'],
    // `v.phone().trim().min(8).max(20)` runs length before the pattern, so a
    // blank, short or long value carries a length message, not the pattern one.
    ['so_dien_thoai', 'abcdefgh', 'Số điện thoại không đúng định dạng.'],
    ['so_dien_thoai', '1234567', 'Số điện thoại phải từ 8 ký tự'],
    ['so_dien_thoai', '', 'Số điện thoại phải từ 8 ký tự'],
    ['so_dien_thoai', '   ', 'Số điện thoại phải từ 8 ký tự'],
    ['so_dien_thoai', '1'.repeat(21), 'Số điện thoại tối đa 20 ký tự'],
    // Vietnamese formats: domestic `0` + 9 digits, or E.164 with a real country
    // code. Separators (spaces, `-`) are stripped; other punctuation is not.
    ['so_dien_thoai', '091234567', 'Số điện thoại không đúng định dạng.'],
    ['so_dien_thoai', '09123456789', 'Số điện thoại không đúng định dạng.'],
    ['so_dien_thoai', '(091) 2345678', 'Số điện thoại không đúng định dạng.'],
    ['email', 'nope', 'Email không đúng định dạng'],
    // `.or(v.literal(''))` accepts an exact empty string only: whitespace is a
    // format failure, a padded address is fine (the server trims).
    ['email', '   ', 'Email không đúng định dạng'],
    ['email', `${'a'.repeat(99)}@x.vn`, 'Email tối đa 100 ký tự'],
    ['dia_chi', '', 'Địa chỉ phải từ 5 ký tự'],
    ['dia_chi', '1234', 'Địa chỉ phải từ 5 ký tự'],
    ['tinh_thanh_pho', '', 'Tỉnh/thành phố phải từ 2 ký tự'],
    ['tinh_thanh_pho', 'H', 'Tỉnh/thành phố phải từ 2 ký tự'],
    ['ma_so_thue', 'T'.repeat(21), 'Mã số thuế tối đa 20 ký tự'],
    ['ma_so_thue', '010010910', 'Mã số thuế không đúng định dạng (10 số hoặc 10 số-3 số)'],
    ['ma_so_thue', '0100109106-01', 'Mã số thuế không đúng định dạng (10 số hoặc 10 số-3 số)'],
    ['ma_so_thue', 'MST-000001', 'Mã số thuế không đúng định dạng (10 số hoặc 10 số-3 số)'],
    ['nguoi_lien_he', 'N'.repeat(151), 'Người liên hệ tối đa 150 ký tự'],
    ['han_muc_cong_no', -1, 'Hạn mức công nợ phải lớn hơn hoặc bằng 0'],
    ['han_muc_cong_no', 1e16, 'Hạn mức công nợ quá lớn'],
    // The dialog sends `toWireAmount(v)`: a cleared field is the schema default 0
    // (accepted), and only a value that cannot cross JSON reaches the number
    // message — the API answers `Giá trị phải là số.` for the `null` it receives.
    ['han_muc_cong_no', '1e999', 'Giá trị phải là số.'],
    ['so_ngay_cong_no', 1.5, 'Số ngày công nợ phải là số nguyên'],
    ['so_ngay_cong_no', -1, 'Số ngày công nợ phải lớn hơn hoặc bằng 0'],
    ['so_ngay_cong_no', 3651, 'Số ngày công nợ tối đa 3650 ngày'],
    ['ghi_chu', 'G'.repeat(2001), 'Ghi chú tối đa 2000 ký tự'],
  ];

  for (const [field, value, message] of cases) {
    assert.equal(
      customerFieldError({ ...validCustomer, [field]: value }, field),
      message,
      `${field} = ${JSON.stringify(value)}`
    );
  }

  assert.equal(customerFieldErrors({ ...validCustomer, email: '' }).email, undefined); // optional
  assert.deepEqual(CUSTOMER_TYPES, ['ca_nhan', 'to_chuc', 'dai_ly', 'xuat_khau']);
});

test('order rules cover the required, date, cross-field and line checks', () => {
  assert.deepEqual(orderFieldErrors(validOrder), {});

  // Deliberate wording: the API answers "Trường này là bắt buộc." for a missing
  // value, but both fields are always populated by the dialog, so the local gate
  // keeps the more actionable sentence instead of the generic one.
  assert.equal(orderFieldErrors({ ...validOrder, customerId: '' }).ma_khach_hang, 'Vui lòng chọn khách hàng');
  assert.equal(
    orderFieldErrors({ ...validOrder, orderDate: '' }).ngay_dat_hang,
    'Ngày đặt hàng là bắt buộc'
  );

  assert.equal(
    orderFieldErrors({ ...validOrder, orderDate: '2026-02-30' }).ngay_dat_hang,
    'Ngày đặt hàng không hợp lệ (YYYY-MM-DD)'
  );
  assert.equal(
    orderFieldErrors({ ...validOrder, requestedDeliveryDate: '2026-08-01' }).ngay_giao_hang_yc,
    'Ngày giao hàng yêu cầu không được trước ngày đặt hàng'
  );
  assert.equal(
    orderFieldErrors({ ...validOrder, deliveryAddress: '' }).dia_chi_giao_hang,
    'Địa chỉ giao hàng phải từ 5 ký tự'
  );
  assert.equal(
    orderFieldErrors({ ...validOrder, deliveryAddress: '1234' }).dia_chi_giao_hang,
    'Địa chỉ giao hàng phải từ 5 ký tự'
  );
  assert.equal(orderFieldErrors({ ...validOrder, deliveryAddress: '12345' }).dia_chi_giao_hang, undefined);
  assert.equal(
    orderFieldErrors({ ...validOrder, notes: 'G'.repeat(2001) }).ghi_chu,
    'Ghi chú tối đa 2000 ký tự'
  );
  assert.equal(orderFieldErrors({ ...validOrder, lines: [] }).lines, 'Đơn hàng phải có ít nhất một dòng sản phẩm');

  const qty = orderFieldErrors({ ...validOrder, lines: [{ ...validOrderLine, quantity: 0 }] });
  assert.equal(qty['lines.0.so_luong'], 'Số lượng đặt phải lớn hơn 0');
  const discount = orderFieldErrors({ ...validOrder, lines: [{ ...validOrderLine, discountRate: 101 }] });
  assert.equal(discount['lines.0.ty_le_giam_gia'], 'Chiết khấu tối đa 100%');
  const totalQty = orderFieldErrors({ ...validOrder, lines: [{ ...validOrderLine, quantity: 2e6 }] });
  assert.equal(totalQty['lines.0.so_luong'], 'Số lượng đặt quá lớn');
  // `toWireQuantity` has no default: a cleared quantity is 0 (positive message),
  // an absent one serialises to `null` (number message), and the discount's
  // `toWireAmount` keeps a cleared value at the accepted default.
  const clearedQty = orderFieldErrors({ ...validOrder, lines: [{ ...validOrderLine, quantity: null }] });
  assert.equal(clearedQty['lines.0.so_luong'], 'Số lượng đặt phải lớn hơn 0');
  const missingQty = orderFieldErrors({ ...validOrder, lines: [{ ...validOrderLine, quantity: undefined }] });
  assert.equal(missingQty['lines.0.so_luong'], 'Giá trị phải là số.');
  const clearedDiscount = orderFieldErrors({ ...validOrder, lines: [{ ...validOrderLine, discountRate: null }] });
  assert.deepEqual(clearedDiscount, {});
});

test('delivery rules cover the required fields, the date and the length caps', () => {
  assert.deepEqual(deliveryFieldErrors(validDelivery), {});

  assert.equal(
    deliveryFieldErrors({ ...validDelivery, orderId: null }).ma_don_ban_hang,
    'Mã đơn hàng là bắt buộc'
  );
  assert.equal(
    deliveryFieldErrors({ ...validDelivery, warehouseId: '0' }).ma_kho,
    'Mã kho không hợp lệ'
  );
  assert.equal(
    deliveryFieldErrors({ ...validDelivery, deliveryDate: '2026-02-30' }).ngay_giao,
    'Ngày giao hàng không hợp lệ (YYYY-MM-DD)'
  );
  assert.equal(
    deliveryFieldErrors({ ...validDelivery, receiverName: '' }).ten_nguoi_nhan,
    'Tên người nhận là bắt buộc'
  );
  assert.equal(
    deliveryFieldErrors({ ...validDelivery, receiverName: 'N'.repeat(151) }).ten_nguoi_nhan,
    'Tên người nhận tối đa 150 ký tự'
  );
  assert.equal(
    deliveryFieldErrors({ ...validDelivery, deliveryAddress: '' }).dia_chi_giao,
    'Địa chỉ giao hàng là bắt buộc'
  );
  assert.equal(
    deliveryFieldErrors({ ...validDelivery, transportMethod: 'P'.repeat(101) }).phuong_tien_van_chuyen,
    'Phương tiện vận chuyển tối đa 100 ký tự'
  );
});

test('invoice rules cover the order link, the two date tiers and the amount', () => {
  assert.deepEqual(invoiceFieldErrors(validInvoice), {});

  assert.equal(
    invoiceFieldErrors({ ...validInvoice, orderId: null }).ma_don_ban_hang,
    'Mã đơn hàng là bắt buộc'
  );
  assert.equal(
    invoiceFieldErrors({ ...validInvoice, issueDate: '2026-2-3' }).ngay_xuat_hoa_don,
    'Ngày xuất hóa đơn không đúng định dạng (YYYY-MM-DD)'
  );
  assert.equal(
    invoiceFieldErrors({ ...validInvoice, issueDate: '2026-02-30' }).ngay_xuat_hoa_don,
    'Ngày không tồn tại.'
  );
  assert.equal(
    invoiceFieldErrors({ ...validInvoice, issueDate: '' }).ngay_xuat_hoa_don,
    'Ngày xuất hóa đơn không đúng định dạng (YYYY-MM-DD)'
  ); // the dialog sends the key, so a cleared input is a submitted '' — not "absent"
  assert.equal(
    invoiceFieldErrors({ ...validInvoice, paidAmount: -1 }).so_tien_da_thu,
    'Số tiền đã thu không được âm'
  );
  // The dialog sends `toWireAmount(paidAmount)`: a cleared amount is 0, accepted.
  assert.deepEqual(invoiceFieldErrors({ ...validInvoice, paidAmount: '' }), {});
  assert.deepEqual(invoiceFieldErrors({ ...validInvoice, paidAmount: null }), {});
  assert.deepEqual(invoiceFieldErrors({ orderId: 12, paidAmount: 0 }), {}); // omitted date is optional
});

test('serverFieldErrors places API details on form fields', () => {
  const error = {
    details: [
      { field: 'lines.0.so_luong', message: 'Số lượng đặt phải lớn hơn 0' },
      { field: 'ngay_dat_hang', message: 'Ngày đặt hàng không hợp lệ (YYYY-MM-DD)' },
      { field: 'lines.1.so_luong', message: 'later message for the same field' },
      { field: 'bi_mat', message: 'not a form field' },
    ],
  };

  assert.deepEqual(serverFieldErrors(error, ['lines', 'ngay_dat_hang']), {
    lines: 'Số lượng đặt phải lớn hơn 0',
    ngay_dat_hang: 'Ngày đặt hàng không hợp lệ (YYYY-MM-DD)',
  });
  assert.deepEqual(serverFieldErrors({ details: [] }).constructor, Object); // never throws on odd input
  assert.deepEqual(serverFieldErrors(null), {});
});
