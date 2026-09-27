import { ImapFlow, type FetchMessageObject } from 'imapflow';
import {
  ImapTransportError,
  type ImapMailboxLock,
  type ImapSummaryData,
  type ImapTransport,
  type ImapTransportErrorKind,
} from './imap-transport.types';

interface ImapFlowTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export class ImapFlowTransport implements ImapTransport {
  private readonly client: ImapFlow;

  constructor(config: ImapFlowTransportConfig) {
    this.client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
      logger: false,
      disableAutoIdle: true,
    });
    this.client.on('error', () => {
      // ImapFlow also rejects the active operation. Keep its error event private.
    });
  }

  async connect(): Promise<void> {
    await runImapRequest(() => this.client.connect());
  }

  async lockInbox(): Promise<ImapMailboxLock> {
    return runImapRequest(async () => {
      const lock = await this.client.getMailboxLock('INBOX', {
        readOnly: true,
      });
      const mailbox = this.client.mailbox;
      if (!mailbox) {
        lock.release();
        throw new Error('INBOX did not open.');
      }

      return {
        uidValidity: mailbox.uidValidity,
        release: () => lock.release(),
      };
    });
  }

  async searchUids(beforeUid?: number): Promise<number[]> {
    if (beforeUid !== undefined && beforeUid <= 1) {
      return [];
    }

    // TODO Replace this unbounded search with sequence-window pagination if mailbox scale requires it.
    return runImapRequest(async () => {
      const result = await this.client.search(
        beforeUid === undefined ? { all: true } : { uid: `1:${beforeUid - 1}` },
        { uid: true },
      );
      return result || [];
    });
  }

  async searchUidsNewerThan(afterUid: number): Promise<number[]> {
    // A finite upper bound avoids IMAP's reversed range behavior with `*`.
    const maximumUid = 4_294_967_295;
    if (afterUid >= maximumUid) {
      return [];
    }

    return runImapRequest(async () => {
      const result = await this.client.search(
        { uid: `${afterUid + 1}:${maximumUid}` },
        { uid: true },
      );
      return result || [];
    });
  }

  async fetchSummaries(uids: number[]): Promise<ImapSummaryData[]> {
    if (uids.length === 0) {
      return [];
    }

    return runImapRequest(async () => {
      const summaries: ImapSummaryData[] = [];
      for await (const message of this.client.fetch(
        uids,
        {
          uid: true,
          flags: true,
          envelope: true,
          internalDate: true,
          size: true,
        },
        { uid: true },
      )) {
        summaries.push(toSummary(message));
      }
      return summaries;
    });
  }

  async fetchMessageMetadata(uid: number): Promise<ImapSummaryData | null> {
    return runImapRequest(async () => {
      const message = await this.client.fetchOne(
        uid,
        {
          uid: true,
          flags: true,
          envelope: true,
          internalDate: true,
          size: true,
        },
        { uid: true },
      );
      return message ? toSummary(message) : null;
    });
  }

  async downloadMessage(
    uid: number,
    maximumBytes: number,
  ): Promise<AsyncIterable<Uint8Array> | null> {
    return runImapRequest(async () => {
      const download = await this.client.download(uid, undefined, {
        uid: true,
        maxBytes: maximumBytes,
      });
      return download?.content
        ? translateImapStreamErrors(download.content)
        : null;
    });
  }

  async logout(): Promise<void> {
    await runImapRequest(() => this.client.logout());
  }

  forceClose(): void {
    this.client.close();
  }
}

export async function* translateImapStreamErrors(
  source: AsyncIterable<Uint8Array>,
): AsyncIterable<Uint8Array> {
  try {
    yield* source;
  } catch (error) {
    throw toImapTransportError(error);
  }
}

function toSummary(message: FetchMessageObject): ImapSummaryData {
  const receivedAt = normalizeDate(message.internalDate);
  if (
    !receivedAt ||
    !Number.isSafeInteger(message.uid) ||
    message.uid <= 0 ||
    !Number.isSafeInteger(message.size) ||
    Number(message.size) < 0
  ) {
    throw new Error('IMAP returned incomplete message metadata.');
  }

  return {
    uid: message.uid,
    from: message.envelope?.from,
    subject: message.envelope?.subject,
    receivedAt,
    flags: message.flags ?? new Set(),
    sizeBytes: Number(message.size),
  };
}

function normalizeDate(value: Date | string | undefined): Date | null {
  if (value === undefined) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function runImapRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    const result = await operation();
    return result;
  } catch (error) {
    throw toImapTransportError(error);
  }
}

function toImapTransportError(error: unknown): ImapTransportError {
  if (error instanceof ImapTransportError) {
    return error;
  }
  return new ImapTransportError(classifyImapError(error), {
    providerErrorCode: getTokenProperty(error, 'code'),
    responseStatus: getTokenProperty(error, 'responseStatus'),
    serverResponseCode: getTokenProperty(error, 'serverResponseCode'),
  });
}

function classifyImapError(error: unknown): ImapTransportErrorKind {
  // RFC 5530 UNAVAILABLE marks a temporary server failure, even during login.
  if (getStringProperty(error, 'serverResponseCode') === 'UNAVAILABLE') {
    return 'connection';
  }
  if (hasProperty(error, 'authenticationFailed', true)) {
    return 'authentication';
  }

  const code = getStringProperty(error, 'code');
  if (CONNECTION_ERROR_CODES.has(code ?? '')) {
    return 'connection';
  }
  return 'unknown';
}

// Node socket codes plus ImapFlow codes for dropped, stalled, or throttled sessions.
const CONNECTION_ERROR_CODES = new Set([
  'CONNECT_TIMEOUT',
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'EConnectionClosed',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EPIPE',
  'ETHROTTLE',
  'ETIMEDOUT',
  'ETIMEOUT',
  'GREETING_TIMEOUT',
  'NoConnection',
  'UPGRADE_TIMEOUT',
]);

// Only short identifier-like values may leave the transport as diagnostics.
function getTokenProperty(
  value: unknown,
  property: string,
): string | undefined {
  const token = getStringProperty(value, property);
  return token && /^[A-Za-z0-9_.-]{1,64}$/.test(token) ? token : undefined;
}

function hasProperty(
  value: unknown,
  property: string,
  expected: unknown,
): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    Reflect.get(value, property) === expected
  );
}

function getStringProperty(value: unknown, property: string): string | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const propertyValue = Reflect.get(value, property);
  return typeof propertyValue === 'string' ? propertyValue : null;
}
