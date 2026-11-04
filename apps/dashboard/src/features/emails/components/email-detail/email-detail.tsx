'use client';

import {
  Empty,
  EmptyHeader,
  EmptyDescription,
  Skeleton,
} from '@inbox-triage/ui';
import type { EmailMessageDto } from '@/features/emails/dto/email.dto';
import { EmailDetailContent } from './email-detail-content';
import { EmailFailure } from '@/features/emails/components/email-failure';

export function EmailDetail({
  message,
  loading,
  error,
  retry,
}: {
  message: EmailMessageDto | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}) {
  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading email"
        className="mx-auto flex w-full max-w-[820px] flex-col gap-4"
      >
        <Skeleton className="h-8 w-2/3" />

        <Skeleton className="h-24 w-full" />

        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <EmailFailure message={error} retry={retry} />;
  }

  if (!message) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyDescription>
            Select an email to view its contents.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <EmailDetailContent message={message} />;
}
