import { z } from 'zod';
import {
  DeliveryRecord,
  DeliveryListFilters,
} from '../models/delivery.model.js';
import { IDeliveryRepository, deliveryRepository, DeliveryListResult } from '../repositories/delivery.repository.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AppError,
} from '../utils/errors.js';

export const deliveryStatusEnum = z.enum(['cho_giao', 'dang_giao', 'da_giao', 'that_bai']);

export const createDeliverySchema = z
  .object({
    ma_don_ban_hang: z.coerce.number().int().positive().optional(),
    orderId: z.coerce.number().int().positive().optional(),
    ma_kho: z.coerce.number().int().positive().optional(),
    warehouseId: z.coerce.number().int().positive().optional(),
    ngay_giao: z.string().optional(),
    deliveryDate: z.string().optional(),
    ten_nguoi_nhan: z.string().max(150).optional(),
    receiverName: z.string().max(150).optional(),
    dia_chi_giao: z.string().optional(),
    deliveryAddress: z.string().optional(),
    phuong_tien_van_chuyen: z.string().optional().nullable(),
    transportMethod: z.string().optional().nullable(),
    nguoi_giao_hang: z.coerce.number().int().positive().optional().nullable(),
    deliveryPersonId: z.coerce.number().int().positive().optional().nullable(),
    ghi_chu: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const orderId = data.ma_don_ban_hang || data.orderId;
    if (!orderId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mã đơn hàng là bắt buộc', path: ['ma_don_ban_hang'] });
    }
    const warehouseId = data.ma_kho || data.warehouseId;
    if (!warehouseId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Kho xuất hàng là bắt buộc', path: ['ma_kho'] });
    }
    const dateStr = data.ngay_giao || data.deliveryDate;
    if (!dateStr || dateStr.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ngày giao hàng là bắt buộc', path: ['ngay_giao'] });
    } else {
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ngày giao hàng không hợp lệ', path: ['ngay_giao'] });
      }
    }
    const receiver = data.ten_nguoi_nhan || data.receiverName;
    if (!receiver || receiver.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Tên người nhận là bắt buộc', path: ['ten_nguoi_nhan'] });
    }
    const address = data.dia_chi_giao || data.deliveryAddress;
    if (!address || address.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Địa chỉ giao hàng là bắt buộc', path: ['dia_chi_giao'] });
    }
  })
  .transform((data) => ({
    ma_don_ban_hang: (data.ma_don_ban_hang || data.orderId) as number,
    ma_kho: (data.ma_kho || data.warehouseId) as number,
    ngay_giao: (data.ngay_giao || data.deliveryDate) as string,
    ten_nguoi_nhan: (data.ten_nguoi_nhan || data.receiverName) as string,
    dia_chi_giao: (data.dia_chi_giao || data.deliveryAddress) as string,
    phuong_tien_van_chuyen: data.phuong_tien_van_chuyen || data.transportMethod || null,
    nguoi_giao_hang: data.nguoi_giao_hang || data.deliveryPersonId || null,
    ghi_chu: data.ghi_chu || data.notes || null,
  }));

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;

export const failDeliverySchema = z
  .object({
    ly_do: z.string().optional(),
    reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const reason = data.ly_do || data.reason;
    if (!reason || reason.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Lý do giao hàng thất bại là bắt buộc', path: ['ly_do'] });
    }
  })
  .transform((data) => ({
    ly_do: (data.ly_do || data.reason) as string,
  }));

export type FailDeliveryInput = z.infer<typeof failDeliverySchema>;

