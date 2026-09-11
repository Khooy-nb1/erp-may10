export type DeliveryStatus = 'cho_giao' | 'dang_giao' | 'da_giao' | 'that_bai';

export interface Delivery {
  id: number;
  ma_giao_hang: string;
  ma_don_ban_hang: number;
  ma_don_ban?: string;
  ten_khach_hang?: string;
  ma_kho: number;
  ten_kho?: string;
  ngay_giao: string;
  ten_nguoi_nhan: string;
  dia_chi_giao: string;
  phuong_tien_van_chuyen: string | null;
  nguoi_giao_hang: number | null;
  ten_nguoi_giao?: string;
  ghi_chu: string | null;
  trang_thai: DeliveryStatus;
  ngay_tao: string;
  ngay_cap_nhat: string;
}

export interface CreateDeliveryPayload {
  ma_don_ban_hang: number;
  ma_kho: number;
  ngay_giao: string;
  ten_nguoi_nhan: string;
  dia_chi_giao: string;
  phuong_tien_van_chuyen?: string | null;
  nguoi_giao_hang?: number | null;
  ghi_chu?: string | null;
}

export interface DeliveryQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  ma_don_ban_hang?: number;
  ma_kho?: number;
  trang_thai?: DeliveryStatus;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
