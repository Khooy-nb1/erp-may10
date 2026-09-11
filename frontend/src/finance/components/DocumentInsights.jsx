import { useEffect, useState } from 'react';
import { fetchDocuments } from '../services/documents.js';
import { Badge, date, label, money } from './DocumentDetail.jsx';
import Icon from './Icon.jsx';

const colors = ['#2563a6', '#60a5d8', '#6366a8', '#91a3b7', '#c4ced9'];

export default function DocumentInsights({ rows, loading, error, total, select, retry }) {
  const [recent, setRecent] = useState({ loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setRecent({ loading: true });
    fetchDocuments({ page: 1, pageSize: 5 }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setRecent(result); })
      .catch((err) => { if (!controller.signal.aborted) setRecent({ error: err.message }); });
    return () => controller.abort();
  }, [retry]);
  const groups = Object.entries(rows.reduce((result, row) => {
    result[row.loai_chung_tu] = (result[row.loai_chung_tu] || 0) + 1;
    return result;
  }, {})).sort((a, b) => b[1] - a[1]);
  return <div className="document-bottom-grid">
    <section className="panel min-w-0 h-full"><div className="panel-heading"><h2>Biểu đồ chứng từ theo loại</h2><Icon name="chart" className="h-4 w-4 text-slate-400" /></div>
      <div className="p-4"><p className="mb-3 text-[11px] text-slate-500">{total === rows.length ? 'Phân bố theo kết quả tìm kiếm' : 'Phân bố trên trang hiện tại · Không đại diện toàn bộ chứng từ'}</p>
        {loading || error || !rows.length ? <div className="flex min-h-36 items-center justify-center text-xs text-slate-400">{loading ? 'Đang tải biểu đồ…' : error ? 'Không thể tải dữ liệu biểu đồ' : 'Chưa có dữ liệu phù hợp'}</div> : <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex h-36 w-36 shrink-0 items-center justify-center"><svg viewBox="0 0 144 144" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true"><circle cx="72" cy="72" r="59" fill="none" stroke="#edf2f7" strokeWidth="18" />{groups.map(([type, count], index) => { const before = groups.slice(0, index).reduce((sum, entry) => sum + entry[1], 0); const share = count / rows.length * 100; return <circle key={type} cx="72" cy="72" r="59" pathLength="100" fill="none" stroke={colors[index % colors.length]} strokeWidth="18" strokeDasharray={`${Math.max(0, share - (groups.length > 1 ? 0.7 : 0))} 100`} strokeDashoffset={-before / rows.length * 100} />; })}</svg><div className="flex flex-col items-center"><strong className="text-[28px] font-semibold tabular-nums text-[#173455]">{rows.length}</strong><span className="mt-0.5 text-[10px] text-slate-400">chứng từ</span></div></div>
          <ul className="min-w-40 flex-1 space-y-3">{groups.map(([type, count], index) => <li key={type} className="flex items-center gap-2 text-xs"><span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: colors[index % colors.length] }} /><span className="text-slate-600">{label(type)}</span><span className="ml-auto font-semibold tabular-nums text-[#173455]">{count}</span><span className="w-10 text-right text-[11px] tabular-nums text-slate-400">{Math.round(count / rows.length * 100)}%</span></li>)}</ul>
        </div>}
      </div>
    </section>
    <section className="panel min-w-0 h-full"><div className="panel-heading"><h2>Chứng từ gần đây</h2><span className="text-[11px] text-slate-400">Theo ngày chứng từ · Toàn bộ dữ liệu</span></div>
      {recent.loading ? <p role="status" className="p-10 text-center text-xs text-slate-500">Đang tải chứng từ…</p> : recent.error ? <p role="alert" className="p-6 text-xs text-rose-700">{recent.error}</p> : !recent.data?.length ? <p className="p-10 text-center text-xs text-slate-500">Chưa có chứng từ.</p> : <ul className="divide-y divide-slate-100 px-4">{recent.data.map((doc) => <li key={doc.id} className="flex flex-wrap items-center gap-2.5 py-2.5"><span className="hidden rounded-md bg-[#f0f5fa] p-2 text-[#6184aa] sm:block"><Icon name="file" className="h-4 w-4" /></span><div className="min-w-0 flex-1"><button onClick={() => select(doc.id)} className="text-xs font-semibold text-[#2766a9] hover:underline">{doc.ma_chung_tu}</button><p className="mt-1 text-[11px] text-slate-500">{label(doc.loai_chung_tu)} <span className="mx-1 text-slate-300">·</span> {date(doc.ngay_chung_tu)}</p></div><div className="text-right"><p className="mb-1 text-xs font-semibold tabular-nums text-[#173455]">{money(doc.so_tien)}</p><Badge value={doc.trang_thai} /></div></li>)}</ul>}
    </section>
  </div>;
}
