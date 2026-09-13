import React from 'react';
import { cn } from '../../lib/cn.js';

export interface ProportionalWidth {
  type: 'proportional';
  value: number;
  minWidth?: number;
}

export interface PixelWidth {
  type: 'pixel';
  value: number;
}

export type ColumnWidth = ProportionalWidth | PixelWidth;

export interface TableColumn<T> {
  key: string;
  header?: React.ReactNode;
  width?: ColumnWidth;
  align?: 'start' | 'center' | 'end';
  renderCell?: (row: T, rowIndex: number) => React.ReactNode;
}

/** Share of the leftover table width; `minWidth` is the floor that keeps it readable. */
export function proportional(value: number, options?: { minWidth?: number }): ColumnWidth {
  return { type: 'proportional', value, minWidth: options?.minWidth };
}

/** Fixed column width in pixels, for action and numeric columns. */
export function pixel(value: number): ColumnWidth {
  return { type: 'pixel', value };
}

const ALIGN_CLASSES = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
} as const;

const DENSITY_CLASSES = {
  compact: 'h-10',
  balanced: 'h-12',
  spacious: 'h-14',
} as const;

export interface TableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: TableColumn<T>[];
  idKey: (keyof T & string) | ((item: T) => string | number);
  /** Accessible name for the table. */
  label?: string;
  density?: 'compact' | 'balanced' | 'spacious';
  hasHover?: boolean;
  /** Row offset so aria-rowindex reports the position within the whole dataset. */
  rowIndexStart?: number;
  rowCount?: number;
  className?: string;
}

/**
 * Data table with a scroll container and a pinned first column: below the
 * widest layout the table scrolls horizontally instead of hiding columns.
 */
export function Table<T extends Record<string, unknown>>({
  data,
  columns,
  idKey,
  label = 'Bảng',
  density = 'balanced',
  hasHover = true,
  rowIndexStart,
  rowCount,
  className,
}: TableProps<T>) {
  const proportionalTotal = columns.reduce(
    (sum, column) => sum + (column.width?.type === 'proportional' ? column.width.value : 0),
    0
  );
  const minWidthOf = (column: TableColumn<T>) =>
    column.width?.type === 'proportional' ? column.width.minWidth : undefined;

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table aria-label={label} aria-rowcount={rowCount} className="w-full text-sm">
        <colgroup>
          {columns.map((column) => {
            const width = column.width;
            if (!width) return <col key={column.key} />;
            if (width.type === 'pixel') return <col key={column.key} width={width.value} />;
            const share = proportionalTotal > 0 ? (width.value / proportionalTotal) * 100 : undefined;
            return <col key={column.key} width={share === undefined ? undefined : `${share.toFixed(2)}%`} />;
          })}
        </colgroup>
        <thead>
          <tr className="bg-surface-muted text-xs uppercase tracking-wide text-muted-foreground">
            {columns.map((column, columnIndex) => (
              <th
                key={column.key}
                scope="col"
                style={{ minWidth: minWidthOf(column) }}
                className={cn(
                  'h-11 whitespace-nowrap px-4 font-medium',
                  ALIGN_CLASSES[column.align ?? 'start'],
                  columnIndex === 0 ? 'sticky left-0 z-10 bg-surface-muted' : null
                )}
              >
                {column.header ?? null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={String(typeof idKey === 'function' ? idKey(row) : row[idKey])}
              aria-rowindex={rowIndexStart === undefined ? undefined : rowIndexStart + rowIndex}
              className={cn('border-b border-border last:border-b-0', hasHover ? 'hover:bg-surface-muted' : null)}
            >
              {columns.map((column, columnIndex) => (
                <td
                  key={column.key}
                  style={{ minWidth: minWidthOf(column) }}
                  className={cn(
                    'whitespace-nowrap px-4',
                    DENSITY_CLASSES[density],
                    ALIGN_CLASSES[column.align ?? 'start'],
                    columnIndex === 0 ? 'sticky left-0 z-10 bg-surface' : null
                  )}
                >
                  {column.renderCell
                    ? column.renderCell(row, rowIndex)
                    : (row[column.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
