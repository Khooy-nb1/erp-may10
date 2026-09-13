import React from 'react';
import { cn } from '../../lib/cn.js';
import { controlBorderClass, controlClass, statusTextClass, type FieldStatus } from './Input.js';

export interface TextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  status?: FieldStatus;
  disabled?: boolean;
  className?: string;
}

/** Labelled multi-line text control. */
export const Textarea: React.FC<TextareaProps> = ({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  status,
  disabled = false,
  className,
}) => {
  const id = React.useId();
  const messageId = `${id}-message`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={status?.type === 'error' || undefined}
        aria-describedby={status?.message ? messageId : undefined}
        className={cn(controlClass, 'py-2', controlBorderClass(status))}
      />
      {status?.message ? (
        <p id={messageId} className={cn('text-sm', statusTextClass(status))}>
          {status.message}
        </p>
      ) : null}
    </div>
  );
};
