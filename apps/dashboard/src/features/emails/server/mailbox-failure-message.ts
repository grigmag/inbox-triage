import type { EmailProvider } from '@inbox-triage/email';
import { MailboxCredentialsRejectedError } from './mailbox-credentials-rejected-error';

const CREDENTIALS_REJECTED_MESSAGES = {
  gmail:
    'Gmail rejected the saved app password. If you changed your Google password, create a new app password and update it in Email settings.',
  zoho: 'Zoho rejected the saved password. Update it in Email settings.',
} as const satisfies Record<EmailProvider, string>;

/** The provider-specific message for rejected credentials, otherwise `fallback`. */
export function mailboxFailureMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof MailboxCredentialsRejectedError
    ? CREDENTIALS_REJECTED_MESSAGES[error.provider]
    : fallback;
}
