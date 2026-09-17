import { Button } from './Button.jsx';
import { Dialog } from './Dialog.jsx';
import { Textarea } from './Textarea.jsx';

/**
 * Modal that collects a free-text reason before an action runs — cancelling an
 * order, reporting a failed delivery. The primary action stays disabled until
 * the reason has non-whitespace content, as both call sites already required.
 *
 * Props (PH1 `ReasonDialogProps`): isOpen, onOpenChange, title, label, value,
 * onChange, placeholder, submitLabel, actionVariant, isSubmitting, onSubmit.
 */
export const ReasonDialog = ({
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
