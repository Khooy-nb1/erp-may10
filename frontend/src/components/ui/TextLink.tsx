import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn.js';

export interface TextLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href' | 'style'> {
  /** In-app target. */
  to: string;
  /** Table cells and inline prose weight links differently; both come from here. */
  weight?: 'medium' | 'semibold';
  className?: string;
  children?: React.ReactNode;
}

/** Router link with the product's one inline-link style. */
export const TextLink: React.FC<TextLinkProps> = ({ to, weight, className, children, ...rest }) => (
  <Link
    to={to}
    className={cn(
      'text-primary underline-offset-4 hover:underline',
      weight === 'medium' ? 'font-medium' : undefined,
      weight === 'semibold' ? 'font-semibold' : undefined,
      className
    )}
    {...rest}
  >
    {children}
  </Link>
);