export const deliveryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  ma_don_ban_hang: z.coerce.number().int().positive().optional(),
  ma_kho: z.coerce.number().int().positive().optional(),
  trang_thai: deliveryStatusEnum.optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export class DeliveryService {
  constructor(private readonly deliveryRepo: IDeliveryRepository = deliveryRepository) {}

  async listDeliveries(queryFilters: DeliveryListFilters): Promise<DeliveryListResult> {
    const parseResult = deliveryQuerySchema.safeParse(queryFilters);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more query parameters.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    return this.deliveryRepo.list(parseResult.data);
  }

  async getDeliveryById(id: number): Promise<DeliveryRecord> {
    const delivery = await this.deliveryRepo.findById(id);
    if (!delivery) {
      throw new NotFoundError('DELIVERY_NOT_FOUND', `Không tìm thấy đợt giao hàng có ID ${id}.`);
    }
    return delivery;
  }

  async createDelivery(rawInput: unknown, creatorId: number): Promise<DeliveryRecord> {
    // Explicitly reject deliveredLines if submitted to guard the interim header-only scope
    if (rawInput && typeof rawInput === 'object' && 'deliveredLines' in rawInput) {
      throw new AppError(
        422,
        'DELIVERY_LINES_UNSUPPORTED',
        'Chi tiết sản phẩm giao hàng từng phần chưa được hỗ trợ trong mô hình cơ sở dữ liệu hiện tại (Q11).'
      );
    }

    const parseResult = createDeliverySchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more request fields.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    const input = parseResult.data;

    // Validate Order
    const order = await this.deliveryRepo.checkOrderForDelivery(input.ma_don_ban_hang);
    if (!order) {
      throw new NotFoundError('ORDER_NOT_FOUND', 'Đơn hàng không tồn tại.');
    }
    if (order.trang_thai === 'huy') {
      throw new AppError(422, 'ORDER_INVALID_STATE', 'Không thể tạo đợt giao hàng cho đơn hàng đã bị hủy.');
    }

    // Validate Warehouse
    const isWarehouseValid = await this.deliveryRepo.checkWarehouseActive(input.ma_kho);
    if (!isWarehouseValid) {
      throw new NotFoundError('WAREHOUSE_NOT_FOUND', 'Kho hàng xuất kho không tồn tại hoặc đã ngừng hoạt động.');
    }

    // Generate unique delivery code
    let maGiaoHang = '';
    let isUnique = false;
    let attempts = 0;
    const year = new Date().getFullYear();

    while (!isUnique && attempts < 5) {
      attempts++;
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      maGiaoHang = `GH-${year}-${randomSuffix}`;
      const existing = await this.deliveryRepo.findByCode(maGiaoHang);
      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      throw new ConflictError('DATABASE_CONFLICT', 'Không thể tạo mã giao hàng duy nhất. Vui lòng thử lại.');
    }

    const delivery = await this.deliveryRepo.create({
      ma_giao_hang: maGiaoHang,
      ma_don_ban_hang: input.ma_don_ban_hang,
      ma_kho: input.ma_kho,
      ngay_giao: new Date(input.ngay_giao),
      ten_nguoi_nhan: input.ten_nguoi_nhan.trim(),
      dia_chi_giao: input.dia_chi_giao.trim(),
      phuong_tien_van_chuyen: input.phuong_tien_van_chuyen ? input.phuong_tien_van_chuyen.trim() : null,
      nguoi_giao_hang: input.nguoi_giao_hang || null,
      ghi_chu: input.ghi_chu ? input.ghi_chu.trim() : null,
      creatorId,
    });

    return delivery;
  }

  async startDelivery(id: number, updaterId: number): Promise<DeliveryRecord> {
    const res = await this.deliveryRepo.transitionStatus(id, 'cho_giao', 'dang_giao', updaterId);
    if (!res.currentRecord) {
      throw new NotFoundError('DELIVERY_NOT_FOUND', `Không tìm thấy đợt giao hàng có ID ${id}.`);
    }
    if (!res.success) {
      throw new AppError(
        422,
        'DELIVERY_INVALID_STATE',
        `Chỉ đợt giao hàng ở trạng thái "Chờ giao" mới có thể bắt đầu vận chuyển (Hiện tại: "${res.currentRecord.trang_thai}").`
      );
    }
    return res.currentRecord;
  }

  async completeDelivery(id: number, updaterId: number): Promise<DeliveryRecord> {
    const res = await this.deliveryRepo.transitionStatus(id, 'dang_giao', 'da_giao', updaterId);
    if (!res.currentRecord) {
      throw new NotFoundError('DELIVERY_NOT_FOUND', `Không tìm thấy đợt giao hàng có ID ${id}.`);
    }
    if (!res.success) {
      if (res.currentRecord.trang_thai === 'da_giao') {
        throw new AppError(
          409,
          'DELIVERY_INVALID_STATE',
          'Đợt giao hàng này đã được xác nhận hoàn thành trước đó. Không thể hoàn thành lại.'
        );
      }
      if (res.currentRecord.trang_thai === 'cho_giao') {
        throw new AppError(
          422,
          'DELIVERY_INVALID_STATE',
          'Đợt giao hàng phải được chuyển sang trạng thái "Đang giao" trước khi xác nhận hoàn thành.'
        );
      }
      throw new AppError(
        422,
        'DELIVERY_INVALID_STATE',
        `Không thể hoàn thành đợt giao hàng đã ở trạng thái "${res.currentRecord.trang_thai}".`
      );
    }
    return res.currentRecord;
  }

  async failDelivery(id: number, rawInput: unknown, updaterId: number): Promise<DeliveryRecord> {
    const parseResult = failDeliverySchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more request fields.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    const { ly_do } = parseResult.data;

    const delivery = await this.getDeliveryById(id);
    const failureNote = delivery.ghi_chu
      ? `${delivery.ghi_chu} | [THẤT BẠI: ${ly_do.trim()}]`
      : `[THẤT BẠI: ${ly_do.trim()}]`;

    const res = await this.deliveryRepo.transitionStatus(id, 'dang_giao', 'that_bai', updaterId, {
      ghi_chu: failureNote,
    });
    if (!res.currentRecord) {
      throw new NotFoundError('DELIVERY_NOT_FOUND', `Không tìm thấy đợt giao hàng có ID ${id}.`);
    }
    if (!res.success) {
      throw new AppError(
        422,
        'DELIVERY_INVALID_STATE',
        `Chỉ đợt giao hàng đang vận chuyển mới có thể đánh dấu thất bại (Hiện tại: "${res.currentRecord.trang_thai}").`
      );
    }
    return res.currentRecord;
  }
}

export const deliveryService = new DeliveryService();
