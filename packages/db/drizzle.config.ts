import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'drizzle-kit';
import { fileURLToPath } from 'node:url';

const dashboardDir = fileURLToPath(
  new URL('../../apps/dashboard/', import.meta.url),
);
const databaseUrlOverride = process.env.DATABASE_URL;

// Drizzle Kit runs outside Next.js, so load the dashboard's local env files here
// while preserving an explicit override for CI and remote environments.
// NOTE If we add a second app, maybe change the way we pass the db url.
loadEnvConfig(dashboardDir, process.env.NODE_ENV !== 'production');

const databaseUrl = databaseUrlOverride ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Add it to apps/dashboard/.env (or .env.local), or export it in the environment.',
  );
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  dbCredentials: { url: databaseUrl },
});
