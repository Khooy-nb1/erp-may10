import React from 'react';
import { cn } from '../../lib/cn.js';
import { controlBorderClass, controlClass, statusTextClass } from './Input.jsx';

/**
 * Calendar date as `YYYY-MM-DD`, the format the API and the native control share
 * (PH1 `ISODateString` is a plain string alias, so it needs no runtime shape).
 */

/**
 * Labelled native date control; the platform supplies the picker.
 *
 * Props (PH1 `DateInputProps`): label, value, onChange, description, min, max,
 * status, disabled, className.
 */
export const DateInput = ({
  label,
  value,
  onChange,
  description,
  min,
  max,
  status,
  disabled = false,
  className,
}) => {
  const id = React.useId();
  const messageId = `${id}-message`;
  const descriptionId = `${id}-description`;
  const hasMessage = Boolean(status?.message);
  const describedBy = [hasMessage ? messageId : null, description ? descriptionId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-brand-text">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value ?? ''}
        min={min}
        max={max}
        disabled={disabled}
        aria-invalid={status?.type === 'error' || undefined}
        aria-describedby={describedBy || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(controlClass, 'h-10', controlBorderClass(status))}
      />
      {hasMessage ? (
        <p id={messageId} className={cn('text-sm', statusTextClass(status))}>
          {status?.message}
        </p>
      ) : null}
      {description ? (
        <p id={descriptionId} className="text-sm text-brand-secondary">
          {description}
        </p>
      ) : null}
    </div>
  );
};
