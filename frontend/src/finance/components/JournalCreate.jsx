import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { date, label, money } from './DocumentDetail.jsx';
import { fetchDocument } from '../services/documents.js';
import { createJournal, isJournalRequestCanceled } from '../services/journals.js';

const blank = { debitAccountId: '', creditAccountId: '', amount: '', description: '' };
const field = 'mt-1.5 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

export default function JournalCreate({ documentId, accounts, close, saved, viewExisting }) {
  const busyRef = useRef(false);
  const [state, setState] = useState({ loading: true });
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true }); setError('');
    fetchDocument(documentId, controller.signal).then(({ data }) => {
      if (controller.signal.aborted) return;
      setState({ data });
      setForm((old) => ({ ...old, amount: old.amount || String(data.so_tien || ''), description: old.description || data.mo_ta || '' }));
    }).catch((err) => { if (!isJournalRequestCanceled(err, controller.signal)) setState({ error: err.message }); });
    return () => controller.abort();
  }, [documentId, retry]);
  const document = state.data;
  const existing = document?.hach_toan?.[0];
  function change(key, value) { setForm((old) => ({ ...old, [key]: value })); }
  async function submit(event) {
    event.preventDefault();
    if (busyRef.current || existing) return;
    setError('');
    if (!form.debitAccountId || !form.creditAccountId) return setError('Vui lòng chọn đầy đủ tài khoản Nợ và tài khoản Có.');
    if (form.debitAccountId === form.creditAccountId) return setError('Tài khoản Nợ và tài khoản Có phải khác nhau.');
    if (!/^\d{1,16}(\.\d{1,2})?$/.test(form.amount) || Number(form.amount) <= 0) return setError('Số tiền phải lớn hơn 0 và có tối đa 2 chữ số thập phân.');
    if (Number(form.amount) > Number(document.so_tien)) return setError('Số tiền hạch toán không được vượt quá số tiền của chứng từ nguồn.');
    if (!form.description.trim()) return setError('Vui lòng nhập diễn giải bút toán.');
    busyRef.current = true; setBusy(true);
    try {
      const result = await createJournal({ documentId, ...form, description: form.description.trim() });
      saved(result.data);
    } catch (err) { setError(err.message); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <section className="panel overflow-hidden border-blue-100" aria-labelledby="create-journal-title"><div className="panel-heading bg-[#f8fbff]"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Chứng từ nguồn</p><h2 id="create-journal-title">{existing ? 'Chứng từ đã hạch toán' : 'Tạo bút toán kế toán'}</h2></div><button type="button" className="icon-button" aria-label="Đóng biểu mẫu" onClick={close}><Icon name="close" /></button></div>
    {state.loading ? <p role="status" className="p-6 text-center text-xs text-slate-500">Đang tải chứng từ nguồn…</p> : state.error ? <p role="alert" className="p-5 text-xs text-rose-700">{state.error}<button className="ml-2 underline" onClick={() => setRetry((n) => n + 1)}>Thử lại</button></p> : document && <div className="p-5"><dl className="mb-5 grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 sm:grid-cols-5">{[['Mã chứng từ', document.ma_chung_tu], ['Ngày chứng từ', date(document.ngay_chung_tu)], ['Loại chứng từ', label(document.loai_chung_tu)], ['Số tiền', money(document.so_tien)], ['Diễn giải', document.mo_ta || '—']].map(([key, value]) => <div key={key}><dt className="text-[10px] text-slate-400">{key}</dt><dd className="mt-1 text-xs font-semibold text-[#173455]">{value}</dd></div>)}</dl>
      {existing ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><span>Chứng từ này đã có bút toán <strong>{existing.ma_hach_toan}</strong>; hệ thống không cho tạo trùng.</span><button type="button" className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 font-semibold" onClick={() => viewExisting(existing.id)}>Xem bút toán</button></div> : <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium text-slate-600">Tài khoản Nợ <span className="text-rose-600">*</span><select required className={field} value={form.debitAccountId} onChange={(e) => change('debitAccountId', e.target.value)}><option value="">Chọn tài khoản Nợ</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.so_tai_khoan} · {account.ten_tai_khoan}</option>)}</select></label><label className="text-xs font-medium text-slate-600">Tài khoản Có <span className="text-rose-600">*</span><select required className={field} value={form.creditAccountId} onChange={(e) => change('creditAccountId', e.target.value)}><option value="">Chọn tài khoản Có</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.so_tai_khoan} · {account.ten_tai_khoan}</option>)}</select></label><label className="text-xs font-medium text-slate-600">Số tiền <span className="text-rose-600">*</span><input required inputMode="decimal" className={field} value={form.amount} onChange={(e) => change('amount', e.target.value)} /></label><label className="text-xs font-medium text-slate-600 sm:col-span-2">Diễn giải <span className="text-rose-600">*</span><textarea required maxLength={10000} rows={3} className="mt-1.5 w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={form.description} onChange={(e) => change('description', e.target.value)} /></label>{error && <p role="alert" className="text-xs text-rose-700 sm:col-span-2">{error}</p>}<div className="flex justify-end gap-2 sm:col-span-2"><button type="button" disabled={busy} className="rounded-md border border-slate-200 px-4 py-2 text-xs" onClick={close}>Hủy</button><button disabled={busy} className="rounded-md bg-[#255b98] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu bút toán'}</button></div></form>}</div>}
  </section>;
}
