import { useEffect, useId, useRef, useState } from 'react';
import { fetchDocument, saveDocument, removeDocument } from '../services/documents.js';
import Icon from './Icon.jsx';

const blank = { ma_chung_tu: '', loai_chung_tu: '', ngay_chung_tu: '', so_tien: '', mo_ta: '', file_dinh_kem: '' };
const titles = { ma_chung_tu: 'Mã chứng từ', loai_chung_tu: 'Loại chứng từ', ngay_chung_tu: 'Ngày chứng từ', so_tien: 'Số tiền', mo_ta: 'Mô tả', file_dinh_kem: 'Tham chiếu tệp đính kèm' };
function localDate(value) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
  const part = (key) => parts.find((item) => item.type === key).value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`;
}
function blocked(data) {
  if (data.hach_toan.length) return 'Chứng từ đã có bút toán liên quan. Không được sửa hoặc xóa.';
  if (data.trang_thai !== 'hieu_luc') return 'Trạng thái hiện tại chưa có quy tắc sửa/xóa được xác nhận.';
  if (data.ma_chung_tu_lien_quan !== null || data.bang_chung_tu_lien_quan !== null) return 'Chứng từ có tham chiếu nguồn. Chưa đủ quan hệ để sửa/xóa an toàn.';
  return '';
}

export function DocumentRowMenu({ doc, edit, remove, canEdit=true, canDelete=true }) {
  const id = useId();
  const menu = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  return <>{canEdit&&<button className="icon-button !h-7 !w-7" title="Sửa chứng từ" aria-label={`Sửa ${doc.ma_chung_tu}`} onClick={edit}><Icon name="edit" className="h-4 w-4" /></button>}{canDelete&&<><button popoverTarget={id} aria-label={`Thao tác ${doc.ma_chung_tu}`} className="icon-button !h-7 !w-7" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setPosition({ top: Math.min(rect.bottom + 4, window.innerHeight - 70), left: Math.max(8, rect.right - 168) }); }}>•••</button><div ref={menu} id={id} popover="auto" style={{ ...position, margin: 0 }} className="fixed w-40 rounded-md border border-slate-200 bg-white p-1 shadow-md"><button className="w-full rounded px-3 py-2 text-left text-xs text-rose-700 hover:bg-rose-50" onClick={() => { menu.current.hidePopover(); remove(); }}>Xóa chứng từ…</button></div></>}</>;
}

export default function DocumentEditor({ action, types, close, saved }) {
  const dialog = useRef(null);
  const busyRef = useRef(false);
  const [form, setForm] = useState(blank);
  const [initial, setInitial] = useState(blank);
  const [loading, setLoading] = useState(Boolean(action.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [restriction, setRestriction] = useState('');
  const [retry, setRetry] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const deleting = action.mode === 'delete';
  useEffect(() => { dialog.current.showModal(); }, []);
  useEffect(() => {
    if (!action.id) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    fetchDocument(action.id, controller.signal).then(({ data }) => {
      if (controller.signal.aborted) return;
      const values = Object.fromEntries(Object.keys(blank).map((key) => [key, key === 'ngay_chung_tu' ? localDate(data[key]) : data[key] ?? '']));
      setForm(values); setInitial(values); setRestriction(blocked(data)); setLoading(false);
    }).catch((err) => { if (!controller.signal.aborted) { setError(err.message); setLoading(false); setRestriction('Chưa tải được chứng từ để kiểm tra điều kiện thao tác.'); } });
    return () => controller.abort();
  }, [action.id, retry]);
  async function submit(event) {
    event.preventDefault();
    if (busyRef.current || restriction || loading) return;
    setError('');
    if (!deleting && (!form.ma_chung_tu.trim() || !form.loai_chung_tu.trim() || !form.ngay_chung_tu || !/^\d{1,16}(\.\d{1,2})?$/.test(form.so_tien))) {
      setError('Nhập mã, loại, ngày hợp lệ và số tiền không âm (tối đa 16 chữ số nguyên, 2 số thập phân, dùng dấu chấm).'); return;
    }
    if (deleting && !confirmed) return;
    const payload = {};
    if (!deleting) {
      for (const key of Object.keys(blank)) {
        if (action.id && form[key] === initial[key]) continue;
        let value = form[key].trim();
        if (key === 'ngay_chung_tu') {
          if (value.length === 16) value += ':00';
          value = `${value}+07:00`;
        }
        payload[key] = ['mo_ta', 'file_dinh_kem'].includes(key) ? value || null : value;
      }
      if (!Object.keys(payload).length) { setError('Chưa có thay đổi để lưu.'); return; }
    }
    busyRef.current = true; setBusy(true);
    try {
      if (deleting) await removeDocument(action.id); else await saveDocument(action.id, payload);
      saved(deleting ? 'Đã xóa chứng từ.' : 'Đã lưu chứng từ.');
    } catch (err) { setError(err.message); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} onCancel={(event) => { if (busyRef.current) event.preventDefault(); }} onClose={close} aria-labelledby="document-editor-title" className="m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-0 text-slate-700 shadow-xl backdrop:bg-slate-950/40"><form onSubmit={submit}><div className="panel-heading"><div><h2 id="document-editor-title">{deleting ? 'Xác nhận xóa chứng từ' : action.id ? 'Sửa chứng từ kế toán' : 'Thêm chứng từ kế toán'}</h2><p className="mt-1 text-[11px] text-slate-500">{action.id ? form.ma_chung_tu : 'Nhập thông tin chứng từ gốc'}</p></div><button type="button" disabled={busy} className="icon-button" aria-label="Đóng" onClick={close}><Icon name="close" /></button></div>
      <div className="space-y-4 p-5">{loading ? <p role="status" className="text-sm text-slate-500">Đang kiểm tra chứng từ và bút toán liên quan…</p> : <>
        {restriction && <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">{restriction}</p>}
        {deleting ? <div className="space-y-3 text-sm"><p>Chứng từ sẽ bị xóa vĩnh viễn. Máy chủ sẽ kiểm tra lại trạng thái, bút toán và tham chiếu trước khi xóa.</p><label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={confirmed} disabled={Boolean(restriction) || busy} onChange={(e) => setConfirmed(e.target.checked)} />Tôi xác nhận xóa chứng từ này. Thao tác không thể hoàn tác.</label></div> : <fieldset disabled={busy || Boolean(restriction)} className="grid gap-4 sm:grid-cols-2 disabled:opacity-70">{Object.keys(blank).map((key) => <label key={key} className={`${key === 'mo_ta' || key === 'file_dinh_kem' ? 'sm:col-span-2' : ''} text-xs font-medium text-slate-600`}>{titles[key]}{['ma_chung_tu', 'loai_chung_tu', 'ngay_chung_tu', 'so_tien'].includes(key) && <span className="ml-1 text-rose-600">*</span>}{key === 'mo_ta' ? <textarea rows={3} maxLength={10000} value={form[key]} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))} className="mt-1.5 w-full rounded-md border border-slate-200 px-3 py-2 text-xs" /> : <input required={key !== 'file_dinh_kem'} type={key === 'ngay_chung_tu' ? 'datetime-local' : 'text'} step={key === 'ngay_chung_tu' ? '0.001' : undefined} maxLength={key === 'so_tien' ? 19 : key === 'file_dinh_kem' ? 2000 : 50} list={key === 'loai_chung_tu' ? 'document-type-options' : undefined} value={form[key]} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))} className="mt-1.5 h-9 w-full rounded-md border border-slate-200 px-3 text-xs" />}</label>)}<datalist id="document-type-options">{types.map((type) => <option value={type} key={type} />)}</datalist><p className="text-[11px] leading-5 text-slate-500 sm:col-span-2">Ngày theo giờ Việt Nam. Số tiền chưa xác định đơn vị tiền tệ. Tệp đính kèm chỉ lưu tham chiếu văn bản, không tải tệp lên. ID, trạng thái, người tạo và thời gian hệ thống không được nhập từ form.</p></fieldset>}
      </>}{error && <div role="alert" className="text-xs leading-6 text-rose-700">{error}{restriction && <button type="button" className="ml-2 underline" onClick={() => setRetry((value) => value + 1)}>Tải lại thông tin</button>}</div>}</div>
      <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3"><button type="button" disabled={busy} className="rounded-md border border-slate-200 px-4 py-2 text-xs" onClick={close}>Hủy</button><button disabled={busy || loading || Boolean(restriction) || (deleting && !confirmed)} className={`rounded-md px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 ${deleting ? 'bg-rose-700' : 'bg-[#255b98]'}`}>{busy ? 'Đang xử lý…' : deleting ? 'Xóa chứng từ' : 'Lưu chứng từ'}</button></div>
    </form></dialog>;
}
