import { statusTone } from '../common/StatusBadge.jsx';

/**
 * Chart paint values. PH1 referenced its own Tailwind v4 `--color-*` variables;
 * Core's Tailwind 3.4 config defines no such variables, so every entry is the
 * literal hex of the Core colour it maps to
 * (docs/ph1-remediation/FRONTEND_TOKEN_MAP.md, PLAN Step 6H: Corporate Blue
 * `#0F5FAF`). A chart therefore still inherits the palette of the surrounding
 * UI instead of restating its own colours.
 *
 * Tone fills use the token map's "solid" shade — the same colour the ported UI
 * paints for that semantic (`bg-emerald-600`, `bg-amber-500`, `bg-rose-600`,
 * `bg-sky-600`, `bg-violet-600`, `border-brand-border`), so a chart bar and the
 * status badge beside it agree.
 */

/** Fill/stroke per semantic tone, keyed by the badge variant that carries it. */
const TONE_COLOR = {
  neutral: '#CBD5E1',
  info: '#0284C7',
  success: '#059669',
  warning: '#F59E0B',
  error: '#E11D48',
  purple: '#7C3AED',
};

/** Fill/stroke for one semantic tone. */
export function toneColor(tone) {
  return TONE_COLOR[tone];
}

/** Fill for a domain status, matching the colour of its status badge. */
export function statusColor(status) {
  return TONE_COLOR[statusTone(status)];
}

/** Primary series paint, used by the trend chart. */
export const SERIES_COLOR = '#0F5FAF';
/** Secondary series paint for comparison overlays. */
export const SERIES_COLOR_ALT = '#7C3AED';

/** Gridlines and axis rules. */
export const GRID_COLOR = '#EEF2F7';
export const AXIS_COLOR = '#CBD5E1';
