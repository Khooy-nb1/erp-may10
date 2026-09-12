const { debtDetail, debtFilters, listDebts } = require('../services/debtService');

function invalid(message) { const error = new Error(message); error.status = 400; throw error; }
function text(query, key, max = 200) { const value = query[key]; if (value === undefined) return ''; if (typeof value !== 'string' || value.length > max) invalid(`Tham số ${key} không hợp lệ.`); return value.trim(); }
function id(value) { if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) invalid('ID không hợp lệ.'); return value; }
function day(query, key) { const value = text(query, key, 10); if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) invalid(`Ngày ${key} không hợp lệ.`); return value; }
function integer(query, key, fallback, max) { const value = text(query, key, 10); if (!value) return fallback; if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) invalid(`Tham số ${key} không hợp lệ.`); return Number(value); }

async function getDebts(req, res) {
  const allowed = ['q', 'type', 'status', 'from', 'to', 'page', 'pageSize'];
  if (Object.keys(req.query).some((key) => !allowed.includes(key))) invalid('Tham số không được hỗ trợ.');
  const from = day(req.query, 'from'), to = day(req.query, 'to');
  if (from && to && from > to) invalid('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
  res.set('Cache-Control', 'no-store').json(await listDebts({
    q: text(req.query, 'q'), type: text(req.query, 'type', 50), status: text(req.query, 'status', 50),
    from, to, page: integer(req.query, 'page', 1, 1000000), pageSize: integer(req.query, 'pageSize', 20, 100),
  }));
}
async function getDebtFilters(req, res) { res.set('Cache-Control', 'no-store').json(await debtFilters()); }
async function getDebt(req, res) { const data = await debtDetail(id(req.params.id)); if (!data) return res.status(404).json({ error: { message: 'Không tìm thấy công nợ.' } }); res.set('Cache-Control', 'no-store').json({ data }); }

module.exports = { getDebts, getDebtFilters, getDebt };
