import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { useReturnFocus } from '../../lib/useReturnFocus.js';

export interface DialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Accessible name, rendered as the dialog heading. */
  title: string;
  description?: string;
  /**
   * Dismissal policy carried over from the previous dialog: `info` closes on
   * Escape and backdrop click, `form` on Escape only, `required` on neither.
   */
  purpose?: 'info' | 'form' | 'required';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/** Modal dialog with focus trap, scroll lock and Escape handling. */
export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  purpose = 'info',
  children,
  footer,
  className,
}) => {
  const { onCloseAutoFocus } = useReturnFocus(isOpen);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40" />
        <DialogPrimitive.Content
          onCloseAutoFocus={onCloseAutoFocus}
          onEscapeKeyDown={(event) => {
            if (purpose === 'required') event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (purpose !== 'info') event.preventDefault();
          }}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card border border-border bg-surface p-5 shadow-raised',
            className
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Đóng"
              className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-subtle-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <X size={16} aria-hidden />
            </DialogPrimitive.Close>
          </div>
          {description ? (
            <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
          ) : null}
          <div className="mt-4">{children}</div>
          {footer ? <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
