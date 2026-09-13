import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn.js';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'border-border bg-surface-muted text-muted-foreground',
        info: 'border-info/30 bg-info-soft text-info-strong',
        success: 'border-success/30 bg-success-soft text-success-strong',
        warning: 'border-warning/30 bg-warning-soft text-warning-strong',
        error: 'border-danger/30 bg-danger-soft text-danger-strong',
        purple: 'border-purple-200 bg-purple-50 text-purple-700',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children?: React.ReactNode;
}

/** Status pill. Colour never carries the meaning alone — the label does. */
export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', className, children }) => (
  <span className={cn(badgeVariants({ variant }), className)}>{children}</span>
);
