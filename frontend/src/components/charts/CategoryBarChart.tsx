import React, { useMemo, useState } from 'react';
import { cn } from '../../lib/cn.js';
import { Skeleton } from '../ui/Skeleton.js';
import { buildValueAxis, clampRatio, type ValueTick } from './chartScale.js';
import { AXIS_COLOR, GRID_COLOR, SERIES_COLOR } from './chartTheme.js';
import { useChartWidth } from './useChartWidth.js';

/**
 * Column chart for small categorical counts — an order-status breakdown, for
 * instance. Bar height carries the value, and every column also prints its
 * label and count, so colour only reinforces what the text already states.
 */

const PADDING = { top: 20, right: 12, bottom: 34, left: 56 } as const;
const DEFAULT_HEIGHT = 220;

/** One column plus the gap that follows it, in units of a column width. */
const COLUMN_SLOT = 1.4;
const GAP_RATIO = 0.4;

/** A single unit must stay visible, so a non-empty column keeps a floor. */
const BAR_MIN_HEIGHT = 3;
const BAR_RADIUS = 4;
/** Zero renders as a track rather than a bar: the category exists, its value is 0. */
const ZERO_TRACK_HEIGHT = 2;
const ZERO_TRACK_RADIUS = 1;

/** Segments below this width vanish; a share that rounds to 0% keeps the floor. */
const SHARE_MIN_WIDTH = 2;

const VALUE_LABEL_GAP = 6;
/** An axis label at 11px averages about this much width per character. */
const LABEL_CHAR_WIDTH = 6.3;
/** A label keeps this much air between itself and the edge of what it labels. */
const LABEL_CLEARANCE = 6;
/** Fewer characters than this says nothing, so labels thin out instead of clipping. */
const MIN_CATEGORY_CHARS = 3;

const TOOLTIP_OFFSET = 8;
/** The tooltip stays inside the container even on the first and last column. */
const TOOLTIP_MIN_PERCENT = 8;
const TOOLTIP_MAX_PERCENT = 92;

const SHARE_FORMAT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

const SKELETON_COLUMN_RATIOS = [0.55, 0.85, 0.4, 0.7, 0.95] as const;
const SKELETON_LEGEND_ROWS = [0, 1, 2, 3] as const;

export interface CategoryPoint {
  key: string;
  label: string;
  value: number;
  /** Explicit fill, a CSS variable reference such as var(--color-warning). */
  color?: string;
}

export interface CategoryBarChartProps {
  points: CategoryPoint[];
  formatValue: (value: number) => string;
  ariaLabel: string;
  /** Short formatter for the y-axis ticks; falls back to formatValue. */
  formatAxis?: (value: number) => string;
  /** Unit shown under the category axis, e.g. "đơn". */
  valueSuffix?: string;
  height?: number;
  showShare?: boolean;
  className?: string;
}

interface Column {
  key: string;
  label: string;
  /** Clipped for the axis; the full text stays in the column's <title>. */
  shortLabel: string;
  value: number;
  color: string;
  /** Exact percentage, so the stacked strip still sums to 100. */
  share: number;
  x: number;
  width: number;
  y: number;
  height: number;
  /** False when the column is too narrow to print a label without collisions. */
  showLabel: boolean;
  showValueLabel: boolean;
}

interface Layout {
  columns: Column[];
  ticks: ValueTick[];
  total: number;
  plotWidth: number;
  plotHeight: number;
  baselineY: number;
  columnWidth: number;
  gap: number;
}

/** Counts arrive from an API, so a missing or negative value must not reach the geometry. */
const normalize = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

