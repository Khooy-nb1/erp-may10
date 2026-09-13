import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn.js';

const cardVariants = cva('rounded-card border shadow-card', {
  variants: {
    variant: {
      default: 'border-border bg-surface',
      muted: 'border-border bg-surface-muted',
      blue: 'border-info/30 bg-info-soft',
      green: 'border-success/30 bg-success-soft',
      red: 'border-danger/30 bg-danger-soft',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface CardProps extends VariantProps<typeof cardVariants> {
  className?: string;
  children?: React.ReactNode;
}

/** Bordered, near-flat surface. Padding stays a caller-supplied class. */
export const Card: React.FC<CardProps> = ({ variant = 'default', className, children }) => (
  <div className={cn(cardVariants({ variant }), 'p-5', className)}>{children}</div>
);

export const CardHeader: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className,
  children,
}) => <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>;

export const CardBody: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className,
  children,
}) => <div className={cn('flex flex-col gap-4', className)}>{children}</div>;

export const CardFooter: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className,
  children,
}) => <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>;
