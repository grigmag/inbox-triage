import 'server-only';
import { createDb, type Db } from '@inbox-triage/db/client';
import { env } from './env';

// Next.js HMR re-evaluates this module on each save, but globalThis survives.
// Cache the client in development so Postgres.js connections do not accumulate.
// Symbol.for keeps the same key across reloads; a plain Symbol() would not.
// The string is only a registry key, not an import path.
const globalDbKey = Symbol.for('inbox-triage.dashboard.db');

const globalForDb = globalThis as typeof globalThis &
  Record<symbol, Db | undefined>;

export const db = globalForDb[globalDbKey] ?? createDb(env.DATABASE_URL);

if (process.env.NODE_ENV !== 'production') {
  globalForDb[globalDbKey] = db;
}
