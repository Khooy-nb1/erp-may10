import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { fetchDocument } from '../services/documents.js';

const labels = {
  hoa_don_ban: 'Hóa đơn bán', hoa_don_ban_hang: 'Hóa đơn bán hàng', phieu_nhap_xuat_kho: 'Phiếu nhập / xuất kho',
  hieu_luc: 'Hiệu lực', da_hach_toan: 'Đã hạch toán', cho_hach_toan: 'Chờ hạch toán',
};
export const label = (value) => value == null ? 'Chưa có thông tin' : labels[value] || value;
export const date = (value) => value ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short' }).format(new Date(value)) : '—';
// Format PostgreSQL numeric as text, preserving decimal precision without Number conversion.
export function money(value) {
  if (value == null) return '—';
  const [whole, fraction] = String(value).split('.');
  const decimal = fraction?.replace(/0+$/, '');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (decimal ? `,${decimal}` : '');
}
export function Badge({ value }) {
  const semantic = {
    hieu_luc: 'bg-emerald-50 text-emerald-800', da_hach_toan: 'bg-emerald-50 text-emerald-800',
    cho_hach_toan: 'bg-amber-50 text-amber-800', cho_xu_ly: 'bg-amber-50 text-amber-800', cho_duyet: 'bg-amber-50 text-amber-800',
    tu_choi: 'bg-rose-50 text-rose-700', loi: 'bg-rose-50 text-rose-700',
    nhap: 'bg-slate-100 text-slate-600',
  };
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${semantic[value] || 'bg-slate-100 text-slate-600'}`}>{label(value)}</span>;
}

export default function DocumentDetail({ id, close }) {
  const dialog = useRef(null);
  const [state, setState] = useState({ loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => { dialog.current.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    fetchDocument(id, controller.signal).then(({ data }) => setState({ data })).catch((error) => { if (!controller.signal.aborted) setState({ error: error.message }); });
    return () => controller.abort();
  }, [id, retry]);
  const data = state.data;
  return <dialog ref={dialog} onClose={close} className="m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto rounded-md border border-slate-200 bg-white p-0 text-slate-700 shadow-xl backdrop:bg-slate-950/40" aria-labelledby="document-detail-title"><div className="panel-heading"><div><h2 id="document-detail-title">Chi tiết chứng từ{data ? ` · ${data.ma_chung_tu}` : ''}</h2><p className="mt-1 text-[11px] text-slate-500">Thông tin chứng từ và bút toán liên quan</p></div><button autoFocus className="icon-button" aria-label="Đóng chi tiết" onClick={() => dialog.current.close()}><Icon name="close" /></button></div>
    {state.loading && <p role="status" className="p-8 text-center text-sm text-slate-500">Đang tải chi tiết chứng từ…</p>}
    {state.error && <div role="alert" className="p-6 text-sm text-rose-700">{state.error}<button className="ml-3 underline" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>}
    {data && <div className="space-y-5 p-5"><dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{[['Mã chứng từ', data.ma_chung_tu], ['Loại chứng từ', label(data.loai_chung_tu)], ['Ngày chứng từ', date(data.ngay_chung_tu)], ['Số tiền', money(data.so_tien)], ['Trạng thái', <Badge value={data.trang_thai} />], ['Người tạo', data.ten_nguoi_tao], ['Ngày tạo', date(data.ngay_tao)], ['Người cập nhật', data.ten_nguoi_cap_nhat], ['Ngày cập nhật', date(data.ngay_cap_nhat)]].map(([title, value]) => <div key={title}><dt className="mb-1 text-[11px] text-slate-500">{title}</dt><dd className="break-words text-sm font-medium">{value || '—'}</dd></div>)}</dl>
      <div><h3 className="mb-1 text-[11px] text-slate-500">Mô tả</h3><p className="whitespace-pre-wrap break-words text-sm">{data.mo_ta || '—'}</p></div>
      <section className="rounded border border-slate-200 bg-slate-50 p-3 text-xs"><h3 className="font-semibold">Tham chiếu chứng từ nguồn</h3><p className="mt-2 break-all">{data.bang_chung_tu_lien_quan || 'Chưa có bảng nguồn'} · ID: {data.ma_chung_tu_lien_quan || '—'}</p><p className="mt-2 leading-5 text-slate-500">Tham chiếu được lưu trong chứng từ, chưa được ràng buộc bằng khóa ngoại. Chưa xác minh chứng từ nguồn.</p></section>
      <div><h3 className="mb-1 text-[11px] text-slate-500">Tệp đính kèm (tham chiếu)</h3><p className="break-all text-xs">{data.file_dinh_kem || 'Chưa có tệp đính kèm'}</p>{data.file_dinh_kem && <p className="mt-1 text-[11px] text-slate-500">Chưa có dịch vụ truy cập tệp; chỉ hiển thị giá trị đã lưu.</p>}</div>
      <section><h3 className="mb-3 text-sm font-semibold text-[#173455]">Bút toán liên quan ({data.hach_toan.length})</h3>{data.hach_toan.length ? <div className="overflow-x-auto"><table className="erp-table min-w-[640px]"><thead><tr><th className="text-left">Mã / Ngày</th><th className="text-left">Tài khoản Nợ</th><th className="text-left">Tài khoản Có</th><th className="text-right">Số tiền</th><th className="text-left">Kỳ / Trạng thái</th></tr></thead><tbody>{data.hach_toan.map((entry) => <tr key={entry.id}><td>{entry.ma_hach_toan}<span className="mt-1 block text-slate-500">{date(entry.ngay_hach_toan)}</span></td><td title={entry.ten_tai_khoan_no}>{entry.so_tai_khoan_no}</td><td title={entry.ten_tai_khoan_co}>{entry.so_tai_khoan_co}</td><td className="text-right tabular-nums">{money(entry.so_tien)}</td><td>{entry.ky_ke_toan}<span className="mt-1 block text-slate-500">{label(entry.trang_thai)}</span></td></tr>)}</tbody></table></div> : <p className="text-xs text-slate-500">Chưa có bút toán liên kết với chứng từ này.</p>}</section>
      <p className="text-[11px] text-slate-500">Schema chưa có trường loại tiền; số tiền hiển thị nguyên giá trị đã lưu, chưa xác định đơn vị tiền tệ.</p>
    </div>}
  </dialog>;
}
