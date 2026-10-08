import type { EmailProvider } from '@inbox-triage/email';

/** The provider rejected the saved mailbox credentials. */
export class MailboxCredentialsRejectedError extends Error {
  constructor(
    readonly provider: EmailProvider,
    options?: ErrorOptions,
  ) {
    super(`The ${provider} mailbox rejected the saved credentials.`, options);
    this.name = 'MailboxCredentialsRejectedError';
  }
}
