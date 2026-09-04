import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env') as typeof import('@next/env');

const dashboardDir = fileURLToPath(
  new URL('../../../../apps/dashboard/', import.meta.url),
);

/** Loads DATABASE_URL for commands that run outside the Next.js application. */
export function loadDatabaseUrl(): string {
  const databaseUrlOverride = process.env.DATABASE_URL;

  // Drizzle Kit runs outside Next.js, so load the dashboard's local env files here
  // while preserving an explicit override for CI and remote environments.
  // NOTE If we add a second app, maybe change the way we pass the db url.
  if (databaseUrlOverride === undefined) {
    loadEnvConfig(dashboardDir, process.env.NODE_ENV !== 'production');
  }

  const databaseUrl = databaseUrlOverride ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Add it to apps/dashboard/.env (or .env.local), or export it in the environment.',
    );
  }

  return databaseUrl;
}
