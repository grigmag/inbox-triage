import { describe, expect, it } from 'vitest';
import { getMailboxFailureMessage } from './get-mailbox-failure-message';

describe('getMailboxFailureMessage', () => {
  it('points to Email settings when no mailbox is connected', () => {
    expect(getMailboxFailureMessage({ status: 'noConnection' })).toBe(
      'Connect your mailbox in Email settings.',
    );
  });

  it('uses the failure message otherwise', () => {
    expect(
      getMailboxFailureMessage({ status: 'failure', message: 'Timed out.' }),
    ).toBe('Timed out.');
  });
});
