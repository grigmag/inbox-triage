import { z } from 'zod';

export const EMAIL_CONNECTION_FIELD_LIMITS = {
  email: 254,
  gmailAppPassword: 16,
} as const;

export const EMAIL_CONNECTION_VALIDATION_MESSAGES = {
  email: 'Enter a valid email address.',
  emailTooLong: 'Email must be 254 characters or fewer.',
  imapHostRequired: 'Enter an IMAP host.',
  smtpHostRequired: 'Enter an SMTP host.',
  zohoPasswordRequired: 'Enter your Zoho Mail password.',
  gmailPasswordRequired: 'Enter your Gmail app password.',
  gmailPasswordLength: 'A Gmail app password has 16 characters.',
} as const;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(
    EMAIL_CONNECTION_FIELD_LIMITS.email,
    EMAIL_CONNECTION_VALIDATION_MESSAGES.emailTooLong,
  )
  .pipe(z.email({ error: EMAIL_CONNECTION_VALIDATION_MESSAGES.email }));

export const zohoEmailConnectionInputSchema = z.object({
  provider: z.literal('zoho'),
  email: emailSchema,
  imapHost: z
    .string({ error: EMAIL_CONNECTION_VALIDATION_MESSAGES.imapHostRequired })
    .trim()
    .min(1, EMAIL_CONNECTION_VALIDATION_MESSAGES.imapHostRequired),
  smtpHost: z
    .string({ error: EMAIL_CONNECTION_VALIDATION_MESSAGES.smtpHostRequired })
    .trim()
    .min(1, EMAIL_CONNECTION_VALIDATION_MESSAGES.smtpHostRequired),
  // Passwords are deliberately not trimmed or otherwise transformed.
  password: z.string(),
});

const gmailEmailConnectionInputSchema = z.object({
  provider: z.literal('gmail'),
  email: emailSchema,
  // Google shows app passwords in groups separated by spaces, so all
  // whitespace is removed. Only the length is checked because Google doesn't
  // document the character set. An empty password keeps the saved one.
  password: z
    .string()
    .transform((password) => password.replace(/\s/g, ''))
    .refine(
      (password) =>
        password === '' ||
        password.length === EMAIL_CONNECTION_FIELD_LIMITS.gmailAppPassword,
      EMAIL_CONNECTION_VALIDATION_MESSAGES.gmailPasswordLength,
    ),
});

export const emailConnectionInputSchema = z.discriminatedUnion('provider', [
  zohoEmailConnectionInputSchema,
  gmailEmailConnectionInputSchema,
]);

export type EmailConnectionInput = z.output<typeof emailConnectionInputSchema>;

export type EmailConnectionInputField =
  'provider' | 'email' | 'imapHost' | 'smtpHost' | 'password';

export function passwordRequiredMessage(
  provider: EmailConnectionInput['provider'],
): string {
  return provider === 'gmail'
    ? EMAIL_CONNECTION_VALIDATION_MESSAGES.gmailPasswordRequired
    : EMAIL_CONNECTION_VALIDATION_MESSAGES.zohoPasswordRequired;
}
