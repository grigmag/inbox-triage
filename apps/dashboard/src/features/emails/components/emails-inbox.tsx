'use client';

import Link from 'next/link';
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
import { EmailList } from './email-list';
import { EmailDetail } from './email-detail';
import { EmailFailure } from './email-failure';

export function EmailsInbox() {
  const { state, loadInitial, loadMore, refresh, select } = useEmails();
  const busy =
    state.initial.loading || state.older.loading || state.refresh.loading;
  return (
    <div className="overflow-x-auto">
      <div className="grid h-[calc(100dvh-10rem)] min-h-80 min-w-[800px] grid-cols-[minmax(320px,400px)_minmax(440px,1fr)] overflow-hidden rounded-xl border max-md:h-[calc(100dvh-13rem)]">
        <section
          aria-label="Inbox"
          className="flex min-h-0 min-w-0 flex-col border-r"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b p-4">
            <h2 className="font-medium">Inbox</h2>

            <Button
              variant="outline"
              onClick={() => void refresh()}
              disabled={busy}
            >
              {(state.refresh.loading || state.initial.loading) && (
                <Spinner data-icon="inline-start" />
              )}
              Refresh
            </Button>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto [overflow-anchor:none]"
            aria-busy={state.initial.loading}
          >
            {state.initial.loading && (
              <div
                role="status"
                aria-label="Loading inbox"
                className="flex flex-col gap-4 p-4"
              >
                {[0, 1, 2, 3].map((key) => (
                  <Skeleton key={key} className="h-16 w-full" />
                ))}
              </div>
            )}

            {state.noConnection && !state.initial.loading ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Connect your mailbox</EmptyTitle>

                  <EmptyDescription>
                    Add your Zoho credentials to read emails.
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
            ) : state.initial.error && !state.initial.loading ? (
              <div className="p-4">
                <EmailFailure
                  message={state.initial.error}
                  retry={() => void loadInitial()}
                />
              </div>
            ) : !state.initial.loading && state.messages.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No emails</EmptyTitle>

                  <EmptyDescription>Your inbox is empty.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}

            <EmailList
              messages={state.messages}
              selectedRef={state.selectedRef}
              select={(ref) => void select(ref)}
            />

            {state.refresh.error && (
              <div className="p-4">
                <EmailFailure
                  message={state.refresh.error}
                  retry={() => void refresh()}
                />
              </div>
            )}

            {state.older.error && (
              <div className="p-4">
                <EmailFailure
                  message={state.older.error}
                  retry={() => void loadMore()}
                />
              </div>
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
          className="min-h-0 min-w-0 overflow-y-auto p-6 [overflow-anchor:none]"
        >
          {/* Remounts per loaded message, which also discards its review state. */}
          <EmailDetail
            key={state.messageRequestId}
            message={state.message}
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
