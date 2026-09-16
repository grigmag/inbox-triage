import { describe, expect, it } from 'vitest';
import { createPageToken, parsePageToken } from './page-token';

describe('inbox page tokens', () => {
  it('round-trips a package-generated token', () => {
    const value = { uidValidity: BigInt(42), beforeUid: 500 };

    expect(parsePageToken(createPageToken(value))).toEqual(value);
  });

  it.each([
    '',
    'not-base64!',
    Buffer.from('{}').toString('base64url'),
    Buffer.from(
      JSON.stringify({
        v: 1,
        mailbox: 'INBOX',
        uidValidity: '42',
        beforeUid: 1,
      }),
    ).toString('base64url'),
  ])('rejects an invalid token', (token) => {
    expect(() => parsePageToken(token)).toThrowError(
      expect.objectContaining({ code: 'INVALID_PAGE_TOKEN' }),
    );
  });
});
