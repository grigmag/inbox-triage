import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Empty,
  EmptyHeader,
  EmptyDescription,
  Skeleton,
} from '@inbox-triage/ui';
import type { EmailAddressDto, EmailMessageDto } from '../dto/email.dto';
import { formatEmailDate } from '../lib/format-email-date';
import { EmailFailure } from './email-failure';

function addresses(values: EmailAddressDto[]): string {
  return values
    .map(({ name, address }) => (name ? `${name} <${address}>` : address))
    .join(', ');
}
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
  if (loading)
    return (
      <div
        role="status"
        aria-label="Loading email"
        className="flex flex-col gap-4"
      >
        <Skeleton className="h-8 w-2/3" />

        <Skeleton className="h-24 w-full" />

        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (error) return <EmailFailure message={error} retry={retry} />;
  if (!message)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyDescription>
            Select an email to view its contents.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="wrap-anywhere">
          {message.subject || 'No subject'}
        </CardTitle>

        <CardDescription className="wrap-anywhere">
          {addresses(message.from)}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm wrap-anywhere">
          <dt className="text-muted-foreground">To</dt>

          <dd>{addresses(message.to) || 'No recipients'}</dd>

          {message.cc.length > 0 && (
            <>
              <dt className="text-muted-foreground">CC</dt>

              <dd>{addresses(message.cc)}</dd>
            </>
          )}

          {message.replyTo.length > 0 && (
            <>
              <dt className="text-muted-foreground">Reply-To</dt>

              <dd>{addresses(message.replyTo)}</dd>
            </>
          )}

          <dt className="text-muted-foreground">Date</dt>

          <dd>
            {formatEmailDate(message.sentAt ?? message.receivedAt, {
              detail: true,
            })}
          </dd>
        </dl>

        {message.text !== null && message.text.length > 0 ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap wrap-anywhere">
            {message.text}
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyDescription>
                Plain-text content is unavailable for this email.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
