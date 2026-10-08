import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emailConnectionRepository } from './email-connection.repository';

const mocks = vi.hoisted(() => {
  const onConflictDoUpdate = vi.fn();
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));
  const limit = vi.fn();
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  return { insert, values, onConflictDoUpdate, select, limit };
});

vi.mock('server-only', () => ({}));
vi.mock('@/server/db', () => ({
  db: { insert: mocks.insert, select: mocks.select },
}));

describe('EmailConnectionRepository.findForUser', () => {
  const row = {
    id: 'connection-id',
    userId: 'local-user-id',
    username: 'user@example.com',
    encryptedPassword: 'encrypted-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the user has no connection', async () => {
    mocks.limit.mockResolvedValue([]);

    await expect(
      emailConnectionRepository.findForUser('local-user-id'),
    ).resolves.toBeNull();
  });

  it('returns a Zoho connection with its hosts', async () => {
    mocks.limit.mockResolvedValue([
      {
        ...row,
        provider: 'zoho',
        imapHost: 'imap.zoho.eu',
        smtpHost: 'smtp.zoho.eu',
      },
    ]);

    await expect(
      emailConnectionRepository.findForUser('local-user-id'),
    ).resolves.toEqual({
      provider: 'zoho',
      imapHost: 'imap.zoho.eu',
      smtpHost: 'smtp.zoho.eu',
      username: row.username,
      encryptedPassword: row.encryptedPassword,
    });
  });

  it('returns a Gmail connection without host fields', async () => {
    mocks.limit.mockResolvedValue([
      { ...row, provider: 'gmail', imapHost: null, smtpHost: null },
    ]);

    await expect(
      emailConnectionRepository.findForUser('local-user-id'),
    ).resolves.toEqual({
      provider: 'gmail',
      username: row.username,
      encryptedPassword: row.encryptedPassword,
    });
  });

  it('rejects a Zoho row that is missing a host', async () => {
    mocks.limit.mockResolvedValue([
      { ...row, provider: 'zoho', imapHost: 'imap.zoho.eu', smtpHost: null },
    ]);

    await expect(
      emailConnectionRepository.findForUser('local-user-id'),
    ).rejects.toThrow('Zoho email connection is missing its hosts.');
  });
});

describe('EmailConnectionRepository.saveForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes the SMTP host in create and conflict-update values', async () => {
    const input = {
      userId: 'local-user-id',
      provider: 'zoho' as const,
      username: 'user@example.com',
      imapHost: 'imap.zoho.eu',
      smtpHost: 'smtp.zoho.eu',
      encryptedPassword: 'encrypted-password',
    };
    await emailConnectionRepository.saveForUser(input);

    expect(mocks.values).toHaveBeenCalledExactlyOnceWith(input);
    expect(mocks.onConflictDoUpdate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        set: {
          provider: input.provider,
          username: input.username,
          imapHost: input.imapHost,
          smtpHost: input.smtpHost,
          encryptedPassword: input.encryptedPassword,
        },
      }),
    );
  });

  it('writes NULL hosts for a Gmail connection on create and update', async () => {
    const input = {
      userId: 'local-user-id',
      provider: 'gmail' as const,
      username: 'user@gmail.com',
      encryptedPassword: 'encrypted-app-password',
    };
    await emailConnectionRepository.saveForUser(input);

    const values = { ...input, imapHost: null, smtpHost: null };
    expect(mocks.values).toHaveBeenCalledExactlyOnceWith(values);
    expect(mocks.onConflictDoUpdate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        set: {
          provider: 'gmail',
          username: input.username,
          imapHost: null,
          smtpHost: null,
          encryptedPassword: input.encryptedPassword,
        },
      }),
    );
  });
});
