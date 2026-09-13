import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { controlBorderClass, controlClass, statusTextClass, type FieldStatus } from './Input.js';

/**
 * vi-VN reading of a number draft. `,` is the decimal separator and `.` groups
 * thousands, so `1,5` is one and a half while `1.000` is a thousand. A full
 * stop is only grouping when it is followed by exactly three digits and every
 * group ahead of it fits — `1.2345` stays a decimal point, as in Astryx.
 */
export function parseNumberDraft(raw: string): number | null {
  const cleaned = raw.trim().replace(/[\s\u00A0\u202F]/g, '');
  if (cleaned === '' || !/^[+-]?[0-9.,]+$/.test(cleaned)) return null;

  const unsigned = cleaned.startsWith('-') ? cleaned.slice(1) : cleaned;
  const isGrouped = /^\d{1,3}(\.\d{3})+$/.test(unsigned);
  const lastComma = unsigned.lastIndexOf(',');
  const lastDot = unsigned.lastIndexOf('.');

  let integerText = unsigned;
  let fractionText = '';
  if (lastComma > lastDot) {
    integerText = unsigned.slice(0, lastComma);
    fractionText = unsigned.slice(lastComma + 1);
  } else if (lastDot >= 0 && !(isGrouped && unsigned.length - lastDot - 1 === 3)) {
    integerText = unsigned.slice(0, lastDot);
    fractionText = unsigned.slice(lastDot + 1);
  }

  const digits = integerText.replace(/\./g, '');
  if (digits !== '' && !/^\d+$/.test(digits)) return null;
  if (fractionText !== '' && !/^\d+$/.test(fractionText)) return null;
  if (digits === '' && fractionText === '') return null;

  const magnitude = Number(`${digits || '0'}.${fractionText || '0'}`);
  if (!Number.isFinite(magnitude)) return null;
  return cleaned.startsWith('-') ? -magnitude : magnitude;
}

/** Digits as the field shows them: `,` for the decimal separator, no grouping. */
function formatDraft(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value).replace('.', ',');
}

export interface NumberInputBaseProps {
  label: string;
  value: number | null | undefined;
  min?: number;
  max?: number;
  placeholder?: string;
  description?: string;
  status?: FieldStatus;
  disabled?: boolean;
  /** Keeps the label for assistive tech only, for fields inside a labelled table cell. */
  isLabelHidden?: boolean;
  className?: string;
}

interface ClearableNumberInputProps extends NumberInputBaseProps {
  hasClear: true;
  /** Receives `null` when the field is cleared, unless `onClear` takes over. */
  onChange: (value: number | null) => void;
  /** Optional override so the caller decides what a cleared field holds. */
  onClear?: () => void;
}

interface PlainNumberInputProps extends NumberInputBaseProps {
  hasClear?: false;
  onChange: (value: number) => void;
}

export type NumberInputProps = ClearableNumberInputProps | PlainNumberInputProps;

/**
 * Numeric field with a typed draft: keystrokes emit a valid in-range number,
 * out-of-range and unreadable drafts stay editable and resolve on blur (clamp)
 * or revert to the last committed value. Clearing empties the field and emits
 * `null`, matching the previous control's contract.
 */
export const NumberInput: React.FC<NumberInputProps> = (props) => {
  const { label, value, min, max, placeholder, description, status, disabled = false, isLabelHidden = false, className } = props;
  const [draft, setDraft] = useState(() => formatDraft(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) setDraft(formatDraft(value));
  }, [value, isEditing]);

  const id = React.useId();
  const messageId = `${id}-message`;
  const descriptionId = `${id}-description`;
  const hasMessage = Boolean(status?.message);
  const describedBy = [hasMessage ? messageId : null, description ? descriptionId : null]
    .filter(Boolean)
    .join(' ');

  const emit = (next: number | null) => {
    if (props.hasClear === true) props.onChange(next);
    else if (next !== null) props.onChange(next);
  };

  const commit = () => {
    setIsEditing(false);
    const trimmed = draft.trim();
    if (trimmed === '') {
      if (props.hasClear === true) {
        emit(null);
        setDraft('');
      } else {
        setDraft(formatDraft(value));
      }
      return;
    }
    const parsed = parseNumberDraft(trimmed);
    if (parsed === null) {
      setDraft(formatDraft(value));
      return;
    }
    const bounded = Math.max(
      min ?? Number.NEGATIVE_INFINITY,
      Math.min(parsed, max ?? Number.POSITIVE_INFINITY)
    );
    setDraft(formatDraft(bounded));
    if (bounded !== value) emit(bounded);
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-sm font-medium text-foreground', isLabelHidden ? 'sr-only' : undefined)}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={status?.type === 'error' || undefined}
          aria-describedby={describedBy || undefined}
          onFocus={() => setIsEditing(true)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
          }}
          onChange={(event) => {
            const raw = event.target.value;
            setDraft(raw);
            const trimmed = raw.trim();
            if (trimmed === '') {
              if (props.hasClear === true) emit(null);
              return;
            }
            const parsed = parseNumberDraft(trimmed);
            if (parsed === null) return;
            if (min !== undefined && parsed < min) return;
            if (max !== undefined && parsed > max) return;
            emit(parsed);
          }}
          className={cn(
            controlClass,
            'h-10',
            controlBorderClass(status),
            props.hasClear === true && value !== null && value !== undefined && !disabled ? 'pr-9' : undefined
          )}
        />
        {props.hasClear === true && value !== null && value !== undefined && !disabled ? (
          <button
            type="button"
            aria-label={`Xóa ${label}`}
            onClick={() => {
              if (props.onClear) props.onClear();
              else emit(null);
              setDraft('');
            }}
            className="absolute inset-y-0 right-2 my-auto flex h-6 w-6 items-center justify-center rounded-full text-subtle-foreground hover:bg-surface-muted hover:text-foreground"
          >
            <X size={14} aria-hidden />
          </button>
        ) : null}
      </div>
      {hasMessage ? (
        <p id={messageId} className={cn('text-sm', statusTextClass(status))}>
          {status?.message}
        </p>
      ) : null}
      {description ? (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
};
