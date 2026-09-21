const { listDocuments, documentFilters, documentDetail } = require('../services/documentService');

function badRequest(message) { const error = new Error(message); error.status = 400; throw error; }
function text(query, name, max = 200) {
  const value = query[name];
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > max) badRequest(`Tham số ${name} không hợp lệ.`);
  return value.trim();
}
function integer(query, name, fallback, max) {
  const value = text(query, name, 10);
  if (!value) return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) badRequest(`Tham số ${name} không hợp lệ.`);
  return Number(value);
}
function date(query, name) {
  const value = text(query, name, 10);
  if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01' || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) badRequest(`Ngày ${name} không hợp lệ.`);
  return value;
}
async function getDocuments(req, res) {
  const allowed = new Set(['q', 'type', 'status', 'from', 'to', 'page', 'pageSize']);
  if (Object.keys(req.query).some((key) => !allowed.has(key))) badRequest('Tham số tìm kiếm không được hỗ trợ.');
  const from = date(req.query, 'from'), to = date(req.query, 'to');
  if (from && to && from > to) badRequest('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
  const result = await listDocuments({ q: text(req.query, 'q'), type: text(req.query, 'type'), status: text(req.query, 'status'), from, to, page: integer(req.query, 'page', 1, 1000000), pageSize: integer(req.query, 'pageSize', 20, 100) });
  res.set('Cache-Control', 'no-store').json(result);
}
async function getDocumentFilters(req, res) {
  res.set('Cache-Control', 'no-store').json(await documentFilters());
}
async function getDocument(req, res) {
  const { id } = req.params;
  if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) badRequest('ID chứng từ không hợp lệ.');
  const data = await documentDetail(id);
  if (!data) return res.status(404).json({ error: { message: 'Không tìm thấy chứng từ.' } });
  res.set('Cache-Control', 'no-store').json({ data });
}

module.exports = { getDocuments, getDocumentFilters, getDocument };
