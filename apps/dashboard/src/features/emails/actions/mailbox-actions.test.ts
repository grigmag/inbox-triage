import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadInboxAction } from './load-inbox.action';
import { loadOlderInboxAction } from './load-older-inbox.action';
import { loadNewerInboxAction } from './load-newer-inbox.action';
import { loadEmailMessageAction } from './load-email-message.action';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findForUser: vi.fn(),
  decrypt: vi.fn(),
  createMailboxReader: vi.fn(),
  listInbox: vi.fn(),
  listInboxNewerThan: vi.fn(),
  getMessage: vi.fn(),
  close: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/server/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock(
  '@/features/settings/email-integration/repositories/email-connection.repository',
  () => ({
    emailConnectionRepository: { findForUser: mocks.findForUser },
  }),
);
vi.mock('@/lib/crypto/crypto.service', () => ({
  cryptoService: { decryptSignedString: mocks.decrypt },
}));
vi.mock('@inbox-triage/email', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@inbox-triage/email')>()),
  createMailboxReader: mocks.createMailboxReader,
}));

const summary = {
  ref: 'opaque-message-ref',
  from: [{ name: 'Sender', address: 'sender@example.com', unused: 'private' }],
  subject: 'Production request',
  receivedAt: new Date('2026-09-14T08:00:00Z'),
  isRead: false,
  sizeBytes: 100,
  unused: 'private',
};
const summaryDto = {
  ref: summary.ref,
  from: [{ name: 'Sender', address: 'sender@example.com' }],
  subject: summary.subject,
  receivedAt: '2026-09-14T08:00:00.000Z',
  isRead: false,
};
const message = {
  ...summary,
  messageId: 'private-message-id',
  inReplyTo: ['private-parent-id'],
  references: ['private-root-id', 'private-parent-id'],
  to: [{ name: null, address: 'recipient@example.com', unused: 'private' }],
  cc: [],
  replyTo: [{ name: null, address: 'reply@example.com', unused: 'private' }],
  sentAt: new Date('2026-09-14T07:00:00Z'),
  text: 'First line\nSecond line',
  html: '<script>private HTML</script>',
};
const failure = {
  status: 'failure',
  message: 'Unable to load emails. Please try again or check Email settings.',
};
const operations = [
  {
    name: 'newest inbox',
    run: () => loadInboxAction(),
    method: mocks.listInbox,
    args: [{ limit: 20 }],
  },
  {
    name: 'older inbox',
    run: () => loadOlderInboxAction('opaque-page-token'),
    method: mocks.listInbox,
    args: [{ limit: 20, pageToken: 'opaque-page-token' }],
  },
  {
    name: 'newer inbox',
    run: () => loadNewerInboxAction(summary.ref),
    method: mocks.listInboxNewerThan,
    args: [summary.ref],
  },
  {
    name: 'full message',
    run: () => loadEmailMessageAction(summary.ref),
    method: mocks.getMessage,
    args: [summary.ref],
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.requireUser.mockResolvedValue({ id: 'local-user-id' });
  mocks.findForUser.mockResolvedValue({
    userId: 'local-user-id',
    provider: 'zoho',
    imapHost: 'imap.zoho.eu',
    username: 'mailbox@example.com',
    encryptedPassword: 'encrypted-password',
  });
  mocks.decrypt.mockReturnValue(' plaintext password ');
  mocks.createMailboxReader.mockReturnValue({
    listInbox: mocks.listInbox,
    listInboxNewerThan: mocks.listInboxNewerThan,
    getMessage: mocks.getMessage,
    close: mocks.close,
  });
  mocks.listInbox.mockResolvedValue({
    messages: [summary],
    nextPageToken: 'next-token',
  });
  mocks.listInboxNewerThan.mockResolvedValue([summary]);
  mocks.getMessage.mockResolvedValue(message);
  mocks.close.mockResolvedValue(undefined);
});

