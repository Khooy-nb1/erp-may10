import { financeFetch } from './http.js';
function canceled(error,signal){return signal?.aborted||error?.name==='AbortError'||error?.code==='ERR_CANCELED';}
async function read(path,signal){let response;try{response=await financeFetch(`/api/order-efficiency${path}`,{signal});}catch(error){if(canceled(error,signal))return;throw new Error('Không kết nối được máy chủ. Vui lòng thử lại.');}let body;try{body=await response.json();}catch{body=null;}if(!response.ok||!body)throw new Error(response.status<500?body?.error?.message||'Yêu cầu không hợp lệ.':'Không tải được dữ liệu hiệu quả đơn hàng.');return body;}
export const fetchOrderEfficiency=(query,signal)=>read(`?${new URLSearchParams(query)}`,signal);
export const fetchOrderEfficiencyFilters=signal=>read('/filters',signal);

