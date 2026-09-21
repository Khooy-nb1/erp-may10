const { pool } = require('../config/database');

async function read(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const result = await work(client);
    await client.query('ROLLBACK');
    return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
const joins = `FROM public.nhat_ky_hach_toan j
  JOIN public.chung_tu_goc d ON d.id = j.ma_chung_tu_goc
  JOIN public.he_thong_tai_khoan n ON n.id = j.tai_khoan_no
  JOIN public.he_thong_tai_khoan c ON c.id = j.tai_khoan_co
  LEFT JOIN public.nguoi_dung u ON u.id = j.nguoi_hach_toan`;
const columns = `j.id, j.ma_hach_toan, j.ma_chung_tu_goc, j.ngay_hach_toan,
  j.tai_khoan_no, j.tai_khoan_co, j.so_tien, j.mo_ta, j.ky_ke_toan, j.trang_thai,
  d.ma_chung_tu, n.so_tai_khoan AS so_tai_khoan_no, n.ten_tai_khoan AS ten_tai_khoan_no,
  c.so_tai_khoan AS so_tai_khoan_co, c.ten_tai_khoan AS ten_tai_khoan_co,
  u.ho_ten AS nguoi_thuc_hien, j.so_tien AS tong_no, j.so_tien AS tong_co,
  (j.so_tien - j.so_tien)::text AS chenh_lech, (j.tai_khoan_no = j.tai_khoan_co) AS trung_tai_khoan`;

function listJournals(params) {
  return read(async (client) => {
    const values = [], conditions = [];
    const bind = (value) => { values.push(value); return `$${values.length}`; };
    if (params.q) { const p = bind(`%${params.q.replace(/[\\%_]/g, '\\$&')}%`); conditions.push(`(j.ma_hach_toan ILIKE ${p} OR j.mo_ta ILIKE ${p} OR d.ma_chung_tu ILIKE ${p})`); }
    if (params.documentId) conditions.push(`j.ma_chung_tu_goc = ${bind(params.documentId)}`);
    if (params.accountId) { const p = bind(params.accountId); conditions.push(`(j.tai_khoan_no = ${p} OR j.tai_khoan_co = ${p})`); }
    if (params.status) conditions.push(`j.trang_thai = ${bind(params.status)}`);
    if (params.from) conditions.push(`j.ngay_hach_toan >= (${bind(params.from)}::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`);
    if (params.to) conditions.push(`j.ngay_hach_toan < ((${bind(params.to)}::date + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const summary = (await client.query(`SELECT count(*)::int AS total,
      coalesce(sum(j.so_tien),0)::text AS total_amount,
      count(*) FILTER (WHERE j.trang_thai = 'da_hach_toan')::int AS accounted,
      count(*) FILTER (WHERE j.tai_khoan_no = j.tai_khoan_co)::int AS same_account ${joins} ${where}`, values)).rows[0];
    const totalPages = Math.max(1, Math.ceil(summary.total / params.pageSize));
    const page = Math.min(params.page, totalPages);
    const limit = bind(params.pageSize), offset = bind((page - 1) * params.pageSize);
    const data = (await client.query(`SELECT ${columns} ${joins} ${where}
      ORDER BY j.ngay_hach_toan DESC, j.id DESC LIMIT ${limit} OFFSET ${offset}`, values)).rows;
    return { data, summary, pagination: { page, pageSize: params.pageSize, total: summary.total, totalPages } };
  });
}
function journalFilters() {
  return read(async (client) => ({
    documents: (await client.query('SELECT id, ma_chung_tu FROM public.chung_tu_goc ORDER BY ma_chung_tu')).rows,
    accounts: (await client.query("SELECT id, so_tai_khoan, ten_tai_khoan FROM public.he_thong_tai_khoan WHERE cho_phep_hach_toan = 'co' AND trang_thai = 'hoat_dong' ORDER BY so_tai_khoan")).rows,
    statuses: (await client.query('SELECT DISTINCT trang_thai FROM public.nhat_ky_hach_toan WHERE trang_thai IS NOT NULL ORDER BY trang_thai')).rows.map((row) => row.trang_thai),
  }));
}
function journalDetail(id) {
  return read(async (client) => {
    const data = (await client.query(`SELECT ${columns}, d.loai_chung_tu, d.ngay_chung_tu,
      d.so_tien AS so_tien_chung_tu, d.bang_chung_tu_lien_quan, d.ma_chung_tu_lien_quan,
      d.mo_ta AS mo_ta_chung_tu, j.ngay_tao, j.ngay_cap_nhat ${joins} WHERE j.id = $1`, [id])).rows[0];
    if (!data) return null;
    // Presentation of the actual account pair, not rows from a nonexistent detail table.
    return { ...data, lines: [
      { side: 'no', account: data.so_tai_khoan_no, name: data.ten_tai_khoan_no, amount: data.so_tien, description: data.mo_ta },
      { side: 'co', account: data.so_tai_khoan_co, name: data.ten_tai_khoan_co, amount: data.so_tien, description: data.mo_ta },
    ] };
  });
}

module.exports = { listJournals, journalFilters, journalDetail };
