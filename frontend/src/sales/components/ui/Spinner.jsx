import React from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const SIZE_PX = {
  sm: 16,
  md: 24,
  lg: 32,
};

/** Indeterminate progress indicator with a polite live region. */
export function Spinner({ label = 'Đang tải dữ liệu...', size = 'md', className }) {
  return (
    <span role="status" className={cn('inline-flex items-center justify-center', className)}>
      <LoaderCircle size={SIZE_PX[size]} aria-hidden className="animate-spin text-brand-primary" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
