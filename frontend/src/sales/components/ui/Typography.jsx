import React from 'react';
import { cn } from '../../lib/cn.js';

const TEXT_VARIANTS = {
  body: 'text-sm leading-6',
  supporting: 'text-sm leading-5 text-brand-secondary',
  label: 'text-sm font-medium leading-5',
  large: 'text-lg leading-7',
  code: 'font-mono text-sm',
};

/**
 * The one place the type scale is defined. Weight, colour and numeric
 * alignment are ordinary utilities on `className`.
 *
 * `as` is the rendered element; it defaults to `span` so text can drop into any
 * layout (PH1 typed it `React.ElementType`).
 */
export function Text({ variant = 'body', as, className, children }) {
  const Component = as ?? 'span';
  return (
    <Component className={cn(TEXT_VARIANTS[variant] ?? TEXT_VARIANTS.body, className)}>
      {children}
    </Component>
  );
}

const HEADING_VARIANTS = {
  1: 'text-2xl leading-8',
  2: 'text-xl leading-7',
  3: 'text-base leading-6',
};

const HEADING_ELEMENT = { 1: 'h1', 2: 'h2', 3: 'h3' };

/** Section heading; `level` picks both the element and the size. */
export function Heading({ level = 2, className, children }) {
  const Component = HEADING_ELEMENT[level];
  return (
    <Component className={cn('font-semibold text-brand-text', HEADING_VARIANTS[level], className)}>
      {children}
    </Component>
  );
}
