import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const validEnvironment = {
  APP_ENCRYPTION_KEY: '00'.repeat(32),
  APP_HASHING_KEY: '11'.repeat(32),
  DATABASE_URL: 'postgresql://ci:ci@127.0.0.1:5432/ci',
  CLERK_SECRET_KEY: 'sk_test_placeholder',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_placeholder',
  OPENROUTER_API_KEY: 'openrouter_test_placeholder',
  OPENROUTER_MODEL: 'openrouter/test-model',
};

async function loadEnv(overrides: Partial<typeof validEnvironment> = {}) {
  vi.resetModules();

  for (const [name, value] of Object.entries({
    ...validEnvironment,
    ...overrides,
  })) {
    vi.stubEnv(name, value);
  }

  return import('./env');
}

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts 32-byte hexadecimal credential keys', async () => {
    await expect(loadEnv()).resolves.toMatchObject({
      env: {
        APP_ENCRYPTION_KEY: validEnvironment.APP_ENCRYPTION_KEY,
        APP_HASHING_KEY: validEnvironment.APP_HASHING_KEY,
      },
    });
  });

  it.each([
    ['APP_ENCRYPTION_KEY', '0'.repeat(63)],
    ['APP_HASHING_KEY', 'g'.repeat(64)],
  ] as const)('rejects an invalid %s', async (name, value) => {
    await expect(loadEnv({ [name]: value })).rejects.toThrow(
      `${name} must be exactly 64 hexadecimal characters.`,
    );
  });

  it.each(['OPENROUTER_API_KEY', 'OPENROUTER_MODEL'] as const)(
    'rejects an empty %s',
    async (name) => {
      await expect(loadEnv({ [name]: '' })).rejects.toThrow(
        `${name} is missing or empty. Set it in .env or .env.local (see .env.example).`,
      );
    },
  );
});
