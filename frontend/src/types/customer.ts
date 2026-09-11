export type CustomerType = 'ca_nhan' | 'to_chuc' | 'dai_ly' | 'xuat_khau';
export type CustomerStatus = 'hoat_dong' | 'tam_khoa' | 'ngung_giao_dich';

export interface Customer {
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
  ngay_tao: string;
  ngay_cap_nhat: string;
}

export interface CustomerSummary {
  totalOrders: number;
  totalOrderValue: string;
  unpaidInvoicesCount: number;
  outstandingReceivable: string;
  overdueReceivable: string;
}

export interface CustomerQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  loai_khach_hang?: CustomerType;
  tinh_thanh_pho?: string;
  trang_thai?: CustomerStatus;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
