export type ReceivableStatus = 'chua_thanh_toan' | 'mot_phan' | 'da_thanh_toan' | 'qua_han';

export interface ReceivableRecord {
  id: number;
  loai_cong_no: 'phai_thu';
  ma_khach_hang: number;
  ten_khach_hang?: string;
  ma_khach_hang_code?: string;
  ma_hoa_don: number | null;
  ma_hoa_don_code?: string;
  bang_hoa_don: string | null;
  so_tien_phat_sinh: number | string;
  so_tien_da_thanh_toan: number | string;
  so_tien_con_lai: number | string;
  ngay_dao_han: Date;
  daysOverdue?: number;
  trang_thai: ReceivableStatus;
  ngay_tao: Date;
  ngay_cap_nhat: Date;
}

export interface ReceivableSummary {
  totalOriginal: string;
  totalPaid: string;
  totalOutstanding: string;
  totalOverdue: string;
  overdueCount: number;
}

export interface AgingBucket {
  label: string;
  minDays: number | null;
  maxDays: number | null;
  totalAmount: string;
  count: number;
}

export interface AgingReport {
  current: AgingBucket;
  days1To30: AgingBucket;
  days31To60: AgingBucket;
  days61To90: AgingBucket;
  daysOver90: AgingBucket;
  totalReceivables: string;
}

export interface ReceivableListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  ma_khach_hang?: number;
  ma_hoa_don?: number;
  trang_thai?: ReceivableStatus;
  dueFromDate?: string;
  dueToDate?: string;
  overdueOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const ALLOWED_RECEIVABLE_SORT_COLUMNS = [
  'id',
  'ngay_dao_han',
  'so_tien_phat_sinh',
  'so_tien_con_lai',
  'trang_thai',
  'ngay_tao',
] as const;

export type ReceivableSortColumn = (typeof ALLOWED_RECEIVABLE_SORT_COLUMNS)[number];
