export interface UserRecord {
  id: number;
  ho_ten: string;
  email: string;
  mat_khau: string;
  so_dien_thoai: string | null;
  vai_tro: string;
  phong_ban: string | null;
  trang_thai: string;
  ngay_tao?: Date;
  ngay_cap_nhat?: Date;
  nguoi_tao?: number | null;
  nguoi_cap_nhat?: number | null;
}

export interface UserProfile {
  id: number;
  ho_ten: string;
  email: string;
  so_dien_thoai: string | null;
  vai_tro: string;
  phong_ban: string | null;
  trang_thai: string;
}

export function toUserProfile(user: UserRecord): UserProfile {
  return {
    id: Number(user.id),
    ho_ten: user.ho_ten,
    email: user.email,
    so_dien_thoai: user.so_dien_thoai,
    vai_tro: user.vai_tro,
    phong_ban: user.phong_ban,
    trang_thai: user.trang_thai,
  };
}
