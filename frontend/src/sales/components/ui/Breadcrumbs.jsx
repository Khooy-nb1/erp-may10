import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn.js';

/** Page trail; the final entry is the current page and is not a link. */
export function Breadcrumbs({ items, className }) {
  return (
    <nav
      aria-label="Đường dẫn"
      className={cn('flex flex-wrap items-center gap-1.5 text-sm', className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 ? (
              <span aria-hidden className="text-slate-400">
                /
              </span>
            ) : null}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="text-brand-secondary transition-colors hover:text-brand-primary"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current={isLast ? 'page' : undefined} className="text-brand-text">
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
