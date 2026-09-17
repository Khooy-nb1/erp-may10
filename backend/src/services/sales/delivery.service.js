'use strict';

const { v } = require('../../utils/sales/validate');
const {
  NotFoundError,
  ValidationError,
  ConflictError,
  AppError,
} = require('../../utils/sales/errors');
const deliveryRepository = require('../../repositories/sales/delivery.repository');

/**
 * Delivery service (ported from PH1 `services/delivery.service.ts`).
 *
 * Preserves the Vietnamese/English alias mapping via superRefine + transform,
 * rejection of deliveredLines (Q11 interim scope), GH-YYYY-XXXXXX code generation
 * with collision retry, and strict status transition validation.
 */

const deliveryStatusEnum = v.enum(['cho_giao', 'dang_giao', 'da_giao', 'that_bai']);

const createDeliverySchema = v
  .object({
    ma_don_ban_hang: v.coerce.number().int().positive().optional(),
    orderId: v.coerce.number().int().positive().optional(),
    ma_kho: v.coerce.number().int().positive().optional(),
    warehouseId: v.coerce.number().int().positive().optional(),
    ngay_giao: v.string().optional(),
    deliveryDate: v.string().optional(),
    ten_nguoi_nhan: v.string().max(150).optional(),
    receiverName: v.string().max(150).optional(),
    dia_chi_giao: v.string().optional(),
    deliveryAddress: v.string().optional(),
    phuong_tien_van_chuyen: v.string().optional().nullable(),
    transportMethod: v.string().optional().nullable(),
    nguoi_giao_hang: v.coerce.number().int().positive().optional().nullable(),
    deliveryPersonId: v.coerce.number().int().positive().optional().nullable(),
    ghi_chu: v.string().optional().nullable(),
    notes: v.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const orderId = data.ma_don_ban_hang || data.orderId;
    if (!orderId) {
      ctx.addIssue({ message: 'Mã đơn hàng là bắt buộc', path: ['ma_don_ban_hang'] });
    }
    const warehouseId = data.ma_kho || data.warehouseId;
    if (!warehouseId) {
      ctx.addIssue({ message: 'Kho xuất hàng là bắt buộc', path: ['ma_kho'] });
    }
    const dateStr = data.ngay_giao || data.deliveryDate;
    if (!dateStr || dateStr.trim().length === 0) {
      ctx.addIssue({ message: 'Ngày giao hàng là bắt buộc', path: ['ngay_giao'] });
    } else {
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        ctx.addIssue({ message: 'Ngày giao hàng không hợp lệ', path: ['ngay_giao'] });
      }
    }
    const receiver = data.ten_nguoi_nhan || data.receiverName;
    if (!receiver || receiver.trim().length === 0) {
      ctx.addIssue({ message: 'Tên người nhận là bắt buộc', path: ['ten_nguoi_nhan'] });
    }
    const address = data.dia_chi_giao || data.deliveryAddress;
    if (!address || address.trim().length === 0) {
      ctx.addIssue({ message: 'Địa chỉ giao hàng là bắt buộc', path: ['dia_chi_giao'] });
    }
  })
  .transform((data) => ({
    ma_don_ban_hang: data.ma_don_ban_hang || data.orderId,
    ma_kho: data.ma_kho || data.warehouseId,
    ngay_giao: data.ngay_giao || data.deliveryDate,
    ten_nguoi_nhan: data.ten_nguoi_nhan || data.receiverName,
    dia_chi_giao: data.dia_chi_giao || data.deliveryAddress,
    phuong_tien_van_chuyen: data.phuong_tien_van_chuyen || data.transportMethod || null,
    nguoi_giao_hang: data.nguoi_giao_hang || data.deliveryPersonId || null,
    ghi_chu: data.ghi_chu || data.notes || null,
  }));

const failDeliverySchema = v
  .object({
    ly_do: v.string().optional(),
    reason: v.string().optional(),
  })
  .superRefine((data, ctx) => {
    const reason = data.ly_do || data.reason;
    if (!reason || reason.trim().length === 0) {
      ctx.addIssue({ message: 'Lý do giao hàng thất bại là bắt buộc', path: ['ly_do'] });
    }
  })
  .transform((data) => ({
    ly_do: data.ly_do || data.reason,
  }));

const deliveryQuerySchema = v.object({
  page: v.coerce.number().int().min(1).default(1),
  pageSize: v.coerce.number().int().min(1).max(100).default(20),
  search: v.string().optional(),
  ma_don_ban_hang: v.coerce.number().int().positive().optional(),
  ma_kho: v.coerce.number().int().positive().optional(),
  trang_thai: deliveryStatusEnum.optional(),
  sortBy: v.string().optional(),
  sortOrder: v.enum(['ASC', 'DESC']).default('DESC'),
});

function validationDetails(issues) {
  return issues.map((e) => ({ field: e.path.join('.'), message: e.message }));
}

function createDeliveryService(repository = deliveryRepository) {
  async function listDeliveries(queryFilters = {}) {
    const parseResult = deliveryQuerySchema.safeParse(queryFilters);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more query parameters.',
        validationDetails(parseResult.error.errors)
      );
    }
    return repository.list(parseResult.data);
  }

  async function getDeliveryById(id) {
    const delivery = await repository.findById(id);
    if (!delivery) {
      throw new NotFoundError('DELIVERY_NOT_FOUND', `Không tìm thấy đợt giao hàng có ID ${id}.`);
    }
    return delivery;
  }

  async function createDelivery(rawInput, creatorId) {
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
        validationDetails(parseResult.error.errors)
      );
    }
    const input = parseResult.data;

    // Validate Order
    const order = await repository.checkOrderForDelivery(input.ma_don_ban_hang);
    if (!order) {
      throw new NotFoundError('ORDER_NOT_FOUND', 'Đơn hàng không tồn tại.');
    }
    if (order.trang_thai === 'huy') {
      throw new AppError(422, 'ORDER_INVALID_STATE', 'Không thể tạo đợt giao hàng cho đơn hàng đã bị hủy.');
    }

    // Validate Warehouse
    const isWarehouseValid = await repository.checkWarehouseActive(input.ma_kho);
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
      const existing = await repository.findByCode(maGiaoHang);
      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      throw new ConflictError('DATABASE_CONFLICT', 'Không thể tạo mã giao hàng duy nhất. Vui lòng thử lại.');
    }

    const delivery = await repository.create({
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

  async function startDelivery(id, updaterId) {
    const res = await repository.transitionStatus(id, 'cho_giao', 'dang_giao', updaterId);
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

  async function completeDelivery(id, updaterId) {
    const res = await repository.transitionStatus(id, 'dang_giao', 'da_giao', updaterId);
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

  async function failDelivery(id, rawInput, updaterId) {
    const parseResult = failDeliverySchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more request fields.',
        validationDetails(parseResult.error.errors)
      );
    }
    const { ly_do } = parseResult.data;

    const delivery = await getDeliveryById(id);
    const failureNote = delivery.ghi_chu
      ? `${delivery.ghi_chu} | [THẤT BẠI: ${ly_do.trim()}]`
      : `[THẤT BẠI: ${ly_do.trim()}]`;

    const res = await repository.transitionStatus(id, 'dang_giao', 'that_bai', updaterId, {
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

  return {
    listDeliveries,
    getDeliveryById,
    createDelivery,
    startDelivery,
    completeDelivery,
    failDelivery,
  };
}

const deliveryService = createDeliveryService();

module.exports = {
  createDeliveryService,
  deliveryService,
  deliveryStatusEnum,
  createDeliverySchema,
  failDeliverySchema,
  deliveryQuerySchema,
};
