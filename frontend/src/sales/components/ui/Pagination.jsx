import { Fragment } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { buttonVariants } from './Button.jsx';

/** Page numbers around the current one, with the first and last always reachable. */
function pageWindow(page, totalPages) {
  const candidates = [1, totalPages, page - 1, page, page + 1];
  return [...new Set(candidates.filter((candidate) => candidate >= 1 && candidate <= totalPages))].sort(
    (a, b) => a - b
  );
}

/**
 * Server-pagination bar: range caption, page numbers, prev/next.
 *
 * Props (PH1 `PaginationProps`): page, totalPages, totalItems, pageSize,
 * onChange, className. `total` and `onPageChange` are accepted as aliases of
 * `totalItems`/`onChange` for the page ports that use the shorter names.
 */
export const Pagination = ({
  page,
  totalPages,
  totalItems,
  total,
  pageSize = 20,
  onChange,
  onPageChange,
  className,
}) => {
  const itemCount = totalItems ?? total ?? 0;
  const change = onChange ?? onPageChange;
  const from = itemCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, itemCount);
  const pages = pageWindow(page, totalPages);

  const stepClass = cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'w-8 px-0');

  return (
    <nav
      aria-label="Phân trang"
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
    >
      <p className="text-sm text-brand-secondary">
        {from}–{to} trên {itemCount}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Đến trang trước"
          disabled={page <= 1}
          onClick={() => change(page - 1)}
          className={stepClass}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        {pages.map((candidate, index) => (
          <Fragment key={`${candidate}-${index}`}>
            {index > 0 && candidate - pages[index - 1] > 1 ? (
              <span aria-hidden className="px-1 text-sm text-slate-400">
                …
              </span>
            ) : null}
            <button
              type="button"
              aria-label={`Đến trang ${candidate}`}
              aria-current={candidate === page ? 'page' : undefined}
              onClick={() => change(candidate)}
              className={cn(
                buttonVariants({ variant: candidate === page ? 'primary' : 'secondary', size: 'sm' }),
                'w-8 px-0 tabular-nums'
              )}
            >
              {candidate}
            </button>
          </Fragment>
        ))}
        <button
          type="button"
          aria-label="Đến trang tiếp theo"
          disabled={page >= totalPages}
          onClick={() => change(page + 1)}
          className={stepClass}
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </nav>
  );
};
