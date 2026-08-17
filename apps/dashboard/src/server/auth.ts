import 'server-only';
import { createAuth } from '@inbox-triage/auth/server';
import { db } from './db';

export const { requireUser } = createAuth({ db });
