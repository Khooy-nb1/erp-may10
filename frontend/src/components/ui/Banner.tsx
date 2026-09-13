import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const bannerVariants = cva('flex flex-wrap items-start gap-3 rounded-card border p-4', {
  variants: {
    status: {
      error: 'border-danger/30 bg-danger-soft text-danger-strong',
      warning: 'border-warning/30 bg-warning-soft text-warning-strong',
      success: 'border-success/30 bg-success-soft text-success-strong',
      info: 'border-info/30 bg-info-soft text-info-strong',
    },
  },
  defaultVariants: {
    status: 'info',
  },
});

const STATUS_ICON = {
  error: CircleAlert,
  warning: TriangleAlert,
  success: CircleCheck,
  info: Info,
} as const;

export interface BannerProps extends VariantProps<typeof bannerVariants> {
  title: string;
  description?: string;
  /** Body content for banners that need more than a one-line description. */
  children?: React.ReactNode;
  /** Trailing slot for a banner-level action. */
  endContent?: React.ReactNode;
  className?: string;
}

/** Inline status message; errors announce themselves to assistive tech. */
export const Banner: React.FC<BannerProps> = ({
  status = 'info',
  title,
  description,
  children,
  endContent,
  className,
}) => {
  const Icon = STATUS_ICON[status ?? 'info'];

  return (
    <div
      role={status === 'error' ? 'alert' : undefined}
      className={cn(bannerVariants({ status }), className)}
    >
      <Icon size={18} aria-hidden className="mt-0.5 shrink-0" />
      <div className="flex min-w-[12rem] flex-1 flex-col gap-0.5">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="text-sm text-foreground/80">{description}</p> : null}
        {children ? <div className="text-sm text-foreground/80">{children}</div> : null}
      </div>
      {endContent ? <div className="flex items-center gap-2">{endContent}</div> : null}
    </div>
  );
};
