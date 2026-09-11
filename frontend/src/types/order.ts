export type OrderStatus = 'cho_xac_nhan' | 'da_xac_nhan' | 'dang_san_xuat' | 'da_giao' | 'huy';
export type OrderLineStatus = 'chua_giao' | 'giao_mot_phan' | 'da_giao_du';

export interface OrderLine {
  id: number;
  ma_don_ban_hang: number;
  ma_san_pham: number;
  ten_san_pham?: string;
  ma_san_pham_code?: string;
  ten_don_vi?: string;
  so_luong: number;
  don_gia: number | string;
  ty_le_giam_gia: number | string;
  thanh_tien: number | string;
  so_luong_giao: number | string;
  ghi_chu: string | null;
  trang_thai: OrderLineStatus;
}

export interface Order {
  id: number;
  ma_don_ban: string;
  ma_khach_hang: number;
  ten_khach_hang?: string;
  ma_khach_hang_code?: string;
  ngay_dat_hang: string;
  ngay_giao_hang_yc: string;
  ngay_giao_thuc_te: string | null;
  dia_chi_giao_hang: string;
  tong_tien_hang: number | string;
  tien_thue: number | string;
  tien_giam_gia: number | string;
  tong_thanh_toan: number | string;
  nguoi_ban: number | null;
  ten_nguoi_ban?: string;
  trang_thai: OrderStatus;
  ghi_chu: string | null;
  ngay_tao: string;
  ngay_cap_nhat: string;
  lines?: OrderLine[];
}

export interface CreateOrderLinePayload {
  ma_san_pham: number;
  so_luong: number;
  ty_le_giam_gia?: number;
  ghi_chu?: string | null;
}

export interface CreateOrderPayload {
  ma_khach_hang: number;
  ngay_dat_hang: string;
  ngay_giao_hang_yc: string;
  dia_chi_giao_hang: string;
  ghi_chu?: string | null;
  lines: CreateOrderLinePayload[];
}

export interface OrderQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  ma_khach_hang?: number;
  trang_thai?: OrderStatus;
  nguoi_ban?: number;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
