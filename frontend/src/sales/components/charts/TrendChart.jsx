import React from 'react';
import { cn } from '../../lib/cn.js';
import { Skeleton } from '../ui/Skeleton.jsx';
import { buildAreaPath, buildLinePath, buildValueAxis, clampRatio } from './chartScale.js';
import { AXIS_COLOR, GRID_COLOR, SERIES_COLOR } from './chartTheme.js';
import { useChartWidth } from './useChartWidth.js';

/**
 * One period of the series: `key` is the React key and the point identity,
 * `label` the period label the caller has already formatted (PH1's
 * `formatMonthLabel` is applied at the call site, not here), `value` the number
 * that is plotted, and `caption` an optional secondary line shown in the
 * tooltip, e.g. "3 hóa đơn".
 *
 * `TrendChartProps`: `points`, `formatValue` (full-precision, tooltips and the
 * data table), `formatAxis` (short formatter for the y-axis labels, falling back
 * to `formatValue`), `ariaLabel`, `seriesLabel`, `height`, `className`.
 */

/** Plot insets: room for the value labels on the left and the month labels below. */
const PADDING = { top: 16, right: 16, bottom: 28, left: 64 };
const DEFAULT_HEIGHT = 240;
/** An axis label at 11px averages about this much width per character. */
const LABEL_CHAR_WIDTH = 6.3;
/** Two neighbouring x labels need this much air between them to read as separate. */
const LABEL_GAP = 8;
/** Past this many points the per-point markers are noise rather than signal. */
const MAX_MARKERS = 12;
const MARKER_RADIUS = 3.5;
const ACTIVE_MARKER_RADIUS = 5.5;
/** Tooltip anchor stays inside these percentages of the plot width. */
const TOOLTIP_MIN_PERCENT = 8;
const TOOLTIP_MAX_PERCENT = 92;
const TOOLTIP_LIFT = 12;

/** Paint values the theme module has no constant for. */
const SURFACE_PAINT = '#FFFFFF';
const FOCUS_PAINT = '#0F5FAF';

/**
 * Indices of the points whose x label is drawn. The slot between two points
 * decides the step, so a wide card keeps every label while a narrow one thins
 * them out. The first and the last point anchor the axis whenever they fit.
 */
function buildLabelIndices(points, plotWidth) {
  const count = points.length;
  if (count === 0) return new Set();
  if (count === 1) return new Set([0]);

  const slot = plotWidth / (count - 1);
  const widest = points.reduce(
    (max, point) => Math.max(max, point.label.length * LABEL_CHAR_WIDTH),
    0
  );
  const step = slot > 0 ? Math.max(1, Math.ceil((widest + LABEL_GAP) / slot)) : 1;

  const drawn = [0];
  for (let index = step; index < count; index += step) {
    const previous = drawn[drawn.length - 1];
    if (labelsFit(points, slot, previous, index)) drawn.push(index);
  }

  const last = count - 1;
  if (drawn[drawn.length - 1] !== last) {
    // The last label anchors the axis, so it wins over the neighbour it would collide with.
    while (drawn.length > 0 && !labelsFit(points, slot, drawn[drawn.length - 1], last)) {
      drawn.pop();
    }
    drawn.push(last);
  }

  return new Set(drawn);
}

/** True when the labels of two points keep `LABEL_GAP` pixels of air between their glyphs. */
function labelsFit(points, slot, left, right) {
  const widths = (points[left].label.length + points[right].label.length) * LABEL_CHAR_WIDTH;
  return (right - left) * slot >= widths / 2 + LABEL_GAP;
}

/**
 * Monthly series as an area + line chart. Pointer and keyboard move one active
 * point whose value is echoed in a tooltip and a polite live region, and the
 * same numbers stay readable as a table once the chart is closed or printed.
 */
