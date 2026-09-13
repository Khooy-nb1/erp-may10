import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn.js';

const barVariants = cva(
  'h-2 w-full appearance-none overflow-hidden rounded-full bg-surface-muted [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-surface-muted [&::-webkit-progress-value]:rounded-full',
  {
    variants: {
      variant: {
        primary: '[&::-moz-progress-bar]:bg-primary [&::-webkit-progress-value]:bg-primary',
        success: '[&::-moz-progress-bar]:bg-success [&::-webkit-progress-value]:bg-success',
        warning: '[&::-moz-progress-bar]:bg-warning [&::-webkit-progress-value]:bg-warning',
        danger: '[&::-moz-progress-bar]:bg-danger [&::-webkit-progress-value]:bg-danger',
        neutral:
          '[&::-moz-progress-bar]:bg-border-strong [&::-webkit-progress-value]:bg-border-strong',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
);

export interface ProgressBarProps extends VariantProps<typeof barVariants> {
  label: string;
  value: number;
  max?: number;
  /** Keeps the label for assistive tech only, for bars inside their own caption. */
  isLabelHidden?: boolean;
  className?: string;
}

/** Bounded progress bar; the native element carries the ARIA value semantics. */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  value,
  max = 100,
  variant = 'primary',
  isLabelHidden = false,
  className,
}) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    <span className={cn('text-sm text-muted-foreground', isLabelHidden ? 'sr-only' : undefined)}>
      {label}
    </span>
    <progress aria-label={label} value={value} max={max} className={barVariants({ variant })} />
  </div>
);
