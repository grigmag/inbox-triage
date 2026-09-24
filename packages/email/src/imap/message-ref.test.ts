import { describe, expect, it } from 'vitest';
import { MailboxReaderError } from '../mailbox-reader-error';
import { createMessageRef, parseMessageRef } from './message-ref';

describe('message references', () => {
  it('round-trips a package-generated reference', () => {
    const value = { uidValidity: BigInt(42), uid: 901 };

    expect(parseMessageRef(createMessageRef(value))).toEqual(value);
  });

  it.each([
    '',
    'not-base64!',
    Buffer.from('{}').toString('base64url'),
    Buffer.from(
      JSON.stringify({ v: 1, mailbox: 'INBOX', uidValidity: '42', uid: 0 }),
    ).toString('base64url'),
  ])('rejects an invalid reference without exposing its contents', (ref) => {
    expect(() => parseMessageRef(ref)).toThrowError(
      expect.objectContaining<Partial<MailboxReaderError>>({
        code: 'INVALID_MESSAGE_REF',
        message: 'The message reference is invalid.',
      }),
    );
  });
});