export const TrendChart = ({
  points,
  formatValue,
  formatAxis,
  ariaLabel,
  seriesLabel,
  height = DEFAULT_HEIGHT,
  className,
}) => {
  const { ref, width } = useChartWidth();
  const gradientId = React.useId();
  const [requestedIndex, setRequestedIndex] = React.useState(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const count = points.length;
  const lastIndex = count - 1;
  /** Clamped on read so a shorter series after a refetch never points past the end. */
  const activeIndex =
    requestedIndex === null || count === 0 ? null : Math.min(requestedIndex, lastIndex);

  const plotLeft = PADDING.left;
  const plotTop = PADDING.top;
  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 0);
  const plotHeight = Math.max(height - PADDING.top - PADDING.bottom, 0);
  const plotBottom = plotTop + plotHeight;

  const valueMax = points.reduce((max, point) => Math.max(max, point.value), 0);
  const axis = buildValueAxis(valueMax);
  const labelIndices = buildLabelIndices(points, plotWidth);

  const plotted = points.map((point, index) => ({
    point,
    // A lone point sits at the centre; from two points on they spread edge to edge.
    x: plotLeft + (count <= 1 ? 0.5 : index / (count - 1)) * plotWidth,
    y: plotBottom - clampRatio(point.value, axis.bound) * plotHeight,
  }));
  const activePlot = activeIndex === null ? null : plotted[activeIndex];
  const activePoint = activePlot === null ? null : activePlot.point;
  const formatTick = formatAxis ?? formatValue;

  const handleKeyDown = (event) => {
    if (count === 0) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const step = event.key === 'ArrowLeft' ? -1 : 1;
      const base = activeIndex ?? (step === 1 ? -1 : count);
      setRequestedIndex(Math.max(0, Math.min(lastIndex, base + step)));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setRequestedIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setRequestedIndex(lastIndex);
    } else if (event.key === 'Escape') {
      setRequestedIndex(null);
    }
  };

  const handleMouseMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || count === 0) return;
    // The overlay rect is the plot, so its own box maps straight onto plot coordinates.
    const pointerX = plotLeft + ((event.clientX - bounds.left) / bounds.width) * plotWidth;
    const step = count <= 1 ? 0 : plotWidth / (count - 1);
    const nearest = step > 0 ? Math.round((pointerX - plotLeft) / step) : 0;
    setRequestedIndex(Math.min(count - 1, Math.max(0, nearest)));
  };

  const tooltipLeft =
    activePlot === null || width === 0
      ? null
      : Math.min(
          TOOLTIP_MAX_PERCENT,
          Math.max(TOOLTIP_MIN_PERCENT, (activePlot.x / width) * 100)
        );

  return (
    <div ref={ref} className={cn('relative w-full', className)}>
      {count > 0 && width > 0 ? (
        <>
          <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.18} />
                <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            {axis.ticks.map((tick) => {
              const y = plotBottom - tick.ratio * plotHeight;
              return (
                <line
                  key={tick.value}
                  x1={plotLeft}
                  x2={plotLeft + plotWidth}
                  y1={y}
                  y2={y}
                  stroke={tick.ratio === 0 ? AXIS_COLOR : GRID_COLOR}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            {axis.ticks.map((tick) => (
              <text
                key={tick.value}
                x={plotLeft - 8}
                y={plotBottom - tick.ratio * plotHeight}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                className="fill-brand-secondary tabular-nums"
              >
                {formatTick(tick.value)}
              </text>
            ))}

            <path d={buildAreaPath(plotted, plotBottom)} fill={`url(#${gradientId})`} />

            <path
              d={buildLinePath(plotted)}
              fill="none"
              stroke={SERIES_COLOR}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {activePlot !== null ? (
              <line
                x1={activePlot.x}
                x2={activePlot.x}
                y1={plotTop}
                y2={plotBottom}
                stroke={GRID_COLOR}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}

            {count <= MAX_MARKERS
              ? plotted.map((entry, index) => (
                  <circle
                    key={entry.point.key}
                    cx={entry.x}
                    cy={entry.y}
                    r={index === activeIndex ? ACTIVE_MARKER_RADIUS : MARKER_RADIUS}
                    fill={SURFACE_PAINT}
                    stroke={SERIES_COLOR}
                    strokeWidth={2}
                  />
                ))
              : null}

            {/* A dense series draws no per-point markers, so the active one gets its own. */}
            {count > MAX_MARKERS && activePlot !== null ? (
              <circle
                cx={activePlot.x}
                cy={activePlot.y}
                r={ACTIVE_MARKER_RADIUS}
                fill={SURFACE_PAINT}
                stroke={SERIES_COLOR}
                strokeWidth={2}
              />
            ) : null}

            {plotted.map((entry, index) =>
              labelIndices.has(index) ? (
                <text
                  key={entry.point.key}
                  x={entry.x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize={11}
                  className="fill-brand-secondary tabular-nums"
                >
                  {entry.point.label}
                </text>
              ) : null
            )}

            <rect
              x={plotLeft}
              y={plotTop}
              width={plotWidth}
              height={plotHeight}
              fill="transparent"
              tabIndex={0}
              aria-label={`${ariaLabel} — ${seriesLabel}`}
              onKeyDown={handleKeyDown}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setRequestedIndex(null)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="outline-none"
            />

            {isFocused ? (
              <rect
                x={plotLeft}
                y={plotTop}
                width={plotWidth}
                height={plotHeight}
                fill="none"
                stroke={FOCUS_PAINT}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            ) : null}
          </svg>

          {activePlot !== null && tooltipLeft !== null ? (
            <div
              className="pointer-events-none absolute z-10 rounded-xl border border-brand-border bg-white px-3 py-2 text-sm shadow-md"
              style={{
                left: `${tooltipLeft}%`,
                top: `${activePlot.y - TOOLTIP_LIFT}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="text-brand-secondary">{activePlot.point.label}</div>
              <div className="font-medium tabular-nums">
                {formatValue(activePlot.point.value)}
              </div>
              {activePlot.point.caption ? (
                <div className="text-brand-secondary">{activePlot.point.caption}</div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="sr-only" aria-live="polite">
        {activePoint === null ? '' : `${activePoint.label}: ${formatValue(activePoint.value)}`}
      </div>

      {count > 0 ? (
        <details className="mt-3">
          <summary className="w-fit cursor-pointer text-sm text-brand-secondary">
            Bảng số liệu
          </summary>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr>
                <th scope="col" className="pb-1 text-left font-medium text-brand-secondary">
                  Kỳ
                </th>
                <th scope="col" className="pb-1 text-right font-medium text-brand-secondary">
                  {seriesLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.key} className="border-t border-brand-border">
                  <td className="py-1">{point.label}</td>
                  <td className="py-1 text-right tabular-nums">{formatValue(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </div>
  );
};

/** Reserves the chart's footprint so the card does not jump when the series lands. */
export const TrendChartSkeleton = ({ height = DEFAULT_HEIGHT, className }) => (
  <div aria-hidden className={cn('w-full', className)} style={{ height }}>
    <Skeleton className="h-full w-full" />
  </div>
);
