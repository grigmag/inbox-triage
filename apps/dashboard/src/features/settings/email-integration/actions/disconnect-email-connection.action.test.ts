import { beforeEach, describe, expect, it, vi } from 'vitest';
import { disconnectEmailConnectionAction } from './disconnect-email-connection.action';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  deleteForUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('../repositories/email-connection.repository', () => ({
  emailConnectionRepository: { deleteForUser: mocks.deleteForUser },
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

describe('disconnectEmailConnectionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: 'authenticated-user-id' });
    mocks.deleteForUser.mockResolvedValue(undefined);
  });

  it('authenticates, scopes the delete, and returns no row data', async () => {
    await expect(disconnectEmailConnectionAction()).resolves.toEqual({
      status: 'success',
      data: null,
      announcement: 'Email connection disconnected.',
    });

    expect(mocks.deleteForUser).toHaveBeenCalledExactlyOnceWith(
      'authenticated-user-id',
    );
    expect(mocks.revalidatePath).toHaveBeenCalledExactlyOnceWith(
      '/settings/email',
    );
  });

  it('treats an absent connection as a successful idempotent delete', async () => {
    mocks.deleteForUser.mockResolvedValue(undefined);

    await expect(disconnectEmailConnectionAction()).resolves.toMatchObject({
      status: 'success',
      data: null,
    });
  });

  it('translates repository failures into a generic safe message', async () => {
    mocks.deleteForUser.mockRejectedValue(new Error('database details'));

    await expect(disconnectEmailConnectionAction()).resolves.toEqual({
      status: 'failure',
      message: 'Unable to disconnect the email connection. Please try again.',
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('propagates authentication rejection', async () => {
    const authError = new Error('authentication required');
    mocks.requireUser.mockRejectedValue(authError);

    await expect(disconnectEmailConnectionAction()).rejects.toBe(authError);
    expect(mocks.deleteForUser).not.toHaveBeenCalled();
  });
});
