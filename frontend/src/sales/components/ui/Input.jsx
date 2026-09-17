import React from 'react';
import { cn } from '../../lib/cn.js';

/**
 * Field status shape (PH1 `FieldStatus` interface):
 * `{ type: 'error' | 'warning', message?: string }`.
 */

/** Border colour shared by every text-like control so status reads the same everywhere. */
export function controlBorderClass(status) {
  if (status?.type === 'error') return 'border-rose-600';
  if (status?.type === 'warning') return 'border-amber-500';
  return 'border-slate-300';
}

/** Message colour for the field-level status text. */
export function statusTextClass(status) {
  return status?.type === 'warning' ? 'text-amber-700' : 'text-rose-700';
}

export const controlClass =
  'w-full rounded-xl border bg-white px-3 text-sm text-brand-text placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-brand-secondary';

/**
 * Labelled single-line text control with error/warning status text.
 *
 * Props (PH1 `InputProps`): label, value, onChange, placeholder, type, status,
 * disabled, autoComplete, className.
 */
export const Input = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  status,
  disabled = false,
  autoComplete,
  className,
}) => {
  const id = React.useId();
  const messageId = `${id}-message`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-brand-text">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={status?.type === 'error' || undefined}
        aria-describedby={status?.message ? messageId : undefined}
        className={cn(controlClass, 'h-10', controlBorderClass(status))}
      />
      {status?.message ? (
        <p
          id={messageId}
          role={status.type === 'error' ? 'alert' : 'status'}
          aria-live={status.type === 'error' ? 'assertive' : 'polite'}
          className={cn('text-sm', statusTextClass(status))}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
};
