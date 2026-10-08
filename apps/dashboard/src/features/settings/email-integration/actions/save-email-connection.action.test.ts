import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveEmailConnectionAction } from './save-email-connection.action';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  saveEmailConnectionUseCase: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('../use-cases/save-email-connection.use-case', () => ({
  saveEmailConnectionUseCase: mocks.saveEmailConnectionUseCase,
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

describe('saveEmailConnectionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: 'authenticated-user-id' });
  });

  it('authenticates and scopes saving to the local user', async () => {
    mocks.saveEmailConnectionUseCase.mockResolvedValue('saved');

    await expect(
      saveEmailConnectionAction({
        provider: 'zoho',
        imapHost: '  IMAP.zoho.eu  ',
        smtpHost: '  SMTP.zoho.eu  ',
        email: ' USER@Example.COM ',
        password: '  exact password\n',
      }),
    ).resolves.toMatchObject({
      status: 'success',
      data: null,
    });

    expect(mocks.saveEmailConnectionUseCase).toHaveBeenCalledExactlyOnceWith({
      userId: 'authenticated-user-id',
      provider: 'zoho',
      username: 'user@example.com',
      imapHost: 'IMAP.zoho.eu',
      smtpHost: 'SMTP.zoho.eu',
      password: '  exact password\n',
    });
    expect(mocks.revalidatePath).toHaveBeenCalledExactlyOnceWith(
      '/settings/email',
    );
  });

  it('returns server validation errors without saving', async () => {
    const result = await saveEmailConnectionAction({
      provider: 'zoho',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      email: 'invalid',
      password: 'secret',
    });

    expect(result).toEqual({
      status: 'validation_error',
      fieldErrors: { email: 'Enter a valid email address.' },
    });
    expect(mocks.saveEmailConnectionUseCase).not.toHaveBeenCalled();
  });

  it('turns a missing password into a password field error', async () => {
    mocks.saveEmailConnectionUseCase.mockResolvedValue('password_required');

    await expect(
      saveEmailConnectionAction({
        provider: 'zoho',
        imapHost: 'imap.zoho.com',
        smtpHost: 'smtp.zoho.com',
        email: 'user@example.com',
        password: '',
      }),
    ).resolves.toEqual({
      status: 'validation_error',
      fieldErrors: { password: 'Enter your Zoho Mail password.' },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('passes a Gmail connection through without hosts', async () => {
    mocks.saveEmailConnectionUseCase.mockResolvedValue('saved');

    await expect(
      saveEmailConnectionAction({
        provider: 'gmail',
        email: ' User@Gmail.com ',
        password: 'abcd efgh ijkl mnop',
        imapHost: 'imap.zoho.com',
      }),
    ).resolves.toMatchObject({ status: 'success' });

    expect(mocks.saveEmailConnectionUseCase).toHaveBeenCalledExactlyOnceWith({
      userId: 'authenticated-user-id',
      provider: 'gmail',
      username: 'user@gmail.com',
      password: 'abcdefghijklmnop',
    });
  });

  it('asks for a Gmail app password when one is required', async () => {
    mocks.saveEmailConnectionUseCase.mockResolvedValue('password_required');

    await expect(
      saveEmailConnectionAction({
        provider: 'gmail',
        email: 'user@gmail.com',
        password: '',
      }),
    ).resolves.toEqual({
      status: 'validation_error',
      fieldErrors: { password: 'Enter your Gmail app password.' },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ['zoho', 'Zoho rejected the password. Check the email and password.'],
    ['gmail', 'Gmail rejected the app password. Check the steps below.'],
  ] as const)(
    'turns rejected %s credentials into a password field error',
    async (provider, message) => {
      mocks.saveEmailConnectionUseCase.mockResolvedValue(
        'credentials_rejected',
      );

      await expect(
        saveEmailConnectionAction({
          provider,
          imapHost: 'imap.zoho.com',
          smtpHost: 'smtp.zoho.com',
          email: 'user@example.com',
          password: 'abcdefghijklmnop',
        }),
      ).resolves.toEqual({
        status: 'validation_error',
        fieldErrors: { password: message },
      });
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['server_unreachable', "Couldn't reach the mail server."],
    ['check_failed', 'Unable to save the email connection. Please try again.'],
  ] as const)(
    'turns a %s check into a form error',
    async (outcome, message) => {
      mocks.saveEmailConnectionUseCase.mockResolvedValue(outcome);

      await expect(
        saveEmailConnectionAction({
          provider: 'gmail',
          email: 'user@gmail.com',
          password: 'abcdefghijklmnop',
        }),
      ).resolves.toEqual({ status: 'failure', message });
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it('returns a safe result for an unchanged connection', async () => {
    mocks.saveEmailConnectionUseCase.mockResolvedValue('unchanged');

    const result = await saveEmailConnectionAction({
      provider: 'zoho',
      imapHost: 'imap.zoho.com',
      smtpHost: 'smtp.zoho.com',
      email: 'user@example.com',
      password: '',
    });

    expect(result).toEqual({
      status: 'success',
      data: null,
      announcement: 'Email connection is already up to date.',
    });
    expect(mocks.revalidatePath).toHaveBeenCalledExactlyOnceWith(
      '/settings/email',
    );
  });

  it('translates persistence failures into a generic safe message', async () => {
    mocks.saveEmailConnectionUseCase.mockRejectedValue(
      new Error('database secret details'),
    );

    await expect(
      saveEmailConnectionAction({
        provider: 'zoho',
        imapHost: 'imap.zoho.com',
        smtpHost: 'smtp.zoho.com',
        email: 'user@example.com',
        password: 'secret',
      }),
    ).resolves.toEqual({
      status: 'failure',
      message: 'Unable to save the email connection. Please try again.',
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('propagates authentication rejection', async () => {
    const authError = new Error('authentication required');
    mocks.requireUser.mockRejectedValue(authError);

    await expect(
      saveEmailConnectionAction({
        provider: 'zoho',
        imapHost: 'imap.zoho.com',
        smtpHost: 'smtp.zoho.com',
        email: 'user@example.com',
        password: 'secret',
      }),
    ).rejects.toBe(authError);
    expect(mocks.saveEmailConnectionUseCase).not.toHaveBeenCalled();
  });
});

it('returns a host field error without saving or revalidating', async () => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: 'authenticated-user-id' });
  expect(
    await saveEmailConnectionAction({
      provider: 'zoho',
      email: 'user@example.com',
      password: 'secret',
      imapHost: '   ',
      smtpHost: 'smtp.zoho.com',
    }),
  ).toEqual({
    status: 'validation_error',
    fieldErrors: { imapHost: 'Enter an IMAP host.' },
  });
  expect(mocks.saveEmailConnectionUseCase).not.toHaveBeenCalled();
  expect(mocks.revalidatePath).not.toHaveBeenCalled();
});

it('returns an SMTP host field error without saving or revalidating', async () => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: 'authenticated-user-id' });
  expect(
    await saveEmailConnectionAction({
      provider: 'zoho',
      email: 'user@example.com',
      password: 'secret',
      imapHost: 'imap.zoho.com',
      smtpHost: '   ',
    }),
  ).toEqual({
    status: 'validation_error',
    fieldErrors: { smtpHost: 'Enter an SMTP host.' },
  });
  expect(mocks.saveEmailConnectionUseCase).not.toHaveBeenCalled();
  expect(mocks.revalidatePath).not.toHaveBeenCalled();
});
