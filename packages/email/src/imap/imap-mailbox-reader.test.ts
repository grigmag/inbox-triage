import { describe, expect, it, vi } from 'vitest';
import { MailboxReaderError } from '../mailbox-reader-error';
import { ImapMailboxReader } from './imap-mailbox-reader';
import type {
  ImapMailboxLock,
  ImapSummaryData,
  ImapTransport,
} from './imap-transport.types';
import { createMessageRef } from './message-ref';
import { parsePageToken } from './page-token';

describe('ImapMailboxReader', () => {
  it('lists newest messages first without downloading message sources', async () => {
    const transport = new FakeTransport([1, 2, 3]);
    const reader = new ImapMailboxReader(transport);

    const page = await reader.listInbox({ limit: 2 });

    expect(page.messages.map(({ subject }) => subject)).toEqual([
      'Message 3',
      'Message 2',
    ]);
    expect(transport.downloadCalls).toBe(0);
    expect(transport.releaseCalls).toBe(1);
    expect(parsePageToken(page.nextPageToken!)).toEqual({
      uidValidity: BigInt(7),
      beforeUid: 2,
    });
  });

  it('keeps pagination stable when newer mail arrives', async () => {
    const transport = new FakeTransport([1, 2, 3, 4]);
    const reader = new ImapMailboxReader(transport);
    const firstPage = await reader.listInbox({ limit: 2 });

    transport.uids.push(5);
    const secondPage = await reader.listInbox({
      limit: 2,
      pageToken: firstPage.nextPageToken!,
    });

    expect(firstPage.messages.map(({ subject }) => subject)).toEqual([
      'Message 4',
      'Message 3',
    ]);
    expect(secondPage.messages.map(({ subject }) => subject)).toEqual([
      'Message 2',
      'Message 1',
    ]);
    expect(secondPage.nextPageToken).toBeNull();
  });

  it('rejects a stale page token', async () => {
    const transport = new FakeTransport([1, 2, 3]);
    const reader = new ImapMailboxReader(transport);
    const firstPage = await reader.listInbox({ limit: 1 });
    transport.uidValidity = BigInt(8);

    await expect(
      reader.listInbox({ pageToken: firstPage.nextPageToken! }),
    ).rejects.toMatchObject({ code: 'INVALID_PAGE_TOKEN' });
    expect(transport.releaseCalls).toBe(2);
  });

  it('returns every newer summary in snapshot order through bounded batches', async () => {
    const transport = new FakeTransport(
      Array.from({ length: 250 }, (_, i) => i + 1),
    );
    const search = vi.spyOn(transport, 'searchUidsNewerThan');
    const fetch = vi
      .spyOn(transport, 'fetchSummaries')
      .mockImplementation(async (uids) => {
        transport.uids.push(251);
        return (await new FakeTransport(uids).fetchSummaries(uids)).reverse();
      });
    const metadata = vi.spyOn(transport, 'fetchMessageMetadata');
    const reader = new ImapMailboxReader(transport);

    const messages = await reader.listInboxNewerThan(
      createMessageRef({ uidValidity: BigInt(7), uid: 20 }),
    );
    await reader.close();

    expect(messages.map(({ subject }) => subject)).toEqual(
      Array.from({ length: 230 }, (_, i) => `Message ${250 - i}`),
    );
    expect(search).toHaveBeenCalledExactlyOnceWith(20);
    expect(fetch.mock.calls.map(([uids]) => uids.length)).toEqual([
      100, 100, 30,
    ]);
    expect(metadata).not.toHaveBeenCalled();
    expect(transport.downloadCalls).toBe(0);
    expect(transport.releaseCalls).toBe(1);
    expect(transport.logoutCalls).toBe(1);
  });

  it('deduplicates the snapshot and excludes older UIDs and missing summaries', async () => {
    const transport = new FakeTransport([2, 3, 4]);
    vi.spyOn(transport, 'searchUidsNewerThan').mockResolvedValue([
      4,
      3,
      3,
      2,
      NaN,
    ]);
    vi.spyOn(transport, 'fetchSummaries').mockResolvedValue([
      ...(await new FakeTransport([3]).fetchSummaries([3])),
    ]);
    const reader = new ImapMailboxReader(transport);

    const messages = await reader.listInboxNewerThan(
      createMessageRef({ uidValidity: BigInt(7), uid: 2 }),
    );

    expect(messages.map(({ subject }) => subject)).toEqual(['Message 3']);
  });

  it('returns an empty refresh without fetching summaries', async () => {
    const transport = new FakeTransport([1]);
    const fetch = vi.spyOn(transport, 'fetchSummaries');
    const reader = new ImapMailboxReader(transport);

    await expect(
      reader.listInboxNewerThan(
        createMessageRef({ uidValidity: BigInt(7), uid: 1 }),
      ),
    ).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    expect(transport.releaseCalls).toBe(1);
  });

  it('rejects malformed and stale refresh references', async () => {
    const transport = new FakeTransport([1]);
    const search = vi.spyOn(transport, 'searchUidsNewerThan');
    const reader = new ImapMailboxReader(transport);

    await expect(reader.listInboxNewerThan('invalid')).rejects.toMatchObject({
      code: 'INVALID_MESSAGE_REF',
    });
    expect(transport.connectCalls).toBe(0);
    await expect(
      reader.listInboxNewerThan(
        createMessageRef({ uidValidity: BigInt(8), uid: 1 }),
      ),
    ).rejects.toMatchObject({ code: 'MESSAGE_NOT_FOUND' });
    expect(search).not.toHaveBeenCalled();
    expect(transport.releaseCalls).toBe(1);
  });

  it.each(['search', 'fetch'] as const)(
    'cleans up and hides provider failures during refresh %s',
    async (operation) => {
      const transport = new FakeTransport([1, 2]);
      vi.spyOn(
        transport,
        operation === 'search' ? 'searchUidsNewerThan' : 'fetchSummaries',
      ).mockRejectedValue(new Error('sensitive provider response'));
      const reader = new ImapMailboxReader(transport);

      await expect(
        reader.listInboxNewerThan(
          createMessageRef({ uidValidity: BigInt(7), uid: 1 }),
        ),
      ).rejects.toEqual(new MailboxReaderError('UNKNOWN'));
      await reader.close();
      expect(transport.releaseCalls).toBe(1);
      expect(transport.logoutCalls).toBe(1);
      await expect(reader.listInboxNewerThan('invalid')).rejects.toThrow(
        'Mailbox reader is closed.',
      );
    },
  );

  it('downloads and parses a message without changing its read state', async () => {
    const transport = new FakeTransport([10]);
    const reader = new ImapMailboxReader(transport);
    const ref = createMessageRef({ uidValidity: BigInt(7), uid: 10 });

    const message = await reader.getMessage(ref);

    expect(message).toMatchObject({
      subject: 'Message 10',
      isRead: false,
      messageId: '<message-10@example.com>',
      text: 'Message body\n',
    });
    expect(transport.maximumDownloadBytes).toBe(10 * 1024 * 1024 + 1);
    expect(transport.releaseCalls).toBe(1);
  });

  it('rejects an oversized message before download', async () => {
    const transport = new FakeTransport([10]);
    transport.messageSize = 10 * 1024 * 1024 + 1;
    const reader = new ImapMailboxReader(transport);

    await expect(
      reader.getMessage(createMessageRef({ uidValidity: BigInt(7), uid: 10 })),
    ).rejects.toMatchObject({ code: 'MESSAGE_TOO_LARGE' });
    expect(transport.downloadCalls).toBe(0);
    expect(transport.releaseCalls).toBe(1);
  });

  it('enforces the message limit while reading the source', async () => {
    const transport = new FakeTransport([10]);
    transport.download = async function* () {
      yield Buffer.alloc(5 * 1024 * 1024);
      yield Buffer.alloc(5 * 1024 * 1024 + 1);
    };
    const reader = new ImapMailboxReader(transport);

    await expect(
      reader.getMessage(createMessageRef({ uidValidity: BigInt(7), uid: 10 })),
    ).rejects.toMatchObject({ code: 'MESSAGE_TOO_LARGE' });
    expect(transport.releaseCalls).toBe(1);
  });

  it('releases the mailbox lock after an operation failure', async () => {
    const transport = new FakeTransport([1]);
    transport.searchError = new Error('sensitive provider response');
    const reader = new ImapMailboxReader(transport);

    await expect(reader.listInbox()).rejects.toEqual(
      new MailboxReaderError('UNKNOWN'),
    );
    expect(transport.releaseCalls).toBe(1);
  });

  it('closes once and force-closes when logout fails', async () => {
    const transport = new FakeTransport([1]);
    transport.logoutError = new Error('disconnect failed');
    const reader = new ImapMailboxReader(transport);
    await reader.listInbox();

    await reader.close();
    await reader.close();

    expect(transport.logoutCalls).toBe(1);
    expect(transport.forceCloseCalls).toBe(1);
    await expect(reader.listInbox()).rejects.toThrow(
      'Mailbox reader is closed.',
    );
  });

  it('can close before connecting', async () => {
    const transport = new FakeTransport([]);
    const reader = new ImapMailboxReader(transport);

    await reader.close();

    expect(transport.connectCalls).toBe(0);
    expect(transport.forceCloseCalls).toBe(1);
  });
});

