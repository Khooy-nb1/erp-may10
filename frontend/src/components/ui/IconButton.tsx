import React from 'react';
import { buttonVariants } from './Button.js';
import { cn } from '../../lib/cn.js';

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children' | 'aria-label'> {
  /** Accessible name — the button has no visible text. */
  label: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /**
   * Radix `asChild` slots (DialogTrigger) clone the child with their own ref;
   * React 19 delivers it as a regular prop, so it is forwarded explicitly.
   */
  ref?: React.Ref<HTMLButtonElement>;
}

const SIZE_CLASSES: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-11 w-11',
};

/** Square, icon-only button. `label` is required so it never ships unnamed. */
export const IconButton: React.FC<IconButtonProps> = ({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ref,
  ...rest
}) => {
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
};
