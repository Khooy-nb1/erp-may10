import React from 'react';
import { Button } from './Button.js';
import { Dialog } from './Dialog.js';
import { Textarea } from './Textarea.js';

export interface ReasonDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Field label for the reason input. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  submitLabel: string;
  actionVariant?: 'primary' | 'destructive';
  isSubmitting?: boolean;
  onSubmit: () => void;
}

/**
 * Modal that collects a free-text reason before an action runs — cancelling an
 * order, reporting a failed delivery. The primary action stays disabled until
 * the reason has non-whitespace content, as both call sites already required.
 */
export const ReasonDialog: React.FC<ReasonDialogProps> = ({
  isOpen,
  onOpenChange,
  title,
  label,
  value,
  onChange,
  placeholder,
  submitLabel,
  actionVariant = 'destructive',
  isSubmitting = false,
  onSubmit,
}) => {
  const footer = (
    <>
      <Button variant="secondary" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
        Hủy
      </Button>
      <Button
        type="button"
        variant={actionVariant}
        disabled={!value.trim() || isSubmitting}
        loading={isSubmitting}
        onClick={onSubmit}
      >
        {submitLabel}
      </Button>
    </>
  );

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" title={title} footer={footer}>
      <Textarea
        label={label}
        value={value}
        onChange={onChange}
        rows={3}
        placeholder={placeholder}
        disabled={isSubmitting}
      />
    </Dialog>
  );
};