/** Clips a label to what its slot can hold; the full text stays in the column's <title>. */
function truncateLabel(label: string, limit: number): string {
  return label.length > limit ? `${label.slice(0, limit - 1)}…` : label;
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({
  points,
  formatValue,
  ariaLabel,
  formatAxis,
  valueSuffix,
  height = DEFAULT_HEIGHT,
  showShare = false,
  className,
}) => {
  const { ref, width } = useChartWidth<HTMLDivElement>();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hasFocus, setHasFocus] = useState(false);

  const layout = useMemo<Layout>(() => {
    const plotWidth = Math.max(0, width - PADDING.left - PADDING.right);
    const plotHeight = Math.max(0, height - PADDING.top - PADDING.bottom);
    const baselineY = PADDING.top + plotHeight;

    const count = points.length;
    const values = points.map((point) => normalize(point.value));
    const total = values.reduce((sum, value) => sum + value, 0);
    const largest = values.reduce((max, value) => (value > max ? value : max), 0);
    const axis = buildValueAxis(largest);

    // n columns of width w and (n - 1) gaps of 0.4w fill the plot: w * (1.4n - 0.4).
    const denominator = COLUMN_SLOT * count - GAP_RATIO;
    const columnWidth = count > 0 && denominator > 0 ? plotWidth / denominator : 0;
    const gap = columnWidth * GAP_RATIO;

    // Three characters already overflow a column this narrow, so labelled
    // columns are spaced out and each label claims its whole doubled slot.
    const columnChars = Math.floor((columnWidth - LABEL_CLEARANCE) / LABEL_CHAR_WIDTH);
    const labelEvery = columnChars < MIN_CATEGORY_CHARS ? 2 : 1;
    const labelSpan = labelEvery === 1 ? columnWidth : labelEvery * (columnWidth + gap);
    const labelLimit = Math.max(
      MIN_CATEGORY_CHARS,
      Math.floor((labelSpan - LABEL_CLEARANCE) / LABEL_CHAR_WIDTH)
    );

    const columns = points.map((point, index) => {
      const value = values[index];
      const barHeight =
        value > 0
          ? Math.max(BAR_MIN_HEIGHT, clampRatio(value, axis.bound) * plotHeight)
          : ZERO_TRACK_HEIGHT;
      const valueLabel = formatValue(value);
      return {
        key: point.key,
        label: point.label,
        shortLabel: truncateLabel(point.label, labelLimit),
        value,
        color: point.color ?? SERIES_COLOR,
        share: total > 0 ? (value / total) * 100 : 0,
        x: PADDING.left + index * (columnWidth + gap),
        width: columnWidth,
        y: baselineY - barHeight,
        height: barHeight,
        showLabel: index % labelEvery === 0,
        showValueLabel: valueLabel.length <= columnChars,
      };
    });

    return {
      columns,
      ticks: axis.ticks,
      total,
      plotWidth,
      plotHeight,
      baselineY,
      columnWidth,
      gap,
    };
  }, [points, width, height, formatValue]);

  const plotX = PADDING.left;
  const plotRight = plotX + layout.plotWidth;
  const columnCount = layout.columns.length;
  const axisFormat = formatAxis ?? formatValue;
  const activeColumn =
    activeIndex !== null && activeIndex < columnCount ? layout.columns[activeIndex] : undefined;

  const handlePointerMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (columnCount === 0 || layout.columnWidth <= 0) return;
    // Nearest column centre wins, so the gutter still resolves to the closest one.
    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - bounds.left - plotX - layout.columnWidth / 2;
    const index = Math.round(offsetX / (layout.columnWidth + layout.gap));
    setActiveIndex(Math.min(columnCount - 1, Math.max(0, index)));
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGRectElement>) => {
    if (columnCount === 0) return;
    if (event.key === 'Escape') {
      setActiveIndex(null);
      return;
    }

    const step = (delta: number) =>
      setActiveIndex((current) => {
        if (current === null) return delta > 0 ? 0 : columnCount - 1;
        return Math.min(columnCount - 1, Math.max(0, current + delta));
      });

    if (event.key === 'ArrowRight') step(1);
    else if (event.key === 'ArrowLeft') step(-1);
    else if (event.key === 'Home') setActiveIndex(0);
    else if (event.key === 'End') setActiveIndex(columnCount - 1);
    else return;

    event.preventDefault();
  };

  return (
    <div ref={ref} className={cn('relative w-full', className)}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          className="block"
          onMouseMove={handlePointerMove}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {layout.ticks.map((tick) => {
            const y = layout.baselineY - tick.ratio * layout.plotHeight;
            return (
              <g key={tick.ratio}>
                {tick.ratio > 0 && (
                  <line
                    x1={plotX}
                    y1={y}
                    x2={plotRight}
                    y2={y}
                    stroke={GRID_COLOR}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                <text
                  x={plotX - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {axisFormat(tick.value)}
                </text>
              </g>
            );
          })}

          <line
            x1={plotX}
            y1={layout.baselineY}
            x2={plotRight}
            y2={layout.baselineY}
            stroke={AXIS_COLOR}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {layout.columns.map((column, index) => (
            <g key={column.key}>
              <title>{column.label}</title>
              {index === activeIndex && (
                <rect
                  x={column.x - 2}
                  y={PADDING.top}
                  width={column.width + 4}
                  height={layout.plotHeight}
                  rx={6}
                  className="fill-primary-soft stroke-primary"
                  strokeOpacity={0.35}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              <rect
                x={column.x}
                y={column.y}
                width={column.width}
                height={column.height}
                rx={column.value > 0 ? BAR_RADIUS : ZERO_TRACK_RADIUS}
                fill={column.value > 0 ? column.color : GRID_COLOR}
              />
              {column.showValueLabel && (
                <text
                  x={column.x + column.width / 2}
                  y={column.y - VALUE_LABEL_GAP}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-semibold tabular-nums"
                >
                  {formatValue(column.value)}
                </text>
              )}
              {column.showLabel && (
                <text
                  x={column.x + column.width / 2}
                  y={height - 12}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {column.shortLabel}
                </text>
              )}
            </g>
          ))}

          {valueSuffix ? (
            <text
              x={plotX - 8}
              y={height - 12}
              textAnchor="end"
              className="fill-muted-foreground text-[11px]"
            >
              {valueSuffix}
            </text>
          ) : null}

          {/* Keyboard surface: pointer-transparent so the columns keep their own hover. */}
          <rect
            x={plotX}
            y={PADDING.top}
            width={layout.plotWidth}
            height={layout.plotHeight}
            fill="transparent"
            pointerEvents="none"
            tabIndex={0}
            aria-label={`${ariaLabel}, ${columnCount} danh mục`}
            className="focus-visible:outline-none"
            onKeyDown={handleKeyDown}
            onFocus={() => setHasFocus(true)}
            onBlur={() => {
              setHasFocus(false);
              setActiveIndex(null);
            }}
          />
          {hasFocus && (
            <rect
              x={plotX}
              y={PADDING.top}
              width={layout.plotWidth}
              height={layout.plotHeight}
              rx={6}
              pointerEvents="none"
              strokeWidth={2}
              className="fill-none stroke-primary"
            />
          )}
        </svg>
      )}

      {showShare && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            {layout.columns.map((column) => (
              <div
                key={column.key}
                className="h-full shrink-0"
                style={{
                  width: `${column.share}%`,
                  minWidth: column.value > 0 ? SHARE_MIN_WIDTH : undefined,
                  backgroundColor: column.color,
                }}
              />
            ))}
          </div>
          <ul className="flex flex-col gap-1">
            {layout.columns.map((column) => (
              <li key={column.key} className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: column.color }}
                />
                <span className="min-w-0 flex-1 truncate text-foreground">{column.label}</span>
                <span className="tabular-nums text-foreground">{formatValue(column.value)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {SHARE_FORMAT.format(column.share)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-primary">Bảng số liệu</summary>
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="py-1.5 font-medium">
                Danh mục
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                Số lượng
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                Tỉ lệ
              </th>
            </tr>
          </thead>
          <tbody>
            {layout.columns.map((column) => (
              <tr key={column.key} className="border-t border-border">
                <td className="py-1.5 text-foreground">{column.label}</td>
                <td className="py-1.5 text-right tabular-nums text-foreground">
                  {formatValue(column.value)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                  {SHARE_FORMAT.format(column.share)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      {activeColumn && width > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 flex flex-col gap-0.5 whitespace-nowrap rounded-control border border-border bg-surface px-3 py-2 text-sm shadow-raised"
          style={{
            left: `${Math.min(
              TOOLTIP_MAX_PERCENT,
              Math.max(
                TOOLTIP_MIN_PERCENT,
                ((activeColumn.x + activeColumn.width / 2) / width) * 100
              )
            )}%`,
            top: activeColumn.y - TOOLTIP_OFFSET,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <span className="font-medium text-foreground">{activeColumn.label}</span>
          <span className="flex items-baseline gap-2">
            <span className="font-semibold tabular-nums text-foreground">
              {formatValue(activeColumn.value)}
            </span>
            {layout.total > 0 && (
              <span className="tabular-nums text-muted-foreground">
                chiếm {SHARE_FORMAT.format(activeColumn.share)}%
              </span>
            )}
          </span>
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {activeColumn ? `${activeColumn.label}: ${formatValue(activeColumn.value)}` : ''}
      </div>
    </div>
  );
};

/** Loading placeholder that keeps the chart's footprint, so nothing shifts on arrival. */
export const CategoryBarChartSkeleton: React.FC<{ height?: number; className?: string }> = ({
  height = DEFAULT_HEIGHT,
  className,
}) => (
  <div aria-hidden className={cn('flex flex-col gap-3', className)}>
    <div className="flex items-end gap-3 pb-8" style={{ height }}>
      {SKELETON_COLUMN_RATIOS.map((ratio, index) => (
        <div key={index} className="flex-1" style={{ height: `${ratio * 100}%` }}>
          <Skeleton className="h-full w-full" />
        </div>
      ))}
    </div>
    <Skeleton className="h-1.5 w-full rounded-full" />
    <div className="flex flex-col gap-1">
      {SKELETON_LEGEND_ROWS.map((row) => (
        <Skeleton key={row} className="h-4 w-full" />
      ))}
    </div>
    <Skeleton className="h-4 w-24" />
  </div>
);
