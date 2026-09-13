import React from 'react';
import { cn } from '../../lib/cn.js';

export interface FieldStatus {
  type: 'error' | 'warning';
  message?: string;
}

export interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  status?: FieldStatus;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
}

/** Border colour shared by every text-like control so status reads the same everywhere. */
export function controlBorderClass(status?: FieldStatus): string {
  if (status?.type === 'error') return 'border-danger';
  if (status?.type === 'warning') return 'border-warning';
  return 'border-border-strong';
}

/** Message colour for the field-level status text. */
export function statusTextClass(status?: FieldStatus): string {
  return status?.type === 'warning' ? 'text-warning-strong' : 'text-danger-strong';
}

export const controlClass =
  'w-full rounded-control border bg-surface px-3 text-sm text-foreground placeholder:text-subtle-foreground disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground';

/** Labelled single-line text control with error/warning status text. */
export const Input: React.FC<InputProps> = ({
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
      <label htmlFor={id} className="text-sm font-medium text-foreground">
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
        <p id={messageId} className={cn('text-sm', statusTextClass(status))}>
          {status.message}
        </p>
      ) : null}
    </div>
  );
};
