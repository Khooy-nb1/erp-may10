import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import JournalBalance from '../components/JournalBalance.jsx';
import { JournalDetail } from './Journals.jsx';
import { date, money } from '../components/DocumentDetail.jsx';
import { fetchJournalFilters, fetchJournals, isJournalRequestCanceled } from '../services/journals.js';
import { balanceState } from '../services/journalPresentation.js';
import './Ledger.css';

const defaults = { q: '', accountId: '', from: '', to: '', page: 1, pageSize: 50 };
const control = 'ledger-control h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[11px] outline-none';

function decimalDifference(left, right) {
  if (left == null || right == null) return null;
  const scale = Math.max((String(left).split('.')[1] || '').length, (String(right).split('.')[1] || '').length);
  const integer = (value) => {
    const [whole, fraction = ''] = String(value).split('.');
    return BigInt(whole + fraction.padEnd(scale, '0'));
  };
  const difference = integer(left) - integer(right);
  const sign = difference < 0n ? '-' : '';
  const digits = (difference < 0n ? -difference : difference).toString().padStart(scale + 1, '0');
  return scale ? `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}` : sign + digits;
}

function Account({ code, name, tone = '' }) {
  return <span className="ledger-account"><strong className={tone}>{code || '—'}</strong><small>{name || 'Chưa có tên tài khoản'}</small></span>;
}

