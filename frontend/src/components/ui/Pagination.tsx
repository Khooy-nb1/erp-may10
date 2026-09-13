import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { buttonVariants } from './Button.js';

export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onChange: (page: number) => void;
  className?: string;
}

/** Page numbers around the current one, with the first and last always reachable. */
function pageWindow(page: number, totalPages: number): number[] {
  const candidates = [1, totalPages, page - 1, page, page + 1];
  return [...new Set(candidates.filter((candidate) => candidate >= 1 && candidate <= totalPages))].sort(
    (a, b) => a - b
  );
}

/** Server-pagination bar: range caption, page numbers, prev/next. */
export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalItems,
  pageSize = 20,
  onChange,
  className,
}) => {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const pages = pageWindow(page, totalPages);

  const stepClass = cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'w-8 px-0');

  return (
    <nav
      aria-label="Phân trang"
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
    >
      <p className="text-sm text-muted-foreground">
        {from}–{to} trên {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Đến trang trước"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className={stepClass}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        {pages.map((candidate, index) => (
          <React.Fragment key={`${candidate}-${index}`}>
            {index > 0 && candidate - pages[index - 1] > 1 ? (
              <span aria-hidden className="px-1 text-sm text-subtle-foreground">
                …
              </span>
            ) : null}
            <button
              type="button"
              aria-label={`Đến trang ${candidate}`}
              aria-current={candidate === page ? 'page' : undefined}
              onClick={() => onChange(candidate)}
              className={cn(
                buttonVariants({ variant: candidate === page ? 'primary' : 'secondary', size: 'sm' }),
                'w-8 px-0 tabular-nums'
              )}
            >
              {candidate}
            </button>
          </React.Fragment>
        ))}
        <button
          type="button"
          aria-label="Đến trang tiếp theo"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className={stepClass}
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </nav>
  );
};
