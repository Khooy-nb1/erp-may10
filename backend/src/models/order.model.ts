export type OrderStatus = 'cho_xac_nhan' | 'da_xac_nhan' | 'dang_san_xuat' | 'da_giao' | 'huy';
export type OrderLineStatus = 'chua_giao' | 'giao_mot_phan' | 'da_giao_du';

export interface OrderLineRecord {
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
  ngay_tao?: Date;
  nguoi_tao?: number | null;
}

export interface OrderRecord {
  id: number;
  ma_don_ban: string;
  ma_khach_hang: number;
  ten_khach_hang?: string;
  ma_khach_hang_code?: string;
  ngay_dat_hang: Date;
  ngay_giao_hang_yc: Date;
  ngay_giao_thuc_te: Date | null;
  dia_chi_giao_hang: string;
  tong_tien_hang: number | string;
  tien_thue: number | string;
  tien_giam_gia: number | string;
  tong_thanh_toan: number | string;
  nguoi_ban: number | null;
  ten_nguoi_ban?: string;
  trang_thai: OrderStatus;
  ghi_chu: string | null;
  ngay_tao: Date;
  ngay_cap_nhat: Date;
  nguoi_tao: number | null;
  nguoi_cap_nhat: number | null;
  lines?: OrderLineRecord[];
}

export interface OrderListFilters {
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

export const ALLOWED_ORDER_SORT_COLUMNS = [
  'id',
  'ma_don_ban',
  'ngay_dat_hang',
  'ngay_giao_hang_yc',
  'tong_thanh_toan',
  'trang_thai',
  'ngay_tao',
] as const;

export type OrderSortColumn = (typeof ALLOWED_ORDER_SORT_COLUMNS)[number];
