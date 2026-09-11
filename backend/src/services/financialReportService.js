const { pool } = require('../config/database');

async function read(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const result = await work(client);
    await client.query('ROLLBACK');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function periodMeta(value) {
  const quarter = /^Q([1-4])\/(\d{4})$/.exec(value);
  if (quarter) return { value, mode: 'quarter', quarter: Number(quarter[1]), year: Number(quarter[2]), label: `Quý ${['I', 'II', 'III', 'IV'][Number(quarter[1]) - 1]} / ${quarter[2]}` };
  const month = /^(0?[1-9]|1[0-2])\/(\d{4})$/.exec(value);
  if (month) return { value, mode: 'month', month: Number(month[1]), year: Number(month[2]), label: `Tháng ${Number(month[1])} / ${month[2]}` };
  const year = /^(\d{4})$/.exec(value);
  if (year) return { value, mode: 'year', year: Number(year[1]), label: `Năm ${year[1]}` };
  return { value, mode: 'stored', label: value };
}

function journalRange(period) {
  const meta = periodMeta(period);
  if (meta.mode === 'quarter') return { from: `${meta.year}-${String((meta.quarter - 1) * 3 + 1).padStart(2, '0')}-01`, to: `${meta.year}-${String(meta.quarter * 3 + 1).padStart(2, '0')}-01` };
  if (meta.mode === 'month') return { from: `${meta.year}-${String(meta.month).padStart(2, '0')}-01`, to: meta.month === 12 ? `${meta.year + 1}-01-01` : `${meta.year}-${String(meta.month + 1).padStart(2, '0')}-01` };
  if (meta.mode === 'year') return { from: `${meta.year}-01-01`, to: `${meta.year + 1}-01-01` };
  return null;
}

function previousPeriod(period) {
  const meta = periodMeta(period);
  if (!meta.year || !['month', 'quarter', 'year'].includes(meta.mode)) return null;
  if (meta.mode === 'month') return `${String(meta.month).padStart(2, '0')}/${meta.year - 1}`;
  if (meta.mode === 'quarter') return `Q${meta.quarter}/${meta.year - 1}`;
  return String(meta.year - 1);
}

function financialReportFilters() {
  return read(async (client) => {
    const rows = (await client.query(`SELECT DISTINCT ky_bao_cao
      FROM public.bao_cao_tai_chinh
      WHERE loai_bao_cao = 'ket_qua_kinh_doanh'
      ORDER BY ky_bao_cao`)).rows;
    return {
      periods: rows.map((row) => periodMeta(row.ky_bao_cao)),
      years: [...new Set(rows.map((row) => periodMeta(row.ky_bao_cao).year).filter(Boolean))].sort((a, b) => b - a),
      reports: [
        { key: 'income_statement', status: rows.length ? 'available' : 'insufficient_data' },
        { key: 'balance_sheet', status: 'insufficient_data', missing: ['account_balances', 'equity_classification'] },
        { key: 'cash_flow', status: 'insufficient_data', missing: ['cash_flow_classification'] },
      ],
    };
  });
}

function financialReportSnapshots({ q, type, year, status }) {
  return read(async (client) => {
    const values = [], conditions = [];
    const bind = (value) => { values.push(value); return `$${values.length}`; };
    if (q) { const pattern = bind(`%${q.replace(/[\\%_]/g, '\\$&')}%`); conditions.push(`(r.loai_bao_cao ILIKE ${pattern} OR r.ky_bao_cao ILIKE ${pattern})`); }
    if (type) conditions.push(`r.loai_bao_cao = ${bind(type)}`);
    if (year) conditions.push(`r.ky_bao_cao ~ ${bind(`${year}$`)}`);
    if (status) conditions.push(`r.trang_thai = ${bind(status)}`);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = (await client.query(`SELECT r.id, r.loai_bao_cao, r.ky_bao_cao,
      r.ngay_lap_bao_cao, r.trang_thai, r.nguoi_lap, u.ho_ten AS ten_nguoi_lap
      FROM public.bao_cao_tai_chinh r
      LEFT JOIN public.nguoi_dung u ON u.id = r.nguoi_lap
      ${where} ORDER BY r.ngay_lap_bao_cao DESC, r.id DESC`, values)).rows;
    return { data: rows.map((row) => ({ ...row, period: periodMeta(row.ky_bao_cao), source: 'stored_snapshot' })), total: rows.length };
  });
}

function financialReportTrend() {
  return read(async (client) => {
    const rows = (await client.query(`SELECT id, ky_bao_cao, doanh_thu_thuan,
      gia_von_hang_ban, loi_nhuan_truoc_thue, loi_nhuan_sau_thue
      FROM public.bao_cao_tai_chinh
      WHERE loai_bao_cao = 'ket_qua_kinh_doanh'
      ORDER BY CASE
        WHEN ky_bao_cao ~ '^Q[1-4]/[0-9]{4}$' THEN substring(ky_bao_cao from 4 for 4)::int * 10 + substring(ky_bao_cao from 2 for 1)::int
        ELSE 99999 END, ngay_lap_bao_cao, id`)).rows;
    return { data: rows.map((row) => ({ ...row, period: periodMeta(row.ky_bao_cao) })), total: rows.length };
  });
}

function incomeStatement(period) {
  return read(async (client) => {
    const data = (await client.query(`SELECT id, loai_bao_cao, ky_bao_cao, ngay_lap_bao_cao,
      doanh_thu_thuan, gia_von_hang_ban, loi_nhuan_truoc_thue, loi_nhuan_sau_thue,
      trang_thai, nguoi_lap, nguoi_phe_duyet
      FROM public.bao_cao_tai_chinh
      WHERE loai_bao_cao = 'ket_qua_kinh_doanh' AND ky_bao_cao = $1
      ORDER BY ngay_lap_bao_cao DESC, id DESC LIMIT 1`, [period])).rows[0] || null;
    if (!data) return { data: null, period: periodMeta(period), reason: 'snapshot_not_found', validation: { snapshot: 'unavailable', journal: { status: 'unavailable', entries: 0 } } };
    const range = journalRange(period);
    let journal = { status: 'unavailable', entries: 0 };
    if (range) {
      const check = (await client.query(`SELECT count(*)::int AS entries,
        COALESCE(sum(so_tien), 0)::text AS total_debit,
        COALESCE(sum(so_tien), 0)::text AS total_credit
        FROM public.nhat_ky_hach_toan
        WHERE ngay_hach_toan >= ($1::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
          AND ngay_hach_toan < ($2::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`, [range.from, range.to])).rows[0];
      journal = { ...check, status: check.entries > 0 && check.total_debit === check.total_credit ? 'balanced' : check.entries > 0 ? 'different' : 'unavailable' };
    }
    const revenue = Number(data.doanh_thu_thuan);
    const priorPeriod = previousPeriod(period);
    const prior = priorPeriod ? (await client.query(`SELECT id, loai_bao_cao, ky_bao_cao, ngay_lap_bao_cao,
      doanh_thu_thuan, gia_von_hang_ban, loi_nhuan_truoc_thue, loi_nhuan_sau_thue, trang_thai
      FROM public.bao_cao_tai_chinh
      WHERE loai_bao_cao = 'ket_qua_kinh_doanh' AND ky_bao_cao = $1
      ORDER BY ngay_lap_bao_cao DESC, id DESC LIMIT 1`, [priorPeriod])).rows[0] || null : null;
    return { data: { ...data, period: periodMeta(data.ky_bao_cao), gross_margin: Number.isFinite(revenue) && revenue !== 0 ? (Number(data.loi_nhuan_truoc_thue) / revenue * 100).toFixed(2) : null }, comparison: { period: priorPeriod ? periodMeta(priorPeriod) : null, data: prior }, validation: { snapshot: 'recorded', journal } };
  });
}

module.exports = { financialReportFilters, financialReportSnapshots, financialReportTrend, incomeStatement };
