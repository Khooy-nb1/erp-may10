import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import JournalBalance from '../components/JournalBalance.jsx';
import { date, money } from '../components/DocumentDetail.jsx';
import { fetchJournal, fetchJournalFilters, fetchJournals, isJournalRequestCanceled } from '../services/journals.js';
import JournalCreate from '../components/JournalCreate.jsx';
import JournalSourcePicker from '../components/JournalSourcePicker.jsx';
import JournalEditor from '../components/JournalEditor.jsx';
import './Journals.css';

const defaults = { q: '', documentId: '', accountId: '', status: '', from: '', to: '', page: 1, pageSize: 20 };
const field = 'journal-field mt-1 h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none';
const statusMap = {
  da_hach_toan: ['Đã hạch toán', 'status-success'], cho_hach_toan: ['Chờ xử lý', 'status-warning'],
  cho_xu_ly: ['Chờ xử lý', 'status-warning'], cho_duyet: ['Chờ duyệt', 'status-warning'],
  tu_choi: ['Từ chối', 'status-danger'], loi: ['Lỗi', 'status-danger'], nhap: ['Nháp', 'status-neutral'],
};
const statusInfo = (value) => statusMap[value] || [value || 'Chưa có trạng thái', 'status-neutral'];
function Status({ value }) { const [label, tone] = statusInfo(value); return <span className={'journal-status ' + tone}>{label}</span>; }

