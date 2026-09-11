export type ProductStatus = 'dang_ban' | 'ngung_ban' | 'mau_moi';

export interface ProductRecord {
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
  ngay_tao?: Date;
  ngay_cap_nhat?: Date;
}

export interface ProductListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  size?: string;
  mau_sac?: string;
  trang_thai?: ProductStatus;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const ALLOWED_PRODUCT_SORT_COLUMNS = [
  'id',
  'ma_san_pham',
  'ten_san_pham',
  'gia_ban',
  'size',
  'mau_sac',
  'trang_thai',
  'ngay_tao',
] as const;

export type ProductSortColumn = (typeof ALLOWED_PRODUCT_SORT_COLUMNS)[number];
