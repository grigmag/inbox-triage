import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emailConnectionRepository } from './email-connection.repository';

const mocks = vi.hoisted(() => {
  const returning = vi.fn();
  const onConflictDoUpdate = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));

  return { insert, values, onConflictDoUpdate, returning };
});

vi.mock('server-only', () => ({}));
vi.mock('@/server/db', () => ({ db: { insert: mocks.insert } }));

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
    const saved = { id: 'connection-id', ...input };
    mocks.returning.mockResolvedValue([saved]);

    await expect(emailConnectionRepository.saveForUser(input)).resolves.toBe(
      saved,
    );

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
});
