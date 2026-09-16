import { z } from 'zod';

export const EMAIL_CONNECTION_FIELD_LIMITS = {
  email: 254,
} as const;

export const EMAIL_CONNECTION_VALIDATION_MESSAGES = {
  email: 'Enter a valid email address.',
  emailTooLong: 'Email must be 254 characters or fewer.',
  imapHostRequired: 'Enter an IMAP host.',
  passwordRequired: 'Enter your Zoho IMAP password.',
} as const;

export const emailConnectionInputSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(
      EMAIL_CONNECTION_FIELD_LIMITS.email,
      EMAIL_CONNECTION_VALIDATION_MESSAGES.emailTooLong,
    )
    .pipe(z.email({ error: EMAIL_CONNECTION_VALIDATION_MESSAGES.email })),
  imapHost: z
    .string({ error: EMAIL_CONNECTION_VALIDATION_MESSAGES.imapHostRequired })
    .trim()
    .min(1, EMAIL_CONNECTION_VALIDATION_MESSAGES.imapHostRequired),
  // Passwords are deliberately not trimmed or otherwise transformed.
  password: z.string(),
});

export type EmailConnectionInput = z.output<typeof emailConnectionInputSchema>;
