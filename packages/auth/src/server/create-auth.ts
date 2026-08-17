import type { Db } from '@inbox-triage/db/client';
import { requireUser } from './require-user';

export function createAuth({ db }: { db: Db }) {
  return {
    requireUser: () => requireUser(db),
  };
}

export type Auth = ReturnType<typeof createAuth>;
