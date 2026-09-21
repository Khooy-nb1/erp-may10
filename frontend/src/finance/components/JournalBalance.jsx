import { balanceState } from '../services/journalPresentation.js';

export default function JournalBalance({ data, detailed = false }) {
  const state = balanceState(data);
  const styles = { balanced: 'bg-emerald-50 text-emerald-800', different: 'bg-rose-50 text-rose-700', unknown: 'bg-slate-100 text-slate-600' };
  const labels = { balanced: detailed ? 'Bút toán cân đối' : 'Cân đối', different: detailed ? 'Bút toán chưa cân đối' : 'Chênh lệch', unknown: 'Chưa xác định' };
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-[10px] font-medium ${styles[state]}`}><span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />{labels[state]}</span>;
}
