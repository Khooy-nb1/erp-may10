export type InvoiceStatus = 'chua_thanh_toan' | 'thanh_toan_mot_phan' | 'da_thanh_toan' | 'qua_han';

export interface Invoice {
  id: number;
  ma_hoa_don: string;
  ma_don_ban_hang: number;
  ma_don_ban?: string;
  ma_khach_hang: number;
  ten_khach_hang?: string;
  ma_khach_hang_code?: string;
  ngay_xuat_hoa_don: string;
  ngay_dao_han: string;
  tong_tien_truoc_thue: number | string;
  tien_thue: number | string;
  tong_tien_sau_thue: number | string;
  so_tien_da_thu: number | string;
  trang_thai: InvoiceStatus;
  ghi_chu: string | null;
  ngay_tao: string;
  ngay_cap_nhat: string;
}

export interface CreateInvoicePayload {
  ma_don_ban_hang: number;
  ngay_xuat_hoa_don?: string;
  so_tien_da_thu?: number;
  ghi_chu?: string | null;
}

export interface InvoiceQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  ma_don_ban_hang?: number;
  ma_khach_hang?: number;
  trang_thai?: InvoiceStatus;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
