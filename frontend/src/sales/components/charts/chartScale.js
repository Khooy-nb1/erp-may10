/**
 * Pure geometry for the SVG charts: value axes and path construction. Every
 * function is presentation-independent, so the chart components only deal with
 * layout and interaction.
 *
 * All coordinates are SVG user units inside a caller-supplied viewBox; ratios
 * run 0 (start of the axis) to 1 (end of it).
 *
 * @typedef {{ x: number, y: number }} ScalePoint
 * @typedef {{ value: number, ratio: number }} ValueTick Position on the value axis, 0 at the baseline and 1 at the top.
 * @typedef {{ bound: number, ticks: ValueTick[] }} ValueAxis Upper bound; callers scale their geometry against `bound`, not a separate nice number.
 */

/** Multipliers the grid step may round up to; they keep money labels short. */
const NICE_STEPS = [1, 2, 2.5, 5, 10];
/** Counts stay integral up to 10 đơn: above it the raw step is past 2,5, where the 1 / 2 / 5 / 10 multipliers are already whole, while inside it the 2,5 multiplier would print 0,25 / 2,5 / 7,5 ticks on a count axis. */
const COUNT_AXIS_MAX = 10;
/** A count axis shows at most this many steps, so its gridlines stay readable. */
const COUNT_AXIS_STEPS = 5;

/**
 * Axis bound and gridline values for a value axis. Small integer ranges stay
 * integral (a count chart must never print 0,25 đơn); larger ranges round up to
 * a 1 / 2 / 2,5 / 5 / 10 step so money labels stay short.
 *
 * @param {number} max
 * @param {number} [count]
 * @returns {ValueAxis}
 */
export function buildValueAxis(max, count = 4) {
  if (!Number.isFinite(max) || max <= 0) {
    return {
      bound: 1,
      ticks: [
        { value: 0, ratio: 0 },
        { value: 1, ratio: 1 },
      ],
    };
  }

  let step;
  if (max <= COUNT_AXIS_MAX) {
    step = 1;
    while (max / step > COUNT_AXIS_STEPS) step += 1;
  } else {
    const rawStep = max / Math.max(1, Math.floor(count));
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const normalized = rawStep / magnitude;
    step = (NICE_STEPS.find((candidate) => normalized <= candidate) ?? 10) * magnitude;
  }

  const bound = Math.ceil(max / step) * step;
  const stepCount = Math.round(bound / step);
  return {
    bound,
    ticks: Array.from({ length: stepCount + 1 }, (_, index) => ({
      value: index * step,
      ratio: (index * step) / bound,
    })),
  };
}

/** Clamps a value into 0..1; guards the charts against a zero or missing range. */
export function clampRatio(value, max) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}

/**
 * Straight polyline through the points, in order.
 *
 * @param {ScalePoint[]} points
 * @returns {string}
 */
export function buildLinePath(points) {
  if (points.length === 0) return '';
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)} ${round(point.y)}`)
    .join(' ');
}

/**
 * The same polyline closed onto the baseline, for the filled area beneath it.
 *
 * @param {ScalePoint[]} points
 * @param {number} baselineY
 * @returns {string}
 */
export function buildAreaPath(points, baselineY) {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${buildLinePath(points)} L${round(last.x)} ${round(baselineY)} L${round(first.x)} ${round(baselineY)} Z`;
}

/** Keeps generated path data compact; sub-pixel precision is not visible. */
function round(value) {
  return Math.round(value * 100) / 100;
}
