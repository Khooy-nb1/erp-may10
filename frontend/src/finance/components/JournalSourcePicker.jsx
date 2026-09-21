import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { date, label, money } from './DocumentDetail.jsx';
import { fetchDocuments } from '../services/documents.js';

export default function JournalSourcePicker({ close, select }) {
  const dialog=useRef(null);
  const[state,setState]=useState({loading:true});
  const[query,setQuery]=useState('');
  const[retry,setRetry]=useState(0);
  useEffect(()=>{dialog.current?.showModal()},[]);
  useEffect(()=>{
    const controller=new AbortController();setState({loading:true});
    fetchDocuments({status:'hieu_luc',page:1,pageSize:100},controller.signal)
      .then(result=>{if(!controller.signal.aborted)setState({data:(result.data||[]).filter(document=>document.trang_thai==='hieu_luc'&&!document.da_hach_toan)})})
      .catch(error=>{if(!controller.signal.aborted&&error.name!=='AbortError')setState({error:error.message})});
    return()=>controller.abort();
  },[retry]);
  const normalized=query.trim().toLocaleLowerCase('vi-VN');
  const rows=(state.data||[]).filter(document=>!normalized||[document.ma_chung_tu,document.loai_chung_tu,document.mo_ta].some(value=>String(value||'').toLocaleLowerCase('vi-VN').includes(normalized)));
  return <dialog ref={dialog} onClose={close} onCancel={event=>{event.preventDefault();dialog.current?.close()}} aria-labelledby="journal-source-title" className="m-auto max-h-[85vh] w-[calc(100%_-_2rem)] max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-slate-700 shadow-xl backdrop:bg-slate-950/40">
    <div className="panel-heading"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Chứng từ nguồn</p><h2 id="journal-source-title">Chọn chứng từ chờ hạch toán</h2><p className="mt-1 text-xs text-slate-500">Chỉ hiển thị chứng từ hiệu lực chưa có bút toán liên quan.</p></div><button autoFocus type="button" className="icon-button" aria-label="Đóng" onClick={()=>dialog.current?.close()}><Icon name="close"/></button></div>
    <div className="border-b border-slate-100 p-4"><label className="relative block"><Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input value={query} onChange={event=>setQuery(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Tìm theo mã, loại hoặc mô tả chứng từ…"/></label></div>
    <div className="max-h-[56vh] overflow-y-auto">
      {state.loading?<p role="status" className="p-10 text-center text-sm text-slate-500">Đang tải chứng từ chờ hạch toán…</p>:state.error?<div role="alert" className="p-8 text-center text-sm text-rose-700">{state.error}<button type="button" onClick={()=>setRetry(value=>value+1)} className="ml-2 underline">Thử lại</button></div>:!rows.length?<div className="p-10 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Icon name="file"/></span><h3 className="mt-3 text-sm font-semibold text-[#173455]">Không có chứng từ chờ hạch toán</h3>{query&&state.data?.length>0&&<p className="mt-1 text-xs text-slate-500">Không có chứng từ phù hợp với từ khóa tìm kiếm.</p>}</div>:<div className="divide-y divide-slate-100">{rows.map(document=><button type="button" key={document.id} onClick={()=>select(document)} className="grid w-full gap-2 px-5 py-3 text-left hover:bg-blue-50/60 sm:grid-cols-[minmax(130px,1fr)_minmax(120px,1fr)_110px_130px]"><span><strong className="block text-sm text-[#255b98]">{document.ma_chung_tu}</strong><small className="mt-1 line-clamp-1 block text-slate-500">{document.mo_ta||'Không có mô tả'}</small></span><span className="text-xs text-slate-600">{label(document.loai_chung_tu)}</span><span className="text-xs tabular-nums text-slate-500">{date(document.ngay_chung_tu)}</span><strong className="text-right text-xs tabular-nums text-[#173455]">{money(document.so_tien)}</strong></button>)}</div>}
    </div>
    <div className="flex justify-end border-t border-slate-100 px-4 py-3"><button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium hover:bg-slate-50" onClick={()=>dialog.current?.close()}>Đóng</button></div>
  </dialog>;
}
