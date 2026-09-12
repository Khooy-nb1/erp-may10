import { financeFetch } from './http.js';
function canceled(error, signal) { return signal?.aborted || error?.name === 'AbortError' || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED'; }
async function read(path, signal) {
  let response;
  try { response = await financeFetch(`/api/debts${path}`, { signal }); }
  catch (error) { if (canceled(error, signal)) return undefined; throw new Error('Không kết nối được máy chủ. Vui lòng thử lại.'); }
  let body;
  try { body = await response.json(); } catch (error) { if (canceled(error, signal)) return undefined; body = null; }
  if (!response.ok || !body) throw new Error(response.status < 500 ? body?.error?.message || 'Yêu cầu không hợp lệ.' : 'Không tải được dữ liệu công nợ. Vui lòng thử lại.');
  return body;
}
export const fetchDebts = (query, signal) => read(`?${new URLSearchParams(query)}`, signal);
export const fetchDebtFilters = (signal) => read('/filters', signal);
export const fetchDebt = (id, signal) => read(`/${encodeURIComponent(id)}`, signal);