class FakeTransport implements ImapTransport {
  uidValidity = BigInt(7);
  messageSize = 200;
  searchError: unknown;
  logoutError: unknown;
  download: () => AsyncIterable<Uint8Array> = async function* () {
    yield Buffer.from(
      'From: Sender <sender@example.com>\r\n' +
        'To: Studio <studio@example.com>\r\n' +
        'Message-ID: <message-10@example.com>\r\n' +
        'Date: Wed, 09 Sep 2026 09:00:00 +0300\r\n' +
        'Subject: A message\r\n' +
        '\r\n' +
        'Message body',
    );
  };
  connectCalls = 0;
  releaseCalls = 0;
  downloadCalls = 0;
  logoutCalls = 0;
  forceCloseCalls = 0;
  maximumDownloadBytes: number | undefined;

  constructor(readonly uids: number[]) {}

  async connect(): Promise<void> {
    this.connectCalls += 1;
  }

  async lockInbox(): Promise<ImapMailboxLock> {
    return {
      uidValidity: this.uidValidity,
      release: vi.fn(() => {
        this.releaseCalls += 1;
      }),
    };
  }

  async searchUids(beforeUid?: number): Promise<number[]> {
    if (this.searchError) {
      throw this.searchError;
    }
    return this.uids.filter(
      (uid) => beforeUid === undefined || uid < beforeUid,
    );
  }

