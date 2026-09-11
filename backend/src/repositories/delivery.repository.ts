import { query, withTransaction } from '../config/database.js';
import {
  DeliveryRecord,
  DeliveryListFilters,
  ALLOWED_DELIVERY_SORT_COLUMNS,
  DeliverySortColumn,
  DeliveryStatus,
} from '../models/delivery.model.js';

export interface DeliveryListResult {
  deliveries: DeliveryRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TransitionResult {
  success: boolean;
  currentRecord: DeliveryRecord | null;
}
export interface CreateDeliveryParams {
  ma_giao_hang: string;
  ma_don_ban_hang: number;
  ma_kho: number;
  ngay_giao: Date;
  ten_nguoi_nhan: string;
  dia_chi_giao: string;
  phuong_tien_van_chuyen: string | null;
  nguoi_giao_hang: number | null;
  ghi_chu: string | null;
  creatorId: number;
}

export interface IDeliveryRepository {
  list(filters: DeliveryListFilters): Promise<DeliveryListResult>;
  findById(id: number): Promise<DeliveryRecord | null>;
  findByCode(code: string): Promise<DeliveryRecord | null>;
  create(params: CreateDeliveryParams): Promise<DeliveryRecord>;
  updateStatus(
    id: number,
    status: DeliveryStatus,
    updaterId: number,
    extra?: { ghi_chu?: string | null }
  ): Promise<DeliveryRecord | null>;
  transitionStatus(
    id: number,
    expectedStatus: DeliveryStatus,
    newStatus: DeliveryStatus,
    updaterId: number,
    extra?: { ghi_chu?: string | null }
  ): Promise<TransitionResult>;
  checkWarehouseActive(warehouseId: number): Promise<boolean>;
  checkOrderForDelivery(orderId: number): Promise<{ id: number; trang_thai: string; dia_chi_giao_hang: string } | null>;
}

export class DeliveryRepository implements IDeliveryRepository {
  async list(filters: DeliveryListFilters): Promise<DeliveryListResult> {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.search && filters.search.trim().length > 0) {
      params.push(`%${filters.search.trim()}%`);
      const pIdx = params.length;
      conditions.push(`(g.ma_giao_hang ILIKE $${pIdx} OR g.ten_nguoi_nhan ILIKE $${pIdx})`);
    }

    if (filters.ma_don_ban_hang) {
      params.push(filters.ma_don_ban_hang);
      conditions.push(`g.ma_don_ban_hang = $${params.length}`);
    }

    if (filters.ma_kho) {
      params.push(filters.ma_kho);
      conditions.push(`g.ma_kho = $${params.length}`);
    }

