import { describe, expect, it, vi } from 'vitest';
import { ImapTransportError } from './imap-transport.types';
import {
  ImapFlowTransport,
  translateImapStreamErrors,
} from './imapflow-transport';

describe('translateImapStreamErrors', () => {
  it('classifies a connection failure raised during stream iteration', async () => {
    const source = async function* () {
      yield Buffer.from('partial message');
      throw Object.assign(new Error('sensitive provider response'), {
        code: 'ECONNRESET',
      });
    };

    const iterator =
      translateImapStreamErrors(source())[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toMatchObject({ done: false });
    await expect(iterator.next()).rejects.toEqual(
      new ImapTransportError('connection'),
    );
  });
});

const imapMocks = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock('imapflow', () => ({
  ImapFlow: class {
    on = vi.fn();
    search = imapMocks.search;
  },
}));

describe('ImapFlowTransport newer-than search', () => {
  const transport = new ImapFlowTransport({
    host: 'imap.zoho.com',
    port: 993,
    secure: true,
    username: 'studio@example.com',
    password: 'secret',
  });

  it('uses an exclusive finite UID range and requests UID results', async () => {
    imapMocks.search.mockResolvedValueOnce([11, 12]);
    await expect(transport.searchUidsNewerThan(10)).resolves.toEqual([11, 12]);
    expect(imapMocks.search).toHaveBeenLastCalledWith(
      { uid: '11:4294967295' },
      { uid: true },
    );
  });

  it('normalizes an empty search result', async () => {
    imapMocks.search.mockResolvedValueOnce(false);
    await expect(transport.searchUidsNewerThan(100)).resolves.toEqual([]);
  });

  it('skips searching beyond the maximum IMAP UID', async () => {
    imapMocks.search.mockClear();
    await expect(transport.searchUidsNewerThan(4_294_967_295)).resolves.toEqual(
      [],
    );
    expect(imapMocks.search).not.toHaveBeenCalled();
  });

  it('hides and classifies provider errors', async () => {
    imapMocks.search.mockRejectedValueOnce(
      Object.assign(new Error('secret'), { code: 'ECONNRESET' }),
    );
    await expect(transport.searchUidsNewerThan(10)).rejects.toEqual(
      new ImapTransportError('connection'),
    );
  });
});
