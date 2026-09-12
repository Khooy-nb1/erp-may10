import { fetchDocuments } from './documents.js';
import { fetchJournals } from './journals.js';
import { fetchDebts } from './debts.js';
import { fetchCosts } from './costs.js';
import { fetchCosting } from './costing.js';
import { fetchOrderEfficiency } from './orderEfficiency.js';
import { fetchFinancialReportSnapshots } from './financialReports.js';

const page = { page: 1, pageSize: 100 };
export async function fetchChiefAccountantOverview(signal) {
  const requests = {
    documents: fetchDocuments(page, signal), journals: fetchJournals(page, signal), debts: fetchDebts(page, signal),
    costs: fetchCosts(page, signal), costing: fetchCosting(page, signal), orders: fetchOrderEfficiency(page, signal),
    reports: fetchFinancialReportSnapshots({}, signal),
  };
  const names = Object.keys(requests);
  const results = await Promise.allSettled(Object.values(requests));
  if (signal.aborted) return undefined;
  const data = {}, errors = [];
  results.forEach((result, index) => {
    const name = names[index];
    if (result.status === 'fulfilled' && result.value) data[name] = result.value;
    else errors.push({ source: name, message: result.reason?.message || 'Không tải được dữ liệu.' });
  });
  return { data, errors };
}

