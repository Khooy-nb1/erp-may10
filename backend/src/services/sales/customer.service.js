'use strict';

const { v } = require('../../utils/sales/validate');
const { NotFoundError, ValidationError, ConflictError } = require('../../utils/sales/errors');
const customerRepository = require('../../repositories/sales/customer.repository');

/**
 * Customer service (ported from PH1 `services/customer.service.ts`).
 *
 * Behaviour preserved: request validation, the `KH-<year>-<6 digits>` code
 * generation with collision retry, trimming/normalisation of every text field,
 * and the 404/409/422 error mapping. Validation was migrated from `zod` to the
 * module-local validator (`utils/sales/validate.js`) because the frozen Core
 * backend has no `zod` dependency.
 */

const customerTypeEnum = v.enum(['ca_nhan', 'to_chuc', 'dai_ly', 'xuat_khau']);
const customerStatusEnum = v.enum(['hoat_dong', 'tam_khoa', 'ngung_giao_dich']);

const createCustomerSchema = v.object({
  ten_khach_hang: v.string().min(1, 'Tên khách hàng không được để trống').max(200),
  loai_khach_hang: customerTypeEnum,
  ma_so_thue: v.string().max(20).optional().nullable(),
  so_dien_thoai: v.string().min(8, 'Số điện thoại phải từ 8 ký tự').max(20),
  email: v.string().email('Email không đúng định dạng').optional().nullable().or(v.literal('')),
  dia_chi: v.string().min(1, 'Địa chỉ không được để trống'),
  tinh_thanh_pho: v.string().min(1, 'Tỉnh/thành phố không được để trống'),
  nguoi_lien_he: v.string().max(150).optional().nullable(),
  han_muc_cong_no: v.coerce.number().min(0, 'Hạn mức công nợ phải lớn hơn hoặc bằng 0').default(0),
  so_ngay_cong_no: v.coerce.number().int().min(0, 'Số ngày công nợ phải lớn hơn hoặc bằng 0').default(0),
  ghi_chu: v.string().optional().nullable(),
});

const updateCustomerSchema = createCustomerSchema.partial();

const updateCustomerStatusSchema = v.object({
  trang_thai: customerStatusEnum,
  ly_do: v.string().optional(),
});

const customerQuerySchema = v.object({
  page: v.coerce.number().int().min(1).default(1),
  pageSize: v.coerce.number().int().min(1).max(100).default(20),
  search: v.string().optional(),
  loai_khach_hang: customerTypeEnum.optional(),
  tinh_thanh_pho: v.string().optional(),
  trang_thai: customerStatusEnum.optional(),
  sortBy: v.string().optional(),
  sortOrder: v.enum(['ASC', 'DESC']).default('DESC'),
});

function validationDetails(issues) {
  return issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
}

function createCustomerService(repository = customerRepository) {
  async function listCustomers(queryFilters) {
    const parseResult = customerQuerySchema.safeParse(queryFilters);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more query parameters.',
        validationDetails(parseResult.error.errors)
      );
    }
    return repository.list(parseResult.data);
  }

  async function getCustomerById(id) {
    const customer = await repository.findById(id);
    if (!customer) {
      throw new NotFoundError('CUSTOMER_NOT_FOUND', `Không tìm thấy khách hàng có ID ${id}.`);
    }
    return customer;
  }

  async function createCustomer(rawInput, creatorId) {
    const parseResult = createCustomerSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more request fields.',
        validationDetails(parseResult.error.errors)
      );
    }
    const validated = parseResult.data;

    // Generate unique customer code with retry on collision
    let maKhachHang = '';
    let isUnique = false;
    let attempts = 0;
    const year = new Date().getFullYear();

    while (!isUnique && attempts < 5) {
      attempts += 1;
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      maKhachHang = `KH-${year}-${randomSuffix}`;
      const existing = await repository.findByCode(maKhachHang);
      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      throw new ConflictError('DATABASE_CONFLICT', 'Không thể tạo mã khách hàng duy nhất. Vui lòng thử lại.');
    }

    return repository.create({
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
  }

  async function updateCustomer(id, rawInput, updaterId) {
    await getCustomerById(id); // Throws if not found

    const parseResult = updateCustomerSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more request fields.',
        validationDetails(parseResult.error.errors)
      );
    }
    const validated = parseResult.data;

    // Prepare clean update payload
    const updatePayload = {};
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

    const updated = await repository.update(id, updatePayload, updaterId);
    if (!updated) {
      throw new NotFoundError('CUSTOMER_NOT_FOUND', `Không tìm thấy khách hàng có ID ${id}.`);
    }
    return updated;
  }

  async function updateCustomerStatus(id, rawInput, updaterId) {
    await getCustomerById(id); // Throws if not found

    const parseResult = updateCustomerStatusSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more request fields.',
        validationDetails(parseResult.error.errors)
      );
    }
    const validated = parseResult.data;

    const updated = await repository.updateStatus(id, validated.trang_thai, updaterId);
    if (!updated) {
      throw new NotFoundError('CUSTOMER_NOT_FOUND', `Không tìm thấy khách hàng có ID ${id}.`);
    }
    return updated;
  }

  async function getCustomerSummary(id) {
    await getCustomerById(id); // Throws if not found
    return repository.getSummary(id);
  }

  return {
    listCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    updateCustomerStatus,
    getCustomerSummary,
  };
}

const customerService = createCustomerService();

module.exports = {
  createCustomerService,
  customerService,
  customerTypeEnum,
  customerStatusEnum,
  createCustomerSchema,
  updateCustomerSchema,
  updateCustomerStatusSchema,
  customerQuerySchema,
};
