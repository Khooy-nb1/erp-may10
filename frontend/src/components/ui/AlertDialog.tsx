import React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { Button } from './Button.js';
import { useReturnFocus } from '../../lib/useReturnFocus.js';

export interface AlertDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description?: string;
  actionLabel: string;
  cancelLabel: string;
  onAction: () => void;
  isActionLoading?: boolean;
  actionVariant?: 'primary' | 'destructive';
}

/**
 * Confirmation prompt. Confirming does not close the dialog: the caller owns
 * the outcome and closes it when the work settles, so a failed request can
 * report back in place.
 */
export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  actionLabel,
  cancelLabel,
  onAction,
  isActionLoading = false,
  actionVariant = 'primary',
}) => {
  const { onCloseAutoFocus } = useReturnFocus(isOpen);

  return (
    <AlertDialogPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40" />
        <AlertDialogPrimitive.Content
          onCloseAutoFocus={onCloseAutoFocus}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card border border-border bg-surface p-5 shadow-raised"
        >
          <AlertDialogPrimitive.Title className="text-lg font-semibold text-foreground">
            {title}
          </AlertDialogPrimitive.Title>
          {description ? (
            <AlertDialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
              {description}
            </AlertDialogPrimitive.Description>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="secondary" disabled={isActionLoading}>
                {cancelLabel}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
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
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
};
