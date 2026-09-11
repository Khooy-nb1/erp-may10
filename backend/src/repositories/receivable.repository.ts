import { query } from '../config/database.js';
import {
  ReceivableRecord,
  ReceivableSummary,
  AgingReport,
  ReceivableListFilters,
  ALLOWED_RECEIVABLE_SORT_COLUMNS,
  ReceivableSortColumn,
} from '../models/receivable.model.js';

export interface ReceivableListResult {
  receivables: ReceivableRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IReceivableRepository {
  list(filters: ReceivableListFilters): Promise<ReceivableListResult>;
  getSummary(customerId?: number): Promise<ReceivableSummary>;
  getAgingReport(): Promise<AgingReport>;
}

export class ReceivableRepository implements IReceivableRepository {
  async list(filters: ReceivableListFilters): Promise<ReceivableListResult> {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    // Strict security invariant: NEVER expose phai_tra in Sales/CRM
    const conditions: string[] = ["cn.loai_cong_no = 'phai_thu'"];
    const params: unknown[] = [];

    if (filters.search && filters.search.trim().length > 0) {
      params.push(`%${filters.search.trim()}%`);
      const pIdx = params.length;
      conditions.push(`(c.ten_khach_hang ILIKE $${pIdx} OR c.ma_khach_hang ILIKE $${pIdx} OR h.ma_hoa_don ILIKE $${pIdx})`);
    }

    if (filters.ma_khach_hang) {
      params.push(filters.ma_khach_hang);
      conditions.push(`cn.ma_khach_hang = $${params.length}`);
    }

    if (filters.ma_hoa_don) {
      params.push(filters.ma_hoa_don);
      conditions.push(`cn.ma_hoa_don = $${params.length}`);
    }

    if (filters.trang_thai) {
      params.push(filters.trang_thai);
      conditions.push(`cn.trang_thai = $${params.length}`);
    }

    if (filters.dueFromDate) {
      params.push(filters.dueFromDate);
      conditions.push(`cn.ngay_dao_han >= $${params.length}`);
    }

    if (filters.dueToDate) {
      params.push(filters.dueToDate);
      conditions.push(`cn.ngay_dao_han <= $${params.length}`);
    }

    if (filters.overdueOnly) {
      conditions.push('cn.ngay_dao_han < NOW() AND cn.so_tien_con_lai > 0');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    let sortColumn: ReceivableSortColumn = 'ngay_dao_han';
    if (filters.sortBy && ALLOWED_RECEIVABLE_SORT_COLUMNS.includes(filters.sortBy as ReceivableSortColumn)) {
      sortColumn = filters.sortBy as ReceivableSortColumn;
    }
    const sortOrder = filters.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM cong_no cn
      LEFT JOIN khach_hang c ON c.id = cn.ma_khach_hang
      LEFT JOIN hoa_don_ban_hang h ON h.id = cn.ma_hoa_don
      ${whereClause}
    `;
    const countRes = await query<{ total: string | number }>(countSql, params);
    const total = Number(countRes.rows[0]?.total || 0);
    const totalPages = Math.ceil(total / pageSize) || 1;

    params.push(pageSize);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataSql = `
      SELECT cn.id, cn.loai_cong_no, cn.ma_khach_hang, c.ten_khach_hang, c.ma_khach_hang AS ma_khach_hang_code,
             cn.ma_hoa_don, h.ma_hoa_don AS ma_hoa_don_code, cn.bang_hoa_don,
             cn.so_tien_phat_sinh, cn.so_tien_da_thanh_toan, cn.so_tien_con_lai,
             cn.ngay_dao_han,
             CASE
               WHEN cn.ngay_dao_han < NOW() AND cn.so_tien_con_lai > 0
               THEN GREATEST(0, EXTRACT(DAY FROM NOW() - cn.ngay_dao_han)::integer)
               ELSE 0
             END AS days_overdue,
             cn.trang_thai, cn.ngay_tao, cn.ngay_cap_nhat
      FROM cong_no cn
      LEFT JOIN khach_hang c ON c.id = cn.ma_khach_hang
      LEFT JOIN hoa_don_ban_hang h ON h.id = cn.ma_hoa_don
      ${whereClause}
      ORDER BY cn.${sortColumn} ${sortOrder}, cn.id ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const dataRes = await query<ReceivableRecord & { days_overdue: number }>(dataSql, params);

    const mapped = dataRes.rows.map((row) => ({
      ...row,
      daysOverdue: Number(row.days_overdue) || 0,
    }));

    return {
      receivables: mapped,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getSummary(customerId?: number): Promise<ReceivableSummary> {
    const conditions = ["loai_cong_no = 'phai_thu'"];
    const params: unknown[] = [];

    if (customerId) {
      params.push(customerId);
      conditions.push(`ma_khach_hang = $${params.length}`);
    }

    const sql = `
      SELECT
        COALESCE(SUM(so_tien_phat_sinh), 0) AS total_original,
        COALESCE(SUM(so_tien_da_thanh_toan), 0) AS total_paid,
        COALESCE(SUM(so_tien_con_lai), 0) AS total_outstanding,
        COALESCE(SUM(CASE WHEN ngay_dao_han < NOW() AND so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0) AS total_overdue,
        COUNT(CASE WHEN ngay_dao_han < NOW() AND so_tien_con_lai > 0 THEN 1 END) AS overdue_count
      FROM cong_no
      WHERE ${conditions.join(' AND ')}
    `;

    const res = await query<{
      total_original: string | number;
      total_paid: string | number;
      total_outstanding: string | number;
      total_overdue: string | number;
      overdue_count: string | number;
    }>(sql, params);

    const row = res.rows[0];

    return {
      totalOriginal: String(row?.total_original || '0.00'),
      totalPaid: String(row?.total_paid || '0.00'),
      totalOutstanding: String(row?.total_outstanding || '0.00'),
      totalOverdue: String(row?.total_overdue || '0.00'),
      overdueCount: Number(row?.overdue_count || 0),
    };
  }

  async getAgingReport(): Promise<AgingReport> {
    const sql = `
      SELECT
        COALESCE(SUM(CASE WHEN ngay_dao_han >= NOW() AND so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0) AS current_amount,
        COUNT(CASE WHEN ngay_dao_han >= NOW() AND so_tien_con_lai > 0 THEN 1 END) AS current_count,

        COALESCE(SUM(CASE WHEN NOW() > ngay_dao_han AND EXTRACT(DAY FROM NOW() - ngay_dao_han) BETWEEN 1 AND 30 AND so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0) AS b1_amount,
        COUNT(CASE WHEN NOW() > ngay_dao_han AND EXTRACT(DAY FROM NOW() - ngay_dao_han) BETWEEN 1 AND 30 AND so_tien_con_lai > 0 THEN 1 END) AS b1_count,

        COALESCE(SUM(CASE WHEN NOW() > ngay_dao_han AND EXTRACT(DAY FROM NOW() - ngay_dao_han) BETWEEN 31 AND 60 AND so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0) AS b2_amount,
        COUNT(CASE WHEN NOW() > ngay_dao_han AND EXTRACT(DAY FROM NOW() - ngay_dao_han) BETWEEN 31 AND 60 AND so_tien_con_lai > 0 THEN 1 END) AS b2_count,

        COALESCE(SUM(CASE WHEN NOW() > ngay_dao_han AND EXTRACT(DAY FROM NOW() - ngay_dao_han) BETWEEN 61 AND 90 AND so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0) AS b3_amount,
        COUNT(CASE WHEN NOW() > ngay_dao_han AND EXTRACT(DAY FROM NOW() - ngay_dao_han) BETWEEN 61 AND 90 AND so_tien_con_lai > 0 THEN 1 END) AS b3_count,

        COALESCE(SUM(CASE WHEN NOW() > ngay_dao_han AND EXTRACT(DAY FROM NOW() - ngay_dao_han) > 90 AND so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0) AS b4_amount,
        COUNT(CASE WHEN NOW() > ngay_dao_han AND EXTRACT(DAY FROM NOW() - ngay_dao_han) > 90 AND so_tien_con_lai > 0 THEN 1 END) AS b4_count,

        COALESCE(SUM(CASE WHEN so_tien_con_lai > 0 THEN so_tien_con_lai ELSE 0 END), 0) AS total_receivables
      FROM cong_no
      WHERE loai_cong_no = 'phai_thu'
    `;

    const res = await query<{
      current_amount: string | number;
      current_count: string | number;
      b1_amount: string | number;
      b1_count: string | number;
      b2_amount: string | number;
      b2_count: string | number;
      b3_amount: string | number;
      b3_count: string | number;
      b4_amount: string | number;
      b4_count: string | number;
      total_receivables: string | number;
    }>(sql);

    const row = res.rows[0];

    return {
      current: {
        label: 'Trong hạn',
        minDays: null,
        maxDays: 0,
        totalAmount: String(row?.current_amount || '0.00'),
        count: Number(row?.current_count || 0),
      },
      days1To30: {
        label: '1 – 30 ngày',
        minDays: 1,
        maxDays: 30,
        totalAmount: String(row?.b1_amount || '0.00'),
        count: Number(row?.b1_count || 0),
      },
      days31To60: {
        label: '31 – 60 ngày',
        minDays: 31,
        maxDays: 60,
        totalAmount: String(row?.b2_amount || '0.00'),
        count: Number(row?.b2_count || 0),
      },
      days61To90: {
        label: '61 – 90 ngày',
        minDays: 61,
        maxDays: 90,
        totalAmount: String(row?.b3_amount || '0.00'),
        count: Number(row?.b3_count || 0),
      },
      daysOver90: {
        label: 'Trên 90 ngày',
        minDays: 91,
        maxDays: null,
        totalAmount: String(row?.b4_amount || '0.00'),
        count: Number(row?.b4_count || 0),
      },
      totalReceivables: String(row?.total_receivables || '0.00'),
    };
  }
}

export const receivableRepository = new ReceivableRepository();
