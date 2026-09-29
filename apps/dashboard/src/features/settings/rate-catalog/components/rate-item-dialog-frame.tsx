'use client';

import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldGroup,
  Spinner,
} from '@inbox-triage/ui';
import type { FormEventHandler, ReactNode, Ref } from 'react';

type RateItemDialogFrameProps = {
  formRef: Ref<HTMLFormElement>;
  open: boolean;
  pending: boolean;
  title: string;
  description: string;
  submitLabel: string;
  failure: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
};

export function RateItemDialogFrame({
  formRef,
  open,
  pending,
  title,
  description,
  submitLabel,
  failure,
  onOpenChange,
  onSubmit,
  children,
}: RateItemDialogFrameProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (!nextOpen && pending) details.cancel();
        else onOpenChange(nextOpen);
      }}
    >
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>

          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form ref={formRef} noValidate autoComplete="off" onSubmit={onSubmit}>
          <FieldGroup>
            {failure ? (
              <Alert variant="destructive">
                <AlertDescription>{failure}</AlertDescription>
              </Alert>
            ) : null}

            {children}

            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline" disabled={pending} />
                }
              >
                Cancel
              </DialogClose>

              <Button type="submit" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}

                {submitLabel}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
