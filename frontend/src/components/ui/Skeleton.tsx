import React from 'react';
import { cn } from '../../lib/cn.js';

export interface SkeletonProps {
  className?: string;
}

/** Placeholder block shown while a data region loads. */
export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div aria-hidden className={cn('animate-pulse rounded-control bg-surface-muted', className)} />
);
