import React from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn.js';

/**
 * Hand-rolled stand-in for PH1's `class-variance-authority` variant matrix:
 * same `buttonVariants({ variant, size })` contract, same default variants
 * (`secondary` / `md`) and the same class strings, with PH1's Tailwind v4
 * tokens rewritten onto Core's Tailwind 3.4 brand palette.
 */
const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:pointer-events-none disabled:opacity-50';

const VARIANT_CLASSES = {
  primary: 'bg-brand-primary text-white hover:bg-brand-dark',
  secondary: 'border border-brand-border bg-white text-brand-text hover:bg-slate-50',
  destructive: 'bg-rose-600 text-white hover:bg-rose-700',
  ghost: 'text-brand-text hover:bg-slate-50',
  link: 'text-brand-primary underline-offset-4 hover:underline',
};

const SIZE_CLASSES = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
  icon: 'h-10 w-10',
};

export function buttonVariants({ variant = 'secondary', size = 'md' } = {}) {
  return cn(BASE_CLASSES, VARIANT_CLASSES[variant] ?? '', SIZE_CLASSES[size] ?? '');
}

/**
 * The app's single button. `href` renders a react-router `Link` so in-app
 * navigation stays client-side, exactly as the Astryx LinkProvider did.
 *
 * Props (PH1 `ButtonProps`): variant, size, icon, href, loading, className,
 * children, plus every native button attribute except `className`/`children`.
 */
export const Button = ({
  variant = 'primary',
  size = 'md',
  icon,
  href,
  loading = false,
  disabled = false,
  className,
  children,
  onClick,
  ...rest
}) => {
  const classes = cn(buttonVariants({ variant, size }), className);
  const content = (
    <>
      {loading ? (
        <LoaderCircle size={16} aria-hidden className="animate-spin" />
      ) : (
        icon ?? null
      )}
      {children}
    </>
  );

  if (href !== undefined) {
    return (
      <Link
        to={href}
        className={classes}
        onClick={onClick}
        aria-busy={loading || undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={rest.type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
};
