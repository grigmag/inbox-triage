'use client';

import { Button } from '@inbox-triage/ui';
import { useEffect } from 'react';
import { InlineError } from '@/components/inline-error';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <PageHeader
        title="Something went wrong"
        description="This page could not be loaded. You can try again."
      />
      <InlineError
        title="Unable to load this page"
        description="Please try again. If the problem continues, return to the previous page or sign in again."
        retryAction={<Button onClick={() => retry()}>Try again</Button>}
      />
    </PageShell>
  );
}
