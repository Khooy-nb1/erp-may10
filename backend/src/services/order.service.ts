import { z } from 'zod';
import { env } from '../config/env.js';
import {
  OrderRecord,
  OrderListFilters,
  OrderStatus,
} from '../models/order.model.js';
import { IOrderRepository, orderRepository, OrderListResult } from '../repositories/order.repository.js';
import { ICustomerRepository, customerRepository } from '../repositories/customer.repository.js';
import { IProductRepository, productRepository } from '../repositories/product.repository.js';
import { calculateOrderTotals } from '../utils/pricing.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AppError,
  ForbiddenError,
} from '../utils/errors.js';

export const orderLineInputSchema = z.object({
  ma_san_pham: z.coerce.number().int().positive('Mã sản phẩm không hợp lệ'),
  so_luong: z.coerce.number().positive('Số lượng đặt phải lớn hơn 0'),
  ty_le_giam_gia: z.coerce.number().min(0, 'Chiết khấu không được âm').max(100, 'Chiết khấu tối đa 100%').default(0),
  ghi_chu: z.string().optional().nullable(),
});

export const createOrderSchema = z
  .object({
    ma_khach_hang: z.coerce.number().int().positive('Vui lòng chọn khách hàng'),
    ngay_dat_hang: z.string().min(1, 'Ngày đặt hàng là bắt buộc'),
    ngay_giao_hang_yc: z.string().min(1, 'Ngày giao hàng yêu cầu là bắt buộc'),
    dia_chi_giao_hang: z.string().min(1, 'Địa chỉ giao hàng không được để trống'),
    ghi_chu: z.string().optional().nullable(),
    lines: z.array(orderLineInputSchema).min(1, 'Đơn hàng phải có ít nhất một dòng sản phẩm'),
  })
  .refine(
    (data) => {
      const orderDate = new Date(data.ngay_dat_hang);
      const deliveryDate = new Date(data.ngay_giao_hang_yc);
      return deliveryDate >= orderDate;
    },
    {
      message: 'Ngày giao hàng yêu cầu không được trước ngày đặt hàng',
      path: ['ngay_giao_hang_yc'],
    }
  );

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderSchema = z.object({
  ngay_giao_hang_yc: z.string().optional(),
  dia_chi_giao_hang: z.string().min(1).optional(),
  ghi_chu: z.string().optional().nullable(),
  lines: z.array(orderLineInputSchema).min(1).optional(),
});

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

export const confirmOrderSchema = z.object({
  acknowledgeCreditLimit: z.boolean().optional().default(false),
});

export type ConfirmOrderInput = z.infer<typeof confirmOrderSchema>;

