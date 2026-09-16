import { sql } from 'drizzle-orm';
import { check, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './helpers/timestamps';
import { users } from './users';

export const emailConnections = pgTable(
  'email_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').$type<'zoho'>().notNull(),
    username: text('username').notNull(),
    imapHost: text('imap_host').notNull().default('imap.zoho.com'),
    encryptedPassword: text('encrypted_password').notNull(),
    ...timestamps(),
  },
  (table) => [
    unique('email_connections_user_id_unique').on(table.userId),
    check('email_connections_provider', sql`${table.provider} = 'zoho'`),
    check(
      'email_connections_username_trimmed',
      sql`btrim(${table.username}) = ${table.username}`,
    ),
    check('email_connections_username_not_empty', sql`${table.username} <> ''`),
    check(
      'email_connections_imap_host_trimmed',
      sql`btrim(${table.imapHost}) = ${table.imapHost}`,
    ),
    check(
      'email_connections_imap_host_not_empty',
      sql`${table.imapHost} <> ''`,
    ),
    check(
      'email_connections_encrypted_password_not_empty',
      sql`${table.encryptedPassword} <> ''`,
    ),
  ],
);

export type EmailConnection = typeof emailConnections.$inferSelect;
