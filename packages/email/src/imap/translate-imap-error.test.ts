import { describe, expect, it } from 'vitest';
import { EmailClientError } from '../email-client-error';
import { ImapTransportError } from './imap-transport.types';
import { translateImapError } from './translate-imap-error';

describe('translateImapError', () => {
  it.each([
    ['authentication', 'AUTHENTICATION_FAILED'],
    ['connection', 'CONNECTION_FAILED'],
    ['unknown', 'UNKNOWN'],
  ] as const)('maps %s failures to a safe package error', (kind, code) => {
    const translated = translateImapError(new ImapTransportError(kind));

    expect(translated).toBeInstanceOf(EmailClientError);
    expect(translated.code).toBe(code);
    expect(translated).not.toHaveProperty('cause');
  });

  it('preserves package-owned errors', () => {
    const error = new EmailClientError('MESSAGE_NOT_FOUND');

    expect(translateImapError(error)).toBe(error);
  });
});
