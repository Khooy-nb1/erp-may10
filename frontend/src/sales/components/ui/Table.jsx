import { Spinner } from './Spinner.jsx';
import { cn } from '../../lib/cn.js';

/** Share of the leftover table width; `minWidth` is the floor that keeps it readable. */
export function proportional(value, options) {
  return { type: 'proportional', value, minWidth: options?.minWidth };
}

/** Fixed column width in pixels, for action and numeric columns. */
export function pixel(value) {
  return { type: 'pixel', value };
}

const ALIGN_CLASSES = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
};

const DENSITY_CLASSES = {
  compact: 'h-10',
  balanced: 'h-12',
  spacious: 'h-14',
};

/**
 * Data table with a scroll container and a pinned first column: below the
 * widest layout the table scrolls horizontally instead of hiding columns.
 *
 * Props (PH1 `TableProps`): data, columns, idKey, label, density, hasHover,
 * rowIndexStart, rowCount, className. Two optional extras the page ports use,
 * `loading` and `emptyMessage`, render their own body row and are ignored when
 * omitted, so PH1's markup is unchanged for existing call sites.
 */
export function Table({
  data,
  columns,
  idKey,
  label = 'Bảng',
  density = 'balanced',
  hasHover = true,
  rowIndexStart,
  rowCount,
  loading = false,
  emptyMessage,
  className,
}) {
  const proportionalTotal = columns.reduce(
    (sum, column) => sum + (column.width?.type === 'proportional' ? column.width.value : 0),
    0
  );
  const minWidthOf = (column) =>
    column.width?.type === 'proportional' ? column.width.minWidth : undefined;

  const body = [];

  if (loading) {
    body.push(
      <tr key="__loading">
        <td colSpan={columns.length} className="px-4 py-8 text-center">
          <Spinner size="sm" />
        </td>
      </tr>
    );
  } else if (data.length === 0 && emptyMessage) {
    body.push(
      <tr key="__empty">
        <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-400">
          {emptyMessage}
        </td>
      </tr>
    );
  } else {
    data.forEach((row, rowIndex) => {
      body.push(
        <tr
          key={String(typeof idKey === 'function' ? idKey(row) : row[idKey])}
          aria-rowindex={rowIndexStart === undefined ? undefined : rowIndexStart + rowIndex}
          className={cn('border-b border-brand-border last:border-b-0', hasHover ? 'group hover:bg-slate-50' : null)}
        >
          {columns.map((column, columnIndex) => (
            <td
              key={column.key}
              style={{ minWidth: minWidthOf(column) }}
              className={cn(
                'whitespace-nowrap px-4',
                DENSITY_CLASSES[density],
                ALIGN_CLASSES[column.align ?? 'start'],
                columnIndex === 0
                  ? cn('sticky left-0 z-10 bg-white', hasHover ? 'group-hover:bg-slate-50' : null)
                  : null
              )}
            >
              {column.renderCell ? column.renderCell(row, rowIndex) : row[column.key]}
            </td>
          ))}
        </tr>
      );
    });
  }

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
          <tr className="bg-slate-50 text-xs uppercase tracking-wide text-brand-secondary">
            {columns.map((column, columnIndex) => (
              <th
                key={column.key}
                scope="col"
                style={{ minWidth: minWidthOf(column) }}
                className={cn(
                  'h-11 whitespace-nowrap px-4 font-medium',
                  ALIGN_CLASSES[column.align ?? 'start'],
                  columnIndex === 0 ? 'sticky left-0 z-10 bg-slate-50' : null
                )}
              >
                {column.header ?? null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}
