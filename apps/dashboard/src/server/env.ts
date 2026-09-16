import 'server-only';

function readRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} is missing or empty. Set it in .env or .env.local (see .env.example).`,
    );
  }

  return value;
}

function readRequiredHexKey(name: string): string {
  const value = readRequiredEnv(name);

  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${name} must be exactly 64 hexadecimal characters.`);
  }

  return value;
}

export const env = {
  APP_ENCRYPTION_KEY: readRequiredHexKey('APP_ENCRYPTION_KEY'),
  APP_HASHING_KEY: readRequiredHexKey('APP_HASHING_KEY'),
  DATABASE_URL: readRequiredEnv('DATABASE_URL'),
  CLERK_SECRET_KEY: readRequiredEnv('CLERK_SECRET_KEY'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: readRequiredEnv(
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  ),
};
