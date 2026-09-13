import React from 'react';
import { cn } from '../../lib/cn.js';

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Labelled native checkbox. */
export const Checkbox: React.FC<CheckboxProps> = ({
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
        className="h-4 w-4 rounded border-border-strong accent-primary"
      />
      <label htmlFor={id} className="text-sm text-foreground">
        {label}
      </label>
    </div>
  );
};
