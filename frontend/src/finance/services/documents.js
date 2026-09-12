import { financeFetch } from './http.js';
async function read(path, signal) {
  let response;
  try { response = await financeFetch(`/api/documents${path}`, { signal }); }
  catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Không thể kết nối máy chủ. Vui lòng thử lại.');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw new Error(response.status === 400 || response.status === 404 ? payload?.error?.message || 'Yêu cầu không hợp lệ.' : 'Không thể tải chứng từ. Kiểm tra kết nối máy chủ và thử lại.');
  return payload;
}
export const fetchDocuments = (params, signal) => read(`?${new URLSearchParams(params)}`, signal);
export const fetchFilters = (signal) => read('/filters', signal);
export const fetchDocument = (id, signal) => read(`/${encodeURIComponent(id)}`, signal);

async function write(method, path, body) {
  let response;
  try {
    response = await financeFetch(`/api/documents${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  } catch {
    throw new Error('Mất kết nối. Chưa xác định thao tác đã lưu hay chưa; hãy tải lại danh sách để kiểm tra trước khi gửi lại.');
  }
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(response.status < 500 ? payload?.error?.message || 'Thao tác không hợp lệ.' : 'Máy chủ không thể xử lý thao tác. Vui lòng kiểm tra lại danh sách.');
  if (!payload) throw new Error('Không đọc được kết quả lưu. Hãy tải lại danh sách để kiểm tra.');
  return payload;
}
export const saveDocument = (id, data) => write(id ? 'PATCH' : 'POST', id ? `/${encodeURIComponent(id)}` : '', data);
export const removeDocument = (id) => write('DELETE', `/${encodeURIComponent(id)}`);
