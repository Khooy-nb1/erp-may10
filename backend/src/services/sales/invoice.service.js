'use strict';

const { v } = require('../../utils/sales/validate');
const {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
} = require('../../utils/sales/errors');
const {
  INVALID_BODY_MESSAGE,
  INVALID_QUERY_MESSAGE,
  assertNoAliasConflict,
  fieldIssues,
} = require('../../utils/sales/request');
const invoiceRepository = require('../../repositories/sales/invoice.repository');

/**
 * Invoice service (ported from PH1 `services/invoice.service.ts`).
 *
 * Invoice creation is atomic and Finance-owned: it derives the due date from the
 * customer's credit terms, numbers the invoice under the order lock and writes
 * the matching receivable row inside one transaction (repository
 * `createInvoiceAtomic`).
 */

const invoiceStatusEnum = v.enum(['chua_thanh_toan', 'thanh_toan_mot_phan', 'da_thanh_toan', 'qua_han']);

const createInvoiceSchema = v
  .object({
    ma_don_ban_hang: v.coerce.number().int().positive('Mã đơn hàng không hợp lệ').optional(),
    orderId: v.coerce.number().int().positive('Mã đơn hàng không hợp lệ').optional(),
    ma_khach_hang: v.coerce.number().int().positive('Mã khách hàng không hợp lệ').optional(),
    customerId: v.coerce.number().int().positive('Mã khách hàng không hợp lệ').optional(),
    ngay_xuat_hoa_don: v.dateISO('Ngày xuất hóa đơn không đúng định dạng (YYYY-MM-DD)').optional(),
    issueDate: v.dateISO('Ngày xuất hóa đơn không đúng định dạng (YYYY-MM-DD)').optional(),
    so_tien_da_thu: v.coerce.number().min(0, 'Số tiền đã thu không được âm').default(0),
    paidAmount: v.coerce.number().min(0, 'Số tiền đã thu không được âm').optional(),
    ghi_chu: v.string().trim().max(2000, 'Ghi chú tối đa 2000 ký tự').optional().nullable(),
    notes: v.string().trim().max(2000, 'Ghi chú tối đa 2000 ký tự').optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const orderId = data.ma_don_ban_hang || data.orderId;
    if (!orderId) {
      ctx.addIssue({ code: 'custom', message: 'Mã đơn hàng là bắt buộc', path: ['ma_don_ban_hang'] });
    }
  })
  .transform((data) => ({
    ma_don_ban_hang: data.ma_don_ban_hang || data.orderId,
    ma_khach_hang: data.ma_khach_hang || data.customerId,
    ngay_xuat_hoa_don: data.ngay_xuat_hoa_don || data.issueDate || new Date().toISOString().split('T')[0],
    so_tien_da_thu: data.paidAmount !== undefined ? data.paidAmount : data.so_tien_da_thu,
    ghi_chu: data.ghi_chu || data.notes || null,
  }));

const invoiceQuerySchema = v
  .object({
    page: v.coerce.number().int('Số trang phải là số nguyên').min(1, 'Số trang tối thiểu là 1').default(1),
    pageSize: v.coerce
      .number()
      .int('Kích thước trang phải là số nguyên')
      .min(1, 'Kích thước trang tối thiểu là 1')
      .max(100, 'Kích thước trang tối đa là 100')
      .default(20),
    search: v.string().trim().max(100, 'Từ khóa tìm kiếm tối đa 100 ký tự').optional(),
    ma_hoa_don: v.string().trim().max(50, 'Mã hóa đơn tối đa 50 ký tự').optional(),
    ma_don_ban_hang: v.coerce.number().int().positive().optional(),
    ma_khach_hang: v.coerce.number().int().positive().optional(),
    trang_thai: invoiceStatusEnum.optional(),
    fromDate: v.dateISO('Ngày bắt đầu không đúng định dạng (YYYY-MM-DD)').optional(),
    toDate: v.dateISO('Ngày kết thúc không đúng định dạng (YYYY-MM-DD)').optional(),
    dueFromDate: v.dateISO('Ngày đáo hạn bắt đầu không đúng định dạng (YYYY-MM-DD)').optional(),
    dueToDate: v.dateISO('Ngày đáo hạn kết thúc không đúng định dạng (YYYY-MM-DD)').optional(),
    sortBy: v.string().trim().max(64, 'Cột sắp xếp không hợp lệ').optional(),
    sortOrder: v.enum(['ASC', 'DESC'], 'Thứ tự sắp xếp không hợp lệ').default('DESC'),
  })
  .refine((data) => !data.fromDate || !data.toDate || data.fromDate <= data.toDate, {
    message: 'Ngày kết thúc không được trước ngày bắt đầu',
    path: ['toDate'],
  })
  .refine((data) => !data.dueFromDate || !data.dueToDate || data.dueFromDate <= data.dueToDate, {
    message: 'Ngày đáo hạn kết thúc không được trước ngày bắt đầu',
    path: ['dueToDate'],
  });