  async searchUidsNewerThan(afterUid: number): Promise<number[]> {
    if (this.searchError) {
      throw this.searchError;
    }
    return this.uids.filter((uid) => uid > afterUid);
  }

  async fetchSummaries(uids: number[]): Promise<ImapSummaryData[]> {
    return uids.map((uid) => this.summary(uid));
  }

  async fetchMessageMetadata(uid: number): Promise<ImapSummaryData | null> {
    return this.uids.includes(uid) ? this.summary(uid) : null;
  }

  async downloadMessage(
    uid: number,
    maximumBytes: number,
  ): Promise<AsyncIterable<Uint8Array> | null> {
    this.downloadCalls += 1;
    this.maximumDownloadBytes = maximumBytes;
    return this.uids.includes(uid) ? this.download() : null;
  }

  async logout(): Promise<void> {
    this.logoutCalls += 1;
    if (this.logoutError) {
      throw this.logoutError;
    }
  }

  forceClose(): void {
    this.forceCloseCalls += 1;
  }

  private summary(uid: number): ImapSummaryData {
    return {
      uid,
      from: [{ name: 'Sender', address: 'sender@example.com' }],
      subject: `Message ${uid}`,
      receivedAt: new Date('2026-09-09T06:00:00.000Z'),
      flags: new Set(),
      sizeBytes: this.messageSize,
    };
  }
}
