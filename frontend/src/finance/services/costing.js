import { financeFetch } from './http.js';
function canceled(error,signal){return signal?.aborted||error?.name==='AbortError'||error?.name==='CanceledError'||error?.code==='ERR_CANCELED';}
async function read(path,signal){let response;try{response=await financeFetch(`/api/costing${path}`,{signal});}catch(error){if(canceled(error,signal))return;throw new Error('Không kết nối được máy chủ. Vui lòng thử lại.');}let body;try{body=await response.json();}catch{body=null;}if(!response.ok||!body)throw new Error(response.status<500?body?.error?.message||'Yêu cầu không hợp lệ.':'Không tải được dữ liệu giá thành.');return body;}
export const fetchCosting=(query,signal)=>read(`?${new URLSearchParams(query)}`,signal);
export const fetchCostingFilters=signal=>read('/filters',signal);
export const fetchCostingDetail=(id,signal)=>read(`/${encodeURIComponent(id)}`,signal);
