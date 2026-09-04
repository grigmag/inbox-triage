import { defineConfig } from 'drizzle-kit';
import { loadDatabaseUrl } from './src/cli/load-database-url';

const databaseUrl = loadDatabaseUrl();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  dbCredentials: { url: databaseUrl },
});
