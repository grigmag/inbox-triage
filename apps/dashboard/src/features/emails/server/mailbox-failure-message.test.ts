import { MailboxReaderError } from '@inbox-triage/email';
import { describe, expect, it, vi } from 'vitest';
import { MailboxCredentialsRejectedError } from './mailbox-credentials-rejected-error';
import { mailboxFailureMessage } from './mailbox-failure-message';

vi.mock('server-only', () => ({}));

describe('mailboxFailureMessage', () => {
  it.each([
    [
      'gmail',
      'Gmail rejected the saved app password. If you changed your Google password, create a new app password and update it in Email settings.',
    ],
    ['zoho', 'Zoho rejected the saved password. Update it in Email settings.'],
  ] as const)('names %s for rejected credentials', (provider, message) => {
    expect(
      mailboxFailureMessage(
        new MailboxCredentialsRejectedError(provider),
        'fallback',
      ),
    ).toBe(message);
  });

  it.each([
    new MailboxReaderError('AUTHENTICATION_FAILED'),
    new Error('network'),
    'not an error',
  ])('uses the fallback for other failures: %s', (error) => {
    expect(mailboxFailureMessage(error, 'fallback')).toBe('fallback');
  });
});
