import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn.js';

/** Router link with the product's one inline-link style. */
export function TextLink({ to, weight, className, children, ...rest }) {
  return (
    <Link
      to={to}
      className={cn(
        'text-brand-primary underline-offset-4 hover:underline',
        weight === 'medium' ? 'font-medium' : undefined,
        weight === 'semibold' ? 'font-semibold' : undefined,
        className
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
