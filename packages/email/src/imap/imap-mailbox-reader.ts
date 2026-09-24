import { MailboxReaderError } from '../mailbox-reader-error';
import type {
  MailboxReader,
  EmailPage,
  ListInboxOptions,
} from '../mailbox-reader.types';
import type {
  EmailMessage,
  EmailSummary,
  MessageRef,
} from '../email-message.types';
import { parseEmailMessage } from '../mime/parse-email-message';
import type { ImapMailboxLock, ImapTransport } from './imap-transport.types';
import { parseMessageRef } from './message-ref';
import { normalizeEmailSummary } from './normalize-email-summary';
import { createPageToken, parsePageToken } from './page-token';
import { translateImapError } from './translate-imap-error';

const DEFAULT_PAGE_SIZE = 20;
const MAXIMUM_PAGE_SIZE = 20;
const MAXIMUM_MESSAGE_BYTES = 10 * 1024 * 1024;

export class ImapMailboxReader implements MailboxReader {
  private connected = false;
  private closed = false;
  private mailboxLock: ImapMailboxLock | null = null;

  constructor(private readonly transport: ImapTransport) {}

  async listInbox(options: ListInboxOptions = {}): Promise<EmailPage> {
    this.assertOpen();
    const limit = validateLimit(options.limit);
    const token = options.pageToken
      ? parsePageToken(options.pageToken)
      : undefined;

    try {
      return await this.withInboxLock(async ({ uidValidity }) => {
        if (token && token.uidValidity !== uidValidity) {
          throw new MailboxReaderError('INVALID_PAGE_TOKEN');
        }

        const uids = await this.transport.searchUids(token?.beforeUid);
        const orderedUids = [...new Set(uids)]
          .filter((uid) => Number.isSafeInteger(uid) && uid > 0)
          .sort((left, right) => left - right);
        const pageUids = orderedUids.slice(-(limit + 1));
        const hasOlderMessages = pageUids.length > limit;
        const selectedUids = pageUids.slice(-limit).reverse();
        const summaries = await this.transport.fetchSummaries(selectedUids);
        const summariesByUid = new Map(
          summaries.map((summary) => [summary.uid, summary]),
        );
        const messages = selectedUids.flatMap((uid) => {
          const summary = summariesByUid.get(uid);
          return summary ? [normalizeEmailSummary(summary, uidValidity)] : [];
        });

        return {
          messages,
          nextPageToken:
            hasOlderMessages && selectedUids.length > 0
              ? createPageToken({
                  uidValidity,
                  beforeUid: Math.min(...selectedUids),
                })
              : null,
        };
      });
    } catch (error) {
      throw translateImapError(error);
    }
  }

  async listInboxNewerThan(ref: MessageRef): Promise<EmailSummary[]> {
    this.assertOpen();
    const messageRef = parseMessageRef(ref);

    try {
      return await this.withInboxLock(async ({ uidValidity }) => {
        if (messageRef.uidValidity !== uidValidity) {
          throw new MailboxReaderError('MESSAGE_NOT_FOUND');
        }

        const uids = await this.transport.searchUidsNewerThan(messageRef.uid);
        const selectedUids = [...new Set(uids)]
          .filter((uid) => Number.isSafeInteger(uid) && uid > messageRef.uid)
          .sort((left, right) => right - left);
        const messages: EmailSummary[] = [];

        for (let offset = 0; offset < selectedUids.length; offset += 100) {
          const batch = selectedUids.slice(offset, offset + 100);
          const summaries = await this.transport.fetchSummaries(batch);
          const summariesByUid = new Map(
            summaries.map((summary) => [summary.uid, summary]),
          );
          for (const uid of batch) {
            const summary = summariesByUid.get(uid);
            if (summary) {
              messages.push(normalizeEmailSummary(summary, uidValidity));
            }
          }
        }
        return messages;
      });
    } catch (error) {
      throw translateImapError(error);
    }
  }

  async getMessage(ref: MessageRef): Promise<EmailMessage> {
    this.assertOpen();
    const messageRef = parseMessageRef(ref);

    try {
      return await this.withInboxLock(async ({ uidValidity }) => {
        if (messageRef.uidValidity !== uidValidity) {
          throw new MailboxReaderError('MESSAGE_NOT_FOUND');
        }

        const metadata = await this.transport.fetchMessageMetadata(
          messageRef.uid,
        );
        if (!metadata) {
          throw new MailboxReaderError('MESSAGE_NOT_FOUND');
        }
        if (metadata.sizeBytes > MAXIMUM_MESSAGE_BYTES) {
          throw new MailboxReaderError('MESSAGE_TOO_LARGE');
        }

        const stream = await this.transport.downloadMessage(
          messageRef.uid,
          MAXIMUM_MESSAGE_BYTES + 1,
        );
        if (!stream) {
          throw new MailboxReaderError('MESSAGE_NOT_FOUND');
        }

        const source = await readBoundedMessage(stream);
        const summary = normalizeEmailSummary(metadata, uidValidity);
        return await parseEmailMessage(source, summary);
      });
    } catch (error) {
      throw translateImapError(error);
    }
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    try {
      this.mailboxLock?.release();
    } catch {
      this.forceClose();
    }
    this.mailboxLock = null;

    if (!this.connected) {
      this.forceClose();
      return;
    }

    try {
      await this.transport.logout();
    } catch {
      this.forceClose();
    } finally {
      this.connected = false;
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('Mailbox reader is closed.');
    }
  }

  private forceClose(): void {
    try {
      this.transport.forceClose();
    } catch {
      // close() is terminal and idempotent even if the transport is already gone.
    }
  }

  private async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    await this.transport.connect();
    this.connected = true;
  }

  private async withInboxLock<T>(
    operation: (lock: ImapMailboxLock) => Promise<T>,
  ): Promise<T> {
    await this.connect();
    const lock = await this.transport.lockInbox();
    this.mailboxLock = lock;

    try {
      return await operation(lock);
    } finally {
      lock.release();
      if (this.mailboxLock === lock) {
        this.mailboxLock = null;
      }
    }
  }
}

function validateLimit(limit: number | undefined): number {
  const value = limit ?? DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(value) || value < 1 || value > MAXIMUM_PAGE_SIZE) {
    throw new RangeError('Inbox limit must be an integer from 1 to 20.');
  }
  return value;
}

async function readBoundedMessage(
  stream: AsyncIterable<Uint8Array>,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  for await (const chunk of stream) {
    byteLength += chunk.byteLength;
    if (byteLength > MAXIMUM_MESSAGE_BYTES) {
      throw new MailboxReaderError('MESSAGE_TOO_LARGE');
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks, byteLength);
}
