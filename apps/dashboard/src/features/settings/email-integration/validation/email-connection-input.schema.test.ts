import { describe, expect, it } from 'vitest';
import {
  EMAIL_CONNECTION_FIELD_LIMITS,
  emailConnectionInputSchema,
} from './email-connection-input.schema';

describe('emailConnectionInputSchema', () => {
  it('normalizes the email without changing the password', () => {
    const password = '  pass\tword κωδικός\n';

    expect(
      emailConnectionInputSchema.parse({
        email: '  USER@Example.COM  ',
        password,
        imapHost: 'imap.zoho.com',
      }),
    ).toEqual({
      email: 'user@example.com',
      imapHost: 'imap.zoho.com',
      password,
    });
  });

  it('accepts a valid email and an empty password', () => {
    expect(
      emailConnectionInputSchema.safeParse({
        email: 'user@example.com',
        password: '',
        imapHost: 'imap.zoho.com',
      }).success,
    ).toBe(true);
  });

  it.each(['plain-address', 'user@', '@example.com', 'user@example'])(
    'rejects an invalid email: %s',
    (email) => {
      expect(
        emailConnectionInputSchema.safeParse({
          email,
          imapHost: 'imap.zoho.com',
          password: 'secret',
        }).success,
      ).toBe(false);
    },
  );

  it('enforces the 254-character email limit', () => {
    const localPart = 'a'.repeat(EMAIL_CONNECTION_FIELD_LIMITS.email - 12);
    const email = `${localPart}@example.com`;

    expect(email).toHaveLength(EMAIL_CONNECTION_FIELD_LIMITS.email);
    expect(
      emailConnectionInputSchema.safeParse({
        email,
        imapHost: 'imap.zoho.com',
        password: 'secret',
      }).success,
    ).toBe(true);
    expect(
      emailConnectionInputSchema.safeParse({
        email: `a${email}`,
        password: 'secret',
        imapHost: 'imap.zoho.com',
      }).success,
    ).toBe(false);
  });
});

describe('IMAP host validation', () => {
  it.each([
    'imap.zoho.eu',
    'IMAP.Example.COM',
    'https://arbitrary host:123/path',
    '127.0.0.1',
    'host with spaces',
  ])('accepts unrestricted nonempty text: %s', (imapHost) => {
    expect(
      emailConnectionInputSchema.parse({
        email: 'user@example.com',
        password: '',
        imapHost: `  ${imapHost}  `,
      }).imapHost,
    ).toBe(imapHost);
  });
  it.each(['', ' \t\n', undefined, null, 993])(
    'rejects an empty or non-string host: %s',
    (imapHost) => {
      const result = emailConnectionInputSchema.safeParse({
        email: 'user@example.com',
        password: '',
        imapHost,
      });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues).toEqual([
          expect.objectContaining({
            path: ['imapHost'],
            message: 'Enter an IMAP host.',
          }),
        ]);
    },
  );
});
