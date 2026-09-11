#!/usr/bin/env tsx
/**
 * P8 (Accounts Receivable) reconciliation harness.
 *
 * What it proves
 *   1. `verify-receivable-reconciliation.sql` (read-only, self-checking) passes
 *      end to end against the live dev database, via the dev container.
 *   2. Every figure the SQL layer reports is re-derived a SECOND time here in
 *      TypeScript, from the raw `cong_no` rows, following the documented
 *      business rules (docs/plans/08-receivables.md P8.2) rather than the
 *      production SQL text. Agreement is therefore evidence, not tautology.
 *   3. Boundary behaviour at 0/1/30/31/60/61/90/91 days past due.
 *   4. `phai_tra` (payables) never reaches a receivables figure.
 *
 * Output: one line per check, `PASS|FAIL <check name> expected=<x> actual=<y>`,
 * followed by a summary line. Exit code 1 if any check fails.
 *
 * Authentication: psql is invoked inside the container's local socket, so NO
 * database password is read from, or required by, this source. PGPASSWORD and
 * PGPASSFILE are explicitly stripped from the child environment so a password
 * dependency would fail loudly instead of passing silently.
 *
 * Usage:
 *   backend/node_modules/.bin/tsx backend/scripts/verify-receivable-reconciliation.ts
 * Optional overrides (defaults match docker-compose.yml / backend/.env.example):
 *   PG_CONTAINER, PGUSER, PGDATABASE
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SQL_SCRIPT_PATH = resolve(HERE, 'verify-receivable-reconciliation.sql');

const CONTAINER = process.env.PG_CONTAINER ?? 'erp_sales_crm_postgres';
const DB_USER = process.env.PGUSER ?? 'postgres';
const DB_NAME = process.env.PGDATABASE ?? 'erp_sales_crm_dev';

// `-A -t -F'|'` => unaligned, tuples only, pipe-separated: machine-readable.
const PSQL_ARGS = [
  'exec',
  '-i',
  CONTAINER,
  'psql',
  '-v',
  'ON_ERROR_STOP=1',
  '-X',
  '-U',
  DB_USER,
  '-d',
  DB_NAME,
  '-t',
  '-A',
  '-F',
  '|',
  '-P',
  'pager=off',
];

/** Child environment with every password source removed (see header). */
const CHILD_ENV: NodeJS.ProcessEnv = { ...process.env };
delete CHILD_ENV.PGPASSWORD;
delete CHILD_ENV.PGPASSFILE;

// ---------------------------------------------------------------------------
// psql plumbing — execFileSync with an argv array: no shell, no interpolation
// ---------------------------------------------------------------------------

