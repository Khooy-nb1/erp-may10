'use strict';

const { v, isRealDate } = require('../../utils/sales/validate');
const {
  NotFoundError,
  ValidationError,
  ConflictError,
  AppError,
} = require('../../utils/sales/errors');
const {
  INVALID_BODY_MESSAGE,
  INVALID_QUERY_MESSAGE,
  assertNoAliasConflict,
  fieldIssues,
} = require('../../utils/sales/request');
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
    ma_don_ban_hang: v.coerce.number().int().positive('Mã đơn hàng không hợp lệ').optional(),
    orderId: v.coerce.number().int().positive('Mã đơn hàng không hợp lệ').optional(),
    ma_kho: v.coerce.number().int().positive('Mã kho không hợp lệ').optional(),
    warehouseId: v.coerce.number().int().positive('Mã kho không hợp lệ').optional(),
    ngay_giao: v.string().trim().max(40, 'Ngày giao hàng không hợp lệ').optional(),
    deliveryDate: v.string().trim().max(40, 'Ngày giao hàng không hợp lệ').optional(),
    ten_nguoi_nhan: v.string().trim().max(150, 'Tên người nhận tối đa 150 ký tự').optional(),
    receiverName: v.string().trim().max(150, 'Tên người nhận tối đa 150 ký tự').optional(),
    dia_chi_giao: v.string().trim().max(500, 'Địa chỉ giao hàng tối đa 500 ký tự').optional(),
    deliveryAddress: v.string().trim().max(500, 'Địa chỉ giao hàng tối đa 500 ký tự').optional(),
    phuong_tien_van_chuyen: v
      .string()
      .trim()
      .max(100, 'Phương tiện vận chuyển tối đa 100 ký tự')
      .optional()
      .nullable(),
    transportMethod: v
      .string()
      .trim()
      .max(100, 'Phương tiện vận chuyển tối đa 100 ký tự')
      .optional()
      .nullable(),
    nguoi_giao_hang: v.coerce.number().int().positive('Người giao hàng không hợp lệ').optional().nullable(),
    deliveryPersonId: v.coerce.number().int().positive('Người giao hàng không hợp lệ').optional().nullable(),
    ghi_chu: v.string().trim().max(2000, 'Ghi chú tối đa 2000 ký tự').optional().nullable(),
    notes: v.string().trim().max(2000, 'Ghi chú tối đa 2000 ký tự').optional().nullable(),
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
    } else if (!isRealDate(dateStr.trim())) {
      // A plain calendar day only: a timestamp would silently pick a day in a
      // timezone nobody agreed on, so the client must send `YYYY-MM-DD`.
      ctx.addIssue({ message: 'Ngày giao hàng không hợp lệ (YYYY-MM-DD)', path: ['ngay_giao'] });
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
    ly_do: v.string().trim().max(500, 'Lý do tối đa 500 ký tự').optional(),
    reason: v.string().trim().max(500, 'Lý do tối đa 500 ký tự').optional(),
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

const deliveryQuerySchema = v
  .object({
    page: v.coerce.number().int('Số trang phải là số nguyên').min(1, 'Số trang tối thiểu là 1').default(1),
    pageSize: v.coerce
      .number()
      .int('Kích thước trang phải là số nguyên')
      .min(1, 'Kích thước trang tối thiểu là 1')
      .max(100, 'Kích thước trang tối đa là 100')
      .default(20),
    search: v.string().trim().max(100, 'Từ khóa tìm kiếm tối đa 100 ký tự').optional(),
    ma_don_ban_hang: v.coerce.number().int().positive('Mã đơn hàng không hợp lệ').optional(),
    ma_kho: v.coerce.number().int().positive('Mã kho không hợp lệ').optional(),
    trang_thai: deliveryStatusEnum.optional(),
    sortBy: v.string().trim().max(64, 'Cột sắp xếp không hợp lệ').optional(),
    sortOrder: v.enum(['ASC', 'DESC'], 'Thứ tự sắp xếp không hợp lệ').default('DESC'),
  })

function createDeliveryService(repository = deliveryRepository) {
  async function listDeliveries(queryFilters = {}) {
    const parseResult = deliveryQuerySchema.safeParse(queryFilters);
    if (!parseResult.success) {
      throw new ValidationError(INVALID_QUERY_MESSAGE, fieldIssues(parseResult.error.errors));
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

    assertNoAliasConflict(rawInput, [
      ['ma_don_ban_hang', 'orderId'],
      ['ma_kho', 'warehouseId'],
      ['ngay_giao', 'deliveryDate'],
      ['ten_nguoi_nhan', 'receiverName'],
      ['dia_chi_giao', 'deliveryAddress'],
      ['phuong_tien_van_chuyen', 'transportMethod'],
      ['nguoi_giao_hang', 'deliveryPersonId'],
      ['ghi_chu', 'notes'],
    ]);

    const parseResult = createDeliverySchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(INVALID_BODY_MESSAGE, fieldIssues(parseResult.error.errors));
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
    assertNoAliasConflict(rawInput, [['ly_do', 'reason']]);

    const parseResult = failDeliverySchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(INVALID_BODY_MESSAGE, fieldIssues(parseResult.error.errors));
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
