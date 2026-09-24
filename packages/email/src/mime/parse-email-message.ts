import PostalMime, { type Address } from 'postal-mime';
import type {
  EmailAddress,
  EmailMessage,
  EmailSummary,
} from '../email-message.types';
import {
  parseMessageIdentifiers,
  parseSingleMessageIdentifier,
} from './parse-message-identifiers';

export async function parseEmailMessage(
  source: Uint8Array,
  summary: EmailSummary,
): Promise<EmailMessage> {
  const parsed = await PostalMime.parse(source, {
    attachmentEncoding: 'arraybuffer',
  });

  return {
    ...summary,
    messageId: parseSingleMessageIdentifier(parsed.messageId),
    inReplyTo: parseMessageIdentifiers(parsed.inReplyTo),
    references: parseMessageIdentifiers(parsed.references),
    to: normalizeAddresses(parsed.to),
    cc: normalizeAddresses(parsed.cc),
    replyTo: normalizeAddresses(parsed.replyTo),
    sentAt: parseDate(parsed.date),
    text: parsed.text ?? null,
    html: parsed.html ?? null,
  };
}

function normalizeAddresses(values: Address[] | undefined): EmailAddress[] {
  return (values ?? []).flatMap((value) => {
    if (Array.isArray(value.group)) {
      return value.group.map(normalizeMailbox);
    }
    if (typeof value.address === 'string') {
      return [normalizeMailbox(value)];
    }
    return [];
  });
}

function normalizeMailbox(value: {
  name: string;
  address: string;
}): EmailAddress {
  return {
    name: value.name.trim() || null,
    address: value.address.trim(),
  };
}

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
