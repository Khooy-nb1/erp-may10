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

const effectiveStatus = `CASE
  WHEN c.so_tien_con_lai <= 0 THEN 'da_thanh_toan'
  WHEN c.ngay_dao_han < CURRENT_TIMESTAMP THEN 'qua_han'
  WHEN c.ngay_dao_han <= CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'sap_den_han'
  ELSE c.trang_thai END`;
const joins = `FROM public.cong_no c
  LEFT JOIN public.khach_hang kh ON kh.id = c.ma_khach_hang
  LEFT JOIN public.nha_cung_cap ncc ON ncc.id = c.ma_nha_cung_cap
  LEFT JOIN public.hoa_don_ban_hang hdb ON c.bang_hoa_don = 'hoa_don_ban_hang' AND hdb.id = c.ma_hoa_don
  LEFT JOIN public.hoa_don_nha_cung_cap hdncc ON c.bang_hoa_don = 'hoa_don_nha_cung_cap' AND hdncc.id = c.ma_hoa_don`;
const columns = `c.id, c.loai_cong_no, c.ma_khach_hang, c.ma_nha_cung_cap, c.ma_hoa_don,
  c.bang_hoa_don, c.so_tien_phat_sinh, c.so_tien_da_thanh_toan, c.so_tien_con_lai,
  c.ngay_dao_han, c.trang_thai AS trang_thai_luu, c.ngay_tao, c.ngay_cap_nhat,
  COALESCE(kh.ma_khach_hang, ncc.ma_nha_cung_cap) AS ma_doi_tuong,
  COALESCE(kh.ten_khach_hang, ncc.ten_nha_cung_cap) AS ten_doi_tuong,
  COALESCE(hdb.ma_hoa_don, hdncc.ma_hoa_don_ncc) AS ma_hoa_don_hien_thi,
  ${effectiveStatus} AS trang_thai_hien_thi`;

function queryParts(params) {
  const values = [], conditions = [];
  const bind = (value) => { values.push(value); return `$${values.length}`; };
  if (params.q) {
    const p = bind(`%${params.q.replace(/[\\%_]/g, '\\$&')}%`);
    conditions.push(`(COALESCE(kh.ten_khach_hang,ncc.ten_nha_cung_cap,'') ILIKE ${p}
      OR COALESCE(kh.ma_khach_hang,ncc.ma_nha_cung_cap,'') ILIKE ${p}
      OR COALESCE(hdb.ma_hoa_don,hdncc.ma_hoa_don_ncc,'') ILIKE ${p})`);
  }
  if (params.type) conditions.push(`c.loai_cong_no = ${bind(params.type)}`);
  if (params.status) conditions.push(`${effectiveStatus} = ${bind(params.status)}`);
  if (params.from) conditions.push(`c.ngay_dao_han >= (${bind(params.from)}::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`);
  if (params.to) conditions.push(`c.ngay_dao_han < ((${bind(params.to)}::date + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`);
  return { values, where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', bind };
}

function listDebts(params) {
  return read(async (client) => {
    const { values, where, bind } = queryParts(params);
    const summary = (await client.query(`SELECT count(*)::int AS total,
      coalesce(sum(c.so_tien_con_lai) FILTER (WHERE c.loai_cong_no='phai_thu'),0)::text AS receivable,
      coalesce(sum(c.so_tien_con_lai) FILTER (WHERE c.loai_cong_no='phai_tra'),0)::text AS payable,
      count(*) FILTER (WHERE c.so_tien_con_lai > 0 AND c.ngay_dao_han < CURRENT_TIMESTAMP)::int AS overdue,
      count(*) FILTER (WHERE c.so_tien_con_lai > 0 AND c.ngay_dao_han >= CURRENT_TIMESTAMP
        AND c.ngay_dao_han <= CURRENT_TIMESTAMP + INTERVAL '7 days')::int AS due_soon,
      coalesce(sum(c.so_tien_phat_sinh),0)::text AS total_incurred,
      coalesce(sum(c.so_tien_da_thanh_toan),0)::text AS total_paid,
      coalesce(sum(c.so_tien_con_lai),0)::text AS total_remaining
      ${joins} ${where}`, values)).rows[0];
    const statuses = (await client.query(`SELECT ${effectiveStatus} AS status, count(*)::int AS count
      ${joins} ${where} GROUP BY 1 ORDER BY 1`, values)).rows;
    const totalPages = Math.max(1, Math.ceil(summary.total / params.pageSize));
    const page = Math.min(params.page, totalPages);
    const limit = bind(params.pageSize), offset = bind((page - 1) * params.pageSize);
    const data = (await client.query(`SELECT ${columns} ${joins} ${where}
      ORDER BY c.ngay_dao_han, c.id LIMIT ${limit} OFFSET ${offset}`, values)).rows;
    return { data, summary: { ...summary, statuses }, pagination: { page, pageSize: params.pageSize, total: summary.total, totalPages } };
  });
}

function debtFilters() {
  return read(async (client) => ({
    types: (await client.query('SELECT DISTINCT loai_cong_no FROM public.cong_no WHERE loai_cong_no IS NOT NULL ORDER BY 1')).rows.map((row) => row.loai_cong_no),
    statuses: (await client.query(`SELECT DISTINCT ${effectiveStatus} AS status FROM public.cong_no c ORDER BY 1`)).rows.map((row) => row.status),
  }));
}

function debtDetail(id) {
  return read(async (client) => {
    const data = (await client.query(`SELECT ${columns} ${joins} WHERE c.id=$1`, [id])).rows[0];
    if (!data) return null;
    let payments = [];
    if (data.bang_hoa_don === 'hoa_don_nha_cung_cap' && data.ma_hoa_don) {
      payments = (await client.query(`SELECT id, ma_thanh_toan_ncc, so_tien_thanh_toan,
        ngay_thanh_toan, hinh_thuc_thanh_toan, so_tham_chieu, ghi_chu, trang_thai
        FROM public.thanh_toan_ncc WHERE ma_hoa_don_ncc=$1 ORDER BY ngay_thanh_toan, id`, [data.ma_hoa_don])).rows;
    }
    return { ...data, payments };
  });
}

module.exports = { listDebts, debtFilters, debtDetail };