function psql(sql: string): string {
  return execFileSync('docker', [...PSQL_ARGS, '-c', sql], {
    encoding: 'utf8',
    env: CHILD_ENV,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function runSqlScript(script: string): string {
  return execFileSync('docker', [...PSQL_ARGS, '-f', '-'], {
    input: script,
    encoding: 'utf8',
    env: CHILD_ENV,
    maxBuffer: 64 * 1024 * 1024,
  });
}

// ---------------------------------------------------------------------------
// Exact decimal arithmetic (BigInt cents) — no floats on money
// ---------------------------------------------------------------------------

function toCents(value: string): bigint {
  const raw = value.trim();
  const negative = raw.startsWith('-');
  const [intPart, fracPart = ''] = (negative ? raw.slice(1) : raw).split('.');
  const cents = BigInt((intPart || '0') + (fracPart + '00').slice(0, 2));
  return negative ? -cents : cents;
}

function formatCents(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  return `${negative ? '-' : ''}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
}

function sumCents(values: bigint[]): bigint {
  return values.reduce((acc, v) => acc + v, 0n);
}

/** Numeric-aware equality: `1.00` and `1` are the same money value. */
function sameValue(expected: string, actual: string): boolean {
  const money = /^-?\d+(\.\d+)?$/;
  if (money.test(expected.trim()) && money.test(actual.trim())) {
    return toCents(expected) === toCents(actual);
  }
  return expected.trim() === actual.trim();
}

// ---------------------------------------------------------------------------
// Result collection
// ---------------------------------------------------------------------------

interface CheckResult {
  name: string;
  expected: string;
  actual: string;
  ok: boolean;
}

const results: CheckResult[] = [];

function check(name: string, expected: unknown, actual: unknown): void {
  const e = String(expected);
  const a = String(actual);
  results.push({ name, expected: e, actual: a, ok: sameValue(e, a) });
}

// ---------------------------------------------------------------------------
// Layer 1 — run the read-only SQL script and replay its verdicts
// ---------------------------------------------------------------------------

interface SqlRow {
  name: string;
  expected: string;
  actual: string;
  status: string;
}

const scriptText = readFileSync(SQL_SCRIPT_PATH, 'utf8');
const scriptOutput = runSqlScript(scriptText);

const sqlRows: SqlRow[] = scriptOutput
  .split(/\r?\n/)
  .filter((line) => line.includes('|'))
  .map((line) => {
    const [name, expected, actual, status] = line.split('|');
    return { name, expected, actual, status };
  });

// ---------------------------------------------------------------------------
// Layer 1b — boundary proof over PERSISTED rows.
//
// Layer 1 classifies literal expressions (`NOW() - INTERVAL '12 hours'`); it
// never reads a stored row, so it cannot show that a real cong_no row at a
// boundary is reported in the right bucket. This layer inserts actual rows at
// every boundary inside a transaction that always ROLLBACKs, then asks the
// production predicate chain where each landed. The rollback is why the seed
// row counts elsewhere in this harness are unaffected.
// ---------------------------------------------------------------------------

const PERSISTED_SQL_PATH = resolve(HERE, 'verify-receivable-aging-persisted-rows.sql');
const persistedScriptText = readFileSync(PERSISTED_SQL_PATH, 'utf8');
const persistedOutput = runSqlScript(persistedScriptText);

const persistedRows: SqlRow[] = persistedOutput
  .split(/\r?\n/)
  .filter((line) => line.includes('|') && /^persisted_/.test(line))
  .map((line) => {
    const [name, expected, actual, status] = line.split('|');
    return { name, expected, actual, status };
  });

if (persistedRows.length === 0) {
  throw new Error(
    `Persisted-row script ${PERSISTED_SQL_PATH} emitted no checks — it did not run as expected.`
  );
}

const persistedActual = new Map(persistedRows.map((r) => [r.name, r.actual]));
const gotPersisted = (name: string): string => {
  const value = persistedActual.get(name);
  if (value === undefined) {
    throw new Error(`Persisted-row script did not emit check "${name}" — script and harness are out of sync.`);
  }
  return value;
};

const sqlActual = new Map(sqlRows.map((r) => [r.name, r.actual]));
const got = (name: string): string => {
  const value = sqlActual.get(name);
  if (value === undefined) {
    throw new Error(`SQL script did not emit check "${name}" — script and harness are out of sync.`);
  }
  return value;
};

// Static read-only guard: strip `--` comments, then look for write statements.
const scriptBody = scriptText.replace(/--[^\n]*/g, ' ');
const WRITE_KEYWORDS =
  /\b(insert|update|delete|truncate|drop|alter|create|grant|revoke|vacuum|analyze|copy|set|begin|commit|rollback|call|do)\b/gi;
const writeHits = [...scriptBody.matchAll(WRITE_KEYWORDS)].map((m) => m[0].toUpperCase());

// ---------------------------------------------------------------------------
// Layer 2 — independent recomputation from raw rows
// ---------------------------------------------------------------------------

interface CongNoRow {
  id: string;
  loai: string;
  phatSinh: bigint;
  daTra: bigint;
  conLai: bigint;
  /** now() - ngay_dao_han in seconds; > 0 means the row is past due. */
  ageSeconds: number;
}

const rawRows = psql(`
  SELECT id::text, loai_cong_no,
         so_tien_phat_sinh::text, so_tien_da_thanh_toan::text, so_tien_con_lai::text,
         EXTRACT(EPOCH FROM (NOW() - ngay_dao_han))::text
  FROM cong_no
  ORDER BY id
`);

const rows: CongNoRow[] = rawRows
  .split(/\r?\n/)
  .filter((line) => line.trim().length > 0)
  .map((line) => {
    const [id, loai, phatSinh, daTra, conLai, ageSeconds] = line.split('|');
    return {
      id,
      loai,
      phatSinh: toCents(phatSinh),
      daTra: toCents(daTra),
      conLai: toCents(conLai),
      ageSeconds: Number(ageSeconds),
    };
  });

const receivables = rows.filter((r) => r.loai === 'phai_thu');
const payables = rows.filter((r) => r.loai === 'phai_tra');

/**
 * P8.2 bucket rule, implemented from the documented bands:
 *   Current  = not past due            (due >= now), outstanding > 0
 *   1–30     = 1..30 whole days past due
 *   31–60    = 31..60 whole days past due
 *   61–90    = 61..90 whole days past due
 *   90+      = more than 90 whole days past due
 * Production expresses the same rule as
 * `EXTRACT(DAY FROM NOW() - ngay_dao_han)`, i.e. the whole-day component; a row
 * less than 24h past due therefore belongs to no band ("UNBUCKETED").
 */
type Bucket = 'current' | 'b1_1_30' | 'b2_31_60' | 'b3_61_90' | 'b4_over_90' | 'UNBUCKETED';

/**
 * Aging band classification, written independently of the SQL as elapsed-time
 * thresholds rather than timestamp predicates. The bands are half-open —
 * [0,31) / [31,61) / [61,91) / [91,inf) days — so they are mutually exclusive
 * AND exhaustive: every row with outstanding > 0 lands in exactly one band, and
 * "buckets sum to the total" is an invariant rather than a coincidence.
 *
 * The earlier whole-day (`EXTRACT(DAY)`) formulation was NOT exhaustive: a row
 * less than 24h past due classified as day 0 and fell through every band,
 * silently dropping money from the aging report.
 */
function bucketOf(ageSeconds: number, outstandingCents: bigint): Bucket {
  if (outstandingCents <= 0n) return 'UNBUCKETED';
  if (ageSeconds <= 0) return 'current';
  const days = ageSeconds / 86_400;
  if (days < 31) return 'b1_1_30';
  if (days < 61) return 'b2_31_60';
  if (days < 91) return 'b3_61_90';
  return 'b4_over_90';
}

const bucketAmounts = (bucket: Bucket): bigint =>
  sumCents(receivables.filter((r) => bucketOf(r.ageSeconds, r.conLai) === bucket).map((r) => r.conLai));
const bucketCounts = (bucket: Bucket): number =>
  receivables.filter((r) => bucketOf(r.ageSeconds, r.conLai) === bucket).length;

const ts = {
  totalOriginal: sumCents(receivables.map((r) => r.phatSinh)),
  totalPaid: sumCents(receivables.map((r) => r.daTra)),
  totalOutstanding: sumCents(receivables.map((r) => r.conLai)),
  // P8.2 overdue rule: past due (now > ngay_dao_han) AND outstanding > 0.
  totalOverdue: sumCents(
    receivables.filter((r) => r.ageSeconds > 0 && r.conLai > 0n).map((r) => r.conLai)
  ),
  overdueCount: receivables.filter((r) => r.ageSeconds > 0 && r.conLai > 0n).length,
  aging: {
    current: { amount: bucketAmounts('current'), count: bucketCounts('current') },
    days1To30: { amount: bucketAmounts('b1_1_30'), count: bucketCounts('b1_1_30') },
    days31To60: { amount: bucketAmounts('b2_31_60'), count: bucketCounts('b2_31_60') },
    days61To90: { amount: bucketAmounts('b3_61_90'), count: bucketCounts('b3_61_90') },
    daysOver90: { amount: bucketAmounts('b4_over_90'), count: bucketCounts('b4_over_90') },
  },
  totalReceivables: sumCents(receivables.filter((r) => r.conLai > 0n).map((r) => r.conLai)),
  unbucketedAmount: bucketAmounts('UNBUCKETED'),
  pageSize: 20,
};

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

// Layer 1 verdicts, replayed verbatim.
for (const row of sqlRows) {
  check(`sql.${row.name}`, row.expected, row.actual);
}
const sqlFailures = sqlRows.filter((r) => r.status !== 'PASS');
check('sql.script_check_count', '53', String(sqlRows.length));
check('sql.script_checks_failing', '0', String(sqlFailures.length));
check('sql.script_is_read_only_no_write_statements', 'clean', writeHits.length === 0 ? 'clean' : writeHits.join(','));

// Layer 1b verdicts, replayed verbatim (each proved its own PASS in SQL, and the
// harness re-asserts them so a FAIL in that script cannot pass unnoticed here).
const persistedFailures = persistedRows.filter((r) => r.status !== 'PASS');
check('persisted.script_check_count', '16', String(persistedRows.length));
check('persisted.script_checks_failing', '0', String(persistedFailures.length));

// The persisted-row script is NOT read-only: it inserts real rows inside a
// transaction that ends in ROLLBACK. No row survives and `cong_no` has no
// triggers or rules, but the `cong_no_id_seq` advance is non-transactional and
// is not undone. Assert the mutation class explicitly rather than letting the
// read-only check above imply both scripts are pure. See the script header.
check(
  'persisted.script_rollback_scoped',
  'true',
  /^ROLLBACK;/m.test(persistedScriptText) ? 'true' : 'false'
);

// `CREATE TEMP TABLE ... ON COMMIT DROP` is temp-table scoping, not destruction,
// so it is stripped before scanning for genuinely destructive statements.
const persistedBody = persistedScriptText.replace(/--[^\n]*/g, ' ').replace(/on commit drop/gi, ' ');
const destructive = persistedBody.match(/\b(delete|truncate|alter|grant|revoke|update)\b/gi) ?? [];
check('persisted.script_has_no_destructive_statements', '0', String(destructive.length));

// A persisted probe must write ONLY the table under test. INSERT targets are
// collected and the two temp scratch tables are discounted; anything else would
// be an unannounced write to seed data.
const insertTargets = [...persistedBody.matchAll(/\binsert\s+into\s+([a-z_][a-z0-9_]*)/gi)].map((m) =>
  m[1].toLowerCase()
);
const persistentTargets = [...new Set(insertTargets)].filter(
  (table) => table !== 'boundary_row' && table !== 'inserted_row'
);
check('persisted.script_inserts_only_the_table_under_test', 'cong_no', persistentTargets.join(','));
check('persisted.boundary_is_exhaustive_on_stored_rows', '12', gotPersisted('persisted_bucket_counts_are_exhaustive'));
check('persisted.paid_row_is_unbucketed', 'UNBUCKETED', gotPersisted('persisted_paid_row_is_unbucketed'));
check(
  'persisted.payable_would_be_bucketed_if_unfiltered',
  'b2_31_60',
  gotPersisted('persisted_payable_would_be_bucketed_if_unfiltered')
);

// Layer 2 — summary recomputed in TypeScript vs the production formula in SQL.
check('ts.summary_total_original', formatCents(ts.totalOriginal), got('summary_total_original'));
check('ts.summary_total_paid', formatCents(ts.totalPaid), got('summary_total_paid'));
check('ts.summary_total_outstanding', formatCents(ts.totalOutstanding), got('summary_total_outstanding'));
check('ts.summary_total_overdue', formatCents(ts.totalOverdue), got('summary_total_overdue'));
check('ts.summary_overdue_count', ts.overdueCount, got('summary_overdue_count'));

// Layer 2 — aging buckets recomputed in TypeScript vs the production formula.
check('ts.aging_current_amount', formatCents(ts.aging.current.amount), got('aging_current_amount'));
check('ts.aging_current_count', ts.aging.current.count, got('aging_current_count'));
check('ts.aging_1_30_amount', formatCents(ts.aging.days1To30.amount), got('aging_1_30_amount'));
check('ts.aging_1_30_count', ts.aging.days1To30.count, got('aging_1_30_count'));
check('ts.aging_31_60_amount', formatCents(ts.aging.days31To60.amount), got('aging_31_60_amount'));
check('ts.aging_31_60_count', ts.aging.days31To60.count, got('aging_31_60_count'));
check('ts.aging_61_90_amount', formatCents(ts.aging.days61To90.amount), got('aging_61_90_amount'));
check('ts.aging_61_90_count', ts.aging.days61To90.count, got('aging_61_90_count'));
check('ts.aging_over_90_amount', formatCents(ts.aging.daysOver90.amount), got('aging_over_90_amount'));
check('ts.aging_over_90_count', ts.aging.daysOver90.count, got('aging_over_90_count'));
check('ts.aging_total_receivables', formatCents(ts.totalReceivables), got('aging_total_receivables_equals_summary_total_outstanding'));

// Internal identities, recomputed independently of both SQL layers.
check('ts.aging_buckets_sum_to_total_receivables', formatCents(ts.totalReceivables), formatCents(
  ts.aging.current.amount +
    ts.aging.days1To30.amount +
    ts.aging.days31To60.amount +
    ts.aging.days61To90.amount +
    ts.aging.daysOver90.amount
));
check('ts.aging_unbucketed_amount_is_zero', formatCents(0n), formatCents(ts.unbucketedAmount));
check('ts.outstanding_equals_original_minus_paid', formatCents(ts.totalOutstanding), formatCents(ts.totalOriginal - ts.totalPaid));
check('ts.overdue_subset_of_outstanding', 'overdue<=outstanding', ts.totalOverdue <= ts.totalOutstanding ? 'overdue<=outstanding' : 'overdue>outstanding');

// Layer 2 — phai_tra exclusion.
const payablesInReceivables = rows.filter((r) => r.loai !== 'phai_thu' && receivables.includes(r));
check('ts.phai_tra_rows_in_receivable_population', '0', payablesInReceivables.length);
check('ts.phai_tra_row_count', got('phai_tra_row_count_matches_total_minus_phai_thu'), payables.length);
check('ts.payable_original_amount_excluded', got('payable_original_amount_equals_full_table_minus_summary'), formatCents(sumCents(payables.map((r) => r.phatSinh))));
check('ts.payable_outstanding_amount_excluded', got('payable_outstanding_amount_equals_full_table_minus_summary'), formatCents(sumCents(payables.map((r) => r.conLai))));
check('ts.sales_projection_contains_only_phai_thu', '0', got('sales_projection_contains_only_phai_thu'));

// Layer 2 — boundary matrix: production rule vs the SQL probe dataset.
const boundaryCases: Array<[string, number]> = [
  ['boundary_due_in_1_day', -1],
  ['boundary_due_now_0_days', 0],
  ['boundary_past_due_1_day', 1],
  ['boundary_past_due_30_days', 30],
  ['boundary_past_due_31_days', 31],
  ['boundary_past_due_60_days', 60],
  ['boundary_past_due_61_days', 61],
  ['boundary_past_due_90_days', 90],
  ['boundary_past_due_91_days', 91],
  ['boundary_past_due_30d23h_stays_in_band_1', 30 + 23 / 24],
  ['boundary_past_due_12h_lands_in_band_1', 0.5],
];
for (const [name, daysOverdue] of boundaryCases) {
  check(`ts.${name}`, bucketOf(daysOverdue * 86_400, 10_000n), got(name));
}

// Layer 2 — list/summary population reconciliation and pagination.
check('ts.list_total_equals_receivable_row_count', receivables.length, got('list_total_equals_summary_row_population'));
check('ts.list_total_equals_summary_scanned_rows', got('summary_scanned_rows_are_phai_thu_only'), receivables.length);
check(
  'ts.list_total_pages_ceil',
  Math.ceil(receivables.length / ts.pageSize) || 1,
  got('list_total_pages_formula_ceil_total_over_page_size')
);
check('ts.list_overdue_only_equals_overdue_count', got('list_total_overdue_only_equals_summary_overdue_count'), ts.overdueCount);

// Layer 2 — P9 dashboard metric definitions (dashboard-metrics.md §5).
check('ts.p9_open_receivable_equals_total_outstanding', formatCents(ts.totalOutstanding), got('p9_open_receivable_equals_summary_total_outstanding'));
check('ts.p9_overdue_receivable_equals_total_overdue', formatCents(ts.totalOverdue), got('p9_overdue_receivable_equals_summary_total_overdue'));

// ---------------------------------------------------------------------------
// Target identity (so the evidence names the database that was actually read)
// ---------------------------------------------------------------------------

const identity = psql(`SELECT current_database(), current_user, version(), NOW()::text`).trim().split('|');
check('db.current_database', DB_NAME, identity[0]);
check('db.current_user', DB_USER, identity[1]);
check('db.engine_is_postgresql', 'PostgreSQL', identity[2].split(' ')[0]);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const stamp = new Date().toISOString();
console.log(`# P8 receivable reconciliation harness`);
console.log(`# run_at_utc=${stamp}`);
console.log(`# container=${CONTAINER} database=${identity[0]} user=${identity[1]}`);
console.log(`# db_now=${identity[3]}`);
console.log(`# engine=${identity[2]}`);
console.log(`# sql_script=${SQL_SCRIPT_PATH}`);
console.log(`# password_source=none (PGPASSWORD/PGPASSFILE stripped from child env)`);

for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name} expected=${r.expected} actual=${r.actual}`);
}

for (const r of results.filter((x) => !x.ok)) {
  console.log(`# FAILURE ${r.name}: expected=${r.expected} actual=${r.actual}`);
}

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
console.log(`SUMMARY checks=${results.length} PASS=${passed} FAIL=${failed}`);
console.log(`HARNESS RESULT: ${failed === 0 ? 'PASS' : 'FAIL'}`);

process.exitCode = failed === 0 ? 0 : 1;
