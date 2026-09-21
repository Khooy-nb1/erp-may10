const { financialReportFilters, financialReportSnapshots, financialReportTrend, incomeStatement } = require('../services/financialReportService');

function invalid(message) { const error = new Error(message); error.status = 400; throw error; }
function period(query) {
  const value = query.period;
  if (typeof value !== 'string' || !value.trim() || value.length > 30) invalid('Kỳ báo cáo không hợp lệ.');
  return value.trim();
}

async function getFinancialReportFilters(req, res) {
  if (Object.keys(req.query).length) invalid('Tham số không được hỗ trợ.');
  res.set('Cache-Control', 'no-store').json(await financialReportFilters());
}

async function getIncomeStatement(req, res) {
  if (Object.keys(req.query).some((key) => key !== 'period')) invalid('Tham số không được hỗ trợ.');
  res.set('Cache-Control', 'no-store').json(await incomeStatement(period(req.query)));
}

async function getFinancialReportSnapshots(req, res) {
  const allowed = ['q', 'type', 'year', 'status'];
  if (Object.keys(req.query).some((key) => !allowed.includes(key))) invalid('Tham số không được hỗ trợ.');
  const text = (key, max = 100) => { const value = req.query[key]; if (value === undefined) return ''; if (typeof value !== 'string' || value.length > max) invalid(`Tham số ${key} không hợp lệ.`); return value.trim(); };
  const year = text('year', 4);
  if (year && !/^\d{4}$/.test(year)) invalid('Năm báo cáo không hợp lệ.');
  res.set('Cache-Control', 'no-store').json(await financialReportSnapshots({ q: text('q'), type: text('type', 50), year, status: text('status', 50) }));
}

async function getFinancialReportTrend(req, res) {
  if (Object.keys(req.query).length) invalid('Tham số không được hỗ trợ.');
  res.set('Cache-Control', 'no-store').json(await financialReportTrend());
}

module.exports = { getFinancialReportFilters, getIncomeStatement, getFinancialReportSnapshots, getFinancialReportTrend };
