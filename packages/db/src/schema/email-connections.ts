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
    provider: text('provider').$type<'zoho' | 'gmail'>().notNull(),
    username: text('username').notNull(),
    // Gmail hosts are fixed and owned by the email package, so Gmail rows
    // leave both host columns NULL. Zoho rows must set both.
    imapHost: text('imap_host'),
    smtpHost: text('smtp_host'),
    encryptedPassword: text('encrypted_password').notNull(),
    ...timestamps(),
  },
  (table) => [
    unique('email_connections_user_id_unique').on(table.userId),
    check(
      'email_connections_provider',
      sql`${table.provider} IN ('zoho', 'gmail')`,
    ),
    check(
      'email_connections_provider_hosts',
      sql`(${table.provider} = 'zoho' AND ${table.imapHost} IS NOT NULL AND ${table.smtpHost} IS NOT NULL) OR (${table.provider} = 'gmail' AND ${table.imapHost} IS NULL AND ${table.smtpHost} IS NULL)`,
    ),
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
      'email_connections_smtp_host_trimmed',
      sql`btrim(${table.smtpHost}) = ${table.smtpHost}`,
    ),
    check(
      'email_connections_smtp_host_not_empty',
      sql`${table.smtpHost} <> ''`,
    ),
    check(
      'email_connections_encrypted_password_not_empty',
      sql`${table.encryptedPassword} <> ''`,
    ),
  ],
);

export type EmailConnection = typeof emailConnections.$inferSelect;