export function JournalDetail({ id, close }) {
  const dialog = useRef(null);
  const [state, setState] = useState({ loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => { dialog.current.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    fetchJournal(id, controller.signal).then((result) => { if (!controller.signal.aborted && result) setState(result); })
      .catch((error) => { if (!isJournalRequestCanceled(error, controller.signal)) setState({ error: error.message }); });
    return () => controller.abort();
  }, [id, retry]);
  const data = state.data;
  return <dialog ref={dialog} onClose={close} aria-labelledby="journal-detail-title" className="journal-detail m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-700 shadow-xl backdrop:bg-slate-950/40">
    <div className="panel-heading sticky top-0 z-10 bg-white"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Hạch toán</p><h2 id="journal-detail-title">Chi tiết bút toán{data ? ` · ${data.ma_hach_toan}` : ''}</h2></div><button autoFocus onClick={() => dialog.current.close()} aria-label="Đóng chi tiết" className="icon-button"><Icon name="close" /></button></div>
    {state.loading && <p role="status" className="p-8 text-center text-sm text-slate-500">Đang tải chi tiết…</p>}
    {state.error && <p role="alert" className="p-6 text-xs text-rose-700">{state.error}<button onClick={() => setRetry((n) => n + 1)} className="ml-2 underline">Thử lại</button></p>}
    {data && <div className="space-y-4 p-5">
      <section className="journal-detail-section"><h3>Thông tin chung</h3><dl className="grid gap-x-5 gap-y-4 sm:grid-cols-3">{[
        ['Mã bút toán', data.ma_hach_toan], ['Ngày hạch toán', date(data.ngay_hach_toan)], ['Kỳ kế toán', data.ky_ke_toan],
        ['Chứng từ nguồn', data.ma_chung_tu], ['Người thực hiện', data.nguoi_thuc_hien || '—'], ['Trạng thái', <Status value={data.trang_thai} />],
        ['Diễn giải', data.mo_ta || '—'],
      ].map(([key, value], i) => <div key={key} className={i === 6 ? 'sm:col-span-3' : ''}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section>
      <section className="journal-detail-section"><div className="mb-3 flex items-center justify-between gap-3"><h3>Chi tiết định khoản</h3><JournalBalance data={data} detailed /></div><div className="overflow-x-auto"><table className="erp-table journal-entry-table min-w-[680px]"><thead><tr><th className="text-left">Tài khoản</th><th className="text-left">Tên tài khoản</th><th className="debit-column text-right">Nợ</th><th className="credit-column text-right">Có</th><th className="text-left">Diễn giải</th></tr></thead><tbody>{data.lines.map((line) => <tr key={line.side}><td className="font-semibold text-[#173455]">{line.account}</td><td>{line.name || '—'}</td><td className="debit-column text-right font-semibold tabular-nums">{line.side === 'no' ? money(line.amount) : '—'}</td><td className="credit-column text-right font-semibold tabular-nums">{line.side === 'co' ? money(line.amount) : '—'}</td><td className="max-w-64 !whitespace-normal text-slate-500">{line.description || '—'}</td></tr>)}</tbody><tfoot><tr><th colSpan={2} className="text-left">Tổng cộng</th><th className="debit-column text-right tabular-nums">{money(data.tong_no)}</th><th className="credit-column text-right tabular-nums">{money(data.tong_co)}</th><th className="text-left">Chênh lệch: {money(data.chenh_lech)}</th></tr></tfoot></table></div><div className={'journal-balance-panel mt-3 ' + (Number(data.chenh_lech) === 0 ? 'balanced' : 'different')}>{Number(data.chenh_lech) === 0 ? '✓ Bút toán cân đối' : '⚠ Bút toán chênh lệch'}</div></section>
      <section className="journal-source"><h3>Chứng từ nguồn · {data.ma_chung_tu}</h3><p>Ngày: {date(data.ngay_chung_tu)} · Loại: {data.loai_chung_tu} · Số tiền: {money(data.so_tien_chung_tu)}</p><p className="mt-2 text-slate-500">{data.mo_ta_chung_tu || '—'}</p><p className="mt-2 break-all text-[10px] text-slate-400">Tham chiếu nguồn: {data.bang_chung_tu_lien_quan || '—'} / ID {data.ma_chung_tu_lien_quan || '—'} (chưa xác minh bằng khóa ngoại)</p></section>
      {data.trung_tai_khoan && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Cảnh báo: tài khoản Nợ và Có trùng nhau. Cần kiểm tra nghiệp vụ; hệ thống không tự sửa.</p>}
    </div>}
  </dialog>;
}

export default function Journals({ canCreate=false, canEdit=false }) {
  const [draft, setDraft] = useState(defaults), [query, setQuery] = useState(defaults);
  const [state, setState] = useState({ loading: true });
  const [filters, setFilters] = useState({ documents: [], accounts: [], statuses: [] });
  const [filterError, setFilterError] = useState(''), [validation, setValidation] = useState('');
  const [retry, setRetry] = useState(0), [selected, setSelected] = useState(null);
  const [editing,setEditing]=useState(null);
  const [sourceDocumentId, setSourceDocumentId] = useState(() => new URLSearchParams(window.location.search).get('documentId') || '');
  const [sourcePickerOpen,setSourcePickerOpen]=useState(()=>canCreate&&new URLSearchParams(window.location.search).get('action')==='create');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setFilterError('');
    fetchJournalFilters(controller.signal).then((data) => { if (!controller.signal.aborted && data) setFilters(data); })
      .catch((error) => { if (!isJournalRequestCanceled(error, controller.signal)) setFilterError(error.message); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    const controller = new AbortController(); setState({ loading: true });
    fetchJournals(query, controller.signal).then((data) => { if (!controller.signal.aborted && data) setState(data); })
      .catch((error) => { if (!isJournalRequestCanceled(error, controller.signal)) setState({ error: error.message }); });
    return () => controller.abort();
  }, [query, retry]);
  const change = (key, value) => setDraft((old) => ({ ...old, [key]: value }));
  const summary = state.summary, pagination = state.pagination;
  function submit(event) { event.preventDefault(); if (draft.from && draft.to && draft.from > draft.to) { setValidation('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'); return; } setValidation(''); setQuery({ ...draft, page: 1 }); }
  const reset = () => { setDraft(defaults); setQuery({ ...defaults }); setValidation(''); };
  const closeCreate = () => { setSourceDocumentId(''); window.history.replaceState(null, '', '/hach-toan'); };
  const openSourcePicker=()=>{window.history.replaceState(null,'','/hach-toan?action=create');setSourcePickerOpen(true)};
  const closeSourcePicker=()=>{setSourcePickerOpen(false);if(new URLSearchParams(window.location.search).get('action')==='create')window.history.replaceState(null,'','/hach-toan')};
  const selectSourceDocument=(document)=>{setSourcePickerOpen(false);setSourceDocumentId(String(document.id));window.history.replaceState(null,'',`/hach-toan?documentId=${encodeURIComponent(document.id)}`)};
  const kpis = [
    ['Tổng số bút toán', summary?.total ?? '—', 'Theo điều kiện tìm kiếm', 'book', 'blue'],
    ['Tổng giá trị hạch toán', money(summary?.total_amount), 'Chưa xác định đơn vị tiền tệ', 'wallet', 'indigo'],
    ['Đã hạch toán', summary?.accounted ?? '—', 'Theo trạng thái dữ liệu', 'check', 'green'],
    ['Chờ xử lý', '—', 'Chưa có dữ liệu', 'clock', 'amber'],
    ['Bút toán lỗi', '—', 'Chưa có dữ liệu', 'report', 'red'],
  ];
  return <div className="journals-page">
    <header className="journal-page-header"><nav aria-label="Đường dẫn trang hạch toán">Tài chính <span>›</span> Hạch toán</nav><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="journal-page-icon"><Icon name="edit" className="h-5 w-5" /></span><div><h1>Hạch toán</h1><p>Tra cứu, kiểm tra và quản lý bút toán kế toán.</p></div></div><div className="flex items-center gap-2">{canCreate&&<button type="button" onClick={openSourcePicker} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#255b98] px-4 text-xs font-semibold text-white hover:bg-[#173455]"><Icon name="plus" className="h-4 w-4"/>Tạo bút toán</button>}<span className="readonly-badge"><span />Theo chứng từ nguồn</span></div></div></header>
    {notice && <div role="status" className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">{notice}<button type="button" className="icon-button" aria-label="Đóng thông báo" onClick={() => setNotice('')}><Icon name="close" /></button></div>}
    {canCreate&&sourcePickerOpen&&<JournalSourcePicker close={closeSourcePicker} select={selectSourceDocument}/>}
    {canCreate && sourceDocumentId && <JournalCreate documentId={sourceDocumentId} accounts={filters.accounts} close={closeCreate} viewExisting={(id) => { closeCreate(); setSelected(id); }} saved={(entry) => { closeCreate(); setNotice(`Đã lưu bút toán ${entry.ma_hach_toan}.`); setQuery((old) => ({ ...old, documentId: String(entry.ma_chung_tu_goc), page: 1 })); setDraft((old) => ({ ...old, documentId: String(entry.ma_chung_tu_goc), page: 1 })); setRetry((n) => n + 1); }} />}
    <section aria-label="Tổng quan hạch toán" className="journal-kpis">{kpis.map(([title, value, note, icon, tone]) => <article className={'journal-kpi journal-kpi-' + tone} key={title}><div className="flex items-start justify-between gap-2"><div><h2>{title}</h2><p className="journal-kpi-value">{value}</p></div><span className="journal-kpi-icon"><Icon name={icon} className="h-4 w-4" /></span></div><p className="journal-kpi-note">{note}</p></article>)}</section>
    <form onSubmit={submit} className="panel journal-filter-panel"><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-[#173455]"><Icon name="filter" className="h-3.5 w-3.5 text-blue-600" />Bộ lọc tra cứu</div><div className="journal-filter-grid">
      <label className="journal-search-field text-[11px] text-slate-500">Tìm kiếm<div className="relative"><Icon name="search" className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={draft.q} maxLength={200} className={field + ' pl-8'} onChange={(e) => change('q', e.target.value)} placeholder="Mã bút toán, chứng từ, diễn giải…" /></div></label>
      <label className="text-[11px] text-slate-500">Chứng từ<select className={field} value={draft.documentId} onChange={(e) => change('documentId', e.target.value)}><option value="">Tất cả chứng từ</option>{filters.documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.ma_chung_tu}</option>)}</select></label>
      <label className="text-[11px] text-slate-500">Tài khoản Nợ / Có<select className={field} value={draft.accountId} onChange={(e) => change('accountId', e.target.value)}><option value="">Tất cả tài khoản</option>{filters.accounts.map((account) => <option key={account.id} value={account.id}>{account.so_tai_khoan} · {account.ten_tai_khoan}</option>)}</select></label>
      <label className="text-[11px] text-slate-500">Trạng thái<select className={field} value={draft.status} onChange={(e) => change('status', e.target.value)}><option value="">Tất cả trạng thái</option>{filters.statuses.map((status) => <option key={status} value={status}>{statusInfo(status)[0]}</option>)}</select></label>
      {['from', 'to'].map((key) => <label key={key} className="text-[11px] text-slate-500">{key === 'from' ? 'Từ ngày' : 'Đến ngày'}<input type="date" className={field} value={draft[key]} onChange={(e) => change(key, e.target.value)} /></label>)}
      <button type="button" onClick={reset} className="journal-reset-button">Đặt lại</button><button className="journal-search-button"><Icon name="search" className="h-3.5 w-3.5" />Tìm kiếm</button>
    </div>{validation && <p role="alert" className="mt-2 text-xs text-rose-700">{validation}</p>}{filterError && <p role="alert" className="mt-2 text-xs text-rose-700">Không tải được bộ lọc. <button type="button" onClick={() => setRetry((n) => n + 1)} className="underline">Thử lại</button></p>}</form>
    <section className="panel overflow-hidden"><div className="panel-heading"><div><h2>Danh sách bút toán</h2><p className="mt-0.5 text-[10px] text-slate-400">Dữ liệu mới nhất theo ngày hạch toán</p></div><span className="journal-record-count">{pagination?.total ?? '—'} bản ghi</span></div>
      {state.loading ? <p role="status" className="p-10 text-center text-xs text-slate-500">Đang tải bút toán…</p> : state.error ? <p role="alert" className="p-8 text-center text-xs text-rose-700">{state.error}<button className="ml-2 underline" onClick={() => setRetry((n) => n + 1)}>Thử lại</button></p> : !state.data?.length ? <p className="p-10 text-center text-xs text-slate-500">Không có bút toán phù hợp với điều kiện tìm kiếm.</p> : <div className="overflow-x-auto"><table className="erp-table journal-list-table min-w-[1120px]"><thead><tr>{['STT', 'Mã bút toán', 'Chứng từ', 'Ngày hạch toán', 'Tài khoản Nợ', 'Tài khoản Có', 'Số tiền', 'Trạng thái', 'Cân đối', 'Người thực hiện', 'Thao tác'].map((name) => <th key={name} scope="col" className={name === 'Số tiền' ? 'text-right' : name === 'Thao tác' ? 'text-center' : 'text-left'}>{name}</th>)}</tr></thead><tbody>{state.data.map((row, index) => <tr key={row.id}><td className="text-slate-400">{((pagination?.page || 1) - 1) * (pagination?.pageSize || query.pageSize) + index + 1}</td><td><button className="journal-code" onClick={() => setSelected(row.id)}>{row.ma_hach_toan}</button></td><td><span className="document-code">{row.ma_chung_tu}</span></td><td className="tabular-nums">{date(row.ngay_hach_toan)}</td><td><span className="account-code debit">{row.so_tai_khoan_no}</span><span className="account-name">{row.ten_tai_khoan_no || '—'}</span></td><td><span className="account-code credit">{row.so_tai_khoan_co}</span><span className="account-name">{row.ten_tai_khoan_co || '—'}</span></td><td className="text-right font-semibold tabular-nums text-[#173455]">{money(row.so_tien)}</td><td><Status value={row.trang_thai} /></td><td><JournalBalance data={row} />{row.trung_tai_khoan && <span className="mt-1 block text-[9px] text-amber-700">Trùng tài khoản</span>}</td><td>{row.nguoi_thuc_hien || '—'}</td><td className="text-center"><button className="icon-button" aria-label={`Xem ${row.ma_hach_toan}`} onClick={() => setSelected(row.id)}><Icon name="eye" className="h-4 w-4" /></button>{canEdit&&<button className="icon-button" title="Sửa bút toán" aria-label={`Sửa ${row.ma_hach_toan}`} onClick={()=>setEditing(row.id)}><Icon name="edit" className="h-4 w-4"/></button>}</td></tr>)}</tbody></table></div>}
      {pagination && <div className="journal-pagination"><span>{pagination.total} bản ghi · Theo bộ lọc hiện tại</span><div className="flex items-center gap-3"><label>Số dòng <select value={query.pageSize} className="rounded border border-slate-200 px-2 py-1 outline-none focus:border-blue-400" onChange={(e) => { const size = Number(e.target.value); setDraft((old) => ({ ...old, pageSize: size })); setQuery((old) => ({ ...old, pageSize: size, page: 1 })); }}>{[10, 20, 50, 100].map((size) => <option key={size}>{size}</option>)}</select></label><button disabled={pagination.page === 1} onClick={() => setQuery((old) => ({ ...old, page: pagination.page - 1 }))}>Trước</button><span>{pagination.page} / {pagination.totalPages}</span><button disabled={pagination.page === pagination.totalPages} onClick={() => setQuery((old) => ({ ...old, page: pagination.page + 1 }))}>Sau</button></div></div>}
    </section>
    <p className="journal-data-note">Cân đối được tính từ một cặp tài khoản và một số tiền chung; schema chưa có bảng dòng định khoản độc lập. “Đã hạch toán” là trạng thái lưu trong dữ liệu, chưa xác nhận bước duyệt hoặc ghi sổ. Chưa xác định đơn vị tiền tệ.</p>
    {selected && <JournalDetail id={selected} close={() => setSelected(null)} />}
    {canEdit&&editing&&<JournalEditor id={editing} accounts={filters.accounts} close={()=>setEditing(null)} saved={(entry)=>{setEditing(null);setNotice(`Đã cập nhật bút toán ${entry.ma_hach_toan}.`);setRetry(value=>value+1)}}/>}
  </div>;
}