function calculateDueDate(issueDate, creditDays) {
  const days = Math.max(0, creditDays || 0);
  return new Date(issueDate.getTime() + days * 24 * 60 * 60 * 1000);
}

function deriveInvoiceStatus(paid, total, dueDate) {
  if (paid >= total) {
    return 'da_thanh_toan';
  }
  const isOverdue = dueDate.getTime() < Date.now();
  if (paid > 0) {
    return isOverdue ? 'qua_han' : 'thanh_toan_mot_phan';
  }
  return isOverdue ? 'qua_han' : 'chua_thanh_toan';
}

async function listInvoices(queryFilters) {
  const parsed = invoiceQuerySchema.safeParse(queryFilters);
  if (!parsed.success) {
    throw new ValidationError(INVALID_QUERY_MESSAGE, fieldIssues(parsed.error.errors));
  }
  return invoiceRepository.list(parsed.data);
}

async function getInvoiceById(id) {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw new NotFoundError('INVOICE_NOT_FOUND', `Không tìm thấy hóa đơn có ID ${id}.`);
  }
  return invoice;
}

async function createInvoice(rawInput, creatorId) {
  assertNoAliasConflict(rawInput, [
    ['ma_don_ban_hang', 'orderId'],
    ['ma_khach_hang', 'customerId'],
    ['ngay_xuat_hoa_don', 'issueDate'],
    ['so_tien_da_thu', 'paidAmount'],
    ['ghi_chu', 'notes'],
  ]);

  const parsed = createInvoiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError(INVALID_BODY_MESSAGE, fieldIssues(parsed.error.errors));
  }
  const input = parsed.data;

  const issueDate = new Date(input.ngay_xuat_hoa_don);

  const result = await invoiceRepository.createInvoiceAtomic({
    orderId: input.ma_don_ban_hang,
    expectedCustomerId: input.ma_khach_hang,
    issueDate,
    paidAmount: Number(input.so_tien_da_thu) || 0,
    notes: input.ghi_chu ? input.ghi_chu.trim() : null,
    creatorId,
  });

  if (result.error) {
    if (result.error === 'ORDER_NOT_FOUND') {
      throw new NotFoundError('ORDER_NOT_FOUND', result.details || 'Đơn bán hàng không tồn tại.');
    }
    if (result.error === 'INVOICE_ALREADY_EXISTS') {
      throw new ConflictError('INVOICE_ALREADY_EXISTS', result.details || 'Đơn hàng đã được xuất hóa đơn.');
    }
    if (result.error === 'DATABASE_CONFLICT') {
      throw new ConflictError('DATABASE_CONFLICT', result.details || 'Không thể tạo mã hóa đơn duy nhất.');
    }
    if (result.error === 'VALIDATION_ERROR') {
      throw new ValidationError(result.details || 'Số tiền đã thu không hợp lệ.', [
        { field: 'so_tien_da_thu', message: result.details || 'Số tiền đã thu không hợp lệ.' },
      ]);
    }
    throw new AppError(422, result.error, result.details || 'Lỗi xử lý xuất hóa đơn.');
  }

  if (!result.invoice) {
    throw new AppError(500, 'INVOICE_CREATION_FAILED', 'Không thể tạo bản ghi hóa đơn.');
  }

  return result.invoice;
}

module.exports = {
  invoiceStatusEnum,
  createInvoiceSchema,
  invoiceQuerySchema,
  calculateDueDate,
  deriveInvoiceStatus,
  listInvoices,
  getInvoiceById,
  createInvoice,
  invoiceService: {
    listInvoices,
    getInvoiceById,
    createInvoice,
  },
};
