import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import DashboardCharts from '../components/DashboardCharts.jsx';
import DocumentTable from '../components/DocumentTable.jsx';
import './Dashboard.css';

const stats = [
  { title: 'Tổng phải thu', value: '1,28', unit: 'tỷ VNĐ', change: '↑ 8,4%', icon: 'wallet', tone: 'blue' },
  { title: 'Tổng phải trả', value: '865', unit: 'triệu VNĐ', change: '↓ 3,2%', icon: 'book', tone: 'amber' },
  { title: 'Chi phí sản xuất', value: '2,46', unit: 'tỷ VNĐ', change: '↑ 5,1%', icon: 'layers', tone: 'indigo' },
  { title: 'Giá thành bình quân', value: '128.500', unit: 'VNĐ / SP', change: '↓ 2,6%', icon: 'calculator', tone: 'green' },
];
const shortcuts = [['Tạo bút toán', '/hach-toan?action=create', 'plus'], ['Xem công nợ', '/cong-no', 'wallet'], ['Tập hợp chi phí', '/chi-phi', 'layers'], ['Tính giá thành', '/gia-thanh', 'calculator'], ['Xuất báo cáo', '/bao-cao-tai-chinh', 'download', 'report.view']];
const debts = [
  { label: 'Phải thu quá hạn', icon: 'clock', total: '186.500.000', items: [['Khách hàng A', '112.000.000', '04/09/2026', 'Quá hạn 5 ngày'], ['Khách hàng B', '74.500.000', '06/09/2026', 'Quá hạn 3 ngày']], badge: 'text-rose-700 bg-rose-50' },
  { label: 'Phải trả sắp đến hạn', icon: 'calendar', total: '248.000.000', items: [['Nhà cung cấp A', '156.000.000', '11/09/2026', 'Còn 2 ngày'], ['Nhà cung cấp B', '92.000.000', '14/09/2026', 'Còn 5 ngày']], badge: 'text-amber-800 bg-amber-50' },
];

export default function Dashboard({ navigate, canViewReports=false }) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const [periodMode, setPeriodMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(currentDate.toISOString().slice(0, 10));
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(currentDate.getMonth() / 3) + 1);
  const [year, setYear] = useState(currentYear);
  const years = Array.from({ length: 6 }, (_, index) => currentYear + 1 - index);
  const periodLabel = periodMode === 'day' ? (selectedDate ? new Intl.DateTimeFormat('vi-VN').format(new Date(`${selectedDate}T00:00:00`)) : 'Chưa chọn ngày') : periodMode === 'month' ? `Tháng ${month} / ${year}` : periodMode === 'quarter' ? `Quý ${['I', 'II', 'III', 'IV'][quarter - 1]} / ${year}` : `Năm ${year}`;
  return <div className="dashboard-page space-y-5">
    <div className="dashboard-heading"><div><h1>Tài chính - Kế toán và Giá thành</h1><p>Theo dõi tình hình tài chính, công nợ, chi phí và giá thành sản xuất.</p></div><section className="dashboard-period" aria-label="Chọn kỳ báo cáo"><div className="dashboard-period-modes" role="group" aria-label="Loại kỳ">{[['day', 'Ngày'], ['month', 'Tháng'], ['quarter', 'Quý'], ['year', 'Năm']].map(([value, label]) => <button key={value} type="button" className={periodMode === value ? 'active' : ''} aria-pressed={periodMode === value} onClick={() => setPeriodMode(value)}>{label}</button>)}</div><div className="dashboard-period-value"><Icon name="calendar" />{periodMode === 'day' && <input aria-label="Chọn ngày" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />}{periodMode === 'month' && <><select aria-label="Chọn tháng" value={month} onChange={(event) => setMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>Tháng {index + 1}</option>)}</select><span>/</span><select aria-label="Chọn năm" value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((item) => <option key={item}>{item}</option>)}</select></>}{periodMode === 'quarter' && <><select aria-label="Chọn quý" value={quarter} onChange={(event) => setQuarter(Number(event.target.value))}>{['I', 'II', 'III', 'IV'].map((item, index) => <option key={item} value={index + 1}>Quý {item}</option>)}</select><span>/</span><select aria-label="Chọn năm" value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((item) => <option key={item}>{item}</option>)}</select></>}{periodMode === 'year' && <select aria-label="Chọn năm" value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((item) => <option key={item}>Năm {item}</option>)}</select>}</div></section></div>
    <div className="dashboard-period-note"><span className="h-1.5 w-1.5 rounded-full bg-[#7e99b6]" /><span>Dữ liệu hiện tại</span><span className="text-slate-300">|</span><span aria-live="polite">{periodLabel} · Bộ lọc kỳ đang ở chế độ trình bày, số liệu chưa thay đổi</span></div>
    <section aria-label="Chỉ số tài chính tổng quan" className="dashboard-kpis">{stats.map((stat) => <article key={stat.title} className={`dashboard-kpi dashboard-kpi-${stat.tone}`}><div className="flex items-center justify-between gap-3"><h2>{stat.title}</h2><span className="dashboard-kpi-icon"><Icon name={stat.icon} className="h-[17px] w-[17px]" /></span></div><div className="my-3 flex flex-wrap items-baseline gap-2"><span className="text-[28px] font-semibold leading-tight tracking-tight text-[#173455] tabular-nums">{stat.value}</span><span className="text-[11px] text-slate-500">{stat.unit}</span></div><div className="flex items-center gap-2 text-[11px]"><span className="dashboard-kpi-change">{stat.change}</span><span className="text-slate-400">so với kỳ trước</span></div></article>)}</section>
    <DashboardCharts />
    <DocumentTable navigate={navigate} />
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(250px,1fr)]"><section className="panel min-w-0"><div className="panel-heading"><h2>Theo dõi công nợ</h2><a href="/cong-no" onClick={(e) => navigate(e, '/cong-no')} className="text-xs font-medium text-[#2766a9] hover:underline">Chi tiết →</a></div><div className="grid divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">{debts.map((group) => <div key={group.label} className="p-4"><div className="flex items-center gap-2 text-xs font-medium text-slate-600"><Icon name={group.icon} className="h-4 w-4 text-slate-400" />{group.label}</div><p className="mb-2 mt-2 text-xl font-semibold tabular-nums text-[#173455]">{group.total}<span className="ml-1.5 text-[10px] font-normal text-slate-400">VNĐ</span></p>{group.items.map(([name, amount, due, status]) => <div key={name} className="border-t border-slate-100 py-2.5 last:pb-0"><div className="flex flex-wrap justify-between gap-1 text-xs"><span className="text-slate-600">{name}</span><span className="font-medium tabular-nums">{amount}</span></div><div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[10px]"><span className="text-slate-400">Đến hạn {due}</span><span className={`rounded px-1.5 py-0.5 ${group.badge}`}>{status}</span></div></div>)}</div>)}</div></section>
      <section className="panel"><div className="panel-heading"><h2>Thao tác nhanh</h2><Icon name="plus" className="h-4 w-4 text-slate-400" /></div><div className="space-y-1 p-3">{shortcuts.filter(([, , , permission])=>!permission||canViewReports).map(([title, path, icon]) => <a key={path} href={path} onClick={(e) => navigate(e, path)} className="flex items-center gap-3 rounded px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-800"><Icon name={icon} className="h-4 w-4 text-[#6283a6]" />{title}<Icon name="chevron" className="ml-auto h-3 w-3 text-slate-400" /></a>)}</div></section>
    </div>
  </div>;
}