export default function Ledger() {
  const [tab, setTab] = useState('journal');
  const [draft, setDraft] = useState(defaults);
  const [query, setQuery] = useState(defaults);
  const [filters, setFilters] = useState({ accounts: [] });
  const [state, setState] = useState({ loading: true });
  const [overview, setOverview] = useState({ loading: true, data: [] });
  const [selected, setSelected] = useState(null);
  const [ledgerAccountId, setLedgerAccountId] = useState('');
  const [filterError, setFilterError] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setFilterError('');
    fetchJournalFilters(controller.signal)
      .then((data) => { if (!controller.signal.aborted && data) { setFilters(data); setFilterError(''); } })
      .catch((err) => { if (!isJournalRequestCanceled(err, controller.signal)) setFilterError(err.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    fetchJournals(query, controller.signal)
      .then((data) => { if (!controller.signal.aborted && data) setState(data); })
      .catch((err) => { if (!isJournalRequestCanceled(err, controller.signal)) setState({ error: err.message }); });
    return () => controller.abort();
  }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    fetchJournals({ ...defaults, pageSize: 100 }, controller.signal)
      .then((data) => { if (!controller.signal.aborted && data) setOverview(data); })
      .catch((err) => { if (!isJournalRequestCanceled(err, controller.signal)) setOverview({ error: err.message, data: [] }); });
    return () => controller.abort();
  }, []);

  const rows = state.data || [];
  const selectedAccount = filters.accounts.find((item) => String(item.id) === String(ledgerAccountId));
  const ledgerRows = useMemo(() => [...rows].sort((a, b) => new Date(a.ngay_hach_toan) - new Date(b.ngay_hach_toan)), [rows]);
  const debit = ledgerAccountId ? ledgerRows.reduce((sum, row) => sum + (String(row.tai_khoan_no) === String(ledgerAccountId) ? Number(row.so_tien) : 0), 0) : null;
  const credit = ledgerAccountId ? ledgerRows.reduce((sum, row) => sum + (String(row.tai_khoan_co) === String(ledgerAccountId) ? Number(row.so_tien) : 0), 0) : null;
  const total = state.summary?.total_amount;
  const totalDebit = total;
  const totalCredit = total;
  const difference = decimalDifference(totalDebit, totalCredit);
  const journalFacts = useMemo(() => {
    const accounts = new Map();
    rows.forEach((row) => {
      [[row.so_tai_khoan_no, row.ten_tai_khoan_no], [row.so_tai_khoan_co, row.ten_tai_khoan_co]].forEach(([code, name]) => {
        const current = accounts.get(code) || { code, name, count: 0 };
        current.count += 1;
        accounts.set(code, current);
      });
    });
    return {
      balanced: rows.filter((row) => balanceState(row) === 'balanced').length,
      different: rows.filter((row) => balanceState(row) === 'different').length,
      topAccounts: [...accounts.values()].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)).slice(0, 3),
      latest: [...rows].sort((a, b) => new Date(b.ngay_hach_toan) - new Date(a.ngay_hach_toan))[0],
    };
  }, [rows]);
  const accountActivity = useMemo(() => {
    const accounts = new Map();
    (overview.data || []).forEach((row) => {
      [[row.tai_khoan_no, row.so_tai_khoan_no, row.ten_tai_khoan_no], [row.tai_khoan_co, row.so_tai_khoan_co, row.ten_tai_khoan_co]].forEach(([id, code, name]) => {
        const current = accounts.get(String(id)) || { id, code, name, count: 0, total: 0 };
        current.count += 1;
        current.total += Number(row.so_tien);
        accounts.set(String(id), current);
      });
    });
    return [...accounts.values()].sort((a, b) => b.count - a.count || b.total - a.total);
  }, [overview.data]);
  const submit = (event) => { event.preventDefault(); if (draft.from && draft.to && draft.from > draft.to) { setValidationError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'); return; } setValidationError(''); setQuery({ ...draft, page: 1 }); };
  const reset = () => { setDraft(defaults); setQuery({ ...defaults }); setValidationError(''); };
  const change = (key, value) => setDraft((old) => ({ ...old, [key]: value }));
  const openAccount = (accountId) => {
    const value = String(accountId);
    setLedgerAccountId(value);
    setDraft((old) => ({ ...old, accountId: value }));
    setQuery((old) => ({ ...old, accountId: value, page: 1 }));
  };
  const openSelectedLedger = (event) => {
    event.preventDefault();
    if (!draft.accountId) return;
    setLedgerAccountId(String(draft.accountId));
    if (String(query.accountId) !== String(draft.accountId)) setQuery((old) => ({ ...old, accountId: String(draft.accountId), page: 1 }));
  };
  const backToLedgerOverview = () => setLedgerAccountId('');
  const exportCsv = () => {
    const source = tab === 'ledger' ? ledgerRows : rows;
    if (!source.length) return;
    const cells = [['Ngày', 'Mã bút toán', 'Mã chứng từ', 'Diễn giải', 'Tài khoản Nợ', 'Tài khoản Có', 'Số tiền'], ...source.map((row) => [date(row.ngay_hach_toan), row.ma_hach_toan, row.ma_chung_tu, row.mo_ta || '', row.so_tai_khoan_no, row.so_tai_khoan_co, row.so_tien])];
    const csv = '\uFEFF' + cells.map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = tab === 'ledger' ? 'so-cai.csv' : 'nhat-ky-chung.csv'; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="ledger-page">
    <header className="ledger-header"><div className="flex items-center gap-3"><span className="ledger-page-icon"><Icon name="book" className="h-5 w-5" /></span><div><nav>Tài chính <span>›</span> Nhật ký &amp; Sổ cái</nav><h1>Nhật ký &amp; Sổ cái</h1><p>Tra cứu phát sinh kế toán và theo dõi biến động tài khoản.</p></div></div><button type="button" onClick={exportCsv} disabled={!rows.length} className="ledger-export"><Icon name="download" className="h-4 w-4" />Xuất Excel</button></header>
    <div className="ledger-tabs" role="tablist"><button role="tab" aria-selected={tab === 'journal'} className={tab === 'journal' ? 'active' : ''} onClick={() => setTab('journal')}><Icon name="book" className="h-4 w-4" />Nhật ký chung</button><button role="tab" aria-selected={tab === 'ledger'} className={tab === 'ledger' ? 'active' : ''} onClick={() => setTab('ledger')}><Icon name="file" className="h-4 w-4" />Sổ cái</button></div>

    {tab === 'journal' ? <section className="ledger-journal" role="tabpanel">
      <div className="journal-balance-overview"><article className="journal-total-card"><span><Icon name="book" /></span><div><small>Tổng bút toán</small><strong>{state.pagination?.total ?? '—'}</strong><p>Theo điều kiện tra cứu</p></div></article><article className="journal-comparison-card"><header><div><h2>Kiểm tra cân đối phát sinh</h2><p>Đối chiếu tổng phát sinh Nợ và Có</p></div>{difference == null ? <span className="balance-badge neutral">Chưa xác định</span> : difference === '0.00' || difference === '0' ? <span className="balance-badge balanced">✓ Cân đối</span> : <span className="balance-badge different">⚠ Chênh lệch</span>}</header><div className="journal-comparison-body"><div className="comparison-value debit"><span className="comparison-icon"><Icon name="arrow" /></span><div><small>PHÁT SINH NỢ</small><strong>{money(totalDebit)}</strong><p>Tổng phát sinh Nợ</p></div></div><div className="comparison-visual"><div className="comparison-labels"><span>Nợ</span><span>Có</span></div><div className="balance-track"><i className="debit-half" /><i className="credit-half" /></div><p>Chênh lệch: <strong className={difference && difference !== '0.00' && difference !== '0' ? 'text-rose-600' : ''}>{money(difference)}</strong></p></div><div className="comparison-value credit"><span className="comparison-icon"><Icon name="arrow" /></span><div><small>PHÁT SINH CÓ</small><strong>{money(totalCredit)}</strong><p>Tổng phát sinh Có</p></div></div></div></article><article className="journal-status-card"><header><div><h2>Trạng thái dữ liệu</h2><p>Kiểm tra các dòng đang hiển thị</p></div><span className="status-ring"><strong>{rows.length}</strong><small>dòng</small></span></header><div className="status-facts"><div><i className="balanced" /><span>Cân đối</span><strong>{journalFacts.balanced}</strong></div><div><i className="different" /><span>Chênh lệch</span><strong>{journalFacts.different}</strong></div><div><i className="posted" /><span>Đã hạch toán</span><strong>{state.summary?.accounted ?? '—'}</strong></div></div></article></div>
      <div className="journal-mini-analytics"><article className="panel account-ranking"><div className="mini-card-heading"><div><h2>Tài khoản phát sinh nhiều nhất</h2><p>Top tài khoản trong kết quả hiện tại</p></div><Icon name="chart" /></div>{journalFacts.topAccounts.length ? <div>{journalFacts.topAccounts.map((account) => <div className="account-rank-row" key={account.code}><span><strong>{account.code}</strong><small>{account.name}</small></span><div><i style={{ width: `${account.count / journalFacts.topAccounts[0].count * 100}%` }} /></div><b>{account.count}</b></div>)}</div> : <p className="mini-empty">Chưa có dữ liệu phát sinh.</p>}</article><article className="panel latest-journal"><div className="mini-card-heading"><div><h2>Bút toán gần nhất</h2><p>Theo ngày hạch toán</p></div><Icon name="clock" /></div>{journalFacts.latest ? <div className="latest-journal-body"><span className="latest-icon"><Icon name="file" /></span><div><button onClick={() => setSelected(journalFacts.latest.id)}>{journalFacts.latest.ma_hach_toan}</button><p>{journalFacts.latest.ma_chung_tu} · {date(journalFacts.latest.ngay_hach_toan)}</p><small>{journalFacts.latest.mo_ta || 'Chưa có diễn giải'}</small></div><strong>{money(journalFacts.latest.so_tien)}</strong></div> : <p className="mini-empty">Chưa có bút toán.</p>}</article></div>
      <form className="panel ledger-filter" onSubmit={submit}><label className="ledger-search">Tìm kiếm<div className="relative"><Icon name="search" className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input className={control + ' pl-8'} value={draft.q} onChange={(e) => change('q', e.target.value)} placeholder="Mã bút toán, chứng từ, diễn giải…" /></div></label><label>Tài khoản<select className={control} value={draft.accountId} onChange={(e) => change('accountId', e.target.value)}><option value="">Tất cả tài khoản</option>{filters.accounts.map((a) => <option key={a.id} value={a.id}>{a.so_tai_khoan} · {a.ten_tai_khoan}</option>)}</select></label><label>Từ ngày<input type="date" className={control} value={draft.from} onChange={(e) => change('from', e.target.value)} /></label><label>Đến ngày<input type="date" className={control} value={draft.to} onChange={(e) => change('to', e.target.value)} /></label><button type="button" className="ledger-reset" onClick={reset}>Đặt lại</button><button className="ledger-search-button"><Icon name="search" className="h-3.5 w-3.5" />Tìm kiếm</button></form>
      <JournalTable state={state} select={setSelected} totalDebit={totalDebit} totalCredit={totalCredit} difference={difference} />
    </section> : <section className="ledger-book" role="tabpanel">
      <form className="panel account-picker" onSubmit={openSelectedLedger}><div><span className="account-picker-icon"><Icon name="book" /></span><div><h2>Chọn tài khoản kế toán</h2><p>Xem toàn bộ phát sinh theo một tài khoản</p></div></div><label><span className="sr-only">Tài khoản</span><select className={control} value={draft.accountId} onChange={(e) => change('accountId', e.target.value)}><option value="">Chọn tài khoản…</option>{filters.accounts.map((a) => <option key={a.id} value={a.id}>{a.so_tai_khoan} · {a.ten_tai_khoan}</option>)}</select></label><button className="ledger-search-button" disabled={!draft.accountId}>Xem sổ cái</button></form>
      {!ledgerAccountId ? <LedgerOverview accounts={filters.accounts} activity={accountActivity} loading={overview.loading} openAccount={openAccount} /> : <><div className="ledger-detail-navigation"><button type="button" onClick={backToLedgerOverview}><Icon name="arrow" />Quay lại</button><nav aria-label="Vị trí trong Sổ cái"><span>Sổ cái</span><i>›</i><strong>{selectedAccount?.so_tai_khoan || '—'} - {selectedAccount?.ten_tai_khoan || 'Chưa có tên tài khoản'}</strong></nav></div><div className="account-summary"><div className="account-title"><small>SỔ CÁI TÀI KHOẢN</small><h2>{selectedAccount?.so_tai_khoan || '—'} <span>{selectedAccount?.ten_tai_khoan || 'Chưa có tên tài khoản'}</span></h2></div><div className="account-metrics"><article className="blue"><small>Số dư đầu kỳ</small><strong>—</strong><span>Chưa có dữ liệu số dư</span></article><article className="green"><small>Tổng phát sinh Nợ</small><strong>{money(String(debit))}</strong></article><article className="amber"><small>Tổng phát sinh Có</small><strong>{money(String(credit))}</strong></article><article className="indigo"><small>Số dư cuối kỳ</small><strong>—</strong><span>Chưa có dữ liệu số dư</span></article></div></div>{state.loading || state.error ? <LedgerTable rows={ledgerRows} loading={state.loading} error={state.error} accountId={ledgerAccountId} select={setSelected} /> : ledgerRows.length ? <div className="ledger-detail-grid"><LedgerTable rows={ledgerRows} loading={false} accountId={ledgerAccountId} select={setSelected} /><AccountAnalysis rows={ledgerRows} accountId={ledgerAccountId} debit={debit} credit={credit} /></div> : <NoAccountEntries suggestions={accountActivity.filter((item) => String(item.id) !== String(ledgerAccountId)).slice(0, 3)} openAccount={openAccount} />}</>}
    </section>}
    {(filterError || validationError) && <p role="alert" className="ledger-error">{filterError || validationError}</p>}
    {selected && <JournalDetail id={selected} close={() => setSelected(null)} />}
  </div>;
}

function LedgerOverview({ accounts, activity, loading, openAccount }) {
  const activeIds = new Set(activity.map((item) => String(item.id)));
  const directory = [...accounts].sort((a, b) => Number(activeIds.has(String(b.id))) - Number(activeIds.has(String(a.id))) || a.so_tai_khoan.localeCompare(b.so_tai_khoan)).slice(0, 8);
  const maxTotal = activity[0]?.total || 1;
  return <div className="ledger-overview"><div className="ledger-overview-heading"><div><span><Icon name="book" /></span><div><h2>Tổng quan Sổ cái</h2><p>Khám phá danh mục và các tài khoản có phát sinh</p></div></div><small>{accounts.length} tài khoản trong danh mục</small></div><div className="ledger-overview-grid"><section className="panel account-directory"><div className="ledger-card-heading"><div><h3>Danh mục tài khoản</h3><p>Ưu tiên tài khoản đang có phát sinh</p></div><Icon name="grid" /></div>{loading ? <p className="ledger-card-state">Đang tải danh mục…</p> : <div className="account-directory-list">{directory.map((account) => { const fact = activity.find((item) => String(item.id) === String(account.id)); return <button key={account.id} onClick={() => openAccount(account.id)}><span><strong>{account.so_tai_khoan}</strong><small>{account.ten_tai_khoan}</small></span><span>{fact ? `${fact.count} phát sinh` : 'Chưa phát sinh'}</span><Icon name="chevron" /></button>; })}</div>}</section><section className="panel active-accounts"><div className="ledger-card-heading"><div><h3>Tài khoản có phát sinh</h3><p>Xếp hạng theo dữ liệu bút toán hiện tại</p></div><Icon name="chart" /></div>{activity.length ? <div className="active-account-list">{activity.map((item, index) => <button key={item.id} onClick={() => openAccount(item.id)}><b>{index + 1}</b><span><strong>{item.code}</strong><small>{item.name}</small></span><div><i style={{ width: `${item.total / maxTotal * 100}%` }} /></div><em>{item.count} lần</em><strong>{money(String(item.total))}</strong></button>)}</div> : <p className="ledger-card-state">Chưa có tài khoản phát sinh.</p>}</section></div>{activity.length > 0 && <section className="quick-account-access"><div><h3>Truy cập nhanh</h3><p>Mở Sổ cái từ các tài khoản có phát sinh gần nhất</p></div><div>{activity.slice(0, 5).map((item) => <button key={item.id} onClick={() => openAccount(item.id)}><strong>{item.code}</strong><span>{item.name}</span><small>Xem Sổ cái →</small></button>)}</div></section>}</div>;
}

function AccountAnalysis({ rows, accountId, debit, credit }) {
  const debitCount = rows.filter((row) => String(row.tai_khoan_no) === String(accountId)).length;
  const creditCount = rows.filter((row) => String(row.tai_khoan_co) === String(accountId)).length;
  const total = debit + credit;
  const debitShare = total ? debit / total * 100 : 0;
  return <aside className="panel account-analysis"><div className="ledger-card-heading"><div><h3>Phân tích tài khoản</h3><p>Tổng hợp từ các phát sinh đang hiển thị</p></div><Icon name="chart" /></div><div className="account-analysis-body"><div className="account-analysis-donut" style={{ background: total ? `radial-gradient(circle, white 54%, transparent 56%), conic-gradient(#15937c 0 ${debitShare}%, #d98a2b ${debitShare}% 100%)` : undefined }}><strong>{rows.length}</strong><span>giao dịch</span></div><dl><div><dt>Tổng phát sinh Nợ</dt><dd className="debit">{money(String(debit))}</dd><small>{debitCount} dòng</small></div><div><dt>Tổng phát sinh Có</dt><dd className="credit">{money(String(credit))}</dd><small>{creditCount} dòng</small></div><div><dt>Tỷ trọng Nợ / Có</dt><dd>{Math.round(debitShare)}% / {Math.round(100 - debitShare)}%</dd></div></dl></div><p className="account-analysis-note">Số dư không được tính do chưa có dữ liệu số dư đầu kỳ.</p></aside>;
}

function NoAccountEntries({ suggestions, openAccount }) {
  return <section className="panel no-account-entries"><div><span><Icon name="book" /></span><div><h3>Tài khoản chưa có phát sinh</h3><p>Thử chọn tài khoản khác hoặc thay đổi khoảng thời gian.</p></div></div>{suggestions.length > 0 && <div className="suggested-accounts"><small>Tài khoản có phát sinh</small><div>{suggestions.map((item) => <button key={item.id} onClick={() => openAccount(item.id)}><strong>{item.code}</strong><span>{item.name}</span><Icon name="chevron" /></button>)}</div></div>}</section>;
}

function JournalTable({ state, select, totalDebit, totalCredit, difference }) {
  const rows = state.data || [];
  return <section className="panel overflow-hidden"><div className="panel-heading"><div><h2>Nhật ký chung</h2><p className="mt-0.5 text-[10px] text-slate-400">Phát sinh kế toán theo thời gian</p></div><span className="ledger-count">{state.pagination?.total ?? '—'} dòng</span></div>{state.loading ? <p className="ledger-state">Đang tải nhật ký…</p> : state.error ? <p className="ledger-state error">{state.error}</p> : !rows.length ? <p className="ledger-state">Không có phát sinh phù hợp.</p> : <><div className="overflow-x-auto"><table className="erp-table ledger-table min-w-[1240px]"><thead><tr>{['STT', 'Ngày', 'Mã bút toán', 'Mã chứng từ', 'Diễn giải', 'Tài khoản Nợ', 'Tài khoản Có', 'Phát sinh Nợ', 'Phát sinh Có', 'Người thực hiện', 'Cân đối', 'Thao tác'].map((title) => <th key={title} className={title.includes('Phát sinh') ? 'text-right' : title === 'Thao tác' ? 'text-center' : 'text-left'}>{title}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id}><td>{index + 1}</td><td>{date(row.ngay_hach_toan)}</td><td><button className="ledger-code" onClick={() => select(row.id)}>{row.ma_hach_toan}</button></td><td><span className="ledger-document">{row.ma_chung_tu}</span></td><td className="max-w-52 !whitespace-normal text-slate-500">{row.mo_ta || '—'}</td><td><Account code={row.so_tai_khoan_no} name={row.ten_tai_khoan_no} tone="debit" /></td><td><Account code={row.so_tai_khoan_co} name={row.ten_tai_khoan_co} tone="credit" /></td><td className="ledger-debit-amount">{money(row.so_tien)}</td><td className="ledger-credit-amount">{money(row.so_tien)}</td><td>{row.nguoi_thuc_hien || '—'}</td><td><JournalBalance data={row} /></td><td className="text-center"><button className="icon-button mx-auto" onClick={() => select(row.id)} aria-label={`Xem ${row.ma_hach_toan}`}><Icon name="eye" className="h-4 w-4" /></button></td></tr>)}</tbody></table></div><div className="journal-table-summary"><div><span>Tổng phát sinh Nợ</span><strong className="debit">{money(totalDebit)}</strong></div><div><span>Tổng phát sinh Có</span><strong className="credit">{money(totalCredit)}</strong></div><div><span>Chênh lệch</span><strong>{money(difference)}</strong></div><JournalBalance data={{ tong_no: totalDebit, tong_co: totalCredit }} /></div></>}</section>;
}

function LedgerTable({ rows, loading, error, accountId, select }) {
  return <section className="panel overflow-hidden"><div className="panel-heading"><h2>Chi tiết phát sinh tài khoản</h2><span className="ledger-count">{rows.length} dòng</span></div>{loading ? <p className="ledger-state">Đang tải Sổ cái…</p> : error ? <p className="ledger-state error">{error}</p> : !rows.length ? <div className="ledger-no-entries"><span><Icon name="book" /></span><div><h3>Chưa có phát sinh cho tài khoản này</h3><p>Thử chọn tài khoản khác hoặc thay đổi khoảng thời gian.</p></div></div> : <div className="overflow-x-auto"><table className="erp-table ledger-table min-w-[900px]"><thead><tr>{['Ngày', 'Chứng từ', 'Diễn giải', 'TK đối ứng', 'Phát sinh Nợ', 'Phát sinh Có', 'Số dư', 'Xem'].map((title) => <th key={title} className={title.includes('Phát sinh') ? 'text-right' : title === 'Xem' ? 'text-center' : 'text-left'}>{title}</th>)}</tr></thead><tbody>{rows.map((row) => { const isDebit = String(row.tai_khoan_no) === String(accountId), isCredit = String(row.tai_khoan_co) === String(accountId); return <tr key={row.id}><td>{date(row.ngay_hach_toan)}</td><td><span className="ledger-document">{row.ma_chung_tu}</span></td><td className="max-w-72 !whitespace-normal text-slate-500">{row.mo_ta || '—'}</td><td><Account code={isDebit ? row.so_tai_khoan_co : row.so_tai_khoan_no} name={isDebit ? row.ten_tai_khoan_co : row.ten_tai_khoan_no} /></td><td className="ledger-debit-amount">{isDebit ? money(row.so_tien) : '—'}</td><td className="ledger-credit-amount">{isCredit ? money(row.so_tien) : '—'}</td><td className="text-slate-400">—</td><td className="text-center"><button className="icon-button mx-auto" onClick={() => select(row.id)} aria-label={`Xem ${row.ma_hach_toan}`}><Icon name="eye" className="h-4 w-4" /></button></td></tr>; })}</tbody></table></div>}</section>;
}
