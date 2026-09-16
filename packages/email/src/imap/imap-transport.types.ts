export interface ImapMailboxLock {
  uidValidity: bigint;
  release(): void;
}

export interface ImapAddress {
  name?: string;
  address?: string;
}

export interface ImapSummaryData {
  uid: number;
  from?: ImapAddress[];
  subject?: string;
  receivedAt: Date;
  flags: Set<string>;
  sizeBytes: number;
}

export interface ImapTransport {
  connect(): Promise<void>;
  lockInbox(): Promise<ImapMailboxLock>;
  searchUids(beforeUid?: number): Promise<number[]>;
  searchUidsNewerThan(afterUid: number): Promise<number[]>;
  fetchSummaries(uids: number[]): Promise<ImapSummaryData[]>;
  fetchMessageMetadata(uid: number): Promise<ImapSummaryData | null>;
  downloadMessage(
    uid: number,
    maximumBytes: number,
  ): Promise<AsyncIterable<Uint8Array> | null>;
  logout(): Promise<void>;
  forceClose(): void;
}

export type ImapTransportErrorKind =
  'authentication' | 'connection' | 'unknown';

export class ImapTransportError extends Error {
  readonly kind: ImapTransportErrorKind;

  constructor(kind: ImapTransportErrorKind) {
    super('IMAP transport request failed.');
    this.name = 'ImapTransportError';
    this.kind = kind;
  }
}
