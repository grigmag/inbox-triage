import type { EmailAddress, EmailSummary } from '../email-message.types';
import type { ImapAddress, ImapSummaryData } from './imap-transport.types';
import { createMessageRef } from './message-ref';

export function normalizeEmailSummary(
  value: ImapSummaryData,
  uidValidity: bigint,
): EmailSummary {
  return {
    ref: createMessageRef({ uidValidity, uid: value.uid }),
    from: normalizeAddresses(value.from),
    subject: value.subject ?? null,
    receivedAt: value.receivedAt,
    isRead: value.flags.has('\\Seen'),
    sizeBytes: value.sizeBytes,
  };
}

function normalizeAddresses(values: ImapAddress[] | undefined): EmailAddress[] {
  return (values ?? []).flatMap((value) => {
    const address = value.address?.trim();
    if (!address) {
      return [];
    }

    return [{ name: value.name?.trim() || null, address }];
  });
}
