import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function createDbWithClient(databaseUrl: string) {
  const client = postgres(databaseUrl);

  return { client, db: drizzle(client, { schema }) };
}

export function createDb(databaseUrl: string) {
  return createDbWithClient(databaseUrl).db;
}

export type Db = ReturnType<typeof createDb>;
