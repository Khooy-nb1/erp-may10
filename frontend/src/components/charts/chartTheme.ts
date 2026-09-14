import type { BadgeVariant } from '../ui/Badge.js';
import { statusTone } from '../common/StatusBadge.js';

/**
 * Chart paint values. Every entry is a CSS variable reference, so a chart
 * inherits the same palette as the surrounding UI instead of restating hex
 * values, and a token change repaints the charts with no code edit.
 */

const TONE_COLOR: Record<BadgeVariant, string> = {
  neutral: 'var(--color-border-strong)',
  info: 'var(--color-info)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-danger)',
  purple: 'var(--color-violet)',
};

/** Fill/stroke for one semantic tone. */
export function toneColor(tone: BadgeVariant): string {
  return TONE_COLOR[tone];
}

/** Fill for a domain status, matching the colour of its status badge. */
export function statusColor(status: string): string {
  return TONE_COLOR[statusTone(status)];
}

/** Primary series paint, used by the trend chart. */
export const SERIES_COLOR = 'var(--color-primary)';
/** Secondary series paint for comparison overlays. */
export const SERIES_COLOR_ALT = 'var(--color-violet)';

/** Gridlines and axis rules. */
export const GRID_COLOR = 'var(--color-chart-grid)';
export const AXIS_COLOR = 'var(--color-chart-axis)';
