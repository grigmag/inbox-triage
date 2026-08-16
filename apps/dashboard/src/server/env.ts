import 'server-only';

function readDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is missing or empty. Set it in .env or .env.local (see .env.example).',
    );
  }

  return databaseUrl;
}

export const env = {
  DATABASE_URL: readDatabaseUrl(),
};
