import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './helpers/timestamps';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  ...timestamps(),
});

export type User = typeof users.$inferSelect;
