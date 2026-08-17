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

export const env = {
  DATABASE_URL: readRequiredEnv('DATABASE_URL'),
  CLERK_SECRET_KEY: readRequiredEnv('CLERK_SECRET_KEY'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: readRequiredEnv(
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  ),
};
