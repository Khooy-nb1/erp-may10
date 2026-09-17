import React from 'react';
import { cn } from '../../lib/cn.js';

/** Placeholder block shown while a data region loads. */
export function Skeleton({ className }) {
  return <div aria-hidden className={cn('animate-pulse rounded-xl bg-slate-50', className)} />;
}
