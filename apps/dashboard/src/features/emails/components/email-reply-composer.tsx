'use client';

import { useId, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Skeleton,
  Spinner,
  Textarea,
} from '@inbox-triage/ui';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { briefReplyBodySchema } from '../brief-reply/brief-reply-body.schema';
import { BRIEF_REPLY_MAX_BODY_LENGTH } from '../brief-reply/brief-reply.config';
import type { EmailMessageDto } from '../dto/email.dto';
import type { useBriefReply } from '../hooks/use-brief-reply';
import { formatEmailAddresses } from '../lib/format-email-addresses';

const maxBodyLength = BRIEF_REPLY_MAX_BODY_LENGTH.toLocaleString('en-US');

// Display only. The server derives the real recipients and subject from the
// parent message with the same rules.
function replyRecipients(message: EmailMessageDto): string {
  const recipients =
    message.replyTo.length > 0 ? message.replyTo : message.from;
  return formatEmailAddresses(recipients) || 'No recipients';
}

function replySubject(subject: string | null): string {
  if (subject === null) {
    return 'No subject';
  }

  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

function getBodyError(body: string): string | null {
  if (briefReplyBodySchema.safeParse(body).success) {
    return null;
  }

  return body.length > BRIEF_REPLY_MAX_BODY_LENGTH
    ? `Keep the reply to ${maxBodyLength} characters or fewer.`
    : 'Enter the reply text.';
}

export function EmailReplyComposer({
  message,
  reply,
  canRegenerate,
  onRegenerate,
}: {
  message: EmailMessageDto;
  reply: ReturnType<typeof useBriefReply>;
  canRegenerate: boolean;
  // Omitted when the latest review has no questions to draft from.
  onRegenerate?: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const bodyId = useId();
  const bodyDescriptionId = useId();
  const bodyErrorId = useId();
  const pending = reply.pending !== null;
  const locked = pending || reply.sent !== null;
  const bodyError = reply.draft === null ? null : getBodyError(reply.draft);
  // A blank reply starts invalid, so its error waits for the first edit.
  const shownBodyError = reply.edited ? bodyError : null;

  function handleRegenerate() {
    if (reply.edited) {
      setConfirmOpen(true);
    } else {
      onRegenerate?.();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reply</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 text-sm wrap-anywhere">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
          <dt className="text-muted-foreground">To</dt>

          <dd>{replyRecipients(message)}</dd>

          <dt className="text-muted-foreground">Subject</dt>

          <dd>{replySubject(message.subject)}</dd>
        </dl>

        {reply.error && (
          <Alert variant="destructive">
            {reply.error.unconfirmed && (
              <AlertTitle>The reply may have been sent</AlertTitle>
            )}

            <AlertDescription>{reply.error.message}</AlertDescription>
          </Alert>
        )}

        {reply.sent && (
          <Alert>
            <AlertTitle>Reply sent</AlertTitle>

            <AlertDescription className="[&_p:not(:last-child)]:mb-1">
              <p>Accepted: {reply.sent.acceptedRecipients.join(', ')}</p>

              {reply.sent.rejectedRecipients.length > 0 && (
                <p>Rejected: {reply.sent.rejectedRecipients.join(', ')}</p>
              )}

              {!reply.sent.quotedOriginal && (
                <p>
                  The original email was too large to quote, so it was left out.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {reply.draft === null ? (
          reply.pending === 'generating' && (
            <div
              role="status"
              aria-label="Drafting reply"
              className="flex flex-col gap-3"
            >
              <Skeleton className="h-4 w-1/4" />

              <Skeleton className="h-40 w-full" />
            </div>
          )
        ) : (
          <Field
            data-invalid={!!shownBodyError || undefined}
            data-disabled={pending || undefined}
          >
            <FieldLabel htmlFor={bodyId}>Message</FieldLabel>

            <Textarea
              id={bodyId}
              value={reply.draft}
              onChange={(event) => reply.editDraft(event.target.value)}
              // A sent reply stays readable and copyable.
              readOnly={reply.sent !== null}
              disabled={pending}
              aria-invalid={!!shownBodyError || undefined}
              aria-describedby={
                shownBodyError
                  ? `${bodyDescriptionId} ${bodyErrorId}`
                  : bodyDescriptionId
              }
              className="max-h-[60vh] min-h-64"
            />

            <FieldDescription id={bodyDescriptionId}>
              The original email is quoted below this text when sent. Add your
              name before sending.
            </FieldDescription>

            {shownBodyError && (
              <FieldError id={bodyErrorId}>{shownBodyError}</FieldError>
            )}
          </Field>
        )}
      </CardContent>

      {reply.draft !== null && !reply.sent && (
        <CardFooter className="flex-wrap justify-end gap-2">
          {onRegenerate && (
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={locked || !canRegenerate}
            >
              {reply.pending === 'generating' && (
                <Spinner data-icon="inline-start" />
              )}
              Regenerate
            </Button>
          )}

          <Button
            onClick={() => void reply.send(message.ref)}
            disabled={locked || bodyError !== null}
          >
            {reply.pending === 'sending' && (
              <Spinner data-icon="inline-start" />
            )}
            Send reply
          </Button>
        </CardFooter>
      )}

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Replace your edited reply?"
        description="Regenerating discards your edits and replaces the draft with a new one."
        actionLabel="Replace draft"
        cancelLabel="Keep editing"
        onConfirm={() => onRegenerate?.()}
      />
    </Card>
  );
}
