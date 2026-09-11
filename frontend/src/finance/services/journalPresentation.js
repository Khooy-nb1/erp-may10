// Compare decimal strings exactly. Missing values must never become zero.
function decimal(value) {
  if (typeof value !== 'string' || !/^-?\d+(\.\d+)?$/.test(value)) return null;
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^-/, '').split('.');
  const normalized = `${whole.replace(/^0+(?=\d)/, '')}.${fraction.replace(/0+$/, '')}`;
  return negative && normalized !== '0.' ? `-${normalized}` : normalized;
}
export function balanceState(data) {
  const debit = decimal(data?.tong_no), credit = decimal(data?.tong_co);
  if (debit === null || credit === null) return 'unknown';
  return debit === credit ? 'balanced' : 'different';
}
