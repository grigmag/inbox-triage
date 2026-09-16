import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmailClient } from './create-email-client';

const mocks = vi.hoisted(() => ({ transport: vi.fn() }));
vi.mock('./imap/imapflow-transport', () => ({
  ImapFlowTransport: class {
    constructor(config: unknown) {
      mocks.transport(config);
    }
  },
}));

describe('createEmailClient endpoint configuration', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    'imap.zoho.com',
    'imap.zoho.eu',
    'IMAP.arbitrary.example',
    'host with spaces',
  ])('passes %s to the transport with fixed TLS and port', (imapHost) => {
    createEmailClient({
      provider: 'zoho',
      imapHost,
      credentials: {
        username: 'studio@example.com',
        password: ' exact password ',
      },
    });
    expect(mocks.transport).toHaveBeenCalledExactlyOnceWith({
      host: imapHost,
      port: 993,
      secure: true,
      username: 'studio@example.com',
      password: ' exact password ',
    });
  });
});
