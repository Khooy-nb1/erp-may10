import React from 'react';
import { buttonVariants } from './Button.jsx';
import { cn } from '../../lib/cn.js';

const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-11 w-11',
};

/**
 * Square, icon-only button. `label` is required so it never ships unnamed.
 *
 * PH1 (React 19) declared `ref` as a regular prop and forwarded it explicitly.
 * Core runs React 18, where a plain `ref` prop on a function component is
 * dropped with a warning, so the port uses `React.forwardRef` — the call site
 * (`<IconButton ref={...} />`) and every other prop name/default stay identical.
 *
 * Props (PH1 `IconButtonProps`): label, icon, variant, size, className,
 * ref, plus every native button attribute except
 * `className`/`children`/`aria-label`.
 */
export const IconButton = React.forwardRef(function IconButton(
  {
    label,
    icon,
    variant = 'ghost',
    size = 'md',
    className,
    type = 'button',
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(buttonVariants({ variant, size: 'icon' }), 'p-0', SIZE_CLASSES[size], className)}
      {...rest}
    >
      {icon}
    </button>
  );
});
