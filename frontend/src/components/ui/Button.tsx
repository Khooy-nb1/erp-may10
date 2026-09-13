import React from 'react';
import { Link } from 'react-router-dom';
import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'border border-border bg-surface text-foreground hover:bg-surface-muted',
        destructive: 'bg-danger text-white hover:bg-danger-strong',
        ghost: 'text-foreground hover:bg-surface-muted',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  }
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  variant?: ButtonVariantProps['variant'];
  size?: ButtonVariantProps['size'];
  /** Decorative leading icon; hidden from assistive tech. */
  icon?: React.ReactNode;
  /** Renders a router link instead of a button. */
  href?: string;
  /** Shows a spinner and marks the control busy without hiding the label. */
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * The app's single button. `href` renders a react-router `Link` so in-app
 * navigation stays client-side, exactly as the Astryx LinkProvider did.
 */
export const Button: React.FC<ButtonProps> = ({
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
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement> | undefined}
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
