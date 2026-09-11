import { z } from 'zod';
import {
  CustomerRecord,
  CustomerSummary,
  CustomerListFilters,
  CustomerStatus,
} from '../models/customer.model.js';
import { ICustomerRepository, customerRepository, CustomerListResult } from '../repositories/customer.repository.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';

export const customerTypeEnum = z.enum(['ca_nhan', 'to_chuc', 'dai_ly', 'xuat_khau']);
export const customerStatusEnum = z.enum(['hoat_dong', 'tam_khoa', 'ngung_giao_dich']);

export const createCustomerSchema = z.object({
  ten_khach_hang: z.string().min(1, 'Tên khách hàng không được để trống').max(200),
  loai_khach_hang: customerTypeEnum,
  ma_so_thue: z.string().max(20).optional().nullable(),
  so_dien_thoai: z.string().min(8, 'Số điện thoại phải từ 8 ký tự').max(20),
  email: z.string().email('Email không đúng định dạng').optional().nullable().or(z.literal('')),
  dia_chi: z.string().min(1, 'Địa chỉ không được để trống'),
  tinh_thanh_pho: z.string().min(1, 'Tỉnh/thành phố không được để trống'),
  nguoi_lien_he: z.string().max(150).optional().nullable(),
  han_muc_cong_no: z.coerce.number().min(0, 'Hạn mức công nợ phải lớn hơn hoặc bằng 0').default(0),
  so_ngay_cong_no: z.coerce.number().int().min(0, 'Số ngày công nợ phải lớn hơn hoặc bằng 0').default(0),
  ghi_chu: z.string().optional().nullable(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const updateCustomerStatusSchema = z.object({
  trang_thai: customerStatusEnum,
  ly_do: z.string().optional(),
});

export type UpdateCustomerStatusInput = z.infer<typeof updateCustomerStatusSchema>;

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  loai_khach_hang: customerTypeEnum.optional(),
  tinh_thanh_pho: z.string().optional(),
  trang_thai: customerStatusEnum.optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export class CustomerService {
  constructor(private readonly customerRepo: ICustomerRepository = customerRepository) {}

  async listCustomers(queryFilters: CustomerListFilters): Promise<CustomerListResult> {
    const parseResult = customerQuerySchema.safeParse(queryFilters);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more query parameters.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    return this.customerRepo.list(parseResult.data);
  }

  async getCustomerById(id: number): Promise<CustomerRecord> {
    const customer = await this.customerRepo.findById(id);
    if (!customer) {
      throw new NotFoundError('CUSTOMER_NOT_FOUND', `Không tìm thấy khách hàng có ID ${id}.`);
    }
    return customer;
  }

  async createCustomer(rawInput: unknown, creatorId: number): Promise<CustomerRecord> {
    const parseResult = createCustomerSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more request fields.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    const validated = parseResult.data;

    // Generate unique customer code with retry on collision
    let maKhachHang = '';
    let isUnique = false;
    let attempts = 0;
    const year = new Date().getFullYear();

    while (!isUnique && attempts < 5) {
      attempts++;
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      maKhachHang = `KH-${year}-${randomSuffix}`;
      const existing = await this.customerRepo.findByCode(maKhachHang);
      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      throw new ConflictError('DATABASE_CONFLICT', 'Không thể tạo mã khách hàng duy nhất. Vui lòng thử lại.');
    }

    const newCustomer = await this.customerRepo.create({
      ma_khach_hang: maKhachHang,
      ten_khach_hang: validated.ten_khach_hang.trim(),
      loai_khach_hang: validated.loai_khach_hang,
      ma_so_thue: validated.ma_so_thue ? validated.ma_so_thue.trim() : null,
      so_dien_thoai: validated.so_dien_thoai.trim(),
      email: validated.email ? validated.email.trim().toLowerCase() : null,
      dia_chi: validated.dia_chi.trim(),
      tinh_thanh_pho: validated.tinh_thanh_pho.trim(),
      nguoi_lien_he: validated.nguoi_lien_he ? validated.nguoi_lien_he.trim() : null,
      han_muc_cong_no: validated.han_muc_cong_no,
      so_ngay_cong_no: validated.so_ngay_cong_no,
      ghi_chu: validated.ghi_chu ? validated.ghi_chu.trim() : null,
      trang_thai: 'hoat_dong',
      nguoi_tao: creatorId,
      nguoi_cap_nhat: creatorId,
    });

    return newCustomer;
  }

  async updateCustomer(id: number, rawInput: unknown, updaterId: number): Promise<CustomerRecord> {
    await this.getCustomerById(id); // Throws if not found

    const parseResult = updateCustomerSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more request fields.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    const validated = parseResult.data;

    // Prepare clean update payload
    const updatePayload: Partial<CustomerRecord> = {};
    if (validated.ten_khach_hang !== undefined) updatePayload.ten_khach_hang = validated.ten_khach_hang.trim();
    if (validated.loai_khach_hang !== undefined) updatePayload.loai_khach_hang = validated.loai_khach_hang;
    if (validated.ma_so_thue !== undefined) updatePayload.ma_so_thue = validated.ma_so_thue ? validated.ma_so_thue.trim() : null;
    if (validated.so_dien_thoai !== undefined) updatePayload.so_dien_thoai = validated.so_dien_thoai.trim();
    if (validated.email !== undefined) updatePayload.email = validated.email ? validated.email.trim().toLowerCase() : null;
    if (validated.dia_chi !== undefined) updatePayload.dia_chi = validated.dia_chi.trim();
    if (validated.tinh_thanh_pho !== undefined) updatePayload.tinh_thanh_pho = validated.tinh_thanh_pho.trim();
    if (validated.nguoi_lien_he !== undefined) updatePayload.nguoi_lien_he = validated.nguoi_lien_he ? validated.nguoi_lien_he.trim() : null;
    if (validated.han_muc_cong_no !== undefined) updatePayload.han_muc_cong_no = validated.han_muc_cong_no;
    if (validated.so_ngay_cong_no !== undefined) updatePayload.so_ngay_cong_no = validated.so_ngay_cong_no;
    if (validated.ghi_chu !== undefined) updatePayload.ghi_chu = validated.ghi_chu ? validated.ghi_chu.trim() : null;

    const updated = await this.customerRepo.update(id, updatePayload, updaterId);
    if (!updated) {
      throw new NotFoundError('CUSTOMER_NOT_FOUND', `Không tìm thấy khách hàng có ID ${id}.`);
    }
    return updated;
  }

  async updateCustomerStatus(id: number, rawInput: unknown, updaterId: number): Promise<CustomerRecord> {
    await this.getCustomerById(id); // Throws if not found

    const parseResult = updateCustomerStatusSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more request fields.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    const validated = parseResult.data;

    const updated = await this.customerRepo.updateStatus(id, validated.trang_thai, updaterId);
    if (!updated) {
      throw new NotFoundError('CUSTOMER_NOT_FOUND', `Không tìm thấy khách hàng có ID ${id}.`);
    }
    return updated;
  }

  async getCustomerSummary(id: number): Promise<CustomerSummary> {
    await this.getCustomerById(id); // Throws if not found
    return this.customerRepo.getSummary(id);
  }
}

export const customerService = new CustomerService();
