'use strict';

const { v } = require('../../utils/sales/validate');
const {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
} = require('../../utils/sales/errors');
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
    ma_don_ban_hang: v.coerce.number().int().positive().optional(),
    orderId: v.coerce.number().int().positive().optional(),
    ma_khach_hang: v.coerce.number().int().positive().optional(),
    customerId: v.coerce.number().int().positive().optional(),
    ngay_xuat_hoa_don: v.string().optional(),
    issueDate: v.string().optional(),
    so_tien_da_thu: v.coerce.number().min(0, 'Số tiền đã thu không được âm').default(0),
    paidAmount: v.coerce.number().min(0).optional(),
    ghi_chu: v.string().optional().nullable(),
    notes: v.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const orderId = data.ma_don_ban_hang || data.orderId;
    if (!orderId) {
      ctx.addIssue({ code: 'custom', message: 'Mã đơn hàng là bắt buộc', path: ['ma_don_ban_hang'] });
    }
    const issueDateStr = data.ngay_xuat_hoa_don || data.issueDate;
    if (issueDateStr && issueDateStr.trim().length > 0) {
      const parsed = new Date(issueDateStr);
      if (isNaN(parsed.getTime())) {
        ctx.addIssue({ code: 'custom', message: 'Ngày xuất hóa đơn không hợp lệ', path: ['ngay_xuat_hoa_don'] });
      }
    }
  })
  .transform((data) => ({
    ma_don_ban_hang: data.ma_don_ban_hang || data.orderId,
    ma_khach_hang: data.ma_khach_hang || data.customerId,
    ngay_xuat_hoa_don: data.ngay_xuat_hoa_don || data.issueDate || new Date().toISOString(),
    so_tien_da_thu: data.paidAmount !== undefined ? data.paidAmount : data.so_tien_da_thu,
    ghi_chu: data.ghi_chu || data.notes || null,
  }));

const invoiceQuerySchema = v.object({
  page: v.coerce.number().int().min(1).default(1),
  pageSize: v.coerce.number().int().min(1).max(100).default(20),
  search: v.string().optional(),
  ma_hoa_don: v.string().optional(),
  ma_don_ban_hang: v.coerce.number().int().positive().optional(),
  ma_khach_hang: v.coerce.number().int().positive().optional(),
  trang_thai: invoiceStatusEnum.optional(),
  fromDate: v.string().optional(),
  toDate: v.string().optional(),
  dueFromDate: v.string().optional(),
  dueToDate: v.string().optional(),
  sortOrder: v.enum(['ASC', 'DESC']).default('DESC'),
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
    throw new ValidationError(
      'Validation failed for one or more query parameters.',
      parsed.error.errors
    );
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
  const parsed = createInvoiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError(
      'Validation failed for one or more request fields.',
      parsed.error.errors
    );
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
      throw new ValidationError(result.details || 'Số tiền đã thu không hợp lệ.');
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
