const costs = [
  ['Nguyên vật liệu', '58%', '1,43 tỷ', 58, '#2563a6'],
  ['Nhân công', '25%', '615 triệu', 25, '#6366a8'],
  ['Chi phí sản xuất chung', '13%', '320 triệu', 13, '#d79a32'],
  ['Chi phí khác', '4%', '98 triệu', 4, '#91a3b7'],
];

function CostDonut() {
  let offset = 0;
  return <div className="dashboard-cost-layout"><div className="dashboard-cost-donut"><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="68" fill="none" stroke="#edf2f7" strokeWidth="24" />{costs.map(([name, , , value, color]) => { const start = offset; offset += value; return <circle key={name} cx="90" cy="90" r="68" pathLength="100" fill="none" stroke={color} strokeWidth="24" strokeDasharray={`${Math.max(0, value - .8)} 100`} strokeDashoffset={-start} />; })}</svg><div><span>Tổng chi phí</span><strong>2,46</strong><small>tỷ VNĐ</small></div></div><ul>{costs.map(([name, percent, value, , color]) => <li key={name}><i style={{ backgroundColor: color }} /><span>{name}</span><strong>{value}</strong><small>{percent}</small></li>)}</ul></div>;
}

export default function DashboardCharts() {
  const series = [[2.1, 1.5], [2.5, 1.7], [2.3, 1.6], [3.1, 2.1], [2.8, 1.9], [3.6, 2.46]];
  return <div className="dashboard-analysis-grid">
    <section className="panel min-w-0" aria-labelledby="cost-chart-title"><div className="panel-heading"><div><h2 id="cost-chart-title">Phân bổ chi phí</h2><p className="mt-0.5 text-[10px] text-slate-400">Cơ cấu chi phí sản xuất</p></div><span className="rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-semibold text-indigo-600">4 nhóm</span></div><div className="p-5"><CostDonut /></div></section>
    <section className="panel min-w-0" aria-labelledby="revenue-chart-title"><div className="panel-heading"><div><h2 id="revenue-chart-title">Doanh thu và giá thành</h2><p className="mt-0.5 text-[10px] text-slate-400">Xu hướng hoạt động tài chính</p></div><span className="text-[10px] text-slate-400">6 tháng gần nhất · Tỷ VNĐ</span></div><div className="px-5 pb-4 pt-4"><div className="mb-2 flex justify-end gap-4 text-[10px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#255b98]" />Doanh thu</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#d79a32]" />Giá thành</span></div><svg viewBox="0 0 500 210" role="img" aria-labelledby="trend-title trend-description" className="h-[210px] w-full"><title id="trend-title">Doanh thu và giá thành theo tháng, số liệu minh họa</title><desc id="trend-description">Doanh thu và giá thành từ tháng 4 đến tháng 9.</desc>{[0, 1, 2, 3, 4].map((tick) => <g key={tick}><line x1="32" x2="490" y1={174 - tick * 38} y2={174 - tick * 38} stroke="#e8edf3" strokeDasharray={tick ? '3 3' : undefined} /><text x="20" y={178 - tick * 38} fontSize="10" fill="#8795a6" textAnchor="end">{tick}</text></g>)}{series.map(([revenue, cost], index) => <g key={index}><rect x={51 + index * 75} y={174 - revenue * 38} width="18" height={revenue * 38} rx="3" fill="#255b98"><title>{`Doanh thu T${index + 4}: ${revenue} tỷ VNĐ`}</title></rect><rect x={73 + index * 75} y={174 - cost * 38} width="18" height={cost * 38} rx="3" fill="#d79a32"><title>{`Giá thành T${index + 4}: ${cost} tỷ VNĐ`}</title></rect><text x={71 + index * 75} y="198" textAnchor="middle" fontSize="10" fill="#738397">T{index + 4}</text></g>)}</svg></div></section>
  </div>;
}
