import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button.jsx';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const isVisible = (element) => element.getClientRects().length > 0;

/**
 * Confirmation prompt. Confirming does not close the dialog: the caller owns
 * the outcome and closes it when the work settles, so a failed request can
 * report back in place.
 *
 * PH1 used `@radix-ui/react-alert-dialog`, which is stricter than the plain
 * dialog: Escape and backdrop clicks are both ignored, so the only ways out are
 * the cancel button or the caller closing it. That contract is kept here, with
 * the portal, focus trap, scroll lock and focus restore hand-rolled.
 *
 * Props (PH1 `AlertDialogProps`): isOpen (alias `open`), onOpenChange, title,
 * description, actionLabel, cancelLabel, onAction, isActionLoading,
 * actionVariant.
 */
export const AlertDialog = ({
  isOpen,
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  cancelLabel,
  onAction,
  isActionLoading = false,
  actionVariant = 'primary',
}) => {
  const active = isOpen ?? open ?? false;
  const panelRef = useRef(null);
  const openerRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  // Scroll lock, focus hand-off into the panel, and focus restore on close.
  // Escape is not wired up at all: PH1's AlertDialog had no keyboard dismissal.
  useEffect(() => {
    if (!active) return undefined;
    const opener = document.activeElement;
    if (opener instanceof HTMLElement && !opener.closest('[role="dialog"], [role="alertdialog"]')) {
      openerRef.current = opener;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    if (panel) {
      const first = panel.querySelector(FOCUSABLE_SELECTOR);
      (first ?? panel).focus();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      const target = openerRef.current;
      openerRef.current = null;
      if (target && document.body.contains(target) && !target.hasAttribute('disabled')) {
        target.focus();
      }
    };
  }, [active]);

  // Tab stays inside the panel, as Radix's focus trap did.
  useEffect(() => {
    if (!active) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isVisible);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const outside = !panel.contains(current);
      if (event.shiftKey && (outside || current === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || current === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  if (!active) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-brand-text/40" />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-brand-border bg-white p-5 shadow-md"
      >
        <h2 id={titleId} className="text-lg font-semibold text-brand-text">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-1 text-sm text-brand-secondary">
            {description}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={isActionLoading} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={actionVariant}
            loading={isActionLoading}
            onClick={(event) => {
              event.preventDefault();
              onAction();
            }}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
};
