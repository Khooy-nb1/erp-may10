import { financeFetch } from './http.js';
export function isJournalRequestCanceled(error, signal) {
  return Boolean(
    signal?.aborted
    || error?.name === 'AbortError'
    || error?.name === 'CanceledError'
    || error?.code === 'ERR_CANCELED'
  );
}

async function read(path, signal) {
  let response;
  try { response = await financeFetch(`/api/journals${path}`, { signal }); }
  catch (error) { if (isJournalRequestCanceled(error, signal)) return undefined; throw new Error('Không kết nối được máy chủ. Vui lòng thử lại.'); }
  let body;
  try { body = await response.json(); }
  catch (error) { if (isJournalRequestCanceled(error, signal)) return undefined; body = null; }
  if (!response.ok || !body) throw new Error(response.status < 500 ? body?.error?.message || 'Yêu cầu không hợp lệ.' : 'Không tải được bút toán. Vui lòng thử lại.');
  return body;
}
export const fetchJournals = (query, signal) => read(`?${new URLSearchParams(query)}`, signal);
export const fetchJournalFilters = (signal) => read('/filters', signal);
export const fetchJournal = (id, signal) => read(`/${encodeURIComponent(id)}`, signal);

export async function createJournal(data) {
  let response;
  try {
    response = await financeFetch('/api/journals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  } catch {
    throw new Error('Mất kết nối. Chưa xác định bút toán đã được lưu hay chưa; hãy tải lại danh sách trước khi gửi lại.');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || (response.status < 500 ? 'Dữ liệu hạch toán không hợp lệ.' : 'Máy chủ không thể lưu bút toán.'));
  if (!payload?.data) throw new Error('Không đọc được kết quả lưu. Hãy tải lại danh sách để kiểm tra.');
  return payload;
}

export async function updateJournal(id, data) {
  let response;
  try {
    response = await financeFetch(`/api/journals/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  } catch {
    throw new Error('Mất kết nối. Chưa xác định bút toán đã được cập nhật hay chưa; hãy tải lại danh sách trước khi gửi lại.');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || (response.status < 500 ? 'Dữ liệu cập nhật không hợp lệ.' : 'Máy chủ không thể cập nhật bút toán.'));
  if (!payload?.data) throw new Error('Không đọc được kết quả cập nhật. Hãy tải lại danh sách để kiểm tra.');
  return payload;
}
