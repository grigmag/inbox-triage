import { TriangleAlertIcon } from 'lucide-react';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { formatEmailAddresses } from '@/features/emails/lib/format-email-addresses';
import { useEmailDetail } from '../email-detail-context';
import { getReplyRecipients, getReplySubject } from './get-reply-envelope';
import { stalenessNotices } from './staleness-notices.consts';

/** Confirms the send, showing the envelope and anything to check first. */
export function SendReplyConfirmDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    state: { message, reply },
    actions: { sendReply },
  } = useEmailDetail();
  const recipients = getReplyRecipients(message);
  const warnings = [
    reply.error?.unconfirmed &&
      'Your last send may have gone through. Check your Sent folder before sending again.',
    reply.staleness && stalenessNotices[reply.staleness],
    !reply.edited &&
      'You have not changed the generated draft. Check that it is signed with your name.',
  ].filter((warning) => typeof warning === 'string');

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send this reply?"
      description="The reply is sent from your connected mailbox. Sent email cannot be recalled."
      actionLabel="Send reply"
      cancelLabel="Keep editing"
      actionVariant="default"
      // The dialog closes at once. The composer shows the sending state.
      onConfirm={sendReply}
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

      {warnings.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm text-warning">
          {warnings.map((warning) => (
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
  );
}
