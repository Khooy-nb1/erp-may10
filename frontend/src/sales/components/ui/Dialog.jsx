import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './IconButton.jsx';
import { cn } from '../../lib/cn.js';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const isVisible = (element) => element.getClientRects().length > 0;

/**
 * Modal dialog with focus trap, scroll lock and Escape handling.
 *
 * PH1 delegated all of that to `@radix-ui/react-dialog`; with no new dependency
 * allowed the same behaviour is hand-rolled here: render through a portal into
 * `document.body`, lock background scroll while open, move focus into the panel
 * on open, cycle Tab inside it, restore focus to the opener on close. The
 * dismissal policy is unchanged - `info` closes on Escape and backdrop,
 * `form` on Escape only, `required` on neither.
 *
 * Props (PH1 `DialogProps`): isOpen (alias `open`), onOpenChange, title,
 * description, purpose, children, footer, className.
 */
export const Dialog = ({
  isOpen,
  open,
  onOpenChange,
  title,
  description,
  purpose = 'info',
  children,
  footer,
  className,
}) => {
  const active = isOpen ?? open ?? false;
  const panelRef = useRef(null);
  const openerRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  // Scroll lock, focus hand-off into the panel, and focus restore on close. The
  // opener is captured before focus moves, so it survives StrictMode's second
  // effect run (the PH1 `useReturnFocus` problem).
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

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        if (purpose === 'required') return;
        event.preventDefault();
        onOpenChange(false);
        return;
      }
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
    },
    [purpose, onOpenChange]
  );

  useEffect(() => {
    if (!active) return undefined;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, handleKeyDown]);

  if (!active) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-brand-text/40"
        onPointerDown={() => {
          if (purpose === 'info') onOpenChange(false);
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-brand-border bg-white p-5 shadow-md',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-brand-text">
            {title}
          </h2>
          <IconButton
            label="Đóng"
            icon={<X size={16} aria-hidden />}
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="-mr-1 -mt-1 rounded-full text-slate-400 hover:text-brand-text"
          />
        </div>
        {description ? (
          <p id={descriptionId} className="mt-1 text-sm text-brand-secondary">
            {description}
          </p>
        ) : null}
        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </>,
    document.body
  );
};
