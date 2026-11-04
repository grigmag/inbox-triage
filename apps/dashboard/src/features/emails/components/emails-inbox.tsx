'use client';

import Link from 'next/link';
import { RefreshCwIcon } from 'lucide-react';
import {
  Button,
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  Skeleton,
  Spinner,
} from '@inbox-triage/ui';
import { routes } from '@/config/routes';
import { useEmails } from '../hooks/use-emails';
import type { EmailState } from '../state/email-state';
import { EmailList } from './email-list';
import { EmailDetail } from './email-detail/email-detail';
import { EmailFailure } from './email-failure';

function InboxFailure({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="p-4">
      <EmailFailure message={message} retry={retry} />
    </div>
  );
}

/** What the list area shows in place of, or before, the messages. */
function InboxListStatus({
  state,
  retry,
}: {
  state: EmailState;
  retry: () => void;
}) {
  if (state.initial.loading) {
    return (
      <div
        role="status"
        aria-label="Loading inbox"
        className="flex flex-col gap-4 p-4"
      >
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (state.noConnection) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Connect your mailbox</EmptyTitle>

          <EmptyDescription>
            Add your email account in settings to read emails.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent>
          <Button
            nativeButton={false}
            render={<Link href={routes.settingsEmail} />}
          >
            Go to email settings
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (state.initial.error) {
    return <InboxFailure message={state.initial.error} retry={retry} />;
  }

  if (state.messages.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No emails</EmptyTitle>

          <EmptyDescription>Your inbox is empty.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return null;
}

export function EmailsInbox({ replyFooter }: { replyFooter: string | null }) {
  const { state, loadInitial, loadMore, refresh, select } = useEmails();
  const busy =
    state.initial.loading || state.older.loading || state.refresh.loading;

  return (
    <div className="overflow-x-auto">
      <div className="grid h-[calc(100dvh-10rem)] min-h-80 min-w-[740px] grid-cols-[300px_minmax(440px,1fr)] overflow-hidden rounded-xl border max-md:h-[calc(100dvh-13rem)]">
        <section
          aria-label="Inbox"
          className="flex min-h-0 min-w-0 flex-col border-r"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
            <h2 className="font-medium">Inbox</h2>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh"
              onClick={() => void refresh()}
              disabled={busy}
            >
              {state.refresh.loading || state.initial.loading ? (
                <Spinner />
              ) : (
                <RefreshCwIcon />
              )}
            </Button>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto [overflow-anchor:none]"
            aria-busy={state.initial.loading}
          >
            <InboxListStatus state={state} retry={() => void loadInitial()} />

            <EmailList
              messages={state.messages}
              selectedRef={state.selectedRef}
              select={(ref) => void select(ref)}
            />

            {state.refresh.error && (
              <InboxFailure
                message={state.refresh.error}
                retry={() => void refresh()}
              />
            )}

            {state.older.error && (
              <InboxFailure
                message={state.older.error}
                retry={() => void loadMore()}
              />
            )}

            {state.nextPageToken !== null && (
              <div className="p-4">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void loadMore()}
                >
                  {state.older.loading && <Spinner data-icon="inline-start" />}
                  Load more
                </Button>
              </div>
            )}
          </div>
        </section>

        <section
          aria-label="Email contents"
          className="relative min-h-0 min-w-0 overflow-y-auto p-6 [overflow-anchor:none]"
        >
          {/* Remounts per loaded message, which also discards its review state. */}
          <EmailDetail
            key={state.messageRequestId}
            message={state.message}
            replyFooter={replyFooter}
            loading={state.detail.loading}
            error={state.detail.error}
            retry={() => {
              if (state.selectedRef) void select(state.selectedRef);
            }}
          />
        </section>
      </div>
    </div>
  );
}
