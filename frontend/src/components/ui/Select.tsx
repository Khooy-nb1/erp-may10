import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { controlBorderClass, controlClass, statusTextClass, type FieldStatus } from './Input.js';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  /** Empty string is a legitimate selection — every filter uses it for "Tất cả …". */
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Shown when the field holds no value and no option covers the empty value. */
  placeholder?: string;
  status?: FieldStatus;
  disabled?: boolean;
  className?: string;
}

/**
 * Native select styled to match the other controls. A native element keeps the
 * empty-string option semantics the filter bars rely on and gives phones their
 * own picker for free.
 */
export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  status,
  disabled = false,
  className,
}) => {
  const id = React.useId();
  const messageId = `${id}-message`;
  const showsPlaceholder = placeholder !== undefined && !options.some((option) => option.value === '');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-invalid={status?.type === 'error' || undefined}
          aria-describedby={status?.message ? messageId : undefined}
          className={cn(
            controlClass,
            'h-10 appearance-none pr-9',
            controlBorderClass(status),
            value === undefined || value === '' ? 'text-subtle-foreground' : undefined
          )}
        >
          {showsPlaceholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-foreground">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 my-auto text-subtle-foreground"
        />
      </div>
      {status?.message ? (
        <p id={messageId} className={cn('text-sm', statusTextClass(status))}>
          {status.message}
        </p>
      ) : null}
    </div>
  );
};
