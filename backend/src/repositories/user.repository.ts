import { query } from '../config/database.js';
import { UserRecord } from '../models/user.model.js';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: number): Promise<UserRecord | null>;
}

export class UserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await query<UserRecord>(
      `SELECT id, ho_ten, email, mat_khau, so_dien_thoai, vai_tro, phong_ban, trang_thai, ngay_tao, ngay_cap_nhat
       FROM nguoi_dung
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    );
    return result.rows[0] || null;
  }

  async findById(id: number): Promise<UserRecord | null> {
    const result = await query<UserRecord>(
      `SELECT id, ho_ten, email, mat_khau, so_dien_thoai, vai_tro, phong_ban, trang_thai, ngay_tao, ngay_cap_nhat
       FROM nguoi_dung
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  }
}

export const userRepository = new UserRepository();
