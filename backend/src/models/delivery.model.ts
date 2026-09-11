export type DeliveryStatus = 'cho_giao' | 'dang_giao' | 'da_giao' | 'that_bai';

export interface DeliveryRecord {
  id: number;
  ma_giao_hang: string;
  ma_don_ban_hang: number;
  ma_don_ban?: string;
  ten_khach_hang?: string;
  ma_kho: number;
  ten_kho?: string;
  ngay_giao: Date;
  ten_nguoi_nhan: string;
  dia_chi_giao: string;
  phuong_tien_van_chuyen: string | null;
  nguoi_giao_hang: number | null;
  ten_nguoi_giao?: string;
  ghi_chu: string | null;
  trang_thai: DeliveryStatus;
  ngay_tao: Date;
  ngay_cap_nhat: Date;
  nguoi_tao: number | null;
  nguoi_cap_nhat: number | null;
}

export interface DeliveryListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  ma_don_ban_hang?: number;
  ma_kho?: number;
  trang_thai?: DeliveryStatus;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const ALLOWED_DELIVERY_SORT_COLUMNS = [
  'id',
  'ma_giao_hang',
  'ngay_giao',
  'trang_thai',
  'ngay_tao',
] as const;

export type DeliverySortColumn = (typeof ALLOWED_DELIVERY_SORT_COLUMNS)[number];
