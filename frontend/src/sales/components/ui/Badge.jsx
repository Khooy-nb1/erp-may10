import React from 'react';
import { cn } from '../../lib/cn.js';

/** Variant map ported from PH1's `cva('inline-flex items-center rounded-full border …', …)`. */
const BADGE_VARIANTS = {
  neutral: 'border-brand-border bg-slate-50 text-brand-secondary',
  info: 'border-sky-600/30 bg-sky-50 text-sky-700',
  success: 'border-emerald-600/30 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-500/30 bg-amber-50 text-amber-700',
  error: 'border-rose-600/30 bg-rose-50 text-rose-700',
  purple: 'border-violet-600/30 bg-violet-50 text-violet-700',
};

/** Status pill. Colour never carries the meaning alone — the label does. */
export function Badge({ variant = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        BADGE_VARIANTS[variant] ?? BADGE_VARIANTS.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}
