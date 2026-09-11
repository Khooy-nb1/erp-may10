export type CustomerType = 'ca_nhan' | 'to_chuc' | 'dai_ly' | 'xuat_khau';
export type CustomerStatus = 'hoat_dong' | 'tam_khoa' | 'ngung_giao_dich';

export interface CustomerRecord {
  id: number;
  ma_khach_hang: string;
  ten_khach_hang: string;
  loai_khach_hang: CustomerType;
  ma_so_thue: string | null;
  so_dien_thoai: string;
  email: string | null;
  dia_chi: string;
  tinh_thanh_pho: string;
  nguoi_lien_he: string | null;
  han_muc_cong_no: string | number;
  so_ngay_cong_no: number;
  ghi_chu: string | null;
  trang_thai: CustomerStatus;
  ngay_tao: Date;
  ngay_cap_nhat: Date;
  nguoi_tao: number | null;
  nguoi_cap_nhat: number | null;
}

export interface CustomerSummary {
  totalOrders: number;
  totalOrderValue: string;
  unpaidInvoicesCount: number;
  outstandingReceivable: string;
  overdueReceivable: string;
}

export interface CustomerListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  loai_khach_hang?: CustomerType;
  tinh_thanh_pho?: string;
  trang_thai?: CustomerStatus;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const ALLOWED_CUSTOMER_SORT_COLUMNS = [
  'id',
  'ma_khach_hang',
  'ten_khach_hang',
  'loai_khach_hang',
  'tinh_thanh_pho',
  'han_muc_cong_no',
  'so_ngay_cong_no',
  'trang_thai',
  'ngay_tao',
  'ngay_cap_nhat',
] as const;

export type CustomerSortColumn = (typeof ALLOWED_CUSTOMER_SORT_COLUMNS)[number];
