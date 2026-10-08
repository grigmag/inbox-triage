import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cryptoService } from '@/lib/crypto/crypto.service';
import { saveEmailConnectionUseCase } from './save-email-connection.use-case';

const repository = vi.hoisted(() => ({
  findForUser: vi.fn(),
  saveForUser: vi.fn(),
}));
const email = vi.hoisted(() => ({ checkEmailConnection: vi.fn() }));

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
vi.mock('@inbox-triage/email', () => email);

// Real ciphertext, so a blank-password save can decrypt it for the check.
const zohoCiphertext = cryptoService.encryptAndSignString(
  'saved zoho password',
);
const gmailCiphertext = cryptoService.encryptAndSignString('savedgmailpasswd');

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
    email.checkEmailConnection.mockReset();
    email.checkEmailConnection.mockResolvedValue({ status: 'verified' });
  });

  it('creates a connection with an encrypted password and normalized username', async () => {
    repository.findForUser.mockResolvedValue(null);
    repository.saveForUser.mockResolvedValue(undefined);

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
      provider: 'zoho',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      username: 'user@example.com',
      encryptedPassword: zohoCiphertext,
    });

    await expect(
      saveEmailConnectionUseCase({ ...input, password: '' }),
    ).resolves.toBe('unchanged');
    expect(repository.saveForUser).not.toHaveBeenCalled();
  });

  it('updates the username while retaining the saved ciphertext', async () => {
    repository.findForUser.mockResolvedValue({
      provider: 'zoho',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      username: 'old@example.com',
      encryptedPassword: zohoCiphertext,
    });
    repository.saveForUser.mockResolvedValue(undefined);

    await expect(
      saveEmailConnectionUseCase({ ...input, password: '' }),
    ).resolves.toBe('saved');
    expect(repository.saveForUser).toHaveBeenCalledExactlyOnceWith({
      userId: input.userId,
      provider: 'zoho',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      username: 'user@example.com',
      encryptedPassword: zohoCiphertext,
    });
  });

  it('saves a host-only change and preserves the ciphertext', async () => {
    repository.findForUser.mockResolvedValue({
      provider: 'zoho',
      username: 'user@example.com',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      encryptedPassword: zohoCiphertext,
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
      encryptedPassword: zohoCiphertext,
    });
    expect(encrypt).not.toHaveBeenCalled();
  });

  it('saves an SMTP-host-only change and preserves the ciphertext', async () => {
    repository.findForUser.mockResolvedValue({
      provider: 'zoho',
      username: 'user@example.com',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      encryptedPassword: zohoCiphertext,
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
      encryptedPassword: zohoCiphertext,
    });
    expect(encrypt).not.toHaveBeenCalled();
  });

  it('treats host whitespace normalization as unchanged', async () => {
    repository.findForUser.mockResolvedValue({
      provider: 'zoho',
      username: 'user@example.com',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      encryptedPassword: zohoCiphertext,
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
      provider: 'zoho',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      username: 'old@example.com',
      encryptedPassword: zohoCiphertext,
    });
    repository.saveForUser.mockResolvedValue(undefined);

    await expect(
      saveEmailConnectionUseCase({ ...input, password: ' new password ' }),
    ).resolves.toBe('saved');
    const saved = repository.saveForUser.mock.calls[0][0];
    expect(saved.encryptedPassword).not.toBe(zohoCiphertext);
    expect(cryptoService.decryptSignedString(saved.encryptedPassword)).toBe(
      ' new password ',
    );
  });

  describe('provider changes', () => {
    const gmailInput = {
      userId: 'local-user-id',
      provider: 'gmail' as const,
      username: 'user@example.com',
      password: 'abcdefghijklmnop',
    };
    const savedZoho = {
      provider: 'zoho',
      username: 'user@example.com',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      encryptedPassword: zohoCiphertext,
    };
    const savedGmail = {
      provider: 'gmail',
      username: 'user@example.com',
      encryptedPassword: gmailCiphertext,
    };

    it('replaces a Zoho connection with Gmail when a password is given', async () => {
      repository.findForUser.mockResolvedValue(savedZoho);
      repository.saveForUser.mockResolvedValue(undefined);

      await expect(saveEmailConnectionUseCase(gmailInput)).resolves.toBe(
        'saved',
      );
      expect(repository.saveForUser).toHaveBeenCalledExactlyOnceWith({
        userId: 'local-user-id',
        provider: 'gmail',
        username: 'user@example.com',
        encryptedPassword: expect.any(String),
      });
      const saved = repository.saveForUser.mock.calls[0][0];
      expect(cryptoService.decryptSignedString(saved.encryptedPassword)).toBe(
        'abcdefghijklmnop',
      );
    });

    it('requires a password to switch from Zoho to Gmail', async () => {
      repository.findForUser.mockResolvedValue(savedZoho);

      await expect(
        saveEmailConnectionUseCase({ ...gmailInput, password: '' }),
      ).resolves.toBe('password_required');
      expect(repository.saveForUser).not.toHaveBeenCalled();
    });

    it('requires a password to switch from Gmail to Zoho', async () => {
      repository.findForUser.mockResolvedValue(savedGmail);

      await expect(
        saveEmailConnectionUseCase({
          ...input,
          username: 'user@example.com',
          password: '',
        }),
      ).resolves.toBe('password_required');
      expect(repository.saveForUser).not.toHaveBeenCalled();
    });

    it('treats a blank-password Gmail save with the same username as unchanged', async () => {
      repository.findForUser.mockResolvedValue(savedGmail);

      await expect(
        saveEmailConnectionUseCase({ ...gmailInput, password: '' }),
      ).resolves.toBe('unchanged');
      expect(repository.saveForUser).not.toHaveBeenCalled();
    });

    it('reuses the saved Gmail ciphertext for a Gmail username change', async () => {
      repository.findForUser.mockResolvedValue(savedGmail);
      repository.saveForUser.mockResolvedValue(undefined);

      await expect(
        saveEmailConnectionUseCase({
          ...gmailInput,
          username: 'Other@Example.com',
          password: '',
        }),
      ).resolves.toBe('saved');
      expect(repository.saveForUser).toHaveBeenCalledExactlyOnceWith({
        userId: 'local-user-id',
        provider: 'gmail',
        username: 'other@example.com',
        encryptedPassword: gmailCiphertext,
      });
    });
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
    repository.saveForUser.mockResolvedValue(undefined);

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
  describe('connection check', () => {
    it('checks the new credentials against the given hosts before saving', async () => {
      repository.findForUser.mockResolvedValue(null);
      repository.saveForUser.mockResolvedValue(undefined);

      await expect(saveEmailConnectionUseCase(input)).resolves.toBe('saved');

      expect(email.checkEmailConnection).toHaveBeenCalledExactlyOnceWith({
        provider: 'zoho',
        imapHost: 'imap.zoho.com',
        smtpHost: 'smtp.zoho.com',
        credentials: {
          username: 'user@example.com',
          password: input.password,
        },
      });
      expect(
        email.checkEmailConnection.mock.invocationCallOrder[0],
      ).toBeLessThan(repository.saveForUser.mock.invocationCallOrder[0]);
    });

    it('checks Gmail without hosts', async () => {
      repository.findForUser.mockResolvedValue(null);
      repository.saveForUser.mockResolvedValue(undefined);

      await saveEmailConnectionUseCase({
        userId: 'local-user-id',
        provider: 'gmail',
        username: 'user@example.com',
        password: 'abcdefghijklmnop',
      });

      expect(email.checkEmailConnection).toHaveBeenCalledExactlyOnceWith({
        provider: 'gmail',
        credentials: {
          username: 'user@example.com',
          password: 'abcdefghijklmnop',
        },
      });
    });

    it('checks with the decrypted saved password when the field is blank', async () => {
      repository.findForUser.mockResolvedValue({
        provider: 'zoho',
        username: 'old@example.com',
        imapHost: 'imap.zoho.com',
        smtpHost: 'smtp.zoho.com',
        encryptedPassword: zohoCiphertext,
      });
      repository.saveForUser.mockResolvedValue(undefined);

      await expect(
        saveEmailConnectionUseCase({ ...input, password: '' }),
      ).resolves.toBe('saved');

      expect(email.checkEmailConnection).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          credentials: {
            username: 'user@example.com',
            password: 'saved zoho password',
          },
        }),
      );
      expect(repository.saveForUser.mock.calls[0][0].encryptedPassword).toBe(
        zohoCiphertext,
      );
    });

    it('skips the check for an unchanged save', async () => {
      repository.findForUser.mockResolvedValue({
        provider: 'zoho',
        username: 'user@example.com',
        imapHost: 'imap.zoho.com',
        smtpHost: 'smtp.zoho.com',
        encryptedPassword: zohoCiphertext,
      });

      await expect(
        saveEmailConnectionUseCase({ ...input, password: '' }),
      ).resolves.toBe('unchanged');
      expect(email.checkEmailConnection).not.toHaveBeenCalled();
    });

    it('skips the check when a password is required', async () => {
      repository.findForUser.mockResolvedValue(null);

      await expect(
        saveEmailConnectionUseCase({ ...input, password: '' }),
      ).resolves.toBe('password_required');
      expect(email.checkEmailConnection).not.toHaveBeenCalled();
    });

    it.each([
      ['authentication', 'credentials_rejected'],
      ['connection', 'server_unreachable'],
      ['unknown', 'check_failed'],
    ] as const)(
      'saves nothing when the check fails with %s',
      async (reason, outcome) => {
        repository.findForUser.mockResolvedValue(null);
        email.checkEmailConnection.mockResolvedValue({
          status: 'failed',
          reason,
        });
        const encrypt = vi.spyOn(cryptoService, 'encryptAndSignString');

        await expect(saveEmailConnectionUseCase(input)).resolves.toBe(outcome);
        expect(repository.saveForUser).not.toHaveBeenCalled();
        expect(encrypt).not.toHaveBeenCalled();
      },
    );
  });
});
