import { financeFetch } from './http.js';
function canceled(error, signal) { return signal?.aborted || error?.name === 'AbortError' || error?.code === 'ERR_CANCELED'; }
async function read(path, signal) {
  let response;
  try { response = await financeFetch(`/api/financial-reports${path}`, { signal }); }
  catch (error) { if (canceled(error, signal)) return; throw new Error('Không kết nối được máy chủ. Vui lòng thử lại.'); }
  let body;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok || !body) throw new Error(response.status < 500 ? body?.error?.message || 'Yêu cầu không hợp lệ.' : 'Không tải được báo cáo tài chính.');
  return body;
}
export const fetchFinancialReportFilters = (signal) => read('/filters', signal);
export const fetchIncomeStatement = (period, signal) => read(`/income-statement?${new URLSearchParams({ period })}`, signal);
export const fetchFinancialReportSnapshots = (query, signal) => read(`/snapshots?${new URLSearchParams(query)}`, signal);
export const fetchFinancialReportTrend = (signal) => read('/trend', signal);
