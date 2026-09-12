const { pool } = require('../config/database');

// Every document request runs in a database-enforced read-only snapshot.
async function readOnly(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const result = await work(client);
    await client.query('ROLLBACK');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

function listDocuments({ q, type, status, from, to, page, pageSize }) {
  return readOnly(async (client) => {
    const values = [];
    const clauses = [];
    const bind = (value) => { values.push(value); return `$${values.length}`; };
    if (q) {
      const parameter = bind(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
      clauses.push(`(d.ma_chung_tu ILIKE ${parameter} OR d.mo_ta ILIKE ${parameter})`);
    }
    if (type) clauses.push(`d.loai_chung_tu = ${bind(type)}`);
    if (status) clauses.push(`d.trang_thai = ${bind(status)}`);
    if (from) clauses.push(`d.ngay_chung_tu >= (${bind(from)}::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`);
    if (to) clauses.push(`d.ngay_chung_tu < ((${bind(to)}::date + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const summaryResult = await client.query(`SELECT count(*)::int AS total,
      coalesce(sum(d.so_tien), 0)::text AS total_amount,
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.nhat_ky_hach_toan j WHERE j.ma_chung_tu_goc = d.id))::int AS posted,
      count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM public.nhat_ky_hach_toan j WHERE j.ma_chung_tu_goc = d.id))::int AS unposted
      FROM public.chung_tu_goc d ${where}`, values);
    const summary = summaryResult.rows[0];
    const total = summary.total;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const limit = bind(pageSize), offset = bind((currentPage - 1) * pageSize);
    const result = await client.query(`SELECT d.id, d.ma_chung_tu, d.loai_chung_tu, d.ngay_chung_tu,
      d.so_tien, d.trang_thai, d.mo_ta, d.ngay_tao, u.ho_ten AS ten_nguoi_tao,
      EXISTS (SELECT 1 FROM public.nhat_ky_hach_toan j WHERE j.ma_chung_tu_goc = d.id) AS da_hach_toan
      FROM public.chung_tu_goc d LEFT JOIN public.nguoi_dung u ON u.id = d.nguoi_tao
      ${where} ORDER BY d.ngay_chung_tu DESC, d.id DESC LIMIT ${limit} OFFSET ${offset}`, values);
    return { data: result.rows, summary, pagination: { page: currentPage, pageSize, total, totalPages } };
  });
}

function documentFilters() {
  return readOnly(async (client) => {
    const types = await client.query('SELECT DISTINCT loai_chung_tu FROM public.chung_tu_goc ORDER BY loai_chung_tu');
    const statuses = await client.query('SELECT DISTINCT trang_thai FROM public.chung_tu_goc WHERE trang_thai IS NOT NULL ORDER BY trang_thai');
    return { types: types.rows.map((row) => row.loai_chung_tu), statuses: statuses.rows.map((row) => row.trang_thai) };
  });
}

function documentDetail(id) {
  return readOnly(async (client) => {
    const result = await client.query(`SELECT d.id, d.ma_chung_tu, d.loai_chung_tu, d.ngay_chung_tu,
      d.so_tien, d.mo_ta, d.trang_thai, d.file_dinh_kem, d.bang_chung_tu_lien_quan,
      d.ma_chung_tu_lien_quan, d.ngay_tao, d.ngay_cap_nhat, d.nguoi_tao, d.nguoi_cap_nhat,
      creator.ho_ten AS ten_nguoi_tao, editor.ho_ten AS ten_nguoi_cap_nhat
      FROM public.chung_tu_goc d LEFT JOIN public.nguoi_dung creator ON creator.id = d.nguoi_tao
      LEFT JOIN public.nguoi_dung editor ON editor.id = d.nguoi_cap_nhat WHERE d.id = $1`, [id]);
    if (!result.rows.length) return null;
    const entries = await client.query(`SELECT j.id, j.ma_hach_toan, j.ngay_hach_toan, j.so_tien,
      j.mo_ta, j.ky_ke_toan, j.trang_thai, debit.so_tai_khoan AS so_tai_khoan_no,
      debit.ten_tai_khoan AS ten_tai_khoan_no, credit.so_tai_khoan AS so_tai_khoan_co,
      credit.ten_tai_khoan AS ten_tai_khoan_co FROM public.nhat_ky_hach_toan j
      JOIN public.he_thong_tai_khoan debit ON debit.id = j.tai_khoan_no
      JOIN public.he_thong_tai_khoan credit ON credit.id = j.tai_khoan_co
      WHERE j.ma_chung_tu_goc = $1 ORDER BY j.ngay_hach_toan, j.id`, [id]);
    return { ...result.rows[0], hach_toan: entries.rows };
  });
}

module.exports = { listDocuments, documentFilters, documentDetail };
