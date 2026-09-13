import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn.js';

export interface BreadcrumbEntry {
  label: string;
  to?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbEntry[];
  className?: string;
}

/** Page trail; the final entry is the current page and is not a link. */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => (
  <nav aria-label="Đường dẫn" className={cn('flex flex-wrap items-center gap-1.5 text-sm', className)}>
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <React.Fragment key={`${item.label}-${index}`}>
          {index > 0 ? (
            <span aria-hidden className="text-subtle-foreground">
              /
            </span>
          ) : null}
          {item.to && !isLast ? (
            <Link to={item.to} className="text-muted-foreground transition-colors hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span aria-current={isLast ? 'page' : undefined} className="text-foreground">
              {item.label}
            </span>
          )}
        </React.Fragment>
      );
    })}
  </nav>
);
