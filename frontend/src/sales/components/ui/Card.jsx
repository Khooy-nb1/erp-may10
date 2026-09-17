import React from 'react';
import { cn } from '../../lib/cn.js';

/** Variant map ported from PH1's `cva('rounded-card border shadow-card', …)`. */
const CARD_VARIANTS = {
  default: 'border-brand-border bg-white',
  muted: 'border-brand-border bg-slate-50',
  blue: 'border-sky-600/30 bg-sky-50',
  green: 'border-emerald-600/30 bg-emerald-50',
  red: 'border-rose-600/30 bg-rose-50',
};

/** Bordered, near-flat surface. Padding stays a caller-supplied class. */
export function Card({ variant = 'default', className, children }) {
  return (
    <div
      className={cn(
        'rounded-2xl border shadow-sm',
        CARD_VARIANTS[variant] ?? CARD_VARIANTS.default,
        'p-5',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>;
}

export function CardBody({ className, children }) {
  return <div className={cn('flex flex-col gap-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>;
}