export const cancelOrderSchema = z.object({
  ly_do: z.string().min(1, 'Lý do hủy đơn hàng là bắt buộc'),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  ma_khach_hang: z.coerce.number().int().positive().optional(),
  trang_thai: z.enum(['cho_xac_nhan', 'da_xac_nhan', 'dang_san_xuat', 'da_giao', 'huy']).optional(),
  nguoi_ban: z.coerce.number().int().positive().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export class OrderService {
  constructor(
    private readonly orderRepo: IOrderRepository = orderRepository,
    private readonly customerRepo: ICustomerRepository = customerRepository,
    private readonly productRepo: IProductRepository = productRepository
  ) {}

  async listOrders(queryFilters: OrderListFilters): Promise<OrderListResult> {
    const parseResult = orderQuerySchema.safeParse(queryFilters);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more query parameters.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    return this.orderRepo.list(parseResult.data);
  }

  async getOrderById(id: number): Promise<OrderRecord> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundError('ORDER_NOT_FOUND', `Không tìm thấy đơn bán hàng có ID ${id}.`);
    }
    return order;
  }

  async createOrder(rawInput: unknown, sellerId: number): Promise<OrderRecord> {
    const parseResult = createOrderSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more request fields.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    const input = parseResult.data;

    // 1. Validate Customer
    const customer = await this.customerRepo.findById(input.ma_khach_hang);
    if (!customer) {
      throw new NotFoundError('CUSTOMER_NOT_FOUND', 'Khách hàng không tồn tại.');
    }
    if (customer.trang_thai !== 'hoat_dong') {
      throw new AppError(
        422,
        'CUSTOMER_INACTIVE',
        'Khách hàng đang ở trạng thái tạm khóa hoặc ngừng giao dịch. Không thể tạo đơn hàng mới.'
      );
    }

    // 2. Validate Products and fetch authoritative prices
    const linePriceInputs: Array<{
      ma_san_pham: number;
      so_luong: number;
      don_gia: number;
      ty_le_giam_gia?: number;
      ghi_chu?: string | null;
    }> = [];

    for (const line of input.lines) {
      const product = await this.productRepo.findById(line.ma_san_pham);
      if (!product) {
        throw new NotFoundError('PRODUCT_NOT_FOUND', `Sản phẩm có ID ${line.ma_san_pham} không tồn tại.`);
      }
      if (product.trang_thai !== 'dang_ban') {
        throw new AppError(
          422,
          'PRODUCT_NOT_SELLABLE',
          `Sản phẩm "${product.ten_san_pham}" không ở trạng thái sẵn sàng bán.`
        );
      }
      linePriceInputs.push({
        ma_san_pham: product.id,
        so_luong: line.so_luong,
        don_gia: Number(product.gia_ban), // Authoritative price from DB
        ty_le_giam_gia: line.ty_le_giam_gia,
        ghi_chu: line.ghi_chu,
      });
    }

    // 3. Recalculate totals server-side
    const totals = calculateOrderTotals(linePriceInputs, env.TAX_RATE);

    // 4. Generate unique order code
    let maDonBan = '';
    let isUnique = false;
    let attempts = 0;
    const year = new Date().getFullYear();

    while (!isUnique && attempts < 5) {
      attempts++;
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      maDonBan = `DBH-${year}-${randomSuffix}`;
      const existing = await this.orderRepo.findByCode(maDonBan);
      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      throw new ConflictError('DATABASE_CONFLICT', 'Không thể tạo mã đơn hàng duy nhất. Vui lòng thử lại.');
    }

    // 5. Insert order and lines atomically
    const order = await this.orderRepo.create({
      ma_don_ban: maDonBan,
      ma_khach_hang: input.ma_khach_hang,
      ngay_dat_hang: new Date(input.ngay_dat_hang),
      ngay_giao_hang_yc: new Date(input.ngay_giao_hang_yc),
      dia_chi_giao_hang: input.dia_chi_giao_hang.trim(),
      tong_tien_hang: totals.tong_tien_hang,
      tien_thue: totals.tien_thue,
      tien_giam_gia: totals.tien_giam_gia,
      tong_thanh_toan: totals.tong_thanh_toan,
      nguoi_ban: sellerId,
      ghi_chu: input.ghi_chu ? input.ghi_chu.trim() : null,
      creatorId: sellerId,
      lines: totals.lines,
    });

    return order;
  }

  async updateOrder(id: number, rawInput: unknown, updaterId: number): Promise<OrderRecord> {
    const existingOrder = await this.getOrderById(id);

    // Only cho_xac_nhan orders can be commercially edited
    if (existingOrder.trang_thai !== 'cho_xac_nhan') {
      throw new AppError(
        422,
        'ORDER_INVALID_STATE',
        `Không thể chỉnh sửa đơn hàng ở trạng thái "${existingOrder.trang_thai}".`
      );
    }

    const parseResult = updateOrderSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more request fields.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    const input = parseResult.data;

    let calculatedTotals = null;
    if (input.lines && input.lines.length > 0) {
      const linePriceInputs = [];
      for (const line of input.lines) {
        const product = await this.productRepo.findById(line.ma_san_pham);
        if (!product) {
          throw new NotFoundError('PRODUCT_NOT_FOUND', `Sản phẩm có ID ${line.ma_san_pham} không tồn tại.`);
        }
        if (product.trang_thai !== 'dang_ban') {
          throw new AppError(
            422,
            'PRODUCT_NOT_SELLABLE',
            `Sản phẩm "${product.ten_san_pham}" không ở trạng thái sẵn sàng bán.`
          );
        }
        linePriceInputs.push({
          ma_san_pham: product.id,
          so_luong: line.so_luong,
          don_gia: Number(product.gia_ban),
          ty_le_giam_gia: line.ty_le_giam_gia,
          ghi_chu: line.ghi_chu,
        });
      }
      calculatedTotals = calculateOrderTotals(linePriceInputs, env.TAX_RATE);
    }

    const headerUpdates: Record<string, unknown> = {};
    if (input.ngay_giao_hang_yc) headerUpdates.ngay_giao_hang_yc = new Date(input.ngay_giao_hang_yc);
    if (input.dia_chi_giao_hang) headerUpdates.dia_chi_giao_hang = input.dia_chi_giao_hang.trim();
    if (input.ghi_chu !== undefined) headerUpdates.ghi_chu = input.ghi_chu ? input.ghi_chu.trim() : null;

    if (calculatedTotals) {
      headerUpdates.tong_tien_hang = calculatedTotals.tong_tien_hang;
      headerUpdates.tien_thue = calculatedTotals.tien_thue;
      headerUpdates.tien_giam_gia = calculatedTotals.tien_giam_gia;
      headerUpdates.tong_thanh_toan = calculatedTotals.tong_thanh_toan;
    }

    const updated = await this.orderRepo.update(
      id,
      headerUpdates,
      calculatedTotals ? calculatedTotals.lines : null,
      updaterId
    );

    if (!updated) {
      throw new NotFoundError('ORDER_NOT_FOUND', `Không tìm thấy đơn bán hàng có ID ${id}.`);
    }

    return updated;
  }

  async confirmOrder(id: number, rawInput: unknown, updaterId: number): Promise<OrderRecord> {
    const order = await this.getOrderById(id);

    if (order.trang_thai !== 'cho_xac_nhan') {
      throw new AppError(
        422,
        'ORDER_INVALID_STATE',
        `Chỉ đơn hàng ở trạng thái "Chờ xác nhận" mới có thể xác nhận.`
      );
    }

    const customer = await this.customerRepo.findById(order.ma_khach_hang);
    if (!customer) {
      throw new NotFoundError('CUSTOMER_NOT_FOUND', 'Khách hàng không tồn tại.');
    }
    if (customer.trang_thai !== 'hoat_dong') {
      throw new AppError(
        422,
        'CUSTOMER_INACTIVE',
        'Khách hàng không ở trạng thái hoạt động. Không thể xác nhận đơn hàng.'
      );
    }

    const parseResult = confirmOrderSchema.safeParse(rawInput);
    const input = parseResult.success ? parseResult.data : { acknowledgeCreditLimit: false };

    // Credit Limit Control Check (Section 5.6)
    const creditLimit = Number(customer.han_muc_cong_no) || 0;
    if (creditLimit > 0) {
      const currentOutstanding = await this.orderRepo.getCustomerOutstanding(customer.id);
      const projectedExposure = currentOutstanding + Number(order.tong_thanh_toan);

      if (projectedExposure > creditLimit) {
        if (env.CREDIT_LIMIT_MODE === 'hard_block') {
          throw new AppError(
            422,
            'CUSTOMER_CREDIT_LIMIT_EXCEEDED',
            `Tổng công nợ dự kiến (${projectedExposure.toLocaleString('vi-VN')} VNĐ) vượt quá hạn mức tín dụng (${creditLimit.toLocaleString('vi-VN')} VNĐ). Chính sách yêu cầu chặn xác nhận.`
          );
        } else if (env.CREDIT_LIMIT_MODE === 'warning' && !input.acknowledgeCreditLimit) {
          throw new AppError(
            422,
            'CUSTOMER_CREDIT_LIMIT_EXCEEDED',
            `Cảnh báo: Đơn hàng vượt hạn mức tín dụng của khách hàng (${creditLimit.toLocaleString('vi-VN')} VNĐ). Cần xác nhận cảnh báo để tiếp tục.`,
            [{ field: 'acknowledgeCreditLimit', message: 'Cần xác nhận vượt hạn mức tín dụng.' }]
          );
        }
      }
    }

    const updated = await this.orderRepo.updateStatus(id, 'da_xac_nhan', updaterId);
    if (!updated) {
      throw new NotFoundError('ORDER_NOT_FOUND', `Không tìm thấy đơn bán hàng có ID ${id}.`);
    }

    return updated;
  }

  async cancelOrder(
    id: number,
    rawInput: unknown,
    updaterId: number,
    userRole: string
  ): Promise<OrderRecord> {
    const order = await this.getOrderById(id);

    if (order.trang_thai === 'huy' || order.trang_thai === 'da_giao') {
      throw new AppError(
        422,
        'ORDER_INVALID_STATE',
        `Không thể hủy đơn hàng đã ở trạng thái "${order.trang_thai}".`
      );
    }

    if (order.trang_thai === 'dang_san_xuat') {
      throw new AppError(
        422,
        'ORDER_INVALID_STATE',
        'Đơn hàng đang trong quá trình sản xuất. Không thể thực hiện hủy.'
      );
    }

    if (order.trang_thai === 'da_xac_nhan' && userRole !== 'admin') {
      throw new ForbiddenError(
        'Đơn hàng đã xác nhận chỉ có thể được hủy bởi Quản trị viên (Admin).'
      );
    }

    const parseResult = cancelOrderSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more request fields.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    const { ly_do } = parseResult.data;

    const cancellationNote = order.ghi_chu
      ? `${order.ghi_chu} | [HỦY ĐƠN: ${ly_do.trim()}]`
      : `[HỦY ĐƠN: ${ly_do.trim()}]`;

    const updated = await this.orderRepo.updateStatus(id, 'huy', updaterId, {
      ghi_chu: cancellationNote,
    });

    if (!updated) {
      throw new NotFoundError('ORDER_NOT_FOUND', `Không tìm thấy đơn bán hàng có ID ${id}.`);
    }

    return updated;
  }
}

export const orderService = new OrderService();
