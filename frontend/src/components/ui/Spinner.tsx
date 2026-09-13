import React from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const SIZE_PX = {
  sm: 16,
  md: 24,
  lg: 32,
} as const;

export interface SpinnerProps {
  /** Text announced to assistive tech while the spinner is on screen. */
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Indeterminate progress indicator with a polite live region. */
export const Spinner: React.FC<SpinnerProps> = ({ label = 'Đang tải dữ liệu...', size = 'md', className }) => (
  <span role="status" className={cn('inline-flex items-center justify-center', className)}>
    <LoaderCircle size={SIZE_PX[size]} aria-hidden className="animate-spin text-primary" />
    <span className="sr-only">{label}</span>
  </span>
);
