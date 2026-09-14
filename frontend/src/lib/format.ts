/**
 * Display formatting for money, quantities and dates.
 *
 * Money arrives from the API as a 2-decimal string and quantities as a
 * 3-decimal string (docs/architecture/dashboard-metrics.md §4). Nothing here
 * parses for arithmetic: these are presentation-only conversions, and every
 * value stays exact because `Number` holds these magnitudes exactly.
 */

const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const DECIMAL = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const COUNT = new Intl.NumberFormat('vi-VN');
const QUANTITY = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 });
const CLOCK = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const toNumber = (value: string | number | undefined): number => {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Exact money amount, e.g. `697.800.000 ₫`. */
export function formatCurrency(value: string | number | undefined): string {
  return VND.format(toNumber(value));
}

/** Rounded money amount for headline type, e.g. `697,8 tr ₫` / `1,2 tỷ ₫`. */
export function formatCurrencyCompact(value: string | number | undefined): string {
  const amount = toNumber(value);
  const magnitude = Math.abs(amount);
  if (magnitude >= 1_000_000_000) return `${DECIMAL.format(amount / 1_000_000_000)} tỷ ₫`;
  if (magnitude >= 1_000_000) return `${DECIMAL.format(amount / 1_000_000)} tr ₫`;
  return VND.format(amount);
}

/** Counts: orders, invoices, customers. */
export function formatCount(value: string | number | undefined): string {
  return COUNT.format(toNumber(value));
}

/** Quantities keep up to three decimals, as the API returns them. */
export function formatQuantity(value: string | number | undefined): string {
  return QUANTITY.format(toNumber(value));
}

/** `2026-09` becomes `T9/2026`; anything else is passed through unchanged. */
export function formatMonthLabel(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  return `T${Number(match[2])}/${match[1]}`;
}

/** Local wall-clock label for the "last updated" line. */
export function formatClock(date: Date): string {
  return CLOCK.format(date);
}
