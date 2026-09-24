import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cryptoService } from '@/lib/crypto/crypto.service';
import { saveEmailConnectionUseCase } from './save-email-connection.use-case';

const repository = vi.hoisted(() => ({
  findForUser: vi.fn(),
  saveForUser: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/server/env', () => ({
  env: {
    APP_ENCRYPTION_KEY: '00'.repeat(32),
    APP_HASHING_KEY: '11'.repeat(32),
  },
}));
vi.mock('../repositories/email-connection.repository', () => ({
  emailConnectionRepository: repository,
}));

describe('saveEmailConnectionUseCase', () => {
  const input = {
    userId: 'local-user-id',
    provider: 'zoho' as const,
    username: ' User@Example.COM ',
    imapHost: 'imap.zoho.com',
    smtpHost: 'smtp.zoho.com',
    password: '  secret κωδικός\n',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    repository.findForUser.mockReset();
    repository.saveForUser.mockReset();
  });

  it('creates a connection with an encrypted password and normalized username', async () => {
    repository.findForUser.mockResolvedValue(null);
    repository.saveForUser.mockResolvedValue({});

    await expect(saveEmailConnectionUseCase(input)).resolves.toBe('saved');

    expect(repository.findForUser).toHaveBeenCalledExactlyOnceWith(
      input.userId,
    );
    expect(repository.saveForUser).toHaveBeenCalledExactlyOnceWith({
      userId: input.userId,
      provider: 'zoho',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      username: 'user@example.com',
      encryptedPassword: expect.any(String),
    });
    const saved = repository.saveForUser.mock.calls[0][0];
    expect(saved.encryptedPassword).not.toBe(input.password);
    expect(cryptoService.decryptSignedString(saved.encryptedPassword)).toBe(
      input.password,
    );
  });

  it('reuses the saved ciphertext when the password is blank', async () => {
    repository.findForUser.mockResolvedValue({
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      username: 'user@example.com',
      encryptedPassword: 'existing-ciphertext',
    });

    await expect(
      saveEmailConnectionUseCase({ ...input, password: '' }),
    ).resolves.toBe('unchanged');
    expect(repository.saveForUser).not.toHaveBeenCalled();
  });

  it('updates the username while retaining the saved ciphertext', async () => {
    repository.findForUser.mockResolvedValue({
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      username: 'old@example.com',
      encryptedPassword: 'existing-ciphertext',
    });
    repository.saveForUser.mockResolvedValue({});

    await expect(
      saveEmailConnectionUseCase({ ...input, password: '' }),
    ).resolves.toBe('saved');
    expect(repository.saveForUser).toHaveBeenCalledExactlyOnceWith({
      userId: input.userId,
      provider: 'zoho',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      username: 'user@example.com',
      encryptedPassword: 'existing-ciphertext',
    });
  });

  it('saves a host-only change and preserves the ciphertext', async () => {
    repository.findForUser.mockResolvedValue({
      username: 'user@example.com',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      encryptedPassword: 'existing-ciphertext',
    });
    const encrypt = vi.spyOn(cryptoService, 'encryptAndSignString');
    await expect(
      saveEmailConnectionUseCase({
        ...input,
        imapHost: '  IMAP.zoho.eu  ',
        password: '',
      }),
    ).resolves.toBe('saved');
    expect(repository.saveForUser).toHaveBeenCalledExactlyOnceWith({
      userId: input.userId,
      provider: 'zoho',
      username: 'user@example.com',
      imapHost: 'IMAP.zoho.eu',
      smtpHost: 'smtp.zoho.com',
      encryptedPassword: 'existing-ciphertext',
    });
    expect(encrypt).not.toHaveBeenCalled();
  });

  it('saves an SMTP-host-only change and preserves the ciphertext', async () => {
    repository.findForUser.mockResolvedValue({
      username: 'user@example.com',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      encryptedPassword: 'existing-ciphertext',
    });
    const encrypt = vi.spyOn(cryptoService, 'encryptAndSignString');

    await expect(
      saveEmailConnectionUseCase({
        ...input,
        smtpHost: '  SMTP.zoho.eu  ',
        password: '',
      }),
    ).resolves.toBe('saved');
    expect(repository.saveForUser).toHaveBeenCalledExactlyOnceWith({
      userId: input.userId,
      provider: 'zoho',
      username: 'user@example.com',
      imapHost: 'imap.zoho.com',
      smtpHost: 'SMTP.zoho.eu',
      encryptedPassword: 'existing-ciphertext',
    });
    expect(encrypt).not.toHaveBeenCalled();
  });

  it('treats host whitespace normalization as unchanged', async () => {
    repository.findForUser.mockResolvedValue({
      username: 'user@example.com',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      encryptedPassword: 'existing-ciphertext',
    });
    await expect(
      saveEmailConnectionUseCase({
        ...input,
        imapHost: '  imap.zoho.com  ',
        smtpHost: '  smtp.zoho.com  ',
        password: '',
      }),
    ).resolves.toBe('unchanged');
    expect(repository.saveForUser).not.toHaveBeenCalled();
  });

  it('replaces the ciphertext for a non-empty password', async () => {
    repository.findForUser.mockResolvedValue({
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      username: 'old@example.com',
      encryptedPassword: 'existing-ciphertext',
    });
    repository.saveForUser.mockResolvedValue({});

    await expect(
      saveEmailConnectionUseCase({ ...input, password: ' new password ' }),
    ).resolves.toBe('saved');
    const saved = repository.saveForUser.mock.calls[0][0];
    expect(saved.encryptedPassword).not.toBe('existing-ciphertext');
    expect(cryptoService.decryptSignedString(saved.encryptedPassword)).toBe(
      ' new password ',
    );
  });

  it('requires a password when no connection exists', async () => {
    repository.findForUser.mockResolvedValue(null);

    await expect(
      saveEmailConnectionUseCase({ ...input, password: '' }),
    ).resolves.toBe('password_required');
    expect(repository.saveForUser).not.toHaveBeenCalled();
  });

  it('uses the authenticated user ID for every repository operation', async () => {
    repository.findForUser.mockResolvedValue(null);
    repository.saveForUser.mockResolvedValue({});

    await saveEmailConnectionUseCase(input);

    expect(repository.findForUser).toHaveBeenCalledWith('local-user-id');
    expect(repository.saveForUser.mock.calls[0][0].userId).toBe(
      'local-user-id',
    );
  });

  it('propagates repository failures without attempting to expose credentials', async () => {
    repository.findForUser.mockRejectedValue(new Error('database failed'));

    await expect(saveEmailConnectionUseCase(input)).rejects.toThrow(
      'database failed',
    );
    expect(repository.saveForUser).not.toHaveBeenCalled();
  });

  it('does not write when encryption fails', async () => {
    repository.findForUser.mockResolvedValue(null);
    vi.spyOn(cryptoService, 'encryptAndSignString').mockImplementation(() => {
      throw new Error('Encryption failed');
    });

    await expect(saveEmailConnectionUseCase(input)).rejects.toThrow(
      'Encryption failed',
    );
    expect(repository.saveForUser).not.toHaveBeenCalled();
  });
});
