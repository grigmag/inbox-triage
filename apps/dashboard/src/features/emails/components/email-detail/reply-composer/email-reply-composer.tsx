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
  Field,
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
} from 'lucide-react';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { briefReplyBodySchema } from '@/features/emails/brief-reply/brief-reply-body.schema';
import { BRIEF_REPLY_MAX_BODY_LENGTH } from '@/features/emails/brief-reply/brief-reply.config';
import type { SentBriefReplyDto } from '@/features/emails/dto/sent-brief-reply.dto';
import { useEmailDetail } from '../email-detail-context';
import { EmailReplyHeader } from './email-reply-header';
import { EmailReplyQuotePreview } from './email-reply-quote-preview';
import { SendReplyConfirmDialog } from './send-reply-confirm-dialog';
import { stalenessNotices } from './staleness-notices.consts';

const maxBodyLength = BRIEF_REPLY_MAX_BODY_LENGTH.toLocaleString('en-US');

function getBodyError(body: string): string | null {
  if (briefReplyBodySchema.safeParse(body).success) {
    return null;
  }

  return body.length > BRIEF_REPLY_MAX_BODY_LENGTH
    ? `Keep the reply to ${maxBodyLength} characters or fewer.`
    : 'Enter the reply text.';
}

function ReplySentAlert({ sent }: { sent: SentBriefReplyDto }) {
  return (
    <Alert className="border-success/30 bg-success/10 text-success dark:bg-success/20">
      <CircleCheckIcon />

      <AlertTitle>Reply sent</AlertTitle>

      <AlertDescription className="[&_p:not(:last-child)]:mb-1">
        <p>Accepted: {sent.acceptedRecipients.join(', ')}</p>

        {sent.rejectedRecipients.length > 0 && (
          <p>Rejected: {sent.rejectedRecipients.join(', ')}</p>
        )}

        {!sent.quotedOriginal && (
          <p>The original email was too large to quote, so it was left out.</p>
        )}
      </AlertDescription>
    </Alert>
  );
}

function ReplyCard() {
  const {
    state: { message, reply },
    actions: { editDraft, regenerateReply },
    meta: { editorRef },
  } = useEmailDetail();
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const bodyId = useId();
  const bodyErrorId = useId();
  const pending = reply.pending !== null;
  const sent = reply.sent !== null;
  const locked = pending || sent;
  const bodyError = reply.draft === null ? null : getBodyError(reply.draft);
  // A blank reply starts invalid, so its error waits for the first edit.
  const shownBodyError = reply.edited ? bodyError : null;

  function handleRegenerate() {
    if (reply.edited) {
      setRegenerateConfirmOpen(true);
    } else {
      regenerateReply();
    }
  }

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
          {reply.statusMessage}
        </p>

        {reply.staleness && (
          <p className="flex items-start gap-2 text-muted-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />

            {stalenessNotices[reply.staleness]}
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

        {reply.sent && <ReplySentAlert sent={reply.sent} />}

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
                ref={editorRef}
                id={bodyId}
                value={reply.draft}
                onChange={(event) => editDraft(event.target.value)}
                // A sent reply stays readable and copyable.
                readOnly={sent}
                disabled={pending}
                aria-invalid={!!shownBodyError || undefined}
                aria-describedby={shownBodyError ? bodyErrorId : undefined}
                className="min-h-48 resize-none rounded-none border-0 bg-transparent px-0 py-0 leading-6 focus-visible:ring-0 aria-invalid:ring-0 disabled:bg-transparent dark:bg-transparent dark:disabled:bg-transparent"
              />

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
          {reply.regenerate !== 'hidden' && (
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={locked || reply.regenerate !== 'ready'}
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
        onConfirm={regenerateReply}
      />

      <SendReplyConfirmDialog
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
      />
    </Card>
  );
}

/** The reply editor, shown once a reply has started. */
export function EmailReplyComposer() {
  const {
    state: { reply },
    meta: { composerRef },
  } = useEmailDetail();

  if (!reply.started) {
    return null;
  }

  return (
    <div ref={composerRef} className="scroll-mt-6">
      <ReplyCard />
    </div>
  );
}
