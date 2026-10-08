import { describe, expect, it } from 'vitest';
import {
  EMAIL_CONNECTION_FIELD_LIMITS,
  emailConnectionInputSchema,
  zohoEmailConnectionInputSchema,
} from './email-connection-input.schema';

describe('emailConnectionInputSchema', () => {
  it('normalizes the email without changing the password', () => {
    const password = '  pass\tword κωδικός\n';

    expect(
      emailConnectionInputSchema.parse({
        provider: 'zoho',
        email: '  USER@Example.COM  ',
        password,
        imapHost: 'imap.zoho.com',
        smtpHost: '  SMTP.Zoho.EU  ',
      }),
    ).toEqual({
      provider: 'zoho',
      email: 'user@example.com',
      imapHost: 'imap.zoho.com',
      smtpHost: 'SMTP.Zoho.EU',
      password,
    });
  });

  it('accepts a valid email and an empty password', () => {
    expect(
      emailConnectionInputSchema.safeParse({
        provider: 'zoho',
        email: 'user@example.com',
        password: '',
        imapHost: 'imap.zoho.com',
        smtpHost: 'smtp.zoho.com',
      }).success,
    ).toBe(true);
  });

  it.each(['plain-address', 'user@', '@example.com', 'user@example'])(
    'rejects an invalid email: %s',
    (email) => {
      expect(
        emailConnectionInputSchema.safeParse({
          provider: 'zoho',
          email,
          imapHost: 'imap.zoho.com',
          smtpHost: 'smtp.zoho.com',
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
        provider: 'zoho',
        email,
        imapHost: 'imap.zoho.com',
        smtpHost: 'smtp.zoho.com',
        password: 'secret',
      }).success,
    ).toBe(true);
    expect(
      emailConnectionInputSchema.safeParse({
        provider: 'zoho',
        email: `a${email}`,
        password: 'secret',
        imapHost: 'imap.zoho.com',
        smtpHost: 'smtp.zoho.com',
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
      zohoEmailConnectionInputSchema.parse({
        provider: 'zoho',
        email: 'user@example.com',
        password: '',
        imapHost: `  ${imapHost}  `,
        smtpHost: 'smtp.zoho.com',
      }).imapHost,
    ).toBe(imapHost);
  });
  it.each(['', ' \t\n', undefined, null, 993])(
    'rejects an empty or non-string host: %s',
    (imapHost) => {
      const result = emailConnectionInputSchema.safeParse({
        provider: 'zoho',
        email: 'user@example.com',
        password: '',
        imapHost,
        smtpHost: 'smtp.zoho.com',
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

describe('SMTP host validation', () => {
  it.each([
    'smtp.zoho.eu',
    'SMTP.Example.COM',
    'https://arbitrary host:123/path',
    '127.0.0.1',
    'host with spaces',
  ])('accepts unrestricted nonempty text: %s', (smtpHost) => {
    expect(
      zohoEmailConnectionInputSchema.parse({
        provider: 'zoho',
        email: 'user@example.com',
        imapHost: 'imap.zoho.com',
        password: '',
        smtpHost: `  ${smtpHost}  `,
      }).smtpHost,
    ).toBe(smtpHost);
  });

  it.each(['', ' \t\n', undefined, null, 465])(
    'rejects an empty or non-string host: %s',
    (smtpHost) => {
      const result = emailConnectionInputSchema.safeParse({
        provider: 'zoho',
        email: 'user@example.com',
        imapHost: 'imap.zoho.com',
        password: '',
        smtpHost,
      });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues).toEqual([
          expect.objectContaining({
            path: ['smtpHost'],
            message: 'Enter an SMTP host.',
          }),
        ]);
    },
  );
});

describe('Gmail connection validation', () => {
  it('removes all whitespace from the app password and keeps no hosts', () => {
    expect(
      emailConnectionInputSchema.parse({
        provider: 'gmail',
        email: ' User@Gmail.com ',
        password: ' abcd efgh\tijkl\nmnop ',
        imapHost: 'imap.zoho.com',
        smtpHost: 'smtp.zoho.com',
      }),
    ).toEqual({
      provider: 'gmail',
      email: 'user@gmail.com',
      password: 'abcdefghijklmnop',
    });
  });

  it.each(['', ' \t\n'])(
    'accepts an empty app password for an unchanged connection: %j',
    (password) => {
      expect(
        emailConnectionInputSchema.parse({
          provider: 'gmail',
          email: 'user@gmail.com',
          password,
        }).password,
      ).toBe('');
    },
  );

  it.each(['abcdefghijklmno', 'abcdefghijklmnopq', 'my normal pass'])(
    'rejects an app password that does not have 16 characters: %s',
    (password) => {
      const result = emailConnectionInputSchema.safeParse({
        provider: 'gmail',
        email: 'user@gmail.com',
        password,
      });

      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues).toEqual([
          expect.objectContaining({
            path: ['password'],
            message: 'A Gmail app password has 16 characters.',
          }),
        ]);
    },
  );

  it('rejects an unknown provider', () => {
    expect(
      emailConnectionInputSchema.safeParse({
        provider: 'outlook',
        email: 'user@example.com',
        password: 'secret',
      }).success,
    ).toBe(false);
  });
});
