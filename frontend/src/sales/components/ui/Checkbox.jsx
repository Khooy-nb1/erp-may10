import React from 'react';
import { cn } from '../../lib/cn.js';

/**
 * Labelled native checkbox.
 *
 * Props (PH1 `CheckboxProps`): label, checked, onChange, disabled, className.
 */
export const Checkbox = ({
  label,
  checked,
  onChange,
  disabled = false,
  className,
}) => {
  const id = React.useId();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 accent-brand-primary"
      />
      <label htmlFor={id} className="text-sm text-brand-text">
        {label}
      </label>
    </div>
  );
};
