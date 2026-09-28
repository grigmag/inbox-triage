'use client';

import { useId, useState, type Ref } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Skeleton,
  Spinner,
  Textarea,
} from '@inbox-triage/ui';
import {
  CircleCheckIcon,
  InfoIcon,
  RefreshCwIcon,
  SendIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { briefReplyBodySchema } from '../brief-reply/brief-reply-body.schema';
import { BRIEF_REPLY_MAX_BODY_LENGTH } from '../brief-reply/brief-reply.config';
import type { EmailMessageDto } from '../dto/email.dto';
import type { useBriefReply } from '../hooks/use-brief-reply';
import { formatEmailAddresses } from '../lib/format-email-addresses';
import type { BriefReplyStaleness } from '../lib/get-brief-reply-staleness';
import { getReplyRecipients, getReplySubject } from '../lib/get-reply-envelope';
import { EmailReplyHeader } from './email-reply-header';
import { EmailReplyQuotePreview } from './email-reply-quote-preview';

const stalenessNotices: Record<NonNullable<BriefReplyStaleness>, string> = {
  reviewChanged:
    'This draft was written from an earlier review. Regenerate to use the current questions.',
  nothingToAsk:
    'The latest review found nothing to ask. Check this draft before sending.',
  notABrief:
    'The latest review says this is not a production brief. Check this draft before sending.',
  selectionChanged:
    'The selected questions changed. Regenerate to update the draft.',
};

const maxBodyLength = BRIEF_REPLY_MAX_BODY_LENGTH.toLocaleString('en-US');

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
  staleness,
  onRegenerate,
  statusMessage,
  ref,
}: {
  message: EmailMessageDto;
  reply: ReturnType<typeof useBriefReply>;
  /** False while a review runs or when no question is selected. */
  canRegenerate: boolean;
  /**
   * Whether a newer review than the draft's own exists, and what it found, or
   * whether the selected questions changed since the draft.
   */
  staleness: BriefReplyStaleness;
  /** Omitted when the latest review has no questions to draft from. */
  onRegenerate?: () => void;
  /**
   * Announced through a status region that stays in the DOM, so screen
   * readers report each change, such as "Reply draft ready."
   */
  statusMessage: string;
  /** The editor, so the owner can focus it when a draft arrives. */
  ref?: Ref<HTMLTextAreaElement>;
}) {
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const bodyId = useId();
  const bodyDescriptionId = useId();
  const bodyErrorId = useId();
  const pending = reply.pending !== null;
  const sent = reply.sent !== null;
  const locked = pending || sent;
  const bodyError = reply.draft === null ? null : getBodyError(reply.draft);
  // A blank reply starts invalid, so its error waits for the first edit.
  const shownBodyError = reply.edited ? bodyError : null;
  const describedBy =
    [!sent && bodyDescriptionId, shownBodyError && bodyErrorId]
      .filter(Boolean)
      .join(' ') || undefined;

  function handleRegenerate() {
    if (reply.edited) {
      setRegenerateConfirmOpen(true);
    } else {
      onRegenerate?.();
    }
  }

  const recipients = getReplyRecipients(message);
  const sendWarnings = [
    reply.error?.unconfirmed &&
      'Your last send may have gone through. Check your Sent folder before sending again.',
    staleness && stalenessNotices[staleness],
    !reply.edited &&
      'You have not changed the generated draft. Check that it is signed with your name.',
  ].filter((warning) => typeof warning === 'string');

  return (
    <Card
      role="region"
      aria-label="Reply"
      // The editor has no border, so the card shows its focus and error.
      className="has-[textarea:focus-visible]:ring-3 has-[textarea:focus-visible]:ring-ring/50 has-[textarea[aria-invalid=true]]:ring-destructive/40"
    >
      <CardHeader className="border-b">
        <EmailReplyHeader message={message} />
      </CardHeader>

      <CardContent className="flex flex-col gap-4 text-sm wrap-anywhere">
        <p role="status" className="sr-only">
          {statusMessage}
        </p>

        {staleness && (
          <p className="flex items-start gap-2 text-muted-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />

            {stalenessNotices[staleness]}
          </p>
        )}

        {reply.error && (
          <Alert variant="destructive">
            {reply.error.unconfirmed && (
              <AlertTitle>The reply may have been sent</AlertTitle>
            )}

            <AlertDescription>{reply.error.message}</AlertDescription>
          </Alert>
        )}

        {reply.sent && (
          <Alert className="border-success/30 bg-success/10 text-success dark:bg-success/20">
            <CircleCheckIcon />

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
          <>
            <Field
              data-invalid={!!shownBodyError || undefined}
              data-disabled={pending || undefined}
            >
              <FieldLabel htmlFor={bodyId} className="sr-only">
                Message
              </FieldLabel>

              <Textarea
                ref={ref}
                id={bodyId}
                value={reply.draft}
                onChange={(event) => reply.editDraft(event.target.value)}
                // A sent reply stays readable and copyable.
                readOnly={sent}
                disabled={pending}
                aria-invalid={!!shownBodyError || undefined}
                aria-describedby={describedBy}
                className="min-h-48 resize-none rounded-none border-0 bg-transparent px-0 py-0 leading-6 focus-visible:ring-0 aria-invalid:ring-0 disabled:bg-transparent dark:bg-transparent dark:disabled:bg-transparent"
              />

              {!sent && (
                <FieldDescription id={bodyDescriptionId}>
                  Add your name before sending.
                </FieldDescription>
              )}

              {shownBodyError && (
                <FieldError id={bodyErrorId}>{shownBodyError}</FieldError>
              )}
            </Field>

            {!sent && <EmailReplyQuotePreview message={message} />}
          </>
        )}
      </CardContent>

      {reply.draft !== null && !sent && (
        <CardFooter className="gap-2 bg-card">
          {onRegenerate && (
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={locked || !canRegenerate}
            >
              {reply.pending === 'generating' ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <RefreshCwIcon data-icon="inline-start" />
              )}
              Regenerate
            </Button>
          )}

          <Button
            className="ml-auto"
            onClick={() => setSendConfirmOpen(true)}
            disabled={locked || bodyError !== null}
          >
            {reply.pending === 'sending' ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <SendIcon data-icon="inline-start" />
            )}
            Send reply
          </Button>
        </CardFooter>
      )}

      <ConfirmActionDialog
        open={regenerateConfirmOpen}
        onOpenChange={setRegenerateConfirmOpen}
        title="Replace your edited reply?"
        description="Regenerating discards your edits and replaces the draft with a new one."
        actionLabel="Replace draft"
        cancelLabel="Keep editing"
        onConfirm={() => onRegenerate?.()}
      />

      <ConfirmActionDialog
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
        title="Send this reply?"
        description="The reply is sent from your connected mailbox. Sent email cannot be recalled."
        actionLabel="Send reply"
        cancelLabel="Keep editing"
        actionVariant="default"
        // The dialog closes at once. The composer shows the sending state.
        onConfirm={() => void reply.send(message.ref)}
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm wrap-anywhere">
          <dt className="text-muted-foreground">To</dt>

          <dd>
            {recipients.length > 0
              ? formatEmailAddresses(recipients)
              : 'No recipients'}
          </dd>

          <dt className="text-muted-foreground">Subject</dt>

          <dd>{getReplySubject(message.subject)}</dd>
        </dl>

        {sendWarnings.length > 0 && (
          <ul className="flex flex-col gap-2 text-sm text-warning">
            {sendWarnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2">
                <TriangleAlertIcon
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden
                />

                {warning}
              </li>
            ))}
          </ul>
        )}
      </ConfirmActionDialog>
    </Card>
  );
}
