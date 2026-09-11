export type ProductStatus = 'dang_ban' | 'ngung_ban' | 'mau_moi';

export interface Product {
  id: number;
  ma_san_pham: string;
  ten_san_pham: string;
  mo_ta: string | null;
  ma_don_vi_tinh: number;
  ten_don_vi?: string | null;
  gia_ban: string | number;
  size: string | null;
  mau_sac: string | null;
  trang_thai: ProductStatus;
  ngay_tao?: string;
  ngay_cap_nhat?: string;
}

export interface ProductQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  size?: string;
  mau_sac?: string;
  trang_thai?: ProductStatus;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
