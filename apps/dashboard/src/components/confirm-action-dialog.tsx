'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@inbox-triage/ui';
import {
  isValidElement,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

export type ConfirmActionDialogProps = {
  title: string;
  description: string;
  actionLabel: string;
  cancelLabel: string;
  onConfirm: () => void | Promise<void>;
  /** Defaults to `destructive`. Use `default` for irreversible, non-destructive actions. */
  actionVariant?: 'default' | 'destructive';
  /** Details to check before confirming, shown below the description. */
  children?: ReactNode;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ConfirmActionDialog({
  title,
  description,
  actionLabel,
  cancelLabel,
  onConfirm,
  actionVariant = 'destructive',
  children,
  trigger,
  open,
  onOpenChange,
}: ConfirmActionDialogProps) {
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [pending, setPending] = useState(false);
  // Sync lock: `pending` is too late for double-clicks and close-during-confirm.
  const pendingRef = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isOpen = isControlled ? open : uncontrolledOpen;

  function setOpenState(nextOpen: boolean) {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  }

  function handleOpenChange(
    nextOpen: boolean,
    eventDetails: { cancel: () => void },
  ) {
    if (!nextOpen && pendingRef.current) {
      eventDetails.cancel();
      return;
    }

    setOpenState(nextOpen);
  }

  async function handleConfirm() {
    if (pendingRef.current) {
      return;
    }

    pendingRef.current = true;
    setPending(true);

    try {
      await onConfirm();
      pendingRef.current = false;
      setPending(false);
      setOpenState(false);
    } catch {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        isValidElement(trigger) ? (
          <AlertDialogTrigger render={trigger as ReactElement} />
        ) : (
          <AlertDialogTrigger>{trigger}</AlertDialogTrigger>
        )
      ) : null}

      <AlertDialogContent initialFocus={cancelRef}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>

          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {children}

        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef} disabled={pending}>
            {cancelLabel}
          </AlertDialogCancel>

          <AlertDialogAction
            type="button"
            variant={actionVariant}
            disabled={pending}
            onClick={() => {
              void handleConfirm();
            }}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
