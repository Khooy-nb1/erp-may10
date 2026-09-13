import React from 'react';

/**
 * Restores focus to the element that was focused when a controlled dialog
 * opened. Radix captures the opener while its content mounts; the effects that
 * capture it run twice under StrictMode and the second run sees focus already
 * inside the dialog, which leaves `document.body` focused on close. Tracking
 * the last focused element while the dialog is closed is deterministic.
 */
export const useReturnFocus = (isOpen: boolean) => {
  const openerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      return undefined;
    }
    const capture = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && !target.closest('[role="dialog"], [role="alertdialog"]')) {
        openerRef.current = target;
      }
    };
    document.addEventListener('focusin', capture);
    return () => document.removeEventListener('focusin', capture);
  }, [isOpen]);

  const onCloseAutoFocus = React.useCallback((event: Event) => {
    const opener = openerRef.current;
    if (!opener || !document.body.contains(opener) || opener.hasAttribute('disabled')) {
      return;
    }
    event.preventDefault();
    opener.focus();
  }, []);

  return { onCloseAutoFocus };
};
