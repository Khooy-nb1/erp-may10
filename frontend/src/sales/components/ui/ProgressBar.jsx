import React from 'react';
import { cn } from '../../lib/cn.js';

/** Variant map ported from PH1's `cva('h-2 w-full appearance-none …', …)`. */
const BAR_VARIANTS = {
  primary: '[&::-moz-progress-bar]:bg-brand-primary [&::-webkit-progress-value]:bg-brand-primary',
  success: '[&::-moz-progress-bar]:bg-emerald-600 [&::-webkit-progress-value]:bg-emerald-600',
  warning: '[&::-moz-progress-bar]:bg-amber-500 [&::-webkit-progress-value]:bg-amber-500',
  danger: '[&::-moz-progress-bar]:bg-rose-600 [&::-webkit-progress-value]:bg-rose-600',
  neutral: '[&::-moz-progress-bar]:bg-slate-300 [&::-webkit-progress-value]:bg-slate-300',
};

/** Bounded progress bar; the native element carries the ARIA value semantics. */
export function ProgressBar({
  label,
  value,
  max = 100,
  variant = 'primary',
  isLabelHidden = false,
  className,
}) {
  const currentValue = Math.min(Math.max(value, 0), max);
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className={cn('text-sm text-brand-secondary', isLabelHidden ? 'sr-only' : undefined)}>
        {label}
      </span>
      <progress
        role="progressbar"
        aria-label={label}
        aria-valuenow={currentValue}
        aria-valuemin={0}
        aria-valuemax={max}
        value={value}
        max={max}
        className={cn(
          'h-2 w-full appearance-none overflow-hidden rounded-full bg-slate-50',
          '[&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:rounded-full',
          '[&::-webkit-progress-bar]:bg-slate-50 [&::-webkit-progress-value]:rounded-full',
          BAR_VARIANTS[variant] ?? BAR_VARIANTS.primary
        )}
      />
    </div>
  );
}
