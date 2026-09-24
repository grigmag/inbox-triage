import { describe, expect, it } from 'vitest';
import { MailboxReaderError } from '../mailbox-reader-error';
import { ImapTransportError } from './imap-transport.types';
import { translateImapError } from './translate-imap-error';

describe('translateImapError', () => {
  it.each([
    ['authentication', 'AUTHENTICATION_FAILED'],
    ['connection', 'CONNECTION_FAILED'],
    ['unknown', 'UNKNOWN'],
  ] as const)('maps %s failures to a safe package error', (kind, code) => {
    const translated = translateImapError(new ImapTransportError(kind));

    expect(translated).toBeInstanceOf(MailboxReaderError);
    expect(translated.code).toBe(code);
    expect(translated).not.toHaveProperty('cause');
  });

  it('carries transport diagnostics into the package error', () => {
    const diagnostic = { providerErrorCode: 'ETIMEOUT' };

    expect(
      translateImapError(new ImapTransportError('connection', diagnostic))
        .diagnostic,
    ).toEqual(diagnostic);
  });

  it('preserves package-owned errors', () => {
    const error = new MailboxReaderError('MESSAGE_NOT_FOUND');

    expect(translateImapError(error)).toBe(error);
  });
});
