import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

const documents = [
  { code: 'CT-2609-0048', type: 'Phiếu chi', date: '09/09/2026', amount: 48500000, status: 'Chờ duyệt', owner: 'Nguyễn Văn A' },
  { code: 'CT-2609-0047', type: 'Hóa đơn đầu vào', date: '08/09/2026', amount: 126800000, status: 'Chờ duyệt', owner: 'Trần Thị B' },
  { code: 'CT-2609-0046', type: 'Phiếu thu', date: '08/09/2026', amount: 75000000, status: 'Đã duyệt', owner: 'Lê Văn C' },
  { code: 'CT-2609-0045', type: 'Chứng từ tổng hợp', date: '07/09/2026', amount: 32400000, status: 'Đã hạch toán', owner: 'Nguyễn Văn A' },
  { code: 'CT-2609-0044', type: 'Hóa đơn đầu vào', date: '07/09/2026', amount: 18900000, status: 'Lỗi', owner: 'Trần Thị B' },
];
const badges = { 'Chờ duyệt': 'bg-amber-50 text-amber-800', 'Đã duyệt': 'bg-blue-50 text-blue-700', 'Đã hạch toán': 'bg-emerald-50 text-emerald-800', 'Lỗi': 'bg-rose-50 text-rose-700' };
const money = (value) => new Intl.NumberFormat('vi-VN').format(value);

export default function DocumentTable({ navigate }) {
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);
  useEffect(() => { if (selected) dialog.current.showModal(); }, [selected]);
  return <section className="panel overflow-hidden" aria-labelledby="documents-title"><div className="panel-heading"><div className="flex items-center gap-2"><h2 id="documents-title">Chứng từ cần xử lý</h2><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">05</span></div><a href="/chung-tu" onClick={(e) => navigate(e, '/chung-tu')} className="inline-flex items-center gap-1 text-xs font-medium text-[#2766a9] hover:underline">Xem tất cả<Icon name="chevron" className="h-3 w-3" /></a></div>
    <div className="overflow-x-auto"><table className="erp-table min-w-[860px]"><thead><tr>{['Mã chứng từ', 'Loại chứng từ', 'Ngày', 'Số tiền (VNĐ)', 'Trạng thái', 'Người phụ trách', 'Thao tác'].map((label, i) => <th key={label} scope="col" className={i === 3 ? 'text-right' : i === 6 ? 'text-center' : 'text-left'}>{label}</th>)}</tr></thead><tbody>{documents.map((doc) => <tr key={doc.code}><td className="font-medium text-[#2766a9]">{doc.code}</td><td>{doc.type}</td><td className="tabular-nums text-slate-500">{doc.date}</td><td className="text-right font-medium tabular-nums text-slate-800">{money(doc.amount)}</td><td><span className={`inline-flex rounded px-2 py-1 text-[11px] font-medium ${badges[doc.status]}`}>{doc.status}</span></td><td>{doc.owner}</td><td className="text-center"><button className="icon-button mx-auto" aria-label={`Xem chứng từ ${doc.code}`} onClick={() => setSelected(doc)}><Icon name="eye" className="h-4 w-4" /></button></td></tr>)}</tbody></table></div><div className="flex justify-between border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-400"><span>Hiển thị 5 chứng từ minh họa</span><span>Đơn vị: VNĐ</span></div>
    <dialog ref={dialog} onClose={() => setSelected(null)} className="m-auto w-[calc(100%_-_2rem)] max-w-[440px] rounded-lg border border-slate-200 p-0 text-slate-700 shadow-xl backdrop:bg-slate-950/40" aria-labelledby="document-preview-title">{selected && <><div className="panel-heading"><h2 id="document-preview-title">Xem trước chứng từ</h2><button autoFocus className="icon-button" aria-label="Đóng xem trước" onClick={() => dialog.current.close()}><Icon name="close" /></button></div><dl className="space-y-3 p-5 text-sm">{[['Mã chứng từ', selected.code], ['Loại chứng từ', selected.type], ['Ngày', selected.date], ['Số tiền', `${money(selected.amount)} VNĐ`], ['Trạng thái', selected.status], ['Người phụ trách', selected.owner]].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium">{value}</dd></div>)}</dl><p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Dữ liệu minh họa · Chỉ xem trước giao diện</p></>}</dialog>
  </section>;
}
