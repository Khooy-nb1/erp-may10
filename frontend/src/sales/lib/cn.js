import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Conditional class list, then Tailwind-aware dedupe so a component's own
 * utilities can be overridden by a caller-supplied \`className\`.
 * (Ported 1:1 from PH1 \`lib/cn.ts\`; Core ships both dependencies.)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
