import React from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/cn.js';

/** Status map ported from PH1's `cva('flex flex-wrap items-start gap-3 rounded-card border p-4', …)`. */
const BANNER_STATUS = {
  error: 'border-rose-600/30 bg-rose-50 text-rose-700',
  warning: 'border-amber-500/30 bg-amber-50 text-amber-700',
  success: 'border-emerald-600/30 bg-emerald-50 text-emerald-700',
  info: 'border-sky-600/30 bg-sky-50 text-sky-700',
};

const STATUS_ICON = {
  error: CircleAlert,
  warning: TriangleAlert,
  success: CircleCheck,
  info: Info,
};

/** Inline status message; errors announce themselves to assistive tech. */
export function Banner({ status = 'info', title, description, children, endContent, className }) {
  const Icon = STATUS_ICON[status ?? 'info'];

  return (
    <div
      role={status === 'error' ? 'alert' : undefined}
      className={cn(
        'flex flex-wrap items-start gap-3 rounded-2xl border p-4',
        BANNER_STATUS[status ?? 'info'],
        className
      )}
    >
      <Icon size={18} aria-hidden className="mt-0.5 shrink-0" />
      <div className="flex min-w-[12rem] flex-1 flex-col gap-0.5">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="text-sm text-brand-text/80">{description}</p> : null}
        {children ? <div className="text-sm text-brand-text/80">{children}</div> : null}
      </div>
      {endContent ? <div className="flex items-center gap-2">{endContent}</div> : null}
    </div>
  );
}
