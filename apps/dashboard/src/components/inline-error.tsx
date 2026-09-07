import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@inbox-triage/ui';
import type { ReactNode } from 'react';

export type InlineErrorProps = {
  title: string;
  description: string;
  retryAction?: ReactNode;
};

export function InlineError({
  title,
  description,
  retryAction,
}: InlineErrorProps) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>

      <AlertDescription>{description}</AlertDescription>

      {retryAction ? <AlertAction>{retryAction}</AlertAction> : null}
    </Alert>
  );
}
