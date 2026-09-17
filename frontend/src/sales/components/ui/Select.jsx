import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { controlBorderClass, controlClass, statusTextClass } from './Input.jsx';

/**
 * Option shape (PH1 `SelectOption` interface): `{ value, label }`.
 */

/**
 * Native select styled to match the other controls. A native element keeps the
 * empty-string option semantics the filter bars rely on and gives phones their
 * own picker for free.
 *
 * Props (PH1 `SelectProps`): label, value, onChange, options, placeholder,
 * status, disabled, className.
 */
export const Select = ({
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
      <label htmlFor={id} className="text-sm font-medium text-brand-text">
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
            value === undefined || value === '' ? 'text-slate-400' : undefined
          )}
        >
          {showsPlaceholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-brand-text">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 my-auto text-slate-400"
        />
      </div>
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
