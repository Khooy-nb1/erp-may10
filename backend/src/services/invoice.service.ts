import { z } from 'zod';
import {
  InvoiceRecord,
  InvoiceListFilters,
  InvoiceStatus,
} from '../models/invoice.model.js';
import { IInvoiceRepository, invoiceRepository, InvoiceListResult } from '../repositories/invoice.repository.js';
import { IOrderRepository, orderRepository } from '../repositories/order.repository.js';
import { ICustomerRepository, customerRepository } from '../repositories/customer.repository.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AppError,
} from '../utils/errors.js';

export const invoiceStatusEnum = z.enum(['chua_thanh_toan', 'thanh_toan_mot_phan', 'da_thanh_toan', 'qua_han']);

export const createInvoiceSchema = z
  .object({
    ma_don_ban_hang: z.coerce.number().int().positive().optional(),
    orderId: z.coerce.number().int().positive().optional(),
    ma_khach_hang: z.coerce.number().int().positive().optional(),
    customerId: z.coerce.number().int().positive().optional(),
    ngay_xuat_hoa_don: z.string().optional(),
    issueDate: z.string().optional(),
    so_tien_da_thu: z.coerce.number().min(0, 'Số tiền đã thu không được âm').default(0),
    paidAmount: z.coerce.number().min(0).optional(),
    ghi_chu: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const orderId = data.ma_don_ban_hang || data.orderId;
    if (!orderId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mã đơn hàng là bắt buộc', path: ['ma_don_ban_hang'] });
    }
    const issueDateStr = data.ngay_xuat_hoa_don || data.issueDate;
    if (issueDateStr && issueDateStr.trim().length > 0) {
      const parsed = new Date(issueDateStr);
      if (isNaN(parsed.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ngày xuất hóa đơn không hợp lệ', path: ['ngay_xuat_hoa_don'] });
      }
    }
  })
  .transform((data) => ({
    ma_don_ban_hang: (data.ma_don_ban_hang || data.orderId) as number,
    ma_khach_hang: data.ma_khach_hang || data.customerId,
    ngay_xuat_hoa_don: data.ngay_xuat_hoa_don || data.issueDate || new Date().toISOString(),
    so_tien_da_thu: data.paidAmount !== undefined ? data.paidAmount : data.so_tien_da_thu,
    ghi_chu: data.ghi_chu || data.notes || null,
  }));

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  ma_hoa_don: z.string().optional(),
  ma_don_ban_hang: z.coerce.number().int().positive().optional(),
  ma_khach_hang: z.coerce.number().int().positive().optional(),
  trang_thai: invoiceStatusEnum.optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  dueFromDate: z.string().optional(),
  dueToDate: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export function calculateDueDate(issueDate: Date, creditDays: number): Date {
  const days = Math.max(0, creditDays || 0);
  return new Date(issueDate.getTime() + days * 24 * 60 * 60 * 1000);
}

export function deriveInvoiceStatus(paid: number, total: number, dueDate: Date): InvoiceStatus {
  if (paid >= total) {
    return 'da_thanh_toan';
  }
  const isOverdue = dueDate.getTime() < Date.now();
  if (paid > 0) {
    return isOverdue ? 'qua_han' : 'thanh_toan_mot_phan';
  }
  return isOverdue ? 'qua_han' : 'chua_thanh_toan';
}

export class InvoiceService {
  constructor(
    private readonly invoiceRepo: IInvoiceRepository = invoiceRepository,
    private readonly orderRepo: IOrderRepository = orderRepository,
    private readonly customerRepo: ICustomerRepository = customerRepository
  ) {}

  async listInvoices(queryFilters: InvoiceListFilters): Promise<InvoiceListResult> {
    const parseResult = invoiceQuerySchema.safeParse(queryFilters);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more query parameters.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    return this.invoiceRepo.list(parseResult.data);
  }

  async getInvoiceById(id: number): Promise<InvoiceRecord> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) {
      throw new NotFoundError('INVOICE_NOT_FOUND', `Không tìm thấy hóa đơn có ID ${id}.`);
    }
    return invoice;
  }

  async createInvoice(rawInput: unknown, creatorId: number): Promise<InvoiceRecord> {
    const parseResult = createInvoiceSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more request fields.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    const input = parseResult.data;

    const issueDate = new Date(input.ngay_xuat_hoa_don);

    const result = await this.invoiceRepo.createInvoiceAtomic({
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
}

export const invoiceService = new InvoiceService();
