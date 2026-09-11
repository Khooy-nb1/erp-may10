export type InvoiceStatus = 'chua_thanh_toan' | 'thanh_toan_mot_phan' | 'da_thanh_toan' | 'qua_han';

export interface InvoiceRecord {
  id: number;
  ma_hoa_don: string;
  ma_don_ban_hang: number;
  ma_don_ban?: string;
  ma_khach_hang: number;
  ten_khach_hang?: string;
  ma_khach_hang_code?: string;
  ngay_xuat_hoa_don: Date;
  ngay_dao_han: Date;
  tong_tien_truoc_thue: number | string;
  tien_thue: number | string;
  tong_tien_sau_thue: number | string;
  so_tien_da_thu: number | string;
  trang_thai: InvoiceStatus;
  ghi_chu: string | null;
  ngay_tao: Date;
  ngay_cap_nhat: Date;
  nguoi_tao: number | null;
  nguoi_cap_nhat: number | null;
}

export interface InvoiceListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  ma_hoa_don?: string;
  ma_don_ban_hang?: number;
  ma_khach_hang?: number;
  trang_thai?: InvoiceStatus;
  fromDate?: string;
  toDate?: string;
  dueFromDate?: string;
  dueToDate?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const ALLOWED_INVOICE_SORT_COLUMNS = [
  'id',
  'ma_hoa_don',
  'ngay_xuat_hoa_don',
  'ngay_dao_han',
  'tong_tien_sau_thue',
  'so_tien_da_thu',
  'trang_thai',
  'ngay_tao',
] as const;

export type InvoiceSortColumn = (typeof ALLOWED_INVOICE_SORT_COLUMNS)[number];