    if (filters.trang_thai) {
      params.push(filters.trang_thai);
      conditions.push(`g.trang_thai = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let sortColumn: DeliverySortColumn = 'ngay_giao';
    if (filters.sortBy && ALLOWED_DELIVERY_SORT_COLUMNS.includes(filters.sortBy as DeliverySortColumn)) {
      sortColumn = filters.sortBy as DeliverySortColumn;
    }
    const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const countSql = `SELECT COUNT(*) AS total FROM giao_hang g ${whereClause}`;
    const countRes = await query<{ total: string | number }>(countSql, params);
    const total = Number(countRes.rows[0]?.total || 0);
    const totalPages = Math.ceil(total / pageSize) || 1;

    params.push(pageSize);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataSql = `
      SELECT g.id, g.ma_giao_hang, g.ma_don_ban_hang, o.ma_don_ban, c.ten_khach_hang,
             g.ma_kho, k.ten_kho, g.ngay_giao, g.ten_nguoi_nhan, g.dia_chi_giao,
             g.phuong_tien_van_chuyen, g.nguoi_giao_hang, u.ho_ten AS ten_nguoi_giao,
             g.ghi_chu, g.trang_thai, g.ngay_tao, g.ngay_cap_nhat, g.nguoi_tao, g.nguoi_cap_nhat
      FROM giao_hang g
      LEFT JOIN don_ban_hang o ON o.id = g.ma_don_ban_hang
      LEFT JOIN khach_hang c ON c.id = o.ma_khach_hang
      LEFT JOIN kho k ON k.id = g.ma_kho
      LEFT JOIN nguoi_dung u ON u.id = g.nguoi_giao_hang
      ${whereClause}
      ORDER BY g.${sortColumn} ${sortOrder}, g.id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const dataRes = await query<DeliveryRecord>(dataSql, params);

    return {
      deliveries: dataRes.rows,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async findById(id: number): Promise<DeliveryRecord | null> {
    const sql = `
      SELECT g.id, g.ma_giao_hang, g.ma_don_ban_hang, o.ma_don_ban, c.ten_khach_hang,
             g.ma_kho, k.ten_kho, g.ngay_giao, g.ten_nguoi_nhan, g.dia_chi_giao,
             g.phuong_tien_van_chuyen, g.nguoi_giao_hang, u.ho_ten AS ten_nguoi_giao,
             g.ghi_chu, g.trang_thai, g.ngay_tao, g.ngay_cap_nhat, g.nguoi_tao, g.nguoi_cap_nhat
      FROM giao_hang g
      LEFT JOIN don_ban_hang o ON o.id = g.ma_don_ban_hang
      LEFT JOIN khach_hang c ON c.id = o.ma_khach_hang
      LEFT JOIN kho k ON k.id = g.ma_kho
      LEFT JOIN nguoi_dung u ON u.id = g.nguoi_giao_hang
      WHERE g.id = $1
      LIMIT 1
    `;
    const res = await query<DeliveryRecord>(sql, [id]);
    return res.rows[0] || null;
  }

  async findByCode(code: string): Promise<DeliveryRecord | null> {
    const sql = `
      SELECT g.id, g.ma_giao_hang, g.ma_don_ban_hang, o.ma_don_ban, c.ten_khach_hang,
             g.ma_kho, k.ten_kho, g.ngay_giao, g.ten_nguoi_nhan, g.dia_chi_giao,
             g.phuong_tien_van_chuyen, g.nguoi_giao_hang, u.ho_ten AS ten_nguoi_giao,
             g.ghi_chu, g.trang_thai, g.ngay_tao, g.ngay_cap_nhat, g.nguoi_tao, g.nguoi_cap_nhat
      FROM giao_hang g
      LEFT JOIN don_ban_hang o ON o.id = g.ma_don_ban_hang
      LEFT JOIN khach_hang c ON c.id = o.ma_khach_hang
      LEFT JOIN kho k ON k.id = g.ma_kho
      LEFT JOIN nguoi_dung u ON u.id = g.nguoi_giao_hang
      WHERE UPPER(g.ma_giao_hang) = UPPER($1)
      LIMIT 1
    `;
    const res = await query<DeliveryRecord>(sql, [code.trim()]);
    return res.rows[0] || null;
  }

  async create(params: CreateDeliveryParams): Promise<DeliveryRecord> {
    const sql = `
      INSERT INTO giao_hang (
        ma_giao_hang, ma_don_ban_hang, ma_kho, ngay_giao,
        ten_nguoi_nhan, dia_chi_giao, phuong_tien_van_chuyen,
        nguoi_giao_hang, ghi_chu, trang_thai,
        nguoi_tao, nguoi_cap_nhat
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, 'cho_giao',
        $10, $10
      )
      RETURNING *
    `;
    const res = await query<DeliveryRecord>(sql, [
      params.ma_giao_hang,
      params.ma_don_ban_hang,
      params.ma_kho,
      params.ngay_giao,
      params.ten_nguoi_nhan,
      params.dia_chi_giao,
      params.phuong_tien_van_chuyen,
      params.nguoi_giao_hang,
      params.ghi_chu,
      params.creatorId,
    ]);
    return res.rows[0];
  }

  async updateStatus(
    id: number,
    status: DeliveryStatus,
    updaterId: number,
    extra?: { ghi_chu?: string | null }
  ): Promise<DeliveryRecord | null> {
    const fields: string[] = ['trang_thai = $2', 'nguoi_cap_nhat = $3', 'ngay_cap_nhat = NOW()'];
    const params: unknown[] = [id, status, updaterId];

    if (extra?.ghi_chu !== undefined) {
      params.push(extra.ghi_chu);
      fields.push(`ghi_chu = $${params.length}`);
    }

    const sql = `
      UPDATE giao_hang
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    const res = await query<DeliveryRecord>(sql, params);
    return res.rows[0] || null;
  }
  async transitionStatus(
    id: number,
    expectedStatus: DeliveryStatus,
    newStatus: DeliveryStatus,
    updaterId: number,
    extra?: { ghi_chu?: string | null }
  ): Promise<TransitionResult> {
    return withTransaction(async (client) => {
      const selectSql = `
        SELECT g.id, g.ma_giao_hang, g.ma_don_ban_hang, o.ma_don_ban, c.ten_khach_hang,
               g.ma_kho, k.ten_kho, g.ngay_giao, g.ten_nguoi_nhan, g.dia_chi_giao,
               g.phuong_tien_van_chuyen, g.nguoi_giao_hang, u.ho_ten AS ten_nguoi_giao,
               g.ghi_chu, g.trang_thai, g.ngay_tao, g.ngay_cap_nhat, g.nguoi_tao, g.nguoi_cap_nhat
        FROM giao_hang g
        LEFT JOIN don_ban_hang o ON o.id = g.ma_don_ban_hang
        LEFT JOIN khach_hang c ON c.id = o.ma_khach_hang
        LEFT JOIN kho k ON k.id = g.ma_kho
        LEFT JOIN nguoi_dung u ON u.id = g.nguoi_giao_hang
        WHERE g.id = $1
        FOR UPDATE
      `;
      const selectRes = await client.query<DeliveryRecord>(selectSql, [id]);
      const current = selectRes.rows[0] || null;
      if (!current) {
        return { success: false, currentRecord: null };
      }

      if (current.trang_thai !== expectedStatus) {
        return { success: false, currentRecord: current };
      }

      const fields: string[] = ['trang_thai = $2', 'nguoi_cap_nhat = $3', 'ngay_cap_nhat = NOW()'];
      const params: unknown[] = [id, newStatus, updaterId];

      if (extra?.ghi_chu !== undefined) {
        params.push(extra.ghi_chu);
        fields.push(`ghi_chu = $${params.length}`);
      }

      const updateSql = `
        UPDATE giao_hang
        SET ${fields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;
      const updateRes = await client.query<DeliveryRecord>(updateSql, params);
      const updated = {
        ...current,
        ...updateRes.rows[0],
      };

      return { success: true, currentRecord: updated };
    });
  }

  async checkWarehouseActive(warehouseId: number): Promise<boolean> {
    const res = await query<{ id: number }>(
      `SELECT id FROM kho WHERE id = $1 AND trang_thai = 'hoat_dong' LIMIT 1`,
      [warehouseId]
    );
    return res.rows.length > 0;
  }

  async checkOrderForDelivery(
    orderId: number
  ): Promise<{ id: number; trang_thai: string; dia_chi_giao_hang: string } | null> {
    const res = await query<{ id: number; trang_thai: string; dia_chi_giao_hang: string }>(
      `SELECT id, trang_thai, dia_chi_giao_hang FROM don_ban_hang WHERE id = $1 LIMIT 1`,
      [orderId]
    );
    return res.rows[0] || null;
  }
}

export const deliveryRepository = new DeliveryRepository();