describe.each(operations)('$name composition', ({ run, method, args }) => {
  it('authenticates, loads only the local user connection, runs one operation, and closes', async () => {
    expect((await run()).status).toBe('success');
    expect(mocks.requireUser).toHaveBeenCalledTimes(1);
    expect(mocks.findForUser).toHaveBeenCalledExactlyOnceWith('local-user-id');
    expect(mocks.decrypt).toHaveBeenCalledExactlyOnceWith('encrypted-password');
    expect(mocks.createMailboxReader).toHaveBeenCalledExactlyOnceWith({
      provider: 'zoho',
      imapHost: 'imap.zoho.eu',
      credentials: {
        username: 'mailbox@example.com',
        password: ' plaintext password ',
      },
    });
    expect(method).toHaveBeenCalledExactlyOnceWith(...args);
    expect(
      mocks.listInbox.mock.calls.length +
        mocks.listInboxNewerThan.mock.calls.length +
        mocks.getMessage.mock.calls.length,
    ).toBe(1);
    expect(mocks.close).toHaveBeenCalledTimes(1);
    expect(mocks.close.mock.invocationCallOrder[0]).toBeGreaterThan(
      method.mock.invocationCallOrder[0],
    );
  });

  it('does not create a mailbox reader when there is no saved connection', async () => {
    mocks.findForUser.mockResolvedValue(null);
    await expect(run()).resolves.toEqual({ status: 'noConnection' });
    expect(mocks.decrypt).not.toHaveBeenCalled();
    expect(mocks.createMailboxReader).not.toHaveBeenCalled();
    expect(method).not.toHaveBeenCalled();
  });

  it('propagates authentication rejection before accessing credentials', async () => {
    const rejection = new Error('authentication required');
    mocks.requireUser.mockRejectedValue(rejection);
    await expect(run()).rejects.toBe(rejection);
    expect(mocks.findForUser).not.toHaveBeenCalled();
    expect(mocks.createMailboxReader).not.toHaveBeenCalled();
  });

  it.each(['findForUser', 'decrypt', 'createMailboxReader'] as const)(
    'hides %s failures without running an operation',
    async (stage) => {
      const error = new Error(
        'mailbox@example.com encrypted-password plaintext password',
      );
      if (stage === 'findForUser') mocks[stage].mockRejectedValue(error);
      else
        mocks[stage].mockImplementation(() => {
          throw error;
        });
      await expect(run()).resolves.toEqual(failure);
      expect(method).not.toHaveBeenCalled();
      expect(mocks.close).not.toHaveBeenCalled();
    },
  );

  it('closes after provider failures and returns no provider object or credentials', async () => {
    method.mockRejectedValue({
      code: 'AUTHENTICATION_FAILED',
      password: 'secret',
      message: 'provider internals',
    });
    await expect(run()).resolves.toEqual(failure);
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it('returns a safe failure if cleanup rejects', async () => {
    mocks.close.mockRejectedValue(new Error('secret transport details'));
    await expect(run()).resolves.toEqual(failure);
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });
});

it('returns only summary DTO fields and the unchanged page token', async () => {
  const expected = {
    status: 'success',
    data: { messages: [summaryDto], nextPageToken: 'next-token' },
  };
  await expect(loadInboxAction()).resolves.toEqual(expected);
  await expect(loadOlderInboxAction('opaque-page-token')).resolves.toEqual(
    expected,
  );
  await expect(loadNewerInboxAction(summary.ref)).resolves.toEqual({
    status: 'success',
    data: [summaryDto],
  });
});

it('returns only plain-text detail fields and explicitly mapped recipients', async () => {
  await expect(loadEmailMessageAction(summary.ref)).resolves.toEqual({
    status: 'success',
    data: {
      ...summaryDto,
      to: [{ name: null, address: 'recipient@example.com' }],
      cc: [],
      replyTo: [{ name: null, address: 'reply@example.com' }],
      sentAt: '2026-09-14T07:00:00.000Z',
      text: 'First line\nSecond line',
    },
  });
});

it('preserves absent plain text and sent dates without converting HTML', async () => {
  mocks.getMessage.mockResolvedValue({ ...message, text: null, sentAt: null });
  await expect(loadEmailMessageAction(summary.ref)).resolves.toMatchObject({
    status: 'success',
    data: { text: null, sentAt: null },
  });
});

it('closes when DTO mapping fails', async () => {
  mocks.getMessage.mockResolvedValue({
    ...message,
    receivedAt: new Date('invalid'),
  });
  await expect(loadEmailMessageAction(summary.ref)).resolves.toEqual(failure);
  expect(mocks.close).toHaveBeenCalledTimes(1);
});

it('loads fresh credentials for each call using the current authenticated user', async () => {
  await loadInboxAction();
  mocks.requireUser.mockResolvedValue({ id: 'other-local-user-id' });
  await loadInboxAction();
  expect(mocks.findForUser.mock.calls).toEqual([
    ['local-user-id'],
    ['other-local-user-id'],
  ]);
  expect(mocks.createMailboxReader).toHaveBeenCalledTimes(2);
  expect(mocks.close).toHaveBeenCalledTimes(2);
});

// Opaque values are validated by the package; actions reject missing or non-string inputs.
describe.each([
  { name: 'older inbox', run: loadOlderInboxAction },
  { name: 'newer inbox', run: loadNewerInboxAction },
  { name: 'full message', run: loadEmailMessageAction },
])('$name input boundary', ({ run }) => {
  it.each(['', null, undefined, { userId: 'another-user' }])(
    'rejects invalid input %j after authentication without accessing credentials',
    async (input) => {
      await expect(run(input as string)).resolves.toEqual(failure);
      expect(mocks.requireUser).toHaveBeenCalledTimes(1);
      expect(mocks.findForUser).not.toHaveBeenCalled();
      expect(mocks.createMailboxReader).not.toHaveBeenCalled();
    },
  );
});
